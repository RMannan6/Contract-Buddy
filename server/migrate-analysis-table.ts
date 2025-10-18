import snowflakeDb from './snowflake-db';

async function migrateAnalysisTable() {
  try {
    console.log('Dropping old analysis_results table...');
    await snowflakeDb.execute('DROP TABLE IF EXISTS analysis_results');
    
    console.log('Creating new analysis_results table with TEXT column...');
    await snowflakeDb.execute(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id NUMBER AUTOINCREMENT PRIMARY KEY,
        document_id NUMBER NOT NULL,
        negotiation_points TEXT NOT NULL,
        created_at TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
      )
    `);
    
    console.log('Migration completed successfully!');
    await snowflakeDb.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateAnalysisTable();
