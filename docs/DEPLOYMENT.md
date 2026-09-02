# Implantação

## Imagem frontend

```bash
docker build -t sus-analytics-web:local .
docker run --rm -p 8080:8080 sus-analytics-web:local
```

O container serve apenas arquivos estáticos. Uma API compatível deve ser publicada sob o mesmo domínio em `/api/trpc`, normalmente por um proxy reverso externo.

## Requisitos de produção

- HTTPS obrigatório;
- autenticação e autorização no servidor;
- banco de dados em rede privada;
- segredos fornecidos em tempo de execução;
- logs sem identificadores pessoais;
- política de retenção e auditoria;
- cópias de segurança protegidas e testadas.

Nunca exponha PostgreSQL diretamente à internet e nunca inclua arquivos `.env` no build.
