# Baseline da auditoria upstream

**Snapshot:** `CampusVirtualFiocruz/painel-esus` — `d21fe44562fd73c4ae46261a40496079b6e94f15`  
**Data:** 2026-08-27  
**Estado:** `BLOCKED_BY_ENVIRONMENT`

## Execução realizada

Foi executada uma bateria direcionada dos testes de criação de bases, repositórios e queries para Cadastro, Criança, Diabetes, Idoso, Saúde Bucal e o repositório compartilhado de Hipertensão/Diabetes.

| Medida | Resultado |
|---|---:|
| Testes coletados | 25 |
| Passes | 5 |
| Falhas | 20 |
| Warnings | 1 |
| Duração observada | 3,19 s |
| Resultado de cálculo validado | Nenhum |

As falhas ocorreram porque o clone não contém os Parquet esperados em `./dados/output/`, incluindo `diabetes.parquet`, `idoso.parquet`, `cadastro_db.parquet` e `saude_bucal.parquet`. O resultado está detalhado em `upstream-targeted-test-result.txt`.

## Interpretação

A execução comprova que a suíte é coletável e que alguns testes unitários passam, mas não comprova numerador, denominador, fórmula, janela, code set ou cardinalidade de nenhum indicador. O estado correto é `BLOCKED_BY_ENVIRONMENT`, nunca `PASS`.

## Baseline a capturar depois do desbloqueio

Para cada um dos dois consumidores selecionados, Diabetes e Hipertensão, usar dados sintéticos e uma data de referência fixa. Registrar:

| Medida | Como registrar |
|---|---|
| `rows_input` | Linhas lidas de cada Parquet e total após filtros. |
| `rows_output` | Linhas do Parquet materializado e linhas de cada agregação. |
| `duration` | Tempo de geração e consultas, separado de tempo de leitura. |
| `memory` | Pico de memória, quando disponível no ambiente. |
| `files_read` | Lista de arquivos e tamanho/hash, sem dados nominais. |
| `materializations` | Número de `collect`, `write_parquet` e reprocessamentos. |
| `reference_date` | Data fixa que governa todas as janelas. |
| `rule_version` | Versão da metodologia e do contrato utilizado. |
| `result_hash` | Hash de saída sanitizada para comparação diferencial. |

## Protocolo diferencial

1. Gerar `OLD_RESULT` em uma cópia intocada com data e filtros fixos.
2. Aplicar somente o contexto determinístico em branch de pesquisa.
3. Gerar `NEW_RESULT` com a mesma entrada, data e versão de regra.
4. Comparar linhas, chaves, flags, agregados e hash sanitizado.
5. Exigir `EXACT_EQUIVALENCE` quando não houver mudança metodológica.
6. Se houver divergência, classificar como bug, mudança de metodologia ou diferença de ambiente; não aceitar silenciosamente.

## Limitações

Os Parquet não foram fabricados para esta baseline, porque isso poderia esconder o contrato ausente do pipeline. Não foram usados dados reais, dumps, CPF, CNS, nome, município cliente ou conexão de produção.
