import pool from '../config/db.js';
import { hashPassword, normalizeRole } from '../config/security.js';

function toText(value, fallback = null) {
  if (value === undefined || value === null) {
    return fallback;
  }

  const text = String(value).trim();
  return text === '' ? fallback : text;
}

function toInt(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeUsuario(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    rol: normalizeRole(row.rol, 'cliente'),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null
  };
}

async function fetchUsuarioById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM usuarios WHERE id = ? LIMIT 1',
    [id]
  );

  return rows[0] || null;
}

async function fetchUsuarioByEmail(email, id = null) {
  const params = [email];
  let sql = 'SELECT id FROM usuarios WHERE email = ?';

  if (id !== null) {
    sql += ' AND id <> ?';
    params.push(id);
  }

  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

export const listarUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM usuarios ORDER BY id DESC');

    res.json(rows.map(sanitizeUsuario));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerUsuario = async (req, res) => {
  try {
    const id = toInt(req.params.id, null);

    if (id === null) {
      return res.status(400).json({ error: 'ID de usuario invalido' });
    }

    const usuario = await fetchUsuarioById(id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(sanitizeUsuario(usuario));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearUsuario = async (req, res) => {
  try {
    const nombre = toText(req.body.nombre, '');
    const email = toText(req.body.email, '');
    const password = toText(req.body.password, '');
    const rol = normalizeRole(req.body.rol, 'cliente');

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    if (!email) {
      return res.status(400).json({ error: 'El email es obligatorio' });
    }

    if (!password) {
      return res.status(400).json({ error: 'La contrasena es obligatoria' });
    }

    const duplicate = await fetchUsuarioByEmail(email);

    if (duplicate) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }

    const hashedPassword = hashPassword(password);
    let result;

    try {
      [result] = await pool.query(
        `
          INSERT INTO usuarios (nombre, email, password, rol)
          VALUES (?, ?, ?, ?)
        `,
        [nombre, email, hashedPassword, rol]
      );
    } catch (error) {
      if (!String(error.message || '').toLowerCase().includes("unknown column 'rol'")) {
        throw error;
      }

      [result] = await pool.query(
        `
          INSERT INTO usuarios (nombre, email, password)
          VALUES (?, ?, ?)
        `,
        [nombre, email, hashedPassword]
      );
    }

    const usuario = await fetchUsuarioById(result.insertId);
    res.status(201).json(sanitizeUsuario(usuario) ?? { id: result.insertId, nombre, email, rol });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarUsuario = async (req, res) => {
  try {
    const id = toInt(req.params.id ?? req.body.id, null);

    if (id === null) {
      return res.status(400).json({ error: 'ID de usuario invalido' });
    }

    const updates = [];
    const values = [];

    const nombre = toText(req.body.nombre, undefined);
    const email = toText(req.body.email, undefined);
    const password = toText(req.body.password, undefined);
    const rol = req.body.rol !== undefined ? normalizeRole(req.body.rol, 'cliente') : undefined;

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      values.push(nombre);
    }

    if (email !== undefined) {
      const duplicate = await fetchUsuarioByEmail(email, id);

      if (duplicate) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
      }

      updates.push('email = ?');
      values.push(email);
    }

    if (password !== undefined) {
      updates.push('password = ?');
      values.push(hashPassword(password));
    }

    if (rol !== undefined) {
      updates.push('rol = ?');
      values.push(rol);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos validos para actualizar' });
    }

    values.push(id);
    let result;

    try {
      [result] = await pool.query(
        `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      const lower = String(error.message || '').toLowerCase();

      if (!lower.includes("unknown column 'rol'")) {
        throw error;
      }

      const fallbackUpdates = [];
      const fallbackValues = [];

      for (let index = 0; index < updates.length; index += 1) {
        if (updates[index] === 'rol = ?') {
          continue;
        }

        fallbackUpdates.push(updates[index]);
        fallbackValues.push(values[index]);
      }

      fallbackValues.push(id);
      [result] = await pool.query(
        `UPDATE usuarios SET ${fallbackUpdates.join(', ')} WHERE id = ?`,
        fallbackValues
      );
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = await fetchUsuarioById(id);
    res.json(sanitizeUsuario(usuario) ?? { message: 'Usuario actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const eliminarUsuario = async (req, res) => {
  try {
    const id = toInt(req.params.id ?? req.body.id, null);

    if (id === null) {
      return res.status(400).json({ error: 'ID de usuario invalido' });
    }

    const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
