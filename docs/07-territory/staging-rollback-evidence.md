# Evidência de rollback da migration 0034

**Status:** `ROLLBACK_STAGING_AUTHORIZED=false` e **blocked**.

O arquivo `0034_territory_retention_crypto_shredding.down.sql` existe e foi revisado como reversível no escopo das tabelas criadas. Isso é evidência **source**, não prova de rollback runtime.

## Procedimento autorizado

Registrar baseline, aplicar 0034, validar schema/constraints/índices/RLS/retention/legal hold/crypto-shredding/health/readiness/metrics/multi-role, executar rollback, validar schema anterior, subir runtime compatível, repetir health/ready/queries/RLS, reaplicar 0034 e executar smoke final.

Registrar timestamp, comando, exit code, duração, checksum, locks, erros e resultado. Não executar este procedimento sem change approval, backup verificável e janela operacional.
