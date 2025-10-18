import { IStorage } from './storage';
import {
  User,
  InsertUser,
  Document,
  InsertDocument,
  Clause,
  InsertClause,
  GoldStandardClause,
  InsertGoldStandardClause,
  AnalysisResult,
  InsertAnalysisResult,
} from '@shared/schema';
import snowflakeDb from './snowflake-db';

export class SnowflakeStorage implements IStorage {
  async initializeGoldStandardClauses(): Promise<void> {
    try {
      const existing = await this.getAllGoldStandardClauses();
      if (existing.length > 0) {
        console.log('Gold standard clauses already initialized');
        return;
      }

      const goldStandards: Omit<InsertGoldStandardClause, 'id'>[] = [
        {
          type: 'limitation_of_liability',
          content: 'Neither party shall be liable for any indirect, incidental, special, consequential or punitive damages.',
          description: 'Fair mutual limitation protecting both parties',
        },
        {
          type: 'termination',
          content: 'Either party may terminate this Agreement with sixty (60) days written notice.',
          description: 'Balanced termination clause with reasonable notice period',
        },
        {
          type: 'intellectual_property',
          content: 'Each party retains all rights to its pre-existing intellectual property. Any jointly developed IP shall be jointly owned.',
          description: 'Fair IP clause protecting both parties',
        },
        {
          type: 'indemnification',
          content: 'Each party shall indemnify the other for claims arising from its own negligence or willful misconduct.',
          description: 'Mutual indemnification clause',
        },
        {
          type: 'payment_terms',
          content: 'Payment shall be due within thirty (30) days of invoice date.',
          description: 'Standard payment terms',
        },
      ];

      for (const clause of goldStandards) {
        await snowflakeDb.execute(
          `INSERT INTO gold_standard_clauses (type, content, description) VALUES (?, ?, ?)`,
          [clause.type, clause.content, clause.description || null]
        );
      }

      console.log('Gold standard clauses initialized');
    } catch (error) {
      console.error('Error initializing gold standard clauses:', error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    await snowflakeDb.execute(
      `INSERT INTO users (username, password) VALUES (?, ?)`,
      [user.username, user.password]
    );
    
    // Snowflake doesn't support RETURNING, so query back the inserted user
    const rows = await snowflakeDb.execute<User>(
      `SELECT * FROM users WHERE username = ? ORDER BY id DESC LIMIT 1`,
      [user.username]
    );
    return rows[0];
  }

  async getUser(id: number): Promise<User | undefined> {
    const rows = await snowflakeDb.execute<User>(
      `SELECT * FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await snowflakeDb.execute<User>(
      `SELECT * FROM users WHERE username = ? LIMIT 1`,
      [username]
    );
    return rows[0];
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const createdAt = new Date();
    const expiresAt = doc.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

    await snowflakeDb.execute(
      `INSERT INTO documents (file_name, file_type, content, uploaded_at, expires_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [doc.fileName, doc.fileType, doc.content, createdAt.toISOString(), expiresAt.toISOString()]
    );
    
    // Query back the inserted document
    const rows = await snowflakeDb.execute<Document>(
      `SELECT * FROM documents WHERE file_name = ? AND uploaded_at = ? ORDER BY id DESC LIMIT 1`,
      [doc.fileName, createdAt.toISOString()]
    );
    return rows[0];
  }

  async getDocument(id: number): Promise<Document> {
    const rows = await snowflakeDb.execute<Document>(
      `SELECT * FROM documents WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows[0]) {
      throw new Error(`Document with id ${id} not found`);
    }
    return rows[0];
  }

  async getAllDocuments(): Promise<Document[]> {
    return snowflakeDb.execute<Document>(`SELECT * FROM documents ORDER BY uploaded_at DESC`);
  }

  async deleteExpiredDocuments(): Promise<void> {
    await snowflakeDb.execute(
      `DELETE FROM documents WHERE expires_at < CURRENT_TIMESTAMP()`
    );
  }

  async createClause(clause: InsertClause): Promise<Clause> {
    await snowflakeDb.execute(
      `INSERT INTO clauses (document_id, content, type, risk_level, position) 
       VALUES (?, ?, ?, ?, ?)`,
      [clause.documentId, clause.content, clause.type || null, clause.riskLevel || null, clause.position]
    );
    
    // Query back the inserted clause
    const rows = await snowflakeDb.execute<Clause>(
      `SELECT * FROM clauses WHERE document_id = ? AND position = ? ORDER BY id DESC LIMIT 1`,
      [clause.documentId, clause.position]
    );
    return rows[0];
  }

  async getClausesByDocumentId(documentId: number): Promise<Clause[]> {
    return snowflakeDb.execute<Clause>(
      `SELECT * FROM clauses WHERE document_id = ? ORDER BY position`,
      [documentId]
    );
  }

  async createGoldStandardClause(clause: InsertGoldStandardClause): Promise<GoldStandardClause> {
    await snowflakeDb.execute(
      `INSERT INTO gold_standard_clauses (type, content, description) 
       VALUES (?, ?, ?)`,
      [clause.type, clause.content, clause.description || null]
    );
    
    // Query back the inserted clause
    const rows = await snowflakeDb.execute<GoldStandardClause>(
      `SELECT * FROM gold_standard_clauses WHERE type = ? AND content = ? ORDER BY id DESC LIMIT 1`,
      [clause.type, clause.content]
    );
    return rows[0];
  }

  async getAllGoldStandardClauses(): Promise<GoldStandardClause[]> {
    return snowflakeDb.execute<GoldStandardClause>(
      `SELECT * FROM gold_standard_clauses`
    );
  }

  async getGoldStandardClausesByType(type: string): Promise<GoldStandardClause[]> {
    return snowflakeDb.execute<GoldStandardClause>(
      `SELECT * FROM gold_standard_clauses WHERE type = ?`,
      [type]
    );
  }

  async createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult> {
    const createdAt = new Date();
    const negotiationPointsJson = JSON.stringify(result.negotiationPoints);

    await snowflakeDb.execute(
      `INSERT INTO analysis_results (document_id, negotiation_points, created_at) 
       VALUES (?, PARSE_JSON(?), ?)`,
      [result.documentId, negotiationPointsJson, createdAt.toISOString()]
    );
    
    // Query back the inserted result
    const rows = await snowflakeDb.execute<any>(
      `SELECT id, document_id, negotiation_points, created_at 
       FROM analysis_results WHERE document_id = ? ORDER BY id DESC LIMIT 1`,
      [result.documentId]
    );
    
    const row = rows[0];
    if (typeof row.negotiation_points === 'string') {
      row.negotiation_points = JSON.parse(row.negotiation_points);
    }
    
    return row as AnalysisResult;
  }

  async getAnalysisResultByDocumentId(documentId: number): Promise<AnalysisResult> {
    const rows = await snowflakeDb.execute<any>(
      `SELECT id, document_id, negotiation_points, created_at FROM analysis_results WHERE document_id = ? LIMIT 1`,
      [documentId]
    );
    if (!rows[0]) {
      throw new Error(`Analysis result for document ${documentId} not found`);
    }
    
    // Snowflake returns VARIANT/OBJECT types as strings, parse if needed
    const result = rows[0];
    if (typeof result.negotiation_points === 'string') {
      result.negotiation_points = JSON.parse(result.negotiation_points);
    }
    
    return result as AnalysisResult;
  }
}
