# Matriz canônica da autoridade Rust — Saúde Brasil 360

> **Fotografia:** 26/07/2026
> **Escopo:** 21 cálculos operacionais — B1-B6, C1-C7, M1-M2 e CVAT1-CVAT6
> **Fonte estruturada:** [`b360-rust-authority-matrix.json`](./b360-rust-authority-matrix.json)
> **Manifesto normativo:** [`official-source-manifest-2026-07-25.json`](../indicator-field-catalog/sources/official-source-manifest-2026-07-25.json)
> **Intake não canônico auditado:** [`b360-source-intake-audit-2026-07-26.md`](./b360-source-intake-audit-2026-07-26.md)

Esta matriz é a referência de prontidão da migração. Um PDF oficial validado comprova
proveniência normativa, não comprova implementação. Código compilado comprova source,
não comprova golden, paridade, runtime, painel nem cutover clínico.

## Corte global

Fotografia persistida em 2026-07-26 para o tenant `dm-technology-master` e o
município `2902906`:

- source Rust: 21/21;
- resultados persistidos: 21/21;
- resultados `BLOCKED_BY_SOURCE`: 16;
- resultados ausentes no escopo: nenhum;
- resultados `READY`: B3, B5, B6, M1 e M2;
- auditoria atual `READY_FOR_REVIEW`: somente M1 e M2;
- auditoria atual `BLOCKED`: B3, B5 e B6;
- sem auditoria de cutover: 16 indicadores;
- goldens e dual-runs persistidos: 5/21, mas os três odontológicos históricos
  não satisfazem o contrato de fonte corrente;
- autoridade ativa e comprovada: 2/21, M1 e M2.

Conclusão: `RUST_SOURCE_21_OF_21_CUTOVER_2_OF_21`. O detalhamento reproduzível
está em `docs/19-development/parallel/closure-rust-global-gates-20260725.md`.

## Resultado atual

