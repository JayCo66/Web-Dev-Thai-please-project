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
    is_active         TINYINT(1) NOT NULL DEFAULT 1,
    created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (quest_id)
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
(3, 'นายสมศักดิ์ ผู้ดูแลระบบ', NULL, NULL, 'admin@thaiplease.go.th', '0855550001', '$2b$10$mTiBG9XxSerFIxQ34Rb0lOIgE1FN71byK0bqk6Ft/B6z9OCbCeKPK', NULL, 'ADMIN', 'BKK'),
(4, 'ผศ.ดร. ดวงเพ็ญ เจตน์พิพัฒนพงษ์', NULL, NULL, 'executive@thaiplease.go.th', '0855550002', '$2b$10$mTiBG9XxSerFIxQ34Rb0lOIgE1FN71byK0bqk6Ft/B6z9OCbCeKPK', NULL, 'GOV_EXECUTIVE', 'BKK');

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
(3, 'บริจาคช่วยกองทุนผู้สูงอายุ', 'ร่วมบริจาคช่วยเหลือผู้สูงอายุและผู้ป่วยติดเตียงในชุมชน', 'DONATION', NULL, 'DONATION', 1, 1, 50),

-- ภารกิจใช้จ่ายตามหมวดหมู่
(4, 'อิ่มอร่อยกับร้านอาหารท้องถิ่น', 'ใช้สิทธิ์ร่วมจ่ายกับร้านอาหารหรือตามสั่ง 1 ครั้ง', 'SPENDING', 'FOOD', 'AUTO_TRANSACTION', 1, 1, 15),
(5, 'จิบกาแฟหรือเครื่องดื่มชุมชน', 'ซื้อเครื่องดื่มหรือของหวานจากร้านค้ารายย่อย 1 ครั้ง', 'SPENDING', 'FOOD', 'AUTO_TRANSACTION', 1, 1, 10),
(6, 'สนับสนุนสินค้า OTOP ท้องถิ่น', 'ซื้อสินค้า OTOP หรือผลิตภัณฑ์ชุมชน 1 รายการ', 'SPENDING', 'OTOP', 'AUTO_TRANSACTION', 1, 1, 25),
(7, 'ช้อปของใช้ร้านโชห่วยชุมชน', 'ซื้อของใช้ประจำวันจากร้านค้าทั่วไปในพื้นที่', 'SPENDING', 'RETAIL', 'AUTO_TRANSACTION', 1, 1, 15),
(8, 'ใช้จ่ายยอด 50 บาทขึ้นไป', 'มียอดซื้อรวมขั้นต่ำ 50 บาทกับร้านค้าร่วมโครงการ', 'SPENDING', 'ALL', 'AUTO_TRANSACTION', 50, 50, 20),
(9, 'ใช้จ่ายยอด 100 บาทขึ้นไป', 'มียอดซื้อรวมขั้นต่ำ 100 บาทกับร้านค้าร่วมโครงการ', 'SPENDING', 'ALL', 'AUTO_TRANSACTION', 100, 100, 30),
(10, 'มื้อเช้าพลังบวก', 'ใช้จ่ายกับร้านอาหารในช่วงเวลา 06:00 - 10:00 น.', 'SPENDING', 'FOOD', 'AUTO_TRANSACTION', 1, 1, 15),
(11, 'อุดหนุนร้านค้าใหม่ใกล้ฉัน', 'ค้นพบและใช้จ่ายกับร้านค้าที่ไม่เคยไปมาก่อน', 'EXPLORATION', 'ALL', 'AUTO_TRANSACTION', 1, 1, 20),
(12, 'ช้อปรวม 2 ร้านค้าใน 1 วัน', 'ใช้สิทธิ์ร่วมจ่ายกับร้านค้าต่างร้านกัน 2 แห่ง', 'FREQUENCY', 'ALL', 'AUTO_TRANSACTION', 2, 2, 25);

-- 5. ข้อมูลของรางวัลสำหรับแลกด้วย Impact Token (Rewards)
INSERT INTO rewards (reward_id, name, description, reward_type, token_cost)
VALUES
(1, 'คูปองส่วนลด 50 บาท', 'ใช้เป็นส่วนลดเพิ่มเติมในการซื้อสินค้ากับร้านค้าร่วมโครงการ', 'COUPON', 50),
(2, 'คูปองเครื่องดื่มฟรี 1 แก้ว', 'แลกรับเครื่องดื่มฟรีจากร้านกาแฟชุมชนที่ร่วมรายการ', 'COUPON', 30),
(3, 'สิทธิ์ลุ้นรับรางวัลใหญ่ประจำเดือน', 'ตั๋วสุ่มลุ้นรับของรางวัลพิเศษและเครื่องใช้ไฟฟ้า', 'LUCKY_DRAW', 20),
(4, 'กระเป๋าผ้าลดโลกร้อนรักษ์ชุมชน', 'ของที่ระลึกผลิตจากผ้าฝ้ายทอมือวิสาหกิจชุมชน', 'PHYSICAL', 100);
