ALTER TABLE `farm` ADD `particulars_memory_id` varchar(36);--> statement-breakpoint
ALTER TABLE `farm` ADD CONSTRAINT `farm_particulars_memory_id_particulars_memory_id_fk` FOREIGN KEY (`particulars_memory_id`) REFERENCES `particulars_memory`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `farm_particulars_memory_idx` ON `farm` (`particulars_memory_id`);