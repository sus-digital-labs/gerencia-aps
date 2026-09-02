# Minimal Calculation Core Proposal

Status: design privado; nenhuma implementação realizada.

## Forças do desenho

- determinismo por período e snapshot;
- rastreabilidade metodológica;
- resultado agregado sem PII;
- compatibilidade com execução local atual;
- preparação para incrementalidade sem implementá-la na primeira contribuição;
- adoção por consumidores reais, não por antecipação.

## Sequência mínima recomendada

### 0. C1 Encounter Contract

Pré-requisito. Ampliar a extração de Atendimento Individual somente com campos confirmados no PEC suportado e uma fixture sintética que prove os joins e cardinalidades.

### 1. CalculationContext

```text
reference_period: competência mensal fechada
scope: municipality/cnes/ine conforme necessidade, com INE obrigatório no C1
source_snapshot: fingerprint/identificador do conjunto de entrada
```

Paths e relógio não pertencem à regra do indicador. `reference_period` substitui `today()`.

### 2. MethodologySpec

Justificado já no C1 porque houve versão revogada e inclusão de CBO em 2026.

```text
indicator_code
indicator_name
version (SEI/document id)
effective_from
source_url
granularity
eligible_cbos
eligible_team_types
rules/fingerprint
```

O spec deve ser dado declarativo validado, não um mecanismo genérico de executar qualquer regra.

### 3. CalculationResult

```text
indicator
methodology_version
reference_period
scope
numerator
denominator
value
classification
status
data_quality
```

Invariantes:

- nenhuma PII;
- `value` nulo quando `status=NO_DATA`;
- numerador e denominador inteiros não negativos;
- numerador não excede denominador no C1;
- período, INE e versão sempre presentes.

### 4. C1 pure calculation

Recebe encontros já normalizados e elegíveis, agrupa por INE + competência, conta eventos únicos e aplica as faixas. Não acessa filesystem, banco, ambiente ou relógio.

### 5. IndicatorRunner - adiado

Não implementar na primeira mudança apenas para envolver uma função. Avaliar quando Diabetes ou Hipertensão provar o segundo contrato executável. O runner futuro orquestra `definition + context -> result`, sem regra de saúde.

## Opções consideradas

| Opção | Complexidade | Benefício imediato | Risco | Decisão |
|---|---|---|---|---|
| C1 direto dentro do script atual | baixa | entrega rápida | repete relógio/path/metodologia implícita | rejeitar |
| quatro primitivas completas + runner | média/alta | desenho uniforme | abstração antes do segundo consumidor | adiar runner |
| contrato de encontros + Context/Spec/Result + C1 puro | média | resolve bloqueios reais e é testável | exige alinhar PEC primeiro | recomendada |
| framework distribuído | alta | escala horizontal futura | sem evidência de limite local | rejeitar nesta fase |

## Data quality do resultado

O resultado pode carregar somente contagens agregadas, por exemplo:

- eventos lidos;
- eventos excluídos por tipo desconhecido;
- eventos excluídos por CBO/equipe;
- duplicatas removidas por ID de evento;
- INE/CNES ausente;
- identificador profissional ausente;
- identificador de pessoa inválido.

Falhas que comprometem o denominador devem produzir status explícito, não apenas log.

## Preparação para incrementalidade

Persistir como metadados, sem implementar scheduler distribuído:

```text
partition = reference_period + ine
input_fingerprint
methodology_fingerprint
dependency_fingerprints
result_fingerprint
```

Regra futura:

- mesmos fingerprints: reutilizar;
- input alterado: recalcular partições afetadas;
- metodologia alterada: invalidar períodos cobertos por sua vigência.

