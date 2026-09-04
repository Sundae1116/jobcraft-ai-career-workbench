CREATE TABLE `candidate_file` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`kind` text NOT NULL,
	`filename` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE no action
);
