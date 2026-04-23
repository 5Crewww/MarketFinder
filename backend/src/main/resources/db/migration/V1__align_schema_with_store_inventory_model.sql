
-- =========================================================================
-- FASE 1: CRIAÇÃO DAS TABELAS BASE (AS FUNDAÇÕES INDEPENDENTES)
-- =========================================================================

CREATE TABLE IF NOT EXISTS users (
                                     id_user BIGINT NOT NULL AUTO_INCREMENT,
                                     nome_user VARCHAR(255) NOT NULL,
                                     email_user VARCHAR(255),
                                     senha_user VARCHAR(255),
                                     role VARCHAR(50),
                                     PRIMARY KEY (id_user)
);

CREATE TABLE IF NOT EXISTS corredores (
                                          id_corredor BIGINT NOT NULL AUTO_INCREMENT,
                                          nome VARCHAR(255),
                                          id_loja BIGINT,
                                          version BIGINT NOT NULL DEFAULT 0,
                                          PRIMARY KEY (id_corredor)
);

CREATE TABLE IF NOT EXISTS prateleiras (
                                           id_prateleira BIGINT NOT NULL AUTO_INCREMENT,
                                           nome VARCHAR(255),
                                           id_corredor BIGINT,
                                           posx DOUBLE NULL,
                                           posy DOUBLE NULL,
                                           width DOUBLE NULL,
                                           height DOUBLE NULL,
                                           version BIGINT NOT NULL DEFAULT 0,
                                           PRIMARY KEY (id_prateleira)
);

CREATE TABLE IF NOT EXISTS produtos (
                                        id_prod BIGINT NOT NULL AUTO_INCREMENT,
                                        nome VARCHAR(255) NOT NULL,
                                        descricao VARCHAR(1000),
                                        marca VARCHAR(255) NULL,
                                        categoria VARCHAR(255) NULL,
                                        normalized_nome VARCHAR(255) NOT NULL,
                                        preco DECIMAL(10,2),
                                        stock INT,
                                        id_prateleira BIGINT,
                                        version BIGINT NOT NULL DEFAULT 0,
                                        PRIMARY KEY (id_prod)
);

-- =========================================================================
-- FASE 2: CRIAÇÃO DAS TABELAS DEPENDENTES (COM FOREIGN KEYS)
-- =========================================================================

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

CREATE TABLE IF NOT EXISTS inventory (
                                         id_inventory BIGINT NOT NULL AUTO_INCREMENT,
                                         price_cents BIGINT NOT NULL,
                                         stock_qty INT NOT NULL,
                                         updated_at DATETIME(6) NOT NULL,
                                         version BIGINT NULL DEFAULT 0,
                                         is_deleted BIT(1) NOT NULL DEFAULT b'0',
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

CREATE TABLE IF NOT EXISTS password_reset_tokens (
                                                     id_password_reset_token BIGINT NOT NULL AUTO_INCREMENT,
                                                     token VARCHAR(64) NOT NULL,
                                                     user_id BIGINT NOT NULL,
                                                     expires_at DATETIME(6) NOT NULL,
                                                     PRIMARY KEY (id_password_reset_token),
                                                     CONSTRAINT fk_password_reset_tokens_user
                                                         FOREIGN KEY (user_id) REFERENCES users (id_user)
);

-- =========================================================================
-- FASE 3: ATUALIZAÇÃO E HIGIENIZAÇÃO DE DADOS (SAFEGUARDS)
-- =========================================================================
SET SQL_SAFE_UPDATES = 0;

UPDATE produtos
SET nome = CONCAT('Produto ', id_prod)
WHERE nome IS NULL OR TRIM(nome) = '';

UPDATE produtos
SET normalized_nome = LOWER(nome)
WHERE normalized_nome IS NULL OR TRIM(normalized_nome) = '';

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
    SELECT 1 FROM corredores WHERE id_loja IS NULL
)
  AND NOT EXISTS (
    SELECT 1 FROM stores
);

SET @default_store_id := (SELECT MIN(id_store) FROM stores);

UPDATE corredores
SET id_loja = @default_store_id
WHERE id_loja IS NULL AND @default_store_id IS NOT NULL;

