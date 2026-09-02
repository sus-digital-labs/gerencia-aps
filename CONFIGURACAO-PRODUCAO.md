# Configuração para Produção - SUS Analytics Web

## Visão Geral

O sistema SUS Analytics Web está pronto para implantação no servidor Windows onde o e-SUS PEC está instalado. A conexão com o banco de dados PostgreSQL do PEC funciona via **localhost:5433** quando o painel web roda no mesmo servidor.

## Arquitetura Atual

```
┌─────────────────────────────────────────────────────┐
│         Servidor Windows (149.78.176.0)             │
│                                                      │
│  ┌──────────────────┐      ┌──────────────────┐   │
│  │   e-SUS PEC      │      │  PostgreSQL 9.6  │   │
│  │   (porta 8080)   │◄────►│  (porta 5433)    │   │
│  └──────────────────┘      └──────────────────┘   │
│                                      ▲              │
│                                      │              │
│  ┌──────────────────┐               │              │
│  │ SUS Analytics    │               │              │
│  │ Web (porta 3000) │───────────────┘              │
│  └──────────────────┘                               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Configuração do Banco de Dados

### Opção 1: Conexão Direta ao PEC (Recomendado para Produção)

**Configuração:**
```env
PEC_DB_HOST=localhost
PEC_DB_PORT=5433
PEC_DB_NAME=esus
PEC_DB_USER=esus_leitura
PEC_DB_PASSWORD=(senha configurada)
PEC_DB_SSL=false
```

**Vantagens:**
- Dados sempre atualizados em tempo real
- Sem necessidade de sincronização
- Menor uso de recursos

**Desvantagens:**
- Queries pesadas podem impactar performance do PEC
- Depende da disponibilidade do PEC

### Opção 2: Réplica PostgreSQL Docker (Recomendado para Alta Performance)

Uma réplica PostgreSQL 16 foi criada via Docker com Foreign Data Wrapper (FDW) conectado ao PEC 9.6.

**Configuração:**
```env
PEC_DB_HOST=localhost
PEC_DB_PORT=5500
PEC_DB_NAME=esus_replica
PEC_DB_USER=sus_analytics
PEC_DB_PASSWORD=SusAnalytics2026!Secure
PEC_DB_SSL=false
```

**Estrutura da Réplica:**
- 1.107 foreign tables via FDW (schema `pec_fdw`)
- 36 materialized views otimizadas (schemas `dados` e `public`)
- Search path configurado: `pec, dados, public, pec_fdw`
- Dados: 69.437 cidadãos, 411.294 atendimentos, 60.483 prontuários

**Vantagens:**
- Queries rápidas sem impactar PEC
- Materialized views pré-calculadas
- Isolamento completo do PEC

**Desvantagens:**
- Requer refresh periódico das materialized views
- Usa mais recursos (container Docker)

## Instalação e Deploy

### Pré-requisitos

1. **Node.js 22+** instalado no Windows
2. **pnpm** instalado globalmente: `npm install -g pnpm`
3. **PostgreSQL client** (psql) para testes de conexão
4. **Git** para clonar o repositório

### Passo a Passo

#### 1. Clonar Repositório

```bash
git clone <url-do-repositorio>
cd sus-analytics-web
```

#### 2. Instalar Dependências

```bash
pnpm install
```

#### 3. Configurar Variáveis de Ambiente

Criar arquivo `.env` na raiz do projeto:

```env
# Conexão com PostgreSQL do PEC
PEC_DB_HOST=localhost
PEC_DB_PORT=5433
PEC_DB_NAME=esus
PEC_DB_USER=esus_leitura
PEC_DB_PASSWORD=lq04WptK6vg5?IL*uWg*+BHQfpQWuZ
PEC_DB_SSL=false

# Outras variáveis já configuradas automaticamente
DATABASE_URL=(configurado automaticamente)
JWT_SECRET=(configurado automaticamente)
VITE_APP_ID=(configurado automaticamente)
```

#### 4. Testar Conexão com Banco

```bash
# Windows PowerShell
$env:PGPASSWORD="lq04WptK6vg5?IL*uWg*+BHQfpQWuZ"
psql -h localhost -p 5433 -U esus_leitura -d esus -c "SELECT count(*) FROM tb_cidadao;"
```

Deve retornar a contagem de cidadãos cadastrados.

#### 5. Build do Projeto

```bash
pnpm build
```

#### 6. Iniciar Servidor

```bash
pnpm start
```

O painel estará disponível em: `http://localhost:3000`

