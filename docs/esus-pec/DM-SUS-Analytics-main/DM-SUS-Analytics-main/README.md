<p align="center">
  <img src="assets/banner.png" alt="DM-SUS-Analytics Banner" width="100%"/>
</p>

<h1 align="center">DM-SUS-Analytics</h1>
<p align="center">
  <strong>Plataforma Avançada de Análise de Dados para Saúde Pública Municipal</strong><br/>
  <em>Advanced Public Health Analytics Platform for Municipal Healthcare</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.9+-blue?logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/numpy-scientific-013243?logo=numpy" alt="NumPy"/>
  <img src="https://img.shields.io/badge/license-Apache%202.0-green" alt="License"/>
  <img src="https://img.shields.io/badge/SUS-Sa%C3%BAde%20P%C3%BAblica-00875A" alt="SUS"/>
  <img src="https://img.shields.io/badge/ODS%203-Sa%C3%BAde%20e%20Bem--Estar-E5243B" alt="ODS3"/>
</p>

---

## Sobre o Projeto | About

**PT-BR:** Plataforma computacional completa para análise, predição e otimização de dados de saúde pública no âmbito do Sistema Único de Saúde (SUS). Desenvolvida para gestores municipais, epidemiologistas e pesquisadores, integra 6 módulos avançados que cobrem desde vigilância epidemiológica em tempo real até scoring municipal com 16 indicadores.

**EN:** Complete computational platform for analysis, prediction and optimization of public health data within Brazil's Unified Health System (SUS). Designed for municipal managers, epidemiologists and researchers, it integrates 6 advanced modules covering everything from real-time epidemiological surveillance to municipal scoring with 16 indicators.

---

## Arquitetura | Architecture

```
dm_sus/
├── indicadores/          # Indicadores epidemiológicos básicos
│   └── epidemiologicos.py    # Taxa mortalidade, incidência, prevalência, ICSAB
├── vigilancia/           # MÓDULO 1: Vigilância Epidemiológica em Tempo Real
│   └── vigilancia_epidemiologica.py  # R(t), CUSUM, diagrama de controle
├── rede_atencao/         # MÓDULO 2: Otimização de Rede de Atenção Básica
│   └── otimizacao_rede.py    # P-mediana, Haversine, balanceamento ESF
├── predicao/             # MÓDULO 3: Predição de Demanda e Gestão de Leitos
│   └── predicao_demanda.py   # Holt-Winters, Erlang-C, Monte Carlo
├── geoespacial/          # MÓDULO 4: Análise Geoespacial
│   └── determinantes_sociais.py  # IVS, Moran's I, LISA, KDE
├── alertas/              # MÓDULO 5: Sistema de Alerta e Scoring
│   └── sistema_alerta.py    # Semáforo 16 indicadores, Mann-Kendall
└── dados/                # Conectores de dados (DATASUS, IBGE)
```

---

## Módulos | Modules

### Módulo Base: Indicadores Epidemiológicos

| Indicador | Fórmula | Referência Brasil | Meta ODS 2030 |
|---|---|---|---|
| **TMG** (Taxa Mortalidade Geral) | `(Óbitos / Pop) × 1.000` | 6,5/1.000 hab | — |
| **TMI** (Taxa Mortalidade Infantil) | `(Óbitos <1a / NV) × 1.000` | 11,9/1.000 NV | ≤ 12 |
| **RMM** (Razão Mortalidade Materna) | `(Óbitos maternos / NV) × 100.000` | 55/100.000 NV | < 70 |
| **APVP** (Anos Potenciais Vida Perdidos) | `Σ (70 - idade_óbito)` | — | — |
| **Cobertura ESF** | `(Equipes × 3.450 / Pop) × 100` | 76,2% | 100% |
| **Taxa ICSAB** | `(Internações CSAB / Pop) × 10.000` | 150/10.000 | < 100 |

### 1. Vigilância Epidemiológica em Tempo Real

Monitoramento contínuo de agravos com detecção automática de surtos.

