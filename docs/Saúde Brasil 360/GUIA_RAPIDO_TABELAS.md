# Guia rápido — tabelas e contratos do Saúde Brasil 360

**Revisão:** 2026-08-26

Este guia orienta a consulta e validação das tabelas usadas pelas 21 métricas operacionais do SUS Analytics Web. Os scripts PHP antigos da pasta são históricos e não definem o fluxo atual.

## Fluxo correto antes de usar uma tabela

| Etapa | O que verificar | Evidência necessária |
|---:|---|---|
| 1 | Fonte oficial da regra | Nota metodológica ou nota técnica vigente. |
| 2 | Versão de origem | Sistema e-SUS APS, modelo de informação e versão compatível. |
| 3 | Presença no schema | Tabela, colunas, tipos e chaves na réplica da competência. |
| 4 | Relacionamento | Cardinalidade, integridade e ausência de duplicação. |
| 5 | Escopo | Equipe, unidade, CBO, território e janela temporal. |
| 6 | Qualidade | Nulos, duplicidades, códigos desconhecidos e registros pendentes. |
| 7 | Reprocessamento | Chave idempotente e mesma saída em nova execução. |

A lista em uma documentação não prova que a tabela esteja carregada. Em caso de ausência ou incompatibilidade, registrar o bloqueio e não preencher o resultado com proxy.

## Tabelas principais por grupo

| Grupo | Tabelas mais frequentes | Indicadores |
|---|---|---|
| Dimensões | `tb_dim_tempo`, `tb_dim_equipe`, `tb_dim_profissional`, `tb_dim_cbo`, `tb_dim_procedimento` | B/C/M/CVAT |
| Atendimento | `tb_fat_atendimento_individual`, `tb_fat_atendimento_odonto` | B/C/M |
| Exames e procedimentos | `tb_fat_atd_ind_exames`, `tb_fat_atd_ind_procedimentos`, `tb_fat_atend_odonto_proced` | B/C |
| Cadastro e território | `tb_fat_cidadao_pec`, `tb_fat_cad_domiciliar`, `tb_fat_visita_domiciliar` | C/CVAT |
| Atividade coletiva | `tb_fat_atividade_coletiva`, `tb_fat_atvdd_coletiva_part`, `tb_fat_atvdd_coletiva_propart` | B4/M1/M2 |
| Vacinação | `tb_fat_vacinacao`, `tb_registro_vacinacao` | C2/C3/C6/C7 |
| Classificação de demanda | `tb_dim_tipo_atendimento` e chave correspondente no fato | C1 |

## Atenção especial ao C1

O C1 exige a proporção de demanda programada sobre o total de atendimentos elegíveis. Antes de consultar `tb_dim_tipo_atendimento`, prove que a chave está presente em `tb_fat_atendimento_individual`, que a dimensão está carregada na competência, que o code set é o oficial e que a relação não duplica eventos.

O schema auditado não comprovou essa variável. Por isso, o C1 está `blocked_by_source` com o código `C1_BLOCKED_BY_DATA_CONTRACT`. Não usar tipo genérico de consulta, texto livre ou procedimento como substituto. Consulte [a issue P0 do C1](../13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md).

## Exemplo de inspeção segura

```sql
-- Consulta de inspeção; não é cálculo normativo.
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN (
  'tb_fat_atendimento_individual',
  'tb_dim_tipo_atendimento'
)
ORDER BY table_name, ordinal_position;
```

A consulta de inspeção não deve ser confundida com a fórmula do indicador. Se o retorno não comprovar a coluna e a relação necessários, interromper o cálculo.

## Dados e versões

O lote deve registrar origem, versão do sistema, modelo de informação, competência, estabelecimento, equipe, chave idempotente, resultado da validação e motivo de rejeição. A Nota Técnica nº 12/2025 invalida dados enviados por versões incompatíveis ou liberadas há mais de 12 meses [1]. A Nota Informativa nº 13/2025 documenta o risco operacional de CDS Offline e versões antigas [2].

A página oficial de versões registra o e-SUS APS 5.5.24, publicada em 03/08/2026 [3]. Não assumir que a numeração mais nova seja suficiente sem validar o modelo de informação correspondente.

## Depois da alteração

Atualize a matriz de indicadores, o registro de fontes, a `ruleVersion`, os testes e o changelog. Registre quantidades aceitas, rejeitadas e pendentes. A ausência de dado obrigatório deve aparecer como bloqueio, não como zero.

## Arquivos relacionados

- [Análise de tabelas](ANALISE_TABELAS_ESUS.md)
- [Matriz de indicadores e código](MATRIZ_INDICADORES_CODIGO.md)
- [Processo histórico de tabelas](PROCESSO_TABELAS_ESUS.md)
- [Índice do acervo local](INDICE_COMPLETO.md)
- [Registro mestre de fontes](../sources/official-sources-registry.md)

## Referências

[1]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NT_12-2025_criterio_validacao_dados_siaps-0394bed57dc6efcddaa83dab337f9533.pdf "Ministério da Saúde — Nota Técnica nº 12/2025"
[2]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NI_13-2025_cenario_versoes_incompativeis-90647909abe17697641f1a44b859e48a.pdf "Ministério da Saúde — Nota Informativa nº 13/2025"
[3]: https://sisaps.saude.gov.br/sistemas/esusaps/docs/Versoes/versao_5_5 "Ministério da Saúde — e-SUS APS versão 5.5.24"

**Status:** guia atualizado; scripts e caminhos PHP antigos permanecem apenas como histórico.
