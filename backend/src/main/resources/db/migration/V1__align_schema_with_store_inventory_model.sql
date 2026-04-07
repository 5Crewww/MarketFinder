CREATE TABLE IF NOT EXISTS stores (
    id_store BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    layout_image_url LONGTEXT NULL,
    owner_user_id BIGINT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id_store),
    CONSTRAINT fk_stores_owner_user
        FOREIGN KEY (owner_user_id) REFERENCES users (id_user)
);

SET @corredores_version_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'corredores'
      AND COLUMN_NAME = 'version'
);

SET @add_corredores_version_sql := IF(
    @corredores_version_column_exists = 0,
    'ALTER TABLE corredores ADD COLUMN version BIGINT NOT NULL DEFAULT 0',
    'SELECT 1'
);

PREPARE add_corredores_version_stmt FROM @add_corredores_version_sql;
EXECUTE add_corredores_version_stmt;
DEALLOCATE PREPARE add_corredores_version_stmt;

SET @prateleiras_version_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'prateleiras'
      AND COLUMN_NAME = 'version'
);

SET @add_prateleiras_version_sql := IF(
    @prateleiras_version_column_exists = 0,
    'ALTER TABLE prateleiras ADD COLUMN version BIGINT NOT NULL DEFAULT 0',
    'SELECT 1'
);

PREPARE add_prateleiras_version_stmt FROM @add_prateleiras_version_sql;
EXECUTE add_prateleiras_version_stmt;
DEALLOCATE PREPARE add_prateleiras_version_stmt;

SET @produtos_categoria_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'produtos'
      AND COLUMN_NAME = 'categoria'
);

SET @add_produtos_categoria_sql := IF(
    @produtos_categoria_column_exists = 0,
    'ALTER TABLE produtos ADD COLUMN categoria VARCHAR(255) NULL',
    'SELECT 1'
);

PREPARE add_produtos_categoria_stmt FROM @add_produtos_categoria_sql;
EXECUTE add_produtos_categoria_stmt;
DEALLOCATE PREPARE add_produtos_categoria_stmt;

SET @produtos_normalized_nome_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'produtos'
      AND COLUMN_NAME = 'normalized_nome'
);

SET @add_produtos_normalized_nome_sql := IF(
    @produtos_normalized_nome_column_exists = 0,
    'ALTER TABLE produtos ADD COLUMN normalized_nome VARCHAR(255) NULL',
    'SELECT 1'
);

PREPARE add_produtos_normalized_nome_stmt FROM @add_produtos_normalized_nome_sql;
EXECUTE add_produtos_normalized_nome_stmt;
DEALLOCATE PREPARE add_produtos_normalized_nome_stmt;

SET @produtos_version_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'produtos'
      AND COLUMN_NAME = 'version'
);

SET @add_produtos_version_sql := IF(
    @produtos_version_column_exists = 0,
    'ALTER TABLE produtos ADD COLUMN version BIGINT NOT NULL DEFAULT 0',
    'SELECT 1'
);

PREPARE add_produtos_version_stmt FROM @add_produtos_version_sql;
EXECUTE add_produtos_version_stmt;
DEALLOCATE PREPARE add_produtos_version_stmt;

UPDATE produtos
SET nome = CONCAT('Produto ', id_prod)
WHERE nome IS NULL OR TRIM(nome) = '';

UPDATE produtos
SET normalized_nome = LOWER(nome)
WHERE normalized_nome IS NULL OR TRIM(normalized_nome) = '';

UPDATE stores
SET version = 0
WHERE version IS NULL;

UPDATE corredores
SET version = 0
WHERE version IS NULL;

UPDATE prateleiras
SET version = 0
WHERE version IS NULL;

UPDATE produtos
SET version = 0
WHERE version IS NULL;

UPDATE corredores
SET nome = CONCAT('Corredor ', id_corredor)
WHERE nome IS NULL OR TRIM(nome) = '';

UPDATE prateleiras
SET nome = CONCAT('Prateleira ', id_prateleira)
WHERE nome IS NULL OR TRIM(nome) = '';

INSERT INTO stores (id_store, name, layout_image_url, owner_user_id, version)
SELECT DISTINCT c.id_loja, CONCAT('Loja ', c.id_loja), NULL, NULL, 0
FROM corredores c
LEFT JOIN stores s ON s.id_store = c.id_loja
WHERE c.id_loja IS NOT NULL
  AND s.id_store IS NULL;

INSERT INTO stores (name, layout_image_url, owner_user_id, version)
SELECT CONCAT('Loja ', u.nome_user), NULL, u.id_user, 0
FROM users u
LEFT JOIN stores s ON s.owner_user_id = u.id_user
WHERE LOWER(COALESCE(u.role, '')) = 'lojista'
  AND s.id_store IS NULL;

INSERT INTO stores (name, layout_image_url, owner_user_id, version)
SELECT 'Loja Migrada', NULL, NULL, 0
FROM DUAL
WHERE EXISTS (
    SELECT 1
    FROM corredores
    WHERE id_loja IS NULL
)
  AND NOT EXISTS (
    SELECT 1
    FROM stores
);