| Funcionalidade | Método Matemático | Referência |
|---|---|---|
| Número reprodutivo R(t) | Cori et al. (2013) - janela deslizante Bayesiana | Am J Epidemiol |
| Detecção de surtos | CUSUM (Cumulative Sum Control Chart) | Page (1954) |
| Diagrama de controle | Média + 2σ endêmico (canal endêmico) | Bortman (1999) |
| Notificação compulsória | Workflow completo com severidade | Portaria GM/MS 217/2023 |

**Fórmula R(t):**
```
R(t) = Σ I(s) / Σ I(s) × w(t-s)
```
Onde `w(t-s)` é a distribuição do intervalo serial (Gamma).

### 2. Otimização de Rede de Atenção Básica (UBS/ESF)

Localização ótima de UBS e balanceamento de equipes ESF.

| Funcionalidade | Método | Complexidade |
|---|---|---|
| Localização de UBS | Problema de p-mediana (Teitz-Bart) | NP-hard, heurística O(p²×m×n) |
| Distância geodésica | Fórmula de Haversine | O(1) |
| Acessibilidade | Análise de cobertura por raio + Gini | O(n×m) |
| Balanceamento ESF | Bin packing (first-fit decreasing) | O(n log n) |

**Fórmula p-mediana:**
```
Minimizar: Σᵢ Σⱼ wᵢ × dᵢⱼ × xᵢⱼ
Sujeito a: Σⱼ xᵢⱼ = 1 ∀i, Σⱼ yⱼ = p, xᵢⱼ ≤ yⱼ
```

### 3. Predição de Demanda e Gestão de Leitos

Previsão de demanda hospitalar e dimensionamento via teoria de filas.

| Funcionalidade | Método | Aplicação |
|---|---|---|
| Decomposição sazonal | STL aditivo (tendência + sazonalidade + resíduo) | Padrões anuais de internação |
| Previsão | Holt-Winters (suavização exponencial tripla) | Projeção 6-12 meses |
| Dimensionamento de leitos | Erlang-C (M/M/c) em log-space | Portaria 1.631/2015 |
| Simulação de ocupação | Monte Carlo (1000 cenários) | Risco de lotação |

**Fórmula Erlang-C:**
```
P(espera) = P(0) × A^c / (c! × (1-ρ))
Onde: A = λ/μ, ρ = A/c
```

### 4. Análise Geoespacial de Determinantes Sociais

Mapeamento de vulnerabilidade e clusters espaciais.

| Funcionalidade | Método | Referência |
|---|---|---|
| IVS (3 dimensões) | Normalização min-max + ponderação | Modelo Dahlgren-Whitehead |
| Autocorrelação global | Moran's I + teste de permutação | Moran (1950) |
| Clusters locais | LISA (Local Indicators of Spatial Association) | Anselin (1995) |
| Mapas de calor | Kernel Density Estimation (Gaussiano) | Silverman (1986) |

**Fórmula Moran's I:**
```
I = (N/W) × Σᵢ Σⱼ wᵢⱼ(xᵢ - x̄)(xⱼ - x̄) / Σᵢ(xᵢ - x̄)²
```

### 5. Sistema de Alerta Precoce e Scoring Municipal

Avaliação integrada com 16 indicadores em 4 dimensões.

| Dimensão (25% cada) | Indicadores | Meta |
|---|---|---|
| **Acesso** | Cobertura ESF, Vacinal, Pré-natal, Saúde Bucal | 80-100% |
| **Efetividade** | TMI, RMM, ICSAB, Mortalidade prematura DCNT | Redução contínua |
| **Vigilância** | Notificação, Investigação óbitos, Tempo resposta, Água | 90%+ |
| **Gestão** | Gasto per capita, % receita, Consultas, Satisfação | Crescimento |

**Classificação:**
- **A** (800-1000): Município referência
- **B** (600-800): Bom desempenho
- **C** (400-600): Regular, necessita melhorias
- **D** (200-400): Ruim, múltiplos indicadores críticos
- **E** (0-200): Emergência em saúde pública

---

