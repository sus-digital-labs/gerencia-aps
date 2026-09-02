# Runbook — tentativa de escrita PEC ou violação de escopo

## Detecção

Acionar este runbook quando houver SQLSTATE de escrita na conexão PEC, métrica `pec_write > 0`, `external_calls > 0` fora de janela autorizada, leitura cross-tenant ou falha de policy RLS.

## Contenção

Interromper o processo Rust de importação, bloquear a rota de sincronização no BFF e preservar os logs técnicos com trace id. Não tentar corrigir concedendo privilégios adicionais à role fonte. Não executar SQL manual na fonte.

## Diagnóstico

Verificar a role efetiva, grants em `information_schema.role_table_grants`, `pg_has_role`, `current_user`, `current_setting('app.tenant_id', true)` e os contadores Prometheus. Repetir somente em réplica descartável. Consultar o audit log sem imprimir payload.

## Recuperação

Se a fonte sofreu qualquer escrita confirmada, abrir incidente de segurança e congelar promoção. Se a falha foi apenas ausência de contexto RLS no alvo, corrigir o caminho Rust para usar `scoped_transaction` e repetir os testes cross-scope. Em ambos os casos, publicar evidência before/after/delta e obter aprovação antes de retomar.

## Aceite

O incidente só pode ser encerrado com seis operações negativas PEC negadas, cinco casos RLS aprovados, `external_calls=0`, `pec_write=0`, sem PII em logs e revisão técnica registrada.