SET @default_store_id := (SELECT MIN(id_store) FROM stores);

UPDATE corredores
SET id_loja = @default_store_id
WHERE id_loja IS NULL
  AND @default_store_id IS NOT NULL;

INSERT INTO corredores (id_loja, nome, version)
SELECT @default_store_id, 'Corredor Migrado', 0
FROM DUAL
WHERE EXISTS (
    SELECT 1
    FROM prateleiras
    WHERE id_corredor IS NULL
)
  AND NOT EXISTS (
    SELECT 1
    FROM corredores
);

SET @default_corredor_id := (SELECT MIN(id_corredor) FROM corredores);

UPDATE prateleiras
SET id_corredor = @default_corredor_id
WHERE id_corredor IS NULL
  AND @default_corredor_id IS NOT NULL;

ALTER TABLE stores
    MODIFY COLUMN name VARCHAR(255) NOT NULL,
    MODIFY COLUMN version BIGINT NOT NULL;

ALTER TABLE produtos
    MODIFY COLUMN nome VARCHAR(255) NOT NULL,
    MODIFY COLUMN normalized_nome VARCHAR(255) NOT NULL,
    MODIFY COLUMN version BIGINT NOT NULL;

ALTER TABLE corredores
    MODIFY COLUMN id_loja BIGINT NOT NULL,
    MODIFY COLUMN nome VARCHAR(255) NOT NULL,
    MODIFY COLUMN version BIGINT NOT NULL;

ALTER TABLE prateleiras
    MODIFY COLUMN id_corredor BIGINT NOT NULL,
    MODIFY COLUMN nome VARCHAR(255) NOT NULL,
    MODIFY COLUMN version BIGINT NOT NULL;

CREATE TABLE IF NOT EXISTS inventory (
    id_inventory BIGINT NOT NULL AUTO_INCREMENT,
    price_cents BIGINT NOT NULL,
    stock_qty INT NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    version BIGINT NULL,
    product_id BIGINT NOT NULL,
    shelf_id BIGINT NOT NULL,
    store_id BIGINT NOT NULL,
    PRIMARY KEY (id_inventory),
    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id) REFERENCES produtos (id_prod),
    CONSTRAINT fk_inventory_shelf
        FOREIGN KEY (shelf_id) REFERENCES prateleiras (id_prateleira),
    CONSTRAINT fk_inventory_store
        FOREIGN KEY (store_id) REFERENCES stores (id_store)
);

INSERT INTO inventory (price_cents, stock_qty, updated_at, version, product_id, shelf_id, store_id)
SELECT
    COALESCE(ROUND(COALESCE(p.preco, 0) * 100), 0),
    0,
    NOW(6),
    0,
    p.id_prod,
    p.id_prateleira,
    c.id_loja
FROM produtos p
JOIN prateleiras pr ON pr.id_prateleira = p.id_prateleira
JOIN corredores c ON c.id_corredor = pr.id_corredor
LEFT JOIN inventory i
    ON i.product_id = p.id_prod
   AND i.store_id = c.id_loja
WHERE p.id_prateleira IS NOT NULL
  AND c.id_loja IS NOT NULL
  AND i.id_inventory IS NULL;

CREATE TABLE IF NOT EXISTS store_user_memberships (
    id_membership BIGINT NOT NULL AUTO_INCREMENT,
    membership_role VARCHAR(40) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    store_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (id_membership),
    CONSTRAINT fk_membership_store
        FOREIGN KEY (store_id) REFERENCES stores (id_store),
    CONSTRAINT fk_membership_user
        FOREIGN KEY (user_id) REFERENCES users (id_user)
);

INSERT INTO store_user_memberships (membership_role, version, store_id, user_id)
SELECT 'OWNER', 0, s.id_store, s.owner_user_id
FROM stores s
LEFT JOIN store_user_memberships m
    ON m.store_id = s.id_store
   AND m.user_id = s.owner_user_id
WHERE s.owner_user_id IS NOT NULL
  AND m.id_membership IS NULL;

CREATE TABLE IF NOT EXISTS user_sessions (
    id_session BIGINT NOT NULL AUTO_INCREMENT,
    active BIT(1) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    session_token VARCHAR(128) NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (id_session),
    CONSTRAINT fk_user_sessions_user
        FOREIGN KEY (user_id) REFERENCES users (id_user)
);

SET @owner_unique_index := (
    SELECT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stores'
      AND COLUMN_NAME = 'owner_user_id'
      AND NON_UNIQUE = 0
      AND INDEX_NAME <> 'PRIMARY'
    LIMIT 1
);

SET @drop_owner_unique_sql := IF(
    @owner_unique_index IS NOT NULL,
    CONCAT('DROP INDEX `', @owner_unique_index, '` ON `stores`'),
    'SELECT 1'
);

PREPARE drop_owner_unique_stmt FROM @drop_owner_unique_sql;
EXECUTE drop_owner_unique_stmt;
DEALLOCATE PREPARE drop_owner_unique_stmt;