## Exemplo de Uso | Usage Example

```python
from dm_sus.alertas.sistema_alerta import SemaforoSaude, GeradorRelatorio
from dm_sus.predicao.predicao_demanda import GestorLeitos
from dm_sus.rede_atencao.otimizacao_rede import OtimizadorRedeUBS

# Avaliar município com 16 indicadores
semaforo = SemaforoSaude()
dados = {
    "cobertura_esf": 85, "cobertura_vacinal": 72,
    "cobertura_prenatal": 65, "cobertura_saude_bucal": 40,
    "taxa_mortalidade_infantil": 14, "razao_mortalidade_materna": 80,
    "taxa_icsab": 180, "mortalidade_prematura_dcnt": 300,
    "taxa_notificacao_compulsoria": 75, "investigacao_obitos_infantis": 80,
    "tempo_resposta_surtos_dias": 4, "cobertura_agua_vigilancia": 70,
    "gasto_saude_per_capita": 600, "percentual_receita_saude": 20,
    "consultas_per_capita": 2.2, "satisfacao_usuario": 55
}
score = semaforo.avaliar_municipio(dados)
relatorio = GeradorRelatorio().gerar_resumo_executivo(score, "Meu Município")
print(f"Nota: {relatorio['score']['nota']}/1000 ({relatorio['score']['classificacao']})")

# Dimensionar leitos para 200.000 habitantes
gestor = GestorLeitos()
leitos = gestor.dimensionar_leitos(populacao=200000)
print(f"Leitos necessários: {leitos['recomendacao_final']}")
print(f"Distribuição: {leitos['distribuicao_recomendada']}")

# Otimizar localização de UBS
otimizador = OtimizadorRedeUBS()
resultado = otimizador.resolver_p_mediana(setores, candidatos, p=5)
print(f"Distância média: {resultado['distancia_media_geral_km']:.2f} km")
```

---

## Instalação | Installation

```bash
git clone https://github.com/dmtechsoftwares-sudo/DM-SUS-Analytics.git
cd DM-SUS-Analytics
pip install -e .
```

**Dependências:** Python 3.9+, NumPy

---

## Referências Acadêmicas | Academic References

1. Cori A et al. (2013). A New Framework and Software to Estimate Time-Varying Reproduction Numbers During Epidemics. *Am J Epidemiol*
2. Daskin MS (2013). *Network and Discrete Location*. Wiley
3. Box GEP, Jenkins GM (1976). *Time Series Analysis*. Holden-Day
4. Gross D, Harris CM (2008). *Fundamentals of Queueing Theory*. Wiley
5. Moran PAP (1950). Notes on Continuous Stochastic Phenomena. *Biometrika*
6. Anselin L (1995). Local Indicators of Spatial Association. *Geographical Analysis*
7. Mann HB (1945). Nonparametric Tests Against Trend. *Econometrica*
8. Dahlgren G, Whitehead M (1991). *Policies and Strategies to Promote Social Equity in Health*
9. Page ES (1954). Continuous Inspection Schemes. *Biometrika*
10. RIPSA — Rede Interagencial de Informações para a Saúde
11. Portaria GM/MS nº 2.436/2017 — Política Nacional de Atenção Básica
12. Portaria GM/MS nº 1.631/2015 — Parâmetros de necessidade de leitos

---

## Referências Normativas SUS | SUS Regulatory References

- **Portaria MS/GM nº 3.947/1998** — Indicadores básicos de saúde
- **Portaria SAS/MS nº 221/2008** — Lista de ICSAB
- **Portaria nº 2.436/2017** — Política Nacional de Atenção Básica (PNAB)
- **Portaria GM/MS nº 1.631/2015** — Parâmetros de necessidade de leitos
- **ODS 3** — Saúde e Bem-Estar (Agenda 2030 ONU)

---

**Autor:** Eduardo Muniz Alves — Programador e Cientista de Dados
**Empresa:** DM Technology
**Licença:** Apache 2.0 — Veja [LICENSE](LICENSE) para detalhes.
