const Database = require('better-sqlite3');
const db = new Database('Tareas.db');

module.exports = db;
