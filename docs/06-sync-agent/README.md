# Sync Agent — Documentação de Referência (Agente Rust)

> **LEI DE ESTRUTURA**
>
> O agente de sincronização real é **Rust** (`Apps/agent/pec-agent-sync/`), compilado como `.exe` para instalação nos municípios.
> `Apps/sync-agent/` é um módulo TypeScript **legado** (scaffold do Gate 1 histórico, 2026-04-29) e não representa o agente de campo.
>
> Esta pasta de documentação descreve a **arquitetura e protocolos** do agente — aplica-se ao agente Rust atual.
>
> **Módulos Rust do agente:**
> - `Apps/agent/pec-agent-sync/` — agente principal (sync incremental PEC → servidor)
> - `Apps/agent/pec-bootstrap-agent/` — agente de setup inicial

---

# Sync Agent (Local e-SUS PEC)

## Objetivo

Definir e preparar o Agente de Sincronização Local para instalações e-SUS PEC, com foco em segurança, incrementalidade e operação multiinstalação/multimunicípio.

## Responsabilidades

- descoberta local de configuração de acesso ao PEC;
- leitura segura e **read-only**;
- planejamento de sync incremental por checkpoints;
- emissão de health/freshness e eventos técnicos;
- envio de dados sincronizados sem credenciais.

## Não responsabilidades (neste gate)

- sync completo em produção;
- execução de LEDI;
- escrita direta no banco PEC;
- coleta/versionamento de credenciais reais.

## Arquitetura geral

- agente local por instalação;
- mapeamento `tenant/installation/municipality`;
- suporte mono e multimunicípio;
- fila local offline + retry idempotente;
- throttle/backpressure para proteção do PEC.

## Relação com servidor central

- envia apenas dados sincronizados, health/freshness e eventos técnicos;
- não envia senha/token de banco PEC;
- comunicação autenticada e com TLS.

## Relação com PEC

- descoberta local de credenciais;
- conexão preferencial read-only;
- extração incremental com checkpoints por tabela.

## Status

- Gate 0: scaffold seguro concluído;
- Gate 1: handshake mínimo agente-servidor + heartbeat autenticado implementados;
- ainda fora de escopo: sync incremental real e LEDI.

## Gate 1 implementado

- identidade local segura com token aleatório por instalação;
- armazenamento local gitignored em `Apps/sync-agent/local-state/*`;
- fingerprint SHA-256 do token para registro no servidor;
- endpoints HTTP no runtime canônico:
  - `POST /api/agents/register`
  - `POST /api/agents/heartbeat`
  - `GET /api/agents/me`
- validação anti-vazamento de payload sensível no handshake/heartbeat;
- smoke dedicado: `pnpm run smoke:agent`.

## Documentos desta pasta

- `credential-discovery.md`
- `incremental-sync-strategy.md`
- `multimunicipality-detection.md`
- `security-model.md`
- `checkpoints-and-freshness.md`
- `reference-reseed-runbook.md`
- `agent-server-protocol.md`
- `agent-identity.md`

## Histórico e rastreabilidade

**Gate 1.0.1 — Nota histórica de commits**:
- **b6f476b** (`build(runtime): start source-first convergence`): contém **implementação completa** do Gate 1 (agent identity, token, endpoints, handshake, testes).
- **3f330fd** (`feat(sync-agent): add secure agent identity and heartbeat handshake`): restaurou Strategy C (build honesto FAIL) + refinamento documental. Mensagem imprecisa, mas estado final funcional.
- **Tag Gate 1**: `sus-analytics-sync-agent-g1-handshake-20260429` aponta para 3f330fd (correto).
- **Razão da preservação**: não foi feito rebase/amend para manter rastreabilidade de auditoria.
- **Validação**: 50/50 testes OK, 9/9 agent:sync:test OK, lint OK, build FAIL honesto por Strategy C.
- **Audit report**: `docs/audit-gate1.0.1-integrity-report.md`.

## Próximos passos

1. persistência durável de registros de agente (hoje in-memory no runtime legado);
2. handshake com rotação de chave/token por política centralizada;
3. leitura incremental real por tabela prioritária (ainda sem LEDI).


---

## Estado canônico S05 — 2026-08-26

O runtime Rust atual já contém leitura incremental read-only, cursor/checkpoint tipado, RAW/outbox local protegido, envio gzip para `POST /v1/sync/batches`, autenticação com binding de agente/tenant/município, persistência durável no PostgreSQL, fallback de backlog, normalização com retry/lease e observabilidade sanitizada. Os itens descritos em “ainda fora de escopo” no histórico acima devem ser lidos como registro do Gate 1 legado, não como descrição do código atual.

O caminho TypeScript legado continua preservado para compatibilidade e desenvolvimento, mas não é autoridade do receiver gzip nem do normalizer Rust. Mudanças de contrato pertencem ao owner S06; schemas e migrações pertencem ao owner S03; integração, promoção e decisão de cutover pertencem ao S10.

O estado atual não declara homologação completa, materialização C2 real, escala nacional, produção ou full drain. Qualquer operação com fonte PEC real requer a autorização literal correspondente, change record bounded, preflight, métricas mínimas, critérios de abort e rollback forward-only. As provas do S05 devem permanecer sintéticas e sanitizadas.
