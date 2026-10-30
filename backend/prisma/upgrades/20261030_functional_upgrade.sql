-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `request_key` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `demo_balance` DECIMAL(12, 2) NOT NULL DEFAULT 500;

-- AlterTable
ALTER TABLE `bingo_boards` ADD COLUMN `board_index` TINYINT UNSIGNED NULL,
    ADD COLUMN `month_key` CHAR(7) NULL,
    ADD COLUMN `snapshot` JSON NULL;

-- AlterTable
ALTER TABLE `donations` ADD COLUMN `request_key` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `token_transactions` ADD COLUMN `event_key` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `reward_redemptions` (
    `redemption_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `reward_id` BIGINT UNSIGNED NULL,
    `kind` VARCHAR(32) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `metadata` JSON NOT NULL,
    `token_cost` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(24) NOT NULL DEFAULT 'AVAILABLE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `request_key` VARCHAR(191) NULL,

    UNIQUE INDEX `reward_redemptions_code_key`(`code`),
    UNIQUE INDEX `reward_redemptions_request_key_key`(`request_key`),
    INDEX `reward_redemptions_user_id_idx`(`user_id`),
    PRIMARY KEY (`redemption_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `transactions_request_key_key` ON `transactions`(`request_key`);

-- CreateIndex
CREATE UNIQUE INDEX `uq_bingo_month_board` ON `bingo_boards`(`user_id`, `month_key`, `board_index`);

-- CreateIndex
CREATE UNIQUE INDEX `donations_request_key_key` ON `donations`(`request_key`);

-- CreateIndex
CREATE UNIQUE INDEX `token_transactions_event_key_key` ON `token_transactions`(`event_key`);

-- AddForeignKey
ALTER TABLE `reward_redemptions` ADD CONSTRAINT `reward_redemptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

