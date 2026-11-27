ALTER TABLE `dispatch` ADD `arrival_date` date;--> statement-breakpoint
ALTER TABLE `dispatch` ADD `supplier_dr_number` varchar(60);--> statement-breakpoint
ALTER TABLE `dispatch` ADD `dr_received_date` date;--> statement-breakpoint
ALTER TABLE `dispatch` ADD `forwarded_accounting_date` date;--> statement-breakpoint
ALTER TABLE `dispatch` ADD `sale_invoice_number` varchar(60);--> statement-breakpoint
ALTER TABLE `dispatch` ADD `amount` decimal(14,2);--> statement-breakpoint
ALTER TABLE `dispatch` ADD `due_date` date;