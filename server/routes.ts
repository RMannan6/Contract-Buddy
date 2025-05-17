import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fileUploadHandler } from "./ocr";
import { analyzeContract } from "./ai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { randomUUID } from "crypto";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, JPG, and PNG are allowed.'));
    }
  }
});

// Create a temporary directory for uploads if it doesn't exist
const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Setup periodic job to delete expired documents
const setupCleanup = () => {
  // Run cleanup every hour
  setInterval(async () => {
    try {
      await storage.deleteExpiredDocuments();
      console.log("Cleaned up expired documents");
    } catch (error) {
      console.error("Error cleaning up expired documents:", error);
    }
  }, 60 * 60 * 1000); // 1 hour
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database schema and cleanup job
  setupCleanup();

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // File upload endpoint
  app.post("/api/upload", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Process the uploaded file (OCR and extraction)
      const result = await fileUploadHandler(req.file);
      
      // Create document record with 24-hour expiration
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24);
      
      const document = await storage.createDocument({
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        content: result.text,
        uploadedAt: new Date(),
        expiresAt: expirationDate
      });

      // Store extracted clauses
      const extractedClauses = result.clauses;
      for (let i = 0; i < extractedClauses.length; i++) {
        await storage.createClause({
          documentId: document.id,
          content: extractedClauses[i].content,
          type: extractedClauses[i].type || "unknown",
          riskLevel: "pending",
          position: i
        });
      }

      res.json({ documentId: document.id });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error during upload" });
    }
  });

  // Analyze contract endpoint
  app.post("/api/analyze/:documentId", async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.documentId);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Get clauses for this document
      const clauses = await storage.getClausesByDocumentId(documentId);
      
      if (clauses.length === 0) {
        return res.status(400).json({ message: "No clauses found for analysis" });
      }

      // Get gold standard clauses for comparison
      const goldStandardClauses = await storage.getAllGoldStandardClauses();
      
      // Analyze the contract
      const analysisResults = await analyzeContract(document, clauses, goldStandardClauses);
      
      // Store the analysis results
      await storage.createAnalysisResult({
        documentId,
        negotiationPoints: analysisResults.negotiationPoints
      });

      res.json(analysisResults);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error during analysis" });
    }
  });

  // Get analysis results endpoint
  app.get("/api/analysis/:documentId", async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.documentId);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const analysisResult = await storage.getAnalysisResultByDocumentId(documentId);
      
      if (!analysisResult) {
        return res.status(404).json({ message: "Analysis results not found" });
      }

      res.json(analysisResult);
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error retrieving analysis" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
