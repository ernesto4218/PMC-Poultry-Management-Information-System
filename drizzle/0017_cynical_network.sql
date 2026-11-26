CREATE TABLE `feed_stock` (
	`id` varchar(36) NOT NULL,
	`feed_product_id` varchar(36) NOT NULL,
	`on_hand` int NOT NULL DEFAULT 0,
	`min_stock` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feed_stock_id` PRIMARY KEY(`id`),
	CONSTRAINT `feed_stock_product_unique` UNIQUE(`feed_product_id`)
);
--> statement-breakpoint
CREATE TABLE `feed_stock_movement` (
	`id` varchar(36) NOT NULL,
	`movement_type` varchar(30) NOT NULL,
	`direction` varchar(3) NOT NULL,
	`feed_product_id` varchar(36) NOT NULL,
	`supplier_id` varchar(36),
	`farm_id` varchar(36),
	`driver_id` varchar(36),
	`qty` int NOT NULL,
	`chick_in_code` varchar(100) NOT NULL DEFAULT '',
	`truck_plate` varchar(50) NOT NULL DEFAULT '',
	`status` varchar(20) NOT NULL DEFAULT 'Completed',
	`remarks` varchar(500) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feed_stock_movement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `feed_stock` ADD CONSTRAINT `feed_stock_feed_product_id_feed_product_id_fk` FOREIGN KEY (`feed_product_id`) REFERENCES `feed_product`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feed_stock_movement` ADD CONSTRAINT `feed_stock_movement_feed_product_id_feed_product_id_fk` FOREIGN KEY (`feed_product_id`) REFERENCES `feed_product`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feed_stock_movement` ADD CONSTRAINT `feed_stock_movement_supplier_id_feed_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `feed_supplier`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feed_stock_movement` ADD CONSTRAINT `feed_stock_movement_farm_id_farm_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farm`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feed_stock_movement` ADD CONSTRAINT `feed_stock_movement_driver_id_driver_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `fsm_created_idx` ON `feed_stock_movement` (`created_at`);--> statement-breakpoint
CREATE INDEX `fsm_product_idx` ON `feed_stock_movement` (`feed_product_id`);--> statement-breakpoint
CREATE INDEX `fsm_type_idx` ON `feed_stock_movement` (`movement_type`);--> statement-breakpoint
CREATE INDEX `fsm_status_idx` ON `feed_stock_movement` (`status`);