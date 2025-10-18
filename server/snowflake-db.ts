import snowflake from 'snowflake-sdk';

interface SnowflakeConfig {
  account: string;
  username: string;
  password: string;
  database: string;
  schema: string;
  warehouse: string;
}

function getSnowflakeConfig(): SnowflakeConfig {
  const account = process.env.SNOWFLAKE_ACCOUNT;
  const username = process.env.SNOWFLAKE_USERNAME;
  const password = process.env.SNOWFLAKE_PASSWORD;
  const database = process.env.SNOWFLAKE_DATABASE;
  const schema = process.env.SNOWFLAKE_SCHEMA;
  const warehouse = process.env.SNOWFLAKE_WAREHOUSE;

  if (!account || !username || !password || !database || !schema || !warehouse) {
    throw new Error(
      'Missing Snowflake credentials. Please ensure all Snowflake environment variables are set.'
    );
  }

  return { account, username, password, database, schema, warehouse };
}

class SnowflakeConnection {
  private connection: snowflake.Connection | null = null;
  private config: SnowflakeConfig;

  constructor() {
    this.config = getSnowflakeConfig();
  }

  async connect(): Promise<snowflake.Connection> {
    if (this.connection) {
      return this.connection;
    }

    return new Promise((resolve, reject) => {
      this.connection = snowflake.createConnection({
        account: this.config.account,
        username: this.config.username,
        password: this.config.password,
        database: this.config.database,
        schema: this.config.schema,
        warehouse: this.config.warehouse,
      });

      this.connection.connect((err, conn) => {
        if (err) {
          console.error('Unable to connect to Snowflake:', err);
          reject(err);
        } else {
          console.log('Successfully connected to Snowflake');
          resolve(conn);
        }
      });
    });
  }

  async execute<T = any>(sqlText: string, binds?: any[]): Promise<T[]> {
    const conn = await this.connect();

    return new Promise((resolve, reject) => {
      conn.execute({
        sqlText,
        binds,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Failed to execute statement:', err);
            reject(err);
          } else {
            resolve((rows || []) as T[]);
          }
        },
      });
    });
  }

  async destroy(): Promise<void> {
    if (this.connection) {
      return new Promise((resolve, reject) => {
        this.connection!.destroy((err) => {
          if (err) {
            console.error('Unable to disconnect from Snowflake:', err);
            reject(err);
          } else {
            console.log('Disconnected from Snowflake');
            this.connection = null;
            resolve();
          }
        });
      });
    }
  }
}

export const snowflakeDb = new SnowflakeConnection();
export default snowflakeDb;
