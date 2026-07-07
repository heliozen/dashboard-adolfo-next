import sql from "mssql";

// Cliente dedicado ao banco do Autolac (SQL Server, via VPN), separado do
// Postgres do dashboard (`db.ts`). Conexão configurada por AUTOLAC_* no .env.local.
const config: sql.config = {
  server: process.env.AUTOLAC_HOST ?? "",
  port: process.env.AUTOLAC_PORT ? Number(process.env.AUTOLAC_PORT) : 1433,
  database: process.env.AUTOLAC_DB,
  user: process.env.AUTOLAC_USER,
  password: process.env.AUTOLAC_PASSWORD,
  pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
  options: {
    encrypt: false, // rede interna via VPN; ajuste para true se o servidor exigir TLS
    trustServerCertificate: true,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().catch((err) => {
      poolPromise = null; // permite retry numa próxima chamada
      throw err;
    });
  }
  return poolPromise;
}

export async function autolacQuery<T = Record<string, unknown>>(
  text: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const pool = await getPool();
  const request = pool.request();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }
  const result = await request.query<T>(text);
  return result.recordset;
}
