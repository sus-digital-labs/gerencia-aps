import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ===================================
// Tabelas de rastreio de login
// ===================================

export const loginAttempts = mysqlTable("login_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  ip: varchar("ip", { length: 45 }).notNull(),
  userAgent: text("userAgent"),
  device: varchar("device", { length: 100 }),
  browser: varchar("browser", { length: 100 }),
  os: varchar("os", { length: 100 }),
  country: varchar("country", { length: 100 }),
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  success: boolean("success").notNull(),
  suspicious: boolean("suspicious").default(false),
  suspicionReasons: text("suspicionReasons"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const activeSessions = mysqlTable("active_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 255 }).notNull().unique(),
  userId: int("userId").references(() => users.id).notNull(),
  ip: varchar("ip", { length: 45 }).notNull(),
  userAgent: text("userAgent"),
  device: varchar("device", { length: 100 }),
  browser: varchar("browser", { length: 100 }),
  os: varchar("os", { length: 100 }),
  country: varchar("country", { length: 100 }),
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),
  lastActivity: timestamp("lastActivity").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;
export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = typeof activeSessions.$inferInsert;

// ===================================
// Tabelas Multi-Tenant
// ===================================

export const parceiros = mysqlTable("parceiros", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }).unique(),
  email: varchar("email", { length: 320 }),
  status: mysqlEnum("status", ["ativo", "inativo", "suspenso"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const municipios = mysqlTable("municipios", {
  id: int("id").autoincrement().primaryKey(),
  codigoIbge: varchar("codigoIbge", { length: 7 }).notNull().unique(),
  nome: varchar("nome", { length: 255 }).notNull(),
  uf: varchar("uf", { length: 2 }).notNull(),
  parceiroId: int("parceiroId").references(() => parceiros.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  status: mysqlEnum("status", ["ativo", "inativo", "suspenso"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const sincronizacoes = mysqlTable("sincronizacoes", {
  id: int("id").autoincrement().primaryKey(),
  municipioId: int("municipioId").references(() => municipios.id).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  lagSeconds: decimal("lagSeconds", { precision: 10, scale: 2 }),
  bytesSent: int("bytesSent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type Parceiro = typeof parceiros.$inferSelect;
export type InsertParceiro = typeof parceiros.$inferInsert;
export type Municipio = typeof municipios.$inferSelect;
export type InsertMunicipio = typeof municipios.$inferInsert;
export type Sincronizacao = typeof sincronizacoes.$inferSelect;
export type InsertSincronizacao = typeof sincronizacoes.$inferInsert;

// ===================================
// NOVO MODELO HIERÁRQUICO DE TERRITÓRIO
// Município → Território → Área (UBS) → Microárea (ACS) → Família → Cidadão
// ===================================

/**
 * Configuração de limites por município (baseado na PNAB/Portaria 2.436/2017)
 * Permite flexibilidade para municípios pequenos ou grandes centros
 */
export const configuracaoTerritorio = mysqlTable("configuracao_territorio", {
  id: int("id").autoincrement().primaryKey(),
  municipioId: int("municipioId").references(() => municipios.id),
  codigoIbge: varchar("codigoIbge", { length: 7 }),
  nomeMunicipio: varchar("nomeMunicipio", { length: 255 }),
  // Limites PNAB configuráveis
  limiteFamiliasPorAcs: int("limiteFamiliasPorAcs").default(150),
  limiteCidadaosPorAcs: int("limiteCidadaosPorAcs").default(750),
  limiteAreaKm2PorAcs: decimal("limiteAreaKm2PorAcs", { precision: 10, scale: 4 }),
  // Configuração do provedor de mapa
  mapProvider: varchar("mapProvider", { length: 20 }).default("free"), // 'free' | 'google'
  googleMapsApiKey: varchar("googleMapsApiKey", { length: 255 }),
  mapTileStyle: varchar("mapTileStyle", { length: 50 }).default("carto-dark"), // 'carto-dark' | 'carto-light' | 'osm' | 'google-roadmap' | 'google-satellite' | 'google-hybrid'
  // Coordenadas do município para centralizar o mapa
  latCentro: decimal("latCentro", { precision: 10, scale: 8 }),
  lngCentro: decimal("lngCentro", { precision: 11, scale: 8 }),
  zoomInicial: int("zoomInicial").default(13),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Território: agrupamento de áreas dentro de um município
 */
export const territorios = mysqlTable("territorios", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  codigo: varchar("codigo", { length: 20 }),
  municipioId: int("municipioId").references(() => municipios.id),
  codigoIbge: varchar("codigoIbge", { length: 7 }),
  geojsonPoligono: text("geojsonPoligono"),
  cor: varchar("cor", { length: 7 }).default("#3B82F6"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Área: corresponde à área de abrangência de uma UBS
 */
export const areas = mysqlTable("areas", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  codigo: varchar("codigo", { length: 20 }),
  territorioId: int("territorioId").references(() => territorios.id),
  // Dados da UBS
  cnes: varchar("cnes", { length: 7 }),
  nomeUbs: varchar("nomeUbs", { length: 255 }),
  latUbs: decimal("latUbs", { precision: 10, scale: 8 }),
  lngUbs: decimal("lngUbs", { precision: 11, scale: 8 }),
  geojsonPoligono: text("geojsonPoligono"),
  cor: varchar("cor", { length: 7 }).default("#10B981"),
  totalMicroareas: int("totalMicroareas").default(0),
  totalFamilias: int("totalFamilias").default(0),
  totalCidadaos: int("totalCidadaos").default(0),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Perfil do ACS (Agente Comunitário de Saúde)
 */
export const acsPerfil = mysqlTable("acs_perfil", {
  id: int("id").autoincrement().primaryKey(),
  cns: varchar("cns", { length: 15 }),
  cpf: varchar("cpf", { length: 14 }),
  nome: varchar("nome", { length: 255 }).notNull(),
  cnes: varchar("cnes", { length: 7 }),
  ine: varchar("ine", { length: 10 }),
  areaId: int("areaId").references(() => areas.id),
  // Localização do domicílio do ACS (para cálculo de distância)
  latDomicilio: decimal("latDomicilio", { precision: 10, scale: 8 }),
  lngDomicilio: decimal("lngDomicilio", { precision: 11, scale: 8 }),
  // Capacidade configurável
  capacidadeMaxFamilias: int("capacidadeMaxFamilias").default(150),
  capacidadeMaxCidadaos: int("capacidadeMaxCidadaos").default(750),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Microárea: unidade mínima de território, vinculada a um ACS
 * Campo `locked` impede redistribuições automáticas
 */
export const microareas = mysqlTable("microareas", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  codigo: varchar("codigo", { length: 20 }),
  areaId: int("areaId").references(() => areas.id),
  acsId: int("acsId").references(() => acsPerfil.id),
  geojsonPoligono: text("geojsonPoligono"),
  cor: varchar("cor", { length: 7 }).default("#3B82F6"),
  // Campo locked: impede redistribuições automáticas
  locked: boolean("locked").default(false),
  // Estatísticas calculadas
  totalFamilias: int("totalFamilias").default(0),
  totalCidadaos: int("totalCidadaos").default(0),
  areaKm2: decimal("areaKm2", { precision: 10, scale: 4 }),
  densidadePopulacional: decimal("densidadePopulacional", { precision: 10, scale: 4 }),
  // Status baseado nos limites PNAB
  status: mysqlEnum("status", ["normal", "excesso", "baixa_cobertura", "vazia"]).default("normal"),
  geradaAutomaticamente: boolean("geradaAutomaticamente").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Família/Domicílio: entidade unificada
 * Cada família possui um endereço único (domicílio) e centraliza a lat/lon de todos os cidadãos
 * O id da família é a referência única do domicílio
 */
export const familias = mysqlTable("familias", {
  id: int("id").autoincrement().primaryKey(),
  // Código do PEC
  coFamilia: varchar("coFamilia", { length: 20 }),
  coProntuario: varchar("coProntuario", { length: 20 }),
  microareaId: int("microareaId").references(() => microareas.id),
  // Responsável familiar
  nomeResponsavel: varchar("nomeResponsavel", { length: 255 }),
  cnsResponsavel: varchar("cnsResponsavel", { length: 15 }),
  // Endereço (domicílio unificado)
  logradouro: varchar("logradouro", { length: 255 }),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 100 }),
  bairro: varchar("bairro", { length: 100 }),
  municipio: varchar("municipio", { length: 100 }),
  uf: varchar("uf", { length: 2 }),
  cep: varchar("cep", { length: 9 }),
  enderecoCompleto: text("enderecoCompleto"),
  // Coordenadas do domicílio
  lat: decimal("lat", { precision: 10, scale: 8 }),
  lng: decimal("lng", { precision: 11, scale: 8 }),
  geocodificado: boolean("geocodificado").default(false),
  geocodificadoEm: timestamp("geocodificadoEm"),
  fonteCoordenada: mysqlEnum("fonteCoordenada", ["cidadao", "familia", "geocodificado", "manual"]).default("geocodificado"),
  // Estatísticas
  totalCidadaos: int("totalCidadaos").default(0),
  // Grupos prioritários presentes na família
  temCrianca: boolean("temCrianca").default(false),
  temIdoso: boolean("temIdoso").default(false),
  temGestante: boolean("temGestante").default(false),
  temDiabetico: boolean("temDiabetico").default(false),
  temHipertenso: boolean("temHipertenso").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Cidadão: vinculado à família
 * Herda coordenadas da família quando não possui lat/lon próprio
 */
export const cidadaos = mysqlTable("cidadaos_territorio", {
  id: int("id").autoincrement().primaryKey(),
  // Código do PEC
  cns: varchar("cns", { length: 15 }),
  cpf: varchar("cpf", { length: 14 }),
  familiaId: int("familiaId").references(() => familias.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  dataNascimento: timestamp("dataNascimento"),
  sexo: mysqlEnum("sexo", ["M", "F", "I"]),
  // Coordenadas próprias (se disponíveis)
  lat: decimal("lat", { precision: 10, scale: 8 }),
  lng: decimal("lng", { precision: 11, scale: 8 }),
  // Coordenadas efetivas (próprias ou herdadas da família)
  latEfetivo: decimal("latEfetivo", { precision: 10, scale: 8 }),
  lngEfetivo: decimal("lngEfetivo", { precision: 11, scale: 8 }),
  coordenadaHerdada: boolean("coordenadaHerdada").default(false),
  // Grupos de risco
  eGestante: boolean("eGestante").default(false),
  eDiabetico: boolean("eDiabetico").default(false),
  eHipertenso: boolean("eHipertenso").default(false),
  eIdoso: boolean("eIdoso").default(false), // >= 60 anos
  eCrianca: boolean("eCrianca").default(false), // < 10 anos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ===================================
// Auditoria e Redistribuição
// ===================================

/**
 * Log de todas as ações de redistribuição territorial
 */
export const redistribuicaoLogs = mysqlTable("redistribuicao_logs", {
  id: int("id").autoincrement().primaryKey(),
  acao: mysqlEnum("acao", [
    "redistribuicao_automatica",
    "redistribuicao_manual",
    "transferencia_familia",
    "ajuste_fronteira",
    "bloqueio_microarea",
    "desbloqueio_microarea",
    "geracao_automatica",
    "rollback"
  ]).notNull(),
  microareaOrigemId: int("microareaOrigemId").references(() => microareas.id),
  microareaDestinoId: int("microareaDestinoId").references(() => microareas.id),
  familiaId: int("familiaId").references(() => familias.id),
  usuarioId: int("usuarioId").references(() => users.id),
  descricao: text("descricao"),
  dadosAnteriores: text("dadosAnteriores"), // JSON snapshot
  dadosNovos: text("dadosNovos"), // JSON snapshot
  revertido: boolean("revertido").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Solicitações de transferência entre ACS
 * ACS pode solicitar famílias de outra microárea; o ACS que cede recebe notificação
 */
export const transferenciaSolicitacoes = mysqlTable("transferencia_solicitacoes", {
  id: int("id").autoincrement().primaryKey(),
  microareaOrigemId: int("microareaOrigemId").references(() => microareas.id).notNull(),
  microareaDestinoId: int("microareaDestinoId").references(() => microareas.id).notNull(),
  acsOrigemId: int("acsOrigemId").references(() => acsPerfil.id),
  acsDestinoId: int("acsDestinoId").references(() => acsPerfil.id),
  familiaId: int("familiaId").references(() => familias.id),
  motivo: text("motivo"),
  status: mysqlEnum("status", ["pendente", "aceita", "negada", "em_discussao", "cancelada"]).default("pendente"),
  respostaMotivo: text("respostaMotivo"),
  solicitanteId: int("solicitanteId").references(() => users.id),
  aprovadorId: int("aprovadorId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Mensagens de chat vinculadas a uma solicitação de transferência
 */
export const transferenciaMensagens = mysqlTable("transferencia_mensagens", {
  id: int("id").autoincrement().primaryKey(),
  solicitacaoId: int("solicitacaoId").references(() => transferenciaSolicitacoes.id).notNull(),
  usuarioId: int("usuarioId").references(() => users.id).notNull(),
  mensagem: text("mensagem").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ===================================
// Tabelas legadas (mantidas para compatibilidade)
// ===================================

export const acsPerfilMicroarea = mysqlTable("acs_perfil_microarea", {
  id: int("id").autoincrement().primaryKey(),
  cnes: varchar("cnes", { length: 7 }),
  ine: varchar("ine", { length: 10 }),
  nomeAcs: varchar("nomeAcs", { length: 255 }).notNull(),
  cnsAcs: varchar("cnsAcs", { length: 15 }),
  idadeAcs: int("idadeAcs"),
  anosExperiencia: int("anosExperiencia").default(0),
  latDomicilio: decimal("latDomicilio", { precision: 10, scale: 8 }),
  lngDomicilio: decimal("lngDomicilio", { precision: 11, scale: 8 }),
  capacidadeMaxFamilias: int("capacidadeMaxFamilias").default(450),
  capacidadeMaxCidadaos: int("capacidadeMaxCidadaos").default(750),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const domiciliosMicroarea = mysqlTable("domicilios_microarea", {
  id: int("id").autoincrement().primaryKey(),
  microareaId: int("microareaId").references(() => microareas.id),
  coFamilia: varchar("coFamilia", { length: 20 }),
  coProntuario: varchar("coProntuario", { length: 20 }),
  nomeResponsavel: varchar("nomeResponsavel", { length: 255 }),
  endereco: text("endereco"),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 100 }),
  bairro: varchar("bairro", { length: 100 }),
  cep: varchar("cep", { length: 9 }),
  lat: decimal("lat", { precision: 10, scale: 8 }),
  lng: decimal("lng", { precision: 11, scale: 8 }),
  geocodificado: boolean("geocodificado").default(false),
  geocodificadoEm: timestamp("geocodificadoEm"),
  totalCidadaos: int("totalCidadaos").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const microareaHistorico = mysqlTable("microarea_historico", {
  id: int("id").autoincrement().primaryKey(),
  microareaId: int("microareaId").references(() => microareas.id).notNull(),
  acao: varchar("acao", { length: 50 }).notNull(),
  descricao: text("descricao"),
  usuarioId: int("usuarioId").references(() => users.id),
  dadosAnteriores: text("dadosAnteriores"),
  dadosNovos: text("dadosNovos"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ===================================
// Tipos exportados
// ===================================

export type AcsPerfilMicroarea = typeof acsPerfilMicroarea.$inferSelect;
export type InsertAcsPerfilMicroarea = typeof acsPerfilMicroarea.$inferInsert;
export type DomicilioMicroarea = typeof domiciliosMicroarea.$inferSelect;
export type InsertDomicilioMicroarea = typeof domiciliosMicroarea.$inferInsert;
export type MicroareaHistorico = typeof microareaHistorico.$inferSelect;
export type InsertMicroareaHistorico = typeof microareaHistorico.$inferInsert;

export type ConfiguracaoTerritorio = typeof configuracaoTerritorio.$inferSelect;
export type InsertConfiguracaoTerritorio = typeof configuracaoTerritorio.$inferInsert;
export type Territorio = typeof territorios.$inferSelect;
export type InsertTerritorio = typeof territorios.$inferInsert;
export type Area = typeof areas.$inferSelect;
export type InsertArea = typeof areas.$inferInsert;
export type AcsPerfil = typeof acsPerfil.$inferSelect;
export type InsertAcsPerfil = typeof acsPerfil.$inferInsert;
export type Microarea = typeof microareas.$inferSelect;
export type InsertMicroarea = typeof microareas.$inferInsert;
export type Familia = typeof familias.$inferSelect;
export type InsertFamilia = typeof familias.$inferInsert;
export type Cidadao = typeof cidadaos.$inferSelect;
export type InsertCidadao = typeof cidadaos.$inferInsert;
export type RedistribuicaoLog = typeof redistribuicaoLogs.$inferSelect;
export type InsertRedistribuicaoLog = typeof redistribuicaoLogs.$inferInsert;
export type TransferenciaSolicitacao = typeof transferenciaSolicitacoes.$inferSelect;
export type InsertTransferenciaSolicitacao = typeof transferenciaSolicitacoes.$inferInsert;
export type TransferenciaMensagem = typeof transferenciaMensagens.$inferSelect;
export type InsertTransferenciaMensagem = typeof transferenciaMensagens.$inferInsert;
