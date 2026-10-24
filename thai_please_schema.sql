-- ============================================================
-- โครงการแพลตฟอร์มดิจิทัลเพื่อการกระตุ้นเศรษฐกิจ "ไทยช่วยไทยพลีส" (THAI Please)
-- อ้างอิงกรอบนโยบายโครงการไทยช่วยไทยพลัส
-- โครงสร้างฐานข้อมูลเฉพาะฟีเจอร์หลัก: AI, Gamification (Bingo Board), Social Impact
-- ตามรายงานการวิเคราะห์และออกแบบระบบ (ER Diagram หน้า 7)
-- ============================================================

CREATE DATABASE IF NOT EXISTS thai_please
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE thai_please;

-- ------------------------------------------------------------
-- 1. ตารางผู้ใช้งาน (Users)
-- ------------------------------------------------------------
CREATE TABLE users (
    user_id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name               VARCHAR(200) NOT NULL,
    thai_id_hash       CHAR(64) NULL COMMENT 'SHA-256 hash ของเลขบัตรประชาชน (PDPA Compliance)',
    thai_id_encrypted  VARCHAR(255) NULL COMMENT 'เลขบัตร ปชช. เข้ารหัส/Masked',
    email              VARCHAR(254) NULL,
    phone_number       VARCHAR(30) NULL,
    password_hash      VARCHAR(255) NULL,
    pin_hash           VARCHAR(255) NULL COMMENT 'PIN 6 หลักสำหรับธุรกรรม',
    role               ENUM('CITIZEN', 'MERCHANT', 'ADMIN', 'GOV_EXECUTIVE') NOT NULL DEFAULT 'CITIZEN',
    province_code      VARCHAR(10) NULL DEFAULT 'BKK',
    created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_thai_id_hash (thai_id_hash),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_phone (phone_number)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. ตารางร้านค้า (Shops)
-- ------------------------------------------------------------
CREATE TABLE shops (
    shop_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    shop_name      VARCHAR(200) NOT NULL,
    category       VARCHAR(100) NOT NULL COMMENT 'หมวดหมู่อาหาร, สินค้าทั่วไป, OTOP, บริการ',
    address        TEXT NULL,
    owner_user_id  BIGINT UNSIGNED NULL,
    is_active      TINYINT(1) NOT NULL DEFAULT 1,
    created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (shop_id),
    KEY idx_shops_owner (owner_user_id),
    CONSTRAINT fk_shops_owner FOREIGN KEY (owner_user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. ตารางธุรกรรมการใช้จ่าย (Transactions - Co-Pay 60/40)
-- ------------------------------------------------------------
CREATE TABLE transactions (
    transaction_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id            BIGINT UNSIGNED NOT NULL,
    shop_id            BIGINT UNSIGNED NOT NULL,
    total_amount       DECIMAL(12,2) NOT NULL,
    user_amount        DECIMAL(12,2) NOT NULL COMMENT 'ยอดที่ประชาชนร่วมจ่าย 40%',
    government_amount  DECIMAL(12,2) NOT NULL COMMENT 'ยอดที่รัฐสมทบ 60%',
    status             ENUM('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'COMPLETED',
    paid_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (transaction_id),
    KEY idx_trans_user (user_id),
    KEY idx_trans_shop (shop_id),
    CONSTRAINT fk_trans_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_trans_shop FOREIGN KEY (shop_id) REFERENCES shops (shop_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. ตารางคลังภารกิจบิงโกสำหรับ AI (Bingo Quests - Mission Pool)
-- ------------------------------------------------------------
CREATE TABLE bingo_quests (
    quest_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title             VARCHAR(200) NOT NULL,
    description       TEXT NULL,
    category          VARCHAR(100) NOT NULL COMMENT 'SPENDING, FREQUENCY, DONATION, EXPLORATION',
    shop_category     VARCHAR(100) NULL COMMENT 'FOOD, RETAIL, OTOP, SERVICE, ALL',
    verification_type ENUM('AUTO_TRANSACTION', 'DONATION', 'MANUAL') NOT NULL DEFAULT 'AUTO_TRANSACTION',
    target_min        INT NOT NULL DEFAULT 1,
    target_max        INT NOT NULL DEFAULT 1,
    token_weight      INT NOT NULL DEFAULT 10,
    quest_code        VARCHAR(60) NULL COMMENT 'รหัสภารกิจที่คงที่ ใช้อ้างอิงในโค้ด (เฉพาะภารกิจที่มีระดับความยาก)',
    metric            VARCHAR(60) NULL COMMENT 'วิธีนับความคืบหน้าจากธุรกรรม เช่น tx_count, distinct_merchants, spend_total',
    filter_json       JSON NULL COMMENT 'เงื่อนไขกรองธุรกรรม เช่น {"category":"FOOD","daypart":"morning"}',
    unit              VARCHAR(20) NULL COMMENT 'หน่วยของ n เช่น ครั้ง, ร้าน, บาท',
    levels_json       JSON NULL COMMENT 'ค่าเป้าหมาย n ของระดับความยาก 1-10 เรียงจากง่ายไปยาก',
    is_active         TINYINT(1) NOT NULL DEFAULT 1,
    created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (quest_id),
    UNIQUE KEY uq_bingo_quests_code (quest_code),
    CONSTRAINT chk_bingo_quests_levels CHECK (levels_json IS NULL OR JSON_LENGTH(levels_json) = 10)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. ตารางกระดานบิงโกของผู้ใช้ (Bingo Boards - Gamification)
-- ------------------------------------------------------------
CREATE TABLE bingo_boards (
    board_id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id          BIGINT UNSIGNED NOT NULL,
    board_size       TINYINT NOT NULL DEFAULT 5 COMMENT 'ขนาด 5x5 (25 ช่อง)',
    status           ENUM('ACTIVE', 'COMPLETED', 'ACCEPTED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    generated_by_ai  TINYINT(1) NOT NULL DEFAULT 1,
    line_select_mode ENUM('AUTO_MAX_TOKEN', 'MANUAL') NOT NULL DEFAULT 'AUTO_MAX_TOKEN',
    selected_line    VARCHAR(50) NULL COMMENT 'แถวหรือเส้นบิงโกที่ผู้ใช้เลือก เช่น ROW_1, DIAG_1',
    started_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    completed_at     DATETIME(3) NULL,
    accepted_at      DATETIME(3) NULL,
    PRIMARY KEY (board_id),
    KEY idx_boards_user (user_id),
    CONSTRAINT fk_boards_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. ตาราง 25 ช่องภารกิจบนกระดานบิงโก (User Quests)
-- ------------------------------------------------------------
CREATE TABLE user_quests (
    user_quest_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    board_id      BIGINT UNSIGNED NOT NULL,
    quest_id      BIGINT UNSIGNED NOT NULL,
    position      TINYINT UNSIGNED NOT NULL COMMENT 'ตำแหน่ง 0-24 บนตาราง 5x5',
    status        ENUM('IN_PROGRESS', 'COMPLETED', 'CLAIMED') NOT NULL DEFAULT 'IN_PROGRESS',
    progress      INT NOT NULL DEFAULT 0,
    target_value  INT NOT NULL DEFAULT 1,
    token_reward  INT NOT NULL DEFAULT 10,
    completed_at  DATETIME(3) NULL,
    PRIMARY KEY (user_quest_id),
    UNIQUE KEY uq_board_position (board_id, position),
    KEY idx_user_quests_board (board_id),
    KEY idx_user_quests_quest (quest_id),
    CONSTRAINT fk_user_quests_board FOREIGN KEY (board_id) REFERENCES bingo_boards (board_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_quests_quest FOREIGN KEY (quest_id) REFERENCES bingo_quests (quest_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. ตารางมูลนิธิ / กองทุนเพื่อสังคม (Charities - Social Impact)
-- ------------------------------------------------------------
CREATE TABLE charities (
    charity_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name         VARCHAR(200) NOT NULL,
    tax_id       VARCHAR(30) NOT NULL,
    description  TEXT NULL,
    impact_type  ENUM('EDUCATION', 'ENVIRONMENT', 'COMMUNITY', 'HEALTHCARE') NOT NULL,
    is_active    TINYINT(1) NOT NULL DEFAULT 1,
    created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (charity_id),
    UNIQUE KEY uq_charities_tax_id (tax_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. ตารางการบริจาคเพื่อสังคม (Donations - Social Impact)
-- ------------------------------------------------------------
CREATE TABLE donations (
    donation_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_quest_id BIGINT UNSIGNED NULL COMMENT 'ผูกกับภารกิจบิงโกช่องบริจาค',
    charity_id    BIGINT UNSIGNED NOT NULL,
    user_id       BIGINT UNSIGNED NOT NULL,
    amount        DECIMAL(12,2) NOT NULL,
    edonation_ref VARCHAR(100) NULL COMMENT 'เลขอ้างอิง e-Donation ลดหย่อนภาษี',
    donated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (donation_id),
    KEY idx_donations_user (user_id),
    KEY idx_donations_charity (charity_id),
    KEY idx_donations_user_quest (user_quest_id),
    CONSTRAINT fk_donations_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_donations_charity FOREIGN KEY (charity_id) REFERENCES charities (charity_id) ON DELETE RESTRICT,
    CONSTRAINT fk_donations_quest FOREIGN KEY (user_quest_id) REFERENCES user_quests (user_quest_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. ตารางสมุดบัญชี Impact Token (Token Transactions)
-- ------------------------------------------------------------
CREATE TABLE token_transactions (
    token_transaction_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id              BIGINT UNSIGNED NOT NULL,
    amount               INT NOT NULL COMMENT 'จำนวน Token (+ได้รับ, -ใช้ไป)',
    type                 ENUM('EARN_CELL', 'EARN_LINE', 'REDEEM_REWARD', 'EXPIRED') NOT NULL,
    board_id             BIGINT UNSIGNED NULL,
    user_quest_id        BIGINT UNSIGNED NULL,
    created_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (token_transaction_id),
    KEY idx_tokens_user (user_id),
    KEY idx_tokens_board (board_id),
    KEY idx_tokens_quest (user_quest_id),
    CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_tokens_board FOREIGN KEY (board_id) REFERENCES bingo_boards (board_id) ON DELETE SET NULL,
    CONSTRAINT fk_tokens_quest FOREIGN KEY (user_quest_id) REFERENCES user_quests (user_quest_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 10. ตารางของรางวัลสำหรับแลก Token (Rewards)
-- ------------------------------------------------------------
CREATE TABLE rewards (
    reward_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name         VARCHAR(200) NOT NULL,
    description  TEXT NULL,
    image_url    VARCHAR(500) NULL,
    reward_type  ENUM('COUPON', 'DISCOUNT', 'PHYSICAL', 'LUCKY_DRAW') NOT NULL DEFAULT 'COUPON',
    token_cost   INT NOT NULL DEFAULT 50 COMMENT 'จำนวน Impact Token ที่ใช้แลก',
    is_active    TINYINT(1) NOT NULL DEFAULT 1,
    created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (reward_id)
) ENGINE=InnoDB;

-- ============================================================
-- ข้อมูลเริ่มต้นสำหรับทดสอบระบบ (Initial Seed Data)
-- ============================================================

-- 1. ข้อมูลผู้ใช้งานเริ่มต้น (รหัสผ่านทุกบัญชี: password123, PIN: 123456)
INSERT INTO users (user_id, name, thai_id_hash, thai_id_encrypted, email, phone_number, password_hash, pin_hash, role, province_code)
VALUES
(1, 'นายสมชาย ใจดี', 'c5721ee21d8c7c75b2cecc4de31f275ef071ec4264f9e4b80446a386f2091798', '1-1005-xxxxx-45-1', 'somchai.citizen@thaiplease.go.th', '0812345678', '$2b$10$mTiBG9XxSerFIxQ34Rb0lOIgE1FN71byK0bqk6Ft/B6z9OCbCeKPK', '$2b$10$mTiBG9XxSerFIxQ34Rb0lOIgE1FN71byK0bqk6Ft/B6z9OCbCeKPK', 'CITIZEN', 'BKK'),
(2, 'นางสมพร สดใส (ป้าพร)', NULL, NULL, 'paporntasty@gmail.com', '0898765432', '$2b$10$mTiBG9XxSerFIxQ34Rb0lOIgE1FN71byK0bqk6Ft/B6z9OCbCeKPK', NULL, 'MERCHANT', 'NPT'),
(3, 'นายสมศักดิ์ ผู้ดูแลระบบ', NULL, NULL, 'admin@thaiplease.go.th', '0855550001', '$2b$10$mTiBG9XxSerFIxQ34Rb0lOIgE1FN71byK0bqk6Ft/B6z9OCbCeKPK', NULL, 'ADMIN', 'BKK');

-- 2. ข้อมูลร้านค้าเริ่มต้น
INSERT INTO shops (shop_id, shop_name, category, address, owner_user_id)
VALUES
(1, 'ร้านป้าพร อาหารตามสั่ง (กำแพงแสน)', 'อาหารและเครื่องดื่ม', '99/1 หมู่ 6 ถนนมาลัยแมน ต.กำแพงแสน จ.นครปฐม', 2),
(2, 'ร้านกาแฟริมคลอง', 'อาหารและเครื่องดื่ม', '12/4 ต.กำแพงแสน จ.นครปฐม', NULL),
(3, 'ร้านวิสาหกิจชุมชนกำแพงแสน (OTOP)', 'สินค้า OTOP และวิสาหกิจชุมชน', '88 ต.กำแพงแสน จ.นครปฐม', NULL);

-- 3. ข้อมูลมูลนิธิ / กองทุนเพื่อสังคม (Social Impact)
INSERT INTO charities (charity_id, name, tax_id, description, impact_type)
VALUES
(1, 'มูลนิธิเพื่อการศึกษาเด็กยากไร้', '0994000112233', 'สนับสนุนทุนการศึกษา อุปกรณ์การเรียน และอาหารกลางวันสำหรับโรงเรียนในชนบท', 'EDUCATION'),
(2, 'มูลนิธิฟื้นฟูป่าไม้และสิ่งแวดล้อมไทย', '0994000223344', 'โครงการปลูกป่าชุมชน ลดมลพิษทางอากาศ และฟื้นฟูระบบนิเวศลำน้ำ', 'ENVIRONMENT'),
(3, 'กองทุนพัฒนาคุณภาพชีวิตชุมชนและผู้สูงอายุ', '0994000334455', 'ส่งเสริมอาชีพผู้สูงอายุและดูแลผู้ป่วยติดเตียงในพื้นที่ห่างไกล', 'COMMUNITY'),
(4, 'มูลนิธิสาธารณสุขเพื่อประชาชน', '0994000445566', 'สนับสนุนเครื่องมือแพทย์และเวชภัณฑ์แก่โรงพยาบาลส่งเสริมสุขภาพตำบล', 'HEALTHCARE');

-- 4. คลังภารกิจบิงโกสำหรับ AI (Bingo Quests - Mission Pool)
INSERT INTO bingo_quests (quest_id, title, description, category, shop_category, verification_type, target_min, target_max, token_weight)
VALUES
-- ภารกิจบริจาค (ต้องสอดแทรกอย่างน้อย 1 ช่องเสมอ)
(1, 'บริจาคให้มูลนิธิเพื่อการศึกษา', 'ร่วมสนับสนุนการศึกษาเด็กยากไร้ผ่านระบบ e-Donation', 'DONATION', NULL, 'DONATION', 1, 1, 50),
(2, 'บริจาคเพื่อสิ่งแวดล้อมไทย', 'ร่วมบริจาคสนับสนุนโครงการปลูกป่าชุมชน', 'DONATION', NULL, 'DONATION', 1, 1, 50),
(3, 'บริจาคช่วยกองทุนผู้สูงอายุ', 'ร่วมบริจาคช่วยเหลือผู้สูงอายุและผู้ป่วยติดเตียงในชุมชน', 'DONATION', NULL, 'DONATION', 1, 1, 50);

-- ภารกิจใช้จ่ายตามหมวดหมู่ (31 แบบ, quest_id 4-34) แต่ละแบบมีเป้าหมาย 10 ระดับใน levels_json
--   * title ใช้ {n} แทนค่าเป้าหมายของระดับที่ AI เลือก (ค่าจริงเก็บที่ user_quests.target_value)
--   * target_min / target_max = ค่าเป้าหมายระดับ 1 / ระดับ 10
--   * token_weight = token ต่อ 1 ระดับความยาก (user_quests.token_reward = ระดับ x token_weight)
--     ผลรวมระดับของบอร์ดคงที่ ทุกคนจึงได้ token เท่ากัน
--   * นับจากธุรกรรมที่ชำระสำเร็จ (ร้านค้า, หมวด, ยอดเงิน, เวลา) ไม่ใช้ GPS และไม่รู้ว่าซื้ออะไร
--   * shop_category: FOOD = อาหารและเครื่องดื่ม, RETAIL = สินค้าทั่วไป, ALL = ทุกหมวด
--   * ตัวเลขใน levels_json เป็นค่าร่างเริ่มต้น ต้องจูนด้วยข้อมูลจริง
INSERT INTO bingo_quests (quest_id, title, description, category, shop_category, verification_type, target_min, target_max, token_weight, quest_code, metric, filter_json, unit, levels_json)
VALUES
-- ปริมาณและความสม่ำเสมอ (2 แบบ)
(4, 'ใช้จ่ายครบ {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'ALL', 'AUTO_TRANSACTION', 4, 34, 10, 'TX_COUNT_ANY', 'tx_count', '{}', 'ครั้ง', '[4,6,8,10,13,16,20,24,28,34]'),
(5, 'ใช้จ่ายติดต่อกัน {n} วัน', 'นับจำนวนวันติดต่อกันที่มีการชำระเงินสำเร็จ ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'ALL', 'AUTO_TRANSACTION', 2, 14, 10, 'STREAK_DAYS_ANY', 'max_streak_days', '{}', 'วัน', '[2,3,4,5,6,7,8,10,12,14]'),

-- ร้านประจำ (4 แบบ)
(6, 'ใช้จ่ายร้านเดิมซ้ำ {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินที่ร้านเดียวกัน (นับจากร้านที่ใช้จ่ายมากที่สุด) ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'ALL', 'AUTO_TRANSACTION', 2, 15, 10, 'REPEAT_MERCHANT_ANY', 'max_visits_single_merchant', '{}', 'ครั้ง', '[2,3,4,5,6,7,8,10,12,15]'),
(7, 'ใช้จ่ายร้านเดิมซ้ำในหมวดอาหารและเครื่องดื่ม {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินที่ร้านเดียวกัน (นับจากร้านที่ใช้จ่ายมากที่สุด) เฉพาะหมวดอาหารและเครื่องดื่ม ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'FOOD', 'AUTO_TRANSACTION', 2, 12, 10, 'REPEAT_MERCHANT_FD', 'max_visits_single_merchant', '{"category":"FOOD"}', 'ครั้ง', '[2,3,4,5,6,7,8,9,10,12]'),
(8, 'ใช้จ่ายร้านเดิมซ้ำในหมวดสินค้าทั่วไป {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินที่ร้านเดียวกัน (นับจากร้านที่ใช้จ่ายมากที่สุด) เฉพาะหมวดสินค้าทั่วไป ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'RETAIL', 'AUTO_TRANSACTION', 2, 11, 10, 'REPEAT_MERCHANT_GD', 'max_visits_single_merchant', '{"category":"RETAIL"}', 'ครั้ง', '[2,3,4,5,6,7,8,9,10,11]'),
(9, 'ใช้จ่ายร้านเดิมวันเสาร์-อาทิตย์ซ้ำ {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินที่ร้านเดียวกัน (นับจากร้านที่ใช้จ่ายมากที่สุด) เฉพาะวันเสาร์-อาทิตย์ ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'ALL', 'AUTO_TRANSACTION', 2, 11, 10, 'REPEAT_MERCHANT_WEEKEND', 'max_visits_single_merchant', '{"daytype":"weekend"}', 'ครั้ง', '[2,3,4,5,6,7,8,9,10,11]'),

-- สำรวจและความหลากหลาย (4 แบบ)
(10, 'ใช้จ่ายต่างร้าน {n} ร้าน', 'นับจำนวนร้านที่ไม่ซ้ำกันที่ชำระเงินสำเร็จ ในช่วง 30 วันของบอร์ด', 'EXPLORATION', 'ALL', 'AUTO_TRANSACTION', 2, 17, 10, 'DISTINCT_MERCHANTS_ANY', 'distinct_merchants', '{}', 'ร้าน', '[2,3,4,5,6,8,10,12,14,17]'),
(11, 'ใช้จ่ายหมวดอาหารและเครื่องดื่มต่างร้าน {n} ร้าน', 'นับจำนวนร้านที่ไม่ซ้ำกันที่ชำระเงินสำเร็จ เฉพาะหมวดอาหารและเครื่องดื่ม ในช่วง 30 วันของบอร์ด', 'EXPLORATION', 'FOOD', 'AUTO_TRANSACTION', 2, 12, 10, 'DISTINCT_MERCHANTS_FD', 'distinct_merchants', '{"category":"FOOD"}', 'ร้าน', '[2,3,4,5,6,7,8,9,10,12]'),
(12, 'ใช้จ่ายหมวดสินค้าทั่วไปต่างร้าน {n} ร้าน', 'นับจำนวนร้านที่ไม่ซ้ำกันที่ชำระเงินสำเร็จ เฉพาะหมวดสินค้าทั่วไป ในช่วง 30 วันของบอร์ด', 'EXPLORATION', 'RETAIL', 'AUTO_TRANSACTION', 1, 10, 10, 'DISTINCT_MERCHANTS_GD', 'distinct_merchants', '{"category":"RETAIL"}', 'ร้าน', '[1,2,3,4,5,6,7,8,9,10]'),
(13, 'ลองใช้จ่ายร้านที่ไม่เคยไปมาก่อน {n} ร้าน', 'นับจำนวนร้านที่ไม่เคยชำระเงินมาก่อนช่วงบอร์ดนี้ ในช่วง 30 วันของบอร์ด', 'EXPLORATION', 'ALL', 'AUTO_TRANSACTION', 1, 15, 10, 'NEW_MERCHANTS_ANY', 'new_merchants', '{}', 'ร้าน', '[1,2,3,4,5,6,8,10,12,15]'),

-- หมวดหมู่ (4 แบบ)
(14, 'ใช้จ่ายหมวดอาหารและเครื่องดื่ม {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ เฉพาะหมวดอาหารและเครื่องดื่ม ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'FOOD', 'AUTO_TRANSACTION', 3, 28, 10, 'CATEGORY_COUNT_FD', 'tx_count', '{"category":"FOOD"}', 'ครั้ง', '[3,5,7,9,11,13,16,19,23,28]'),
(15, 'ใช้จ่ายหมวดสินค้าทั่วไป {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ เฉพาะหมวดสินค้าทั่วไป ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'RETAIL', 'AUTO_TRANSACTION', 1, 12, 10, 'CATEGORY_COUNT_GD', 'tx_count', '{"category":"RETAIL"}', 'ครั้ง', '[1,2,3,4,5,6,7,8,10,12]'),
(16, 'ใช้จ่ายหมวดอาหารและเครื่องดื่มใน {n} วันที่ต่างกัน', 'นับจำนวนวันที่มีการชำระเงินสำเร็จ เฉพาะหมวดอาหารและเครื่องดื่ม ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'FOOD', 'AUTO_TRANSACTION', 2, 23, 10, 'CATEGORY_DAYS_FD', 'active_days', '{"category":"FOOD"}', 'วัน', '[2,4,6,8,10,12,14,17,20,23]'),
(17, 'ใช้จ่ายหมวดสินค้าทั่วไปใน {n} วันที่ต่างกัน', 'นับจำนวนวันที่มีการชำระเงินสำเร็จ เฉพาะหมวดสินค้าทั่วไป ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'RETAIL', 'AUTO_TRANSACTION', 1, 12, 10, 'CATEGORY_DAYS_GD', 'active_days', '{"category":"RETAIL"}', 'วัน', '[1,2,3,4,5,6,7,8,10,12]'),

-- ช่วงเวลาและวัน (6 แบบ)
(18, 'ใช้จ่ายช่วงเช้า {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ เฉพาะช่วงเช้า (05:00-10:59 น.) ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'ALL', 'AUTO_TRANSACTION', 2, 18, 10, 'DAYPART_MORNING', 'tx_count', '{"daypart":"morning"}', 'ครั้ง', '[2,3,4,5,6,8,10,12,15,18]'),
(19, 'ใช้จ่ายช่วงกลางวัน {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ เฉพาะช่วงกลางวัน (11:00-13:59 น.) ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'ALL', 'AUTO_TRANSACTION', 2, 18, 10, 'DAYPART_LUNCH', 'tx_count', '{"daypart":"lunch"}', 'ครั้ง', '[2,3,4,5,6,8,10,12,15,18]'),
(20, 'ใช้จ่ายช่วงบ่าย {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ เฉพาะช่วงบ่าย (14:00-18:59 น.) ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'ALL', 'AUTO_TRANSACTION', 2, 18, 10, 'DAYPART_AFTERNOON', 'tx_count', '{"daypart":"afternoon"}', 'ครั้ง', '[2,3,4,5,6,8,10,12,15,18]'),
(21, 'ใช้จ่ายวันเสาร์-อาทิตย์ {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ เฉพาะวันเสาร์-อาทิตย์ ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'ALL', 'AUTO_TRANSACTION', 2, 17, 10, 'WEEKEND_COUNT', 'tx_count', '{"daytype":"weekend"}', 'ครั้ง', '[2,3,4,5,6,8,10,12,14,17]'),
(22, 'ใช้จ่ายวันธรรมดา {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ เฉพาะวันธรรมดา ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'ALL', 'AUTO_TRANSACTION', 3, 28, 10, 'WEEKDAY_COUNT', 'tx_count', '{"daytype":"weekday"}', 'ครั้ง', '[3,5,7,9,11,14,17,20,24,28]'),
(23, 'ใช้จ่ายวันศุกร์ {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ เฉพาะวันศุกร์ ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'ALL', 'AUTO_TRANSACTION', 1, 10, 10, 'FRIDAY_COUNT', 'tx_count', '{"dow":"fri"}', 'ครั้ง', '[1,2,3,4,5,6,7,8,9,10]'),

-- หมวดหมู่ตามช่วงเวลา (4 แบบ)
(24, 'ใช้จ่ายหมวดอาหารและเครื่องดื่มตอนเช้า {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ เฉพาะหมวดอาหารและเครื่องดื่ม / ช่วงเช้า (05:00-10:59 น.) ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'FOOD', 'AUTO_TRANSACTION', 1, 15, 10, 'FD_MORNING', 'tx_count', '{"category":"FOOD","daypart":"morning"}', 'ครั้ง', '[1,2,3,4,5,6,8,10,12,15]'),
(25, 'ใช้จ่ายหมวดอาหารและเครื่องดื่มมื้อกลางวัน {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ เฉพาะหมวดอาหารและเครื่องดื่ม / ช่วงกลางวัน (11:00-13:59 น.) ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'FOOD', 'AUTO_TRANSACTION', 1, 15, 10, 'FD_LUNCH', 'tx_count', '{"category":"FOOD","daypart":"lunch"}', 'ครั้ง', '[1,2,3,4,5,6,8,10,12,15]'),
(26, 'ใช้จ่ายหมวดอาหารและเครื่องดื่มช่วงบ่าย {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ เฉพาะหมวดอาหารและเครื่องดื่ม / ช่วงบ่าย (14:00-18:59 น.) ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'FOOD', 'AUTO_TRANSACTION', 1, 12, 10, 'FD_AFTERNOON', 'tx_count', '{"category":"FOOD","daypart":"afternoon"}', 'ครั้ง', '[1,2,3,4,5,6,7,8,10,12]'),
(27, 'ใช้จ่ายหมวดสินค้าทั่วไปวันธรรมดา {n} ครั้ง', 'นับจำนวนครั้งที่ชำระเงินสำเร็จ เฉพาะหมวดสินค้าทั่วไป / วันธรรมดา ในช่วง 30 วันของบอร์ด', 'FREQUENCY', 'RETAIL', 'AUTO_TRANSACTION', 1, 10, 10, 'GD_WEEKDAY', 'tx_count', '{"category":"RETAIL","daytype":"weekday"}', 'ครั้ง', '[1,2,3,4,5,6,7,8,9,10]'),

-- ยอดเงิน (7 แบบ)
(28, 'ใช้จ่ายรวมครบ {n} บาท', 'รวมยอดชำระทั้งหมด (บาท) ในช่วง 30 วันของบอร์ด', 'SPENDING', 'ALL', 'AUTO_TRANSACTION', 300, 8000, 10, 'SPEND_TOTAL_ANY', 'spend_total', '{}', 'บาท', '[300,500,800,1200,1700,2300,3000,4000,5500,8000]'),
(29, 'ใช้จ่ายหมวดอาหารและเครื่องดื่มรวมครบ {n} บาท', 'รวมยอดชำระทั้งหมด (บาท) เฉพาะหมวดอาหารและเครื่องดื่ม ในช่วง 30 วันของบอร์ด', 'SPENDING', 'FOOD', 'AUTO_TRANSACTION', 250, 6500, 10, 'SPEND_TOTAL_FD', 'spend_total', '{"category":"FOOD"}', 'บาท', '[250,400,650,1000,1400,1900,2500,3400,4600,6500]'),
(30, 'ใช้จ่ายหมวดสินค้าทั่วไปรวมครบ {n} บาท', 'รวมยอดชำระทั้งหมด (บาท) เฉพาะหมวดสินค้าทั่วไป ในช่วง 30 วันของบอร์ด', 'SPENDING', 'RETAIL', 'AUTO_TRANSACTION', 100, 3000, 10, 'SPEND_TOTAL_GD', 'spend_total', '{"category":"RETAIL"}', 'บาท', '[100,200,300,450,650,900,1200,1600,2200,3000]'),
(31, 'จ่ายครั้งเดียวมูลค่าตั้งแต่ {n} บาท', 'ยอดชำระครั้งเดียวที่สูงที่สุด (บาท) ในช่วง 30 วันของบอร์ด', 'SPENDING', 'ALL', 'AUTO_TRANSACTION', 100, 2500, 10, 'SINGLE_TICKET_ANY', 'max_single_ticket', '{}', 'บาท', '[100,150,200,300,400,600,800,1200,1800,2500]'),
(32, 'จ่ายครั้งเดียวหมวดอาหารและเครื่องดื่มมูลค่าตั้งแต่ {n} บาท', 'ยอดชำระครั้งเดียวที่สูงที่สุด (บาท) เฉพาะหมวดอาหารและเครื่องดื่ม ในช่วง 30 วันของบอร์ด', 'SPENDING', 'FOOD', 'AUTO_TRANSACTION', 80, 1400, 10, 'SINGLE_TICKET_FD', 'max_single_ticket', '{"category":"FOOD"}', 'บาท', '[80,120,160,220,300,400,550,750,1000,1400]'),
(33, 'จ่ายครั้งเดียวหมวดสินค้าทั่วไปมูลค่าตั้งแต่ {n} บาท', 'ยอดชำระครั้งเดียวที่สูงที่สุด (บาท) เฉพาะหมวดสินค้าทั่วไป ในช่วง 30 วันของบอร์ด', 'SPENDING', 'RETAIL', 'AUTO_TRANSACTION', 100, 2400, 10, 'SINGLE_TICKET_GD', 'max_single_ticket', '{"category":"RETAIL"}', 'บาท', '[100,150,220,300,420,600,850,1200,1700,2400]'),
(34, 'ใช้จ่ายร้านเดียวรวมครบ {n} บาท', 'ยอดชำระรวมที่ร้านเดียวซึ่งสูงที่สุด (บาท) ในช่วง 30 วันของบอร์ด', 'SPENDING', 'ALL', 'AUTO_TRANSACTION', 150, 4000, 10, 'SPEND_SINGLE_MERCHANT', 'max_spend_single_merchant', '{}', 'บาท', '[150,250,400,600,850,1150,1500,2000,2800,4000]');


-- 5. ข้อมูลของรางวัลสำหรับแลกด้วย Impact Token (Rewards)
INSERT INTO rewards (reward_id, name, description, reward_type, token_cost)
VALUES
(1, 'คูปองส่วนลด 50 บาท', 'ใช้เป็นส่วนลดเพิ่มเติมในการซื้อสินค้ากับร้านค้าร่วมโครงการ', 'COUPON', 50),
(2, 'คูปองเครื่องดื่มฟรี 1 แก้ว', 'แลกรับเครื่องดื่มฟรีจากร้านกาแฟชุมชนที่ร่วมรายการ', 'COUPON', 30),
(3, 'สิทธิ์ลุ้นรับรางวัลใหญ่ประจำเดือน', 'ตั๋วสุ่มลุ้นรับของรางวัลพิเศษและเครื่องใช้ไฟฟ้า', 'LUCKY_DRAW', 20),
(4, 'กระเป๋าผ้าลดโลกร้อนรักษ์ชุมชน', 'ของที่ระลึกผลิตจากผ้าฝ้ายทอมือวิสาหกิจชุมชน', 'PHYSICAL', 100);
