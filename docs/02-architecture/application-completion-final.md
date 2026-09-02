# SUS APS 360 — estado final auditável do Application Completion Program

## Decisão executiva

O estado comprovado é `IN_PROGRESS_INTERNAL_BLOCKERS`. Nenhuma das duas classificações terminais permitidas pode ser concedida:

- `APPLICATION_ENGINEERING_COMPLETE` é inválida porque 12 eixos têm blockers internos;
- `APPLICATION_COMPLETION_BLOCKED_BY_EXTERNAL_DEPENDENCY` também é inválida porque os blockers não são exclusivamente externos.

O manifesto fail-closed mantém `classification=null` e `release_candidate_sha=null`. Isso não reduz o resultado da missão C2 ativa, que fechou como `PEC_AGENT_SYNTHETIC_ACTIVE_PIPELINE_VALIDATED`; apenas impede extrapolar esse PASS para o produto inteiro.

## Git e escopo

| Campo | Valor |
|---|---|
| Initial SHA desta continuação | `e6b8cdaf87aa57a9c415ee7afeb0d362d47d5d4c` |
| Main observado | `d03d14f47eb1260000f92c546dd73cc7265f7161` |
| SHA funcional do pipeline C2 | `bd0d774db64c3487ceed5a2f91bacdbc52411d50` |
| SHA auditado global | `2a1397574867b73b80d9e2bad261b6027d9795e3` |
| Release Candidate SHA | `null` |
| Branch | `mission/pec-agent-active-pipeline-closure-20260820` |
| Push | `NO` |
| Checkout persistente | 1 |
| Worktrees temporários | 0 |

O `main` atual já contém os merges de Territory (`6ddfaae`/`7f992c0`), Billing/entitlements (`8c8cde2`/`db09e43`) e Identity/RBAC (`c082ed8`). Portanto `TERRITORY_NOT_INTEGRATED` foi removido dos non-claims atuais.

## 1. O que foi implementado?

- Perfil C2 exato de 10 fontes no agente Rust.
- Outbox durável com backoff, `Retry-After`, auth-blocked e quarentena terminal.
- Minimização de identificadores e transporte HTTPS obrigatório fora de loopback.
- Autorização do receiver por assignment ativa de tenant/município/célula, com LKG bounded.
- Normalizer/materializer com claim unitário e fencing seguro.
- Migrations de data segura, menor privilégio e lineage/RLS de célula.
- Fluxo canônico `normalized_records → C2 typed → C2@2026.4 → read model`.
- Leitura C2 por `CellRouter`/resolver/RLS.
- Stack sintética descartável, proxy de faults, probes BFF/boundary, dataset determinístico e validators.
- Verificador canônico de artefatos conectado ao CI.
- Contratos de evidência fail-closed para o pipeline ativo e para application completion.

## 2. O que foi corrigido?

- O C2 typed deixou de depender de execução manual não orquestrada.
- Writer e reader deixaram de divergir entre `DEFAULT_CELL` e `CELL-001`.
- Um agente válido deixou de poder ser aceito por célula errada.
- Outage de Control Plane deixou de virar 401 terminal/quarentena irreversível.
- 429, 503, timeout e 4xx terminal passaram a ter semânticas distintas.
- Claims em lote deixaram de compartilhar lease expirada sem renewal.
- Runtime sintético passou a usar roles sem superuser/BYPASSRLS.
- O release verifier deixou de apontar para `dist-source` inexistente.
- Quatro invitation tokens sintéticos brutos foram removidos de evidência versionada; fingerprints e resultados foram preservados.
- Non-claims antigos de Territory foram reconciliados com o histórico integrado.

## 3. Bugs encontrados e causas raiz

| Bug | Causa raiz |
|---|---|
| Pipeline parava em resumo técnico | O job pós-normalização não invocava o produtor/materializer C2 canônico. |
| Resultado C2 invisível ao BFF | Alias de célula hardcoded e divergente entre writer e reader sob FORCE RLS. |
| Wrong-cell acceptance | Autorização usava identidade global e estampava a célula do receiver sem assignment autoritativa. |
| Outage virava deny terminal | Erros de disponibilidade e credencial compartilhavam 401/403 e política de quarentena. |
| Retry sem classe | Cliente reduzia todo não-2xx a uma string e ignorava `Retry-After`. |
| Starvation por lease | Claim em lote usava uma expiração comum e processamento sequencial sem renewal. |
| Evidência Identity vazava token sintético | O campo `response_sanitized` armazenava a resposta JSON original. |
| Evidência global inconsistente | Matriz histórica misturava SHAs, claims stales e estados `PASS` com blockers. |
| Supply chain stale | SBOM/provenance foi gerado em `920a4a8` e não regenerado após mudanças de manifests/locks. |

