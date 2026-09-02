# ADR-001: Escopo do repositório público

## Decisão

O repositório público contém somente o frontend, a configuração de build e a documentação necessária para colaboração. Implementações antigas sem caminho executável, arquivos operacionais e configurações específicas de ambientes privados ficam fora da distribuição.

## Motivos

- reduzir a superfície de ataque;
- impedir a publicação de detalhes operacionais;
- manter a documentação alinhada ao código executável;
- deixar explícita a responsabilidade da API por autenticação e autorização.

## Consequências

O frontend exige uma API compatível para uso com dados reais. Modos de demonstração devem utilizar apenas dados sintéticos.