| Indicador | Regra oficial | Versão Rust | Fontes reais | Rust | TypeScript | Read model | Golden | Dual-run | Runtime real | Painel | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | SEI 0054640774 | B1@2026.5 | 8 fontes fechadas; cadastro individual aberto, vínculo eSB→eSF/eAP ausente e uma consulta sem SIGTAP oficial | contrato tipado, dedupe pessoa+dentista/12m, população vinculada fail-closed, cálculo set-based, idempotência e linhagem | fallback legado bloqueado pelo registry v7 | BLOCKED: numerador candidato 34, denominador indisponível, 9 fontes | ausente | ausente | materialização real 25.112 ms; replay idempotente | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| B2 | SEI 0054640775 | B2@2026.5 | 8/8 fontes completas; falta vínculo oficial eSB→eSF/eAP e há uma primeira consulta histórica sem SIGTAP 0301010153 | contrato tipado, dedupe pessoa+dentista/12m, cálculo set-based, idempotência e linhagem | fallback legado bloqueado pelo registry v7 | BLOCKED: 19/34 = 55,882353%, 8 fontes | ausente | ausente | materialização real 25.377 ms; replay idempotente | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| B3 | SEI 0054640777 | B3@2026.5 | fatos clínicos completos; SCNES/eGestor confirmam eSB 40h homologada, mas não o vínculo exato eSB→eSF/eAP | cálculo set-based, snapshot, idempotência e linhagem; gate de equipe v6 fail-closed | fallback legado bloqueado | resultado histórico 108/986; 0/1 comprovado pelo gate v6 | bundle anterior invalidado para promoção pela migration 0011 | MATCH histórico, insuficiente sem vínculo | flags desligadas; flags `true` retornam `READINESS_REQUIRED` | valor bloqueado no estado corrente | **BLOQUEADO_POR_FONTE** |
| B4 | SEI 0054640778 | B4@2026.5 | 11 fontes; três snapshots abertos, 116 participantes sem CNS, 13 práticas sem SIGTAP e vínculo oficial ausente | contrato mensal tipado, atividade 6/prática 04/SIGTAP/CBO/CNS/idade, vínculo NT30, cálculo set-based, idempotência e linhagem | fallback legado bloqueado pelo registry v7 | BLOCKED: numerador candidato 0, denominador indisponível, 11 fontes; replay idempotente | ausente | ausente | materialização real 791 ms após os índices | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| B5 | SEI 0054640779 | B5@2026.5 | fatos clínicos completos; SCNES/eGestor confirmam eSB 40h homologada, mas não o vínculo exato eSB→eSF/eAP | cálculo set-based, snapshot, idempotência e linhagem; gate de equipe v6 fail-closed | fallback legado bloqueado | resultado histórico 632/1.447; 0/1 comprovado pelo gate v6 | bundle anterior invalidado para promoção pela migration 0011 | MATCH histórico, insuficiente sem vínculo | flags desligadas; flags `true` retornam `READINESS_REQUIRED` | valor bloqueado no estado corrente | **BLOQUEADO_POR_FONTE** |
| B6 | SEI 0054640781 | B6@2026.5 | fatos clínicos completos; SCNES/eGestor confirmam eSB 40h homologada, mas não o vínculo exato eSB→eSF/eAP | cálculo set-based, snapshot, idempotência e linhagem; gate de equipe v6 fail-closed | fallback legado bloqueado | resultado histórico 12/346; 0/1 comprovado pelo gate v6 | bundle anterior invalidado para promoção pela migration 0011 | MATCH histórico, insuficiente sem vínculo | flags desligadas; flags `true` retornam `READINESS_REQUIRED` | valor bloqueado no estado corrente | **BLOQUEADO_POR_FONTE** |
| C1 | SEI 0054814890 | C1@2026.4 / schema 1 | snapshot aberto e tombstones incompletos | source implementado | C1@2026.2 guardado | BLOCKED persistido; 805 atendimentos no manifesto, valores nulos, linhagem 8 | 0 | 0 | snapshot e resultado reais; replay preservou IDs | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| C2 | SEI 0054824593 | C2@2026.4 / schema 1 | 9 gates oficiais incompletos; 76 crianças sem `linked_at` | source implementado | C2@B360-2026.3 guardado | BLOCKED persistido; 2.556 linhas tipadas, valores nulos, linhagem 10 | 0 | 0 | snapshot e resultado reais; replay preservou IDs | bloqueio visível, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| C3 | SEI 0054619475 | C3@2026.6 | 21 fontes tipadas; oito snapshots abertos | coorte gestacional por episódios de DUM, exclusões, CNS/CBO, práticas A-K set-based, agregado, idempotência e linhagem | fallback legado bloqueado pelo registry v7 | BLOCKED: valores nulos, 21 fontes; migration 0015 | ausente | ausente | materialização real 273 ms; replay idempotente | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| C4 | SEI 0055986848 | C4@2026.6 | 20 fontes tipadas; oito snapshots abertos | diabetes ativa desde 2013, exclusões, CNS/CBO, práticas A-F set-based, exceção eAP, agregado, idempotência e linhagem | fallback legado bloqueado pelo registry v7 | BLOCKED: valores nulos, 20 fontes; migration 0016 | ausente | ausente | materialização real 272 ms; replay idempotente | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| C5 | SEI 0056042518 | C5@2026.6 | 19 fontes tipadas; oito snapshots abertos e campo coletivo de pressão ausente | hipertensão ativa desde 2013, exclusões, CNS/CBO, práticas A-D set-based, exceção eAP, agregado, idempotência e linhagem | fallback legado bloqueado pelo registry v7 | BLOCKED: valores nulos, 19 fontes; migration 0017 | ausente | ausente | materialização real 137 ms; replay idempotente | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| C6 | SEI 0056053813 | C6@2026.6 | 19 fontes tipadas; oito snapshots abertos | coorte 60+, CNS/CBO, práticas A-D, antropometria no mesmo dia, influenza 33/77, exceção eAP, cálculo set-based | fallback legado bloqueado pelo registry v7 | BLOCKED: valores nulos, 19 fontes; migration 0018 | ausente | ausente | materialização real 270 ms; replay idempotente | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| C7 | SEI 0054641718 | C7@2026.6 | 14 fontes tipadas; seis snapshots abertos | quatro coortes, pesos 20/30/30/20, janelas oficiais, HPV por idade, cálculo set-based, idempotência e linhagem | fallback legado bloqueado pelo registry v7 | BLOCKED: valores nulos, 14 fontes; migration 0019 | ausente | ausente | materialização real 243 ms; replay idempotente | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| M1 | SEI 0055952286 | M1@2026.6 | 8/8 fontes PEC fechadas, manifesto imutável e 9 fontes de linhagem | cálculo set-based, idempotência e materialização Rust | fallback legado bloqueado | READY: 387/320 = 1,209375 | MATCH | MATCH, delta 0 | ativo após readiness; 11 ms | dashboard e detalhe comprovados | **ACTIVE_AND_PROVEN** |
| M2 | SEI 0055952438 | M2@2026.6 | 10/10 fontes PEC fechadas, manifesto imutável e 14 fontes de linhagem | deduplicação, cálculo set-based, idempotência e materialização Rust | fallback legado bloqueado | READY: 3/410 = 0,731707% | MATCH | MATCH, delta 0 | ativo após readiness; 7 ms | dashboard e detalhe comprovados | **ACTIVE_AND_PROVEN** |
| CVAT1 | SEI 0049700833 | CVAT1@2025.1 | 7 fontes tipadas; `tb_cidadao`, `tb_fat_cad_individual` e `tb_fat_cidadao_pec` abertos | MICI válido, escopo INE/CNES, exclusões, cálculo set-based, snapshot content-addressed, idempotência e linhagem | fallback legado bloqueado pelo registry v7 | BLOCKED: valores nulos, 7 fontes; migrations 0020/0021 | ausente | ausente | materialização real 497 ms; replay idempotente pelo binário release | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| CVAT2 | SEI 0049700833 | CVAT2@2025.1 | 9 fontes tipadas; 5 snapshots abertos e `st_recusa_cadastro` ainda ausente do payload MICDT corrente | vínculo MICI→responsável→família→MICDT, validade 24m, ambiguidade fail-closed, cálculo set-based, snapshot, idempotência e linhagem | fallback legado bloqueado pelo registry v7 | BLOCKED: valores nulos, 9 fontes; migrations 0022/0023 | ausente | ausente | materialização real 878 ms; sondagem 1.626/2.370 em 15,3 s | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| CVAT3 | SEI 0049700833 | CVAT3@2025.1 | 9 fontes tipadas; 5 snapshots abertos e `st_recusa_cadastro` ausente do payload MICDT corrente | atualização separada MICI/MICDT, última alteração, 24m, ambiguidade fail-closed, cálculo set-based, snapshot, idempotência e linhagem | fallback legado bloqueado pelo registry v7 | BLOCKED: valores nulos, 9 fontes; migration 0024 | ausente | ausente | materialização real 1.737 ms; sondagem MICI 1.690/2.365 e MICDT 1.792/2.360 | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| CVAT4 | SEI 0049700833 | CVAT4@2025.1 | 17 fontes tipadas; 7 snapshots abertos | MICI válido, sete modelos, 12m, 2 contatos, prática obrigatória, dimensões Siaps, cálculo set-based, idempotência e linhagem | fallback legado bloqueado pelo registry v7 | BLOCKED: valores nulos, 17 fontes; migration 0025 | ausente | ausente | materialização real 398 ms; replay idempotente | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| CVAT5 | SEI 0049700833 | CVAT5@2025.1 | dependência das 17 fontes CVAT4 e snapshot PBF/BPC pseudonimizado; fonte PBF/BPC real ausente | quatro coortes 1/1,2/1,3/2,5, limites <5 e ≥60, importador/qualidade/hash fail-closed | fallback legado bloqueado pelo registry v7 | BLOCKED: valores nulos, 17 fontes; migration 0026 | ausente | ausente | materialização real 411 ms; replay idempotente; nenhum snapshot PBF/BPC | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |
| CVAT6 | SEI 0049700833 | CVAT6@2025.1 | 19 fontes PEC tipadas; 9 snapshots abertos, `st_recusa_cadastro` ausente e fontes PBF/BPC, IBGE/SCNES e Meu SUS ausentes | desempate oficial fail-closed, MICI/MICDT, parâmetros, fatores, X+Y, bônus, importadores, hashes, idempotência e linhagem | fallback legado bloqueado pelo registry v7 | BLOCKED: valores nulos, 19 fontes; migration 0027 | ausente | ausente | materialização real 549 ms; replay idempotente; rollback protegido | fail-closed, sem valor numérico | **BLOQUEADO_POR_FONTE** |

