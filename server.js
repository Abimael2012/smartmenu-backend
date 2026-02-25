require('dotenv').config(); // Carga tu contraseña secreta
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión segura a Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Neon pide esto por seguridad
  }
});

// ==========================================
// RUTA 1: Obtener el menú del restaurante
// ==========================================
app.get('/api/menu/:restauranteId', async (req, res) => {
  try {
    const { restauranteId } = req.params;

    // Buscamos el restaurante
    const restQuery = await pool.query('SELECT * FROM restaurantes WHERE id = $1', [restauranteId]);
    
    if (restQuery.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Restaurante no encontrado' });
    }

    const restaurante = restQuery.rows[0];

    // Buscamos sus platillos
    const menuQuery = await pool.query(`
      SELECT c.nombre as categoria, p.id, p.nombre, p.descripcion, p.precio, p.imagen_url 
      FROM categorias c
      JOIN platillos p ON c.id = p.categoria_id
      WHERE c.restaurante_id = $1 AND p.disponible = true
      ORDER BY c.orden, p.nombre
    `, [restauranteId]);

    // Devolvemos la info empaquetada
    res.json({
      restaurante: {
        nombre: restaurante.nombre,
        logo: restaurante.logo_url,
        color: restaurante.color_primario
      },
      platillos: menuQuery.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Encendemos el motor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});