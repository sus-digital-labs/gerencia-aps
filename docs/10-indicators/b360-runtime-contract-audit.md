# Brasil 360 — Runtime Contract Audit

> **Data:** 02/05/2026
> **Sprint:** B360-0.1
> **Runtime auditado:** `Apps/server/api/dist/index.js`
> **Commit base:** 75c918f
>
> **Atualização 2026-05-12:** os endpoints REST `/api/pec/*` passaram a existir no runtime canônico
> (`Apps/server/api/src/routes/pec-api.ts` + `Apps/server/api/src/server/start-server.ts`).
> Este documento permanece como fotografia histórica da auditoria de 02/05/2026.

---

## Sumário executivo

| Contrato | Existe em source? | Existe em dist runtime? | HTTP direto? | Frontend canônico usa? | Status |
|---|---|---|---|---|---|
| `/api/pec/*` (REST HTTP) | ❌ NÃO | ❌ NÃO | ❌ NÃO | N/A | **FANTASMA — documental apenas** |
| `/api/trpc/previneBrasil.calcularTodos` | ❌ runtime-only | ✅ linha 5529 | via tRPC | ⚠️ unknown | **PRESENTE — era publicProcedure → corrigido** |
| `/api/trpc/previneBrasil.calcularIndicador` | ❌ runtime-only | ✅ linha 5552 | via tRPC | ⚠️ unknown | **PRESENTE — era publicProcedure → corrigido** |
| `/api/trpc/previneBrasil.drilldownESF` | ❌ runtime-only | ✅ linha 5590 | via tRPC | ⚠️ unknown | **PRESENTE — permissionProcedure — implementação broken corrigida** |
| `/api/trpc/previneBrasil.drilldownESB` | ❌ runtime-only | ✅ linha 5609 | via tRPC | ⚠️ unknown | **PRESENTE — permissionProcedure — implementação broken corrigida** |
| `/api/trpc/previneBrasil.drilldownEMulti` | ❌ runtime-only | ✅ linha 5628 | via tRPC | ⚠️ unknown | **PRESENTE — permissionProcedure — implementação broken corrigida** |
| `/api/trpc/indicadores.calcular` | ❌ runtime-only | ✅ linha 2324 | via tRPC | ⚠️ unknown | **PRESENTE — protectedProcedure — OK** |
| `/api/trpc/indicadores.listaNominal` | ❌ runtime-only | ✅ linha 2342 | via tRPC | ⚠️ unknown | **PRESENTE — permissionProcedure + sanitize — OK** |
| `/api/trpc/indicadores.filter` | ❌ runtime-only | ✅ linha 2362 | via tRPC | ⚠️ unknown | **PRESENTE — protectedProcedure — INE_DEFAULT corrigido** |

**`Apps/web`** não existe neste repositório — referências de frontend não auditáveis.

---

## Endpoints HTTP reais do runtime

Apenas estes endpoints REST existem de fato:

| Rota | Método | Auth | Status |
|---|---|---|---|
| `/api/health` | GET | público | ✅ presente |
| `/api/cache/stats` | GET | público | ✅ presente |
| `/api/cache/flush` | POST | público | ✅ presente |
| `/api/cache/invalidate/:category` | POST | público | ✅ presente |
| `/api/oauth/callback` | GET | público | ✅ presente |
| `/api/trpc/*` | POST/GET | via procedure | ✅ presente |

**`/api/pec/*` não existe.** Qualquer referência documental a `/api/pec/summary`, `/api/pec/units`, `/api/pec/indicators/summary` descreve endpoints que não existem no runtime atual.

---

## Duas implementações paralelas de indicadores

O runtime contém dois conjuntos de funções de cálculo com nomenclatura semelhante mas definições clínicas diferentes:

### Versão 1 — "ISF-like" (usada por `previneBrasil.*`)

