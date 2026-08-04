CREATE TABLE `foods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`base_qty` real NOT NULL,
	`kcal` real NOT NULL,
	`protein_g` real NOT NULL,
	`default_qty` real NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `foods_name_idx` ON `foods` (`name`);--> statement-breakpoint
ALTER TABLE `meal_logs` ADD `food_id` integer REFERENCES foods(id);--> statement-breakpoint
ALTER TABLE `meal_logs` ADD `quantity` real;