## Evidência do snapshot de runtime

- O registro Rust fechado contém `B1`, `B2`, `B3`, `B4`, `B5`, `B6`, `C1`,
  `C2`, `C3`, `C4`, `C5`, `C6`, `C7`, `CVAT1`, `CVAT2`, `CVAT3`, `CVAT4`,
  `CVAT5`, `CVAT6`, `M1` e `M2`.
- CVAT6 está implementado no source Rust e na migration aditiva
  `0027_cvat6_read_model` (SHA-256
  `8a57d10d326b58ad15b472c94705d3a540e7ed7b41f2e468804bbe6e9ea1daf6`).
  O escopo real `2902906` / INE `0000181528` / abril de 2026 resolveu equipe
  e unidade, mas encontrou nove snapshots PEC abertos, o campo
  `st_recusa_cadastro` ausente do payload domiciliar e nenhuma fonte oficial
  READY para PBF/BPC, parâmetro IBGE/SCNES ou satisfação Meu SUS Digital. A
  materialização persistiu `BLOCKED_BY_SOURCE` em 549 ms, com 19 fontes de
  linhagem, e o replay preservou os IDs `9593f7d9-c1b8-49d1-ac35-742717f20859`
  e `8e84de1b-feda-4bbd-a67c-7cf5f975a409`. Não há golden, dual-run, cutover
  ou prova de painel Rust; a tentativa de rollback foi recusada porque já
  existe evidência durável CVAT6, preservando migration, constraints e dados.
