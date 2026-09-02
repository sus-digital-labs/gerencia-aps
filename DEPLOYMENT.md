# 🚀 Guia de Deployment - SUS Analytics

## 📋 Pré-requisitos

### Software Necessário
- **Node.js** 22.x ou superior
- **pnpm** (gerenciador de pacotes)
- **PostgreSQL Client** (para conexão com PEC)
- **Git** (para clone do repositório)

### Informações de Conexão PEC
Você precisará das seguintes informações do banco de dados PEC:
- Host/IP do servidor PostgreSQL
- Porta (geralmente 5432)
- Nome do banco de dados
- Usuário
- Senha

---

## 🖥️ Instalação no Desktop (Windows/Linux)

### Passo 1: Instalar Node.js e pnpm

**Windows:**
```powershell
# Baixar e instalar Node.js 22.x de https://nodejs.org
# Após instalação, instalar pnpm globalmente
npm install -g pnpm
```

**Linux (Ubuntu/Debian):**
```bash
# Instalar Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar pnpm
sudo npm install -g pnpm
```

### Passo 2: Clonar o Repositório

```bash
# Via HTTPS
git clone https://github.com/SEU_USUARIO/sus-analytics-web.git
cd sus-analytics-web

# OU via SSH (se configurado)
git clone git@github.com:SEU_USUARIO/sus-analytics-web.git
cd sus-analytics-web
```

### Passo 3: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Windows
copy .env.example .env

# Linux
cp .env.example .env
```

Edite o arquivo `.env` com as informações do seu banco PEC:

```env
# Conexão PEC PostgreSQL (OBRIGATÓRIO)
PEC_DB_HOST=localhost
PEC_DB_PORT=5432
PEC_DB_NAME=esus
PEC_DB_USER=postgres
PEC_DB_PASSWORD=sua_senha_aqui
PEC_DB_SSL=false

# Outras variáveis (já configuradas automaticamente)
DATABASE_URL=mysql://...
JWT_SECRET=...
VITE_APP_TITLE=SUS Analytics
```

### Passo 4: Instalar Dependências

```bash
pnpm install
```

### Passo 5: Testar Conexão com PEC

```bash
# Executar script de teste de conexão
pnpm test:pec-connection
```

Se a conexão falhar, verifique:
- Firewall do servidor PEC permite conexões na porta 5432
- Usuário PostgreSQL tem permissões de leitura no banco
- Arquivo `pg_hba.conf` do PostgreSQL permite conexões remotas

### Passo 6: Iniciar o Servidor

```bash
# Modo desenvolvimento (com hot-reload)
pnpm dev

# Modo produção
pnpm build
pnpm start
```

O sistema estará disponível em: **http://localhost:3000**

---

## 🔧 Configuração de Acesso Remoto via SSH

Para permitir que o desenvolvedor acesse remotamente o desktop para continuar o desenvolvimento:

### Windows (OpenSSH Server)

```powershell
# Instalar OpenSSH Server
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

# Iniciar e configurar para iniciar automaticamente
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'

# Configurar firewall
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22

# Obter IP local
ipconfig
```

### Linux (OpenSSH Server)

```bash
# Instalar OpenSSH Server
sudo apt-get update
sudo apt-get install -y openssh-server

# Iniciar e habilitar
sudo systemctl start ssh
sudo systemctl enable ssh

# Verificar status
sudo systemctl status ssh

# Obter IP local
ip addr show
```

### Criar Usuário para Acesso Remoto

**Windows:**
```powershell
# Criar usuário dev
net user dev SenhaSegura123! /add
net localgroup Administrators dev /add
```

**Linux:**
```bash
# Criar usuário dev
sudo adduser dev
sudo usermod -aG sudo dev
```

### Conectar Remotamente

```bash
# Do computador do desenvolvedor
ssh dev@IP_DO_DESKTOP

# Navegar até o projeto
cd /caminho/para/sus-analytics-web

# Continuar desenvolvimento
pnpm dev
```

---

## 🔍 Verificação de Saúde do Sistema

Execute o script de health-check para verificar se tudo está funcionando:

```bash
pnpm health-check
```

O script verificará:
- ✅ Conexão com banco PEC
- ✅ Dependências instaladas
- ✅ Servidor rodando
- ✅ Indicadores calculando corretamente

---

## 📊 Estrutura de Dados do PEC

O sistema se conecta às seguintes tabelas do PEC:

### Principais Tabelas
- `tb_cds_cad_individual` - Cadastro de cidadãos
- `tb_fat_atendimento_individual` - Atendimentos médicos/enfermagem
- `tb_fat_atendimento_odonto` - Atendimentos odontológicos
- `tb_fat_atividade_coletiva` - Atividades coletivas
- `tb_dim_equipe` - Equipes de saúde
- `tb_dim_profissional` - Profissionais
- `tb_dim_unidade_saude` - Unidades de saúde

### Permissões Necessárias

O usuário do banco PEC precisa ter permissão de **SELECT** (leitura) nas tabelas acima. Execute como administrador do PostgreSQL:

```sql
GRANT SELECT ON ALL TABLES IN SCHEMA public TO usuario_sus_analytics;
```

---

## 🐛 Troubleshooting

### Erro: "Connection timeout" ao conectar no PEC

**Solução:**
1. Verificar se o PostgreSQL está aceitando conexões remotas:
   ```bash
   # Editar postgresql.conf
   listen_addresses = '*'
   ```

2. Verificar `pg_hba.conf`:
   ```
   host    all             all             0.0.0.0/0               md5
   ```

3. Reiniciar PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

### Erro: "Permission denied" em tabelas do PEC

**Solução:**
```sql
-- Como superusuário do PostgreSQL
GRANT SELECT ON ALL TABLES IN SCHEMA public TO seu_usuario;
GRANT USAGE ON SCHEMA public TO seu_usuario;
```

### Erro: "Port 3000 already in use"

**Solução:**
```bash
# Encontrar processo usando a porta 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux
sudo lsof -i :3000
sudo kill -9 <PID>
```

---

## 📞 Suporte

Para problemas técnicos ou dúvidas:
- **Email:** eduardo@dmtechnology.com.br
- **Telefone:** (XX) XXXXX-XXXX
- **Documentação:** https://github.com/SEU_USUARIO/sus-analytics-web/wiki

---

**Desenvolvido por:** Eduardo Muniz | DM Technology  
**Versão:** 1.0.0  
**Última atualização:** Fevereiro 2026