## Configuração como Serviço Windows

Para manter o painel rodando permanentemente, configure como serviço Windows usando **PM2**:

### Instalar PM2

```bash
npm install -g pm2
npm install -g pm2-windows-service
```

### Configurar Serviço

```bash
cd C:\caminho\para\sus-analytics-web
pm2 start npm --name "sus-analytics" -- start
pm2 save
pm2-service-install
```

### Gerenciar Serviço

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs sus-analytics

# Reiniciar
pm2 restart sus-analytics

# Parar
pm2 stop sus-analytics
```

## Firewall e Acesso Externo

### Situação Atual

O firewall do Windows Server está bloqueando conexões externas ao PostgreSQL (portas 5433 e 5500). Isso é **normal e recomendado** para segurança.

### Opções de Acesso Remoto

#### Opção 1: Túnel SSH (Mais Seguro)

Para desenvolvimento remoto, criar túnel SSH:

```bash
ssh -L 5433:localhost:5433 -p 2222 anton-server@149.78.176.0 -N
```

Depois conectar em `localhost:5433` do computador local.

#### Opção 2: Abrir Porta no Firewall (Não Recomendado)

Apenas se necessário, abrir porta no firewall do Windows:

```powershell
# PowerShell como Administrador
New-NetFirewallRule -DisplayName "PostgreSQL PEC" -Direction Inbound -LocalPort 5433 -Protocol TCP -Action Allow
```

**⚠️ Atenção:** Expor PostgreSQL na internet é um risco de segurança. Use apenas com VPN ou IP whitelist.

## Monitoramento e Manutenção

### Logs do Sistema

```bash
# Ver logs do servidor
pm2 logs sus-analytics

# Ver logs do PostgreSQL
# Windows: C:\Program Files\PostgreSQL\9.6\data\pg_log\
```

### Health Check

Endpoint de saúde do sistema:

```bash
curl http://localhost:3000/api/health
```

### Refresh de Materialized Views (se usar réplica)

Criar script PowerShell para refresh automático:

```powershell
# refresh-views.ps1
$env:PGPASSWORD="SusAnalytics2026!Secure"
psql -h localhost -p 5500 -U sus_analytics -d esus_replica -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fat_cidadao_pec;"
psql -h localhost -p 5500 -U sus_analytics -d esus_replica -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fat_atendimento_individual;"
# ... outras views
```

Agendar no Task Scheduler do Windows para rodar a cada 1 hora.

## Troubleshooting

### Erro: "Connection terminated unexpectedly"

**Causa:** Firewall bloqueando conexão ou credenciais incorretas.

**Solução:**
1. Verificar se PostgreSQL está rodando: `services.msc` → PostgreSQL
2. Testar conexão local: `psql -h localhost -p 5433 -U esus_leitura -d esus`
3. Verificar senha no arquivo de credenciais do PEC

### Erro: "Cannot find module 'pg'"

**Causa:** Dependências não instaladas.

**Solução:**
```bash
pnpm install
```

### Erro: "Port 3000 already in use"

**Causa:** Outra aplicação usando porta 3000.

**Solução:**
```bash
# Mudar porta no arquivo .env
PORT=3001
```

### Performance Lenta

**Causa:** Queries pesadas no banco do PEC.

**Solução:**
1. Usar réplica PostgreSQL com materialized views
2. Adicionar índices nas tabelas mais consultadas
3. Implementar cache Redis

## Backup e Recuperação

### Backup do Banco de Dados

```bash
# Backup completo
pg_dump -h localhost -p 5433 -U esus_leitura -d esus > backup_esus_$(date +%Y%m%d).sql

# Backup apenas schema
pg_dump -h localhost -p 5433 -U esus_leitura -d esus --schema-only > schema_esus.sql
```

### Restauração

```bash
psql -h localhost -p 5433 -U postgres -d esus < backup_esus_20260219.sql
```

## Contato e Suporte

Para dúvidas ou problemas:
- Documentação completa: `/docs`
- Issues: GitHub repository
- Email: suporte@exemplo.com

## Changelog

### 2026-02-19
- ✅ Integração com réplica PostgreSQL Docker concluída
- ✅ Variáveis de ambiente configuradas
- ✅ Documentação de produção criada
- ✅ Sistema pronto para deploy no servidor Windows