## 4. Commits criados

| Commit | Tema |
|---|---|
| `7749ad3` | hardening de retry, transporte e privacidade do agente |
| `e436e68` | autoridade de célula e durabilidade dos workers |
| `9f48d70` | materialização C2 typed via CellRouter/RLS |
| `4719cec` | harness sintético e fault matrix ativa |
| `40820b6` | verificação canônica do pacote de release |
| `04bbce1` | proveniência pelos bytes commitados |
| `1592242` / `bd0d774` | scanner PII sem falsos positivos auto-referentes |
| `de7471e` / `9afdd29` | manifesto, relatório e lock do pipeline ativo |
| `0955643` | redação de tokens sintéticos de Identity |
| `57c4455` / `2a13975` | schema e validator global fail-closed |

Os commits documentais deste relatório e do lock global são posteriores ao SHA auditado e não são promovidos a release candidate.

## 5. Quais testes passaram?

- Agent: fmt/check/clippy/release PASS; 113 testes PASS.
- Ingest: fmt/check/clippy/release PASS; 105 testes PASS.
- Rules: fmt/check/clippy/release PASS; todas as suítes executadas PASS.
- Server: TypeScript typecheck PASS.
- BFF focado: CellRouter/default-cell/read-model PASS.
- Build release: backend, BPA-C worker e frontend reconstruídos; bundle/paridade/verificador PASS.
- Pipeline ativo: 19 gates PASS e 16 faults PASS.
- Identity sintético histórico: 21/21 probes PASS, com tokens agora redigidos.
- Territory local containerizado histórico: PASS bounded.
- Secret scan do delta ativo: PASS.
- Fixture/artifact/manifest LGPD scan do pipeline ativo: PASS.
- `git diff --check`: PASS nos marcos auditados.

## 6. Quais testes falharam?

Nenhum comando da QA ativa canônica falhou. Os gates globais abaixo não foram executados ou não possuem evidência suficiente e, por isso, são `BLOCKED`, não PASS inferido:

- goldens/runtime/BFF/RLS independentes de todos os indicadores;
- browser/accessibility de todas as rotas;
- installer completo e update assinado;
- SBOM atual de binários/imagens e assinatura;
- PITR/restore/RPO/RTO;
- alert firing/recovery e SLO completo;
- AppSec completo e LGPD retention/deletion/audit;
- performance representativa e soak nacional;
- master E2E, publicação pública, upgrade e rollback globais.

## 7. Quais foram skipped?

- Agent Rust: 2 ignored.
- Ingest Rust: 15 ignored.
- Rules: ignored registrados por suíte no manifesto ativo; não promovidos a PASS.
- Canário/drain PEC real: proibidos e não autorizados.
- PEC real, dados reais, portas 3005/3015 e publicação pública: não utilizados.

## 8. Matriz A–O

| Eixo | Estado | Resumo |
|---|---|---|
| A Repository/evidence | `PASS` | árvore limpa no SHA auditado, um checkout, validators e hashes |
| B Multi-Cell/capacity | `BLOCKED_INTERNAL` | CellRouter C2 PASS; discovery/soak/fairness ausentes |
| C Indicators | `BLOCKED_INTERNAL` | pacote independente dos 15+6 não fechado |
| D Territory/geocode | `BLOCKED_EXTERNAL` | integrado/local PASS; staging e aceite governado pendentes |
| E Billing/payment | `BLOCKED_INTERNAL` | ledger/invoice/reconciliation/lifecycle incompletos |
| F Identity/auth | `BLOCKED_INTERNAL` | probes PASS; matriz route-wide ABAC/RLS ausente |
| G Web | `BLOCKED_INTERNAL` | build PASS; browser/accessibility/rotas incompletos |
| H Mobile | `NOT_APPLICABLE` | formalmente de-scoped por ADR |
| I Agent/installer | `BLOCKED_INTERNAL` | pipeline PASS; installer/update/DPAPI/signing incompletos |
| J Supply chain | `BLOCKED_INTERNAL` | 8/21 hashes stales, sem SBOM binário/imagem e assinatura |
| K HA/DR | `BLOCKED_INTERNAL` | sem PITR/restore/RPO/RTO e rollback global |
| L Observability | `BLOCKED_INTERNAL` | bounded PASS; SLO e firing/recovery incompletos |
| M AppSec/LGPD | `BLOCKED_INTERNAL` | scans scoped PASS; engenharia global incompleta |
| N Scale/performance | `BLOCKED_INTERNAL` | limitado a 5 municípios; sem perfil/soak nacional |
| O RC/publication | `BLOCKED_INTERNAL` | sem candidato assinado e sem publicação validada |

