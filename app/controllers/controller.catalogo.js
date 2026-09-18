import pool from '../config/db.js';

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

function toDecimal(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : fallback;
}

function toBooleanTinyint(value, fallback = 1) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (value === true || value === 1 || value === '1' || value === 'true' || value === 'on') {
    return 1;
  }

  if (value === false || value === 0 || value === '0' || value === 'false' || value === 'off') {
    return 0;
  }

  return fallback;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidPositiveId(value) {
  return Number.isInteger(value) && value > 0;
}

function respondNotFound(res, message) {
  return res.status(404).json({ error: message });
}

function respondBadRequest(res, message) {
  return res.status(400).json({ error: message });
}

function buildUpdateFragments(payload, allowedFields, transforms = {}) {
  const fields = [];
  const values = [];

  for (const field of allowedFields) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      continue;
    }

    const transform = transforms[field] ?? ((value) => value);
    const value = transform(payload[field]);

    if (value === undefined) {
      continue;
    }

    fields.push(`\`${field}\` = ?`);
    values.push(value);
  }

  return { fields, values };
}

function parseDetalleSource(input) {
  if (Array.isArray(input)) {
    return input;
  }

  if (typeof input === 'string' && input.trim() !== '') {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeDetalleItem(item) {
  if (!isPlainObject(item)) {
    return null;
  }

  const cantidad = toInt(item.cantidad, 0);
  const precio = toDecimal(item.precio ?? item.precio_unitario, 0);

  if (!isValidPositiveId(cantidad) || cantidad <= 0) {
    return null;
  }

  const nombre = toText(item.nombre ?? item.producto_nombre, '');

  if (!nombre) {
    return null;
  }

  return {
    producto_id: toInt(item.producto_id, null),
    nombre,
    precio,
    cantidad,
    subtotal: Math.round(precio * cantidad * 100) / 100
  };
}

function normalizeDetalleList(detalle) {
  const source = parseDetalleSource(detalle);

  if (!source) {
    return null;
  }

  const items = source.map(normalizeDetalleItem).filter(Boolean);
  return items.length > 0 ? items : null;
}

function computeDetalleTotals(items) {
  const subtotal = Math.round(
    items.reduce((total, item) => total + Number(item.subtotal ?? item.precio * item.cantidad ?? 0), 0) * 100
  ) / 100;

  return subtotal;
}

function parseJsonField(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeDetalleStorage(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const detalle = normalizeDetalleList(value);

  if (detalle) {
    return JSON.stringify(detalle);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  const text = toText(value, '');
  return text || undefined;
}

function formatCarritoRow(row) {
  const cantidad = Number(row.cantidad ?? 0);
  const precioUnitario = Number(row.precio_unitario ?? 0);
  const subtotal = Number(row.subtotal ?? precioUnitario * cantidad);

  return {
    id: row.id,
    session_id: row.session_id,
    producto_id: row.producto_id,
    producto_nombre: row.producto_nombre,
    precio_unitario: Math.round(precioUnitario * 100) / 100,
    cantidad,
    subtotal: Math.round(subtotal * 100) / 100,
    estado: row.estado,
    created_at: row.created_at,
    updated_at: row.updated_at,
    producto: row.producto_id
      ? {
          id: row.producto_id,
          nombre: row.producto_nombre_catalogo ?? row.producto_nombre,
          marca: row.marca ?? null,
          imagen_url: row.imagen_url ?? null,
          categoria_nombre: row.categoria_nombre ?? null
        }
      : null
  };
}

function formatPedidoRow(row) {
  return {
    ...row,
    subtotal: Number(row.subtotal ?? 0),
    impuestos: Number(row.impuestos ?? 0),
    total: Number(row.total ?? 0),
    detalle: parseJsonField(row.detalle_json, []),
    detalle_json: row.detalle_json
  };
}

async function fetchCategoriaById(id) {
  const [rows] = await pool.query('SELECT * FROM categorias WHERE id = ?', [id]);
  return rows[0] || null;
}

async function fetchProductoById(id) {
  const [rows] = await pool.query(
    `
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.id = ?
    `,
    [id]
  );

  return rows[0] || null;
}

async function fetchCarritoById(id) {
  const [rows] = await pool.query(
    `
      SELECT
        c.*,
        p.nombre AS producto_nombre_catalogo,
        p.marca,
        p.imagen_url,
        cat.nombre AS categoria_nombre
      FROM carrito c
      LEFT JOIN productos p ON p.id = c.producto_id
      LEFT JOIN categorias cat ON cat.id = p.categoria_id
      WHERE c.id = ?
    `,
    [id]
  );

  return rows[0] || null;
}

async function fetchPedidoById(id) {
  const [rows] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function listarCategorias(req, res) {
  try {
    const { activo } = req.query;
    const params = [];
    let sql = 'SELECT * FROM categorias';

    if (activo !== undefined && activo !== '') {
      sql += ' WHERE activo = ?';
      params.push(toBooleanTinyint(activo, 1));
    }

    sql += ' ORDER BY nombre ASC, id ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function obtenerCategoria(req, res) {
  try {
    const id = toInt(req.params.id, null);

    if (!isValidPositiveId(id)) {
      return respondBadRequest(res, 'ID de categoria invalido');
    }

    const categoria = await fetchCategoriaById(id);

    if (!categoria) {
      return respondNotFound(res, 'Categoria no encontrada');
    }

    res.json(categoria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function crearCategoria(req, res) {
  try {
    const nombre = toText(req.body.nombre, '');

    if (!nombre) {
      return respondBadRequest(res, 'El nombre de la categoria es obligatorio');
    }

    const descripcion = toText(req.body.descripcion, null);
    const activo = toBooleanTinyint(req.body.activo, 1);

    const [result] = await pool.query(
      `
        INSERT INTO categorias (nombre, descripcion, activo)
        VALUES (?, ?, ?)
      `,
      [nombre, descripcion, activo]
    );

    const categoria = await fetchCategoriaById(result.insertId);
    res.status(201).json(categoria ?? { id: result.insertId, nombre, descripcion, activo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function actualizarCategoria(req, res) {
  try {
    const id = toInt(req.params.id, null);

    if (!isValidPositiveId(id)) {
      return respondBadRequest(res, 'ID de categoria invalido');
    }

    const { fields, values } = buildUpdateFragments(req.body, ['nombre', 'descripcion', 'activo'], {
      nombre: (value) => {
        const text = toText(value, '');
        return text || undefined;
      },
      descripcion: (value) => (value === null ? null : toText(value, null)),
      activo: (value) => toBooleanTinyint(value, undefined)
    });

    if (fields.length === 0) {
      return respondBadRequest(res, 'No hay campos validos para actualizar');
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE categorias SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return respondNotFound(res, 'Categoria no encontrada');
    }

    const categoria = await fetchCategoriaById(id);
    res.json(categoria ?? { message: 'Categoria actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function eliminarCategoria(req, res) {
  try {
    const id = toInt(req.params.id, null);

    if (!isValidPositiveId(id)) {
      return respondBadRequest(res, 'ID de categoria invalido');
    }

    const [result] = await pool.query('DELETE FROM categorias WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return respondNotFound(res, 'Categoria no encontrada');
    }

    res.json({ message: 'Categoria eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listarProductos(req, res) {
  try {
    const { categoria_id, activo, q, sku } = req.query;
    const params = [];
    let sql = `
      SELECT
        p.*,
        c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE 1 = 1
    `;

    if (categoria_id !== undefined && categoria_id !== '') {
      sql += ' AND p.categoria_id = ?';
      params.push(toInt(categoria_id, null));
    }

    if (activo !== undefined && activo !== '') {
      sql += ' AND p.activo = ?';
      params.push(toBooleanTinyint(activo, 1));
    }

    if (sku) {
      sql += ' AND p.sku = ?';
      params.push(toText(sku, ''));
    }

    if (q) {
      const queryText = `%${toText(q, '')}%`;
      sql += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ? OR p.marca LIKE ? OR p.sku LIKE ?)';
      params.push(queryText, queryText, queryText, queryText);
    }

    sql += ' ORDER BY p.id DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function obtenerProducto(req, res) {
  try {
    const id = toInt(req.params.id, null);

    if (!isValidPositiveId(id)) {
      return respondBadRequest(res, 'ID de producto invalido');
    }

    const producto = await fetchProductoById(id);

    if (!producto) {
      return respondNotFound(res, 'Producto no encontrado');
    }

    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function crearProducto(req, res) {
  try {
    const nombre = toText(req.body.nombre, '');

    if (!nombre) {
      return respondBadRequest(res, 'El nombre del producto es obligatorio');
    }

    const categoriaId = toInt(req.body.categoria_id, null);
    const descripcion = toText(req.body.descripcion, null);
    const marca = toText(req.body.marca, null);
    const sku = toText(req.body.sku, null);
    const precio = toDecimal(req.body.precio, 0);
    const stock = toInt(req.body.stock, 0);
    const imagenUrl = toText(req.body.imagen_url, null);
    const activo = toBooleanTinyint(req.body.activo, 1);

    if (categoriaId !== null) {
      const categoria = await fetchCategoriaById(categoriaId);

      if (!categoria) {
        return respondNotFound(res, 'La categoria asignada no existe');
      }
    }

    const [result] = await pool.query(
      `
        INSERT INTO productos
          (categoria_id, nombre, descripcion, marca, sku, precio, stock, imagen_url, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [categoriaId, nombre, descripcion, marca, sku, precio, stock, imagenUrl, activo]
    );

    const producto = await fetchProductoById(result.insertId);
    res.status(201).json(producto ?? { id: result.insertId, nombre });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function actualizarProducto(req, res) {
  try {
    const id = toInt(req.params.id, null);

    if (!isValidPositiveId(id)) {
      return respondBadRequest(res, 'ID de producto invalido');
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'categoria_id')) {
      const categoriaId = toInt(req.body.categoria_id, null);
      if (categoriaId !== null) {
        const categoria = await fetchCategoriaById(categoriaId);
        if (!categoria) {
          return respondNotFound(res, 'La categoria asignada no existe');
        }
      }
    }

    const { fields, values } = buildUpdateFragments(
      req.body,
      ['categoria_id', 'nombre', 'descripcion', 'marca', 'sku', 'precio', 'stock', 'imagen_url', 'activo'],
      {
        categoria_id: (value) => (value === null || value === '' ? null : toInt(value, null)),
        nombre: (value) => {
          const text = toText(value, '');
          return text || undefined;
        },
        descripcion: (value) => (value === null ? null : toText(value, null)),
        marca: (value) => (value === null ? null : toText(value, null)),
        sku: (value) => (value === null ? null : toText(value, null)),
        precio: (value) => toDecimal(value, undefined),
        stock: (value) => toInt(value, undefined),
        imagen_url: (value) => (value === null ? null : toText(value, null)),
        activo: (value) => toBooleanTinyint(value, undefined)
      }
    );

    if (fields.length === 0) {
      return respondBadRequest(res, 'No hay campos validos para actualizar');
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE productos SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return respondNotFound(res, 'Producto no encontrado');
    }

    const producto = await fetchProductoById(id);
    res.json(producto ?? { message: 'Producto actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function eliminarProducto(req, res) {
  try {
    const id = toInt(req.params.id, null);

    if (!isValidPositiveId(id)) {
      return respondBadRequest(res, 'ID de producto invalido');
    }

    const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return respondNotFound(res, 'Producto no encontrado');
    }

    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listarCarrito(req, res) {
  try {
    const { session_id, estado } = req.query;
    const params = [];
    let sql = `
      SELECT
        c.*,
        p.nombre AS producto_nombre_catalogo,
        p.marca,
        p.imagen_url,
        cat.nombre AS categoria_nombre
      FROM carrito c
      LEFT JOIN productos p ON p.id = c.producto_id
      LEFT JOIN categorias cat ON cat.id = p.categoria_id
      WHERE 1 = 1
    `;

    if (session_id) {
      sql += ' AND c.session_id = ?';
      params.push(toText(session_id, ''));
    }

    if (estado) {
      sql += ' AND c.estado = ?';
      params.push(toText(estado, 'activo'));
    }

    sql += ' ORDER BY c.id DESC';

    const [rows] = await pool.query(sql, params);
    const items = rows.map(formatCarritoRow);
    const itemsCount = items.reduce((total, item) => total + item.cantidad, 0);
    const total = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;

    res.json({
      items,
      items_count: itemsCount,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function obtenerCarritoItem(req, res) {
  try {
    const id = toInt(req.params.id, null);

    if (!isValidPositiveId(id)) {
      return respondBadRequest(res, 'ID de carrito invalido');
    }

    const row = await fetchCarritoById(id);

    if (!row) {
      return respondNotFound(res, 'Item de carrito no encontrado');
    }

    res.json(formatCarritoRow(row));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function crearCarritoItem(req, res) {
  try {
    const sessionId = toText(req.body.session_id, '');

    if (!sessionId) {
      return respondBadRequest(res, 'session_id es obligatorio para el carrito');
    }

    const cantidad = toInt(req.body.cantidad, 1);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return respondBadRequest(res, 'La cantidad debe ser un entero positivo');
    }

    const productoId = toInt(req.body.producto_id, null);
    let productoNombre = toText(req.body.producto_nombre ?? req.body.nombre, null);
    let precioUnitario = toDecimal(req.body.precio_unitario ?? req.body.precio, null);

    if (productoId !== null) {
      const producto = await fetchProductoById(productoId);

      if (!producto) {
        return respondNotFound(res, 'Producto no encontrado');
      }

      productoNombre = producto.nombre;
      precioUnitario = Number(producto.precio);
    }

    if (!productoNombre) {
      return respondBadRequest(res, 'producto_nombre es obligatorio cuando no se envia producto_id');
    }

    if (precioUnitario === null) {
      return respondBadRequest(res, 'precio_unitario es obligatorio cuando no se envia producto_id');
    }

    const [existingRows] = await pool.query(
      `
        SELECT *
        FROM carrito
        WHERE session_id = ?
          AND ((producto_id IS NULL AND ? IS NULL) OR producto_id = ?)
          AND estado = 'activo'
        LIMIT 1
      `,
      [sessionId, productoId, productoId]
    );

    if (existingRows.length > 0) {
      const existente = existingRows[0];
      const nuevaCantidad = Number(existente.cantidad) + cantidad;
      const nuevoSubtotal = Math.round(Number(precioUnitario ?? existente.precio_unitario) * nuevaCantidad * 100) / 100;

      await pool.query(
        `
          UPDATE carrito
          SET cantidad = ?, subtotal = ?, producto_nombre = ?, precio_unitario = ?, producto_id = ?
          WHERE id = ?
        `,
        [
          nuevaCantidad,
          nuevoSubtotal,
          productoNombre,
          precioUnitario,
          productoId,
          existente.id
        ]
      );

      const row = await fetchCarritoById(existente.id);
      return res.status(200).json(formatCarritoRow(row));
    }

    const subtotal = Math.round(precioUnitario * cantidad * 100) / 100;

    const [result] = await pool.query(
      `
        INSERT INTO carrito
          (session_id, producto_id, producto_nombre, precio_unitario, cantidad, subtotal, estado)
        VALUES (?, ?, ?, ?, ?, ?, 'activo')
      `,
      [sessionId, productoId, productoNombre, precioUnitario, cantidad, subtotal]
    );

    const row = await fetchCarritoById(result.insertId);
    res.status(201).json(formatCarritoRow(row));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function actualizarCarritoItem(req, res) {
  try {
    const id = toInt(req.params.id, null);

    if (!isValidPositiveId(id)) {
      return respondBadRequest(res, 'ID de carrito invalido');
    }

    const { fields, values } = buildUpdateFragments(req.body, ['cantidad', 'estado'], {
      cantidad: (value) => {
        const cantidad = toInt(value, undefined);
        if (cantidad === undefined || cantidad < 0) {
          return undefined;
        }
        return cantidad;
      },
      estado: (value) => {
        const estado = toText(value, '');
        return estado || undefined;
      }
    });

    if (fields.length === 0) {
      return respondBadRequest(res, 'No hay campos validos para actualizar');
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'cantidad')) {
      const cantidad = toInt(req.body.cantidad, null);

      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        return respondBadRequest(res, 'La cantidad debe ser un entero positivo');
      }
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE carrito SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return respondNotFound(res, 'Item de carrito no encontrado');
    }

    const row = await fetchCarritoById(id);
    res.json(row ? formatCarritoRow(row) : { message: 'Carrito actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function eliminarCarritoItem(req, res) {
  try {
    const id = toInt(req.params.id, null);

    if (!isValidPositiveId(id)) {
      return respondBadRequest(res, 'ID de carrito invalido');
    }

    const [result] = await pool.query('DELETE FROM carrito WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return respondNotFound(res, 'Item de carrito no encontrado');
    }

    res.json({ message: 'Item de carrito eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function vaciarCarrito(req, res) {
  try {
    const sessionId = toText(req.query.session_id ?? req.body.session_id, '');

    if (!sessionId) {
      return respondBadRequest(res, 'session_id es obligatorio para vaciar el carrito');
    }

    const [result] = await pool.query('DELETE FROM carrito WHERE session_id = ?', [sessionId]);
    res.json({ message: 'Carrito vaciado correctamente', deleted: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function generarNumeroPedido() {
  const fecha = new Date();
  const stamp = fecha
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PED-${stamp}-${random}`;
}

async function obtenerDetalleDesdeCarrito(sessionId) {
  const [rows] = await pool.query(
    `
      SELECT
        c.producto_id,
        c.producto_nombre,
        c.precio_unitario AS precio,
        c.cantidad,
        c.subtotal
      FROM carrito c
      WHERE c.session_id = ?
        AND c.estado = 'activo'
      ORDER BY c.id ASC
    `,
    [sessionId]
  );

  return rows.map((row) => ({
    producto_id: row.producto_id,
    nombre: row.producto_nombre,
    precio: Number(row.precio ?? row.precio_unitario ?? 0),
    cantidad: Number(row.cantidad ?? 0),
    subtotal: Number(row.subtotal ?? 0)
  }));
}

export async function listarPedidos(req, res) {
  try {
    const { estado, session_id, numero_pedido } = req.query;
    const params = [];
    let sql = 'SELECT * FROM pedidos WHERE 1 = 1';

    if (estado) {
      sql += ' AND estado = ?';
      params.push(toText(estado, 'pendiente'));
    }

    if (session_id) {
      sql += ' AND session_id = ?';
      params.push(toText(session_id, ''));
    }

    if (numero_pedido) {
      sql += ' AND numero_pedido = ?';
      params.push(toText(numero_pedido, ''));
    }

    sql += ' ORDER BY id DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows.map(formatPedidoRow));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function obtenerPedido(req, res) {
  try {
    const id = toInt(req.params.id, null);

    if (!isValidPositiveId(id)) {
      return respondBadRequest(res, 'ID de pedido invalido');
    }

    const pedido = await fetchPedidoById(id);

    if (!pedido) {
      return respondNotFound(res, 'Pedido no encontrado');
    }

    res.json(formatPedidoRow(pedido));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function crearPedido(req, res) {
  try {
    const sessionId = toText(req.body.session_id, null);
    const clienteNombre = toText(req.body.cliente_nombre, null);
    const clienteEmail = toText(req.body.cliente_email, null);
    const clienteTelefono = toText(req.body.cliente_telefono, null);
    const direccion = toText(req.body.direccion, null);
    const estado = toText(req.body.estado, 'pendiente') || 'pendiente';
    const impuestos = toDecimal(req.body.impuestos, 0);

    let detalle = normalizeDetalleList(req.body.detalle ?? req.body.items ?? req.body.lineas);
    let detalleOrigenCarrito = false;

    if (!detalle && sessionId) {
      detalle = await obtenerDetalleDesdeCarrito(sessionId);
      detalleOrigenCarrito = detalle.length > 0;
    }

    if (!detalle || detalle.length === 0) {
      return respondBadRequest(res, 'Se requiere detalle de pedido o session_id con carrito activo');
    }

    if (detalle.some((item) => item.producto_id === null)) {
      return respondBadRequest(res, 'Cada item del pedido debe incluir producto_id');
    }

    const detalleNormalizado = [];

    for (const item of detalle) {
      if (item.producto_id !== null) {
        const producto = await fetchProductoById(item.producto_id);

        if (!producto) {
          return respondNotFound(res, `Producto no encontrado: ${item.producto_id}`);
        }

        const precio = Number(producto.precio);
        detalleNormalizado.push({
          ...item,
          nombre: producto.nombre,
          precio,
          subtotal: Math.round(precio * item.cantidad * 100) / 100
        });
        continue;
      }

      const precio = Number(item.precio ?? 0);
      detalleNormalizado.push({
        ...item,
        precio,
        subtotal: Math.round(precio * item.cantidad * 100) / 100
      });
    }

    const subtotal = computeDetalleTotals(detalleNormalizado);
    const impuestosCalculados = Math.round(subtotal * 0.19 * 100) / 100;
    const total = Math.round((subtotal + impuestosCalculados) * 100) / 100;
    const numeroPedido = toText(req.body.numero_pedido, generarNumeroPedido());
    const detalleJson = JSON.stringify(detalleNormalizado);

    const [result] = await pool.query(
      `
        INSERT INTO pedidos
          (numero_pedido, session_id, cliente_nombre, cliente_email, cliente_telefono, direccion, subtotal, impuestos, total, estado, detalle_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        numeroPedido,
        sessionId,
        clienteNombre,
        clienteEmail,
        clienteTelefono,
        direccion,
        subtotal,
        impuestosCalculados,
        total,
        estado,
        detalleJson
      ]
    );

    if (detalleOrigenCarrito && sessionId) {
      await pool.query(
        `
          UPDATE carrito
          SET estado = 'convertido'
          WHERE session_id = ?
            AND estado = 'activo'
        `,
        [sessionId]
      );
    }

    const pedido = await fetchPedidoById(result.insertId);
    res.status(201).json(
      pedido
        ? formatPedidoRow(pedido)
        : {
            id: result.insertId,
            numero_pedido: numeroPedido,
            session_id: sessionId,
            cliente_nombre: clienteNombre,
            cliente_email: clienteEmail,
            cliente_telefono: clienteTelefono,
            direccion,
            subtotal,
            impuestos: impuestosCalculados,
            total,
            estado,
            detalle: detalleNormalizado
          }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function actualizarPedido(req, res) {
  try {
    const id = toInt(req.params.id, null);

    if (!isValidPositiveId(id)) {
      return respondBadRequest(res, 'ID de pedido invalido');
    }

    const { fields, values } = buildUpdateFragments(
      req.body,
      [
        'session_id',
        'cliente_nombre',
        'cliente_email',
        'cliente_telefono',
        'direccion',
        'subtotal',
        'impuestos',
        'total',
        'estado'
      ],
      {
        session_id: (value) => (value === null ? null : toText(value, null)),
        cliente_nombre: (value) => (value === null ? null : toText(value, null)),
        cliente_email: (value) => (value === null ? null : toText(value, null)),
        cliente_telefono: (value) => (value === null ? null : toText(value, null)),
        direccion: (value) => (value === null ? null : toText(value, null)),
        subtotal: (value) => toDecimal(value, undefined),
        impuestos: (value) => toDecimal(value, undefined),
        total: (value) => toDecimal(value, undefined),
        estado: (value) => {
          const text = toText(value, '');
          return text || undefined;
        }
      }
    );

    const detalleSource = Object.prototype.hasOwnProperty.call(req.body, 'detalle')
      ? req.body.detalle
      : Object.prototype.hasOwnProperty.call(req.body, 'detalle_json')
        ? req.body.detalle_json
        : undefined;

    if (detalleSource !== undefined) {
      const detalleJson = normalizeDetalleStorage(detalleSource);

      if (detalleJson === undefined) {
        return respondBadRequest(res, 'detalle no tiene un formato valido');
      }

      fields.push('`detalle_json` = ?');
      values.push(detalleJson);
    }

    if (fields.length === 0) {
      return respondBadRequest(res, 'No hay campos validos para actualizar');
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE pedidos SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return respondNotFound(res, 'Pedido no encontrado');
    }

    const pedido = await fetchPedidoById(id);
    res.json(pedido ? formatPedidoRow(pedido) : { message: 'Pedido actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function eliminarPedido(req, res) {
  try {
    const id = toInt(req.params.id, null);

    if (!isValidPositiveId(id)) {
      return respondBadRequest(res, 'ID de pedido invalido');
    }

    const [result] = await pool.query('DELETE FROM pedidos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return respondNotFound(res, 'Pedido no encontrado');
    }

    res.json({ message: 'Pedido eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
