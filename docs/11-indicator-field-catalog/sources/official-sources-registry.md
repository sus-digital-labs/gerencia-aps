# Official Sources Registry

## 1. Objetivo
Este registro consolida as fontes oficiais e as fontes legadas aceitas pelo projeto para implementacao, revisao e governanca dos indicadores Saude Brasil 360.

Objetivo operacional:
- separar fonte normativa oficial de referencia legada;
- impedir que SQL legado/Previne fechem regra normativa;
- criar trilha rastreavel antes de qualquer novo gate de implementacao.

## 2. Politica de uso
- Saude Brasil 360 e a fonte canonic/current do projeto.
- Previne Brasil e `migration_reference_only`.
- SQL legado e codigo legado nao validam formula normativa.
- pagina gov.br institucional e fonte contextual; nao fecha formula sozinha.
- portaria de cofinanciamento define governanca, repasse, componentes e elegibilidade macro; nao substitui nota metodologica do indicador.
- nota tecnica/informativa SAPS/MS pode validar escopo operacional, equipe, CBO, incentivo, janela ou orientacao de registro, mas nem sempre fecha numerador/denominador sozinha.
- ficha tecnica ou nota metodologica especifica do indicador e a melhor candidata para validar formula, desde que revisada e vinculada ao indicador.

## 3. Tipos de fonte
| Tipo | Pode validar regra normativa? | Uso permitido |
|---|---|---|
| Portaria GM/MS vigente | Parcial | governanca, componentes, incentivo, vigencia macro |
| Nota Tecnica/Informativa SAPS/MS | Parcial | escopo operacional, equipe elegivel, CBO, orientacao de registro |
| Ficha tecnica oficial SAPS/MS | Sim, apos revisao | ficha metodologica e metadados do indicador |
| Pagina gov.br institucional | Nao, so contexto | narrativa institucional, nomenclatura, landing de programa |
| Codigo legado | Nao | migracao tecnica e comparacao |
| SQL legado | Nao | migracao tecnica e comparacao |
| Documento interno DM | Nao | decisao tecnica interna, backlog, testes, runbook |

## 4. Status de fonte
| Status | Significado |
|---|---|
| `official_validated` | fonte oficial especifica ja revisada e suficiente para sustentar a regra usada |
| `official_context_only` | fonte oficial valida contexto, escopo institucional ou incentivo, mas nao fecha a formula sozinha |
| `official_validated_pending_review` | fonte oficial especifica existe e esta vinculada ao indicador, mas ainda depende de revisao metodologica interna/fonte complementar |
| `requires_official_validation` | regra ainda depende de fonte oficial primaria ou de revisao complementar |
| `deprecated` | fonte legada preservada apenas para migracao/comparacao |
| `superseded` | fonte oficial superada por outra mais recente |

