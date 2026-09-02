# Saude Bucal eSB

## 1. Objetivo deste arquivo
Preparar o bloco B1..B6 com base oficial rastreavel, sem tratar Previne legado ou SQL legado como fonte normativa.

## 2. Fontes vinculadas
- `SRC-CTX-005` Fichas Tecnicas SAPS/MS
- `SRC-ESB-012` Equipe de Saude Bucal (eSB)
- `SRC-ESB-013` Nota Informativa n 8/2025-CGSB/DESCO/SAPS/MS
- `SRC-CTX-004` noticia oficial de 2025-05-21

## 3. O que estas fontes validam hoje
- o dominio oficial da eSB no programa;
- existencia de fichas tecnicas especificas para saude bucal;
- contexto de incentivo adicional para eSB 40h;
- necessidade de revisar indicadores odontologicos por dominio proprio, nao por analogia direta com ESF.

## 4. Riscos antes de implementar B1..B6
- CBO: confirmar quais CBOs entram no escopo operacional de eSB e quando ha exigencia de 40h;
- equipe eSB: validar tipo de equipe, vinculo com eSF/eAP de referencia e criterios de elegibilidade;
- procedimentos odontologicos: amarrar code set oficial por indicador, nao por SQL legado;
- janela temporal: confirmar se cada indicador usa periodo mensal, quadrimestral ou 12 meses;
- vinculo unidade/equipe: validar quando o filtro deve respeitar unidade, equipe e INE;
- fonte de producao no e-SUS: confirmar se a evidencia vem de atendimento odontologico, atividade coletiva, encaminhamento ou outra tabela oficial da replica.

## 5. Pre-condicoes obrigatorias para B1..B6
- revisar `official-sources-registry.md`;
- vincular a fonte primaria oficial do indicador antes de codar;
- aplicar `source-review-checklist.md`;
- validar CBO, procedimentos, equipe eSB e vinculo territorial;
- manter `requires_official_validation` ate existir amarracao oficial especifica por indicador.

## 5.1 Estado atual do projeto
- B1..B6 ja estao implementados no endpoint canônico `saudeBrasil360.calcularIndicador`.
- B1..B6 ja foram validados em runtime local e em runtime publico autenticado.
- a camada oficial hoje sustenta contexto institucional e operacional de eSB, mas ainda nao fecha a formula normativa especifica de cada indicador.
- por isso, todos os B1..B6 devem permanecer com `requires_official_validation`.

## 6. Regra de bloqueio
Nao implementar B1..B6 apenas com:
- `previneBrasil.drilldown`;
- `Apps/web/server/indicadores-previne-brasil-sql.ts`;
- noticia institucional sem ficha tecnica;
- nota de incentivo sem nota metodologica do indicador.
