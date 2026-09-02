CREATE TABLE `municipios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigoIbge` varchar(7) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`uf` varchar(2) NOT NULL,
	`parceiroId` int,
	`token` varchar(255) NOT NULL,
	`status` enum('ativo','inativo','suspenso') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `municipios_id` PRIMARY KEY(`id`),
	CONSTRAINT `municipios_codigoIbge_unique` UNIQUE(`codigoIbge`),
	CONSTRAINT `municipios_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `parceiros` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cnpj` varchar(18),
	`email` varchar(320),
	`status` enum('ativo','inativo','suspenso') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parceiros_id` PRIMARY KEY(`id`),
	CONSTRAINT `parceiros_cnpj_unique` UNIQUE(`cnpj`)
);
--> statement-breakpoint
CREATE TABLE `sincronizacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`municipioId` int NOT NULL,
	`status` varchar(50) NOT NULL,
	`lagSeconds` decimal(10,2),
	`bytesSent` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sincronizacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `municipios` ADD CONSTRAINT `municipios_parceiroId_parceiros_id_fk` FOREIGN KEY (`parceiroId`) REFERENCES `parceiros`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sincronizacoes` ADD CONSTRAINT `sincronizacoes_municipioId_municipios_id_fk` FOREIGN KEY (`municipioId`) REFERENCES `municipios`(`id`) ON DELETE no action ON UPDATE no action;