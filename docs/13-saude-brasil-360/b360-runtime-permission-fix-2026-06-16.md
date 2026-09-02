# B360 Runtime Permission Fix - 2026-06-16

## Diagnostico

O painel municipal e detalhes de indicadores falhavam porque o runtime B360 lia tabelas PEC diretamente com o usuario `root` da replica de origem. Esse usuario conecta no banco `esus`, mas nao possui `SELECT` em tabelas como `public.tb_fat_atendimento_odonto`.

Validacao objetiva:

- `has_table_privilege(current_user, 'public.tb_fat_atendimento_odonto', 'SELECT') = false` no PEC.
- A credencial `postgres` administrativa nao esta disponivel no runtime.
- O banco analitico `sus_analytics_app` possui acesso a `sus_analytics_replica`, mas as tabelas sincronizadas usam envelope `payload jsonb`.

## Correcao Aplicada

- B360 e CVAT passam a ler por um pool analitico com `search_path` controlado:
  `sus_analytics_b360_compat, sus_analytics_replica, sus_analytics_reference, public`.
- A migracao B360 cria views em `sus_analytics_b360_compat` para expor um contrato SQL compativel sobre snapshots e payloads sincronizados.
- Detalhes nominais agora fazem fallback tecnico controlado em vez de responder HTTP 500 quando a fonte sincronizada ainda nao sustenta a query nominal.
- As consultas B360 no pool analitico usam `statement_timeout` de 5s para proteger o painel contra travamento por query pesada.

## Pendencias Reais de Fonte

- Odontologia ainda tem tabelas sincronizadas com payload insuficiente em parte do catalogo, por exemplo `tb_fat_atendimento_odonto` sem linhas uteis.
- Alguns indicadores continuam corretamente bloqueados por fonte/schema ate o normalizer materializar os campos reais exigidos pelas regras.
- Se a decisao operacional for voltar a ler o PEC direto, sera necessario aplicar grants no banco de origem com usuario administrativo.

## Como Verificar

- `Invoke-RestMethod http://127.0.0.1:3005/readyz`
- `node scripts/tests/shared/smoke-web.mjs http://127.0.0.1:3005 --skip-preflight`
- Consultar logs do container e confirmar ausencia de `permission denied`.
