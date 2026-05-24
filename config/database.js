const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:              process.env.DB_HOST     || 'localhost',
  port:              parseInt(process.env.DB_PORT) || 3306,
  database:          process.env.DB_NAME     || 'gtimes_db',
  user:              process.env.DB_USER     || 'root',
  password:          process.env.DB_PASS     || '',
  waitForConnections: true,
  connectionLimit:   10,
  timezone:          '+05:30',
});

module.exports = pool;