SET @stores_owner_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stores'
      AND INDEX_NAME = 'idx_stores_owner_user'
);

SET @create_stores_owner_index_sql := IF(
    @stores_owner_index_exists = 0,
    'CREATE INDEX idx_stores_owner_user ON stores (owner_user_id)',
    'SELECT 1'
);

PREPARE create_stores_owner_index_stmt FROM @create_stores_owner_index_sql;
EXECUTE create_stores_owner_index_stmt;
DEALLOCATE PREPARE create_stores_owner_index_stmt;

SET @inventory_unique_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory'
      AND INDEX_NAME = 'uk_inventory_store_product'
);

SET @create_inventory_unique_sql := IF(
    @inventory_unique_exists = 0,
    'ALTER TABLE inventory ADD CONSTRAINT uk_inventory_store_product UNIQUE (store_id, product_id)',
    'SELECT 1'
);

PREPARE create_inventory_unique_stmt FROM @create_inventory_unique_sql;
EXECUTE create_inventory_unique_stmt;
DEALLOCATE PREPARE create_inventory_unique_stmt;

SET @inventory_store_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory'
      AND INDEX_NAME = 'idx_inventory_store'
);

SET @create_inventory_store_index_sql := IF(
    @inventory_store_index_exists = 0,
    'CREATE INDEX idx_inventory_store ON inventory (store_id)',
    'SELECT 1'
);

PREPARE create_inventory_store_index_stmt FROM @create_inventory_store_index_sql;
EXECUTE create_inventory_store_index_stmt;
DEALLOCATE PREPARE create_inventory_store_index_stmt;

SET @inventory_shelf_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory'
      AND INDEX_NAME = 'idx_inventory_store_shelf'
);

SET @create_inventory_shelf_index_sql := IF(
    @inventory_shelf_index_exists = 0,
    'CREATE INDEX idx_inventory_store_shelf ON inventory (store_id, shelf_id)',
    'SELECT 1'
);

PREPARE create_inventory_shelf_index_stmt FROM @create_inventory_shelf_index_sql;
EXECUTE create_inventory_shelf_index_stmt;
DEALLOCATE PREPARE create_inventory_shelf_index_stmt;

SET @inventory_price_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory'
      AND INDEX_NAME = 'idx_inventory_price'
);

SET @create_inventory_price_index_sql := IF(
    @inventory_price_index_exists = 0,
    'CREATE INDEX idx_inventory_price ON inventory (price_cents)',
    'SELECT 1'
);

PREPARE create_inventory_price_index_stmt FROM @create_inventory_price_index_sql;
EXECUTE create_inventory_price_index_stmt;
DEALLOCATE PREPARE create_inventory_price_index_stmt;

SET @membership_unique_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_user_memberships'
      AND INDEX_NAME = 'uk_store_user_membership'
);

SET @create_membership_unique_sql := IF(
    @membership_unique_exists = 0,
    'ALTER TABLE store_user_memberships ADD CONSTRAINT uk_store_user_membership UNIQUE (store_id, user_id)',
    'SELECT 1'
);

PREPARE create_membership_unique_stmt FROM @create_membership_unique_sql;
EXECUTE create_membership_unique_stmt;
DEALLOCATE PREPARE create_membership_unique_stmt;

SET @session_token_unique_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_sessions'
      AND INDEX_NAME = 'idx_user_sessions_token'
);

SET @create_session_token_unique_sql := IF(
    @session_token_unique_exists = 0,
    'ALTER TABLE user_sessions ADD CONSTRAINT idx_user_sessions_token UNIQUE (session_token)',
    'SELECT 1'
);

PREPARE create_session_token_unique_stmt FROM @create_session_token_unique_sql;
EXECUTE create_session_token_unique_stmt;
DEALLOCATE PREPARE create_session_token_unique_stmt;

SET @produto_nome_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'produtos'
      AND INDEX_NAME = 'idx_produtos_nome_normalizado'
);

SET @create_produto_nome_index_sql := IF(
    @produto_nome_index_exists = 0,
    'CREATE INDEX idx_produtos_nome_normalizado ON produtos (normalized_nome)',
    'SELECT 1'
);

PREPARE create_produto_nome_index_stmt FROM @create_produto_nome_index_sql;
EXECUTE create_produto_nome_index_stmt;
DEALLOCATE PREPARE create_produto_nome_index_stmt;

SET @produto_categoria_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'produtos'
      AND INDEX_NAME = 'idx_produtos_categoria_nome'
);

SET @create_produto_categoria_index_sql := IF(
    @produto_categoria_index_exists = 0,
    'CREATE INDEX idx_produtos_categoria_nome ON produtos (categoria, normalized_nome)',
    'SELECT 1'
);

PREPARE create_produto_categoria_index_stmt FROM @create_produto_categoria_index_sql;
EXECUTE create_produto_categoria_index_stmt;
DEALLOCATE PREPARE create_produto_categoria_index_stmt;
