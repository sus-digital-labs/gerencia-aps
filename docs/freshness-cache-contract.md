# Freshness and Cache Contract

Status: fresh, stale, degraded, unknown.

Politica:
- cache agregado permitido
- cache individual proibido
- cache nominal proibido

Chave recomendada:
indicator:{code}:program:saude-brasil-360:rule:{ruleVersion}:competencia:{competencia}:unidade:{unidadeId}:equipe:{equipeId}

Invalida quando: ETL atualizar, sync concluir batch, ruleVersion mudar, filtro unidade/equipe mudar, freshness sair de stale/degraded para fresh.
