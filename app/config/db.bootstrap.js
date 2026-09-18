const TABLE_DEFINITIONS = [
  {
    name: 'usuarios',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`usuarios\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`nombre\` VARCHAR(120) NOT NULL DEFAULT '',
        \`email\` VARCHAR(150) NOT NULL DEFAULT '',
        \`password\` VARCHAR(255) NOT NULL DEFAULT '',
        \`rol\` ENUM('admin', 'cliente') NOT NULL DEFAULT 'cliente',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      "`id` INT UNSIGNED NOT NULL AUTO_INCREMENT",
      "`nombre` VARCHAR(120) NOT NULL DEFAULT ''",
      "`email` VARCHAR(150) NOT NULL DEFAULT ''",
      "`password` VARCHAR(255) NOT NULL DEFAULT ''",
      "`rol` ENUM('admin', 'cliente') NOT NULL DEFAULT 'cliente'",
      "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ],
    indexes: [
      {
        name: 'idx_usuarios_email',
        sql: 'CREATE UNIQUE INDEX `idx_usuarios_email` ON `usuarios` (`email`)'
      },
      {
        name: 'idx_usuarios_nombre',
        sql: 'CREATE INDEX `idx_usuarios_nombre` ON `usuarios` (`nombre`)'
      }
    ]
  },
  {
    name: 'categorias',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`categorias\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`nombre\` VARCHAR(120) NOT NULL DEFAULT '',
        \`descripcion\` VARCHAR(255) NULL,
        \`activo\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      "`id` INT UNSIGNED NOT NULL AUTO_INCREMENT",
      "`nombre` VARCHAR(120) NOT NULL DEFAULT ''",
      "`descripcion` VARCHAR(255) NULL",
      "`activo` TINYINT(1) NOT NULL DEFAULT 1",
      "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ],
    indexes: [
      {
        name: 'idx_categorias_nombre',
        sql: 'CREATE INDEX `idx_categorias_nombre` ON `categorias` (`nombre`)'
      }
    ]
  },
  {
    name: 'productos',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`productos\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`categoria_id\` INT UNSIGNED NULL,
        \`nombre\` VARCHAR(150) NOT NULL DEFAULT '',
        \`descripcion\` TEXT NULL,
        \`marca\` VARCHAR(120) NULL,
        \`sku\` VARCHAR(80) NULL,
        \`precio\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`stock\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`imagen_url\` VARCHAR(255) NULL,
        \`activo\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      "`id` INT UNSIGNED NOT NULL AUTO_INCREMENT",
      "`categoria_id` INT UNSIGNED NULL",
      "`nombre` VARCHAR(150) NOT NULL DEFAULT ''",
      "`descripcion` TEXT NULL",
      "`marca` VARCHAR(120) NULL",
      "`sku` VARCHAR(80) NULL",
      "`precio` DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "`stock` INT UNSIGNED NOT NULL DEFAULT 0",
      "`imagen_url` VARCHAR(255) NULL",
      "`activo` TINYINT(1) NOT NULL DEFAULT 1",
      "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ],
    indexes: [
      {
        name: 'idx_productos_categoria_id',
        sql: 'CREATE INDEX `idx_productos_categoria_id` ON `productos` (`categoria_id`)'
      },
      {
        name: 'idx_productos_sku',
        sql: 'CREATE INDEX `idx_productos_sku` ON `productos` (`sku`)'
      }
    ],
    foreignKeys: [
      {
        name: 'fk_productos_categoria',
        sql: `
          ALTER TABLE \`productos\`
          ADD CONSTRAINT \`fk_productos_categoria\`
          FOREIGN KEY (\`categoria_id\`) REFERENCES \`categorias\`(\`id\`)
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `
      }
    ]
  },
  {
    name: 'carrito',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`carrito\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`session_id\` VARCHAR(128) NOT NULL,
        \`producto_id\` INT UNSIGNED NULL,
        \`producto_nombre\` VARCHAR(150) NOT NULL DEFAULT '',
        \`precio_unitario\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`cantidad\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`subtotal\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`estado\` ENUM('activo', 'convertido', 'abandonado') NOT NULL DEFAULT 'activo',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      "`id` INT UNSIGNED NOT NULL AUTO_INCREMENT",
      "`session_id` VARCHAR(128) NOT NULL",
      "`producto_id` INT UNSIGNED NULL",
      "`producto_nombre` VARCHAR(150) NOT NULL DEFAULT ''",
      "`precio_unitario` DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "`cantidad` INT UNSIGNED NOT NULL DEFAULT 1",
      "`subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "`estado` ENUM('activo', 'convertido', 'abandonado') NOT NULL DEFAULT 'activo'",
      "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ],
    indexes: [
      {
        name: 'idx_carrito_session_id',
        sql: 'CREATE INDEX `idx_carrito_session_id` ON `carrito` (`session_id`)'
      },
      {
        name: 'idx_carrito_producto_id',
        sql: 'CREATE INDEX `idx_carrito_producto_id` ON `carrito` (`producto_id`)'
      }
    ],
    foreignKeys: [
      {
        name: 'fk_carrito_producto',
        sql: `
          ALTER TABLE \`carrito\`
          ADD CONSTRAINT \`fk_carrito_producto\`
          FOREIGN KEY (\`producto_id\`) REFERENCES \`productos\`(\`id\`)
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `
      }
    ]
  },
  {
    name: 'pedidos',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`pedidos\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`numero_pedido\` VARCHAR(40) NOT NULL DEFAULT '',
        \`session_id\` VARCHAR(128) NULL,
        \`cliente_nombre\` VARCHAR(150) NULL,
        \`cliente_email\` VARCHAR(150) NULL,
        \`cliente_telefono\` VARCHAR(40) NULL,
        \`direccion\` VARCHAR(255) NULL,
        \`subtotal\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`impuestos\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`total\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`estado\` ENUM('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado') NOT NULL DEFAULT 'pendiente',
        \`detalle_json\` LONGTEXT NULL,
        \`stock_descuento_aplicado\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      "`id` INT UNSIGNED NOT NULL AUTO_INCREMENT",
      "`numero_pedido` VARCHAR(40) NOT NULL DEFAULT ''",
      "`session_id` VARCHAR(128) NULL",
      "`cliente_nombre` VARCHAR(150) NULL",
      "`cliente_email` VARCHAR(150) NULL",
      "`cliente_telefono` VARCHAR(40) NULL",
      "`direccion` VARCHAR(255) NULL",
      "`subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "`impuestos` DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "`total` DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "`estado` ENUM('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado') NOT NULL DEFAULT 'pendiente'",
      "`detalle_json` LONGTEXT NULL",
      "`stock_descuento_aplicado` TINYINT(1) NOT NULL DEFAULT 0",
      "`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ],
    indexes: [
      {
        name: 'idx_pedidos_numero_pedido',
        sql: 'CREATE INDEX `idx_pedidos_numero_pedido` ON `pedidos` (`numero_pedido`)'
      },
      {
        name: 'idx_pedidos_session_id',
        sql: 'CREATE INDEX `idx_pedidos_session_id` ON `pedidos` (`session_id`)'
      },
      {
        name: 'idx_pedidos_estado',
        sql: 'CREATE INDEX `idx_pedidos_estado` ON `pedidos` (`estado`)'
      }
    ]
  }
];

