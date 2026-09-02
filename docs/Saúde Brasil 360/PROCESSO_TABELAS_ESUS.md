# Processo de tabelas e-SUS APS — Saúde Brasil 360

**Revisão:** 2026-08-26

## Objetivo

Manter o inventário de tabelas, campos e relacionamentos alinhado ao modelo de informação vigente do e-SUS APS/Siaps e às 21 métricas operacionais do produto. O processo deve distinguir existência no schema, validade do dado, compatibilidade da versão e suficiência para o indicador.

## Fluxo obrigatório

| Etapa | Atividade | Saída |
|---:|---|---|
| 1 | Consultar a nota metodológica e a fonte do indicador | Regra, janela, CBO e code set de referência. |
| 2 | Identificar sistema de origem, versão e modelo | Metadados de compatibilidade. |
| 3 | Inspecionar tabelas e colunas no schema da competência | Inventário real, não presumido. |
| 4 | Validar chaves e cardinalidade | Relações sem duplicação ou perda silenciosa. |
| 5 | Testar nulos, códigos desconhecidos e duplicidades | Relatório de qualidade. |
| 6 | Verificar escopo territorial e profissional | Equipe, unidade, INE, CBO e competência. |
| 7 | Registrar lote e chave idempotente | Reprocessamento seguro. |
| 8 | Atualizar matriz, contrato e changelog | Rastreabilidade documental. |

## Categorias de tabela

| Categoria | Exemplos | Uso |
|---|---|---|
| Dimensões | `tb_dim_*` | Tempo, equipe, profissional, CBO, procedimento e tipo. |
| Atendimento individual | `tb_fat_atendimento_individual` | C1–C7 e M1/M2. |
| Atendimento odontológico | `tb_fat_atendimento_odonto`, `tb_fat_atend_odonto_proced` | B1–B6. |
| Procedimentos e exames | `tb_fat_atd_ind_procedimentos`, `tb_fat_atd_ind_exames` | Evidências clínicas. |
| Cadastro e território | `tb_fat_cidadao_pec`, `tb_fat_cad_domiciliar`, `tb_fat_visita_domiciliar` | Elegibilidade, vínculo e CVAT. |
| Atividade coletiva | `tb_fat_atividade_coletiva`, `tb_fat_atvdd_coletiva_part` | B4, M1 e M2. |
| Vacinação | `tb_fat_vacinacao`, `tb_registro_vacinacao` | C2, C3, C6 e C7. |

## Regra especial do C1

O C1 exige a classificação de demanda programada e espontânea. A tabela `tb_fat_atendimento_individual` e a dimensão `tb_dim_tipo_atendimento` só podem ser usadas após comprovação da chave no fato, da dimensão na competência, do code set oficial e da cardinalidade.

Como o schema auditado não comprova essa variável, o C1 deve permanecer `blocked_by_source`. Não usar texto livre, procedimento ou tipo genérico de consulta como substituto. A [issue P0 do C1](../13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md) contém os critérios de aceite.

## Inspeção segura do schema

A inspeção deve consultar `information_schema.columns` e `information_schema.table_constraints`, registrar o resultado e associá-lo à competência e à versão do modelo. Uma lista de nomes na documentação não substitui essa evidência.

## Regras de qualidade

A chave de origem deve ser estável. O reprocessamento do mesmo lote não pode duplicar fatos. Registros sem identidade comprovada, vínculo territorial inválido, código não reconhecido ou versão incompatível devem ficar rejeitados ou pendentes com motivo explícito.

A Nota Técnica nº 12/2025 determina validação por versão do modelo de informação e rejeição de dados enviados por versões liberadas há mais de 12 meses [1]. A Nota Informativa nº 13/2025 registra o risco operacional de CDS Offline e versões antigas [2].

## Registro de mudança

Toda nova tabela ou campo deve registrar nome, função, indicador, fonte, competência, versão, colunas utilizadas, relacionamento, regra de privacidade e data de verificação. O changelog deve informar se houve alteração de contrato, migração, backfill ou somente documentação.

## Arquivos relacionados

- [Guia rápido](GUIA_RAPIDO_TABELAS.md)
- [Análise de tabelas](ANALISE_TABELAS_ESUS.md)
- [Matriz de indicadores](MATRIZ_INDICADORES_CODIGO.md)
- [Issue C1](../13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md)
- [Registro mestre de fontes](../sources/official-sources-registry.md)

## Referências

[1]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NT_12-2025_criterio_validacao_dados_siaps-0394bed57dc6efcddaa83dab337f9533.pdf "Ministério da Saúde — Nota Técnica nº 12/2025"
[2]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NI_13-2025_cenario_versoes_incompativeis-90647909abe17697641f1a44b859e48a.pdf "Ministério da Saúde — Nota Informativa nº 13/2025"

**Status:** processo atualizado; materiais PHP antigos permanecem somente como histórico.
