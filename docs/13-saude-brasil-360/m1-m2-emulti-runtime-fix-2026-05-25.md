# M1/M2 eMulti Runtime Fix — 2026-05-25

## Status

Correção aplicada para resolver escopo eMulti por tipo oficial `72` e exibir motivo quando o denominador está vazio.

## Diagnóstico

Antes da correção, B4 estava funcional, mas M1/M2 retornavam `empty_denominator` sem prova clara. A auditoria mostrou eMulti real (`co_seq_dim_equipe=18`, `nu_ine=0000181552`, `tb_tipo_equipe.nu_ms=72`) com produção no período `2025-05-01..2026-04-30`.

## Causa raiz

`resolveEmultiScope` dependia de texto em `tb_dim_equipe.no_equipe/ds_filtro` e da unidade inferida. Quando o dashboard usava equipe/filtro não eMulti, o helper não resolvia a eMulti municipal tipo 72.

## Alterações

- M1/M2 validam `tb_equipe` e `tb_tipo_equipe`.
- Escopo eMulti reconhece `tb_equipe.tp_equipe -> tb_tipo_equipe.nu_ms='72'`.
- Fallback municipal usa a eMulti com produção no período quando não há companheira na unidade.
- Resultado agregado reporta `equipeId`/`ine` efetivos da eMulti resolvida.
- UI passa a mostrar `message` em `empty_denominator`.

## Evidências

- Teste focado M1/M2: 11/11 passou.
- Typecheck backend: passou.
- Runtime após rebuild em `3005`: M1/M2 retornaram `ok` para período com produção e `empty_denominator` com motivo para a janela do dashboard de maio/2026.

## Riscos

- Em municípios com múltiplas eMulti ativas, o fallback municipal escolhe a eMulti com maior produção no período. A seleção explícita de eMulti na UI é a evolução recomendada.
- A porta ativa do compose isolado é `3005->3003`; a porta `3003` direta pertence ao fluxo externo esperado pelo RegulaSync.