INSERT INTO corredores (id_loja, nome, version)
SELECT @default_store_id, 'Corredor Migrado', 0
FROM DUAL
WHERE EXISTS (
    SELECT 1 FROM prateleiras WHERE id_corredor IS NULL
)
  AND NOT EXISTS (
    SELECT 1 FROM corredores
);

SET @default_corredor_id := (SELECT MIN(id_corredor) FROM corredores);

UPDATE prateleiras
SET id_corredor = @default_corredor_id
WHERE id_corredor IS NULL AND @default_corredor_id IS NOT NULL;

INSERT INTO inventory (price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT
    COALESCE(ROUND(COALESCE(p.preco, 0) * 100), 0),
    0,
    NOW(6),
    0,
    b'0',
    p.id_prod,
    p.id_prateleira,
    c.id_loja
FROM produtos p
         JOIN prateleiras pr ON pr.id_prateleira = p.id_prateleira
         JOIN corredores c ON c.id_corredor = pr.id_corredor
         LEFT JOIN inventory i
                   ON i.product_id = p.id_prod AND i.store_id = c.id_loja
WHERE p.id_prateleira IS NOT NULL
  AND c.id_loja IS NOT NULL
  AND i.id_inventory IS NULL;

INSERT INTO store_user_memberships (membership_role, version, store_id, user_id)
SELECT 'OWNER', 0, s.id_store, s.owner_user_id
FROM stores s
         LEFT JOIN store_user_memberships m
                   ON m.store_id = s.id_store AND m.user_id = s.owner_user_id
WHERE s.owner_user_id IS NOT NULL
  AND m.id_membership IS NULL;

SET SQL_SAFE_UPDATES = 1;

-- =========================================================================
-- FASE 4: CRIAÇÃO DE ÍNDICES E CHAVES ÚNICAS (PERFORMANCE E SEGURANÇA)
-- =========================================================================

SET @owner_unique_index := (SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stores' AND COLUMN_NAME = 'owner_user_id' AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY' LIMIT 1);
SET @drop_owner_unique_sql := IF(@owner_unique_index IS NOT NULL, CONCAT('DROP INDEX `', @owner_unique_index, '` ON `stores`'), 'SELECT 1');
PREPARE drop_owner_unique_stmt FROM @drop_owner_unique_sql;
EXECUTE drop_owner_unique_stmt;
DEALLOCATE PREPARE drop_owner_unique_stmt;

SET @stores_owner_index_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stores' AND INDEX_NAME = 'idx_stores_owner_user');
SET @create_stores_owner_index_sql := IF(@stores_owner_index_exists = 0, 'CREATE INDEX idx_stores_owner_user ON stores (owner_user_id)', 'SELECT 1');
PREPARE create_stores_owner_index_stmt FROM @create_stores_owner_index_sql;
EXECUTE create_stores_owner_index_stmt;
DEALLOCATE PREPARE create_stores_owner_index_stmt;

SET @inventory_unique_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND INDEX_NAME = 'uk_inventory_store_product');
SET @create_inventory_unique_sql := IF(@inventory_unique_exists = 0, 'ALTER TABLE inventory ADD CONSTRAINT uk_inventory_store_product UNIQUE (store_id, product_id)', 'SELECT 1');
PREPARE create_inventory_unique_stmt FROM @create_inventory_unique_sql;
EXECUTE create_inventory_unique_stmt;
DEALLOCATE PREPARE create_inventory_unique_stmt;

SET @inventory_store_index_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND INDEX_NAME = 'idx_inventory_store');
SET @create_inventory_store_index_sql := IF(@inventory_store_index_exists = 0, 'CREATE INDEX idx_inventory_store ON inventory (store_id)', 'SELECT 1');
PREPARE create_inventory_store_index_stmt FROM @create_inventory_store_index_sql;
EXECUTE create_inventory_store_index_stmt;
DEALLOCATE PREPARE create_inventory_store_index_stmt;

SET @inventory_shelf_index_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND INDEX_NAME = 'idx_inventory_store_shelf');
SET @create_inventory_shelf_index_sql := IF(@inventory_shelf_index_exists = 0, 'CREATE INDEX idx_inventory_store_shelf ON inventory (store_id, shelf_id)', 'SELECT 1');
PREPARE create_inventory_shelf_index_stmt FROM @create_inventory_shelf_index_sql;
EXECUTE create_inventory_shelf_index_stmt;
DEALLOCATE PREPARE create_inventory_shelf_index_stmt;

