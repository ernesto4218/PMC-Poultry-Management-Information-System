ALTER TABLE `medication_report` DROP FOREIGN KEY `medication_report_farm_id_farm_id_fk`;
--> statement-breakpoint
ALTER TABLE `medication_report` MODIFY COLUMN `farm_id` varchar(36);--> statement-breakpoint
ALTER TABLE `medication_report` ADD CONSTRAINT `medication_report_farm_id_farm_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farm`(`id`) ON DELETE set null ON UPDATE no action;