## 5. Fontes registradas
| ID | Titulo | Orgao | Tipo | Data | URL | Escopo | Status | Indicadores impactados | Observacoes |
|---|---|---|---|---|---|---|---|---|---|
| `SRC-CTX-001` | Saude Brasil 360 | Ministerio da Saude / SAPS | Pagina gov.br institucional | sem data visivel nesta rodada | https://www.gov.br/saude/pt-br/composicao/saps/saude-brasil-360 | contexto do programa e componentes | `official_context_only` | C1..C7, B1..B6, M1, M2 | fonte canonica de contexto; nao substitui ficha tecnica do indicador |
| `SRC-CTX-002` | Portaria GM/MS n 3.493, de 10 de abril de 2024 | Ministerio da Saude | Portaria GM/MS vigente | 2024-04-10 | https://www.in.gov.br/en/web/dou/-/portaria-gm/ms-n-3.493-de-10-de-abril-de-2024-553573811 | cofinanciamento federal APS e componente de vinculo e qualidade | `official_context_only` | C1..C7, B1..B6, M1, M2 | governa incentivo e componentes; nao fecha formula isoladamente |
| `SRC-CTX-003` | FAQ oficial do novo modelo de cofinanciamento federal da APS | Ministerio da Saude / SAPS | Pagina gov.br institucional | sem data visivel nesta rodada | https://www.gov.br/saude/pt-br/composicao/saps/esf/faq-novo-modelo-de-cofinanciamento-federal-da-aps/nova-metodologia-cofinanciamento-federal | perguntas frequentes e contexto operacional do modelo | `official_context_only` | C1..C7, B1..B6, M1, M2 | bom para contexto e operacao; nao define numerador/denominador sozinho |
| `SRC-CTX-004` | Ministerio da Saude atualiza fichas tecnicas e lanca novos indicadores de inducao de boas praticas para a Atencao Primaria | Ministerio da Saude | Pagina gov.br institucional | 2025-05-21 | https://www.gov.br/saude/pt-br/assuntos/noticias/2025/maio/ministerio-da-saude-atualiza-fichas-tecnicas-e-lanca-novos-indicadores-de-inducao-de-boas-praticas-para-a-atencao-primaria | anuncio institucional dos indicadores e publicacao das fichas | `official_context_only` | C1..C7, B1..B6, M1, M2 | noticia institucional; reforca vigencia, nao fecha formula |
| `SRC-CTX-005` | Fichas Tecnicas | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/ | indice oficial das fichas tecnicas e notas metodologicas | `official_context_only` | C1..C7, B1..B6, M1, M2 | fonte-mestre de navegacao para notas especificas |
| `SRC-EAP-006` | Equipe de Atencao Primaria e Saude da Familia | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia | dominio eSF/eAP | `official_context_only` | C1..C7 | pagina tematica das fichas ESF/eAP |
| `SRC-IND-C2-007` | Nota Metodologica C2 - Cuidado no desenvolvimento infantil | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c2-cuidado-no-desenvolvimento-infantil/view | indicador C2 | `official_validated_pending_review` | C2 | fonte primaria oficial do indicador; runtime validado, amarracao normativa ainda em revisao |
| `SRC-IND-C3-008` | Nota Metodologica C3 - Cuidado na gestacao e puerperio | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c3-cuidado-na-gestacao-e-puerperio/view | indicador C3 | `official_validated_pending_review` | C3 | fonte primaria oficial do indicador; runtime validado, amarracao normativa ainda em revisao |
| `SRC-IND-C5-009` | Nota Metodologica C5 - Cuidado da pessoa com hipertensao | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c5-cuidado-da-pessoa-com-hipertensao/view | indicador C5 | `official_validated_pending_review` | C5 | runtime `C5@2026.4` alinhado a copia local oficial em `docs/Saude Brasil 360/Nota Metodologica C5 - Cuidado da pessoa com hipertensao.pdf`; manter `requires_official_validation` ate revisao metodologica final |
| `SRC-IND-C6-010` | Nota Metodologica C6 - Cuidado da pessoa idosa | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c6-cuidado-da-pessoa-idosa/view | indicador C6 | `official_validated_pending_review` | C6 | fonte primaria oficial vinculada; manter `requires_official_validation` ate revisao interna fechar warnings |
| `SRC-IND-C7-011` | Nota Metodologica C7 - Cuidado da mulher na prevencao do cancer | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c7-cuidado-da-mulher-na-prevencao-do-cancer/view | indicador C7 | `official_validated_pending_review` | C7 | fonte primaria oficial vinculada; manter `requires_official_validation` ate revisao interna fechar proxies/warnings |
| `SRC-IND-C1-020` | Nota Metodologica C1 - Mais acesso | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | 2025-09-23 | https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c1-mais-acesso/view | indicador C1 | `official_validated_pending_review` | C1 | fonte primaria oficial vinculada; runtime local/publico validado, mas manter `requires_official_validation` enquanto o escopo de tipo de equipe e os proxies de identificacao permanecerem ativos |
| `SRC-IND-C4-021` | Nota Metodologica C4 - Cuidado da pessoa com diabetes | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | copia local oficial em `docs/Saude Brasil 360/Nota Metodologica C4 - Cuidado da pessoa com diabetes.pdf` | indicador C4 | `official_validated_pending_review` | C4 | fonte metodologica usada para `C4@2026.2`; manter `requires_official_validation` enquanto os proxies clinicos permanecerem ativos |
| `SRC-IND-B3-022` | Nota Metodologica B3 - Taxa de exodontia | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | copia local oficial em `docs/Saude Brasil 360/Nota Metodologica B3 - Taxa de exodontia.pdf` | indicador B3 | `official_validated_pending_review` | B3 | fonte metodologica usada para `B3@2026.3`; runtime alinhado sem acao coletiva na formula |
| `SRC-IND-B4-023` | Nota Metodologica B4 - Escovacao supervisionada em faixa etaria escolar (de 6 a 12 anos) | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | copia local oficial em `docs/Saude Brasil 360/Nota Metodologica B4 - Escovacao supervisionada em faixa etaria escolar (de 6 a 12 anos).pdf` | indicador B4 | `official_validated_pending_review` | B4 | fonte metodologica usada para `B4@2026.3`; populacao de referencia e escopo eSB ainda dependem de revisao final |
| `SRC-IND-B5-024` | Nota Metodologica B5 - Procedimentos odontologicos preventivos | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | copia local oficial em `docs/Saude Brasil 360/Nota Metodologica B5 - Procedimentos odontologicos preventivos.pdf` | indicador B5 | `official_validated_pending_review` | B5 | fonte metodologica usada para `B5@2026.3`; manter `requires_official_validation` ate revisar escopo CBO final |
| `SRC-IND-B6-025` | Nota Metodologica B6 - Tratamento restaurador atraumatico | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | copia local oficial em `docs/Saude Brasil 360/Nota Metodologica B6 - Tratamento restaurador atraumatico.pdf` | indicador B6 | `official_validated_pending_review` | B6 | fonte metodologica usada para `B6@2026.3`; runtime alinhado a ART/restauradores sem acao coletiva |
| `SRC-ESB-012` | Equipe de Saude Bucal (eSB) | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | sem data visivel nesta rodada | https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-saude-bucal | dominio eSB | `official_context_only` | B1..B6 | pagina tematica para futuros gates de Saude Bucal |
| `SRC-ESB-013` | Nota Informativa n 8/2025-CGSB/DESCO/SAPS/MS | Ministerio da Saude / SAPS | Nota Tecnica/Informativa SAPS/MS | 2025 | https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/estudos-e-notas-informativas/2025/nota-informativa-no-8-2025-cgsb-desco-saps-ms.pdf/view | incentivo adicional do componente de qualidade para eSB 40h | `official_context_only` | B1..B6 | valida contexto e equipe elegivel; nao fecha formula odontologica por indicador |
| `SRC-EMULTI-014` | Equipes Multiprofissionais (eMulti) | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | 2025-05-23 | https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipes-multiprofissionais-emulti | dominio eMulti | `official_context_only` | M1, M2 | pagina tematica oficial do dominio eMulti |
| `SRC-EMULTI-015` | Nota Informativa n 4/2025-CGESCO/DESCO/SAPS/MS | Ministerio da Saude / SAPS | Nota Tecnica/Informativa SAPS/MS | 2025 | https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/estudos-e-notas-informativas/2025/nota-informativa-no-4-2025-cgesco-desco-saps-ms.pdf/view | incentivo adicional para eSF/eAP/eSB/eMulti | `official_context_only` | C1..C7, B1..B6, M1, M2 | valida contexto de incentivo e escopo de equipes; nao fecha formula por indicador |
| `SRC-EMULTI-018` | Nota Metodologica M1 - Media de atendimentos por pessoa pela eMulti na APS | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | 2025-09-23 | https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipes-multiprofissionais-emulti/nota-metodologica-m1-media-de-atendimentos-por-pessoa-pela-emulti-na-aps/view | indicador M1 | `official_validated_pending_review` | M1 | fonte primaria oficial vinculada; runtime local/publico validado, mas ainda com proxy de escopo de equipe e identificacao de pessoa assistida |
| `SRC-EMULTI-019` | Nota Metodologica M2 - Acoes interprofissionais realizadas pela eMulti na APS | Ministerio da Saude / SAPS | Ficha tecnica oficial SAPS/MS | 2025-09-23 | https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipes-multiprofissionais-emulti/nota-metodologica-m2-acoes-interprofissionais-realizadas-pela-emulti-na-aps/view | indicador M2 | `official_validated_pending_review` | M2 | fonte primaria oficial vinculada; runtime local/publico validado, mas ainda com proxy de escopo de equipe e multiprofissionalidade |
| `SRC-LEG-016` | `Apps/server/api/src/routers-previne.ts` | DM Technology | Codigo legado | n/a | `Apps/server/api/src/routers-previne.ts` | migracao tecnica e comparacao | `deprecated` | C1..C7, B1..B6, M1, M2 | referencia legada; nao valida regra normativa |
| `SRC-LEG-017` | `Apps/web/server/indicadores-previne-brasil-sql.ts` | DM Technology | SQL legado | n/a | `Apps/web/server/indicadores-previne-brasil-sql.ts` | migracao tecnica e comparacao | `deprecated` | C1..C7, B1..B6, M1, M2 | SQL legado; nao valida regra normativa |

