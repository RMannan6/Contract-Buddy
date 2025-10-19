import mammoth from "mammoth";
import { Clause } from "@shared/schema";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import OpenAI from "openai";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configure PDF.js worker - use CDN for better compatibility
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.0.379/legacy/build/pdf.worker.mjs';

// Initialize OpenAI client with AIML API gateway (provides access to 300+ AI models)
const openai = new OpenAI({ 
  apiKey: process.env.AIML_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AIML_API_KEY ? "https://api.aimlapi.com/v1" : undefined
});

// File processing result
interface FileProcessingResult {
  text: string;
  clauses: {
    content: string;
    type?: string;
  }[];
}

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Handle uploaded file
export async function fileUploadHandler(file: Express.Multer.File): Promise<FileProcessingResult> {
  try {
    // Extract the file extension
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    // Process the file based on its type
    let extractedText = "";
    
    if (fileExt === '.pdf') {
      // For PDFs, use native PDF extraction (Vision API doesn't support PDFs)
      extractedText = await extractTextFromPDFNative(file.buffer);
    } else if (fileExt === '.docx') {
      extractedText = await extractTextFromDocx(file.buffer);
    } else if (['.jpg', '.jpeg', '.png'].includes(fileExt)) {
      extractedText = await extractTextFromImage(file.buffer);
    } else {
      throw new Error("Unsupported file format");
    }
    
    // Extract clauses from the text
    const clauses = await extractClauses(extractedText);
    
    return {
      text: extractedText,
      clauses
    };
  } catch (error: any) {
    console.error("Error processing file:", error);
    throw new Error(`Failed to process file: ${error?.message || 'Unknown error'}`);
  }
}

// Extract text from PDF using pdfjs (fallback method without AI)
async function extractTextFromPDFNative(buffer: Buffer): Promise<string> {
  try {
    // Validate buffer
    if (!buffer || buffer.length === 0) {
      throw new Error("Empty or invalid PDF buffer");
    }
    
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ 
      data,
      verbosity: 0, // Suppress PDF.js warnings
      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/standard_fonts/'
    });
    
    const pdf = await loadingTask.promise;
    
    if (pdf.numPages === 0) {
      throw new Error("PDF contains no pages");
    }
    
    let fullText = "";
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n\n";
    }
    
    const extractedText = fullText.trim();
    
    // Check if any text was extracted
    if (!extractedText || extractedText.length < 10) {
      throw new Error("No readable text found in PDF. The document may be image-based or scanned. Please try uploading a DOCX file or a clearer image format.");
    }
    
    return extractedText;
  } catch (error: any) {
    console.error("PDF extraction error:", error?.message || error);
    
    // Provide more helpful error messages
    if (error?.message?.includes("Invalid PDF structure")) {
      throw new Error("Unable to read PDF file. The file may be corrupted or encrypted. Please try a different file or convert it to DOCX format.");
    } else if (error?.message?.includes("No readable text")) {
      throw error; // Pass through our custom error message
    } else {
      throw new Error(`PDF processing failed: ${error?.message || 'Unknown error'}. Please try uploading a DOCX file instead.`);
    }
  }
}

// Extract text from PDF using OpenAI
async function extractTextWithOpenAI(buffer: Buffer, filename: string): Promise<string> {
  // Skip AI API if no key is available and use native PDF extraction
  if ((!process.env.AIML_API_KEY && !process.env.OPENAI_API_KEY) || 
      process.env.OPENAI_API_KEY === "sk-...") {
    console.log("No valid AI API key, using native PDF text extraction");
    return await extractTextFromPDFNative(buffer);
  }

  try {
    // Save buffer to temporary file to use with OpenAI
    const tmpFile = path.join('tmp', `tmp-${Date.now()}-${filename}`);
    await writeFile(tmpFile, buffer);
    
    // Use OpenAI Vision to extract text with timeout
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a text extraction expert. Your task is to extract all text content from the document verbatim, preserving paragraph structure."
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Extract all text from this document. Keep the formatting and structure intact. Include all clauses, provisions, and legal language exactly as written."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${buffer.toString('base64')}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI request timeout')), 10000)
      )
    ]) as OpenAI.Chat.Completions.ChatCompletion;
    
    // Clean up the temporary file
    await unlink(tmpFile);
    
    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("Error extracting text from PDF with OpenAI:", error);
    console.log("Falling back to native PDF text extraction");
    // Try native PDF extraction as fallback
    return await extractTextFromPDFNative(buffer);
  }
}

// Extract text from DOCX
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    throw new Error("Failed to extract text from DOCX");
  }
}

