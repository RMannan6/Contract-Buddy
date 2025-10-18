import snowflakeDb from './snowflake-db';

export async function initializeSnowflakeTables(): Promise<void> {
  try {
    console.log('Initializing Snowflake tables...');
    
    // Create explicit sequences for all tables (required for accessing NEXTVAL)
    await snowflakeDb.execute(`CREATE SEQUENCE IF NOT EXISTS seq_users START = 1 INCREMENT = 1`);
    await snowflakeDb.execute(`CREATE SEQUENCE IF NOT EXISTS seq_documents START = 1 INCREMENT = 1`);
    await snowflakeDb.execute(`CREATE SEQUENCE IF NOT EXISTS seq_clauses START = 1 INCREMENT = 1`);
    await snowflakeDb.execute(`CREATE SEQUENCE IF NOT EXISTS seq_gold_standard_clauses START = 1 INCREMENT = 1`);
    await snowflakeDb.execute(`CREATE SEQUENCE IF NOT EXISTS seq_analysis_results START = 1 INCREMENT = 1`);
    
    // Create users table with explicit sequence
    await snowflakeDb.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id NUMBER DEFAULT seq_users.NEXTVAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `);

    // Create documents table with explicit sequence
    await snowflakeDb.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id NUMBER DEFAULT seq_documents.NEXTVAL PRIMARY KEY,
        file_name VARCHAR(500) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        uploaded_at TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP(),
        expires_at TIMESTAMP_NTZ NOT NULL
      )
    `);

    // Create clauses table with explicit sequence
    await snowflakeDb.execute(`
      CREATE TABLE IF NOT EXISTS clauses (
        id NUMBER DEFAULT seq_clauses.NEXTVAL PRIMARY KEY,
        document_id NUMBER NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(100),
        risk_level VARCHAR(50),
        position NUMBER NOT NULL
      )
    `);

    // Create gold_standard_clauses table with explicit sequence
    await snowflakeDb.execute(`
      CREATE TABLE IF NOT EXISTS gold_standard_clauses (
        id NUMBER DEFAULT seq_gold_standard_clauses.NEXTVAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT,
        description TEXT,
        metadata VARIANT
      )
    `);

    // Create analysis_results table with explicit sequence
    await snowflakeDb.execute(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id NUMBER DEFAULT seq_analysis_results.NEXTVAL PRIMARY KEY,
        document_id NUMBER NOT NULL,
        negotiation_points TEXT NOT NULL,
        created_at TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
      )
    `);

    console.log('Snowflake tables initialized successfully');
  } catch (error) {
    console.error('Error initializing Snowflake tables:', error);
    throw error;
  }
}
