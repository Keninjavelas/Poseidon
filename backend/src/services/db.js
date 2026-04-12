'use strict';

require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'poseidon-api',
});

/**
 * Executes a SQL query against the PostgreSQL pool.
 * Logs connection errors with a timestamp and re-throws them.
 *
 * @param {string} sql - The SQL query string.
 * @param {Array} [params] - Optional query parameters.
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(sql, params) {
  try {
    return await pool.query(sql, params);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DB query error:`, err.message);
    throw err;
  }
}

module.exports = { pool, query };
