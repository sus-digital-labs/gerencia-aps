CREATE TABLE `acs_perfil_microarea` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cnes` varchar(7),
	`ine` varchar(10),
	`nomeAcs` varchar(255) NOT NULL,
	`cnsAcs` varchar(15),
	`idadeAcs` int,
	`anosExperiencia` int DEFAULT 0,
	`latDomicilio` decimal(10,8),
	`lngDomicilio` decimal(11,8),
	`capacidadeMaxFamilias` int DEFAULT 450,
	`capacidadeMaxCidadaos` int DEFAULT 750,
	`ativo` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `acs_perfil_microarea_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `domicilios_microarea` (
	`id` int AUTO_INCREMENT NOT NULL,
	`microareaId` int,
	`coFamilia` varchar(20),
	`coProntuario` varchar(20),
	`nomeResponsavel` varchar(255),
	`endereco` text,
	`numero` varchar(20),
	`complemento` varchar(100),
	`bairro` varchar(100),
	`cep` varchar(9),
	`lat` decimal(10,8),
	`lng` decimal(11,8),
	`geocodificado` boolean DEFAULT false,
	`geocodificadoEm` timestamp,
	`totalCidadaos` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `domicilios_microarea_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `microarea_historico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`microareaId` int NOT NULL,
	`acao` varchar(50) NOT NULL,
	`descricao` text,
	`usuarioId` int,
	`dadosAnteriores` text,
	`dadosNovos` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `microarea_historico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `microareas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`codigo` varchar(20),
	`acsId` int,
	`cnes` varchar(7),
	`ine` varchar(10),
	`geojsonPoligono` text,
	`cor` varchar(7) DEFAULT '#3B82F6',
	`totalFamilias` int DEFAULT 0,
	`totalCidadaos` int DEFAULT 0,
	`areaKm2` decimal(10,4),
	`status` enum('ativa','inativa','excesso','baixa_cobertura') DEFAULT 'ativa',
	`geradaAutomaticamente` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `microareas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `domicilios_microarea` ADD CONSTRAINT `domicilios_microarea_microareaId_microareas_id_fk` FOREIGN KEY (`microareaId`) REFERENCES `microareas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `microarea_historico` ADD CONSTRAINT `microarea_historico_microareaId_microareas_id_fk` FOREIGN KEY (`microareaId`) REFERENCES `microareas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `microarea_historico` ADD CONSTRAINT `microarea_historico_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `microareas` ADD CONSTRAINT `microareas_acsId_acs_perfil_microarea_id_fk` FOREIGN KEY (`acsId`) REFERENCES `acs_perfil_microarea`(`id`) ON DELETE no action ON UPDATE no action;