- B1 está implementado no source Rust e na migration aditiva
  `0013_b1_read_model` (SHA-256
  `f02aebe71c82859168419ef59a2e8a27f1ce7c97953f3601e4acdfd24b3bf7cc`).
  No escopo real `2902906` / INE `0001823299` / abril de 2026, encontrou
  numerador candidato 34 e persistiu `BLOCKED_BY_SOURCE` com nove fontes de
  linhagem. A execução de 25.112 ms foi repetida com os mesmos IDs. Os
  bloqueios são `B1_FIRST_CONSULTATION_PROCEDURE_MISSING`,
  `DENTAL_LINKAGE_EVIDENCE_MISSING`,
  `SOURCE_SNAPSHOT_OPEN:tb_fat_cad_individual` e
  `SOURCE_TEAM_ELIGIBILITY_INCOMPLETE`; portanto não há denominador oficial,
  manifesto, golden, dual-run, cutover ou prova de painel Rust para B1.
- B2 está implementado no source Rust e na migration aditiva
  `0012_b2_read_model` (SHA-256
  `e1c037a144e32bea3ce535a89313e4946857c61877883e8cff98e9d1c40755ab`),
  mas não foi registrado nem ativado no BFF. No escopo real `2902906` / INE
  `0001823299` / abril de 2026, o cálculo oficial mensal produziu `19/34 =
  55,882353%`, persistiu resultado `BLOCKED_BY_SOURCE` com oito fontes de
  linhagem e repetiu a mesma execução por idempotência. Os bloqueios são
  `B2_FIRST_CONSULTATION_PROCEDURE_MISSING`,
  `DENTAL_LINKAGE_EVIDENCE_MISSING` e
  `SOURCE_TEAM_ELIGIBILITY_INCOMPLETE`; portanto não há manifesto, golden,
  dual-run, cutover ou prova de painel Rust para B2.
- B4 está implementado no source Rust e na migration aditiva
  `0014_b4_read_model` (SHA-256
  `91255f2eccb670a345af5e4652fa43d87e6e2e30b8947f0249c564ee210fff1b`),
  mas não foi registrado nem ativado no BFF. A validação transacional criou
  os três índices set-based, confirmou as 16 constraints com B4 e executou o
  rollback com zero diferenças e zero índices residuais. No escopo real
  `2902906` / INE `0001823299` / abril de 2026, o diagnóstico encontrou 14
  eventos, 13 práticas de escovação, zero evento com SIGTAP oficial, 152
  participantes, 22 na idade elegível e 116 sem CNS. O numerador oficial
  candidato é zero e o denominador fica indisponível sem vínculo oficial. Os
  bloqueios são `B4_PARTICIPANT_CNS_MISSING`,
  `B4_SUPERVISED_BRUSHING_PROCEDURE_MISSING`,
  `DENTAL_LINKAGE_EVIDENCE_MISSING`, os snapshots abertos de
  `tb_fat_atvdd_coletiva_ext`, `tb_fat_cad_individual` e
  `tb_fat_cidadao_pec`, além de `SOURCE_TEAM_ELIGIBILITY_INCOMPLETE`.
  A materialização persistiu `BLOCKED_BY_SOURCE` em 791 ms, com 11 fontes de
  linhagem, e o replay retornou os mesmos IDs de execução
  `fc065d75-04cd-4331-8b5d-01c00266e5f9` e resultado
  `8b3a8bcd-b4e1-438e-a8af-08f5f46de174`. Portanto não há manifesto, golden,
  dual-run, cutover ou prova de painel Rust para B4.
