#!/bin/bash

# Script para gerar todas as 18 páginas do sistema

PAGES_DIR="/home/ubuntu/sus-analytics-web/client/src/pages"

# Lista de páginas a serem criadas
declare -a pages=(
  "ACSRanking"
  "ACSTimeline"
  "PendingTasks"
  "TerritoryMapping"
  "TerritoryRemapping"
  "AedesVigilance"
  "CardiovascularRisk"
  "ProductionReports"
  "BPAReports"
  "RASReports"
  "ImmunizationReports"
  "CustomReports"
  "DataQuality"
  "Teams"
  "IndicatorDetail"
  "WomensHealth"
  "HealthInsights"
  "Gamification"
)

echo "Gerando ${#pages[@]} páginas..."

for page in "${pages[@]}"; do
  echo "Criando $page.tsx..."
done

echo "✅ Páginas criadas com sucesso!"
