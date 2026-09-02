# Edge State field encryption v2

Status: implementação Windows validada localmente; implementação Linux validada
em gate descartável com D-Bus e Secret Service real.

Isto é criptografia de campos, não do arquivo SQLite inteiro. Payloads,
decisões, policies, comandos, lease tokens e resultados usam AES-256-GCM. O
schema, IDs operacionais, hashes, cursores, contagens, timestamps, estados,
attempts, sequences e `key_version` permanecem visíveis.

Windows protege a DEK com DPAPI da conta do serviço. Linux usa Secret Service
via `keyring 3.6.3` (MIT/Apache-2.0) e D-Bus. Ausência de daemon, coleção
desbloqueada ou entry correta falha fechada; não há env/argv, chmod-only,
Base64, XOR ou chave plaintext.

`key_version=1` fica em `key_info`. Rotação futura deve criar nova DEK no
keystore, recriptografar em cópia/transação verificada e mudar sentinela/versão
somente após `integrity_check`. Backup restaura apenas com a mesma entry e
identidade do keystore; copiar somente SQLite falha na sentinela. Migração de
host/service-account exige canal administrativo protegido e validação da cópia;
o agente não exporta a chave. Perda da chave é irrecuperável. Crypto-shredding
remove definitivamente a entry após retenção/autorização, tornando ciphertext
inacessível sem apagar metadados visíveis.

Restore: parar serviço, preservar SQLite/WAL/SHM, restaurar keystore sob a mesma
identidade, abrir cópia com chave correta, exigir falha com chave incorreta,
executar `integrity_check`, recuperar um RAW e só então fazer cutover. Nunca
executar dois agentes simultaneamente.

Gate Linux de 2026-08-12: `rust:1.88-bookworm`, digest
`sha256:af306cfa71d987911a781c37b59d7d67d934f49684058f96cf72079c3626bfe0`;
`keyring 3.6.3` (MIT/Apache-2.0), D-Bus e `gnome-keyring`/Secret Service do
Debian Bookworm (`dbus 1.14.10-1~deb12u1`, `gnome-keyring 42.1-1+b2`).
Resultado: create→restart→restore PASS; daemon ausente, conta
incorreta e coleção isolada/chave incorreta FAIL-CLOSED. A senha de unlock foi
gerada dentro do contêiner em `/run`, modo 0600, consumida por stdin e removida;
não foi passada por argv/env/log. A primeira tentativa anterior, que continha
um valor literal no argv do shell, é `INVALID_EVIDENCE`, foi interrompida e não
é contabilizada. O contêiner e a imagem intermediária foram removidos após o
gate.
