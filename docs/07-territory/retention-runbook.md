# Runbook de retenção territorial

O worker Rust processa os estados `scheduled`, `leased`, `running`, `completed`, `failed` e `legal_hold`. A reivindicação usa `FOR UPDATE SKIP LOCKED`, lease owner opaco e expiração recuperável.

## Execução segura

Executar somente com `RUNTIME_MODE=dry_run`, `PEC_WRITE_ALLOWED=false`, `GEOCODE_EXTERNAL_PROVIDER_ENABLED=false` e conexão target autorizada. O worker não acessa o PEC para escrita.

## Legal hold

Itens com legal hold não têm ciphertext removido nem chave destruída. O run termina em `legal_hold` e pode ser reavaliado idempotentemente depois da liberação institucional. A destruição de chave falha fechada quando a metadata key também está sob hold.

## Crypto-shredding

O fluxo é: ciphertext persistido, abertura válida antes da expiração, expiração elegível, destruição da chave, remoção do ciphertext e tentativa posterior de abertura retornando `EVIDENCE_KEY_DESTROYED`. Retry não repete destruição nem remove evidência protegida.

## Crash/restart

Run em `running` com lease expirado pode ser reivindicado novamente. A publicação de snapshot não é parte da operação destrutiva; o estado final é persistido de forma transacional. O smoke local confirmou que não restou snapshot parcial ativo.

## Observabilidade

Counters: `territory_retention_jobs_total`, `territory_crypto_shredded_total`, `territory_access_denied_total`, `territory_external_calls_total`. Histogram: `territory_retention_claim_duration_seconds`. Logs não contêm PII, tokens, chaves, endereços ou coordenadas individuais.
