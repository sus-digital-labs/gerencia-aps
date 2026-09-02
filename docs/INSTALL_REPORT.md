# INSTALL REPORT - e-SUS APS PEC 5.4.30

## Data/Hora
- Atualizado em: 2026-02-12T00:01:41-03:00
- Host: anton.dmtechnology.com.br
- Timezone: America/Sao_Paulo

## Ambiente
- SO: Debian GNU/Linux 12 (bookworm)
- Kernel: Linux 6.1.0-42-amd64
- Java: OpenJDK 17.0.18

## Artefatos
- Instalador: /opt/esus-pec/eSUS-AB-PEC-5.4.30-Linux64.jar
- SHA256: 7ef0f037be09bff52b26d6f2f676b5d5464f0616f741914a5cd7cbe85c2747b2
- Script principal (baseline): /opt/esus-pec/scripts/install_esus_pec_5_4_30.sh
- Script principal (com restore): /opt/esus-pec/scripts/install_esus_pec_5_4_30_restore.sh
- Script rollback: /opt/esus-pec/scripts/rollback_esus.sh

## Instalacao detectada
- Diretorio: /opt/e-SUS
- Configuracao: /opt/e-SUS/webserver/config/application.properties
- Servico PEC: /lib/systemd/system/e-SUS-PEC.service
- Override hardening: /etc/systemd/system/e-SUS-PEC.service.d/override.conf

## Estado operacional
- e-SUS-PEC.service: active (running)
- e-SUS-AB-PostgreSQL.service: active (running)
- Porta 8080: LISTEN
- Porta 5433: LISTEN (PostgreSQL interno)
- curl http://localhost:8080/esus/: HTTP/1.1 401 Unauthorized
- curl http://localhost:8080/api/public/info: HTTP/1.1 200 OK

## Banco (PEC)
- PostgreSQL embutido/configurado: SIM
- Restore aplicado com dump: 20260211205101-esus-postgres.backup
- Tamanho/volume apos restore: db_size=33 GB; tables=1101

## Portas 80/443 e HTTPS
- 80/443 nao foram alteradas
- Permanecem em uso por npm_ptbr/docker-proxy
- HTTPS do PEC nao configurado por solicitacao (mantido em HTTP 8080)

## Backup e rollback
- Backup atual: /opt/esus-pec/backups/eSUS_installation_backup_20260211_234745.tar.gz
- Link atual: /opt/esus-pec/backups/latest_backup.tar.gz
- Rollback: /opt/esus-pec/scripts/rollback_esus.sh

## Logs
- /opt/esus-pec/logs/install_restore_run_20260211_223106.log
- /opt/esus-pec/logs/install_restore_baseline_20260211_223106.log
- /opt/esus-pec/logs/install_restore_installer_20260211_223106.log
- /opt/esus-pec/logs/final_validation_20260212_000141.log

## Comandos Executados (resumo)
- `java -version`
- `sha256sum /opt/esus-pec/eSUS-AB-PEC-5.4.30-Linux64.jar`
- `java -jar /opt/esus-pec/eSUS-AB-PEC-5.4.30-Linux64.jar -help`
- `script -q -c "java -jar ... -console -continue"`
- `curl -fL http://149.78.176.0/dmtechnology/20260211205101-esus-postgres.backup | pg_restore -h localhost -p 5433 -U postgres --no-owner --no-privileges --exit-on-error -d esus`
- `systemctl start/restart/status e-SUS-AB-PostgreSQL.service`
- `systemctl start/restart/status e-SUS-PEC.service`
- `ss -lntp | grep -E ':8080|:5433|:80|:443'`
- `curl -I http://localhost:8080/esus/`
- `curl -I http://localhost:8080/api/public/info`
- `tar -czf /opt/esus-pec/backups/eSUS_installation_backup_*.tar.gz ...`

## QA Checklist (100%)
- [x] Java validado
- [x] Hash do instalador registrado
- [x] Restore da base concluido
- [x] Servicos ativos
- [x] Porta 8080 ativa
- [x] Endpoint /esus/ responsivo
- [x] 80/443 preservadas
- [x] Backup e rollback disponiveis
