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

  async execute<T = any>(sqlText: string, binds?: any[], options?: { jsonParse?: boolean }): Promise<T[]> {
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

  async uploadFileToStage(
    localFilePath: string,
    stageName: string,
    stageFilePath: string
  ): Promise<void> {
    const conn = await this.connect();

    // Validate stageFilePath matches expected pattern to prevent injection
    if (!/^doc_\d+\.(pdf|docx|jpg|png|bin)$/.test(stageFilePath)) {
      throw new Error(`Invalid stage file path: ${stageFilePath}`);
    }

    // Validate localFilePath to prevent injection (must be in tmp dir)
    if (!localFilePath.includes('/tmp/') && !localFilePath.includes('\\tmp\\')) {
      throw new Error(`Invalid local file path: ${localFilePath}`);
    }

    return new Promise((resolve, reject) => {
      conn.execute({
        sqlText: `PUT file://${localFilePath} @${stageName}/${stageFilePath} AUTO_COMPRESS=FALSE OVERWRITE=TRUE`,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Failed to upload file to stage:', err);
            reject(err);
          } else {
            console.log(`File uploaded successfully to @${stageName}/${stageFilePath}`);
            resolve();
          }
        },
      });
    });
  }

  async predictWithDocumentAI(
    stageName: string,
    stageFilePath: string,
    modelName: string = 'CONTRACTBUDDY'
  ): Promise<any> {
    const conn = await this.connect();

    return new Promise((resolve, reject) => {
      // Use parameterized query to prevent SQL injection
      const sqlText = `
        SELECT "${this.config.database}"."${this.config.schema}"."${modelName}" ! PREDICT(
          GET_PRESIGNED_URL(@${stageName}, ?),
          2
        ) AS prediction
      `;

      conn.execute({
        sqlText,
        binds: [stageFilePath],
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Failed to execute Document AI prediction:', err);
            reject(err);
          } else {
            console.log('Document AI prediction completed successfully');
            resolve(rows && rows.length > 0 ? rows[0] : null);
          }
        },
      });
    });
  }

  async removeFileFromStage(stageName: string, stageFilePath: string): Promise<void> {
    const conn = await this.connect();

    // Validate stageFilePath matches expected pattern to prevent injection
    if (!/^doc_\d+\.(pdf|docx|jpg|png|bin)$/.test(stageFilePath)) {
      throw new Error(`Invalid stage file path: ${stageFilePath}`);
    }

    return new Promise((resolve, reject) => {
      conn.execute({
        sqlText: `REMOVE @${stageName}/${stageFilePath}`,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Failed to remove file from stage:', err);
            reject(err);
          } else {
            console.log(`File removed from stage: @${stageName}/${stageFilePath}`);
            resolve();
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
