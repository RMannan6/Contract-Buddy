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
  PartyInfo,
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

    // Pre-generate ID from explicit Snowflake sequence
    const idRows = await snowflakeDb.execute<any>(
      `SELECT seq_documents.NEXTVAL as next_id`
    );
    const newId = idRows[0]?.NEXT_ID || idRows[0]?.next_id;
    
    if (!newId) {
      throw new Error('Failed to generate document ID from sequence');
    }

    // Insert with the pre-generated ID
    await snowflakeDb.execute(
      `INSERT INTO documents (id, file_name, file_type, content, uploaded_at, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId, doc.fileName, doc.fileType, doc.content, createdAt.toISOString(), expiresAt.toISOString()]
    );
    
    // Query back using the known ID
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM documents WHERE id = ?`,
      [newId]
    );
    
    if (!rows[0]) {
      throw new Error('Failed to retrieve inserted document');
    }
    
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
      userPartyType: row.USER_PARTY_TYPE || row.userPartyType || null,
      draftingPartyName: row.DRAFTING_PARTY_NAME || row.draftingPartyName || null,
      userEntityName: row.USER_ENTITY_NAME || row.userEntityName || null,
    } as Document;
  }

  async updateDocumentContent(id: number, content: string): Promise<void> {
    await snowflakeDb.execute(
      `UPDATE documents SET content = ? WHERE id = ?`,
      [content, id]
    );
  }

  async updateDocumentPartyInfo(documentId: number, partyInfo: PartyInfo): Promise<Document | undefined> {
    await snowflakeDb.execute(
      `UPDATE documents SET user_party_type = ?, drafting_party_name = ?, user_entity_name = ? WHERE id = ?`,
      [partyInfo.userPartyType, partyInfo.draftingPartyName || null, partyInfo.userEntityName || null, documentId]
    );
    
    // Query back the updated document
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM documents WHERE id = ? LIMIT 1`,
      [documentId]
    );
    
    if (!rows[0]) return undefined;
    
    const row = rows[0];
    return {
      id: row.ID || row.id,
      fileName: row.FILE_NAME || row.fileName,
      fileType: row.FILE_TYPE || row.fileType,
      content: row.CONTENT || row.content,
      uploadedAt: row.UPLOADED_AT || row.uploadedAt,
      expiresAt: row.EXPIRES_AT || row.expiresAt,
      userPartyType: row.USER_PARTY_TYPE || row.userPartyType || null,
      draftingPartyName: row.DRAFTING_PARTY_NAME || row.draftingPartyName || null,
      userEntityName: row.USER_ENTITY_NAME || row.userEntityName || null,
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
      userPartyType: row.USER_PARTY_TYPE || row.userPartyType || null,
      draftingPartyName: row.DRAFTING_PARTY_NAME || row.draftingPartyName || null,
      userEntityName: row.USER_ENTITY_NAME || row.userEntityName || null,
    }));
  }

  async deleteExpiredDocuments(): Promise<void> {
    await snowflakeDb.execute(
      `DELETE FROM documents WHERE expires_at < CURRENT_TIMESTAMP()`
    );
  }

  async createClause(clause: InsertClause): Promise<Clause> {
    // Pre-generate ID from explicit Snowflake sequence
    const idRows = await snowflakeDb.execute<any>(
      `SELECT seq_clauses.NEXTVAL as next_id`
    );
    const newId = idRows[0]?.NEXT_ID || idRows[0]?.next_id;
    
    if (!newId) {
      throw new Error('Failed to generate clause ID from sequence');
    }

    await snowflakeDb.execute(
      `INSERT INTO clauses (id, document_id, content, type, risk_level, position) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId, clause.documentId, clause.content, clause.type || null, clause.riskLevel || null, clause.position]
    );
    
    // Query back using the known ID
    const rows = await snowflakeDb.execute<any>(
      `SELECT * FROM clauses WHERE id = ?`,
      [newId]
    );
    
    if (!rows[0]) {
      throw new Error('Failed to retrieve inserted clause');
    }
    
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
    
    // Pre-generate ID from explicit Snowflake sequence
    const idRows = await snowflakeDb.execute<any>(
      `SELECT seq_analysis_results.NEXTVAL as next_id`
    );
    const newId = idRows[0]?.NEXT_ID || idRows[0]?.next_id;
    
    if (!newId) {
      throw new Error('Failed to generate analysis result ID from sequence');
    }
    
    // Store negotiation_points as TEXT (JSON string)
    await snowflakeDb.execute(
      `INSERT INTO analysis_results (id, document_id, negotiation_points, created_at) 
       VALUES (?, ?, ?, ?)`,
      [newId, result.documentId, JSON.stringify(result.negotiationPoints), createdAt.toISOString()]
    );
    
    // Query back using the known ID
    const rows = await snowflakeDb.execute<any>(
      `SELECT id, document_id, negotiation_points, created_at 
       FROM analysis_results WHERE id = ?`,
      [newId]
    );
    
    if (!rows[0]) {
      throw new Error('Failed to retrieve inserted analysis result');
    }
    
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
