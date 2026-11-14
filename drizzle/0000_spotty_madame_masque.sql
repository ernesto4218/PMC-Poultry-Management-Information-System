CREATE TABLE `chick_batch` (
	`id` varchar(36) NOT NULL,
	`farm_id` varchar(36) NOT NULL,
	`batch_number` varchar(100) NOT NULL,
	`date_set` date NOT NULL,
	`volume` int NOT NULL,
	`sequence` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chick_batch_id` PRIMARY KEY(`id`),
	CONSTRAINT `chick_batch_number_unique` UNIQUE(`batch_number`),
	CONSTRAINT `chick_batch_farm_date_seq_unique` UNIQUE(`farm_id`,`date_set`,`sequence`)
);
--> statement-breakpoint
CREATE TABLE `farm` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`code` varchar(150) NOT NULL,
	`type` varchar(150) NOT NULL,
	`volume` int NOT NULL DEFAULT 40000,
	`standard_medication_id` varchar(36),
	`address` varchar(255) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `farm_id` PRIMARY KEY(`id`),
	CONSTRAINT `farm_name_unique` UNIQUE(`name`),
	CONSTRAINT `farm_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `feed_product` (
	`id` varchar(36) NOT NULL,
	`supplier_id` varchar(36) NOT NULL,
	`feed_type` varchar(40) NOT NULL,
	`stage` varchar(60) NOT NULL,
	`name` varchar(150) NOT NULL DEFAULT '',
	`sku` varchar(60) NOT NULL DEFAULT '',
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feed_product_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feed_supplier` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`code` varchar(50) NOT NULL,
	`contact_person` varchar(120) NOT NULL DEFAULT '',
	`email` varchar(190) NOT NULL DEFAULT '',
	`phone` varchar(80) NOT NULL DEFAULT '',
	`address` varchar(255) NOT NULL DEFAULT '',
	`status` varchar(20) NOT NULL DEFAULT 'Active',
	`notes` varchar(500) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feed_supplier_id` PRIMARY KEY(`id`),
	CONSTRAINT `feed_supplier_name_unique` UNIQUE(`name`),
	CONSTRAINT `feed_supplier_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `medication_memory` (
	`id` varchar(36) NOT NULL,
	`farm_group` varchar(20) NOT NULL,
	`standard_medicine_id` varchar(36) NOT NULL,
	`ages` json,
	`position` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medication_memory_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_memory_group_med` UNIQUE(`farm_group`,`standard_medicine_id`)
);
--> statement-breakpoint
CREATE TABLE `standard_age_medicine` (
	`id` varchar(36) NOT NULL,
	`age` varchar(20) NOT NULL,
	`medications` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `standard_age_medicine_id` PRIMARY KEY(`id`),
	CONSTRAINT `standard_age_medicine_age_unique` UNIQUE(`age`)
);
--> statement-breakpoint
CREATE TABLE `standard_area` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `standard_area_id` PRIMARY KEY(`id`),
	CONSTRAINT `standard_area_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `standard_cost` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`farmcode` varchar(150) NOT NULL,
	`category` varchar(150) NOT NULL,
	`qty` decimal(10,2) NOT NULL DEFAULT '0',
	`amount` decimal(14,2) NOT NULL DEFAULT '0',
	`amount_php` decimal(14,2) NOT NULL DEFAULT '0',
	`is_archived` tinyint NOT NULL DEFAULT 0,
	`archived_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `standard_cost_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `standard_cost_history` (
	`id` varchar(36) NOT NULL,
	`standard_id` varchar(36) NOT NULL,
	`action` varchar(20) NOT NULL,
	`changes` json,
	`changed_at` timestamp NOT NULL DEFAULT (now()),
	`changed_by` varchar(36),
	CONSTRAINT `standard_cost_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `standard_manpower` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`farmcode` varchar(150) NOT NULL,
	`category` varchar(150) NOT NULL,
	`qty` int NOT NULL DEFAULT 0,
	`cost` decimal(10,2) NOT NULL DEFAULT '0',
	`hours` decimal(10,2) NOT NULL DEFAULT '0',
	`multiplier` decimal(10,2) NOT NULL DEFAULT '1',
	`amount` decimal(14,2) NOT NULL DEFAULT '0',
	`amount_php` decimal(14,2) NOT NULL DEFAULT '0',
	`is_archived` tinyint NOT NULL DEFAULT 0,
	`archived_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `standard_manpower_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `standard_manpower_history` (
	`id` varchar(36) NOT NULL,
	`standard_id` varchar(36) NOT NULL,
	`action` varchar(20) NOT NULL,
	`changes` json,
	`changed_at` timestamp NOT NULL DEFAULT (now()),
	`changed_by` varchar(36),
	CONSTRAINT `standard_manpower_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `standard_medication` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`notes` varchar(500) NOT NULL DEFAULT '',
	`is_archived` tinyint NOT NULL DEFAULT 0,
	`archived_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `standard_medication_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `standard_medication_age` (
	`id` varchar(36) NOT NULL,
	`standard_id` varchar(36) NOT NULL,
	`age` varchar(20) NOT NULL,
	`note` varchar(200) NOT NULL DEFAULT '',
	`medications` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `standard_medication_age_id` PRIMARY KEY(`id`),
	CONSTRAINT `standard_medication_age_standard_age_unique` UNIQUE(`standard_id`,`age`)
);
--> statement-breakpoint
CREATE TABLE `standard_medicine` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`area_name` varchar(150) NOT NULL,
	`value` decimal(10,2) NOT NULL DEFAULT '0',
	`unit` varchar(20) NOT NULL,
	`am_duration` varchar(50) NOT NULL DEFAULT '2-3hrs',
	`am_pm_duration` varchar(50) NOT NULL DEFAULT '3 hrs',
	`pm_duration` varchar(50) NOT NULL DEFAULT '2-3 hrs',
	`is_archived` tinyint NOT NULL DEFAULT 0,
	`archived_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `standard_medicine_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `standard_medicine_history` (
	`id` varchar(36) NOT NULL,
	`standard_id` varchar(36) NOT NULL,
	`action` varchar(20) NOT NULL,
	`changes` json,
	`changed_at` timestamp NOT NULL DEFAULT (now()),
	`changed_by` varchar(36),
	CONSTRAINT `standard_medicine_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `standard_medvac` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`farmtype` varchar(150) NOT NULL,
	`category` varchar(150) NOT NULL,
	`value` decimal(10,2),
	`is_archived` tinyint NOT NULL DEFAULT 0,
	`archived_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `standard_medvac_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `standard_medvac_history` (
	`id` varchar(36) NOT NULL,
	`standard_id` varchar(36) NOT NULL,
	`action` varchar(20) NOT NULL,
	`changes` json,
	`changed_at` timestamp NOT NULL DEFAULT (now()),
	`changed_by` varchar(36),
	CONSTRAINT `standard_medvac_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `standard_supplies` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`farmcode` varchar(150) NOT NULL,
	`category` varchar(150) NOT NULL,
	`per_thousand` decimal(10,2),
	`standard_per_farm` decimal(10,2),
	`unit` varchar(50) NOT NULL,
	`is_archived` tinyint NOT NULL DEFAULT 0,
	`archived_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `standard_supplies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `standard_supplies_history` (
	`id` varchar(36) NOT NULL,
	`standard_id` varchar(36) NOT NULL,
	`action` varchar(20) NOT NULL,
	`changes` json,
	`changed_at` timestamp NOT NULL DEFAULT (now()),
	`changed_by` varchar(36),
	CONSTRAINT `standard_supplies_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_brands` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_brands_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_brands_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `supplier_item_categories` (
	`id` varchar(36) NOT NULL,
	`category_name` varchar(150) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_item_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_item_categories_name_unique` UNIQUE(`category_name`)
);
--> statement-breakpoint
CREATE TABLE `supplier_items` (
	`id` varchar(36) NOT NULL,
	`category_name` varchar(150) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_items_category_name_unique` UNIQUE(`category_name`)
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` text,
	`password` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(50) DEFAULT 'User',
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chick_batch` ADD CONSTRAINT `chick_batch_farm_id_farm_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farm`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medication_memory` ADD CONSTRAINT `medication_memory_standard_medicine_id_standard_medicine_id_fk` FOREIGN KEY (`standard_medicine_id`) REFERENCES `standard_medicine`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `chick_batch_farm_idx` ON `chick_batch` (`farm_id`);--> statement-breakpoint
CREATE INDEX `farm_standard_medication_idx` ON `farm` (`standard_medication_id`);--> statement-breakpoint
CREATE INDEX `feed_product_supplier_idx` ON `feed_product` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `feed_product_type_idx` ON `feed_product` (`feed_type`);--> statement-breakpoint
CREATE INDEX `feed_product_stage_idx` ON `feed_product` (`stage`);--> statement-breakpoint
CREATE INDEX `standard_cost_name_farmcode_idx` ON `standard_cost` (`name`,`farmcode`);--> statement-breakpoint
CREATE INDEX `standard_cost_archived_idx` ON `standard_cost` (`is_archived`);--> statement-breakpoint
CREATE INDEX `standard_cost_history_standard_idx` ON `standard_cost_history` (`standard_id`);--> statement-breakpoint
CREATE INDEX `standard_cost_history_changed_at_idx` ON `standard_cost_history` (`changed_at`);--> statement-breakpoint
CREATE INDEX `standard_manpower_name_farmcode_idx` ON `standard_manpower` (`name`,`farmcode`);--> statement-breakpoint
CREATE INDEX `standard_manpower_archived_idx` ON `standard_manpower` (`is_archived`);--> statement-breakpoint
CREATE INDEX `standard_manpower_history_standard_idx` ON `standard_manpower_history` (`standard_id`);--> statement-breakpoint
CREATE INDEX `standard_manpower_history_changed_at_idx` ON `standard_manpower_history` (`changed_at`);--> statement-breakpoint
CREATE INDEX `standard_medication_name_idx` ON `standard_medication` (`name`);--> statement-breakpoint
CREATE INDEX `standard_medication_archived_idx` ON `standard_medication` (`is_archived`);--> statement-breakpoint
CREATE INDEX `standard_medication_age_standard_idx` ON `standard_medication_age` (`standard_id`);--> statement-breakpoint
CREATE INDEX `standard_medicine_name_area_idx` ON `standard_medicine` (`name`,`area_name`);--> statement-breakpoint
CREATE INDEX `standard_medicine_area_idx` ON `standard_medicine` (`area_name`);--> statement-breakpoint
CREATE INDEX `standard_medicine_archived_idx` ON `standard_medicine` (`is_archived`);--> statement-breakpoint
CREATE INDEX `standard_medicine_history_standard_idx` ON `standard_medicine_history` (`standard_id`);--> statement-breakpoint
CREATE INDEX `standard_medicine_history_changed_at_idx` ON `standard_medicine_history` (`changed_at`);--> statement-breakpoint
CREATE INDEX `standard_medvac_name_farmtype_idx` ON `standard_medvac` (`name`,`farmtype`);--> statement-breakpoint
CREATE INDEX `standard_medvac_archived_idx` ON `standard_medvac` (`is_archived`);--> statement-breakpoint
CREATE INDEX `standard_medvac_history_standard_idx` ON `standard_medvac_history` (`standard_id`);--> statement-breakpoint
CREATE INDEX `standard_medvac_history_changed_at_idx` ON `standard_medvac_history` (`changed_at`);--> statement-breakpoint
CREATE INDEX `standard_supplies_name_farmcode_idx` ON `standard_supplies` (`name`,`farmcode`);--> statement-breakpoint
CREATE INDEX `standard_supplies_archived_idx` ON `standard_supplies` (`is_archived`);--> statement-breakpoint
CREATE INDEX `standard_supplies_history_standard_idx` ON `standard_supplies_history` (`standard_id`);--> statement-breakpoint
CREATE INDEX `standard_supplies_history_changed_at_idx` ON `standard_supplies_history` (`changed_at`);--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);