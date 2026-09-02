# C1 — alinhar contrato de tipo de demanda no fluxo de Atendimento Individual

> **Rascunho privado para revisão. Não publicar ainda.**

## 1. O que a metodologia C1 exige?

A metodologia do C1 — Mais Acesso à APS — exige calcular a proporção de atendimentos de demanda programada sobre o total de atendimentos elegíveis, multiplicada por 100 [1]. Numerador e denominador precisam usar o mesmo universo, período, equipe, unidade e critérios de elegibilidade definidos pela metodologia.

A separação entre demanda programada e espontânea precisa vir de informação explícita e verificável do modelo de dados. Ela não pode ser inferida por agenda, horário, texto livre, procedimento, CID/CIAP, CBO ou outro proxy local.

## 2. Qual é exatamente a lacuna encontrada?

No snapshot auditado (`d21fe44562fd73c4ae46261a40496079b6e94f15`), não foi possível comprovar ponta a ponta, para o Atendimento Individual, a cadeia que deveria fornecer a classificação de demanda:

```text
tb_fat_atendimento_individual.co_dim_tipo_atendimento
    → tb_dim_tipo_atendimento.co_seq_dim_tipo_atendimento
    → campo semântico versionado
    → demanda programada ou espontânea
```

O repositório contém, no fluxo odontológico, exemplo de join entre `co_dim_tipo_atendimento` e `tb_dim_tipo_atendimento.co_seq_dim_tipo_atendimento`. Isso não comprova que o fluxo de Atendimento Individual preserve a mesma relação, nem qual campo semântico e code set devem ser usados no C1.

## 3. Por que `co_dim_tipo_atendimento` não pode ser interpretado diretamente como 1/2/4/5/6?

`co_dim_tipo_atendimento` é uma chave estrangeira para a dimensão. Seu valor identifica uma linha de `tb_dim_tipo_atendimento`; ele não é, por si só, o código semântico do tipo de atendimento.

Os valores candidatos `1`, `2`, `4`, `5` e `6` só podem ser avaliados depois do join com a dimensão e da identificação do campo semântico vigente, como `nu_identificador`, `ds_tipo_atendimento` ou equivalente. Comparar diretamente a FK do fato com esses valores pode confundir uma chave substituta com o code set e classificar atendimentos incorretamente.

## 4. Qual informação precisamos que o upstream confirme?

Precisamos confirmar:

- qual fato/campo é a fonte canônica do tipo de demanda no Atendimento Individual;
- qual dimensão e chave realizam a resolução da FK;
- qual campo semântico distingue demanda programada e espontânea;
- qual é o code set oficial, sua fonte, versão e vigência;
- em qual etapa da extração/processamento essa informação é preservada;
- como competência, equipe, unidade, profissional/CBO e identificador do atendimento permanecem associados ao registro.

## 5. Quais provas precisam existir antes de habilitar o cálculo?

- [ ] A FK correta está presente no fato de Atendimento Individual utilizado pelo pipeline.
- [ ] A dimensão correspondente e o campo semântico estão identificados.
- [ ] O code set está documentado por fonte e versão aplicáveis à competência.
- [ ] A cardinalidade do join foi validada sem duplicação de atendimentos.
- [ ] Equipe, unidade, profissional/CBO, período e universo elegível seguem a metodologia.
- [ ] Códigos ausentes, desconhecidos ou sem dimensão têm tratamento fail-closed.
- [ ] `NO_DATA` é diferenciado de zero observado.
- [ ] O histórico/backfill está limitado às competências com dado original e dimensão compatível.
- [ ] A linhagem é preservada sem exposição de PII.
- [ ] Um caso sintético reproduz programada, espontânea, código desconhecido e dimensão ausente.
- [ ] Nenhum numerador, denominador ou percentual é publicado antes da aprovação das provas anteriores.

[1]: https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c1-mais-acesso/view "Ministério da Saúde — Nota Metodológica C1"