## 6. Mapa fonte -> indicador
- C1: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C1-020` -> implementado e validado em runtime local/publico; manter `requires_official_validation` enquanto o escopo de tipo de equipe e os proxies de identificacao nao forem revisados metodologicamente.
- C2: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C2-007`.
- C3: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C3-008`.
- C4: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C4-021` -> runtime `C4@2026.2` alinhado a nota metodologica local de diabetes; manter `requires_official_validation` enquanto os proxies clinicos permanecerem ativos.
- C5: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C5-009` -> runtime `C5@2026.4` alinhado a nota metodologica local de hipertensao; manter `requires_official_validation` e os warnings tecnicos operacionais.
- C6: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C6-010`.
- C7: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C7-011`.
- B1: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-004`, `SRC-CTX-005`, `SRC-ESB-012`, `SRC-ESB-013` -> implementado e validado em runtime local/publico, mas ainda sem fonte primaria especifica e com denominador eSB em aberto.
- B2: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-004`, `SRC-CTX-005`, `SRC-ESB-012`, `SRC-ESB-013` -> implementado e validado em runtime local/publico, mantendo `requires_official_validation`.
- B3: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-004`, `SRC-CTX-005`, `SRC-ESB-012`, `SRC-ESB-013`, `SRC-IND-B3-022` -> runtime `B3@2026.3` alinhado a taxa de exodontia da nota metodologica oficial local.
- B4: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-004`, `SRC-CTX-005`, `SRC-ESB-012`, `SRC-ESB-013`, `SRC-IND-B4-023` -> runtime `B4@2026.3` alinhado a escovacao supervisionada 6 a 12 anos, mantendo proxies de populacao de referencia.
- B5: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-004`, `SRC-CTX-005`, `SRC-ESB-012`, `SRC-ESB-013`, `SRC-IND-B5-024` -> runtime `B5@2026.3` alinhado a procedimentos odontologicos individuais preventivos.
- B6: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-004`, `SRC-CTX-005`, `SRC-ESB-012`, `SRC-ESB-013`, `SRC-IND-B6-025` -> runtime `B6@2026.3` alinhado a ART/restauradores, sem acao coletiva.
- M1: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-005`, `SRC-EMULTI-014`, `SRC-EMULTI-015`, `SRC-EMULTI-018` -> implementado e validado em runtime local/publico; manter `requires_official_validation` enquanto o runtime ainda depender de proxy de escopo de equipe e identificacao de pessoa assistida.
- M2: `SRC-CTX-001`, `SRC-CTX-002`, `SRC-CTX-005`, `SRC-EMULTI-014`, `SRC-EMULTI-015`, `SRC-EMULTI-019` -> implementado e validado em runtime local/publico; manter `requires_official_validation` enquanto o runtime ainda depender de proxy de escopo de equipe e multiprofissionalidade.

## 7. Regras de bloqueio
- legado Previne nao valida regra normativa;
- SQL legado nao valida regra normativa;
- fonte oficial contextual nao fecha formula sozinha;
- `validated_runtime_public` nao autoriza remover `requires_official_validation`;
- qualquer alteracao de numerador, denominador, janela, coorte, CBO ou code set exige revisao por `source-review-checklist.md` e potencial nova `ruleVersion`.
