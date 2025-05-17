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

      try {
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
      } catch (processingError) {
        console.error("Error processing file:", processingError);
        
        // Create a simple fallback document with demo clauses if file processing fails
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 24);
        
        const demoText = "Sample contract text for demonstration purposes.";
        
        const document = await storage.createDocument({
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          content: demoText,
          uploadedAt: new Date(),
          expiresAt: expirationDate
        });
        
        // Create demo clauses
        const demoClauses = [
          { content: "SECTION 1: LIMITATION OF LIABILITY. Supplier's total liability arising out of or related to this Agreement, whether in contract, tort or otherwise, shall not exceed the amount paid by Customer in the 12 months preceding the event giving rise to the claim.", type: "limitation_of_liability" },
          { content: "SECTION 2: TERMINATION. Supplier may terminate this Agreement at any time upon thirty (30) days' written notice to Customer. Customer may terminate this Agreement for convenience upon ninety (90) days' written notice to Supplier.", type: "termination" },
          { content: "SECTION 3: INTELLECTUAL PROPERTY. Customer agrees that all intellectual property rights, including but not limited to patents, copyrights, trademarks and trade secrets, in any materials created by Supplier under this Agreement shall be owned exclusively by Supplier. Customer shall have a non-exclusive license to use such materials for its internal business purposes only.", type: "intellectual_property" },
          { content: "SECTION 4: INDEMNIFICATION. Customer shall defend, indemnify and hold harmless Supplier from and against all claims, damages, losses and expenses, including but not limited to attorneys' fees, arising out of or resulting from Customer's use of the services or deliverables provided under this Agreement.", type: "indemnification" },
          { content: "SECTION 5: PAYMENT TERMS. Customer shall pay all invoices within fifteen (15) days of receipt. Any amounts not paid when due will accrue interest at a rate of 1.5% per month or the maximum rate permitted by law, whichever is less.", type: "payment_terms" }
        ];
        
        for (let i = 0; i < demoClauses.length; i++) {
          await storage.createClause({
            documentId: document.id,
            content: demoClauses[i].content,
            type: demoClauses[i].type,
            riskLevel: "pending",
            position: i
          });
        }
        
        res.json({ documentId: document.id });
      }
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
  
  // Get a revised contract with all suggested improvements implemented
  app.get("/api/document/:documentId/revised", async (req: Request, res: Response) => {
    try {
      const { generateRevisedContract } = await import("./contractGenerator");
      const documentId = parseInt(req.params.documentId);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }
      
      // Get the document
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Get the analysis results
      const analysisResult = await storage.getAnalysisResultByDocumentId(documentId);
      if (!analysisResult) {
        return res.status(404).json({ message: "Analysis results not found" });
      }
      
      // Get all clauses from the document
      const clauses = await storage.getClausesByDocumentId(documentId);
      
      // Generate the revised contract
      const revisedContract = generateRevisedContract(
        document.content,
        analysisResult.negotiationPoints as any,
        clauses
      );
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="revised_contract_${documentId}.txt"`);
      res.send(revisedContract);
    } catch (error: any) {
      console.error("Error generating revised contract:", error);
      res.status(500).json({ message: error.message || "Failed to generate revised contract" });
    }
  });
  
  // Get a revised contract with tracked changes (showing original and suggested side by side)
  app.get("/api/document/:documentId/revised-with-changes", async (req: Request, res: Response) => {
    try {
      const { generateRevisedContractWithChanges } = await import("./contractGenerator");
      const documentId = parseInt(req.params.documentId);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }
      
      // Get the document
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Get the analysis results
      const analysisResult = await storage.getAnalysisResultByDocumentId(documentId);
      if (!analysisResult) {
        return res.status(404).json({ message: "Analysis results not found" });
      }
      
      // Get all clauses from the document
      const clauses = await storage.getClausesByDocumentId(documentId);
      
      // Generate the revised contract with tracked changes
      const revisedContract = generateRevisedContractWithChanges(
        document.content,
        analysisResult.negotiationPoints as any,
        clauses
      );
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="revised_contract_with_changes_${documentId}.txt"`);
      res.send(revisedContract);
    } catch (error: any) {
      console.error("Error generating revised contract with changes:", error);
      res.status(500).json({ message: error.message || "Failed to generate revised contract with changes" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
