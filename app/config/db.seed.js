import { hashPassword } from './security.js';

const DEFAULT_IMAGE_URLS = [
  'https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/thumbnail.webp',
  'https://cdn.dummyjson.com/product-images/mens-shoes/nike-baseball-cleats/thumbnail.webp',
  'https://cdn.dummyjson.com/product-images/mens-shoes/puma-future-rider-trainers/thumbnail.webp',
  'https://cdn.dummyjson.com/product-images/mens-shoes/sports-sneakers-off-white-&-red/thumbnail.webp',
  'https://cdn.dummyjson.com/product-images/mens-shoes/sports-sneakers-off-white-red/thumbnail.webp'
];

function getDefaultImageUrl(index) {
  return DEFAULT_IMAGE_URLS[index % DEFAULT_IMAGE_URLS.length];
}

const DEFAULT_CATEGORIES = [
  {
    nombre: 'mens-shoes',
    descripcion: 'Catalogo masculino'
  },
  {
    nombre: 'womens-shoes',
    descripcion: 'Catalogo femenino'
  },
  {
    nombre: 'kids-shoes',
    descripcion: 'Catalogo infantil'
  }
];

const DEFAULT_PRODUCTS = [
  {
    sku: 'SF-MEN-001',
    categoria: 'mens-shoes',
    nombre: 'Nike Air Max 90',
    descripcion: 'Zapatilla urbana de alto confort',
    marca: 'Nike',
    precio: 120.0,
    stock: 15,
    imagen_url: getDefaultImageUrl(0)
  },
  {
    sku: 'SF-MEN-002',
    categoria: 'mens-shoes',
    nombre: 'Adidas Ultraboost',
    descripcion: 'Amortiguacion para uso diario',
    marca: 'Adidas',
    precio: 180.0,
    stock: 8,
    imagen_url: getDefaultImageUrl(1)
  },
  {
    sku: 'SF-WOM-001',
    categoria: 'womens-shoes',
    nombre: 'Puma RS-X',
    descripcion: 'Diseño casual con estilo deportivo',
    marca: 'Puma',
    precio: 95.0,
    stock: 20,
    imagen_url: getDefaultImageUrl(2)
  },
  {
    sku: 'SF-WOM-002',
    categoria: 'womens-shoes',
    nombre: 'New Balance 990',
    descripcion: 'Comodidad premium para todo el dia',
    marca: 'New Balance',
    precio: 175.0,
    stock: 12,
    imagen_url: getDefaultImageUrl(3)
  },
  {
    sku: 'SF-KID-001',
    categoria: 'kids-shoes',
    nombre: 'Asics Gel-Lyte',
    descripcion: 'Ligera y resistente para uso infantil',
    marca: 'Asics',
    precio: 110.0,
    stock: 18,
    imagen_url: getDefaultImageUrl(4)
  },
  {
    sku: 'SF-KID-002',
    categoria: 'kids-shoes',
    nombre: 'Jordan Retro 1',
    descripcion: 'Estilo clasico en talla juvenil',
    marca: 'Jordan',
    precio: 165.0,
    stock: 5,
    imagen_url: getDefaultImageUrl(0)
  },
  {
    sku: 'SF-MEN-003',
    categoria: 'mens-shoes',
    nombre: 'Vans Old Skool',
    descripcion: 'Perfil bajo con agarre urbano',
    marca: 'Vans',
    precio: 65.0,
    stock: 25,
    imagen_url: getDefaultImageUrl(1)
  },
  {
    sku: 'SF-WOM-003',
    categoria: 'womens-shoes',
    nombre: 'Reebok Classic Leather',
    descripcion: 'Acabado limpio para uso diario',
    marca: 'Reebok',
    precio: 85.0,
    stock: 14,
    imagen_url: getDefaultImageUrl(2)
  }
];

const DEFAULT_USERS = [
  {
    nombre: 'admin',
    email: 'admin@sportfamily.local',
    password: '123456',
    rol: 'admin'
  },
  {
    nombre: 'cliente',
    email: 'cliente@sportfamily.local',
    password: '123456',
    rol: 'cliente'
  }
];

export async function seedCatalogData(pool) {
  await seedUsers(pool);
  const [productCountRows] = await pool.query('SELECT COUNT(*) AS count FROM productos');

  if (Number(productCountRows[0].count) > 0) {
    await refreshProductImages(pool);
    return;
  }

  const categoryIds = new Map();

  for (const category of DEFAULT_CATEGORIES) {
    const [existingRows] = await pool.query('SELECT id FROM categorias WHERE nombre = ? LIMIT 1', [category.nombre]);

    if (existingRows.length > 0) {
      categoryIds.set(category.nombre, existingRows[0].id);
      continue;
    }

    const [result] = await pool.query(
      'INSERT INTO categorias (nombre, descripcion, activo) VALUES (?, ?, 1)',
      [category.nombre, category.descripcion]
    );

    categoryIds.set(category.nombre, result.insertId);
  }

  for (const product of DEFAULT_PRODUCTS) {
    const [existingRows] = await pool.query('SELECT id FROM productos WHERE sku = ? LIMIT 1', [product.sku]);

    if (existingRows.length > 0) {
      continue;
    }

    await pool.query(
      `
        INSERT INTO productos
          (categoria_id, nombre, descripcion, marca, sku, precio, stock, imagen_url, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [
        categoryIds.get(product.categoria) || null,
        product.nombre,
        product.descripcion,
        product.marca,
        product.sku,
        product.precio,
        product.stock,
        product.imagen_url ?? '/img/product-placeholder.svg'
      ]
    );
  }

  await refreshProductImages(pool);
}

async function seedUsers(pool) {
  for (const user of DEFAULT_USERS) {
    const [existingRows] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
      [user.email]
    );

    if (existingRows.length > 0) {
      continue;
    }

    await pool.query(
      `
        INSERT INTO usuarios (nombre, email, password, rol)
        VALUES (?, ?, ?, ?)
      `,
      [user.nombre, user.email, hashPassword(user.password), user.rol]
    );
  }
}

async function refreshProductImages(pool) {
  for (const product of DEFAULT_PRODUCTS) {
    await pool.query(
      `
        UPDATE productos
        SET imagen_url = ?
        WHERE sku = ?
      `,
      [product.imagen_url, product.sku]
    );
  }
}
