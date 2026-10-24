-- ============================================================
-- THAI Please - MySQL 8.0 relational schema
-- Charset: utf8mb4 | Engine: InnoDB
--
-- Based on the THAI Please System Analysis and Design document.
-- Main additions made to support the documented features:
--   * categories and user/merchant category mappings
--   * clear campaign, wallet, payment QR and co-payment records
--   * review eligibility/audit fields
--   * quest periods, reward claims, badges and referrals
--   * recommendation conversion attribution and fraud review history
--   * daily usage summaries for quota checks and social-impact reporting
--
-- IMPORTANT BUSINESS RULES TO ENFORCE IN THE SERVICE LAYER:
--   1. Only allow reviews for a COMPLETED transaction by its buyer,
--      for the transaction's merchant, within 24 hours of completion.
--   2. Check campaign and per-user quota atomically before confirming payment.
--   3. A QR/payment attempt must not be processed more than once.
--   4. Update transaction, wallet ledger and usage summaries in one DB transaction.
--   5. Verify referral/quest/reward eligibility on the server; never trust the client.
--   6. Do not store raw national ID numbers or third-party authentication tokens.
--
-- Requires MySQL 8.0.16+ for enforced CHECK constraints.
-- ============================================================

CREATE DATABASE IF NOT EXISTS thai_please
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE thai_please;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ------------------------------------------------------------
-- 1. Accounts and access control
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    role_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    role_code     VARCHAR(40) NOT NULL,
    role_name     VARCHAR(100) NOT NULL,
    created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (role_id),
    UNIQUE KEY uq_roles_role_code (role_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
    user_id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    citizen_id_hash            CHAR(64) NULL COMMENT 'Hash only; never store raw citizen ID here',
    full_name                  VARCHAR(200) NOT NULL,
    email                      VARCHAR(254) NULL,
    phone_number               VARCHAR(30) NULL,
    province_code              VARCHAR(10) NULL,
    is_registered_thai_please  TINYINT(1) NOT NULL DEFAULT 0,
    registered_at              DATETIME(3) NULL,
    account_status             ENUM('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_at                 DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at                 DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                            ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_citizen_id_hash (citizen_id_hash),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_phone_number (phone_number),
    KEY idx_users_province (province_code),
    KEY idx_users_status (account_status),
    CONSTRAINT chk_users_registered_at CHECK (
        (is_registered_thai_please = 0) OR (registered_at IS NOT NULL)
    )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id       BIGINT UNSIGNED NOT NULL,
    role_id       BIGINT UNSIGNED NOT NULL,
    assigned_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    assigned_by   BIGINT UNSIGNED NULL,
    PRIMARY KEY (user_id, role_id),
    KEY idx_user_roles_role (role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id)
        REFERENCES roles (role_id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by)
        REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS external_identities (
    external_identity_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id               BIGINT UNSIGNED NOT NULL,
    provider              ENUM('THAID','NDID') NOT NULL,
    provider_subject_hash CHAR(64) NOT NULL COMMENT 'Hashed provider subject/identifier; no access token',
    linked_at             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (external_identity_id),
    UNIQUE KEY uq_external_provider_subject (provider, provider_subject_hash),
    KEY idx_external_identities_user (user_id),
    CONSTRAINT fk_external_identities_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. Campaign policy
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    campaign_name        VARCHAR(200) NOT NULL,
    description          TEXT NULL,
    copay_rate           DECIMAL(5,4) NOT NULL DEFAULT 0.6000
                         COMMENT 'Government contribution ratio; 0.6000 means 60%',
    user_daily_quota     DECIMAL(14,2) NOT NULL DEFAULT 150.00,
    user_total_quota     DECIMAL(14,2) NOT NULL DEFAULT 3000.00,
    daily_budget         DECIMAL(16,2) NULL COMMENT 'Optional total government budget cap per day',
    total_budget         DECIMAL(18,2) NULL COMMENT 'Optional total government budget cap for campaign',
    starts_at            DATETIME(3) NOT NULL,
    ends_at              DATETIME(3) NOT NULL,
    status               ENUM('DRAFT','ACTIVE','PAUSED','ENDED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
    created_by_user_id   BIGINT UNSIGNED NULL,
    created_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                            ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (campaign_id),
    KEY idx_campaigns_status_dates (status, starts_at, ends_at),
    CONSTRAINT fk_campaigns_created_by FOREIGN KEY (created_by_user_id)
        REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT chk_campaign_copay_rate CHECK (copay_rate >= 0 AND copay_rate <= 1),
    CONSTRAINT chk_campaign_user_quotas CHECK (
        user_daily_quota >= 0 AND user_total_quota >= user_daily_quota
    ),
    CONSTRAINT chk_campaign_global_budgets CHECK (
        (daily_budget IS NULL OR daily_budget >= 0) AND
        (total_budget IS NULL OR total_budget >= 0)
    ),
    CONSTRAINT chk_campaign_dates CHECK (ends_at > starts_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. Merchant directory and categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    category_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_name  VARCHAR(100) NOT NULL,
    description    VARCHAR(500) NULL,
    is_active      TINYINT(1) NOT NULL DEFAULT 1,
    created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (category_id),
    UNIQUE KEY uq_categories_name (category_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS merchants (
    merchant_id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    tax_id                  VARCHAR(30) NULL,
    shop_name               VARCHAR(200) NOT NULL,
    description             TEXT NULL,
    phone_number            VARCHAR(30) NULL,
    address_line            VARCHAR(500) NULL,
    province_code           VARCHAR(10) NULL,
    district                VARCHAR(100) NULL,
    subdistrict             VARCHAR(100) NULL,
    postal_code             VARCHAR(20) NULL,
    latitude                DECIMAL(10,7) NULL,
    longitude               DECIMAL(10,7) NULL,
    digital_credit_score    DECIMAL(7,2) NULL,
    status                  ENUM('PENDING','APPROVED','REJECTED','SUSPENDED') NOT NULL DEFAULT 'PENDING',
    submitted_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    approved_by_user_id     BIGINT UNSIGNED NULL,
    approved_at             DATETIME(3) NULL,
    rejection_reason        VARCHAR(1000) NULL,
    created_at              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                              ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (merchant_id),
    UNIQUE KEY uq_merchants_tax_id (tax_id),
    KEY idx_merchants_status (status),
    KEY idx_merchants_province (province_code),
    KEY idx_merchants_location (latitude, longitude),
    KEY idx_merchants_shop_name (shop_name),
    CONSTRAINT fk_merchants_approved_by FOREIGN KEY (approved_by_user_id)
        REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT chk_merchants_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
    CONSTRAINT chk_merchants_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
    CONSTRAINT chk_merchants_approval_fields CHECK (
        (status <> 'APPROVED') OR (approved_at IS NOT NULL)
    )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS merchant_users (
    merchant_id   BIGINT UNSIGNED NOT NULL,
    user_id       BIGINT UNSIGNED NOT NULL,
    merchant_role ENUM('OWNER','MANAGER','STAFF') NOT NULL DEFAULT 'STAFF',
    is_primary    TINYINT(1) NOT NULL DEFAULT 0,
    added_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (merchant_id, user_id),
    KEY idx_merchant_users_user (user_id),
    CONSTRAINT fk_merchant_users_merchant FOREIGN KEY (merchant_id)
        REFERENCES merchants (merchant_id) ON DELETE CASCADE,
    CONSTRAINT fk_merchant_users_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS merchant_categories (
    merchant_id  BIGINT UNSIGNED NOT NULL,
    category_id  BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (merchant_id, category_id),
    KEY idx_merchant_categories_category (category_id),
    CONSTRAINT fk_merchant_categories_merchant FOREIGN KEY (merchant_id)
        REFERENCES merchants (merchant_id) ON DELETE CASCADE,
    CONSTRAINT fk_merchant_categories_category FOREIGN KEY (category_id)
        REFERENCES categories (category_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_category_preferences (
    preference_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id           BIGINT UNSIGNED NOT NULL,
    category_id       BIGINT UNSIGNED NOT NULL,
    preference_weight DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
    updated_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                            ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (preference_id),
    UNIQUE KEY uq_user_category_preference (user_id, category_id),
    KEY idx_user_category_preferences_category (category_id),
    CONSTRAINT fk_user_category_preferences_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_category_preferences_category FOREIGN KEY (category_id)
        REFERENCES categories (category_id) ON DELETE CASCADE,
    CONSTRAINT chk_preference_weight CHECK (preference_weight >= 0 AND preference_weight <= 1)
) ENGINE=InnoDB;

-- Record of merchant approval/rejection/suspension decisions.
CREATE TABLE IF NOT EXISTS merchant_approval_history (
    approval_history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    merchant_id         BIGINT UNSIGNED NOT NULL,
    action_by_user_id   BIGINT UNSIGNED NULL,
    previous_status     ENUM('PENDING','APPROVED','REJECTED','SUSPENDED') NULL,
    new_status          ENUM('PENDING','APPROVED','REJECTED','SUSPENDED') NOT NULL,
    note                VARCHAR(1000) NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (approval_history_id),
    KEY idx_merchant_approval_history_merchant_date (merchant_id, created_at),
    CONSTRAINT fk_merchant_approval_history_merchant FOREIGN KEY (merchant_id)
        REFERENCES merchants (merchant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_merchant_approval_history_actor FOREIGN KEY (action_by_user_id)
        REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. Wallets, dynamic QR payments and transactions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
    wallet_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id        BIGINT UNSIGNED NOT NULL,
    campaign_id    BIGINT UNSIGNED NOT NULL,
    balance        DECIMAL(16,2) NOT NULL DEFAULT 0.00
                   COMMENT 'Citizen-owned funds only; government quota is tracked separately',
    currency       CHAR(3) NOT NULL DEFAULT 'THB',
    status         ENUM('ACTIVE','FROZEN','CLOSED') NOT NULL DEFAULT 'ACTIVE',
    created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                          ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (wallet_id),
    UNIQUE KEY uq_wallet_user_campaign (user_id, campaign_id),
    KEY idx_wallets_campaign (campaign_id),
    CONSTRAINT fk_wallets_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_wallets_campaign FOREIGN KEY (campaign_id)
        REFERENCES campaigns (campaign_id) ON DELETE RESTRICT,
    CONSTRAINT chk_wallet_balance CHECK (balance >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_qrs (
    payment_qr_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    qr_reference        VARCHAR(100) NOT NULL,
    merchant_id         BIGINT UNSIGNED NOT NULL,
    campaign_id         BIGINT UNSIGNED NOT NULL,
    created_by_user_id  BIGINT UNSIGNED NULL,
    amount              DECIMAL(16,2) NOT NULL,
    currency            CHAR(3) NOT NULL DEFAULT 'THB',
    status              ENUM('CREATED','PAID','EXPIRED','CANCELLED') NOT NULL DEFAULT 'CREATED',
    expires_at          DATETIME(3) NOT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                            ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (payment_qr_id),
    UNIQUE KEY uq_payment_qrs_reference (qr_reference),
    KEY idx_payment_qrs_merchant_status (merchant_id, status),
    KEY idx_payment_qrs_expiry (status, expires_at),
    CONSTRAINT fk_payment_qrs_merchant FOREIGN KEY (merchant_id)
        REFERENCES merchants (merchant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_qrs_campaign FOREIGN KEY (campaign_id)
        REFERENCES campaigns (campaign_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_qrs_created_by FOREIGN KEY (created_by_user_id)
        REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT chk_payment_qr_amount CHECK (amount > 0),
    CONSTRAINT chk_payment_qr_expiry CHECK (expires_at > created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    idempotency_key       VARCHAR(100) NULL COMMENT 'Unique key to prevent duplicate checkout requests',
    user_id               BIGINT UNSIGNED NOT NULL COMMENT 'Buyer',
    merchant_id           BIGINT UNSIGNED NOT NULL COMMENT 'Seller',
    campaign_id           BIGINT UNSIGNED NOT NULL,
    payment_qr_id         BIGINT UNSIGNED NOT NULL,
    wallet_id             BIGINT UNSIGNED NULL COMMENT 'Set if citizen portion is paid from this wallet',
    subtotal_amount       DECIMAL(16,2) NOT NULL,
    discount_amount       DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    total_amount          DECIMAL(16,2) NOT NULL COMMENT 'Final amount after discount',
    copay_rate_snapshot   DECIMAL(5,4) NOT NULL DEFAULT 0.6000,
    gov_copay_amount      DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    citizen_paid_amount   DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    currency              CHAR(3) NOT NULL DEFAULT 'THB',
    status                ENUM('PENDING','AUTHORIZED','COMPLETED','FAILED','CANCELLED','REFUNDED','FLAGGED')
                          NOT NULL DEFAULT 'PENDING',
    failure_reason        VARCHAR(1000) NULL,
    created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    completed_at          DATETIME(3) NULL,
    updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                              ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (transaction_id),
    UNIQUE KEY uq_transactions_idempotency_key (idempotency_key),
    UNIQUE KEY uq_transactions_payment_qr (payment_qr_id),
    KEY idx_transactions_user_date (user_id, created_at),
    KEY idx_transactions_merchant_date (merchant_id, created_at),
    KEY idx_transactions_campaign_status (campaign_id, status, created_at),
    KEY idx_transactions_status_date (status, created_at),
    CONSTRAINT fk_transactions_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_merchant FOREIGN KEY (merchant_id)
        REFERENCES merchants (merchant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_campaign FOREIGN KEY (campaign_id)
        REFERENCES campaigns (campaign_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_payment_qr FOREIGN KEY (payment_qr_id)
        REFERENCES payment_qrs (payment_qr_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_wallet FOREIGN KEY (wallet_id)
        REFERENCES wallets (wallet_id) ON DELETE RESTRICT,
    CONSTRAINT chk_transaction_amounts CHECK (
        subtotal_amount > 0 AND discount_amount >= 0 AND
        discount_amount <= subtotal_amount AND
        total_amount = subtotal_amount - discount_amount AND
        gov_copay_amount >= 0 AND citizen_paid_amount >= 0 AND
        gov_copay_amount + citizen_paid_amount = total_amount
    ),
    CONSTRAINT chk_transaction_copay_rate CHECK (copay_rate_snapshot >= 0 AND copay_rate_snapshot <= 1),
    CONSTRAINT chk_transaction_completion_time CHECK (
        (status <> 'COMPLETED' OR completed_at IS NOT NULL)
    )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallet_transactions (
    wallet_transaction_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    wallet_id             BIGINT UNSIGNED NOT NULL,
    transaction_id        BIGINT UNSIGNED NULL,
    transaction_type      ENUM('TOPUP','DEBIT','REFUND','ADJUSTMENT') NOT NULL,
    amount                DECIMAL(16,2) NOT NULL COMMENT 'Positive movement amount; type determines direction',
    balance_after         DECIMAL(16,2) NOT NULL,
    idempotency_key       VARCHAR(100) NULL,
    note                  VARCHAR(500) NULL,
    created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (wallet_transaction_id),
    UNIQUE KEY uq_wallet_transactions_idempotency (idempotency_key),
    KEY idx_wallet_transactions_wallet_date (wallet_id, created_at),
    KEY idx_wallet_transactions_transaction (transaction_id),
    CONSTRAINT fk_wallet_transactions_wallet FOREIGN KEY (wallet_id)
        REFERENCES wallets (wallet_id) ON DELETE RESTRICT,
    CONSTRAINT fk_wallet_transactions_transaction FOREIGN KEY (transaction_id)
        REFERENCES transactions (transaction_id) ON DELETE RESTRICT,
    CONSTRAINT chk_wallet_transaction_amount CHECK (amount > 0 AND balance_after >= 0)
) ENGINE=InnoDB;

-- Fraud checks are one-to-many so repeated checks and manual reviews can be audited.
CREATE TABLE IF NOT EXISTS fraud_checks (
    fraud_check_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    transaction_id          BIGINT UNSIGNED NOT NULL,
    user_latitude           DECIMAL(10,7) NULL,
    user_longitude          DECIMAL(10,7) NULL,
    merchant_latitude       DECIMAL(10,7) NULL COMMENT 'Location snapshot at check time',
    merchant_longitude      DECIMAL(10,7) NULL COMMENT 'Location snapshot at check time',
    distance_meters         DECIMAL(12,2) NULL,
    decision                ENUM('PENDING_REVIEW','AUTO_APPROVED','MANUAL_APPROVED','FLAGGED','BLOCKED')
                            NOT NULL DEFAULT 'PENDING_REVIEW',
    reason_code             VARCHAR(80) NULL,
    reason_detail           VARCHAR(1000) NULL,
    checked_by_user_id      BIGINT UNSIGNED NULL,
    checked_at              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (fraud_check_id),
    KEY idx_fraud_checks_transaction (transaction_id, checked_at),
    KEY idx_fraud_checks_decision (decision, checked_at),
    CONSTRAINT fk_fraud_checks_transaction FOREIGN KEY (transaction_id)
        REFERENCES transactions (transaction_id) ON DELETE RESTRICT,
    CONSTRAINT fk_fraud_checks_checked_by FOREIGN KEY (checked_by_user_id)
        REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT chk_fraud_distance CHECK (distance_meters IS NULL OR distance_meters >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. Verified reviews
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    review_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    transaction_id  BIGINT UNSIGNED NOT NULL,
    user_id         BIGINT UNSIGNED NOT NULL,
    merchant_id     BIGINT UNSIGNED NOT NULL,
    rating_stars    TINYINT UNSIGNED NOT NULL,
    review_text     TEXT NULL,
    status          ENUM('VISIBLE','HIDDEN','UNDER_REVIEW','REMOVED') NOT NULL DEFAULT 'VISIBLE',
    moderated_by    BIGINT UNSIGNED NULL,
    moderated_at    DATETIME(3) NULL,
    created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (review_id),
    UNIQUE KEY uq_reviews_transaction (transaction_id),
    KEY idx_reviews_merchant_status_date (merchant_id, status, created_at),
    KEY idx_reviews_user_date (user_id, created_at),
    CONSTRAINT fk_reviews_transaction FOREIGN KEY (transaction_id)
        REFERENCES transactions (transaction_id) ON DELETE RESTRICT,
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_reviews_merchant FOREIGN KEY (merchant_id)
        REFERENCES merchants (merchant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_reviews_moderated_by FOREIGN KEY (moderated_by)
        REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT chk_reviews_rating CHECK (rating_stars BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. Rewards, quests and badges
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rewards (
    reward_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reward_name     VARCHAR(200) NOT NULL,
    reward_type     ENUM('COUPON','DISCOUNT','POINTS') NOT NULL,
    discount_type   ENUM('FIXED','PERCENTAGE') NULL,
    discount_value  DECIMAL(14,2) NULL,
    points_value    BIGINT UNSIGNED NULL,
    valid_days      INT UNSIGNED NOT NULL DEFAULT 30,
    min_purchase    DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    status          ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                          ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (reward_id),
    KEY idx_rewards_status_type (status, reward_type),
    CONSTRAINT chk_rewards_valid_days CHECK (valid_days > 0),
    CONSTRAINT chk_rewards_min_purchase CHECK (min_purchase >= 0),
    CONSTRAINT chk_rewards_discount CHECK (
        (discount_value IS NULL OR discount_value >= 0) AND
        (discount_type IS NULL OR discount_type IN ('FIXED','PERCENTAGE')) AND
        (discount_type <> 'PERCENTAGE' OR discount_value <= 100)
    )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quests (
    quest_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    campaign_id       BIGINT UNSIGNED NOT NULL,
    reward_id         BIGINT UNSIGNED NULL,
    quest_name        VARCHAR(200) NOT NULL,
    description       TEXT NULL,
    quest_type        ENUM('DAILY','WEEKLY','MONTHLY','CROSS_AREA','SPEND','VISIT','REFERRAL','REVIEW','CUSTOM')
                      NOT NULL,
    target_value      DECIMAL(14,2) NOT NULL DEFAULT 1.00,
    condition_json    JSON NULL COMMENT 'Additional quest rules, e.g. target categories or regions',
    starts_at         DATETIME(3) NULL,
    ends_at           DATETIME(3) NULL,
    status            ENUM('DRAFT','ACTIVE','INACTIVE','ENDED') NOT NULL DEFAULT 'DRAFT',
    created_by_user_id BIGINT UNSIGNED NULL,
    created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                            ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (quest_id),
    KEY idx_quests_campaign_status (campaign_id, status),
    KEY idx_quests_type_status (quest_type, status),
    CONSTRAINT fk_quests_campaign FOREIGN KEY (campaign_id)
        REFERENCES campaigns (campaign_id) ON DELETE RESTRICT,
    CONSTRAINT fk_quests_reward FOREIGN KEY (reward_id)
        REFERENCES rewards (reward_id) ON DELETE SET NULL,
    CONSTRAINT fk_quests_created_by FOREIGN KEY (created_by_user_id)
        REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT chk_quests_target_value CHECK (target_value > 0),
    CONSTRAINT chk_quests_dates CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_quests (
    user_quest_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id          BIGINT UNSIGNED NOT NULL,
    quest_id         BIGINT UNSIGNED NOT NULL,
    period_start     DATE NOT NULL COMMENT 'Allows recurring quests to create a new instance by period',
    period_end       DATE NOT NULL,
    progress_value   DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    status           ENUM('ASSIGNED','IN_PROGRESS','COMPLETED','CLAIMED','EXPIRED') NOT NULL DEFAULT 'ASSIGNED',
    assigned_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    completed_at     DATETIME(3) NULL,
    claimed_at       DATETIME(3) NULL,
    PRIMARY KEY (user_quest_id),
    UNIQUE KEY uq_user_quest_period (user_id, quest_id, period_start),
    KEY idx_user_quests_user_status (user_id, status),
    KEY idx_user_quests_quest_status (quest_id, status),
    CONSTRAINT fk_user_quests_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_quests_quest FOREIGN KEY (quest_id)
        REFERENCES quests (quest_id) ON DELETE RESTRICT,
    CONSTRAINT chk_user_quest_progress CHECK (progress_value >= 0),
    CONSTRAINT chk_user_quest_period CHECK (period_end >= period_start),
    CONSTRAINT chk_user_quest_completed_time CHECK (
        (status NOT IN ('COMPLETED','CLAIMED') OR completed_at IS NOT NULL)
    ),
    CONSTRAINT chk_user_quest_claimed_time CHECK (status <> 'CLAIMED' OR claimed_at IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS badges (
    badge_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    badge_code      VARCHAR(60) NOT NULL,
    badge_name      VARCHAR(150) NOT NULL,
    badge_level     ENUM('BRONZE','SILVER','GOLD','RAINBOW') NOT NULL,
    metric_code     VARCHAR(80) NOT NULL COMMENT 'Metric used to determine eligibility',
    required_count  DECIMAL(14,2) NOT NULL,
    description     VARCHAR(1000) NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (badge_id),
    UNIQUE KEY uq_badges_code (badge_code),
    KEY idx_badges_metric_level (metric_code, badge_level),
    CONSTRAINT chk_badges_required_count CHECK (required_count > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_badges (
    user_badge_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id        BIGINT UNSIGNED NOT NULL,
    badge_id       BIGINT UNSIGNED NOT NULL,
    earned_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    progress_at_award DECIMAL(14,2) NULL,
    PRIMARY KEY (user_badge_id),
    UNIQUE KEY uq_user_badge (user_id, badge_id),
    KEY idx_user_badges_badge (badge_id),
    CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_badges_badge FOREIGN KEY (badge_id)
        REFERENCES badges (badge_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. Referrals and issued reward instances
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
    referral_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    inviter_user_id      BIGINT UNSIGNED NOT NULL,
    referred_user_id     BIGINT UNSIGNED NULL,
    merchant_id          BIGINT UNSIGNED NULL,
    referral_code        VARCHAR(32) NOT NULL,
    discount_amount      DECIMAL(14,2) NOT NULL DEFAULT 30.00,
    status               ENUM('PENDING','ACCEPTED','CONVERTED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    converted_transaction_id BIGINT UNSIGNED NULL,
    created_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    accepted_at          DATETIME(3) NULL,
    converted_at         DATETIME(3) NULL,
    expires_at           DATETIME(3) NULL,
    PRIMARY KEY (referral_id),
    UNIQUE KEY uq_referrals_code (referral_code),
    UNIQUE KEY uq_referrals_referred_user (referred_user_id),
    UNIQUE KEY uq_referrals_converted_transaction (converted_transaction_id),
    KEY idx_referrals_inviter_status (inviter_user_id, status, created_at),
    KEY idx_referrals_merchant (merchant_id),
    CONSTRAINT fk_referrals_inviter FOREIGN KEY (inviter_user_id)
        REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_referrals_referred_user FOREIGN KEY (referred_user_id)
        REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_referrals_merchant FOREIGN KEY (merchant_id)
        REFERENCES merchants (merchant_id) ON DELETE SET NULL,
    CONSTRAINT fk_referrals_transaction FOREIGN KEY (converted_transaction_id)
        REFERENCES transactions (transaction_id) ON DELETE RESTRICT,
    CONSTRAINT chk_referrals_not_self CHECK (referred_user_id IS NULL OR inviter_user_id <> referred_user_id),
    CONSTRAINT chk_referrals_discount CHECK (discount_amount >= 0),
    CONSTRAINT chk_referrals_conversion_time CHECK (
        (status <> 'CONVERTED') OR (converted_transaction_id IS NOT NULL AND converted_at IS NOT NULL)
    )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_rewards (
    user_reward_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id                 BIGINT UNSIGNED NOT NULL,
    reward_id               BIGINT UNSIGNED NOT NULL,
    quest_id                BIGINT UNSIGNED NULL,
    referral_id             BIGINT UNSIGNED NULL,
    reward_code             VARCHAR(80) NULL,
    status                  ENUM('AVAILABLE','REDEEMED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'AVAILABLE',
    earned_at               DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at              DATETIME(3) NULL,
    redeemed_transaction_id BIGINT UNSIGNED NULL,
    redeemed_at             DATETIME(3) NULL,
    PRIMARY KEY (user_reward_id),
    UNIQUE KEY uq_user_rewards_code (reward_code),
    KEY idx_user_rewards_user_status (user_id, status, expires_at),
    KEY idx_user_rewards_reward (reward_id),
    KEY idx_user_rewards_transaction (redeemed_transaction_id),
    CONSTRAINT fk_user_rewards_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_rewards_reward FOREIGN KEY (reward_id)
        REFERENCES rewards (reward_id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_rewards_quest FOREIGN KEY (quest_id)
        REFERENCES quests (quest_id) ON DELETE SET NULL,
    CONSTRAINT fk_user_rewards_referral FOREIGN KEY (referral_id)
        REFERENCES referrals (referral_id) ON DELETE SET NULL,
    CONSTRAINT fk_user_rewards_transaction FOREIGN KEY (redeemed_transaction_id)
        REFERENCES transactions (transaction_id) ON DELETE RESTRICT,
    CONSTRAINT chk_user_rewards_redeemed CHECK (
        (status <> 'REDEEMED') OR (redeemed_transaction_id IS NOT NULL AND redeemed_at IS NOT NULL)
    )
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. Recommendation impression/click/conversion tracking
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendation_logs (
    recommendation_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id                  BIGINT UNSIGNED NOT NULL,
    merchant_id              BIGINT UNSIGNED NOT NULL,
    user_latitude            DECIMAL(10,7) NULL,
    user_longitude           DECIMAL(10,7) NULL,
    recommendation_score     DECIMAL(12,6) NOT NULL,
    position_rank            SMALLINT UNSIGNED NULL,
    algorithm_version        VARCHAR(50) NULL,
    is_clicked               TINYINT(1) NOT NULL DEFAULT 0,
    clicked_at               DATETIME(3) NULL,
    converted_transaction_id BIGINT UNSIGNED NULL,
    is_converted             TINYINT(1) GENERATED ALWAYS AS
                                (converted_transaction_id IS NOT NULL) STORED,
    shown_at                 DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (recommendation_id),
    UNIQUE KEY uq_recommendation_conversion_transaction (converted_transaction_id),
    KEY idx_recommendation_user_date (user_id, shown_at),
    KEY idx_recommendation_merchant_date (merchant_id, shown_at),
    KEY idx_recommendation_click (is_clicked, shown_at),
    CONSTRAINT fk_recommendation_logs_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_recommendation_logs_merchant FOREIGN KEY (merchant_id)
        REFERENCES merchants (merchant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_recommendation_logs_transaction FOREIGN KEY (converted_transaction_id)
        REFERENCES transactions (transaction_id) ON DELETE RESTRICT,
    CONSTRAINT chk_recommendation_latitude CHECK (user_latitude IS NULL OR (user_latitude >= -90 AND user_latitude <= 90)),
    CONSTRAINT chk_recommendation_longitude CHECK (user_longitude IS NULL OR (user_longitude >= -180 AND user_longitude <= 180)),
    CONSTRAINT chk_recommendation_click_time CHECK (is_clicked = 0 OR clicked_at IS NOT NULL)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. Quota usage summaries for safe limits and reporting
-- ------------------------------------------------------------
-- These are operational summary tables. Update them in the same database
-- transaction as a successful payment, or rebuild them from transactions.
CREATE TABLE IF NOT EXISTS campaign_daily_usage (
    campaign_id                BIGINT UNSIGNED NOT NULL,
    usage_date                 DATE NOT NULL,
    government_subsidy_amount  DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    transaction_count          BIGINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at                 DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                                    ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (campaign_id, usage_date),
    CONSTRAINT fk_campaign_daily_usage_campaign FOREIGN KEY (campaign_id)
        REFERENCES campaigns (campaign_id) ON DELETE RESTRICT,
    CONSTRAINT chk_campaign_daily_usage_amount CHECK (government_subsidy_amount >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS campaign_user_daily_usage (
    campaign_id                BIGINT UNSIGNED NOT NULL,
    user_id                    BIGINT UNSIGNED NOT NULL,
    usage_date                 DATE NOT NULL,
    government_subsidy_amount  DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    transaction_count          BIGINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at                 DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                                    ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (campaign_id, user_id, usage_date),
    KEY idx_campaign_user_daily_usage_user_date (user_id, usage_date),
    CONSTRAINT fk_campaign_user_daily_usage_campaign FOREIGN KEY (campaign_id)
        REFERENCES campaigns (campaign_id) ON DELETE RESTRICT,
    CONSTRAINT fk_campaign_user_daily_usage_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_campaign_user_daily_usage_amount CHECK (government_subsidy_amount >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 10. Daily social-impact dashboard aggregates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_social_impact (
    metric_date                    DATE NOT NULL,
    province_code                  VARCHAR(10) NOT NULL DEFAULT 'ALL'
                                   COMMENT 'Use ALL for national aggregate; otherwise use the province code',
    new_customers_count            BIGINT UNSIGNED NOT NULL DEFAULT 0,
    successful_referrals_count     BIGINT UNSIGNED NOT NULL DEFAULT 0,
    benefited_merchants_count      BIGINT UNSIGNED NOT NULL DEFAULT 0,
    transaction_count              BIGINT UNSIGNED NOT NULL DEFAULT 0,
    total_spending_amount          DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    government_subsidy_amount      DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    referral_recommended_spending  DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    updated_at                     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                                        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (metric_date, province_code),
    KEY idx_daily_social_impact_province_date (province_code, metric_date),
    CONSTRAINT chk_social_impact_amounts CHECK (
        total_spending_amount >= 0 AND government_subsidy_amount >= 0 AND
        referral_recommended_spending >= 0
    )
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 11. Useful reporting view
-- Average ratings are calculated from eligible visible reviews rather than
-- manually duplicated in merchants, so the value cannot become stale.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW merchant_rating_summary AS
SELECT
    m.merchant_id,
    m.shop_name,
    COALESCE(AVG(CASE WHEN r.status = 'VISIBLE' THEN r.rating_stars END), 0) AS average_rating_stars,
    SUM(CASE WHEN r.status = 'VISIBLE' THEN 1 ELSE 0 END) AS visible_review_count
FROM merchants AS m
LEFT JOIN reviews AS r ON r.merchant_id = m.merchant_id
GROUP BY m.merchant_id, m.shop_name;

-- ------------------------------------------------------------
-- 12. Initial role seed data
-- ------------------------------------------------------------
INSERT INTO roles (role_code, role_name) VALUES
    ('CITIZEN', 'Citizen'),
    ('MERCHANT', 'Merchant'),
    ('ADMIN', 'System Administrator'),
    ('GOV_EXECUTIVE', 'Government Executive')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

-- End of schema.