SET @inventory_price_index_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND INDEX_NAME = 'idx_inventory_price');
SET @create_inventory_price_index_sql := IF(@inventory_price_index_exists = 0, 'CREATE INDEX idx_inventory_price ON inventory (price_cents)', 'SELECT 1');
PREPARE create_inventory_price_index_stmt FROM @create_inventory_price_index_sql;
EXECUTE create_inventory_price_index_stmt;
DEALLOCATE PREPARE create_inventory_price_index_stmt;

SET @membership_unique_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_user_memberships' AND INDEX_NAME = 'uk_store_user_membership');
SET @create_membership_unique_sql := IF(@membership_unique_exists = 0, 'ALTER TABLE store_user_memberships ADD CONSTRAINT uk_store_user_membership UNIQUE (store_id, user_id)', 'SELECT 1');
PREPARE create_membership_unique_stmt FROM @create_membership_unique_sql;
EXECUTE create_membership_unique_stmt;
DEALLOCATE PREPARE create_membership_unique_stmt;

SET @session_token_unique_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_sessions' AND INDEX_NAME = 'idx_user_sessions_token');
SET @create_session_token_unique_sql := IF(@session_token_unique_exists = 0, 'ALTER TABLE user_sessions ADD CONSTRAINT idx_user_sessions_token UNIQUE (session_token)', 'SELECT 1');
PREPARE create_session_token_unique_stmt FROM @create_session_token_unique_sql;
EXECUTE create_session_token_unique_stmt;
DEALLOCATE PREPARE create_session_token_unique_stmt;

SET @produto_nome_index_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'produtos' AND INDEX_NAME = 'idx_produtos_nome_normalizado');
SET @create_produto_nome_index_sql := IF(@produto_nome_index_exists = 0, 'CREATE INDEX idx_produtos_nome_normalizado ON produtos (normalized_nome)', 'SELECT 1');
PREPARE create_produto_nome_index_stmt FROM @create_produto_nome_index_sql;
EXECUTE create_produto_nome_index_stmt;
DEALLOCATE PREPARE create_produto_nome_index_stmt;

SET @produto_categoria_index_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'produtos' AND INDEX_NAME = 'idx_produtos_categoria_nome');
SET @create_produto_categoria_index_sql := IF(@produto_categoria_index_exists = 0, 'CREATE INDEX idx_produtos_categoria_nome ON produtos (categoria, normalized_nome)', 'SELECT 1');
PREPARE create_produto_categoria_index_stmt FROM @create_produto_categoria_index_sql;
EXECUTE create_produto_categoria_index_stmt;
DEALLOCATE PREPARE create_produto_categoria_index_stmt;

SET @password_reset_token_unique_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_reset_tokens' AND INDEX_NAME = 'uk_password_reset_tokens_token');
SET @create_password_reset_token_unique_sql := IF(@password_reset_token_unique_exists = 0, 'CREATE UNIQUE INDEX uk_password_reset_tokens_token ON password_reset_tokens (token)', 'SELECT 1');
PREPARE create_password_reset_token_unique_stmt FROM @create_password_reset_token_unique_sql;
EXECUTE create_password_reset_token_unique_stmt;
DEALLOCATE PREPARE create_password_reset_token_unique_stmt;

SET @password_reset_token_user_index_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_reset_tokens' AND INDEX_NAME = 'idx_password_reset_tokens_user');
SET @create_password_reset_token_user_index_sql := IF(@password_reset_token_user_index_exists = 0, 'CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id)', 'SELECT 1');
PREPARE create_password_reset_token_user_index_stmt FROM @create_password_reset_token_user_index_sql;
EXECUTE create_password_reset_token_user_index_stmt;
DEALLOCATE PREPARE create_password_reset_token_user_index_stmt;

