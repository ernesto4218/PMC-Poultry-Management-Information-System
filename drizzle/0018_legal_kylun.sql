CREATE TABLE `dispatch` (
	`id` varchar(36) NOT NULL,
	`trip_code` varchar(30) NOT NULL,
	`truck_id` varchar(36),
	`driver_id` varchar(36),
	`dispatch_date` date NOT NULL,
	`truck_capacity` int NOT NULL DEFAULT 560,
	`total_bags` int NOT NULL DEFAULT 0,
	`notes` varchar(500) NOT NULL DEFAULT '',
	`status` varchar(20) NOT NULL DEFAULT 'dispatched',
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dispatch_id` PRIMARY KEY(`id`),
	CONSTRAINT `dispatch_trip_code_unique` UNIQUE(`trip_code`)
);
--> statement-breakpoint
CREATE TABLE `dispatch_item` (
	`id` varchar(36) NOT NULL,
	`dispatch_id` varchar(36) NOT NULL,
	`document_id` varchar(12) NOT NULL,
	`row_index` int NOT NULL,
	`farm_id` varchar(36),
	`farm_code` varchar(150) NOT NULL DEFAULT '',
	`farm_name` varchar(150) NOT NULL DEFAULT '',
	`batch_number` varchar(100) NOT NULL DEFAULT '',
	`feed_name` varchar(150) NOT NULL DEFAULT '',
	`feed_product_id` varchar(36),
	`scheduled_qty` int NOT NULL,
	`loaded_qty` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dispatch_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `dispatch` ADD CONSTRAINT `dispatch_truck_id_truck_id_fk` FOREIGN KEY (`truck_id`) REFERENCES `truck`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispatch` ADD CONSTRAINT `dispatch_driver_id_driver_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispatch_item` ADD CONSTRAINT `dispatch_item_dispatch_id_dispatch_id_fk` FOREIGN KEY (`dispatch_id`) REFERENCES `dispatch`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispatch_item` ADD CONSTRAINT `dispatch_item_farm_id_farm_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farm`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispatch_item` ADD CONSTRAINT `dispatch_item_feed_product_id_feed_product_id_fk` FOREIGN KEY (`feed_product_id`) REFERENCES `feed_product`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `dispatch_date_idx` ON `dispatch` (`dispatch_date`);--> statement-breakpoint
CREATE INDEX `dispatch_status_idx` ON `dispatch` (`status`);--> statement-breakpoint
CREATE INDEX `dispatch_truck_idx` ON `dispatch` (`truck_id`);--> statement-breakpoint
CREATE INDEX `dispatch_item_dispatch_idx` ON `dispatch_item` (`dispatch_id`);--> statement-breakpoint
CREATE INDEX `dispatch_item_ref_idx` ON `dispatch_item` (`document_id`,`row_index`);--> statement-breakpoint
CREATE INDEX `dispatch_item_feed_idx` ON `dispatch_item` (`feed_product_id`);--> statement-breakpoint
CREATE INDEX `dispatch_item_farm_idx` ON `dispatch_item` (`farm_id`);