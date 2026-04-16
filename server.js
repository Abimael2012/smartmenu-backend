require('dotenv').config(); 
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
    rejectUnauthorized: false 
  }
});

// ============================================================
// RUTA 1: Obtener el menú público (Solo lo disponible)
// ============================================================
app.get('/api/menu/:restauranteId', async (req, res) => {
  try {
    const { restauranteId } = req.params;

    // Buscamos el restaurante con TODOS sus campos de diseño
    const restQuery = await pool.query('SELECT * FROM restaurantes WHERE id = $1', [restauranteId]);
    
    if (restQuery.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Restaurante no encontrado' });
    }

    const resData = restQuery.rows[0];

    // Buscamos sus platillos agrupados por categoría y ordenados
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
    console.error(error);
    res.status(500).json({ error: 'Error al cargar el menú público.' });
  }
});

// ============================================================
// RUTA 2: Agregar un nuevo platillo (Escalable)
// ============================================================
app.post('/api/platillos', async (req, res) => {
  try {
    const { categoria_id, nombre, descripcion, precio, imagen_url } = req.body;
    
    const query = `
      INSERT INTO platillos (categoria_id, nombre, descripcion, precio, imagen_url, disponible) 
      VALUES ($1, $2, $3, $4, $5, true) 
      RETURNING *`;
    
    const valores = [categoria_id, nombre, descripcion, precio, imagen_url];
    const resultado = await pool.query(query, valores);
    
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar el platillo' });
  }
});

// ============================================================
// RUTA 3: Modificar Precio de un producto
// ============================================================
app.put('/api/platillos/:id/precio', async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevoPrecio } = req.body;

    const query = 'UPDATE platillos SET precio = $1 WHERE id = $2 RETURNING *';
    const resultado = await pool.query(query, [nuevoPrecio, id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Platillo no encontrado" });
    }

    res.json({ mensaje: "Precio actualizado", producto: resultado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar precio' });
  }
});

// ============================================================
// RUTA 4: Dar de baja/alta (Cambiar disponibilidad)
// ============================================================
app.patch('/api/platillos/:id/disponibilidad', async (req, res) => {
  try {
    const { id } = req.params;
    const { disponible } = req.body; // true o false

    const query = 'UPDATE platillos SET disponible = $1 WHERE id = $2 RETURNING *';
    const resultado = await pool.query(query, [disponible, id]);

    res.json({ mensaje: "Estado actualizado", producto: resultado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar disponibilidad' });
  }
});

// ============================================================
// RUTA 5: Lista completa para el Admin (Incluye productos de baja)
// ============================================================
app.get('/api/admin/platillos/:restauranteId', async (req, res) => {
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
    console.error(error);
    res.status(500).json({ error: 'Error al cargar lista de administración' });
  }
});

// Encendemos el motor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de SmartMenu corriendo en http://localhost:${PORT}`);
});