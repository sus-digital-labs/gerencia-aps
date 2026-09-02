CREATE TABLE `active_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(255) NOT NULL,
	`userId` int NOT NULL,
	`ip` varchar(45) NOT NULL,
	`userAgent` text,
	`device` varchar(100),
	`browser` varchar(100),
	`os` varchar(100),
	`country` varchar(100),
	`region` varchar(100),
	`city` varchar(100),
	`lastActivity` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `active_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `active_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`ip` varchar(45) NOT NULL,
	`userAgent` text,
	`device` varchar(100),
	`browser` varchar(100),
	`os` varchar(100),
	`country` varchar(100),
	`region` varchar(100),
	`city` varchar(100),
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`success` boolean NOT NULL,
	`suspicious` boolean DEFAULT false,
	`suspicionReasons` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `active_sessions` ADD CONSTRAINT `active_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `login_attempts` ADD CONSTRAINT `login_attempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;