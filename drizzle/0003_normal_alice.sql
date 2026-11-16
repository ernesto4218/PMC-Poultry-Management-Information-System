CREATE TABLE `particulars` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`qty` int NOT NULL DEFAULT 0,
	`price` decimal(14,2) NOT NULL DEFAULT '0',
	`days_to_add` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `particulars_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `particulars_name_idx` ON `particulars` (`name`);