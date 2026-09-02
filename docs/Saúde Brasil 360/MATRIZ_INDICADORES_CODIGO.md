# Matriz de indicadores, código e fonte — Saúde Brasil 360

**Revisão:** 2026-08-26  
**Natureza:** matriz interna de rastreabilidade; não substitui notas metodológicas oficiais.

> **Regra de precedência:** a nota metodológica específica prevalece sobre esta matriz. A matriz descreve o contrato pretendido e o estado de integração local; não homologa resultados perante o Siaps.

## 1. Escopo

O produto trata 21 métricas operacionais: 15 indicadores de Qualidade APS (B1–B6, C1–C7 e M1–M2) e 6 subindicadores operacionais de CVAT (CVAT1–CVAT6). O catálogo oficial do Siaps também lista P1–P6, CR1–CR4 e R1–R6, que permanecem fora do escopo atual.

## 2. Matriz principal

| Código | Regra ou resultado esperado | Fonte/fatos principais | Status documental |
|---|---|---|---|
| B1 | Primeira consulta odontológica programada, conforme nota vigente | Atendimento odontológico, equipe e códigos oficiais | `requires_official_validation` quando code set ou denominador não estiverem comprovados |
| B2 | Tratamento odontológico concluído | Atendimentos e procedimentos odontológicos | `requires_official_validation` |
| B3 | Taxa de exodontias realizadas | Exodontias e procedimentos odontológicos elegíveis | `requires_official_validation` |
| B4 | Escovação dentária supervisionada | Atividade coletiva, participação e faixa etária | `requires_official_validation` |
| B5 | Procedimentos odontológicos individuais preventivos | Procedimentos odontológicos e tabela SIGTAP | `requires_official_validation` |
| B6 | Tratamento restaurador atraumático | Procedimentos odontológicos e tabela SIGTAP | `requires_official_validation` |
| C1 | Atendimentos de demanda programada / total de atendimentos elegíveis × 100 | `tb_fat_atendimento_individual` + classificação oficial da demanda | **`blocked_by_source` — falta variável comprovada no schema auditado** |
| C2 | Cuidado no desenvolvimento infantil conforme práticas e janela da nota | Atendimento individual, exames, vacinação, visitas e atividade coletiva | `requires_official_validation` quando houver fallback ou coorte incompleta |
| C3 | Cuidado na gestação e puerpério conforme práticas e janela da nota | Atendimento individual, exames, vacinação, visitas e odontologia | `requires_official_validation` |
| C4 | Cuidado da pessoa com diabetes conforme práticas e coortes | Atendimento, procedimentos, exames, visitas e diagnóstico | `requires_official_validation` |
| C5 | Cuidado da pessoa com hipertensão conforme práticas e coortes | Atendimento, visitas, antropometria e diagnóstico | `requires_official_validation` |
| C6 | Cuidado da pessoa idosa conforme práticas e coortes | Atendimento, visitas, vacinação e avaliação | `requires_official_validation` |
| C7 | Cuidado da mulher na prevenção do câncer conforme coortes | Atendimento, vacinação, procedimentos e rastreamento | `requires_official_validation` |
| M1 | Média de atendimentos da eMulti por pessoa assistida | Atendimento individual, atividades coletivas, pessoa e equipe eMulti | `requires_official_validation` até fechar escopo e chave de pessoa |
| M2 | Ações interprofissionais da eMulti / total de ações eMulti | Atendimento, atividades coletivas, profissionais e cuidado compartilhado | `requires_official_validation` |
| CVAT1 | Regra operacional de cadastro do vínculo territorial | Cadastro, equipe e domicílio | `derived_operational_rule` |
| CVAT2 | Regra operacional de continuidade/qualificação cadastral | Cadastro, território e competência | `derived_operational_rule` |
| CVAT3 | Regra operacional de perfil e vulnerabilidade territorial | Cadastro e dimensões territoriais | `derived_operational_rule` |
| CVAT4 | Regra operacional de acompanhamento territorial | Visita, cadastro e atendimento | `derived_operational_rule` |
| CVAT5 | Regra operacional de pessoa acompanhada | Eventos de cuidado e contatos qualificados | `derived_operational_rule` |
| CVAT6 | Regra operacional de satisfação/resultado do componente | Fonte de satisfação e consolidação oficial | `derived_operational_rule` ou `blocked_by_source` quando a fonte não estiver disponível |

## 3. Bloqueio específico do C1

