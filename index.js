import express from 'express';
import routeUsuario from './app/routes/routes.usuario.js';
import routeAuth from './app/routes/routes.auth.js';
import routeCatalogo from './app/routes/routes.catalogo.js';
import pool from './app/config/db.js';
import { initializeDatabaseSchema } from './app/config/db.bootstrap.js';
import { seedCatalogData } from './app/config/db.seed.js';


const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server running successfully' });
});

app.get('/api/health/mysql', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DATABASE() AS database_name, @@hostname AS mysql_host, NOW() AS checked_at'
    );
    const info = rows[0] || {};

    console.log(
      `successfully connected to the MySQL database${info.database_name ? ` (${info.database_name})` : ''}`
    );
    console.log('MySQL health probe row:', info);

    res.json({
      ok: true,
      mysqlConnected: true,
      database: info.database_name || null,
      host: info.mysql_host || null,
      checkedAt: info.checked_at || new Date().toISOString()
    });
  } catch (error) {
    console.error('MySQL health check failed:', error);
    res.status(503).json({
      ok: false,
      mysqlConnected: false,
      error: 'No se pudo conectar a MySQL'
    });
  }
});

// Registrar rutas de autenticación PRIMERO
app.use('/api', routeAuth);

// Luego las rutas del CRUD
app.use('/api', routeUsuario);
app.use('/api', routeCatalogo);

async function start() {
  try {
    await initializeDatabaseSchema(pool);
    await seedCatalogData(pool);

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Connected to MySQL server`);
    });
  } catch (error) {
    console.error('Database bootstrap failed:', error);
    process.exit(1);
  }
}

start();
