import { 
  users, 
  documents, 
  clauses, 
  goldStandardClauses, 
  analysisResults,
  type User, 
  type InsertUser, 
  type Document, 
  type InsertDocument, 
  type Clause, 
  type InsertClause, 
  type GoldStandardClause, 
  type InsertGoldStandardClause,
  type AnalysisResult,
  type InsertAnalysisResult,
  type NegotiationPoint
} from "@shared/schema";
import { randomUUID } from "crypto";

// Define the storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
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

// In-memory implementation of the storage interface
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private clauses: Map<number, Clause>;
  private goldStandardClauses: Map<number, GoldStandardClause>;
  private analysisResults: Map<number, AnalysisResult>;
  private userId: number;
  private documentId: number;
  private clauseId: number;
  private goldStandardClauseId: number;
  private analysisResultId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.clauses = new Map();
    this.goldStandardClauses = new Map();
    this.analysisResults = new Map();
    this.userId = 1;
    this.documentId = 1;
    this.clauseId = 1;
    this.goldStandardClauseId = 1;
    this.analysisResultId = 1;
    this.initializeGoldStandardClauses();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Document operations
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentId++;
    // Ensure uploadedAt is set if not already
    const uploadedAt = insertDocument.uploadedAt || new Date();
    const document: Document = { 
      ...insertDocument, 
      id,
      uploadedAt 
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async deleteExpiredDocuments(): Promise<void> {
    const now = new Date();
    // Convert to array first to avoid iterator issues
    const documents = Array.from(this.documents.entries());
    
    for (const [id, document] of documents) {
      if (new Date(document.expiresAt) <= now) {
        this.documents.delete(id);
        
        // Delete associated clauses
        const documentClauses = Array.from(this.clauses.values())
          .filter(clause => clause.documentId === id);
          
        for (const clause of documentClauses) {
          this.clauses.delete(clause.id);
        }
        
        // Delete associated analysis results
        const analysisResultsToDelete = Array.from(this.analysisResults.values())
          .filter(result => result.documentId === id);
          
        for (const result of analysisResultsToDelete) {
          this.analysisResults.delete(result.id);
        }
      }
    }
  }

  // Clause operations
  async createClause(insertClause: InsertClause): Promise<Clause> {
    const id = this.clauseId++;
    const clause: Clause = { 
      ...insertClause, 
      id,
      type: insertClause.type || null,
      riskLevel: insertClause.riskLevel || null
    };
    this.clauses.set(id, clause);
    return clause;
  }

  async getClausesByDocumentId(documentId: number): Promise<Clause[]> {
    return Array.from(this.clauses.values())
      .filter(clause => clause.documentId === documentId)
      .sort((a, b) => a.position - b.position);
  }

  // Gold standard clauses operations
  async createGoldStandardClause(insertClause: InsertGoldStandardClause): Promise<GoldStandardClause> {
    const id = this.goldStandardClauseId++;
    const clause: GoldStandardClause = { 
      ...insertClause, 
      id,
      embedding: insertClause.embedding || null,
      metadata: insertClause.metadata || {}
    };
    this.goldStandardClauses.set(id, clause);
    return clause;
  }

  async getAllGoldStandardClauses(): Promise<GoldStandardClause[]> {
    return Array.from(this.goldStandardClauses.values());
  }

  async getGoldStandardClausesByType(type: string): Promise<GoldStandardClause[]> {
    return Array.from(this.goldStandardClauses.values())
      .filter(clause => clause.type === type);
  }

  // Analysis operations
  async createAnalysisResult(insertAnalysisResult: InsertAnalysisResult): Promise<AnalysisResult> {
    const id = this.analysisResultId++;
    const createdAt = new Date();
    const analysisResult: AnalysisResult = {
      ...insertAnalysisResult,
      id,
      createdAt
    };
    this.analysisResults.set(id, analysisResult);
    return analysisResult;
  }

  async getAnalysisResultByDocumentId(documentId: number): Promise<AnalysisResult | undefined> {
    return Array.from(this.analysisResults.values())
      .find(result => result.documentId === documentId);
  }

  // Initialize gold standard clauses
  private async initializeGoldStandardClauses() {
    // Add seed data for gold standard clauses
    const goldStandardClausesData: InsertGoldStandardClause[] = [
      {
        type: "limitation_of_liability",
        content: "Each party's total liability arising out of or related to this Agreement, whether in contract, tort or otherwise, shall not exceed three times the total amount paid by Customer under this Agreement, or $1,000,000, whichever is greater. This limitation shall not apply to either party's indemnification obligations, breaches of confidentiality, data breaches, or gross negligence.",
        embedding: "",
        metadata: { 
          riskLevel: "low",
          explanation: "This balanced clause provides a reasonable cap on liability while excluding certain serious breaches from the limitation."
        }
      },
      {
        type: "termination",
        content: "Either party may terminate this Agreement for convenience upon sixty (60) days' written notice to the other party. In the event Supplier terminates for convenience, Supplier shall provide reasonable transition assistance to Customer at no additional cost for a period of up to 30 days following the termination date.",
        embedding: "",
        metadata: { 
          riskLevel: "low",
          explanation: "This clause provides equal termination rights to both parties with reasonable notice periods and transition assistance provisions."
        }
      },
      {
        type: "intellectual_property",
        content: "All intellectual property rights, including but not limited to patents, copyrights, trademarks and trade secrets, in any materials specifically created for Customer by Supplier under this Agreement shall be owned exclusively by Customer. Supplier shall retain ownership of its pre-existing intellectual property and general know-how. Supplier hereby grants Customer a perpetual, irrevocable, worldwide, royalty-free license to use, modify, and incorporate Supplier's pre-existing intellectual property as necessary to use the deliverables for any business purpose.",
        embedding: "",
        metadata: { 
          riskLevel: "low",
          explanation: "This clause ensures that the customer owns the IP they pay for while protecting the supplier's existing IP with reasonable license terms."
        }
      },
      {
        type: "indemnification",
        content: "Each party shall defend, indemnify and hold harmless the other party from and against all claims, damages, losses and expenses, including but not limited to attorneys' fees, arising out of or resulting from such party's breach of this Agreement, violation of applicable law, or negligent or willful acts or omissions. Supplier shall additionally indemnify Customer against any claims alleging that Customer's authorized use of the deliverables infringes any third party's intellectual property rights.",
        embedding: "",
        metadata: { 
          riskLevel: "low",
          explanation: "This mutual indemnification clause fairly protects both parties with added IP infringement protection for the customer."
        }
      },
      {
        type: "payment_terms",
        content: "Customer shall pay all undisputed invoices within thirty (30) days of receipt. Customer shall notify Supplier of any disputed invoice items within 10 days of receipt, and the parties shall work in good faith to resolve such disputes. Any undisputed amounts not paid when due will accrue interest at a rate of 1% per month or the maximum rate permitted by law, whichever is less.",
        embedding: "",
        metadata: { 
          riskLevel: "low",
          explanation: "This clause provides standard 30-day payment terms with reasonable dispute resolution procedures and interest rates."
        }
      },
      // Additional Gold Standard Clauses
      {
        type: "confidentiality",
        content: "Each party shall maintain the confidentiality of the other party's Confidential Information for a period of five (5) years following the end of this Agreement, using at least the same degree of care as it uses to protect its own confidential information, but no less than reasonable care. Neither party shall use the other party's Confidential Information except as necessary to perform its obligations under this Agreement.",
        embedding: "",
        metadata: { 
          riskLevel: "low",
          explanation: "This balanced confidentiality clause protects both parties with standard duration and reasonable protection requirements."
        }
      },
      {
        type: "governing_law",
        content: "This Agreement shall be governed by and construed in accordance with the laws of the State where Customer's principal place of business is located, without giving effect to any conflict of laws principles. The parties agree to submit to the personal and exclusive jurisdiction of the courts located within such State.",
        embedding: "",
        metadata: { 
          riskLevel: "low",
          explanation: "This clause uses the customer's home jurisdiction, which is advantageous as it avoids the need to litigate in unfamiliar locations."
        }
      },
      {
        type: "warranty",
        content: "Supplier warrants that the services will be performed in a professional and workmanlike manner consistent with industry standards for a period of ninety (90) days from delivery. Supplier further warrants that any deliverables will substantially conform to their specifications for a period of ninety (90) days from delivery. Customer's exclusive remedy for breach of this warranty is for Supplier to re-perform the services or repair/replace the non-conforming deliverables.",
        embedding: "",
        metadata: { 
          riskLevel: "low",
          explanation: "This clause provides a standard 90-day warranty period with clear remedies for any issues that arise."
        }
      },
      {
        type: "assignment",
        content: "Neither party may assign this Agreement, in whole or in part, without the prior written consent of the other party, which shall not be unreasonably withheld or delayed. Notwithstanding the foregoing, either party may assign this Agreement to an affiliate or in connection with a merger, acquisition, or sale of all or substantially all of its assets upon written notice to the other party.",
        embedding: "",
        metadata: { 
          riskLevel: "low",
          explanation: "This assignment clause requires consent for general assignments while permitting standard business flexibility for corporate reorganizations."
        }
      }
    ];

    for (const clauseData of goldStandardClausesData) {
      await this.createGoldStandardClause(clauseData);
    }
  }
}

// Export storage instance
export const storage = new MemStorage();
