# Conexão com PEC PostgreSQL

## Configuração Rápida

### 1. Adicionar Variáveis de Ambiente

No painel Manus **Settings → Secrets**:

```env
PEC_DB_HOST=149.78.176.0
PEC_DB_PORT=8532
PEC_DB_NAME=esus_pec
PEC_DB_USER=esus_leitura
PEC_DB_PASSWORD=uk1_oHO9fyJJk2HZd7Nihn3FdE
```

### 2. Configurar Servidor PostgreSQL

Edite `/etc/postgresql/[versão]/main/postgresql.conf`:
```conf
listen_addresses = '*'
port = 8532
```

Edite `/etc/postgresql/[versão]/main/pg_hba.conf`:
```conf
host    esus_pec    esus_leitura    0.0.0.0/0    md5
```

Reinicie:
```bash
sudo systemctl restart postgresql
```

### 3. Código já está pronto

O arquivo `server/db.ts` já usa as variáveis de ambiente automaticamente.

## Principais Tabelas

- `tb_cidadao` - Cidadãos cadastrados
- `tb_atend` - Atendimentos
- `tb_cds_visita_domiciliar` - Visitas domiciliares
- `tb_equipe` - Equipes de saúde
- `tb_prof` - Profissionais

## Troubleshooting

- **connection refused**: Verifique `sudo systemctl status postgresql`
- **no pg_hba.conf entry**: Adicione IP no pg_hba.conf
- **password failed**: Verifique credenciais

Para mais detalhes, consulte documentação oficial do e-SUS.
