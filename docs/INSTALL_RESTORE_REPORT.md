# INSTALL RESTORE REPORT - e-SUS APS PEC 5.4.30

## Data/Hora
- Execucao principal: 2026-02-11T22:31:06-03:00
- Finalizacao e validacao: 2026-02-12T00:01:41-03:00
- Host: anton.dmtechnology.com.br
- Timezone: America/Sao_Paulo

## Objetivo
- Instalar/validar e-SUS APS PEC 5.4.30 em maquina host (sem container para PEC)
- Restaurar base existente com dump PostgreSQL
- Manter portas 80 e 443 intactas
- Operar PEC em HTTP porta 8080

## Parametros usados
- DUMP_SOURCE: http://149.78.176.0/dmtechnology/20260211205101-esus-postgres.backup
- DUMP_SOURCE_MODE: stream
- STREAM_RESTORE_FROM_URL: true
- STREAM_DUMP_URL: http://149.78.176.0/dmtechnology/20260211205101-esus-postgres.backup
- Perfil: producao
- FORCE_REINSTALL: true
- Metodo de restore: manual_pg_restore_stream

## Instalador
- JAR: /opt/esus-pec/eSUS-AB-PEC-5.4.30-Linux64.jar
- SHA256: 7ef0f037be09bff52b26d6f2f676b5d5464f0616f741914a5cd7cbe85c2747b2
- Install dir detectado: /opt/e-SUS

## Banco de dados (PEC)
- PostgreSQL embutido/configurado: SIM
- Servico: e-SUS-AB-PostgreSQL.service = active
- Porta: 127.0.0.1:5433 (LISTEN)
- Restore aplicado a partir do dump remoto .backup
- Resultado pos-restore: db_size=33 GB; tables=1101

## Aplicacao (PEC)
- Servico: e-SUS-PEC.service = active
- Usuario de servico: esus (sem shell)
- Endpoint principal: http://localhost:8080/esus/
- Resultado curl: HTTP/1.1 401 Unauthorized (aplicacao viva)
- Endpoint auxiliar: http://localhost:8080/api/public/info
- Resultado curl: HTTP/1.1 200 OK

## Portas e rede
- 8080: usado pelo PEC (java)
- 5433: PostgreSQL interno do PEC
- 80/443: preservadas e ocupadas por npm_ptbr/docker-proxy (sem alteracao)

## HTTPS
- Nao configurado por solicitacao explicita
- Ambiente mantido em HTTP 8080

## Incidente identificado e resolvido
- Sintoma anterior: falha de inicializacao web (`Unable to create tempDir`, `No space left on device`)
- Causa raiz: espaco insuficiente em disco durante restore/startup
- Correcao aplicada: liberacao de espaco nao critico e novo restore completo
- Estado atual: servicos ativos e validacao HTTP concluida

## Backups e rollback
- Backup atual valido: /opt/esus-pec/backups/eSUS_installation_backup_20260211_234745.tar.gz
- Ponteiro atual: /opt/esus-pec/backups/latest_backup.tar.gz
- Script rollback: /opt/esus-pec/scripts/rollback_esus.sh
- Backup de seguranca da aplicacao Deda IA (desativada):
  - /opt/esus-pec/backups/deda-ia-saude-mental_src_20260211_231527.tar.gz
  - /opt/esus-pec/backups/deda-ia_meta_20260211_231527/

## Logs
- Main restore run: /opt/esus-pec/logs/install_restore_run_20260211_223106.log
- Baseline: /opt/esus-pec/logs/install_restore_baseline_20260211_223106.log
- Installer: /opt/esus-pec/logs/install_restore_installer_20260211_223106.log
- Validacao final: /opt/esus-pec/logs/final_validation_20260212_000141.log

## Checklist QA
- [x] Java validado antes da execucao
- [x] SHA256 do instalador registrado
- [x] Pasta real de instalacao detectada
- [x] Restore do dump executado
- [x] PostgreSQL embutido ativo em 5433
- [x] e-SUS-PEC ativo
- [x] Porta 8080 LISTEN
- [x] curl /esus/ com resposta HTTP
- [x] Porta 80/443 nao alteradas
- [x] Backup e rollback disponiveis

## Comandos executados (resumo)
- java -version
- sha256sum /opt/esus-pec/eSUS-AB-PEC-5.4.30-Linux64.jar
- java -jar /opt/esus-pec/eSUS-AB-PEC-5.4.30-Linux64.jar -help
- script -q -c "java -jar ... -console -continue"
- curl -fL ...esus-postgres.backup | pg_restore -h localhost -p 5433 -U postgres ... -d esus
- systemctl restart/start/status e-SUS-AB-PostgreSQL.service e-SUS-PEC.service
- ss -lntp
- curl -I http://localhost:8080/esus/
