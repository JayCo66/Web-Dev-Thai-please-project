-- Bills a merchant opens; the citizen pays by scanning the QR or typing the code.
CREATE TABLE `payment_requests` (
    `request_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(12) NOT NULL,
    `shop_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `note` VARCHAR(200) NULL,
    `status` ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `transaction_id` BIGINT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uq_payment_requests_code`(`code`),
    INDEX `idx_payment_requests_shop`(`shop_id`),
    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_requests` ADD CONSTRAINT `fk_payment_requests_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`shop_id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `payment_requests` ADD CONSTRAINT `fk_payment_requests_tx` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`transaction_id`) ON DELETE SET NULL ON UPDATE RESTRICT;
