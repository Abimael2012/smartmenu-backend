const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 Intentando conectar a la base de datos...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada ✓' : 'No configurada ✗');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ Error de conexión:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Conexión exitosa!');
    console.log('Hora en BD:', result.rows[0]);
    
    // Verificar tablas
    pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `, (err, result) => {
      if (err) {
        console.error('❌ Error al verificar tablas:', err.message);
      } else {
        console.log('\n📋 Tablas en la BD:');
        result.rows.forEach(row => console.log('  -', row.table_name));
      }
      pool.end();
    });
  }
});
