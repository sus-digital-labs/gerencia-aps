# Saude Brasil 360

## 1. Objetivo deste arquivo
Consolidar o contexto institucional do programa Saude Brasil 360 e separar o que e contexto oficial do que realmente fecha regra de calculo.

## 2. Fontes vinculadas
- `SRC-CTX-001` Saude Brasil 360
- `SRC-CTX-002` Portaria GM/MS n 3.493/2024
- `SRC-CTX-003` FAQ do novo modelo de cofinanciamento federal da APS
- `SRC-CTX-004` noticia oficial de 2025-05-21
- `SRC-CTX-005` Fichas Tecnicas SAPS/MS

## 3. Papel institucional do programa
- nome canonic/current do projeto: `SAUDE_BRASIL_360`
- dominio de implementacao: APS
- uso no projeto: contrato canonic para indicadores, backlog, documentacao e runtime
- regra operacional: qualquer novo indicador precisa nascer no contrato `saudeBrasil360.calcularIndicador`, nao no legado Previne

## 4. Componentes relevantes para o projeto
- componente de qualidade
- incentivo adicional vinculado a equipes e dominios
- blocos atuais do backlog:
  - ESF: C1..C7
  - ESB: B1..B6
  - eMulti: M1, M2

## 5. Papel do componente de qualidade
- orienta quais indicadores entram no escopo do programa;
- ajuda a entender equipes elegiveis, dominos e incentivo adicional;
- nao fecha numerador, denominador, janela ou code set sozinho.

## 6. Contexto institucional vs regra de calculo
Pode ser validado por contexto institucional:
- nome do programa
- existencia do componente de qualidade
- agrupamento por ESF, ESB e eMulti
- narrativa de incentivo e governanca

Nao pode ser fechado so com pagina institucional:
- formula do indicador
- code set de procedimento/CID/CIAP/CBO
- janela temporal operacional
- criterio tecnico de exclusao
- prova de que um proxy clinico e aceitavel

## 7. Estado atual dos indicadores no projeto
- C2: `validated_runtime_public` + `requires_official_validation`
- C3: `validated_runtime_public` + `requires_official_validation`
- C5: `blocked_by_source`
- C6: `validated_runtime_public` + `requires_official_validation`
- C7: `validated_runtime_public` + `requires_official_validation`
- C1/C4: `not_implemented`
- B1..B6: `legacy_only`
- M1/M2: `legacy_only`

## 8. Regra de uso antes de codar
1. consultar `official-sources-registry.md`
2. verificar a pagina tematica do dominio
3. revisar a fonte primaria do indicador
4. aplicar `source-review-checklist.md`
5. so depois abrir gate de implementacao