- B3/B5/B6 estão desativados no container. Em prova controlada, as seis flags
  foram ligadas temporariamente e o registry v6 manteve os três em
  `READINESS_REQUIRED`; as chamadas agregadas retornaram HTTP 412.
- `B360_RUST_C1_AUTHORITY_ENABLED`, `B360_RUST_C1_PARITY_APPROVED`,
  `B360_RUST_C2_AUTHORITY_ENABLED` e `B360_RUST_C2_PARITY_APPROVED` estão
  desligadas no container observado. As quatro flags equivalentes de M1/M2
  estão ativas no runtime validado após a auditoria persistida.
- `sus_analytics_ingest.b360_source_records_v1` e o respectivo status estão
  `READY`, com hash versionado
  `ec42a191db669c28f9f0011652e9b5a61a90590d40699ca39db9d38d1be23506`
  e 12/12 índices válidos/prontos.
- O contrato `b360_date_quality` também está `READY`, com hash
  `96c33bbc87a45628af6b5d4d0e54ed6339fe750886e7653179e59c2996a1aeeb`,
  13 projeções e 11 fontes.
- C1 possui manifesto imutável com 805 atendimentos e resultado
  `BLOCKED_BY_SOURCE` no escopo canônico, com valores numéricos nulos e oito
  fontes de linhagem. O replay preservou os mesmos IDs.
- C2 possui manifesto imutável com 76 crianças, 517 consultas, 278 registros de
  antropometria, 693 visitas e 992 vacinas, totalizando 2.556 linhas tipadas.
  O resultado `BLOCKED_BY_SOURCE` tem valores numéricos nulos e dez fontes de
  linhagem; o replay preservou os mesmos IDs. As 76 crianças sem `linked_at`
  explicam `SOURCE_PROJECTION_INVALID` junto de
  `SOURCE_TEAM_LIFECYCLE_INCOMPLETE`.
- `dm-sync-ingest` e `dm-sync-normalizer` estão saudáveis, usam a mesma imagem
  `sha256:9db7ffd4e6a07be6048cdab22e0914c78581b79a29d5d2b65805bb447c0c326a`
  e possuem rótulos do projeto Compose `dm-gov-saude-sus-analytics-sync`.
- No escopo real `2902906` / INE `0000181439` / competência `2026-06`, foram
  observados 805 atendimentos C1 distintos. O primeiro dry-run revelou um plano
  C2 INE-first e timeout de 300 s; a reescrita set-based por coorte reduziu a
  etapa isolada de visitas de mais de 90 s para 1,04 s.
- Após o dry-run inicial, a produção persistente foi otimizada para recortar
  tenant, município, INE e período antes dos joins e hashes. O pipeline
  `prepare-cutover` persistiu manifests/resultados C1 e C2, permaneceu
  fail-closed `BLOCKED`, não alterou ativação e repetiu idempotentemente a mesma
  operação e os mesmos IDs. Goldens, dual-runs e auditorias permanecem ausentes.
- `/metrics` do Node devolve o HTML do frontend; o receiver Rust expõe métricas
  Prometheus.
- O catálogo instalado `2026-07-25.emulti-source-contract-v3` consultou a PEC em
  modo somente leitura: `status=ok`, 57 tabelas, zero fontes obrigatórias ou
  colunas mínimas ausentes e 11/11 fontes da união M1/M2 disponíveis.
- As 11 fontes da união M1/M2 estão normalizadas, com estado `completed`,
  `full_sync_completed_at` preenchido e cursores recebido/processado
  convergentes. O full snapshot de `tb_fat_atendimento_individual` enviou
  466.631 linhas em 94 chunks; ao fim, backlog global e linhas pendentes eram
  zero.
- M1 e M2 possuem um manifesto e um resultado READY cada, goldens agregados
  validados, dual-run MATCH com delta zero e auditorias correntes
  `READY_FOR_REVIEW`. O backend `sha256:9c31db7534f3b4532aadd68f5ea8fcbd6775cb696edf08d71d8a81b4f705f41a`
  ativou os consumidores somente após essa readiness. No escopo INE
  `0000181552`, abril/2026, dashboard e detalhe exibiram exclusivamente os
  resultados persistidos Rust, sem fórmula ou fallback no navegador.
