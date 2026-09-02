# RLS territorial

## Evidência local

A RLS foi exercitada no PostgreSQL descartável com role não superusuária. Sessão sem settings de escopo retornou zero ou acesso negado; tenant A/município A retornou somente A; tenant B/município B retornou somente B; tentativa de recurso conhecido de B a partir de A foi bloqueada.

As tabelas de retenção usam políticas fail-closed quando os settings de tenant ou município não estão definidos. O worker sempre carrega escopo de tenant e município nas mutações destrutivas.

## Staging autorizado

Repetir com a role real de runtime, confirmando que ela não é superuser, não possui `BYPASSRLS`, não é owner das tabelas e não recebeu grants globais. Validar viewport, qualidade, planos, publicação, retenção, evidências, backfill e auditoria. Esta etapa é **blocked** sem acesso e change approval de staging.
