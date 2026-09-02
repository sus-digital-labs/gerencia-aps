# Proposta privada aos maintainers — rascunho

> **Não enviar, publicar ou abrir issue nesta rodada.**

## Objetivo da conversa

Solicitar esclarecimento sobre o contrato oficial necessário ao C1 e, separadamente, apresentar uma possível contribuição estrutural pequena para tornar o período de cálculo determinístico em dois consumidores existentes. As duas frentes não devem ser misturadas no mesmo pull request.

## Frente A — questão C1

**Título sugerido:** C1 — alinhar contrato de tipo de demanda no fluxo de Atendimento Individual.

**Pergunta:** qual campo ou relação o projeto utiliza para distinguir demanda programada e demanda espontânea no atendimento individual? A hipótese de contrato é a FK `co_dim_tipo_atendimento` ligada à chave `co_seq_dim_tipo_atendimento`, seguida de um campo semântico versionado; a FK não deve ser tratada diretamente como code set. Essa informação está disponível no pipeline que alimenta as bases derivadas, com identificador estável, competência, versão do modelo, code set e cardinalidade verificáveis?

O objetivo não é impor uma solução. Caso o campo exista em uma camada não documentada, solicitamos a indicação do arquivo, tabela, contrato ou transformação que o preserva. Caso não exista no pipeline atual, solicitamos que a lacuna seja reconhecida antes de qualquer cálculo.

**Não pedir nesta issue:** alteração da fórmula oficial, criação de proxy, backfill por aproximação, exposição de dados nominais ou reescrita da arquitetura.

## Frente B — possível contribuição estrutural

A auditoria identificou `datetime.today()` em geradores de Diabetes e Hipertensão e um conjunto comum de filtros/repositório. A hipótese é adicionar um contexto explícito de período e filtros, sem modificar fórmula, code set ou universo elegível.

A contribuição só deve ser proposta depois de obter dados sintéticos/Parquet de teste, executar baseline e provar equivalência exata entre saída legada e saída com contexto fixo. Se a equipe preferir, a frente pode permanecer como working paper até que o contrato de materialização seja documentado.

## Evidências já disponíveis

- O README upstream declara que o Painel é beta/experimental e que seus relatórios temáticos têm finalidade educacional [1].
- O snapshot auditado é `d21fe44562fd73c4ae46261a40496079b6e94f15`.
- `hypertension_diabetes_repository.py` atende os dois consumidores de condição.
- `hipertension_diabetes_queries.py` compartilha geradores SQL e leituras Parquet.
- Os geradores de Diabetes e Hipertensão usam janelas baseadas no relógio atual.
- Os testes direcionados foram coletados, mas a execução de cálculo ficou bloqueada pela ausência dos Parquet no clone.

## Ordem recomendada de revisão

1. Revisar internamente o rascunho da issue C1.
2. Solicitar aos maintainers o contrato do atendimento individual e do pipeline derivado.
3. Atualizar o mapa de candidatos com a evidência recebida.
4. Capturar baseline com dados sintéticos.
5. Prototipar `CalculationContext` somente em branch privada.
6. Executar teste diferencial e revisão de escopo.
7. Decidir entre `DIRECT_PR`, nova issue técnica ou `ISSUE_FIRST`.

## Estado recomendado

`FIOCRUZ_CORE_NEEDS_MORE_EVIDENCE`.

Não recomendar ainda `FIOCRUZ_CORE_PRIMITIVE_READY`, porque faltam os Parquet, o contrato completo de materialização e a validação independente de resultados.

## Referências

[1]: https://github.com/CampusVirtualFiocruz/painel-esus/tree/d21fe44562fd73c4ae46261a40496079b6e94f15 "CampusVirtualFiocruz/painel-esus — snapshot auditado"
[2]: c1-upstream-issue-draft.md "Rascunho privado da issue C1"
[3]: core-primitive-decision.md "Decisão privada da primeira primitive"
