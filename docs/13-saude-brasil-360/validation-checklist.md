# Checklist de Validação — 21 Métricas Operacionais Saúde Brasil 360

> **Data:** 2026-05-21
> **Fonte canónica:** `.ai/CONTEXT/indicator-registry.json`
> **Regra:** Campos sem validação oficial recebem `UNKNOWN_OFFICIAL_VALIDATION_NEEDED`.

---

## Legenda

- OK = validado por fonte oficial (nota metodológica local ou portaria web)
- PARTIAL = parcialmente validado (nome correcto, fórmula pendente)
- FAIL = divergência encontrada
- N/A = não aplicável ao tipo de métrica

---

## Componente I — Qualidade APS (15 indicadores)

| Código | Nome OK | Componente OK | Fórmula OK | Polaridade OK | Janela OK | Equipa OK | CBO OK | SIGTAP OK | CID/CIAP OK | Modelo info OK | Fonte local | Fonte web | Lacuna doc | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | OK | OK | PARTIAL | PARTIAL | OK | OK | PARTIAL | PARTIAL | N/A | OK | OK | PARTIAL | SIGTAP completo | validated_local_pdf_only |
| B2 | OK | OK | OK | OK | OK | OK | OK | OK (03.01.01.015-3) | N/A | OK | OK | PARTIAL | Lista conclusivos | validated_local_pdf_only |
| B3 | OK | OK | OK | OK (faixa ótima) | OK | OK | OK | PARTIAL | N/A | OK | OK | PARTIAL | Limiares faixa | validated_local_pdf_only |
| B4 | OK | OK | PARTIAL | OK | OK | OK | PARTIAL | OK (0101020031) | N/A | OK | OK | PARTIAL | Denominador | validated_local_pdf_only |
| B5 | OK | OK | OK | OK (faixa ótima) | OK | OK | OK | PARTIAL (6 codes) | N/A | OK | OK | PARTIAL | Completude SIGTAP | validated_local_pdf_only |
| B6 | OK | OK | OK | OK | OK | OK | OK | OK (0307010074) | N/A | OK | OK | PARTIAL | Lista restauradores | validated_local_pdf_only |
| C1 | OK | OK | OK | OK (faixa ótima) | OK | OK | OK | N/A | N/A | OK | OK | PARTIAL | Limiares faixa | validated_local_pdf_only |
| C2 | OK | OK | OK | OK | OK | OK | PARTIAL | OK (6 codes) | N/A | OK | OK | PARTIAL | **CÓDIGO ERRADO** | validated_local_pdf_only |
| C3 | OK | OK | OK | OK | OK | OK | PARTIAL | PARTIAL | PARTIAL | OK | OK | PARTIAL | **CÓDIGO ERRADO** | validated_local_pdf_only |
| C4 | OK | OK | PARTIAL | OK | OK | OK | PARTIAL | OK (HbA1c+pé) | OK (E10-14,T89/90) | OK | OK | PARTIAL | Pesos boas práticas | validated_local_pdf_only |
| C5 | OK | OK | PARTIAL | OK | OK | OK | OK | OK (03.01.10.003-9) | OK (I10-15,K86/87) | OK | OK | PARTIAL | Pesos boas práticas | validated_local_pdf_only |
| C6 | OK | OK | PARTIAL | OK | OK | OK | PARTIAL | OK (6 codes) | N/A | OK | OK | PARTIAL | Exceção eAP tipo 76 | validated_local_pdf_only |
| C7 | OK | OK | PARTIAL | OK | OK | OK | PARTIAL | PARTIAL (HPV 67/93) | PARTIAL | OK | OK | PARTIAL | Pesos por coorte | validated_local_pdf_only |
| M1 | OK | OK | OK | OK | OK | OK | PARTIAL | N/A | N/A | OK | OK | PARTIAL | Escopo eMulti proxy | validated_local_pdf_only |
| M2 | OK | OK | PARTIAL | OK (neutra) | OK | OK | PARTIAL | N/A | N/A | OK | OK | PARTIAL | Def. interprofissional | validated_local_pdf_only |

---

## Componente II — CVAT (6 regras operacionais)

| Código | Nome OK | Componente OK | Regra OK | Faixas OK | Equipa OK | Fonte local | Fonte web | Lacuna doc | Estado |
|---|---|---|---|---|---|---|---|---|---|
| CVAT1 | OK | OK | OK | OK (>85/65-84.9/45-64.9/<45) | OK | OK (NT 30/2025) | PARTIAL | SQL não validada | validated_local_pdf_only |
| CVAT2 | OK | OK | OK | OK (fator multiplicador) | OK | OK (NT 30/2025) | PARTIAL | Regra 24m domiciliar | validated_local_pdf_only |
| CVAT3 | OK | OK | OK (1.0/1.2/1.3/2.5) | N/A | OK | OK (NT 30/2025) | PARTIAL | Dados PBF/BPC | validated_local_pdf_only |
| CVAT4 | OK | OK | OK (factor 1.2) | N/A | OK | OK (NT 30/2025) | PARTIAL | Def. exacta <5a | validated_local_pdf_only |
| CVAT5 | OK | OK | OK | OK (>85/65-84.9/45-64.9/<45) | OK | OK (NT 30/2025) | PARTIAL | Parâmetros porte | validated_local_pdf_only |
| CVAT6 | OK | OK | OK (0.15/0.30) | N/A | OK | OK (NT 30/2025) | PARTIAL | API Meu SUS Digital | validated_local_pdf_only |

---

## Resumo

- **Validados (local PDF):** 21/21
- **Validados (web):** 0/21 (portarias confirmadas, notas metodológicas web não encontradas individualmente)
- **Divergências código CRITICAL:** C2, C3 (wrong_indicator_mapping)
- **Divergências código HIGH:** C1, B3, B5 (faixa ótima ausente)
- **Todos os restantes:** partially_aligned (validação oficial pendente)
