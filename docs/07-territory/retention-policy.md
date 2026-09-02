# Retenção e crypto-shredding

## Status do ciclo

> **BLOQUEADO — não implementado neste ciclo.**

O read model territorial possui metadados de snapshot e evidências de endereço, mas ainda não existe worker Rust de retenção com lease, estados auditáveis ou legal hold. Também não foi executado smoke end-to-end de destruição de chave e falha de decriptação.

## Contrato obrigatório para implementação

O worker deverá operar em Rust, utilizar lease renovável e ser idempotente. Os estados mínimos são `scheduled`, `running`, `completed`, `failed` e `legal_hold`. Cada execução deve ter `run_id`, tenant, município, janela, motivo, contagem agregada, duração, resultado e hash de auditoria sem PII.

A retenção deverá ser aplicada a snapshots, evidências de coordenadas, ciphertexts de provider e nonces de replay conforme política aprovada. A operação deve ser fail-closed quando existir `legal_hold`, quando a chave não puder ser resolvida ou quando o lease estiver expirado.

## Crypto-shredding

A implementação futura deve usar chave por tenant ou domínio de endereço, com `key_id` persistido junto ao ciphertext. O smoke mínimo deverá criptografar uma evidência sintética, destruir a chave, verificar que a leitura falha com erro controlado e confirmar que nenhum plaintext foi emitido em logs, métricas ou respostas.

## Critério de desbloqueio

Não promover enquanto o worker não existir, o lease não estiver testado sob concorrência, a auditoria não for append-only e o smoke real de destruição de chave não estiver anexado ao checklist de release.
