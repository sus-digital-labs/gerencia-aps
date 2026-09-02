# Multimunicipality Detection

## Detecção de múltiplos municípios

- identificar presença de múltiplos códigos em `co_dim_municipio`;
- cruzar com `tb_dim_municipio` e código IBGE;
- correlacionar recortes por CNES e INE.

## Modelo operacional

- 1 instalação PEC pode representar 1..N municípios;
- agente mantém contexto `tenant -> installation -> municipality`.

## Isolamento obrigatório

- filtros mandatórios por:
  - `tenant`
  - `installation`
  - `municipality`
  - `CNES`
  - `INE`

## Risco cross-tenant

- risco de mistura de dados entre municípios/instalações sem filtro rígido.

## Política de filtro obrigatório

- queries sem recorte de contexto devem ser rejeitadas no agente;
- lote sem metadata de contexto não pode ser enviado ao servidor.
