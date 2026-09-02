# Análise de tabelas e-SUS APS — Saúde Brasil 360

**Revisão:** 2026-08-26  
**Natureza:** inventário interno de dependências; não é catálogo oficial do Ministério da Saúde.

## 1. Critério de análise

Esta análise organiza as tabelas esperadas para as 21 métricas do produto. A existência de uma tabela ou campo nesta lista não comprova que ele esteja presente na réplica, na competência ou no modelo de informação vigente. A confirmação deve ocorrer no schema da carga real e ser registrada com versão, competência e linhagem.

O fluxo atual deve tratar o e-SUS APS/PEC e o LEDI como fontes versionadas e de leitura controlada. Não usar banco local histórico, scripts antigos ou nomes de tabela de outro produto como premissa operacional.

## 2. Dimensões e cadastros

| Tabela | Função | Indicadores relacionados | Validação obrigatória |
|---|---|---|---|
| `tb_cidadao` / `tb_fat_cidadao_pec` | Identidade e elegibilidade da pessoa | B/C/M/CVAT | Chave técnica, CPF/CNS protegido e regra de deduplicação. |
| `tb_dim_equipe` | Equipe, INE e território | Todos | Tipo de equipe, INE e competência. |
| `tb_dim_profissional` / `tb_prof` | Profissional e lotação | B/C/M | Vigência de lotação e CBO. |
| `tb_dim_cbo` | Code set profissional | B/C/M | CBO da nota vigente. |
| `tb_dim_tempo` | Competência e datas | Todos | Janela e calendário Siaps. |
| `tb_dim_procedimento` / `tb_proced` | SIGTAP e procedimentos | B/C/M | Código, descrição e competência SIGTAP. |
| `tb_dim_ciap` / `tb_ciap` | CIAP-2 | C2–C7 | Código e vigência. |
| `tb_dim_cid` / `tb_cid10` | CID-10 | C2–C7 | Código e vigência. |
| `tb_dim_tipo_atendimento` | Tipo de atendimento/demanda | C1 | Chave no fato, code set oficial e cardinalidade. |
| `tb_tipo_equipe` | Tipo de equipe | C1–C7/M1/M2/CVAT | Correspondência com o escopo da nota. |

## 3. Fatos assistenciais

| Tabela | Função | Indicadores relacionados |
|---|---|---|
| `tb_fat_atendimento_individual` | Atendimentos individuais da APS | C1–C7, M1, M2 |
| `tb_fat_atendimento_odonto` | Atendimento odontológico | B1–B6, C3 |
| `tb_fat_atd_ind_procedimentos` | Procedimentos do atendimento individual | C2–C7 |
| `tb_fat_atd_ind_exames` | Exames do atendimento individual | C2, C3, C4, C7 |
| `tb_fat_atd_ind_problemas` | CID/CIAP do atendimento individual | C3, C4, C5, C7 |
| `tb_fat_atend_odonto_proced` | Procedimentos odontológicos | B3, B5, B6 |
| `tb_fat_atividade_coletiva` | Atividades coletivas | B4, M1, M2 |
| `tb_fat_atvdd_coletiva_part` | Participações em atividades coletivas | B4, M1, M2 |
| `tb_fat_atvdd_coletiva_propart` | Procedimentos por participante | B4, M2 |
| `tb_fat_visita_domiciliar` | Visitas ACS/TACS | C2, C3, C4, C5, C6, CVAT |
| `tb_fat_cad_domiciliar` | Cadastro domiciliar | C2, C3, C6, CVAT |
| `tb_fat_vacinacao` / `tb_registro_vacinacao` | Vacinação e doses | C2, C3, C6, C7 |
| `tb_fat_rel_op_gestante` | Gestação e puerpério | C3 |
| `tb_fat_ivcf` / `tb_fat_op_acompanhamento_idosa` | Avaliação/acompanhamento de pessoa idosa | C6 |
| `tb_fat_procedimento` | Procedimentos gerais | B3, B5, B6, C2–C7 |

## 4. C1 e a variável de demanda

A tabela `tb_fat_atendimento_individual` é o fato esperado para o C1, mas o schema auditado não comprova a variável que separa demanda programada de demanda espontânea. `tb_dim_tipo_atendimento` só pode participar do cálculo se a chave estiver presente no fato, se a dimensão estiver carregada na competência, se o code set estiver confirmado e se a relação não duplicar eventos.

O C1 permanece `C1_BLOCKED_BY_DATA_CONTRACT` até essa comprovação. A ausência do campo não pode ser preenchida por tipo de consulta, procedimento, texto livre ou proxy de acesso. Consulte [a issue P0 do C1](../13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md).

## 5. Identidade e território

A identidade deve ser técnica e protegida. A versão e-SUS APS 5.5.24 prioriza o CPF em fluxos de identificação e mantém o CNS para cidadãos sem CPF [1]. Isso não autoriza unir registros históricos de FCI e FCDT por aproximação.

Registros sem vínculo territorial, com identidade ambígua ou com inconsistências de responsável/domicílio devem permanecer pendentes e ser contabilizados separadamente. Não transformar pendência em ausência de atendimento.

## 6. Regras de carga

A ingestão deve registrar sistema de origem, versão, modelo de informação, competência, lote, chave idempotente, resultado da validação e motivo de rejeição. Dados enviados por versões incompatíveis com o Siaps devem ser rejeitados ou marcados como pendentes conforme as notas oficiais [2] [3].

## 7. Mapa para os indicadores

| Grupo | Dados principais |
|---|---|
| B1–B6 | Atendimento odontológico, procedimentos SIGTAP, equipe eSB, participação coletiva e code sets. |
| C1 | Atendimento individual, equipe, profissional e tipo oficial de demanda; **bloqueado sem a variável de demanda**. |
| C2–C3 | Atendimento, exame, vacinação, visita, cadastro, gestação/puerpério e odontologia conforme notas. |
| C4–C5 | Diagnóstico, consulta, medições, procedimentos, exames e visitas. |
| C6 | Pessoa idosa, consulta, medidas, visita, vacinação e avaliação. |
| C7 | Coortes da mulher, exames, procedimentos, vacinação e rastreamento. |
| M1–M2 | Atendimento individual/coletivo, pessoa assistida, equipe eMulti e compartilhamento. |
| CVAT1–CVAT6 | Cadastro, território, vínculo, acompanhamento e fonte de satisfação; regras derivadas. |

## Referências

[1]: https://sisaps.saude.gov.br/sistemas/esusaps/docs/Versoes/versao_5_5 "Ministério da Saúde — e-SUS APS versão 5.5.24"
[2]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NT_12-2025_criterio_validacao_dados_siaps-0394bed57dc6efcddaa83dab337f9533.pdf "Ministério da Saúde — Nota Técnica nº 12/2025"
[3]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NI_13-2025_cenario_versoes_incompativeis-90647909abe17697641f1a44b859e48a.pdf "Ministério da Saúde — Nota Informativa nº 13/2025"

**Status:** inventário atualizado; C1 explicitamente bloqueado quando a classificação de demanda não estiver comprovada.
