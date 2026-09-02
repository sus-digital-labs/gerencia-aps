# Atualizacao e-SUS APS PEC 5.4.37

## Resultado
- Host: anton.dmtechnology.com.br
- Janela local: 2026-05-31 21:33 a 2026-05-31 22:53 America/Sao_Paulo
- Instalacao: /opt/e-SUS
- Area de apoio: /opt/esus-pec
- Versao antes: 5.4.30
- Versao depois: 5.4.37
- Versao transporte depois: 7.4.1
- UUID preservado: a3643ecb-aaf1-44ea-a316-13336949d242
- Modo treinamento: false

## Validacoes
- /api/public/info retornou versao 5.4.37.
- /esus/ respondeu HTTP 401 Unauthorized, esperado sem sessao autenticada.
- e-SUS-PEC.service: active.
- e-SUS-AB-PostgreSQL.service: active.
- Porta 8080: aberta pelo processo Java do PEC.
- Porta 5433: aberta pelo PostgreSQL interno.
- Banco esus: 38 GB.
- Amostras de contagem:
  - tb_cidadao: 70641
  - tb_dado_transp: 3761389
  - tb_fat_visita_domiciliar: 2072523
- Journal do e-SUS-PEC desde o start pos-atualizacao sem entradas de erro.

## Backups pre-atualizacao
- Banco: /opt/esus-pec/backups/pec_esus_pre_5.4.37_20260531_213307.backup
- SHA256 banco: /opt/esus-pec/backups/pec_esus_pre_5.4.37_20260531_213307.backup.sha256
- Validacao banco: sha256sum -c OK; pg_restore -l OK com 12474 entradas.
- Aplicacao sem data directory PostgreSQL: /opt/esus-pec/backups/eSUS_app_nodata_pre_5.4.37_20260531_213307.tar.gz
- SHA256 aplicacao: /opt/esus-pec/backups/eSUS_app_nodata_pre_5.4.37_20260531_213307.tar.gz.sha256
- Validacao aplicacao: sha256sum -c OK.

## Instalador
- Arquivo: /opt/esus-pec/downloads/eSUS-AB-PEC-5.4.37-Linux64.jar
- Tamanho: 892232957 bytes
- SHA256: 9975a55184a6dd1f66d8a837bbc533376e0400069485e8acb45100c23a535bfb
- Log do instalador: /opt/esus-pec/logs/update_esus_pec_5.4.37_installer_20260531_213307.log

## Observacoes
- O backup logico foi feito com o PEC parado e o PostgreSQL interno ativo, para congelar novas escritas.
- O log do instalador foi protegido com permissao 600 porque contem parametros sensiveis emitidos pelo proprio instalador.
- Espaco em disco apos a atualizacao: 13 GB livres em /.
