CREATE TABLE `budget_report` (
	`id` varchar(36) NOT NULL,
	`document_id` varchar(12) NOT NULL,
	`farm_id` varchar(36),
	`chick_batch_id` varchar(36) NOT NULL,
	`batch_number` varchar(100) NOT NULL DEFAULT '',
	`farm_code` varchar(150) NOT NULL,
	`farm_name` varchar(150) NOT NULL,
	`volume` int NOT NULL,
	`grand_total` decimal(14,2) NOT NULL DEFAULT 0,
	`content_hash` varchar(64) NOT NULL,
	`snapshot` json NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `budget_report_id` PRIMARY KEY(`id`),
	CONSTRAINT `budget_report_document_id_unique` UNIQUE(`document_id`)
);
--> statement-breakpoint
ALTER TABLE `budget_report` ADD CONSTRAINT `budget_report_farm_id_farm_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farm`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `budget_report_farm_created_idx` ON `budget_report` (`farm_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `budget_report_batch_idx` ON `budget_report` (`chick_batch_id`);--> statement-breakpoint
CREATE INDEX `budget_report_farm_hash_idx` ON `budget_report` (`farm_id`,`content_hash`);--> statement-breakpoint
CREATE INDEX `budget_report_created_idx` ON `budget_report` (`created_at`);