Rollup: 1 required PASS, 12 blocked internal, 1 blocked external e 1 N/A.

## 9. Blockers restantes

O manifesto [application-completion-final.json](../operations/evidence/application-completion-final.json) registra causa, owner, impacto, ação exata e evidência de cada blocker. Os blockers internos são:

1. capacity discovery, fairness, headroom e soak;
2. goldens/runtime/read-model/BFF/RLS individuais dos indicadores;
3. lifecycle completo de Billing/payment;
4. matriz route-wide RBAC/ABAC/RLS;
5. inventário Web, browser e acessibilidade;
6. installer/update/DPAPI/rollback assinado;
7. SBOM/provenance atual e assinatura de artefatos;
8. PITR/restore/RPO/RTO e rollback global;
9. SLOs e alert firing/recovery;
10. AppSec/LGPD completo e atestado de rotação do segredo histórico;
11. performance/soak nacional;
12. release candidate fixado, master E2E e publicação.

O blocker externo atual é o aceite governado de Territory em staging. Aceite clínico formal e deploy/rollout também permanecem externos, mas não são a razão imediata da ausência de classificação terminal enquanto existirem blockers internos.

## 10. O produto está tecnicamente completo?

Não. O pipeline C2 ativo está tecnicamente fechado em ambiente sintético, mas o produto inteiro não atende a Definition of Done da missão mestre.

## 11. Está publicado?

Não. Localhost/4173 não foi promovido a publicação pública. DNS, TLS, proxy, SPA/API e probes externos não foram validados nesta continuação.

## 12. Está production-ready?

Não. `PRODUCTION_READINESS_NOT_DECLARED` permanece obrigatório.

## 13. Está national-scale-ready?

Não. A evidência existente termina no policy limit de cinco municípios e não sustenta escala nacional.

## 14. Há aceites externos pendentes?

Sim: Territory staging/change authority, aceite clínico formal, eventual provider sandbox, AppSec/DPO quando tecnicamente preparado, publicação, deploy e rollout. Esses aceites não transformam blockers internos em externos.

## 15. Qual é o rollback?

Para o pipeline C2, rollback é suspensão do candidato com preservação da outbox/checkpoint e forward recovery idempotente; Redis não é autoridade e down migration destrutiva não é usada operacionalmente. Para o produto inteiro, rollback ainda é um blocker: faltam drills integrados de Web/API/receiver/normalizer/materializer/agent/migrations/Territory/Billing, backup/PITR e restore.

## Security, LGPD e supply chain

O pipeline ativo tem minimização, roles sem BYPASSRLS, assignment de célula, scan de delta e zero identificador direto normalizado. Porém o artefato de supply chain herdado é stale: 8 de 21 hashes divergem no SHA atual e o próprio documento declara não ser SBOM de binários/imagens. A rotação das credenciais historicamente expostas em `894911e` não possui atestado versionado. Não há assinatura de release.

## Cleanup

O run sintético terminou com zero container, network, volume, imagem, porta e estado temporário residual. O checkout persistente é único, sem worktree temporário e sem push. O agente real, seus arquivos de estado e o runtime 4173 foram preservados.

## Non-claims

- `PRODUCTION_DEPLOYMENT_NOT_EXECUTED`
- `NATIONAL_ROLLOUT_NOT_EXECUTED`
- `PRODUCTION_READINESS_NOT_DECLARED`
- `NATIONAL_SCALE_NOT_PROVEN`
- `CLINICAL_AUTHORITY_FINAL_SIGNOFF_PENDING`
- `SIGNED_RELEASE_NOT_PRODUCED`
- `PUBLICATION_NOT_VALIDATED`
- `PUSH_NOT_PERFORMED`

`TERRITORY_NOT_INTEGRATED` não é um non-claim atual.

## Próximas três ações de engenharia

Como a engenharia ainda não terminou, ainda não existem “somente ações externas ou de rollout”. As três frentes internas de maior alavancagem são:

1. fechar o ledger de indicadores com goldens/runtime/BFF/RLS independentes para B1–B6, C1–C7 e CVAT1–CVAT6;
2. produzir o release trust completo: installer/update/rollback, SBOM atual de binários/imagens, scans e assinatura;
3. executar DR + performance/soak + master E2E, incluindo Billing, Web/browser/accessibility e publicação candidata.

Somente depois dessas três frentes o estado poderá ser reavaliado como completo ou bloqueado exclusivamente por dependências externas.