const TRIGGER_DEFINITIONS = [
  {
    name: 'trg_pedidos_stock_before_insert',
    sql: `
      CREATE TRIGGER \`trg_pedidos_stock_before_insert\`
      BEFORE INSERT ON \`pedidos\`
      FOR EACH ROW
      BEGIN
        DECLARE i INT DEFAULT 0;
        DECLARE total_items INT DEFAULT 0;
        DECLARE v_producto_id INT UNSIGNED;
        DECLARE v_cantidad INT UNSIGNED;

        IF NEW.estado = 'enviado'
          AND COALESCE(NEW.stock_descuento_aplicado, 0) = 0
          AND NEW.detalle_json IS NOT NULL
          AND JSON_VALID(NEW.detalle_json) = 1
        THEN
          SET total_items = JSON_LENGTH(NEW.detalle_json);

          WHILE i < total_items DO
            SET v_producto_id = CAST(
              JSON_UNQUOTE(JSON_EXTRACT(NEW.detalle_json, CONCAT('$[', i, '].producto_id')))
              AS UNSIGNED
            );
            SET v_cantidad = CAST(
              JSON_UNQUOTE(JSON_EXTRACT(NEW.detalle_json, CONCAT('$[', i, '].cantidad')))
              AS UNSIGNED
            );

            IF v_producto_id IS NOT NULL AND v_cantidad IS NOT NULL AND v_cantidad > 0 THEN
              UPDATE productos
              SET stock = GREATEST(stock - v_cantidad, 0)
              WHERE id = v_producto_id;
            END IF;

            SET i = i + 1;
          END WHILE;

          SET NEW.stock_descuento_aplicado = 1;
        END IF;
      END
    `
  },
  {
    name: 'trg_pedidos_stock_before_update',
    sql: `
      CREATE TRIGGER \`trg_pedidos_stock_before_update\`
      BEFORE UPDATE ON \`pedidos\`
      FOR EACH ROW
      BEGIN
        DECLARE i INT DEFAULT 0;
        DECLARE total_items INT DEFAULT 0;
        DECLARE v_producto_id INT UNSIGNED;
        DECLARE v_cantidad INT UNSIGNED;

        IF NEW.estado = 'enviado'
          AND COALESCE(OLD.stock_descuento_aplicado, 0) = 0
          AND NEW.detalle_json IS NOT NULL
          AND JSON_VALID(NEW.detalle_json) = 1
        THEN
          SET total_items = JSON_LENGTH(NEW.detalle_json);

          WHILE i < total_items DO
            SET v_producto_id = CAST(
              JSON_UNQUOTE(JSON_EXTRACT(NEW.detalle_json, CONCAT('$[', i, '].producto_id')))
              AS UNSIGNED
            );
            SET v_cantidad = CAST(
              JSON_UNQUOTE(JSON_EXTRACT(NEW.detalle_json, CONCAT('$[', i, '].cantidad')))
              AS UNSIGNED
            );

            IF v_producto_id IS NOT NULL AND v_cantidad IS NOT NULL AND v_cantidad > 0 THEN
              UPDATE productos
              SET stock = GREATEST(stock - v_cantidad, 0)
              WHERE id = v_producto_id;
            END IF;

            SET i = i + 1;
          END WHILE;

          SET NEW.stock_descuento_aplicado = 1;
        END IF;
      END
    `
  }
];