- O contrato dental usou o INE `0001823299`, CNES `2402734`, competência
  abril/2026 e janela janeiro-abril. `tb_dim_procedimento` possui 1.095 linhas;
  `tb_fat_atend_odonto_proced` possui full snapshot de 169.011 linhas em 34/34
  chunks, cursor convergente e zero lacunas de contrato.
- A migration aditiva `0011_dental_team_authority`, SHA-256
  `258275e41527df299159eb8fe32ae70841d61e849edc358ce02336dd01487e4a`,
  registra fonte e vínculo de equipe sem inferência. O SCNES e o relatório de
  homologação confirmam eSB 40h homologada, mas não contêm o vínculo exigido.
  O registro corrente está `BLOCKED` com
  `DENTAL_LINKAGE_EVIDENCE_MISSING`.
- Os três manifestos clínicos históricos não possuem hashes da autoridade de
  equipe (`0/3` vinculados). As auditorias correntes de B3/B5/B6 estão
  `BLOCKED`, apesar de golden/paridade históricos `MATCH`, com
  `SOURCE_CONTRACT_BLOCKED` e `SOURCE_TEAM_ELIGIBILITY_INCOMPLETE`.
- O runtime observado usou registry `b360-rust-authority-v6`. Na consulta real
  do escopo dental, cada indicador retornou `resultCount=1`,
  `readyResultCount=0` e `evidenceVersion=null`. Com flags temporariamente
  ligadas, o HTTP permaneceu fail-closed; depois da prova, as flags voltaram a
  `false`.
- O commit `72ebd6b` publicou o registry `b360-rust-authority-v7` na imagem
  `sha256:8bf9018258a7e2261b8e8f9b4cf71ac5bf1d2aeb05464bd5181c68e13dd3dfee`.
  O bundle local e o instalado têm SHA-256
  `8090fd7d2aab0ea47626599b67d42253d08ab0aa9324d498c8580c421222a2a8`.
  A imagem v6 anterior foi preservada como rollback.
- O resumo PEC respondeu HTTP 200 com os 15 códigos públicos, todos
  `rust_read_model_required`, campos numéricos nulos e zero violações. O
  container está `healthy`, sem reinícios, e `/api/health` respondeu HTTP 200.
  A configuração operacional divergente `B360_READ_SOURCE=pec` foi corrigida
  para `analytics`, em conformidade com o Compose e `.env.example`; o log de
  startup confirmou `[b360] read source=analytics`.
  `/readyz`, porém, respondeu HTTP 503: o catálogo está `blocked`, com
  `sourceDiscoveryStatus=permission_error`, referência global e réplica do
  tenant ausentes. Portanto, o deployment é fail-closed, mas não está pronto
  para promoção operacional.
- O plano somente leitura foi revalidado sem escrita: catálogo
  `2026-07-25.emulti-source-contract-v4`, 58 tabelas exatas, `USAGE=true`,
  `SELECT=0/58`, serviço e processos parados. O escopo atual é
  `1610eaf8eb080b9fcb1d1d7f56c5ffbdd9062251048c033c3ca96bf5616e5665`;
  executar `GRANT_SELECT_EXACT_58` continua exigindo aprovação explícita e
  vinculada a esse fingerprint.
- `PecAgentSync` permaneceu `Stopped`/`Automatic`, PID 0. Os containers Rust
  de ingestão e normalização não foram recriados e seguem saudáveis na imagem
  `sha256:9db7ffd4e6a07be6048cdab22e0914c78581b79a29d5d2b65805bb447c0c326a`.

## Regra de promoção

O status de um indicador só pode avançar com evidência nova reproduzível. A
promoção para `ACTIVE_AND_PROVEN` exige, no mínimo: regra oficial congelada,
fontes reais validadas, implementação Rust, testes unitários e de integração,
golden, dual-run, read model, BFF sem recálculo, runtime ativo, painel
comprovado, observabilidade, performance, rollback e auditoria de cutover.

Os documentos históricos
`saude-brasil-360-coverage-matrix.*` e `b360-runtime-contract-audit.md` não
devem ser usados como estado atual desta migração.
