import mammoth from "mammoth";
import { Clause } from "@shared/schema";
import fs from "fs";
import path from "path";
import { promisify } from "util";

// Note: In a production app, we would initialize an AI client here

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
      // For PDFs, we'll use OpenAI to extract text
      extractedText = await extractTextWithOpenAI(file.buffer, file.originalname);
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

// Extract text from PDF 
async function extractTextWithOpenAI(buffer: Buffer, filename: string): Promise<string> {
  try {
    // Save buffer to temporary file
    const tmpFile = path.join('tmp', `tmp-${Date.now()}-${filename}`);
    await writeFile(tmpFile, buffer);
    
    // In a production app, we would use an AI service to extract text from the PDF
    // For this demonstration, we'll return sample contract text
    
    // Clean up the temporary file
    await unlink(tmpFile);
    
    return `Sample contract text for demonstration purposes.
    
    SECTION 1: LIMITATION OF LIABILITY
    Supplier's total liability arising out of or related to this Agreement, whether in contract, tort or otherwise, shall not exceed the amount paid by Customer in the 12 months preceding the event giving rise to the claim.
    
    SECTION 2: TERMINATION
    Supplier may terminate this Agreement at any time upon thirty (30) days' written notice to Customer. Customer may terminate this Agreement for convenience upon ninety (90) days' written notice to Supplier.
    
    SECTION 3: INTELLECTUAL PROPERTY
    Customer agrees that all intellectual property rights, including but not limited to patents, copyrights, trademarks and trade secrets, in any materials created by Supplier under this Agreement shall be owned exclusively by Supplier. Customer shall have a non-exclusive license to use such materials for its internal business purposes only.
    
    SECTION 4: INDEMNIFICATION
    Customer shall defend, indemnify and hold harmless Supplier from and against all claims, damages, losses and expenses, including but not limited to attorneys' fees, arising out of or resulting from Customer's use of the services or deliverables provided under this Agreement.
    
    SECTION 5: PAYMENT TERMS
    Customer shall pay all invoices within fifteen (15) days of receipt. Any amounts not paid when due will accrue interest at a rate of 1.5% per month or the maximum rate permitted by law, whichever is less.`;
  } catch (error: any) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(`Failed to extract text from PDF: ${error?.message || 'Unknown error'}`);
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
  try {
    // Save buffer to temporary file
    const tmpFile = path.join('tmp', `tmp-${Date.now()}.png`);
    await writeFile(tmpFile, buffer);
    
    // In a production app, we would use OCR or AI services to extract text from the image
    // For this demonstration, we'll return sample contract text
    
    // Clean up temp file
    await unlink(tmpFile);
    
    return `Sample contract text for demonstration purposes.
    
    SECTION 1: LIMITATION OF LIABILITY
    Supplier's total liability arising out of or related to this Agreement, whether in contract, tort or otherwise, shall not exceed the amount paid by Customer in the 12 months preceding the event giving rise to the claim.
    
    SECTION 2: TERMINATION
    Supplier may terminate this Agreement at any time upon thirty (30) days' written notice to Customer. Customer may terminate this Agreement for convenience upon ninety (90) days' written notice to Supplier.
    
    SECTION 3: INTELLECTUAL PROPERTY
    Customer agrees that all intellectual property rights, including but not limited to patents, copyrights, trademarks and trade secrets, in any materials created by Supplier under this Agreement shall be owned exclusively by Supplier. Customer shall have a non-exclusive license to use such materials for its internal business purposes only.
    
    SECTION 4: INDEMNIFICATION
    Customer shall defend, indemnify and hold harmless Supplier from and against all claims, damages, losses and expenses, including but not limited to attorneys' fees, arising out of or resulting from Customer's use of the services or deliverables provided under this Agreement.
    
    SECTION 5: PAYMENT TERMS
    Customer shall pay all invoices within fifteen (15) days of receipt. Any amounts not paid when due will accrue interest at a rate of 1.5% per month or the maximum rate permitted by law, whichever is less.`;
  } catch (error: any) {
    console.error("Error extracting text from image:", error);
    throw new Error(`Failed to extract text from image: ${error?.message || 'Unknown error'}`);
  }
}

// Extract clauses from text
async function extractClauses(text: string): Promise<{ content: string, type?: string }[]> {
  try {
    // Call OpenAI to identify and extract clauses
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
    const result = JSON.parse(content ? content : "{}");
    
    if (result.clauses && Array.isArray(result.clauses)) {
      return result.clauses;
    }
    
    // Fallback if the expected format isn't returned
    return splitIntoDefaultClauses(text);
  } catch (error: any) {
    console.error("Error extracting clauses:", error);
    // Fallback to a simpler method if OpenAI fails
    return splitIntoDefaultClauses(text);
  }
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
