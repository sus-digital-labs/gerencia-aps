# Sync-Agent — Descoberta de configuração PEC

Data: 2026-04-30

## Objetivo

Descobrir automaticamente configuração de acesso ao PEC local **sem varredura completa de disco** e **sem expor segredo**.

## Ordem de candidatos (Windows)

1. `C:\Program Files\e-SUS\webserver\config\credenciais.txt`
2. `C:\Program Files\e-SUS\`
3. `C:\Program Files (x86)\e-SUS\`
4. `C:\e-SUS\`
5. `C:\esus\`
6. `C:\PEC\`
7. `C:\Program Files\e-SUS APS\`
8. `C:\Program Files (x86)\e-SUS APS\`
9. `C:\Users\Public\e-SUS\`

## Ordem de candidatos (Linux)

- `/opt/e-SUS/`
- `/opt/esus/`
- `/opt/pec/`
- `/etc/esus/`
- `/etc/pec/`
- `/var/lib/esus/`
- `/var/lib/pec/`

## Overrides manuais

- `PEC_CONFIG_FILE`
- `PEC_CONFIG_DIR`
- `PEC_INSTALL_DIR`

Nota de precedência:

- overrides (`PEC_CONFIG_*`) são avaliados primeiro;
- em seguida, o candidato padrão obrigatório do Windows (`C:\Program Files\e-SUS\webserver\config\credenciais.txt`) é testado antes dos demais caminhos.

## Extensões aceitas

- `.txt`, `.properties`, `.ini`, `.conf`, `.cfg`, `.env`

## Regras de segurança

- não imprimir senha;
- não imprimir connection string completa;
- não versionar `credenciais.txt` real;
- retorno para UI sempre sanitizado (`hostMasked`, `usernameMasked`, `sourceFileSanitized`).

## Comando

```powershell
pnpm run agent:local:discover-pec
```

Para validação operacional no host Windows (Gate PROOF-PEC-AGENT-1), usar preferencialmente:

```powershell
pnpm run agent:client:discover-pec
```

## Classificações de saída

- `PEC_CONFIG_DISCOVERED`
- `PEC_CONFIG_NOT_FOUND`
- `PEC_CONNECTION_READONLY_OK`
- `PEC_CONNECTION_PARTIAL`

## Evidência mínima esperada (sem segredo)

- `PEC_CONFIG_FOUND=true/false`
- `sourceFileSanitized`
- `hostMasked`
- `port`
- `database`
- `usernameMasked`
- `hasPassword`
- `discoveredAt`
