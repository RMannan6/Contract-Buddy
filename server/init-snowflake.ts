import snowflakeDb from './snowflake-db';

export async function initializeSnowflakeTables(): Promise<void> {
  try {
    console.log('Initializing Snowflake tables...');
    
    // Create users table
    await snowflakeDb.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id NUMBER AUTOINCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `);

    // Create documents table
    await snowflakeDb.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id NUMBER AUTOINCREMENT PRIMARY KEY,
        file_name VARCHAR(500) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        uploaded_at TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP(),
        expires_at TIMESTAMP_NTZ NOT NULL
      )
    `);

    // Create clauses table
    await snowflakeDb.execute(`
      CREATE TABLE IF NOT EXISTS clauses (
        id NUMBER AUTOINCREMENT PRIMARY KEY,
        document_id NUMBER NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(100),
        risk_level VARCHAR(50),
        position NUMBER NOT NULL
      )
    `);

    // Create gold_standard_clauses table
    await snowflakeDb.execute(`
      CREATE TABLE IF NOT EXISTS gold_standard_clauses (
        id NUMBER AUTOINCREMENT PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT,
        description TEXT,
        metadata VARIANT
      )
    `);

    // Create analysis_results table
    await snowflakeDb.execute(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id NUMBER AUTOINCREMENT PRIMARY KEY,
        document_id NUMBER NOT NULL,
        negotiation_points VARIANT NOT NULL,
        created_at TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
      )
    `);

    console.log('Snowflake tables initialized successfully');
  } catch (error) {
    console.error('Error initializing Snowflake tables:', error);
    throw error;
  }
}
