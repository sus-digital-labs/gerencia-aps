# Contribuindo com o SUS Analytics Web

Agradecemos o seu interesse em contribuir! Este projeto experimental visa melhorar a visualização e gestão de contratos analíticos para a Atenção Primária à Saúde.

As contribuições podem incluir desde correções ortográficas e melhorias de interface até integração de novos componentes e refatoração de testes, contanto que obedeçam à arquitetura *standalone*.

## Primeiros Passos

1. **Faça um fork** do repositório.
2. **Clone** o fork para a sua máquina local:
   ```bash
   git clone https://github.com/SEU_USUARIO/sus-analytics-web.git
   ```
3. Instale as dependências:
   ```bash
   pnpm install --frozen-lockfile
   ```
4. Crie uma branch para a sua alteração:
   ```bash
   git checkout -b feature/minha-nova-feature
   ```

## Regras de Arquitetura

O sistema é estritamente de front-end, portanto evite enviar Pull Requests que:
- Tentem executar regras exclusivas de back-end na SPA (como conexões com o e-SUS DB).
- Incluam IPs, strings de banco de dados de produção ou lógicas bloqueadas (ex: cálculo autônomo da métrica C1 localmente).
- Retirem a política defensiva de *fail-closed* ao testar conexões caídas.

Para mais detalhes da arquitetura de integração, leia os guias em `docs/`.

## Testes e Padronização

Antes de fazer o commit e abrir seu Pull Request (PR), rode os fluxos de validação obrigatórios:

```bash
pnpm check      # Valida tipos do TypeScript (não deve haver erros estáticos)
pnpm format     # Aplica o Prettier em todos os arquivos alterados
pnpm test       # Roda a suíte local de testes
```

O CI integrado fará o build da sua branch e checará as rotinas de segurança. Se algum passo falhar, arrume-o antes de solicitar a revisão final.

## Submetendo seu Pull Request

- Crie PRs modulares. Evite modificar muitos contextos desconexos numa mesma submissão.
- Adicione uma descrição detalhada: relate o motivo da alteração e como ela foi testada.
- Marque qualquer *issue* relacionada no formato `Fixes #numero_da_issue`.

Agradecemos desde já o esforço para fortalecer as ferramentas digitais na saúde pública!
