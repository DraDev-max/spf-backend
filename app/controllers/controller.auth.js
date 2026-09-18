import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import {
  getJwtSecret,
  hashPassword,
  needsPasswordUpgrade,
  normalizeRole,
  verifyPassword
} from '../config/security.js';

function inferRole(usuario) {
  const source = String(usuario?.rol ?? usuario?.nombre ?? usuario?.email ?? '').toLowerCase();
  return source === 'admin' ? 'admin' : 'cliente';
}

function buildLoginResponse(usuario, token, rol) {
  return {
    token,
    usuario: {
      id: usuario.id,
      usuario: usuario.nombre,
      nombre: usuario.nombre,
      email: usuario.email,
      rol
    },
    rol
  };
}

export const login = async (req, res) => {
  try {
    const usuarioInput = String(req.body.usuario ?? req.body.email ?? '').trim();
    const passwordInput = String(req.body.password ?? req.body['contraseña'] ?? '').trim();

    if (!usuarioInput || !passwordInput) {
      return res.status(400).json({ error: 'Usuario y contrase\u00f1a son obligatorios' });
    }

    const [rows] = await pool.query(
      `
        SELECT *
        FROM usuarios
        WHERE nombre = ? OR email = ?
        LIMIT 1
      `,
      [usuarioInput, usuarioInput]
    );

    const usuario = rows[0];

    if (!usuario || !verifyPassword(passwordInput, usuario.password)) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (needsPasswordUpgrade(usuario.password)) {
      const upgradedPassword = hashPassword(passwordInput);
      await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [upgradedPassword, usuario.id]);
    }

    const rol = normalizeRole(usuario.rol ?? inferRole(usuario), 'cliente');
    const token = jwt.sign(
      {
        id: usuario.id,
        usuario: usuario.nombre,
        email: usuario.email,
        rol
      },
      getJwtSecret(),
      { expiresIn: '2h' }
    );

    res.json(buildLoginResponse({ ...usuario, rol }, token, rol));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
