CREATE TABLE `particulars_memory` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`notes` varchar(500) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `particulars_memory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `particulars_memory_item` (
	`id` varchar(36) NOT NULL,
	`memory_id` varchar(36) NOT NULL,
	`particular_id` varchar(36) NOT NULL,
	`label` varchar(100) NOT NULL DEFAULT '',
	`mode` varchar(10) NOT NULL DEFAULT 'static',
	`qty` decimal(14,2) NOT NULL DEFAULT '0',
	`formula_key` varchar(100),
	`formula_params` json,
	`price` decimal(14,2) NOT NULL DEFAULT '0',
	`adjustment_days` int,
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `particulars_memory_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP INDEX `particulars_name_idx` ON `particulars`;--> statement-breakpoint
ALTER TABLE `particulars` ADD CONSTRAINT `particulars_name_unique` UNIQUE(`name`);--> statement-breakpoint
ALTER TABLE `particulars_memory_item` ADD CONSTRAINT `particulars_memory_item_memory_id_particulars_memory_id_fk` FOREIGN KEY (`memory_id`) REFERENCES `particulars_memory`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `particulars_memory_item` ADD CONSTRAINT `particulars_memory_item_particular_id_particulars_id_fk` FOREIGN KEY (`particular_id`) REFERENCES `particulars`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `particulars_memory_name_idx` ON `particulars_memory` (`name`);--> statement-breakpoint
CREATE INDEX `pmi_memory_idx` ON `particulars_memory_item` (`memory_id`);--> statement-breakpoint
CREATE INDEX `pmi_particular_idx` ON `particulars_memory_item` (`particular_id`);--> statement-breakpoint
ALTER TABLE `particulars` DROP COLUMN `qty`;--> statement-breakpoint
ALTER TABLE `particulars` DROP COLUMN `price`;--> statement-breakpoint
ALTER TABLE `particulars` DROP COLUMN `adjustment_days`;--> statement-breakpoint
ALTER TABLE `particulars` DROP COLUMN `qty_formula`;