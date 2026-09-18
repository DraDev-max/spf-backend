import jwt from 'jsonwebtoken';
import { getJwtSecret, isAdminRole } from '../config/security.js';

export const verificarToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.slice(7).trim();
    const decoded = jwt.verify(token, getJwtSecret());

    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const verificarAdmin = (req, res, next) => {
  if (!req.usuario || !isAdminRole(req.usuario.rol)) {
    return res.status(403).json({ error: 'Permisos insuficientes' });
  }

  next();
};
