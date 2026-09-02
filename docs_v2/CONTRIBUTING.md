# Como contribuir

## Preparação

1. Crie uma branch a partir de `main`.
2. Instale as dependências com `pnpm install --frozen-lockfile`.
3. Use apenas dados sintéticos.
4. Mantenha mudanças pequenas, explicadas e acompanhadas de validação.

## Antes do pull request

```bash
pnpm check
pnpm test
pnpm build
pnpm audit
pnpm verify:release
```

O pull request deve explicar o problema, a solução, os riscos, os testes executados e qualquer alteração de privacidade ou segurança.

Contribuições aceitas são licenciadas sob Apache-2.0.
