# Prompt — Implementação Real C2 e C3 (Saúde Brasil 360)

> **Pré-requisito:** rodada documental PASSO 0-13 + continuidade normativa concluídas.
> **Escopo:** implementar cálculo real de C2 e C3 conforme notas metodológicas oficiais.
> **Referências canónicas:**
> - `.ai/CONTEXT/indicator-registry.json`
> - `docs/11-indicator-field-catalog/official-indicators-registry.md`
> - `docs/Saúde Brasil 360/Nota Metodológica C2*.pdf`
> - `docs/Saúde Brasil 360/Nota Metodológica C3*.pdf`

---

## Contexto

- `catalog.ts` já tem nomes oficiais (C2: "Cuidado no desenvolvimento infantil", C3: "Cuidado na gestação e puerpério").
- `indicador-c2.ts` implementa Previne Brasil (sífilis/HIV gestantes) — **deve ser reescrito**.
- `indicador-c3.ts` implementa apenas saúde bucal gestante (1/11 boas práticas) — **deve ser reescrito**.
- O código actual de C2 (sífilis/HIV) pode ser reaproveitado como boas práticas G+H do C3 oficial.
- O código actual de C3 (odonto gestante) pode ser reaproveitado como boa prática K do C3 oficial.

---

## C2 — Cuidado no Desenvolvimento Infantil

### Definição oficial

Proporção de crianças ≤2 anos com acompanhamento adequado, medido por 5 boas práticas:

| BP | Descrição | Pontuação | Critério |
|---|---|---|---|
| A | 1ª consulta de puericultura até 30 dias de vida | **20 pts** | Atendimento individual com CBO elegível (2251/2252/2253/2231 médicos, 2235 enfermeiros), idade ≤30 dias |
| B | 9 consultas de puericultura até completar 2 anos | **20 pts** | 9 registros em `tb_fat_atendimento_individual` com CIAP/CID de puericultura |
| C | 9 registros simultâneos de peso + altura/comprimento | **20 pts** | Procedimentos de peso e altura no mesmo atendimento. CBOs adicionais: 3222 (téc. enfermagem), 5151-05 (ACS) |
| D | 2 visitas domiciliares por ACS/TACS até 2 anos | **20 pts** | 2 registros em `tb_fat_visita_domiciliar` com motivo puericultura. CBOs: 3222-55 (TACS), 5151-05 (ACS). **Não pontuada para eAP tipo 76.** |
| E | Vacinação completa conforme calendário (até 2 anos) | **20 pts** | Validar contra `tb_fat_vacinacao` / RIA. Imunobiológicos: pentavalente, VIP/VOP, tríplice viral, pneumocócica 10v |

### Fórmula

```
score_crianca = soma(pontos_bp_cumpridas) / max_pontos
  # max_pontos = 100 para eSF; 80 para eAP tipo 76 (BP D excluída)
indicador_C2 = media(score_crianca) para todas crianças ≤2a vinculadas à equipe
```

### Faixas de classificação (Quadro 02 da NM)

- Ótimo: > 75 e ≤ 100
- Bom: > 50 e ≤ 75
- Suficiente: > 25 e ≤ 50
- Regular: ≤ 25

### Denominador

Crianças com idade ≤2 anos vinculadas a equipe eSF/eAP com cadastro individual válido (`tb_cds_cad_individual`, `co_dim_faixa_etaria` ≤ 2a ou `dt_nascimento` com idade calculada).

### Numerador

Somatório de boas práticas cumpridas por criança (pontuação ponderada).

### Ação

1. Criar `indicador-c2-v2.ts` (ou reescrever `indicador-c2.ts`).
2. Manter o código actual de C2 (sífilis/HIV) como módulo reutilizável para C3 boas práticas G/H.
3. Implementar as 5 boas práticas com queries PEC contra tabelas corretas.
4. Validar CBO elegível (UNKNOWN_OFFICIAL_VALIDATION_NEEDED até confirmar lista exacta).
5. Escrever testes unitários + smoke test.
6. Não declarar `implemented: true` sem test pass + smoke.

---

## C3 — Cuidado na Gestação e Puerpério

### Definição oficial

Proporção de gestantes/puérperas com acompanhamento adequado, medido por 11 boas práticas (A-K):

