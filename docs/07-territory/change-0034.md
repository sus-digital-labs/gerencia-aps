# Change control da migration 0034

**Migration:** `0034_territory_retention_crypto_shredding.up.sql`

**Status:** `MIGRATION_STAGING_AUTHORIZED=false`
**Classificação:** **blocked**

A migration foi aplicada somente no PostgreSQL descartável local `territory-geocode-pg-hardening`. Não existe nesta execução ticket, change request, aprovador, janela, backup autorizado ou evidência de restore para staging institucional. Portanto, é proibido aplicar a migration em staging ou produção.

## Prechecks exigidos antes de uma aplicação autorizada

Confirmar banco e ambiente, backup verificável, restore testado, versão PostgreSQL, espaço, locks, conexões, role não superusuária, RLS, histórico de migrations, checksum, readiness, external calls zero e credencial PEC read-only.

## Registro obrigatório

Após aprovação, registrar `change_id`, aprovador, janela, ambiente, backup, checksum, SHA, plano de rollback, timestamp, comandos, exit codes, duração, locks, erros e resultado. Nenhum segredo ou credential deve aparecer no registro.