// Extract text from image
async function extractTextFromImage(buffer: Buffer): Promise<string> {
  // For images, we need AI API - no fallback available
  if ((!process.env.AIML_API_KEY && !process.env.OPENAI_API_KEY) || 
      process.env.OPENAI_API_KEY === "sk-...") {
    throw new Error("AI API key required for image text extraction. Please upload a PDF or DOCX file instead.");
  }

  try {
    // Save buffer to temporary file
    const tmpFile = path.join('tmp', `tmp-${Date.now()}.png`);
    await writeFile(tmpFile, buffer);
    
    // Use OpenAI Vision to extract text from image with timeout
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a text extraction expert. Your task is to extract all text content from the image verbatim, preserving paragraph structure."
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Extract all text from this image. Keep the formatting and structure intact."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${buffer.toString('base64')}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI request timeout')), 10000)
      )
    ]) as OpenAI.Chat.Completions.ChatCompletion;
    
    // Clean up temp file
    await unlink(tmpFile);
    
    const extractedText = response.choices[0].message.content || "";
    return extractedText;
  } catch (error: any) {
    console.error("Error extracting text from image:", error);
    throw new Error("Failed to extract text from image. Please try a PDF or DOCX file instead.");
  }
}

// Extract clauses from text
async function extractClauses(text: string): Promise<{ content: string, type?: string }[]> {
  try {
    // First check if we can use the AI API
    if ((!process.env.AIML_API_KEY && !process.env.OPENAI_API_KEY) || 
        process.env.OPENAI_API_KEY === "sk-...") {
      console.log("No valid AI API key found, using fallback clause extraction");
      return getIntelligentDefaultClauses(text);
    }
    
    try {
      // Call AI API to identify and extract clauses using GPT-3.5-turbo
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert at identifying and extracting contract clauses. 
            Given the full text of a contract, identify and extract individual clauses.
            For each clause, determine its type from these categories:
            - limitation_of_liability
            - termination
            - intellectual_property
            - indemnification
            - payment_terms
            - confidentiality
            - governing_law
            - warranty
            - assignment
            - other
            
            Output should be in JSON format with an array of clauses, each with content and type.`
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse the response
      const content = response.choices[0].message.content;
      const result = JSON.parse(content || "{}");
      
      if (result.clauses && Array.isArray(result.clauses)) {
        return result.clauses;
      }
      
      // Fallback if the expected format isn't returned
      return getIntelligentDefaultClauses(text);
    } catch (apiError: any) {
      // If API error (like quota exceeded), use intelligent fallback
      console.log("OpenAI API error, using fallback clause extraction:", apiError.message || apiError);
      return getIntelligentDefaultClauses(text);
    }
  } catch (error: any) {
    console.error("Error extracting clauses:", error);
    // Fallback to a simpler method if OpenAI fails
    return splitIntoDefaultClauses(text);
  }
}

// More intelligent fallback for clause extraction from actual text
function getIntelligentDefaultClauses(text: string): { content: string, type?: string }[] {
  // Always parse the actual text - never return hardcoded clauses
  // Split text into clauses and try to detect their types
  const clauses = splitIntoDefaultClauses(text);
  
  // Try to identify clause types based on keywords in the actual text
  return clauses.map(clause => {
    const content = clause.content.toLowerCase();
    let type: string | undefined = undefined;
    
    if (content.includes("liability") || content.includes("damages") || content.includes("limit")) {
      type = "limitation_of_liability";
    } else if (content.includes("termination") || content.includes("terminate")) {
      type = "termination";
    } else if (content.includes("intellectual property") || content.includes("copyright") || content.includes("patent")) {
      type = "intellectual_property";
    } else if (content.includes("indemnif")) {
      type = "indemnification";
    } else if (content.includes("payment") || content.includes("invoice") || content.includes("fee")) {
      type = "payment_terms";
    } else if (content.includes("confidential")) {
      type = "confidentiality";
    } else if (content.includes("governing law") || content.includes("jurisdiction")) {
      type = "governing_law";
    } else if (content.includes("warrant")) {
      type = "warranty";
    } else if (content.includes("assignment") || content.includes("assign")) {
      type = "assignment";
    }
    
    return {
      content: clause.content,
      type: type || "other"
    };
  });
}

// Simple fallback function to split text into clauses by paragraphs
function splitIntoDefaultClauses(text: string): { content: string }[] {
  // Split by double newline to get paragraphs
  const paragraphs = text.split(/\n\s*\n/)
    .filter(p => p.trim().length > 0)
    .map(p => p.trim());
  
  // Combine very short paragraphs with the next one
  const clauses: { content: string }[] = [];
  let currentClause = "";
  
  for (const paragraph of paragraphs) {
    if (paragraph.length < 50 && currentClause === "") {
      currentClause = paragraph;
    } else if (paragraph.length < 50) {
      currentClause += "\n\n" + paragraph;
    } else if (currentClause !== "") {
      currentClause += "\n\n" + paragraph;
      clauses.push({ content: currentClause });
      currentClause = "";
    } else {
      clauses.push({ content: paragraph });
    }
  }
  
  // Add any remaining content
  if (currentClause !== "") {
    clauses.push({ content: currentClause });
  }
  
  return clauses;
}
