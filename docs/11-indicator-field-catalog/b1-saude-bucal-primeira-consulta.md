# B1 — Saúde Bucal: primeira consulta

## Identificação normativa

- Documento oficial: Nota Metodológica B1, `SEI-0054640774`
- Regra versionada: `B1@2026.5`
- Indicador: primeira consulta odontológica programática por eSB
- Fonte declarada: SIAPS e SCNES
- Atualização/monitoramento: mensal
- Avaliação: quadrimestral

## Fórmula

`100 × primeiras consultas programáticas oficiais no mês ÷ população vinculada
às equipes de referência da eSB`

O numerador não é subconjunto do denominador. Percentual acima de 100% é
permitido.

### Numerador

Conta uma vez cada par pessoa/dentista elegível quando:

- o tipo é primeira consulta odontológica programática;
- existe SIGTAP `0301010153`;
- o CBO é `223208`, `223293` ou `223272`;
- não há primeira consulta ou conclusão pelo mesmo dentista nos 12 meses
  anteriores.

A conclusão de tratamento reinicia a janela. Na ausência de conclusão, a
própria data da primeira consulta inicia a janela.

### Denominador

Conta pessoas ativas, não falecidas e não mudadas de território, identificadas
apenas por hash pseudonimizado, vinculadas às eSF/eAP explicitamente
referenciadas pela autoridade da eSB:

| Padrão | Denominador |
|---|---|
| eSB 40h → eSF 40h | população da eSF |
| eSB 40h → duas eAP 20h | população das duas eAP |
| eSB 30h → eAP 30h | população da eAP |
| eSB 20h → eAP 20h | população da eAP |
| duas eSB 20h → eSF 40h | metade exata da população da eSF |

Equipe de Unidade Odontológica Móvel é elegível somente quando a homologação e
o vínculo oficial estiverem comprovados. O sistema não infere vínculos.

## Classificação

| Faixa percentual | Classificação |
|---:|---|
| `> 1,25` | Ótimo |
| `> 0,75` e `<= 1,25` | Bom |
| `> 0,25` e `<= 0,75` | Suficiente |
| `<= 0,25` | Regular |

## Contrato de fonte e qualidade

São obrigatórias nove fontes normalizadas: seis dimensões
(`cbo`, `equipe`, `procedimento`, `profissional`, `tipo_consulta_odonto`,
`unidade_saude`) e três fatos (`atend_odonto_proced`,
`atendimento_odonto`, `cad_individual`). Snapshot aberto, campo ausente,
identidade incompleta, evento duplicado, SIGTAP ausente ou vínculo de equipe
não comprovado bloqueiam o resultado.

## Estado comprovado

No escopo real `2902906` / INE `0001823299` / CNES `2402734` /
abril de 2026, Rust encontrou 34 primeiras consultas candidatas, mas persistiu
`BLOCKED_BY_SOURCE`, com 9 fontes de lineage e replay idempotente. O cadastro
individual ainda não representa snapshot completo, há um evento de primeira
consulta sem o SIGTAP oficial e o vínculo eSB→eSF/eAP não está disponível.

O TypeScript existente é legado, não fonte normativa nem golden. Não há
autorização de cutover, dual-run, ativação do BFF ou prova de painel para B1.