SET @password_reset_token_expires_index_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_reset_tokens' AND INDEX_NAME = 'idx_password_reset_tokens_expires_at');
SET @create_password_reset_token_expires_index_sql := IF(@password_reset_token_expires_index_exists = 0, 'CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at)', 'SELECT 1');
PREPARE create_password_reset_token_expires_index_stmt FROM @create_password_reset_token_expires_index_sql;
EXECUTE create_password_reset_token_expires_index_stmt;
DEALLOCATE PREPARE create_password_reset_token_expires_index_stmt;

-- =========================================================================
-- FASE 4: DADOS INICIAIS DE TESTE
-- Credenciais:
-- admin.master@marketfinder.test / admin123
-- loja.centro@marketfinder.test / lojista123
-- loja.bairro@marketfinder.test / lojista123
-- cliente.ana@marketfinder.test / cliente123
-- cliente.bruno@marketfinder.test / cliente123
-- =========================================================================

SET @layout_seed_svg := 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720"><rect width="1200" height="720" fill="%23f8fafc"/><rect x="60" y="120" width="1080" height="92" rx="18" fill="%23dbeafe"/><rect x="60" y="300" width="1080" height="92" rx="18" fill="%23dcfce7"/><rect x="60" y="480" width="1080" height="92" rx="18" fill="%23fee2e2"/><text x="72" y="88" font-size="40" font-family="Arial" fill="%230f172a">MarketFinder Demo Layout</text><text x="90" y="175" font-size="28" font-family="Arial" fill="%231e3a8a">Corredor 1</text><text x="90" y="355" font-size="28" font-family="Arial" fill="%23166534">Corredor 2</text><text x="90" y="535" font-size="28" font-family="Arial" fill="%23991b1b">Corredor 3</text></svg>';

INSERT INTO users (id_user, nome_user, email_user, senha_user, role)
SELECT 1, 'admin.master', 'admin.master@marketfinder.test', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id_user = 1);

INSERT INTO users (id_user, nome_user, email_user, senha_user, role)
SELECT 2, 'lojista.centro', 'loja.centro@marketfinder.test', '9da2074aeff90a5ef1e603dcdcd044c7c328a006a9cae0776ee395dbae655402', 'lojista'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id_user = 2);

INSERT INTO users (id_user, nome_user, email_user, senha_user, role)
SELECT 3, 'lojista.bairro', 'loja.bairro@marketfinder.test', '9da2074aeff90a5ef1e603dcdcd044c7c328a006a9cae0776ee395dbae655402', 'lojista'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id_user = 3);

INSERT INTO users (id_user, nome_user, email_user, senha_user, role)
SELECT 4, 'cliente.ana', 'cliente.ana@marketfinder.test', '09a31a7001e261ab1e056182a71d3cf57f582ca9a29cff5eb83be0f0549730a9', 'user'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id_user = 4);

INSERT INTO users (id_user, nome_user, email_user, senha_user, role)
SELECT 5, 'cliente.bruno', 'cliente.bruno@marketfinder.test', '09a31a7001e261ab1e056182a71d3cf57f582ca9a29cff5eb83be0f0549730a9', 'user'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id_user = 5);

INSERT INTO stores (id_store, name, layout_image_url, owner_user_id, version)
SELECT 1, 'MarketFinder Centro', @layout_seed_svg, 2, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE id_store = 1);

INSERT INTO stores (id_store, name, layout_image_url, owner_user_id, version)
SELECT 2, 'MarketFinder Bairro', @layout_seed_svg, 3, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE id_store = 2);

INSERT INTO store_user_memberships (id_membership, membership_role, version, store_id, user_id)
SELECT 1, 'OWNER', 0, 1, 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM store_user_memberships WHERE id_membership = 1);

INSERT INTO store_user_memberships (id_membership, membership_role, version, store_id, user_id)
SELECT 2, 'OWNER', 0, 2, 3
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM store_user_memberships WHERE id_membership = 2);

INSERT INTO store_user_memberships (id_membership, membership_role, version, store_id, user_id)
SELECT 3, 'MANAGER', 0, 1, 3
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM store_user_memberships WHERE id_membership = 3);

INSERT INTO corredores (id_corredor, nome, id_loja, version)
SELECT 1, 'Corredor 1 - Mercearia', 1, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM corredores WHERE id_corredor = 1);