A documentação interna anteriormente descrevia `atend_programados / total_atend`, mas o fato auditado não comprova a variável que classifica o atendimento como programado ou espontâneo. A presença textual de `tb_dim_tipo_atendimento` em uma matriz não é suficiente.

Até que a chave, a dimensão, o code set e a cardinalidade sejam validados, o C1 deve retornar `blocked_by_source` ou `blocked_by_schema`. Não usar tipo de consulta, texto livre, procedimento, evidência genérica de acesso ou outro proxy.

A issue completa está em [../13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md](../13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md).

## 4. Dependências de dados

| Família de fonte | Exemplos | Uso |
|---|---|---|
| Dimensões | `tb_dim_tempo`, `tb_dim_equipe`, `tb_dim_profissional`, `tb_dim_cbo`, `tb_dim_tipo_atendimento` | Competência, território, profissional, CBO e classificação. |
| Atendimentos | `tb_fat_atendimento_individual`, `tb_fat_atendimento_odonto` | Eventos assistenciais e denominadores. |
| Procedimentos/exames | `tb_fat_atd_ind_procedimentos`, `tb_fat_atd_ind_exames`, `tb_dim_procedimento` | Evidências clínicas e odontológicas. |
| Território/cadastro | `tb_fat_cidadao_pec`, `tb_fat_cad_individual`, `tb_fat_visita_domiciliar` | Elegibilidade, vínculo e acompanhamento. |
| Coletivas | `tb_fat_atividade_coletiva`, `tb_fat_atvdd_coletiva_part`, `tb_fat_atvdd_coletiva_propart` | Participação e ações interprofissionais. |
| Vacinação | `tb_fat_vacinacao`, `tb_registro_vacinacao` | Evidência vacinal conforme nota. |

Cada dependência deve ser confirmada no schema da competência. Nomes na documentação não garantem que a tabela ou campo esteja presente na réplica de produção.

## 5. SQL de referência

O trecho abaixo é apenas um esqueleto de revisão; não é consulta canônica e não deve ser executado sem conferir o schema e a nota do indicador.

```sql
-- Esqueleto não normativo. A classificação de demanda deve vir da fonte oficial.
SELECT
  e.nu_ine,
  a.co_fat_cidadao_pec,
  COUNT(DISTINCT a.co_seq_fat_atd_ind) AS atendimentos_elegiveis,
  COUNT(DISTINCT CASE
    WHEN tipo.demanda_classificada = 'PROGRAMADA'
    THEN a.co_seq_fat_atd_ind
  END) AS atendimentos_programados
FROM tb_fat_atendimento_individual AS a
JOIN tb_dim_equipe AS e
  ON e.co_seq_dim_equipe = a.co_dim_equipe_1
JOIN tb_dim_tipo_atendimento AS tipo
  ON tipo.co_seq_dim_tipo_atendimento = a.co_dim_tipo_atendimento
WHERE a.co_fat_cidadao_pec IS NOT NULL
  AND a.co_dim_tempo BETWEEN :competencia_inicio AND :competencia_fim
GROUP BY e.nu_ine, a.co_fat_cidadao_pec;
```

Se qualquer tabela, chave ou classificação estiver ausente, interromper a consulta e emitir o estado de bloqueio. Não converter conjunto vazio em zero sem provar que a fonte foi carregada.

## 6. Campos permitidos na apresentação

Agregados podem conter código do indicador, competência, unidade, equipe, numerador, denominador, percentual, status, versão da regra, origem, frescor, contagem pendente, motivos de descarte e warnings.

CPF, CNS completo, nome, telefone, endereço, SQL bruto e stack trace não devem aparecer em payload agregado, log ou exemplo público. Detalhamento nominal exige autorização, minimização, mascaramento e trilha de auditoria conforme o contrato de privacidade.

## 7. Regras de cor e conceito

A interface deve distinguir claramente estado de fonte, execução técnica e conceito do indicador. Verde/vermelho só pode ser exibido quando o resultado estiver calculado com fonte validada; bloqueio, pendência e dado ausente não são resultados baixos.

Para a consolidação quadrimestral, usar a Nota Técnica nº 08/2026: média dos meses válidos e ponderação dos indicadores do Componente III [1].

## 8. Referências

[1]: https://sisaps.saude.gov.br/sistemas/siaps/assets/files/NT_08-2025_cvat-8638ee08a7310014262c2326c234d35a.pdf "Ministério da Saúde — Nota Técnica nº 08/2026"
[2]: ../sources/official-sources-registry.md "Registro mestre de fontes oficiais"

**Última revisão:** 2026-08-26.
