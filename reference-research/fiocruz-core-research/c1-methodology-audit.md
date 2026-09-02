# C1 - Mais Acesso à APS: Methodology and Data Contract Audit

## Fonte vigente verificada

- `SOURCE_URL`: https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c1-mais-acesso
- Índice oficial: https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/
- `SOURCE_VERSION`: SEI 0054814890, CRC C114323A
- `SOURCE_LAST_UPDATED`: 2026-06-24 16:08, conforme página do Ministério da Saúde
- Assinaturas: 2026-06-23 e 2026-06-24
- `CHECKED_AT`: 2026-08-26, fuso America/Sao_Paulo
- Revoga: Nota Metodológica C1 0050084955

## Contrato normativo

- Unidade: percentual.
- Acumulativo: não.
- Atualização/monitoramento: mensal.
- Avaliação: quadrimestral.
- Granularidade primária: INE.
- Fonte: SIAPS e SCNES.
- Numerador: total de atendimentos de demanda programada.
- Denominador: total de atendimentos classificados como demanda programada ou espontânea.

### Demanda programada

- consulta agendada programada;
- cuidado continuado;
- consulta agendada.

### Demanda espontânea

- escuta inicial/orientação;
- consulta no dia;
- atendimento de urgência.

### Equipes elegíveis

- tipo 70: eSF, 40h;
- tipo 76: eAP, 20h e 30h.

### CBO elegíveis

- 2251-42;
- 2251-70;
- 2251-30;
- 2251-25;
- 2252-50;
- 2235-65;
- 2235-05.

Os CBO 2251-25 e 2252-50 foram incluídos na versão assinada em junho de 2026.

### Classificação

| Percentual | Classificação |
|---:|---|
| `<= 10` | Regular |
| `> 10` e `<= 30` | Suficiente |
| `> 30` e `<= 50` | Bom |
| `> 50` e `<= 70` | Ótimo |
| `> 70` | Regular |

## Regras que exigem confirmação de engenharia

- o atendimento precisa estar no Modelo de Informação de Atendimento Individual, inclusive presencial, domiciliar ou remoto;
- o tipo de demanda precisa ser campo específico, não inferência por data/agenda;
- CNS profissional identificado;
- profissional em CBO elegível;
- alocação válida em INE/CNES e equipe tipo 70/76;
- pessoa identificada com nome, nascimento e CPF ou CNS válido conforme CadSUS;
- competência mensal explícita.

## Contrato atual do upstream

`CreateAtendIndivBaseRepository` extrai de `tb_fat_atendimento_individual`:

- `co_seq_fat_atd_ind`;
- `co_fat_cidadao_pec`;
- `co_dim_tempo`;
- `co_dim_cbo_1`, `co_dim_cbo_2`;
- peso, altura e nascimento;
- filtros CID, CIAP e procedimentos.

Não são materializados no Parquet atual:

- tipo de demanda/tipo de atendimento;
- INE da produção;
- CNES da produção;
- CNS/identificador validável do profissional;
- vínculo/vigência da equipe e tipo 70/76 no contexto do evento;
- estado de identificação CadSUS necessário à regra geral.

Há `tb_dim_equipe`, `tb_dim_unidade_saude` e `tb_dim_cbo` em extrações separadas, mas o fato atual não preserva todas as chaves necessárias para provar os joins normativos do C1.

## Resultado do contrato

`C1_BLOCKED_BY_DATA_CONTRACT`

Não implementar heurística. Antes do cálculo, confirmar em uma versão PEC suportada:

1. coluna exata do fato que referencia `tb_dim_tipo_atendimento` ou campo equivalente;
2. códigos estáveis para os seis tipos de demanda;
3. chaves do evento para CBO, profissional, INE e CNES;
4. vigência e tipo da equipe na competência;
5. regra verificável para identificação válida da pessoa;
6. se a unidade de contagem é evento único por `co_seq_fat_atd_ind` após todos os joins.

## Semântica não definida explicitamente pela nota

A nota não especifica um valor numérico para denominador zero. Proposta para alinhamento: retornar `status=NO_DATA`, `value=null`, numerador 0 e denominador 0. Isso é decisão de produto/engenharia, não regra normativa inferida.

## Golden fixtures planejadas

Expected values devem ser escritos manualmente:

| Caso | Programada | Total | Percentual | Expected |
|---|---:|---:|---:|---|
| limite 10 | 1 | 10 | 10 | Regular |
| acima de 10 | 11 | 100 | 11 | Suficiente |
| limite 30 | 3 | 10 | 30 | Suficiente |
| acima de 30 | 31 | 100 | 31 | Bom |
| limite 50 | 1 | 2 | 50 | Bom |
| acima de 50 | 51 | 100 | 51 | Ótimo |
| limite 70 | 7 | 10 | 70 | Ótimo |
| acima de 70 | 71 | 100 | 71 | Regular |
| sem denominador | 0 | 0 | nulo | NO_DATA, pendente de alinhamento |

Também cobrir: dados inválidos, CBO não elegível, equipe não elegível, tipo fora das seis categorias, evento duplicado e competência/INE diferentes.

