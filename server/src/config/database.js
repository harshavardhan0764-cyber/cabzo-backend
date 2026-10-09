/**
 * Database Connection Module
 * Supports both PostgreSQL (pg) and MySQL (mysql2)
 * Provides unified [rows, fields] = await db.execute(sql, params) interface
 */

const { Pool: PgPool } = require('pg');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbClient = (process.env.DB_CLIENT || (process.env.PG_DATABASE ? 'postgres' : 'postgres')).toLowerCase();
const isPostgres = dbClient === 'postgres' || dbClient === 'postgresql' || dbClient === 'pg';

let db;

if (isPostgres) {
  const pgConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PG_HOST || process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PG_PORT || process.env.PGPORT || '5432', 10),
        user: process.env.PG_USER || process.env.PGUSER || 'postgres',
        password: process.env.PG_PASSWORD || process.env.PGPASSWORD || '',
        database: process.env.PG_DATABASE || process.env.PGDATABASE || 'cabpro_db',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      };

  const rawPgPool = new PgPool(pgConfig);

  rawPgPool.on('error', (err) => {
    // Avoid unhandled error events in node process
    console.warn('⚠️ PostgreSQL pool notice:', err.message);
  });

  rawPgPool.connect()
    .then(client => {
      console.log('🐘 Successfully connected to PostgreSQL database');
      client.release();
    })
    .catch(err => {
      console.warn('⚠️ PostgreSQL connection failed:', err.message);
      console.warn('👉 Check your PostgreSQL host, user, password, and database in .env');
    });

  db = {
    isPostgres: true,
    isMysql: false,

    async query(sql, params = []) {
      return this.execute(sql, params);
    },

    async execute(sql, params = []) {
      // Transform ? parameter markers into $1, $2, $3 for PostgreSQL
      let paramIndex = 1;
      let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

      // If INSERT without RETURNING, append RETURNING id to simulate insertId
      const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
      if (isInsert && !/RETURNING/i.test(pgSql)) {
        pgSql += ' RETURNING id';
      }

      const res = await rawPgPool.query(pgSql, params);

      if (isInsert) {
        const insertId = res.rows && res.rows[0] ? res.rows[0].id : null;
        return [{ insertId, affectedRows: res.rowCount, rows: res.rows }, res.fields];
      }

      if (/^\s*(UPDATE|DELETE)\s+/i.test(pgSql)) {
        return [{ affectedRows: res.rowCount }, res.fields];
      }

      return [res.rows, res.fields];
    },

    rawPool: rawPgPool
  };
} else {
  // MySQL Mode
  const rawMysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'cabpro_db',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  rawMysqlPool.getConnection()
    .then(conn => {
      console.log('🐬 Successfully connected to MySQL database');
      conn.release();
    })
    .catch(err => {
      console.warn('⚠️ MySQL connection failed:', err.message);
      console.warn('👉 Check your MySQL credentials in .env');
    });

  db = rawMysqlPool;
}

module.exports = db;