INSERT INTO corredores (id_corredor, nome, id_loja, version)
SELECT 2, 'Corredor 2 - Bebidas e Lacteos', 1, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM corredores WHERE id_corredor = 2);

INSERT INTO corredores (id_corredor, nome, id_loja, version)
SELECT 3, 'Corredor 3 - Limpeza e Casa', 1, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM corredores WHERE id_corredor = 3);

INSERT INTO corredores (id_corredor, nome, id_loja, version)
SELECT 4, 'Corredor 1 - Basicos', 2, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM corredores WHERE id_corredor = 4);

INSERT INTO corredores (id_corredor, nome, id_loja, version)
SELECT 5, 'Corredor 2 - Snacks e Bebidas', 2, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM corredores WHERE id_corredor = 5);

INSERT INTO prateleiras (id_prateleira, nome, id_corredor, posx, posy, width, height, version)
SELECT 1, 'A1 - Graos', 1, 18, 22, 14, 10, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM prateleiras WHERE id_prateleira = 1);

INSERT INTO prateleiras (id_prateleira, nome, id_corredor, posx, posy, width, height, version)
SELECT 2, 'A2 - Massas e Conservas', 1, 38, 22, 14, 10, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM prateleiras WHERE id_prateleira = 2);

INSERT INTO prateleiras (id_prateleira, nome, id_corredor, posx, posy, width, height, version)
SELECT 3, 'B1 - Lacteos', 2, 22, 47, 14, 10, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM prateleiras WHERE id_prateleira = 3);

INSERT INTO prateleiras (id_prateleira, nome, id_corredor, posx, posy, width, height, version)
SELECT 4, 'B2 - Bebidas', 2, 44, 47, 14, 10, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM prateleiras WHERE id_prateleira = 4);

INSERT INTO prateleiras (id_prateleira, nome, id_corredor, posx, posy, width, height, version)
SELECT 5, 'C1 - Limpeza', 3, 24, 72, 14, 10, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM prateleiras WHERE id_prateleira = 5);

INSERT INTO prateleiras (id_prateleira, nome, id_corredor, posx, posy, width, height, version)
SELECT 6, 'C2 - Casa', 3, 48, 72, 14, 10, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM prateleiras WHERE id_prateleira = 6);

INSERT INTO prateleiras (id_prateleira, nome, id_corredor, posx, posy, width, height, version)
SELECT 7, 'D1 - Basicos', 4, 26, 26, 16, 10, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM prateleiras WHERE id_prateleira = 7);

INSERT INTO prateleiras (id_prateleira, nome, id_corredor, posx, posy, width, height, version)
SELECT 8, 'D2 - Pequeno Almoco', 4, 52, 26, 16, 10, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM prateleiras WHERE id_prateleira = 8);

INSERT INTO prateleiras (id_prateleira, nome, id_corredor, posx, posy, width, height, version)
SELECT 9, 'E1 - Bebidas', 5, 28, 60, 16, 10, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM prateleiras WHERE id_prateleira = 9);

