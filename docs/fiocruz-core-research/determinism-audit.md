# Auditoria de determinismo

**Snapshot:** `CampusVirtualFiocruz/painel-esus` — `d21fe44562fd73c4ae46261a40496079b6e94f15`  
**Estado:** somente diagnóstico; nenhuma refatoração aplicada.

## Resultado

O upstream possui cálculo dependente do dia de execução em todos os geradores temáticos auditados. Isso impede comparar resultados de duas execuções em dias diferentes como se fossem o mesmo período, a menos que o período de referência seja explicitamente capturado.

| Arquivo | Ocorrência | Classificação | Risco |
|---|---|---|---|
| `src/infra/create_base/polars/scripts_dados/indicadores_diabetes_polars.py` | Linhas 266–271: `datetime.today()` em janelas de 6/12 meses e em `calcular_data()` | `CALCULATION_RULE` / `NON_DETERMINISTIC` | A coorte muda conforme o dia de execução. |
| `src/infra/create_base/polars/scripts_dados/indicadores_hipertensao_polars.py` | Linhas 246–251: `datetime.today()` em janelas de 6/12 meses | `CALCULATION_RULE` / `NON_DETERMINISTIC` | Resultados não são comparáveis sem data de referência. |
| `src/infra/create_base/polars/scripts_dados/indicadores_idoso_polars.py` | Linhas 148–153: `datetime.today()` em janelas de 12/24 meses | `CALCULATION_RULE` / `NON_DETERMINISTIC` | A elegibilidade temporal depende do relógio local. |
| `src/infra/create_base/polars/scripts_dados/indicadores_crianca_polars.py` | Linhas 130–136: `datetime.today()`/`date.today()` em janelas de 12/24/36 meses | `CALCULATION_RULE` / `NON_DETERMINISTIC` | Marcos infantis podem mudar no limite de idade. |
| `src/infra/create_base/polars/scripts_dados/indicadores_saude_bucal_polars.py` | Linhas 139–143 e 272: `datetime.today()`/`date.today()` em janelas de 24/30 meses | `CALCULATION_RULE` / `NON_DETERMINISTIC` | A mesma competência pode produzir coortes diferentes. |
| `src/infra/create_base/polars/scripts_dados/indicadores_cadastro_polars.py` | Linhas 15, 21, 90–94: `os.getcwd()` e `datetime.today()`/`date.today()` | Contexto de execução / `NON_DETERMINISTIC` | Caminho e corte temporal variam com a execução. |
| `src/data/use_cases/create_bases/create_cache.py` | Linhas 47 e 124: `datetime.now()` para medir duração | `INFRASTRUCTURE` / `SAFE` para o cálculo | Afeta apenas observabilidade de duração; não deve ser usada na regra. |
| Geradores Polars | `os.getcwd()` e `getenv('LAZY_ON')` nos loaders | `INFRASTRUCTURE` / `INPUT_CONTEXT` | O resultado operacional depende do diretório e do modo de leitura não registrado. |

## Recomendação

Introduzir, em etapa separada, um contexto serializável com `reference_period`/`reference_date`, filtros de unidade/equipe e versão da regra. O contexto deve ser passado às funções, mantendo o comportamento atual quando a data for explicitamente fixada pelo chamador.

A primeira contribuição não deve alterar fórmulas. Para Diabetes e Hipertensão, capturar o resultado legado com uma data de referência fixa, aplicar o contexto sem mudar a regra e exigir `EXACT_EQUIVALENCE`. Divergência deve abrir investigação de metodologia, não ser mascarada.

## Classificação de ocorrências

- `INPUT_CONTEXT`: data de referência, unidade, equipe, competência e modo de leitura.
- `INFRASTRUCTURE`: `os.getcwd()`, custo de cache, caminho físico e modo lazy/eager.
- `CALCULATION_RULE`: qualquer `today()` que define janela, idade, acompanhamento ou elegibilidade.
- `SAFE`: relógio usado somente para medir duração, desde que não chegue ao resultado.
- `NON_DETERMINISTIC`: data implícita, diretório implícito ou variável de ambiente não registrada.

## Não fazer agora

Não congelar o relógio global, não introduzir framework de contexto em todos os módulos, não alterar janelas oficiais, não refatorar joins e não corrigir bugs metodológicos no mesmo patch. O contexto deve ser o menor seam que permita a dois consumidores reproduzirem o mesmo cálculo.
