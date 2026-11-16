CREATE TABLE `medication_report` (
	`id` varchar(36) NOT NULL,
	`document_id` varchar(12) NOT NULL,
	`farm_id` varchar(36) NOT NULL,
	`chick_batch_id` varchar(36),
	`farm_code` varchar(150) NOT NULL,
	`farm_name` varchar(150) NOT NULL,
	`volume` int NOT NULL,
	`content_hash` varchar(64) NOT NULL,
	`snapshot` json NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medication_report_id` PRIMARY KEY(`id`),
	CONSTRAINT `medication_report_document_id_unique` UNIQUE(`document_id`)
);
--> statement-breakpoint
ALTER TABLE `medication_report` ADD CONSTRAINT `medication_report_farm_id_farm_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farm`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `medication_report_farm_created_idx` ON `medication_report` (`farm_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `medication_report_farm_hash_idx` ON `medication_report` (`farm_id`,`content_hash`);--> statement-breakpoint
CREATE INDEX `medication_report_created_idx` ON `medication_report` (`created_at`);