INSERT INTO prateleiras (id_prateleira, nome, id_corredor, posx, posy, width, height, version)
SELECT 10, 'E2 - Snacks', 5, 56, 60, 16, 10, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM prateleiras WHERE id_prateleira = 10);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 1, 'Arroz Agulha', 'Arroz agulha 1kg.', 'Bom Grao', 'Mercearia', 'arroz agulha', 1.89, 40, 1, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 1);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 2, 'Massa Espiral', 'Massa espiral 500g.', 'La Pasta', 'Mercearia', 'massa espiral', 1.29, 35, 2, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 2);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 3, 'Feijao Preto', 'Feijao preto seco 500g.', 'Campo Rico', 'Mercearia', 'feijao preto', 1.49, 28, 1, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 3);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 4, 'Azeite Extra Virgem', 'Azeite extra virgem 750ml.', 'Oliveira Real', 'Mercearia', 'azeite extra virgem', 6.99, 18, 2, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 4);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 5, 'Cafe Moido', 'Cafe torrado e moido 250g.', 'Serra Cafe', 'Pequeno Almoco', 'cafe moido', 3.49, 22, 8, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 5);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 6, 'Leite Meio Gordo', 'Leite meio gordo 1L.', 'LactoBom', 'Lacteos', 'leite meio gordo', 0.95, 50, 3, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 6);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 7, 'Iogurte Natural', 'Pack de 4 iogurtes naturais.', 'LactoBom', 'Lacteos', 'iogurte natural', 2.19, 24, 3, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 7);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 8, 'Queijo Flamengo', 'Queijo fatiado 200g.', 'Quinta Clara', 'Lacteos', 'queijo flamengo', 2.89, 17, 3, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 8);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 9, 'Atum em Agua', 'Lata de atum em agua 120g.', 'Mar Azul', 'Conservas', 'atum em agua', 1.15, 30, 2, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 9);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 10, 'Bolachas Maria', 'Bolachas maria 200g.', 'Doce Dia', 'Snacks', 'bolachas maria', 1.05, 25, 10, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 10);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 11, 'Sumo de Laranja', 'Sumo refrigerado 1L.', 'Sol da Horta', 'Bebidas', 'sumo de laranja', 2.35, 19, 4, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 11);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 12, 'Agua Mineral', 'Pack de 6 garrafas 1.5L.', 'Fonte Serra', 'Bebidas', 'agua mineral', 2.99, 34, 4, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 12);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 13, 'Detergente Roupa', 'Detergente liquido 30 doses.', 'Casa Limpa', 'Limpeza', 'detergente roupa', 7.49, 14, 5, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 13);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 14, 'Papel Higienico', 'Pack papel higienico 12 rolos.', 'Suave Casa', 'Limpeza', 'papel higienico', 4.59, 21, 6, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 14);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 15, 'Cereal Chocolate', 'Cereal de chocolate 375g.', 'Bom Dia', 'Pequeno Almoco', 'cereal chocolate', 3.89, 16, 8, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 15);

INSERT INTO produtos (id_prod, nome, descricao, marca, categoria, normalized_nome, preco, stock, id_prateleira, version)
SELECT 16, 'Batata Frita Ondulada', 'Batata frita ondulada 180g.', 'Snack Bom', 'Snacks', 'batata frita ondulada', 1.99, 27, 10, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE id_prod = 16);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 1, 189, 40, NOW(6), 0, b'0', 1, 1, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 1);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 2, 129, 35, NOW(6), 0, b'0', 2, 2, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 2);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 3, 149, 28, NOW(6), 0, b'0', 3, 1, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 3);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 4, 699, 18, NOW(6), 0, b'0', 4, 2, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 4);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 5, 349, 22, NOW(6), 0, b'0', 5, 2, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 5);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 6, 95, 50, NOW(6), 0, b'0', 6, 3, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 6);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 7, 219, 24, NOW(6), 0, b'0', 7, 3, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 7);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 8, 289, 17, NOW(6), 0, b'0', 8, 3, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 8);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 9, 115, 30, NOW(6), 0, b'0', 9, 2, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 9);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 10, 235, 19, NOW(6), 0, b'0', 11, 4, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 10);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 11, 299, 34, NOW(6), 0, b'0', 12, 4, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 11);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 12, 749, 14, NOW(6), 0, b'0', 13, 5, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 12);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 13, 459, 21, NOW(6), 0, b'0', 14, 6, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 13);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 14, 389, 16, NOW(6), 0, b'0', 15, 4, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 14);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 15, 209, 27, NOW(6), 0, b'0', 16, 6, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 15);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 16, 199, 18, NOW(6), 0, b'0', 1, 7, 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 16);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 17, 139, 22, NOW(6), 0, b'0', 2, 7, 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 17);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 18, 379, 15, NOW(6), 0, b'0', 5, 8, 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 18);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 19, 109, 31, NOW(6), 0, b'0', 6, 8, 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 19);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 20, 249, 13, NOW(6), 0, b'0', 11, 9, 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 20);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 21, 319, 20, NOW(6), 0, b'0', 12, 9, 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 21);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 22, 409, 11, NOW(6), 0, b'0', 15, 10, 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 22);

INSERT INTO inventory (id_inventory, price_cents, stock_qty, updated_at, version, is_deleted, product_id, shelf_id, store_id)
SELECT 23, 189, 23, NOW(6), 0, b'0', 16, 10, 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE id_inventory = 23);
