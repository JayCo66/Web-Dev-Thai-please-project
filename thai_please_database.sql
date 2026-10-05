-- THAI Please
-- Database Schema for Web Application Development Project
-- MySQL 8.0+

DROP DATABASE IF EXISTS thai_please;
CREATE DATABASE thai_please
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE thai_please;

-- =========================================================
-- 1. USERS
-- =========================================================
CREATE TABLE users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    token_value INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================================
-- 2. SHOPS
-- =========================================================
CREATE TABLE shops (
    shop_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shop_name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================================
-- 3. TRANSACTIONS
-- =========================================================
CREATE TABLE transactions (
    transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    shop_id BIGINT UNSIGNED NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    user_amount DECIMAL(10, 2) NOT NULL,
    government_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('SUCCESS', 'CANCEL') NOT NULL DEFAULT 'SUCCESS',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_transactions_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_transactions_shop
        FOREIGN KEY (shop_id)
        REFERENCES shops(shop_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_transaction_amounts
        CHECK (
            total_amount >= 0
            AND user_amount >= 0
            AND government_amount >= 0
            AND ABS((user_amount + government_amount) - total_amount) < 0.01
        )
);

CREATE INDEX idx_transactions_user_date
    ON transactions(user_id, created_at);

CREATE INDEX idx_transactions_shop_date
    ON transactions(shop_id, created_at);

-- =========================================================
-- 4. BINGO_BOARDS
-- One board per user per month
-- =========================================================
CREATE TABLE bingo_boards (
    board_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    board_year SMALLINT UNSIGNED NOT NULL,
    board_month TINYINT UNSIGNED NOT NULL,
    status ENUM('ACTIVE', 'BINGO', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    generated_by_ai BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,

    CONSTRAINT uq_bingo_board_user_month
        UNIQUE (user_id, board_year, board_month),

    CONSTRAINT chk_bingo_month
        CHECK (board_month BETWEEN 1 AND 12),

    CONSTRAINT fk_bingo_boards_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_bingo_boards_user_status
    ON bingo_boards(user_id, status);

-- =========================================================
-- 5. BINGO_QUESTS
-- Master pool of available quests
-- =========================================================
CREATE TABLE bingo_quests (
    quest_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category ENUM(
        'SUPPORT_LOCAL',
        'EXPLORE',
        'ENGAGEMENT',
        'COMMUNITY'
    ) NOT NULL,
    difficulty ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'EASY',
    verification_type ENUM(
        'TRANSACTION',
        'REVIEW',
        'MULTI_TRANSACTION',
        'SYSTEM'
    ) NOT NULL DEFAULT 'TRANSACTION',
    target_value INT UNSIGNED NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================================
-- 6. USER_QUESTS
-- Quests selected for a specific user's monthly board
-- Position is 1-9 for a 3x3 Bingo board
-- =========================================================
CREATE TABLE user_quests (
    user_quest_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    board_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    quest_id BIGINT UNSIGNED NOT NULL,
    position TINYINT UNSIGNED NOT NULL,
    status ENUM('LOCKED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'LOCKED',
    progress INT UNSIGNED NOT NULL DEFAULT 0,
    completed_at DATETIME NULL,

    CONSTRAINT uq_user_quest_position
        UNIQUE (board_id, position),

    CONSTRAINT uq_user_quest_quest
        UNIQUE (board_id, quest_id),

    CONSTRAINT chk_user_quest_position
        CHECK (position BETWEEN 1 AND 9),

    CONSTRAINT fk_user_quests_board
        FOREIGN KEY (board_id)
        REFERENCES bingo_boards(board_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_user_quests_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_user_quests_quest
        FOREIGN KEY (quest_id)
        REFERENCES bingo_quests(quest_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_user_quests_user
    ON user_quests(user_id);

CREATE INDEX idx_user_quests_board_status
    ON user_quests(board_id, status);

-- =========================================================
-- 7. CHARITIES
-- Social funds / social impact categories
-- =========================================================
CREATE TABLE charities (
    charity_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    impact_type ENUM(
        'EDUCATION',
        'ENVIRONMENT',
        'COMMUNITY',
        'SOCIAL'
    ) NOT NULL,
    token_value DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================================
-- 8. TOKEN_TRANSACTIONS
-- Token ledger:
-- EARN  = user completes Bingo
-- SPEND = user allocates a token to a charity
-- =========================================================
CREATE TABLE token_transactions (
    token_transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type ENUM('EARN', 'SPEND') NOT NULL,
    amount INT UNSIGNED NOT NULL,
    board_id BIGINT UNSIGNED NULL,
    charity_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_token_transactions_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_token_transactions_board
        FOREIGN KEY (board_id)
        REFERENCES bingo_boards(board_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_token_transactions_charity
        FOREIGN KEY (charity_id)
        REFERENCES charities(charity_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX idx_token_transactions_user_date
    ON token_transactions(user_id, created_at);

CREATE INDEX idx_token_transactions_charity
    ON token_transactions(charity_id);

-- =========================================================
-- SAMPLE DATA
-- =========================================================

-- Users
INSERT INTO users (name, email, password_hash) VALUES
('Thanawit Kocharin', 'thanawit@example.com', 'DEMO_HASH'),
('Demo User', 'demo@example.com', 'DEMO_HASH');

-- Shops
INSERT INTO shops
    (shop_name, category)
VALUES
('ร้านป้าสมใจ', 'FOOD'),
('ร้านชุมชน ABC', 'GROCERY'),
('ร้านกาแฟ XYZ', 'BEVERAGE');

-- Quest Pool
INSERT INTO bingo_quests
    (title, description, category, difficulty, verification_type, target_value)
VALUES
('ซื้อจากร้านใหม่ 1 ร้าน',
 'ซื้อสินค้าหรือบริการจากร้านค้าที่ผู้ใช้ไม่เคยใช้มาก่อน 1 ร้าน',
 'EXPLORE', 'EASY', 'TRANSACTION', 1),

('ใช้สิทธิ 2 วัน',
 'ทำธุรกรรมในโครงการ 2 วันที่แตกต่างกัน',
 'ENGAGEMENT', 'EASY', 'MULTI_TRANSACTION', 2),

('รีวิวร้านค้า 1 ร้าน',
 'เขียนรีวิวให้ร้านค้าที่เคยใช้บริการ 1 ร้าน',
 'COMMUNITY', 'EASY', 'REVIEW', 1),

('ซื้อจากร้านค้ารายย่อย 2 ร้าน',
 'ทำธุรกรรมกับร้านค้ารายย่อยที่แตกต่างกัน 2 ร้าน',
 'SUPPORT_LOCAL', 'MEDIUM', 'MULTI_TRANSACTION', 2),

('ใช้สิทธิ 3 หมวดสินค้า',
 'ทำธุรกรรมใน 3 หมวดสินค้าที่แตกต่างกัน',
 'EXPLORE', 'MEDIUM', 'MULTI_TRANSACTION', 3),

('ทดลองร้านชุมชน 2 ร้าน',
 'ทำธุรกรรมกับร้านค้าในชุมชน 2 ร้านที่แตกต่างกัน',
 'SUPPORT_LOCAL', 'MEDIUM', 'MULTI_TRANSACTION', 2),

('ซื้อจากร้านใหม่ 2 ร้าน',
 'ซื้อสินค้าหรือบริการจากร้านค้าที่ไม่เคยใช้มาก่อน 2 ร้าน',
 'EXPLORE', 'MEDIUM', 'MULTI_TRANSACTION', 2),

('ใช้สิทธิ 3 วันในสัปดาห์เดียวกัน',
 'ทำธุรกรรมอย่างน้อย 3 วันภายในสัปดาห์เดียวกัน',
 'ENGAGEMENT', 'MEDIUM', 'MULTI_TRANSACTION', 3),

('สนับสนุนร้านค้ารายย่อย 5 ร้าน',
 'ทำธุรกรรมกับร้านค้ารายย่อยที่แตกต่างกัน 5 ร้าน',
 'SUPPORT_LOCAL', 'HARD', 'MULTI_TRANSACTION', 5);

-- Charities
INSERT INTO charities
    (name, description, impact_type, token_value)
VALUES
('กองทุนเพื่อการศึกษา',
 'สนับสนุนโอกาสทางการศึกษา',
 'EDUCATION', 100.00),

('กองทุนสิ่งแวดล้อม',
 'สนับสนุนกิจกรรมด้านสิ่งแวดล้อม',
 'ENVIRONMENT', 100.00),

('กองทุนพัฒนาชุมชน',
 'สนับสนุนการพัฒนาชุมชน',
 'COMMUNITY', 100.00),

('กองทุนช่วยเหลือสังคม',
 'สนับสนุนผู้ที่ต้องการความช่วยเหลือ',
 'SOCIAL', 100.00);

-- =========================================================
-- END OF SCHEMA
-- =========================================================