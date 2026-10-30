-- Merchant registration needs government approval before a shop can take payments.
-- Existing shops default to APPROVED so current data keeps working; registration sets PENDING explicitly.
ALTER TABLE `shops`
    ADD COLUMN `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN `review_note` VARCHAR(255) NULL,
    ADD COLUMN `reviewed_at` DATETIME(3) NULL,
    ADD COLUMN `reviewed_by` BIGINT UNSIGNED NULL;

-- CreateIndex
CREATE INDEX `idx_shops_status` ON `shops`(`status`);

-- AddForeignKey
ALTER TABLE `shops` ADD CONSTRAINT `fk_shops_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE RESTRICT;
