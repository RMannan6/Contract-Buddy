import { 
  User, InsertUser, 
  Document, InsertDocument,
  Clause, InsertClause,
  GoldStandardClause, InsertGoldStandardClause,
  AnalysisResult, InsertAnalysisResult,
  NegotiationPoint,
  PartyInfo
} from "@shared/schema";

import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";
import { 
  users, 
  documents, 
  clauses, 
  goldStandardClauses, 
  analysisResults 
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  updateDocumentPartyInfo(documentId: number, partyInfo: PartyInfo): Promise<Document | undefined>;
  updateDocumentContent(documentId: number, content: string): Promise<void>;
  deleteExpiredDocuments(): Promise<void>;

  // Clause operations
  createClause(clause: InsertClause): Promise<Clause>;
  getClausesByDocumentId(documentId: number): Promise<Clause[]>;

  // Gold standard clauses operations
  createGoldStandardClause(clause: InsertGoldStandardClause): Promise<GoldStandardClause>;
  getAllGoldStandardClauses(): Promise<GoldStandardClause[]>;
  getGoldStandardClausesByType(type: string): Promise<GoldStandardClause[]>;

  // Analysis operations
  createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult>;
  getAnalysisResultByDocumentId(documentId: number): Promise<AnalysisResult | undefined>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const createdAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // Documents expire after 24 hours
    
    const [document] = await db
      .insert(documents)
      .values({
        ...insertDocument,
        uploadedAt: createdAt,
        expiresAt
      })
      .returning();
    
    return document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async updateDocumentPartyInfo(documentId: number, partyInfo: PartyInfo): Promise<Document | undefined> {
    const [updated] = await db
      .update(documents)
      .set({
        userPartyType: partyInfo.userPartyType,
        draftingPartyName: partyInfo.draftingPartyName || null,
        userEntityName: partyInfo.userEntityName || null
      })
      .where(eq(documents.id, documentId))
      .returning();
    
    return updated || undefined;
  }

  async updateDocumentContent(documentId: number, content: string): Promise<void> {
    await db
      .update(documents)
      .set({ content })
      .where(eq(documents.id, documentId));
  }

  async deleteExpiredDocuments(): Promise<void> {
    const now = new Date();
    
    // First get expired document IDs
    const expiredDocs = await db
      .select({
        id: documents.id
      })
      .from(documents)
      .where(sql`${documents.expiresAt} < ${now}`);
    
    const expiredIds = expiredDocs.map(doc => doc.id);
    
    if (expiredIds.length === 0) {
      return;
    }
    
    // Delete associated analysis results
    await db.delete(analysisResults)
      .where(sql`${analysisResults.documentId} IN (${expiredIds.join(',')})`);
    
    // Delete associated clauses
    await db.delete(clauses)
      .where(sql`${clauses.documentId} IN (${expiredIds.join(',')})`);
    
    // Finally delete the documents
    await db.delete(documents)
      .where(sql`${documents.id} IN (${expiredIds.join(',')})`);
  }

  async createClause(insertClause: InsertClause): Promise<Clause> {
    const [clause] = await db
      .insert(clauses)
      .values(insertClause)
      .returning();
    
    return clause;
  }

  async getClausesByDocumentId(documentId: number): Promise<Clause[]> {
    return db
      .select()
      .from(clauses)
      .where(eq(clauses.documentId, documentId));
  }

  async createGoldStandardClause(insertClause: InsertGoldStandardClause): Promise<GoldStandardClause> {
    const [clause] = await db
      .insert(goldStandardClauses)
      .values(insertClause)
      .returning();
    
    return clause;
  }

  async getAllGoldStandardClauses(): Promise<GoldStandardClause[]> {
    return db.select().from(goldStandardClauses);
  }

  async getGoldStandardClausesByType(type: string): Promise<GoldStandardClause[]> {
    return db
      .select()
      .from(goldStandardClauses)
      .where(eq(goldStandardClauses.type, type));
  }

  async createAnalysisResult(insertAnalysisResult: InsertAnalysisResult): Promise<AnalysisResult> {
    const createdAt = new Date();
    
    const [analysisResult] = await db
      .insert(analysisResults)
      .values({
        ...insertAnalysisResult,
        createdAt
      })
      .returning();
    
    return analysisResult;
  }

  async getAnalysisResultByDocumentId(documentId: number): Promise<AnalysisResult | undefined> {
    const [result] = await db
      .select()
      .from(analysisResults)
      .where(eq(analysisResults.documentId, documentId));
    
    return result || undefined;
  }
  
  async initializeGoldStandardClauses() {
    // Check if gold standard clauses already exist
    const existingClauses = await this.getAllGoldStandardClauses();
    if (existingClauses.length > 0) {
      return; // Already initialized
    }
    
    // Add some gold standard clauses for common types
    await this.createGoldStandardClause({
      type: "limitation_of_liability",
      content: "Each party's aggregate liability for any and all claims arising out of or relating to this Agreement will not exceed the greater of (a) the fees paid or payable by Customer to Supplier during the twelve (12) months immediately preceding the event giving rise to liability, or (b) $1,000,000. This limitation shall not apply to either party's indemnification obligations, confidentiality obligations, or liabilities arising from gross negligence, willful misconduct, or fraud.",
      description: "A balanced liability clause that establishes reasonable financial caps while excluding critical areas like indemnification, confidentiality breaches, and willful misconduct."
    });
    
    await this.createGoldStandardClause({
      type: "termination",
      content: "Either party may terminate this Agreement: (a) with 60 days' prior written notice to the other party for any reason; (b) immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within 30 days of receiving written notice thereof; or (c) immediately if the other party becomes insolvent or files for bankruptcy. Upon termination, Customer shall pay for all services rendered up to the termination date, and Supplier shall provide reasonable transition assistance for up to 30 days.",
      description: "A balanced termination clause with equal notice periods for both parties, clear breach remediation process, and reasonable transition assistance."
    });
    
    await this.createGoldStandardClause({
      type: "intellectual_property",
      content: "Customer shall own all right, title, and interest in and to all deliverables created specifically for Customer under this Agreement ('Customer IP'). Supplier hereby assigns all right, title, and interest in Customer IP to Customer. Supplier retains ownership of all pre-existing intellectual property and any general knowledge, skills, or know-how developed during the course of providing services. Supplier grants Customer a perpetual, worldwide, non-exclusive, royalty-free license to use Supplier's pre-existing intellectual property solely as necessary to use the deliverables.",
      description: "A balanced IP clause that gives the customer ownership of custom-developed deliverables while allowing the supplier to retain rights to pre-existing IP and know-how."
    });
    
    await this.createGoldStandardClause({
      type: "indemnification",
      content: "Each party ('Indemnifying Party') shall defend, indemnify, and hold harmless the other party ('Indemnified Party') from and against any third-party claims, liabilities, damages, and costs (including reasonable attorneys' fees) arising from: (a) the Indemnifying Party's gross negligence or willful misconduct; (b) the Indemnifying Party's breach of this Agreement; or (c) the Indemnifying Party's violation of applicable law. Supplier shall additionally indemnify Customer against any claim alleging that Customer's authorized use of the deliverables infringes or misappropriates a third party's intellectual property rights.",
      description: "A balanced indemnification clause that requires both parties to protect each other from third-party claims, with additional IP infringement protection for the customer."
    });
    
    await this.createGoldStandardClause({
      type: "payment_terms",
      content: "Customer shall pay all undisputed invoices within 30 days of receipt. Customer shall notify Supplier of any disputed invoice items within 10 days of receipt, and the parties shall work in good faith to resolve such disputes. Any undisputed amounts not paid when due will accrue interest at a rate of 1% per month or the maximum rate permitted by law, whichever is less.",
      description: "A balanced payment clause with standard 30-day payment terms, a clear dispute resolution process, and reasonable interest charges for late payments."
    });
    
    await this.createGoldStandardClause({
      type: "confidentiality",
      content: "Each party shall maintain the confidentiality of the other party's Confidential Information and shall not disclose or use such Confidential Information except as necessary to perform under this Agreement. Each party shall protect the other party's Confidential Information using at least the same degree of care it uses to protect its own confidential information, but no less than reasonable care. These obligations shall survive termination of this Agreement for a period of 5 years, except for trade secrets, which shall be held in confidence for so long as they remain trade secrets under applicable law.",
      description: "A balanced confidentiality clause that protects both parties' information with a reasonable 5-year term and clear requirements for information protection."
    });
  }
}

// Create and initialize the storage
export const storage = new DatabaseStorage();

// Initialize gold standard clauses
(async () => {
  try {
    await storage.initializeGoldStandardClauses();
    console.log("Gold standard clauses initialized");
  } catch (error) {
    console.error("Error initializing gold standard clauses:", error);
  }
})();