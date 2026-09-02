"""
DM-SUS-Analytics: Predição de Demanda e Gestão de Leitos
==========================================================
Autor: Eduardo Muniz Alves | DM Technology

Módulo de predição de demanda hospitalar e gestão de leitos:
- Modelo ARIMA simplificado para séries temporais de demanda
- Teoria de filas (M/M/c) para dimensionamento de leitos
- Simulação de Monte Carlo para cenários de ocupação
- Predição de internações por sazonalidade

Referências:
- Box GEP, Jenkins GM (1976) - Time Series Analysis
- Gross D, Harris CM (2008) - Fundamentals of Queueing Theory
- Green LV (2006) - Queueing Analysis in Healthcare
- Portaria GM/MS nº 1.631/2015 - Parâmetros de necessidade de leitos

"Predição de demanda: o cristal do gestor.
 Saber que janeiro vai lotar a pediatria
 (dengue + férias + desidratação) permite
 preparar ANTES. Reativo é amador. Preditivo é profissional."
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class ParametrosHospitalares:
    """Parâmetros de um hospital/UPA."""
    nome: str
    leitos_clinicos: int
    leitos_uti: int
    leitos_pediatria: int
    leitos_obstetricos: int
    tempo_medio_permanencia_dias: float = 5.0  # TMP
    taxa_ocupacao_atual: float = 0.0


@dataclass
class DemandaHistorica:
    """Série temporal de demanda por serviços."""
    internacoes_mensais: np.ndarray  # 12+ meses
    atendimentos_urgencia_diarios: np.ndarray
    cirurgias_mensais: np.ndarray = field(default_factory=lambda: np.array([]))


class PreditorDemanda:
    """
    Predição de demanda por serviços de saúde.

    Métodos:
    1. Decomposição sazonal + tendência (STL simplificado)
    2. Suavização exponencial de Holt-Winters
    3. Regressão com variáveis sazonais

    "Prever demanda em saúde: não é bola de cristal.
     É estatística. Dengue sobe em março. Respiratória
     em junho. Trauma no carnaval. Os padrões se repetem.
     Quem não vê padrão, não está olhando direito."
    """

    def decomposicao_sazonal(self, serie: np.ndarray,
                               periodo: int = 12) -> Dict:
        """
        Decomposição aditiva: Y(t) = T(t) + S(t) + R(t)

        T(t) = tendência (média móvel centrada)
        S(t) = sazonalidade (média por período - média geral)
        R(t) = resíduo (Y - T - S)

        "Decomposição: separar o sinal do ruído.
         A tendência mostra para onde estamos indo.
         A sazonalidade mostra o ritmo do ano.
         O resíduo mostra o que não entendemos (ainda)."
        """
        n = len(serie)
        if n < 2 * periodo:
            return {"erro": "Série precisa de pelo menos 2 ciclos completos"}

        # Tendência: média móvel centrada de ordem 'periodo'
        tendencia = np.full(n, np.nan)
        meia = periodo // 2

        for t in range(meia, n - meia):
            if periodo % 2 == 0:
                # Média móvel 2×periodo para período par
                tendencia[t] = (0.5 * serie[t - meia] +
                                np.sum(serie[t - meia + 1:t + meia]) +
                                0.5 * serie[t + meia]) / periodo
            else:
                tendencia[t] = np.mean(serie[t - meia:t + meia + 1])

        # Sazonalidade: média dos desvios por posição no ciclo
        dessazonalizado = serie - tendencia
        sazonalidade = np.zeros(periodo)

        for p in range(periodo):
            valores = []
            for t in range(p, n, periodo):
                if not np.isnan(dessazonalizado[t]):
                    valores.append(dessazonalizado[t])
            if valores:
                sazonalidade[p] = np.mean(valores)

        # Centralizar sazonalidade (soma = 0)
        sazonalidade -= np.mean(sazonalidade)

        # Expandir sazonalidade para toda a série
        sazonal_expandida = np.tile(sazonalidade, n // periodo + 1)[:n]

        # Resíduo
        residuo = serie - tendencia - sazonal_expandida

        return {
            "tendencia": tendencia.tolist(),
            "sazonalidade": sazonalidade.tolist(),
            "sazonalidade_expandida": sazonal_expandida.tolist(),
            "residuo": residuo.tolist(),
            "serie_original": serie.tolist(),
            "periodo": periodo,
            "indice_sazonalidade": {
                f"periodo_{i+1}": round(float(sazonalidade[i]), 2)
                for i in range(periodo)
            }
        }

    def holt_winters(self, serie: np.ndarray, periodo: int = 12,
                      alpha: float = 0.3, beta: float = 0.1,
                      gamma: float = 0.3,
                      horizonte: int = 12) -> Dict:
        """
        Suavização Exponencial de Holt-Winters (aditivo).

        Equações de atualização:
        L(t) = α(Y(t) - S(t-m)) + (1-α)(L(t-1) + B(t-1))     [nível]
        B(t) = β(L(t) - L(t-1)) + (1-β)B(t-1)                  [tendência]
        S(t) = γ(Y(t) - L(t)) + (1-γ)S(t-m)                    [sazonalidade]

        Previsão:
        Ŷ(t+h) = L(t) + h×B(t) + S(t+h-m)

        Parâmetros:
            α (alpha): suavização do nível (0-1)
            β (beta): suavização da tendência (0-1)
            γ (gamma): suavização da sazonalidade (0-1)

        "Holt-Winters: o canivete suíço da previsão.
         Três parâmetros, três componentes, zero complicação.
         Funciona surpreendentemente bem para dados de saúde.
         Não precisa de PhD para usar. Precisa de bom senso."
        """
        n = len(serie)
        if n < 2 * periodo:
            return {"erro": "Série precisa de pelo menos 2 ciclos"}

        # Inicialização
        L = np.zeros(n)  # Nível
        B = np.zeros(n)  # Tendência
        S = np.zeros(n + horizonte)  # Sazonalidade

        # Nível inicial: média do primeiro ciclo
        L[0] = np.mean(serie[:periodo])

        # Tendência inicial: diferença média entre ciclos
        B[0] = np.mean(
            (serie[periodo:2*periodo] - serie[:periodo]) / periodo
        )

        # Sazonalidade inicial: desvio do primeiro ciclo
        for i in range(periodo):
            S[i] = serie[i] - L[0]

        # Atualização recursiva
        ajustado = np.zeros(n)
        for t in range(1, n):
            if t >= periodo:
                L[t] = alpha * (serie[t] - S[t - periodo]) + (1 - alpha) * (L[t-1] + B[t-1])
                B[t] = beta * (L[t] - L[t-1]) + (1 - beta) * B[t-1]
                S[t] = gamma * (serie[t] - L[t]) + (1 - gamma) * S[t - periodo]
            else:
                L[t] = alpha * (serie[t] - S[t]) + (1 - alpha) * (L[t-1] + B[t-1])
                B[t] = beta * (L[t] - L[t-1]) + (1 - beta) * B[t-1]

            ajustado[t] = L[t] + B[t] + S[max(0, t - periodo)]

        # Previsão
        previsao = np.zeros(horizonte)
        for h in range(horizonte):
            idx_sazonal = n + h - periodo
            if idx_sazonal >= 0:
                previsao[h] = L[n-1] + (h + 1) * B[n-1] + S[idx_sazonal]
            else:
                previsao[h] = L[n-1] + (h + 1) * B[n-1]

        # Erro de ajuste (MAPE)
        erros = np.abs(serie[periodo:] - ajustado[periodo:])
        mape = np.mean(erros / np.maximum(np.abs(serie[periodo:]), 1)) * 100

        return {
            "ajustado": ajustado.tolist(),
            "previsao": np.round(previsao).astype(int).tolist(),
            "nivel": L.tolist(),
            "tendencia_componente": B.tolist(),
            "sazonalidade": S[:n].tolist(),
            "mape_percentual": round(float(mape), 2),
            "parametros": {"alpha": alpha, "beta": beta, "gamma": gamma},
            "tendencia_mensal": round(float(B[n-1]), 2),
            "direcao": "crescente" if B[n-1] > 0 else "decrescente"
        }


class GestorLeitos:
    """
    Gestão de leitos hospitalares via teoria de filas.

    Modelo M/M/c (Erlang-C):
    - Chegadas: Poisson com taxa λ
    - Atendimento: exponencial com taxa μ
    - c servidores (leitos)

    Métricas:
    - P(espera) = probabilidade de fila
    - W_q = tempo médio na fila
    - L_q = número médio na fila
    - ρ = taxa de ocupação

    Referência: Portaria GM/MS nº 1.631/2015
    - 2,5 leitos clínicos / 1.000 hab
    - 0,3 leitos UTI / 1.000 hab

    "Teoria de filas em hospital: paciente não é cliente.
     Não pode 'voltar amanhã'. Fila em saúde mata.
     Erlang-C: a matemática que dimensiona leitos
     para que ninguém morra esperando."
    """

    def erlang_c(self, lambda_chegada: float, mu_servico: float,
                  c_servidores: int) -> Dict:
        """
        Fórmula de Erlang-C para sistema M/M/c.

        ρ = λ / (c × μ)  (utilização por servidor)
        A = λ / μ         (intensidade de tráfego)

        P(0) = [Σ_{n=0}^{c-1} A^n/n! + A^c/(c!(1-ρ))]^{-1}

        P(espera) = P(0) × A^c / (c! × (1-ρ))

        W_q = P(espera) / (c × μ - λ)  [tempo médio na fila]
        L_q = λ × W_q                   [número médio na fila]

        "Erlang-C: inventada para telefonia em 1917.
         Funciona perfeitamente para leitos em 2025.
         Boas ideias transcendem o contexto original.
         Agner Krarup Erlang: o herói silencioso."
        """
        from math import lgamma, exp, log

        A = lambda_chegada / mu_servico  # Intensidade de tráfego
        c = c_servidores
        rho = A / c  # Utilização

        if rho >= 1:
            return {
                "estavel": False,
                "mensagem": f"Sistema instável! ρ = {rho:.2f} ≥ 1. Demanda excede capacidade.",
                "utilizacao": round(float(rho), 4),
                "leitos_minimos_necessarios": int(np.ceil(A)) + 1
            }

        # Cálculos em log-space para evitar overflow com números grandes
        # log(A^n / n!) = n*log(A) - log(n!)
        log_A = log(max(A, 1e-300))

        # P(0) - probabilidade de sistema vazio
        # Soma = Σ_{n=0}^{c-1} A^n/n!
        log_termos = []
        for n in range(c):
            log_termo = n * log_A - lgamma(n + 1)  # lgamma(n+1) = log(n!)
            log_termos.append(log_termo)

        # log(A^c / (c! * (1-rho)))
        log_ultimo = c * log_A - lgamma(c + 1) - log(1 - rho)

        # Somar em log-space usando log-sum-exp
        todos_log = log_termos + [log_ultimo]
        max_log = max(todos_log)
        soma_total = exp(max_log) * sum(exp(lt - max_log) for lt in todos_log)
        p0 = 1.0 / soma_total

        # P(espera) = P(0) * A^c / (c! * (1-rho))
        p_espera = p0 * exp(log_ultimo)

        # Métricas de desempenho
        wq = p_espera / (c * mu_servico - lambda_chegada)  # Tempo na fila
        lq = lambda_chegada * wq  # Número na fila
        ws = wq + 1 / mu_servico  # Tempo total no sistema
        ls = lambda_chegada * ws  # Número total no sistema

        return {
            "estavel": True,
            "utilizacao": round(float(rho), 4),
            "probabilidade_espera": round(float(p_espera), 4),
            "tempo_medio_fila_dias": round(float(wq), 2),
            "pacientes_medio_fila": round(float(lq), 1),
            "tempo_medio_sistema_dias": round(float(ws), 2),
            "pacientes_medio_sistema": round(float(ls), 1),
            "leitos_utilizados": c,
            "taxa_chegada_dia": lambda_chegada,
            "tempo_medio_permanencia_dias": round(1 / mu_servico, 1)
        }

    def dimensionar_leitos(self, populacao: int,
                             taxa_internacao_por_mil: float = 50.0,
                             tmp_dias: float = 5.0,
                             meta_ocupacao: float = 0.85,
                             meta_espera_max_horas: float = 4.0) -> Dict:
        """
        Dimensiona número de leitos necessários.

        Método 1 - Portaria 1.631/2015:
        Leitos = (Pop × Taxa_internação/1000 × TMP) / (365 × Taxa_ocupação)

        Método 2 - Erlang-C (probabilístico):
        Encontrar c tal que P(espera) < limiar e W_q < meta

        Parâmetros:
            taxa_internacao_por_mil: internações/ano por 1.000 hab (Brasil: ~50)
            tmp_dias: tempo médio de permanência em dias
            meta_ocupacao: taxa de ocupação alvo (0.80-0.90)
            meta_espera_max_horas: tempo máximo aceitável de espera

        "Dimensionar leitos: a pergunta de R$ 1 bilhão.
         Leito demais = dinheiro jogado fora.
         Leito de menos = gente morrendo no corredor.
         O equilíbrio é matemático, não político."
        """
        # Método 1: Determinístico (Portaria)
        internacoes_ano = populacao * taxa_internacao_por_mil / 1000
        leitos_deterministico = int(np.ceil(
            (internacoes_ano * tmp_dias) / (365 * meta_ocupacao)
        ))

        # Método 2: Erlang-C
        lambda_dia = internacoes_ano / 365
        mu_dia = 1 / tmp_dias

        # Busca binária do número mínimo de leitos
        leitos_erlang = int(np.ceil(lambda_dia / mu_dia)) + 1
        meta_espera_dias = meta_espera_max_horas / 24

        for c in range(leitos_erlang, leitos_erlang * 3):
            resultado = self.erlang_c(lambda_dia, mu_dia, c)
            if resultado.get("estavel", False):
                if (resultado["probabilidade_espera"] < 0.05 and
                        resultado["tempo_medio_fila_dias"] < meta_espera_dias):
                    leitos_erlang = c
                    break

        # Distribuição por tipo (Portaria 1.631/2015)
        leitos_recomendados = max(leitos_deterministico, leitos_erlang)

        return {
            "populacao": populacao,
            "internacoes_estimadas_ano": round(internacoes_ano),
            "metodo_deterministico": {
                "leitos": leitos_deterministico,
                "formula": "Pop × Taxa/1000 × TMP / (365 × Ocupação)"
            },
            "metodo_erlang_c": {
                "leitos": leitos_erlang,
                "probabilidade_espera": resultado.get("probabilidade_espera", 0),
                "tempo_fila_horas": round(resultado.get("tempo_medio_fila_dias", 0) * 24, 1)
            },
            "recomendacao_final": leitos_recomendados,
            "distribuicao_recomendada": {
                "clinicos": int(round(leitos_recomendados * 0.60)),
                "cirurgicos": int(round(leitos_recomendados * 0.15)),
                "obstetricos": int(round(leitos_recomendados * 0.10)),
                "pediatricos": int(round(leitos_recomendados * 0.10)),
                "uti": int(round(leitos_recomendados * 0.05)),
            },
            "parametros": {
                "taxa_internacao_por_mil": taxa_internacao_por_mil,
                "tmp_dias": tmp_dias,
                "meta_ocupacao": meta_ocupacao,
                "meta_espera_max_horas": meta_espera_max_horas
            }
        }

    def simular_ocupacao_monte_carlo(self, lambda_chegada: float,
                                       mu_servico: float, c_leitos: int,
                                       dias: int = 365,
                                       n_simulacoes: int = 1000,
                                       seed: int = 42) -> Dict:
        """
        Simulação de Monte Carlo da ocupação hospitalar.

        Simula chegadas (Poisson) e permanências (Exponencial)
        para estimar distribuição de ocupação.

        "Monte Carlo: quando a fórmula não basta.
         Simular 1000 cenários e ver o que acontece.
         Qual a chance de lotar em julho?
         Monte Carlo responde com intervalo de confiança."
        """
        rng = np.random.RandomState(seed)
        ocupacoes_maximas = np.zeros(n_simulacoes)
        dias_lotados = np.zeros(n_simulacoes)

        for sim in range(n_simulacoes):
            ocupacao = np.zeros(dias)
            leitos_ocupados = 0
            # Lista de dias de alta para cada paciente internado
            altas_programadas = []

            for dia in range(dias):
                # Altas do dia
                novas_altas = [a for a in altas_programadas if a <= dia]
                leitos_ocupados -= len(novas_altas)
                altas_programadas = [a for a in altas_programadas if a > dia]

                # Chegadas do dia (Poisson)
                chegadas = rng.poisson(lambda_chegada)

                # Internar quem couber
                internados = min(chegadas, c_leitos - leitos_ocupados)
                leitos_ocupados += internados

                # Programar altas
                for _ in range(internados):
                    permanencia = max(1, int(rng.exponential(1 / mu_servico)))
                    altas_programadas.append(dia + permanencia)

                ocupacao[dia] = leitos_ocupados
                leitos_ocupados = max(0, leitos_ocupados)

            ocupacoes_maximas[sim] = np.max(ocupacao)
            dias_lotados[sim] = np.sum(ocupacao >= c_leitos)

        return {
            "ocupacao_maxima_media": round(float(np.mean(ocupacoes_maximas))),
            "ocupacao_maxima_p95": round(float(np.percentile(ocupacoes_maximas, 95))),
            "dias_lotados_media": round(float(np.mean(dias_lotados)), 1),
            "dias_lotados_p95": round(float(np.percentile(dias_lotados, 95))),
            "probabilidade_lotacao": round(float(np.mean(dias_lotados > 0)), 3),
            "taxa_ocupacao_media": round(float(np.mean(ocupacoes_maximas) / c_leitos), 3),
            "n_simulacoes": n_simulacoes,
            "dias_simulados": dias,
            "leitos": c_leitos
        }

    @staticmethod
    def _fatorial(n: int) -> float:
        """Fatorial com proteção contra overflow."""
        if n <= 1:
            return 1.0
        resultado = 1.0
        for i in range(2, n + 1):
            resultado *= i
        return resultado
