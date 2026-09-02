# Relatório de Validação de Indicadores — Saúde Brasil 360

> **Data:** 2026-05-21
> **Tipo:** Validação documental (sem alteração de código)
> **Escopo:** 21 métricas operacionais (15 Qualidade APS + 6 CVAT)

---

## Executive summary

Validação cruzada entre 15 notas metodológicas oficiais (PDFs locais), Nota Técnica nº 30/2025, Portaria GM/MS 6.907/2025 (Anexo V), código canónico (`saude-brasil-360/`) e documentação do projecto.

Resultado: **21/21 métricas validadas contra fontes locais PDF**. Nenhuma nota metodológica individual encontrada na web (apenas portarias enquadrantes). Duas divergências CRITICAL no código (C2, C3 implementam indicadores errados). Três divergências HIGH (C1, B3, B5 sem faixa ótima implementada).

---

## Fontes oficiais confirmadas

| Fonte | Tipo | Disponibilidade | URL/Path |
|---|---|---|---|
| Portaria GM/MS 3.493/2024 | Portaria | Web + local | [bvsms.saude.gov.br](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2024/prt3493_11_04_2024.html) |
| Portaria GM/MS 6.907/2025 | Portaria | Web | [bvsms.saude.gov.br](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2025/prt6907_08_05_2025.html) |
| Portaria SAPS/MS 161/2024 | Portaria | Web + local | [bvsms.saude.gov.br](https://bvsms.saude.gov.br/bvs/saudelegis/saps/2024/prt0161_20_12_2024_comp.html) |
| NT nº 30/2025-CGESCO/DESCO/SAPS/MS | Nota Técnica | Local PDF | `docs/Saúde Brasil 360/nota-tecnica-no-30-2025-cgesco-desco-saps-ms.pdf` |
| 15 Notas Metodológicas (B1-B6, C1-C7, M1-M2) | Nota Metodológica | Local PDF | `docs/Saúde Brasil 360/Nota Metodológica *.pdf` |
| Apresentação oficial componente qualidade | Apresentação | Local PDF | `docs/Saúde Brasil 360/27164415-apresentacao-indicadores-da-aps-componente-qualidade.pdf` |

---

## Tabela de validação — 21 métricas

| Código | Nome oficial | Componente | Fonte local | Fonte web | Estado documental | Estado código | Pendência principal |
|---|---|---|---|---|---|---|---|
| B1 | Primeira Consulta Odontológica Programada | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | SIGTAP completo |
| B2 | Tratamento Odontológico Concluído | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | Lista conclusivos |
| B3 | Taxa de Exodontia | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | Faixa ótima no código (HIGH) |
| B4 | Escovação Supervisionada 6-12 anos | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | Denominador oficial |
| B5 | Procedimentos Odontológicos Preventivos | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | Faixa ótima no código (HIGH) |
| B6 | Tratamento Restaurador Atraumático | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | Lista restauradores |
| C1 | Mais Acesso à APS | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | Faixa ótima no código (HIGH) |
| C2 | Cuidado no Desenvolvimento Infantil | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | **wrong_indicator_mapping** | **Reescrita completa (CRITICAL)** |
| C3 | Cuidado na Gestação e Puerpério | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | **wrong_indicator_mapping** | **Reescrita completa (CRITICAL)** |
| C4 | Cuidado da Pessoa com Diabetes | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | Pesos boas práticas |
| C5 | Cuidado da Pessoa com Hipertensão | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | Pesos boas práticas |
| C6 | Cuidado da Pessoa Idosa | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | Exceção eAP tipo 76 |
| C7 | Cuidado da Mulher Prevenção Câncer | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | Pesos por coorte |
| M1 | Média Atendimentos eMulti | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | Escopo eMulti proxy |
| M2 | Ações Interprofissionais eMulti | Qualidade APS | OK | PARTIAL | validated_local_pdf_only | partially_aligned | Def. interprofissional |
| CVAT1 | Cadastro Individual válido | CVAT | OK (NT 30) | PARTIAL | validated_local_pdf_only | derived-operational-rule | SQL não validada |
| CVAT2 | Cadastro Individual + Domiciliar | CVAT | OK (NT 30) | PARTIAL | validated_local_pdf_only | derived-operational-rule | Regra 24m domiciliar |
| CVAT3 | Vulnerabilidade PBF/BPC | CVAT | OK (NT 30) | PARTIAL | validated_local_pdf_only | derived-operational-rule | Dados PBF/BPC |
| CVAT4 | Perfil demográfico | CVAT | OK (NT 30) | PARTIAL | validated_local_pdf_only | derived-operational-rule | Def. exacta <5a |
| CVAT5 | Acompanhamento qualificado | CVAT | OK (NT 30) | PARTIAL | validated_local_pdf_only | derived-operational-rule | Parâmetros porte |
| CVAT6 | Satisfação Meu SUS Digital | CVAT | OK (NT 30) | PARTIAL | validated_local_pdf_only | derived-operational-rule | API externa |

---

## Evidências principais

### Portaria GM/MS 6.907/2025 — Anexo V

Confirma exactamente 15 eixos temáticos para o componente de qualidade:
Mais Acesso, Diabetes, Hipertensão, Desenvolvimento Infantil, Gestante/Puérpera, Pessoa Idosa, Câncer Mulher, 1ª Consulta Odonto, Tratamento Concluído, Exodontia, Escovação, Preventivos, ART, Média eMulti, Ações Interprofissionais eMulti.

### NT nº 30/2025

Detalha o componente CVAT com 2 dimensões: Cadastro (30%, até 3 pts) e Acompanhamento (70%, até 7 pts), com bónus satisfação (+0.15 ou +0.30). Classificação final: Ótimo (>8.5), Bom (7-8.5), Suficiente (5.0-6.9), Regular (<5.0). Valores financeiros: R$8.000/R$6.000/R$4.000/R$2.000.

### Divergências CRITICAL no código

- **C2**: `indicador-c2.ts` implementa sífilis/HIV gestantes (Previne Brasil). Oficial: 5 boas práticas crianças ≤2a.
- **C3**: `indicador-c3.ts` implementa saúde bucal gestante (1/11 boas práticas). Oficial: 11 boas práticas A-K gestação+puerpério.

---

## Conclusão

Estado global: **PARTIAL** — documentação alinhada, mas código com 2 divergências CRITICAL e 3 HIGH pendentes de correcção (etapas futuras, fora do escopo desta ronda documental).