| BP | Descrição | Pontuação | Critério |
|---|---|---|---|
| A | Captação precoce (1ª consulta pré-natal ≤12ª semana) | **10 pts** | Atendimento individual com CIAP W78/W79/W81/W84/W85 ou CID Z34/Z35/Z33 etc., IG ≤12 sem. CBO médico/enfermeiro. |
| B | 7 consultas de pré-natal | **9 pts** | 7 atendimentos individuais com CBO médico (2251/2252/2253/2231) ou enfermeiro (2235) durante a gestação |
| C | 7 aferições de pressão arterial | **9 pts** | 7 registros de PA (campo específico PEC ou SIGTAP 03.01.10.003-9). CBOs: médico, enfermeiro, téc. enfermagem (3222) |
| D | 7 registros de peso + altura | **9 pts** | 7 registros simultâneos peso+altura (SIGTAP 01.01.04.002-4, 008-3, 007-5). CBOs: +3222, +5151-05 |
| E | 3 visitas domiciliares por ACS/TACS | **9 pts** | 3 registros em `tb_fat_visita_domiciliar`. CBOs: 3222-55 (TACS), 5151-05 (ACS). **Não pontuada para eAP tipo 76.** |
| F | Vacina dTpa a partir da 20ª semana | **9 pts** | Registro em `tb_fat_vacinacao`/RIA com código vacina 57 (dTpa adulto), IG ≥20 sem |
| G | Testes 1º trimestre (sífilis, HIV, HepB, HepC) | **9 pts** | Procedimentos SIGTAP específicos no 1º tri (ver lista completa na NM) |
| H | Testes 3º trimestre (sífilis, HIV) | **9 pts** | Procedimentos SIGTAP específicos no 3º tri (ver lista completa na NM) |
| I | Consulta puerperal (até 42 dias pós-parto) | **9 pts** | Atendimento individual com CIAP W96 ou CID/procedimento puerperal. CBO médico/enfermeiro. |
| J | Visita puerperal por ACS/TACS (até 42 dias) | **9 pts** | Registro em `tb_fat_visita_domiciliar`. CBOs: 3222-55, 5151-05. **Não pontuada para eAP tipo 76.** |
| K | Saúde bucal na gestação (≥1 atendimento) | **9 pts** | Registro em `tb_fat_atendimento_odonto` ou MIP/MIAC. CBO: 2232 (dentista), 3224 (TSB). |

### Fórmula

```
score_gestante = soma(pontos_bp_cumpridas) / max_pontos
  # max_pontos = 100 para eSF; 82 para eAP tipo 76 (BPs E e J excluídas: 100 - 9 - 9 = 82)
indicador_C3 = media(score_gestante) para todas gestantes vinculadas à equipe no período
```

### Faixas de classificação (item 30 da NM)

- Ótimo: > 75 e ≤ 100
- Bom: > 50 e ≤ 75
- Suficiente: > 25 e ≤ 50
- Regular: ≤ 25

### Denominador

Gestantes vinculadas à equipe eSF/eAP com cadastro individual válido e registro de gestação activa ou encerrada no período avaliado.

### Numerador

Somatório de boas práticas cumpridas por gestante (pontuação ponderada).

### Ação

1. Criar `indicador-c3-v2.ts` (ou reescrever `indicador-c3.ts`).
2. Reaproveitar código actual de `indicador-c3.ts` (odonto gestante) como implementação da boa prática K.
3. Reaproveitar código actual de `indicador-c2.ts` (sífilis/HIV) como implementação das boas práticas G + H.
4. Implementar as 11 boas práticas com queries PEC.
5. Validar CBO, SIGTAP e CIAP (UNKNOWN_OFFICIAL_VALIDATION_NEEDED até confirmar listas exactas).
6. Escrever testes unitários + smoke test.
7. Não declarar `implemented: true` sem test pass + smoke.

---

## Regras gerais

- Não declarar pronto sem: `pnpm typecheck` + `pnpm test` + smoke test green.
- Não usar valores SIGTAP/CBO/CID/CIAP sem confirmação na nota metodológica PDF.
- Marcar com `UNKNOWN_OFFICIAL_VALIDATION_NEEDED` qualquer valor inferido.
- Tabelas PEC são read-only — não fazer INSERT/UPDATE/DELETE.
- Manter contratos tRPC existentes (`saudeBrasil360.calcularIndicador`).
- Actualizar `catalog.ts` para `implemented: true` + `canonicalEvidence: true` apenas após test pass.
- Documentar evidência de validação no PR.

---

## Checklist de conclusão

- [ ] `indicador-c2.ts` implementa 5 boas práticas (desenvolvimento infantil)
- [ ] `indicador-c3.ts` implementa 11 boas práticas A-K (gestação e puerpério)
- [ ] Código antigo de C2 (sífilis/HIV) reaproveitado em C3 boas práticas G/H
- [ ] Código antigo de C3 (odonto) reaproveitado em C3 boa prática K
- [ ] `catalog.ts` actualizado com `implemented: true` para C2 e C3
- [ ] `pnpm typecheck` pass
- [ ] `pnpm test` pass
- [ ] Smoke test (`scripts/tests/shared/smoke-saude360.mjs`) pass
- [ ] Nenhum segredo exposto
- [ ] Registry JSON actualizado com `implementation_status: "implemented"`
- [ ] PR com evidência de validação
