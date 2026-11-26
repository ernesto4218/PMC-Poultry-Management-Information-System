CREATE TABLE `driver` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL DEFAULT '',
	`phone` varchar(80) NOT NULL DEFAULT '',
	`address` varchar(255) NOT NULL DEFAULT '',
	`status` varchar(20) NOT NULL DEFAULT 'Active',
	`notes` varchar(500) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `truck` (
	`id` varchar(36) NOT NULL,
	`plate_number` varchar(50) NOT NULL,
	`capacity` int NOT NULL DEFAULT 0,
	`status` varchar(20) NOT NULL DEFAULT 'Active',
	`driver_id` varchar(36),
	`notes` varchar(500) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `truck_id` PRIMARY KEY(`id`),
	CONSTRAINT `truck_plate_unique` UNIQUE(`plate_number`)
);
--> statement-breakpoint
ALTER TABLE `truck` ADD CONSTRAINT `truck_driver_id_driver_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `driver_name_idx` ON `driver` (`name`);--> statement-breakpoint
CREATE INDEX `driver_status_idx` ON `driver` (`status`);--> statement-breakpoint
CREATE INDEX `truck_driver_idx` ON `truck` (`driver_id`);--> statement-breakpoint
CREATE INDEX `truck_status_idx` ON `truck` (`status`);