# Alinhamento da equipe — Saúde Brasil 360

## Cover
Atualização documental e issue P0 do C1

SUS Analytics Web · 26 de agosto de 2026

## Slide 1
### O que mudou nesta revisão

- A documentação passou a ter uma sequência canônica: fontes → catálogo → status → contratos → operação → validação.
- O catálogo nacional do Siaps foi separado do escopo real do produto.
- Relatórios, protótipos e códigos antigos agora estão classificados como evidência histórica, não como regra vigente.

## Slide 2
### O produto trabalha com 21 métricas

| Bloco | Escopo | Estado |
|---|---:|---|
| Qualidade APS | 15: B1–B6, C1–C7, M1–M2 | Indicadores operacionais do produto |
| CVAT | 6: CVAT1–CVAT6 | Regras operacionais derivadas |
| Catálogo oficial fora do escopo | P1–P6, CR1–CR4, R1–R6 | Catalogados, mas não implementados |

A presença de uma nota no catálogo oficial não significa que o indicador esteja implementado localmente [1].

## Slide 3
### Fontes oficiais agora têm precedência explícita

- A nota metodológica específica define fórmula, população, janela, CBO e code set.
- Notas técnicas definem consolidação, pesos, classificação e operação.
- Manuais e modelos de informação definem campos, versões e interoperabilidade.
- Schema, testes e runtime comprovam a execução local, mas não substituem a norma [2].

## Slide 4
### C1: a regra é clara; o contrato ainda não é suficiente

> C1 = atendimentos de demanda programada ÷ total de atendimentos elegíveis × 100 [3]

O schema auditado de `tb_fat_atendimento_individual` não comprova uma variável confiável que diferencie demanda programada de demanda espontânea.

A simples referência a `co_dim_tipo_atendimento` ou `tb_dim_tipo_atendimento` não prova presença da chave, vigência do code set, integridade da dimensão ou cardinalidade sem duplicação.

## Slide 5
### A decisão P0 é não fabricar um resultado

| Decisão | Aplicação |
|---|---|
| `ISSUE_FIRST` | Corrigir o contrato antes de reabrir o cálculo. |
| `FAIL_CLOSED` | Bloquear quando a dependência obrigatória não for comprovada. |
| `C1_BLOCKED_BY_DATA_CONTRACT` | Código único para o bloqueio atual. |

Sem classificação oficial da demanda, não usar tipo genérico de consulta, procedimento, texto livre ou proxy de acesso [3].

## Slide 6
### O retorno temporário deve ser seguro e explicável

```json
{
  "indicatorCode": "C1",
  "status": "BLOCKED_BY_DATA_CONTRACT",
  "errorCode": "C1_BLOCKED_BY_DATA_CONTRACT",
  "safe": true,
  "warnings": ["C1_MISSING_OFFICIAL_DEMAND_TYPE"]
}
```

O retorno não publica percentual, numerador ou denominador como resultado válido e não transforma ausência de fonte em zero.

## Slide 7
### O contrato mínimo para reabrir o C1

- Chave estável do atendimento, competência, equipe, unidade, profissional e pessoa.
- Chave ou coluna de tipo de atendimento com code set oficial.
- Classificação `PROGRAMADA`, `ESPONTANEA` ou inválida, preservando código original, versão e linhagem.
- Testes de cardinalidade, idempotência, filtros e compatibilidade de versão [3].

## Slide 8
### Plano Windows: validar primeiro a fundação

1. Preparar ambiente reproduzível com Node, pnpm 10.4.1 e snapshot sanitizado.
2. Executar contrato, typecheck, build, formatação e testes Vitest.
3. Criar fixtures douradas por indicador e comparar runtime com uma referência independente.
4. Validar schema, filtros, janelas, denominadores, code sets, status e ausência de PII.
5. Só então validar o fluxo tRPC e a apresentação no dashboard [4] [5].

## Slide 9
### B1–B6 e C2–C7 precisam de testes por indicador

| Grupo | Principal prova |
|---|---|
| B1–B6 | Coorte eSB, procedimentos odontológicos, SIGTAP, ações coletivas, CBO e denominadores da nota. |
| C2 | Coorte infantil, consultas, antropometria, vacinação e visitas. |
| C3 | Gestação/puerpério, marcos temporais, consultas, exames e vacinação. |
| C4–C5 | Diagnóstico, consulta, medidas clínicas, exames/procedimentos e visitas. |
| C6 | Pessoa idosa, consulta, medidas, visita e influenza. |
| C7 | Coorte de prevenção do câncer, exames, procedimentos e vacinação. |

Cada caso deve ter esperado, observado, fonte, competência, versão da regra e evidência reproduzível.

## Slide 10
### Critério de saída para o alinhamento

- Indicador só é promovido quando fórmula, fonte, schema, fixture, runtime e UI forem coerentes.
- Falha de fonte vira bloqueio explícito; falha de dado não vira zero.
- A equipe assina uma matriz de evidências por indicador antes de qualquer homologação.
- O C1 permanece bloqueado até os critérios da issue P0 passarem.

## Referências

[1]: ../../official-indicators-registry.md "Registro canônico de indicadores"
[2]: ../sources/official-sources-registry.md "Registro mestre de fontes oficiais"
[3]: c1-data-contract-issue-2026-08-26.md "Issue P0 — contrato de dados do C1"
[4]: ../../apps/frontend/src/lib/analytics-contract.ts "Contrato analítico executável"
[5]: ../../apps/frontend/src/lib/analytics-contract.test.ts "Testes Vitest do contrato analítico"
[6]: https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/ "Índice oficial de Notas Metodológicas do Siaps"
