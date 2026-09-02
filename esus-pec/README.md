# e-SUS APS PEC 5.4.30 - Instalacao com Restore (Host Linux)

Guia pratico para instalar/validar o PEC diretamente na maquina (sem container para PEC), restaurando base PostgreSQL de dump.

## Escopo
- PEC em HTTP na porta `8080`
- PostgreSQL interno do PEC na porta `5433`
- Sem alterar portas `80` e `443`
- HTTPS opcional nao habilitado neste fluxo

## Requisitos
- Debian/Ubuntu com acesso root
- Java 17 instalado
- Instalador presente em:
  - `/opt/esus-pec/eSUS-AB-PEC-5.4.30-Linux64.jar`
- Dump PostgreSQL (arquivo `.backup`, `.dump`, `.sql` ou `.sql.gz`)

## Scripts
- Instalacao baseline: `/opt/esus-pec/scripts/install_esus_pec_5_4_30.sh`
- Instalacao + restore: `/opt/esus-pec/scripts/install_esus_pec_5_4_30_restore.sh`
- Rollback: `/opt/esus-pec/scripts/rollback_esus.sh`

## Execucao recomendada (restore automatico)
```bash
chmod +x /opt/esus-pec/scripts/install_esus_pec_5_4_30_restore.sh

export DUMP_SOURCE="http://149.78.176.0/dmtechnology/20260211205101-esus-postgres.backup"
export INSTALL_PROFILE="producao"
export FORCE_REINSTALL="true"
export STREAM_RESTORE_FROM_URL="true"

/opt/esus-pec/scripts/install_esus_pec_5_4_30_restore.sh
```

## O que o script faz
1. Coleta baseline do servidor e valida Java/instalador.
2. Cria backup de seguranca antes de qualquer alteracao.
3. Executa instalador PEC em modo console.
4. Restaura a base via `pg_restore` no PostgreSQL interno (`5433`).
5. Aplica hardening do servico (`User=esus`, sem shell).
6. Sobe servicos e valida endpoints HTTP.
7. Gera logs e relatorios em `/opt/esus-pec/docs` e `/opt/esus-pec/logs`.

## Validacao rapida
```bash
systemctl status e-SUS-AB-PostgreSQL.service --no-pager
systemctl status e-SUS-PEC.service --no-pager
ss -lntp | grep -E ':5433|:8080'
curl -I http://localhost:8080/esus/
```

Resposta esperada no `/esus/`: `200`, `302`, `401` ou equivalente HTTP (app viva).

## Rollback
```bash
chmod +x /opt/esus-pec/scripts/rollback_esus.sh
/opt/esus-pec/scripts/rollback_esus.sh
```

Para usar um backup especifico:
```bash
/opt/esus-pec/scripts/rollback_esus.sh /opt/esus-pec/backups/eSUS_installation_backup_YYYYMMDD_HHMMSS.tar.gz
```

## Arquivos de saida
- Relatorio principal: `/opt/esus-pec/docs/INSTALL_REPORT.md`
- Relatorio restore: `/opt/esus-pec/docs/INSTALL_RESTORE_REPORT.md`
- Estado restore: `/opt/esus-pec/docs/install_restore_state.env`
- Logs: `/opt/esus-pec/logs/*.log`

## Troubleshooting
- Erro `No space left on device`: libere espaco e refaca o restore.
- `curl` sem resposta em `8080`: verificar `journalctl -u e-SUS-PEC.service -n 200 --no-pager`.
- Restore interrompido: repetir script com o mesmo `DUMP_SOURCE`.

## Observacoes de producao
- Nao usar PEC em container neste fluxo.
- Nao alterar `80/443` quando ja ocupadas por outros servicos.
- Bancos MariaDB de producao (externos ao PEC) nao sao tocados por este processo.
