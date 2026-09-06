# Segurança

O projeto **SUS Analytics Web** preza pela segurança dos dados da Atenção Primária à Saúde. Por tratar-se de um painel web que gerencia fluxos analíticos e dados territoriais, adotamos uma postura *fail-closed* rigorosa.

## Política de Tratamento de Dados

A natureza desta aplicação é classificada como **Frontend Standalone**. Consequentemente:

- O frontend **não** deve ser utilizado para armazenar diretamente credenciais.
- **Não** envie senhas, chaves privadas, endereços IP de banco de dados internos ou endpoints governamentais sigilosos nos arquivos `.env`. Variáveis prefixadas com `VITE_` são embutidas no código público final.
- Os cálculos e o fornecimento dos dados consolidados devem provir unicamente da API configurada, sendo ela a principal barreira de autorização e controle de escopo (município/equipe).

## Como Reportar Vulnerabilidades

Levamos todas as falhas de segurança a sério. Se você descobrir um problema de segurança, por favor **não abra uma issue pública**. Em vez disso:

1. Utilize a aba **Security > Advisories** no GitHub para relatar confidencialmente.
2. Em sua denúncia, por favor descreva de forma concisa:
   - Os passos para reproduzir a falha (Proof of Concept).
   - O impacto presumido da exploração da vulnerabilidade.

Tentaremos acusar o recebimento e iniciar a verificação no prazo máximo de 5 dias úteis.

## Práticas e Versões Suportadas

Atualmente o projeto é experimental, porém aplicamos correções de segurança continuamente na branch `main`. Recomendamos que todos os integradores sincronizem a versão mais recente e rodem periodicamente `pnpm audit`.

> **Lembre-se:** Este software não substitui a validação técnica local do PEC Oficial / e-SUS.
