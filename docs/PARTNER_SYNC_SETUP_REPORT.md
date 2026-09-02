# Partner Sync Setup Report

Date: 2026-02-20
Host: anton

## Created/Configured
- Linux user: parceiro_sync (non-root, no sudo)
- Workspace: /opt/partner-sync
- PostgreSQL user: sync_readonly (database: esus, host: 127.0.0.1, port: 5433)
- DB privilege model: read-only (USAGE on schema + SELECT on tables/sequences)
- Linger enabled for user services: yes
- systemd user templates created under /home/parceiro_sync/.config/systemd/user/

## Security checks
- parceiro_sync sudo rights: none
- sync_readonly CREATE on schema public: denied
- sync_readonly SELECT on production tables: allowed

## Service status at end
- e-SUS-PEC.service: active
- e-SUS-AB-PostgreSQL.service: active

## Credential handoff files
- /opt/esus-pec/secrets/partner_sync_credentials_latest.txt (root-only)
- /opt/esus-pec/secrets/sync_readonly_db_password.txt (root-only)

## Operational guide
- /opt/esus-pec/docs/PARTNER_SYNC_ACCESS.md