| Código | Nome | Definição clínica | Uso em Brasil 360 |
|---|---|---|---|
| C1 | "Mais Acesso à APS" | Contagem de atendimentos tipos 1,2,4 | ❌ INCORRETO para B360 |
| C4 | "Pessoa com Diabetes" | Diabéticos com CID E10-E14, CIAP T89/T90 | ❌ INCORRETO para B360 |
| B4 | "Urgências Odontológicas" | Consultas odontológicas | ⚠️ verificar |
| CVAT | "Cobertura Vacinal" | Vacinações | ✅ correto |

Tabelas PEC usadas: `tb_fat_atendimento_individual` via `pecPool.query`
Erro fallback: retorna `{numerador: 0, denominador: 0, meta: X}` (estado honesto)

### Versão 2 — "Brasil 360" (usada por `indicadoresRouter.*`)

| Código | Nome clínico | Tabelas PEC | RBAC |
|---|---|---|---|
| C1 | Gestantes ≥6 consultas pré-natal | `tb_cidadao`, `tb_cds_cad_individual`, `tb_fat_atendimento_individual` | `protectedProcedure` |
| C2 | Gestantes sífilis/HIV (procedimentos 0202031179, 0202031063) | idem | `protectedProcedure` |
| C3 | Atendimento odontológico em gestantes | `tb_fat_atendimento_odonto` | `protectedProcedure` |
| C4 | Citopatológico mulheres 25-64 (proc. 0203010086) | idem | `protectedProcedure` |
| C5 | HbA1c diabéticos (proc. 0202010473) | `tb_cds_cad_individual.st_diabete` | `protectedProcedure` |
| C6 | Hipertensos acompanhados | (ver código) | `protectedProcedure` |
| C7 | (ver código) | (ver código) | `protectedProcedure` |
| B1-B3 | ESB indicators | (ver código) | `protectedProcedure` |
| M1-M2 | eMulti indicators | (ver código) | `protectedProcedure` |

**Contrato canônico escolhido: Versão 2 — `indicadoresRouter.*`**
Razão: definições clínicas corretas + protectedProcedure + sanitizeCitizenForListRuntime aplicado.

---

## Bugs corrigidos neste sprint

| Bug | Linha | Antes | Depois |
|---|---|---|---|
| `previneBrasil.calcularTodos` não autenticado | 5529 | `publicProcedure` | `protectedProcedure` |
| `previneBrasil.calcularIndicador` não autenticado | 5552 | `publicProcedure` | `protectedProcedure` |
| `indicadoresRouter.filter` com `"INE_DEFAULT"` | 2370 | `calcularTodosIndicadores2("INE_DEFAULT", ...)` | usa `input.team_id` ou retorna `[]` |
| `indicadoresRouter.filter` com `quality_score: 90` | 2382 | campo fake fixo | removido |
| `drilldownESF` com `(void 0)(...)` | 5598 | `await (void 0)(...)` → sempre TypeError | retorno honesto `[]` com aviso |
| `drilldownESB` com `(void 0)(...)` | 5617 | idem | idem |
| `drilldownEMulti` com `(void 0)(...)` | 5636 | idem | idem |

---

## O que está correto (antes deste sprint)

| Item | Linha | Status |
|---|---|---|
| `indicadoresRouter.calcular` = `protectedProcedure` | 2324 | ✅ OK |
| `indicadoresRouter.listaNominal` = `permissionProcedure` | 2342 | ✅ OK |
| `sanitizeCitizenForListRuntime` remove CPF/CNS/nome/telefone | 1740 | ✅ OK |
| `previneBrasil.drilldownESF/ESB/EMulti` = `permissionProcedure` | 5590+ | ✅ OK |
| `auditNominalAccessRuntime` sem PII nos logs | 1769 | ✅ OK |
| Queries PEC via `pecPool`/`getPecConnection` (PostgreSQL, read-only) | várias | ✅ OK |

---

*Gerado em 02/05/2026 | Sprint B360-0.1 | sus-analytics-sync v4.0.0*
