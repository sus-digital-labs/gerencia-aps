# Acesso Parceiro Sincronizador PEC

Gerado em: 2026-02-20 09:06 -0300
Host: anton

## Objetivo
Entregar acesso para empresa parceira instalar sincronizador do PostgreSQL do PEC sem uso de root e sem parar servicos.

## Usuario Linux (sem root)
- Usuario: parceiro_sync
- Home: /home/parceiro_sync
- Workspace para instalacao: /opt/partner-sync
- Shell: /bin/bash
- Permissoes: sem sudo/root

## Usuario PostgreSQL (somente leitura)
- Host: 127.0.0.1
- Porta: 5433
- Banco: esus
- Usuario: sync_readonly
- Escopo: SELECT em schemas nao-sistema

## Como o parceiro agenda sem root
### Opcao 1: systemd no usuario
1. Logar como parceiro_sync
2. Copiar templates:
- cp ~/.config/systemd/user/pec-sync.service.example ~/.config/systemd/user/pec-sync.service
- (opcional) cp ~/.config/systemd/user/pec-sync.timer.example ~/.config/systemd/user/pec-sync.timer
3. Ajustar ExecStart e arquivo de configuracao do sincronizador
4. Habilitar:
- systemctl --user daemon-reload
- systemctl --user enable --now pec-sync.service
- ou systemctl --user enable --now pec-sync.timer

### Opcao 2: cron do usuario
- crontab -e
- adicionar comando de sincronizacao (exemplo): */5 * * * * /opt/partner-sync/sync-agent --config /opt/partner-sync/config.yml >> /opt/partner-sync/sync.log 2>&1

## Credenciais
As credenciais estao em arquivo root-only:
- /opt/esus-pec/secrets/partner_sync_credentials_latest.txt

Compartilhar com a empresa parceira por canal seguro.

## Observacoes de seguranca
- e-SUS-PEC e PostgreSQL do PEC permanecem ativos durante a configuracao.
- O usuario do parceiro nao possui privilegios de root.
- O usuario PostgreSQL do parceiro nao possui permissoes de escrita.
