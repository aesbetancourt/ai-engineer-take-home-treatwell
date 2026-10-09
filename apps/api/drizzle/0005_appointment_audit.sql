CREATE TABLE `appointment_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`appointment_id` integer NOT NULL,
	`action` text NOT NULL,
	`at` text NOT NULL,
	`changes` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `appointment_audit_appointment_id_idx` ON `appointment_audit` (`appointment_id`);