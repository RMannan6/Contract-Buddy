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
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM users WHERE username = ? ORDER BY id DESC LIMIT 1`,
      [user.username]
    );
    
    const row = rows[0];
    return {
      id: row.ID || row.id,
      username: row.USERNAME || row.username,
      password: row.PASSWORD || row.password,
    } as User;
  }

  async getUser(id: number): Promise<User | undefined> {
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    
    if (!rows[0]) return undefined;
    
    const row = rows[0];
    return {
      id: row.ID || row.id,
      username: row.USERNAME || row.username,
      password: row.PASSWORD || row.password,
    } as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM users WHERE username = ? LIMIT 1`,
      [username]
    );
    
    if (!rows[0]) return undefined;
    
    const row = rows[0];
    return {
      id: row.ID || row.id,
      username: row.USERNAME || row.username,
      password: row.PASSWORD || row.password,
    } as User;
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
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM documents WHERE file_name = ? ORDER BY id DESC LIMIT 1`,
      [doc.fileName]
    );
    
    const row = rows[0];
    return {
      id: row.ID || row.id,
      fileName: row.FILE_NAME || row.fileName,
      fileType: row.FILE_TYPE || row.fileType,
      content: row.CONTENT || row.content,
      uploadedAt: row.UPLOADED_AT || row.uploadedAt,
      expiresAt: row.EXPIRES_AT || row.expiresAt,
    } as Document;
  }

  async getDocument(id: number): Promise<Document> {
    console.log(`getDocument called with id: ${id}, type: ${typeof id}`);
    
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM documents WHERE ID = ? LIMIT 1`,
      [id]
    );
    
    console.log(`getDocument(${id}): Retrieved ${rows.length} rows`);
    if (rows.length > 0) {
      console.log('First row keys:', Object.keys(rows[0]));
      console.log('First row ID value:', rows[0].ID || rows[0].id);
    }
    
    if (!rows[0]) {
      throw new Error(`Document with id ${id} not found`);
    }
    
    // Snowflake returns column names in uppercase, normalize to camelCase
    const row = rows[0];
    return {
      id: row.ID || row.id,
      fileName: row.FILE_NAME || row.fileName,
      fileType: row.FILE_TYPE || row.fileType,
      content: row.CONTENT || row.content,
      uploadedAt: row.UPLOADED_AT || row.uploadedAt,
      expiresAt: row.EXPIRES_AT || row.expiresAt,
    } as Document;
  }

  async getAllDocuments(): Promise<Document[]> {
    const rows = await snowflakeDb.execute<any>(`SELECT * FROM documents ORDER BY UPLOADED_AT DESC`);
    
    return rows.map(row => ({
      id: row.ID || row.id,
      fileName: row.FILE_NAME || row.fileName,
      fileType: row.FILE_TYPE || row.fileType,
      content: row.CONTENT || row.content,
      uploadedAt: row.UPLOADED_AT || row.uploadedAt,
      expiresAt: row.EXPIRES_AT || row.expiresAt,
    }));
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
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM clauses WHERE document_id = ? AND position = ? ORDER BY id DESC LIMIT 1`,
      [clause.documentId, clause.position]
    );
    
    const row = rows[0];
    return {
      id: row.ID || row.id,
      documentId: row.DOCUMENT_ID || row.documentId,
      content: row.CONTENT || row.content,
      type: row.TYPE || row.type,
      riskLevel: row.RISK_LEVEL || row.riskLevel,
      position: row.POSITION || row.position,
    } as Clause;
  }

  async getClausesByDocumentId(documentId: number): Promise<Clause[]> {
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM clauses WHERE document_id = ? ORDER BY position`,
      [documentId]
    );
    
    // Snowflake returns column names in uppercase, normalize to camelCase
    return rows.map(row => ({
      id: row.ID || row.id,
      documentId: row.DOCUMENT_ID || row.documentId,
      content: row.CONTENT || row.content,
      type: row.TYPE || row.type,
      riskLevel: row.RISK_LEVEL || row.riskLevel,
      position: row.POSITION || row.position,
    }));
  }

  async createGoldStandardClause(clause: InsertGoldStandardClause): Promise<GoldStandardClause> {
    await snowflakeDb.execute(
      `INSERT INTO gold_standard_clauses (type, content, description) 
       VALUES (?, ?, ?)`,
      [clause.type, clause.content, clause.description || null]
    );
    
    // Query back the inserted clause
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM gold_standard_clauses WHERE type = ? AND content = ? ORDER BY ID DESC LIMIT 1`,
      [clause.type, clause.content]
    );
    
    const row = rows[0];
    return {
      id: row.ID || row.id,
      type: row.TYPE || row.type,
      content: row.CONTENT || row.content,
      embedding: row.EMBEDDING || row.embedding,
      description: row.DESCRIPTION || row.description,
      metadata: row.METADATA || row.metadata,
    } as GoldStandardClause;
  }

  async getAllGoldStandardClauses(): Promise<GoldStandardClause[]> {
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM gold_standard_clauses`
    );
    
    // Snowflake returns column names in uppercase, normalize to camelCase
    return rows.map(row => ({
      id: row.ID || row.id,
      type: row.TYPE || row.type,
      content: row.CONTENT || row.content,
      embedding: row.EMBEDDING || row.embedding,
      description: row.DESCRIPTION || row.description,
      metadata: row.METADATA || row.metadata,
    }));
  }

  async getGoldStandardClausesByType(type: string): Promise<GoldStandardClause[]> {
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM gold_standard_clauses WHERE TYPE = ?`,
      [type]
    );
    
    return rows.map(row => ({
      id: row.ID || row.id,
      type: row.TYPE || row.type,
      content: row.CONTENT || row.content,
      embedding: row.EMBEDDING || row.embedding,
      description: row.DESCRIPTION || row.description,
      metadata: row.METADATA || row.metadata,
    }));
  }

  async createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult> {
    const createdAt = new Date();
    
    // Store negotiation_points as TEXT (JSON string)
    await snowflakeDb.execute(
      `INSERT INTO analysis_results (document_id, negotiation_points, created_at) 
       VALUES (?, ?, ?)`,
      [result.documentId, JSON.stringify(result.negotiationPoints), createdAt.toISOString()]
    );
    
    // Query back the inserted result
    const rows = await snowflakeDb.execute<any>(
      `SELECT id, document_id, negotiation_points, created_at 
       FROM analysis_results WHERE document_id = ? ORDER BY id DESC LIMIT 1`,
      [result.documentId]
    );
    
    const row = rows[0];
    let negotiationPoints = row.NEGOTIATION_POINTS || row.negotiation_points;
    
    if (typeof negotiationPoints === 'string') {
      negotiationPoints = JSON.parse(negotiationPoints);
    }
    
    return {
      id: row.ID || row.id,
      documentId: row.DOCUMENT_ID || row.documentId,
      negotiationPoints,
      createdAt: row.CREATED_AT || row.createdAt,
    } as AnalysisResult;
  }

  async getAnalysisResultByDocumentId(documentId: number): Promise<AnalysisResult> {
    const rows = await snowflakeDb.execute<any>(
      `SELECT id, document_id, negotiation_points, created_at FROM analysis_results WHERE document_id = ? LIMIT 1`,
      [documentId]
    );
    if (!rows[0]) {
      throw new Error(`Analysis result for document ${documentId} not found`);
    }
    
    const row = rows[0];
    let negotiationPoints = row.NEGOTIATION_POINTS || row.negotiation_points;
    
    // Parse if it's a string
    if (typeof negotiationPoints === 'string') {
      negotiationPoints = JSON.parse(negotiationPoints);
    }
    
    return {
      id: row.ID || row.id,
      documentId: row.DOCUMENT_ID || row.documentId,
      negotiationPoints,
      createdAt: row.CREATED_AT || row.createdAt,
    } as AnalysisResult;
  }
}
