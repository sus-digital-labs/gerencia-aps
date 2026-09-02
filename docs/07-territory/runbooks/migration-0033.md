# Runbook — migration 0033 territorial

## Pré-condições

A migration só pode ser aplicada em staging ou produção após change approval, backup verificável e confirmação do ambiente. Confirmar que o banco alvo é o ambiente autorizado, que não existe conexão de escrita PEC envolvida e que a janela de lock foi comunicada.

## Execução

Registrar horário de início, executor, commit SHA, checksum da migration, `pg_stat_activity`, locks ativos e duração. Executar com `ON_ERROR_STOP=1` e timeout de lock compatível com a janela. Validar criação das funções de contexto, sete tabelas com RLS `enabled=true` e `forced=true`, policies de `USING/WITH CHECK`, índice de snapshot ativo e índice de identidade de importação.

## Validação

Rodar leituras dentro e fora do escopo, tentativas de insert cross-tenant/cross-município, consulta sem contexto, smoke de importação, smoke do mapa, readiness e rollback. Conferir `external_calls=0`, `pec_write=false`, ausência de PII em logs e delta das métricas.

## Rollback

Se a migration falhar, não aplicar comandos ad hoc em produção. Usar o plano aprovado de rollback e o backup verificado. Se houver dados territoriais já publicados, preservar o histórico e bloquear novas publicações até a revisão. O rollback funcional do domínio deve ocorrer por publicação append-only, não por apagar evidência.

## Estado deste ciclo

A migration foi aplicada e reaplicada somente no container local descartável `territory-geocode-pg-hardening`, com backups custom-format antes das operações. Não houve staging autorizado, change approval ou aplicação em produção.
