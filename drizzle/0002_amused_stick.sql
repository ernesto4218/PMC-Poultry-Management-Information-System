CREATE TABLE `chick_batch_report_snapshot` (
	`id` varchar(36) NOT NULL,
	`document_id` varchar(64) NOT NULL,
	`filters` json NOT NULL,
	`snapshot` json NOT NULL,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`voided_at` timestamp,
	`reprint_count` int NOT NULL DEFAULT 0,
	CONSTRAINT `chick_batch_report_snapshot_id` PRIMARY KEY(`id`),
	CONSTRAINT `chick_batch_report_snapshot_document_id_unique` UNIQUE(`document_id`)
);
--> statement-breakpoint
CREATE INDEX `cbrs_created_at_idx` ON `chick_batch_report_snapshot` (`created_at`);