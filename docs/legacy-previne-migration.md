# Legacy Previne Migration

## Status
- Previne Brasil: deprecated/legacy_runtime/migration_reference_only.
- Saude Brasil 360: canonical/current.

## Regras
- Nao criar contrato novo com Previne como fonte canonic.
- Endpoint previne* existente = legado tecnico.
- Calculo novo nasce em saudeBrasil360.*.
- Documentacao nova usa Saude Brasil 360.
- Legado so para comparacao/migracao/nao-regressao temporaria.

## Mapa de migracao
- previneBrasil.drilldown -> saudeBrasil360.calcularIndicador e futuro drilldown canonico.
- previne.painelGeral -> painel agregado Saude Brasil 360.
- previne.* -> saudeBrasil360.*.

## Riscos
- confusao de nome
- SQL legado divergente
- regra antiga tratada como atual
- dashboard novo consumindo endpoint deprecated
- teste novo validando contrato deprecated

## Criterio de encerramento do legado
- 21 indicadores implementados no canonic
- smokes canonicos passando
- UI consumindo Saude Brasil 360
- endpoints legacy marcados deprecated
- nenhuma feature nova dependente de previne*
