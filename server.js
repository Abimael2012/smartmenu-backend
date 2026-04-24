require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// ========== BASE DE DATOS ==========
let pool = null;
let dbConnected = false;

function initializePool() {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      max: 5
    });

    pool.on('error', (err) => {
      console.error('Error en pool:', err.message);
      dbConnected = false;
    });

    pool.query('SELECT NOW()', (err) => {
      if (!err) {
        dbConnected = true;
        console.log('Base de datos conectada');
      } else {
        console.warn('BD no disponible inicialmente');
        setTimeout(() => initializePool(), 10000);
      }
    });
  } catch (e) {
    console.error('Error inicializando pool:', e.message);
  }
}

initializePool();

// ========== HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.json({
    status: 'SmartMenu API funcionando',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'conectada' : 'no disponible'
  });
});

app.get('/health', async (req, res) => {
  if (!dbConnected || !pool) {
    return res.status(503).json({ status: 'Base de datos no disponible', message: 'Conectando...' });
  }
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'Base de datos conectada', time: result.rows[0] });
  } catch (error) {
    res.status(503).json({ status: 'Error de BD', error: error.message });
  }
});

// ========== API: MENU PUBLICO ==========
app.get('/api/menu/:restauranteId', async (req, res) => {
  if (!dbConnected || !pool) {
    return res.status(503).json({ error: 'Base de datos no disponible. Intenta en unos segundos.' });
  }
  try {
    const { restauranteId } = req.params;
    const restQuery = await pool.query('SELECT * FROM restaurantes WHERE id = $1', [restauranteId]);
    if (restQuery.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Restaurante no encontrado' });
    }
    const resData = restQuery.rows[0];
    const menuQuery = await pool.query(`
      SELECT c.nombre as categoria, p.id, p.nombre, p.descripcion, p.precio, p.imagen_url
      FROM categorias c
      JOIN platillos p ON c.id = p.categoria_id
      WHERE c.restaurante_id = $1 AND p.disponible = true
      ORDER BY c.orden, p.nombre
    `, [restauranteId]);
    res.json({
      restaurante: {
        nombre: resData.nombre,
        logo: resData.logo_url,
        color_primario: resData.color_primario,
        color_secundario: resData.color_secundario,
        color_fondo: resData.color_fondo,
        tipo_fuente: resData.tipo_fuente
      },
      platillos: menuQuery.rows
    });
  } catch (error) {
    console.error('Error en /api/menu:', error);
    res.status(500).json({ error: 'Error al cargar el menu publico' });
  }
});

// ========== API: AGREGAR PLATILLO ==========
app.post('/api/platillos', async (req, res) => {
  if (!dbConnected || !pool) {
    return res.status(503).json({ error: 'Base de datos no disponible' });
  }
  try {
    const { categoria_id, nombre, descripcion, precio, imagen_url } = req.body;
    const query = `
      INSERT INTO platillos (categoria_id, nombre, descripcion, precio, imagen_url, disponible)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *`;
    const resultado = await pool.query(query, [categoria_id, nombre, descripcion, precio, imagen_url]);
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error('Error en POST /api/platillos:', error);
    res.status(500).json({ error: 'Error al guardar el platillo' });
  }
});

// ========== API: ACTUALIZAR PRECIO ==========
app.put('/api/platillos/:id/precio', async (req, res) => {
  if (!dbConnected || !pool) {
    return res.status(503).json({ error: 'Base de datos no disponible' });
  }
  try {
    const { id } = req.params;
    const { nuevoPrecio } = req.body;
    const query = 'UPDATE platillos SET precio = $1 WHERE id = $2 RETURNING *';
    const resultado = await pool.query(query, [nuevoPrecio, id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Platillo no encontrado' });
    }
    res.json({ mensaje: 'Precio actualizado', producto: resultado.rows[0] });
  } catch (error) {
    console.error('Error en PUT /api/platillos:', error);
    res.status(500).json({ error: 'Error al actualizar precio' });
  }
});

// ========== API: CAMBIAR DISPONIBILIDAD ==========
app.patch('/api/platillos/:id/disponibilidad', async (req, res) => {
  if (!dbConnected || !pool) {
    return res.status(503).json({ error: 'Base de datos no disponible' });
  }
  try {
    const { id } = req.params;
    const { disponible } = req.body;
    const query = 'UPDATE platillos SET disponible = $1 WHERE id = $2 RETURNING *';
    const resultado = await pool.query(query, [disponible, id]);
    res.json({ mensaje: 'Estado actualizado', producto: resultado.rows[0] });
  } catch (error) {
    console.error('Error en PATCH /api/platillos:', error);
    res.status(500).json({ error: 'Error al cambiar disponibilidad' });
  }
});

// ========== API: LISTA PARA ADMIN ==========
app.get('/api/admin/platillos/:restauranteId', async (req, res) => {
  if (!dbConnected || !pool) {
    return res.status(503).json({ error: 'Base de datos no disponible' });
  }
  try {
    const { restauranteId } = req.params;
    const query = `
      SELECT p.*, c.nombre as categoria_nombre
      FROM platillos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE c.restaurante_id = $1
      ORDER BY c.orden, p.nombre`;
    const resultado = await pool.query(query, [restauranteId]);
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en /api/admin/platillos:', error);
    res.status(500).json({ error: 'Error al cargar lista de administracion' });
  }
});

// ========== INICIAR SERVIDOR (local) / EXPORTAR (Vercel) ==========
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('SmartMenu API corriendo en puerto ' + PORT);
    console.log(new Date().toISOString());
    console.log('Conectando a base de datos en background...');
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM recibido, cerrando servidor...');
    if (pool) {
      pool.end(() => {
        console.log('Pool cerrado');
        process.exit(0);
      });
    }
  });
}

// CRITICO para Vercel: exportar el app como modulo
module.exports = app;