export async function initializeDatabaseSchema(pool) {
  for (const table of TABLE_DEFINITIONS) {
    await pool.query(table.createSql);

    for (const columnSql of table.columns) {
      await ensureColumn(pool, table.name, columnSql);
    }

    for (const index of table.indexes || []) {
      await ensureIndex(pool, table.name, index);
    }

    for (const foreignKey of table.foreignKeys || []) {
      await ensureForeignKey(pool, table.name, foreignKey);
    }
  }

  for (const trigger of TRIGGER_DEFINITIONS) {
    await ensureTrigger(pool, trigger);
  }
}

async function ensureColumn(pool, tableName, columnSql) {
  const columnName = columnSql.match(/^`([^`]+)`/);

  if (!columnName) {
    throw new Error(`Invalid column definition for ${tableName}: ${columnSql}`);
  }

  const [rows] = await pool.query(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName[1]]
  );

  if (Number(rows[0].count) === 0) {
    await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnSql}`);
    return;
  }

  await pool.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN ${columnSql}`);
}

async function ensureIndex(pool, tableName, index) {
  const [rows] = await pool.query(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
    `,
    [tableName, index.name]
  );

  if (Number(rows[0].count) === 0) {
    await pool.query(index.sql);
  }
}

async function ensureForeignKey(pool, tableName, foreignKey) {
  const [rows] = await pool.query(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `,
    [tableName, foreignKey.name]
  );

  if (Number(rows[0].count) !== 0) {
    return;
  }

  try {
    await pool.query(foreignKey.sql);
  } catch (error) {
    console.warn(`[db] No se pudo crear la foreign key ${foreignKey.name}: ${error.message}`);
  }
}

async function ensureTrigger(pool, trigger) {
  await pool.query(`DROP TRIGGER IF EXISTS \`${trigger.name}\``);
  await pool.query(trigger.sql);
}
