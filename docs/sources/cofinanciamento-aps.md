# Cofinanciamento APS

## 1. Objetivo deste arquivo
Registrar as fontes oficiais de cofinanciamento que ajudam a interpretar o programa, sem confundir incentivo financeiro com formula tecnica do indicador.

## 2. Fontes vinculadas
- `SRC-CTX-002` Portaria GM/MS n 3.493/2024
- `SRC-CTX-003` FAQ oficial do novo modelo de cofinanciamento federal da APS
- `SRC-CTX-004` noticia oficial de 2025-05-21
- `SRC-EMULTI-015` Nota Informativa n 4/2025-CGESCO/DESCO/SAPS/MS
- `SRC-ESB-013` Nota Informativa n 8/2025-CGSB/DESCO/SAPS/MS

## 3. O que estas fontes validam
- existencia do novo arranjo de cofinanciamento federal da APS;
- componentes do incentivo;
- relacionamento entre equipes elegiveis e pagamento adicional;
- orientacoes operacionais de incentivo para eSF/eAP/eSB/eMulti.

## 4. O que estas fontes nao validam sozinhas
- formula final de C2, C3, C6 ou C7;
- formula futura de B1..B6;
- definicao completa de numerador/denominador;
- code sets de procedimentos, vacinas, CID, CIAP ou CBO.

## 5. Regra de governanca
- cofinanciamento e incentivo nao sao automaticamente formula do indicador;
- qualquer implementacao precisa de fonte primaria especifica por indicador;
- quando a portaria mudar incentivo, a regra so muda se a ficha tecnica/nota metodologica do indicador tambem exigir.

## 6. Uso pratico no backlog
- C2/C3/C6/C7: manter `requires_official_validation` mesmo com runtime publico validado.
- B1..B6: nao iniciar implementacao sem antes cruzar estas fontes com `sources/saude-bucal-esb.md`.
- M1/M2: nao iniciar implementacao sem antes cruzar estas fontes com `sources/emulti.md`.
