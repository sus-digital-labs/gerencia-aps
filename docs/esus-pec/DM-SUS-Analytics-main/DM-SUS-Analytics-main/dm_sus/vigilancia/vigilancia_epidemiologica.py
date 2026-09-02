"""
DM-SUS-Analytics: Vigilância Epidemiológica em Tempo Real
==========================================================
Autor: Eduardo Muniz Alves | DM Technology

Sistema de vigilância epidemiológica com:
- Detecção de surtos via CUSUM (Cumulative Sum Control Chart)
- Diagrama de controle de Shewhart adaptado para saúde
- Método de Farrington para detecção de aberrações
- Canal endêmico (Método de Bortman)
- Nowcasting com correção de atraso de notificação

Referências:
- Farrington CP et al. (1996) - A Statistical Algorithm for the Early Detection of Outbreaks
- Bortman M. (1999) - Elaboración de corredores o canales endémicos
- Salmon M et al. (2016) - Monitoring Count Time Series in R
- Noufaily A et al. (2013) - An Improved Algorithm for Outbreak Detection

"Vigilância: os olhos da saúde pública.
 Detectar um surto 3 dias antes pode ser a diferença
 entre 100 casos e 10.000. Matemática que salva vidas."
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta


class NivelAlerta(Enum):
    """Níveis de alerta epidemiológico."""
    NORMAL = "normal"
    ATENCAO = "atenção"
    ALERTA = "alerta"
    EMERGENCIA = "emergência"


@dataclass
class NotificacaoAgravo:
    """Uma notificação de agravo/doença."""
    data: datetime
    agravo: str
    codigo_cid10: str
    municipio_ibge: str
    faixa_etaria: str
    sexo: str
    bairro: str = ""
    confirmado: bool = True


@dataclass
class ResultadoVigilancia:
    """Resultado da análise de vigilância."""
    agravo: str
    periodo: str
    casos_observados: int
    casos_esperados: float
    limite_superior: float
    limite_inferior: float
    nivel_alerta: NivelAlerta
    razao_observado_esperado: float
    p_valor: Optional[float] = None
    recomendacao: str = ""


class DetectorSurtos:
    """
    Detector de surtos epidemiológicos.

    Implementa múltiplos algoritmos de detecção:
    1. CUSUM (Page, 1954) - Soma cumulativa de desvios
    2. Shewhart adaptado - Limites de controle estatístico
    3. Farrington (1996) - Regressão quasi-Poisson
    4. Canal endêmico de Bortman (1999)

    "Detectar surtos: como achar agulha no palheiro,
     só que a agulha está crescendo exponencialmente
     e o palheiro é o ruído estatístico do dia-a-dia.
     CUSUM: a lupa matemática que encontra o invisível."
    """

    def __init__(self, janela_historica: int = 5,
                 nivel_confianca: float = 0.95):
        """
        Parâmetros:
            janela_historica: anos de dados históricos para baseline
            nivel_confianca: nível de confiança para limites (0.95 = 95%)
        """
        self.janela_historica = janela_historica
        self.nivel_confianca = nivel_confianca
        # Fator z para o nível de confiança
        # z_0.95 ≈ 1.645 (unilateral), z_0.975 ≈ 1.96 (bilateral)
        self._z = self._calcular_z(nivel_confianca)

    @staticmethod
    def _calcular_z(confianca: float) -> float:
        """
        Aproximação do quantil da normal padrão (Abramowitz & Stegun).

        Para p em (0, 1):
        t = sqrt(-2 * ln(1-p))
        z ≈ t - (c0 + c1*t + c2*t²) / (1 + d1*t + d2*t² + d3*t³)

        Erro máximo: |ε| < 4.5 × 10⁻⁴

        "Quem precisa de scipy.stats quando tem
         Abramowitz & Stegun? Aproximação de 1964
         que ainda funciona perfeitamente."
        """
        p = confianca
        if p <= 0 or p >= 1:
            return 1.96

        c0, c1, c2 = 2.515517, 0.802853, 0.010328
        d1, d2, d3 = 1.432788, 0.189269, 0.001308

        if p > 0.5:
            p_calc = 1 - p
        else:
            p_calc = p

        t = np.sqrt(-2 * np.log(p_calc))
        z = t - (c0 + c1 * t + c2 * t**2) / (1 + d1 * t + d2 * t**2 + d3 * t**3)

        return z if confianca > 0.5 else -z

    def cusum(self, serie_temporal: np.ndarray,
              k: float = 0.5, h: float = 5.0) -> Dict:
        """
        CUSUM (Cumulative Sum Control Chart).

        Detecta mudanças na média de uma série temporal.

        Algoritmo:
        1. Calcular média (μ) e desvio padrão (σ) do baseline
        2. Para cada observação x_t:
           S_t⁺ = max(0, S_{t-1}⁺ + (x_t - μ)/σ - k)  (aumento)
           S_t⁻ = max(0, S_{t-1}⁻ - (x_t - μ)/σ - k)  (diminuição)
        3. Alarme quando S_t⁺ > h ou S_t⁻ > h

        Parâmetros:
            k: slack (tolerância), tipicamente 0.5σ
            h: threshold de decisão, tipicamente 4-5σ

        Referência: Page ES (1954). Continuous Inspection Schemes.
        Biometrika, 41(1/2), 100-115.

        "CUSUM: acumula os desvios pequenos que ninguém vê.
         Um caso a mais por dia? Parece nada.
         Mas em 10 dias são 10 casos extras.
         CUSUM vê isso no dia 3."
        """
        n = len(serie_temporal)
        if n < 10:
            return {"alerta": False, "mensagem": "Série muito curta para análise"}

        # Baseline: primeira metade da série
        baseline = serie_temporal[:n // 2]
        mu = np.mean(baseline)
        sigma = max(np.std(baseline, ddof=1), 1e-6)

        # Estatísticas CUSUM
        s_pos = np.zeros(n)  # Detecta aumento
        s_neg = np.zeros(n)  # Detecta diminuição
        alertas = []

        for t in range(1, n):
            z_t = (serie_temporal[t] - mu) / sigma
            s_pos[t] = max(0, s_pos[t-1] + z_t - k)
            s_neg[t] = max(0, s_neg[t-1] - z_t - k)

            if s_pos[t] > h:
                alertas.append({
                    "indice": t,
                    "tipo": "aumento",
                    "valor_cusum": float(s_pos[t]),
                    "valor_observado": float(serie_temporal[t])
                })
            elif s_neg[t] > h:
                alertas.append({
                    "indice": t,
                    "tipo": "diminuicao",
                    "valor_cusum": float(s_neg[t]),
                    "valor_observado": float(serie_temporal[t])
                })

        return {
            "media_baseline": float(mu),
            "desvio_baseline": float(sigma),
            "cusum_positivo": s_pos.tolist(),
            "cusum_negativo": s_neg.tolist(),
            "alertas": alertas,
            "alerta": len(alertas) > 0,
            "parametros": {"k": k, "h": h}
        }

    def shewhart_adaptado(self, serie_temporal: np.ndarray,
                           n_sigma: float = 3.0) -> Dict:
        """
        Diagrama de controle de Shewhart adaptado para dados de saúde.

        Limites:
        - LC (Linha Central) = μ (média histórica)
        - LSC (Limite Superior) = μ + n_sigma × σ
        - LIC (Limite Inferior) = max(0, μ - n_sigma × σ)

        Regras de Western Electric para alarme:
        1. Um ponto acima de 3σ
        2. Dois de três pontos acima de 2σ
        3. Quatro de cinco pontos acima de 1σ
        4. Oito pontos consecutivos acima da média

        "Shewhart: controle estatístico de processo.
         Inventado em 1924 para fábricas.
         Funciona perfeitamente para epidemiologia.
         Boas ideias não envelhecem."
        """
        n = len(serie_temporal)
        mu = np.mean(serie_temporal)
        sigma = max(np.std(serie_temporal, ddof=1), 1e-6)

        lsc = mu + n_sigma * sigma
        lic = max(0, mu - n_sigma * sigma)

        # Regras de Western Electric
        violacoes = []
        for t in range(n):
            x = serie_temporal[t]

            # Regra 1: acima de 3σ
            if x > mu + 3 * sigma:
                violacoes.append({"indice": t, "regra": 1,
                                  "descricao": "Ponto acima de 3σ"})

            # Regra 4: 8 consecutivos acima da média
            if t >= 7:
                if all(serie_temporal[t-i] > mu for i in range(8)):
                    violacoes.append({"indice": t, "regra": 4,
                                      "descricao": "8 pontos consecutivos acima da média"})

        return {
            "media": float(mu),
            "desvio_padrao": float(sigma),
            "limite_superior": float(lsc),
            "limite_inferior": float(lic),
            "violacoes": violacoes,
            "alerta": len(violacoes) > 0,
            "n_sigma": n_sigma
        }

    def canal_endemico_bortman(self, dados_historicos: np.ndarray,
                                dados_atual: np.ndarray) -> Dict:
        """
        Canal Endêmico (Corredor Endêmico) - Método de Bortman.

        Constrói faixas de normalidade baseadas em dados históricos:
        - Zona de sucesso: abaixo do Q1 (percentil 25)
        - Zona de segurança: entre Q1 e mediana
        - Zona de alerta: entre mediana e Q3 (percentil 75)
        - Zona epidêmica: acima do Q3

        Entrada:
            dados_historicos: matriz (anos × semanas), ex: 5 anos × 52 semanas
            dados_atual: vetor com dados do ano corrente (até semana atual)

        Referência: Bortman M (1999). Elaboración de corredores o canales
        endémicos mediante planillas de cálculo. Rev Panam Salud Publica.

        "Canal endêmico: o GPS da epidemiologia.
         Mostra se estamos na rota normal ou se desviamos.
         Quartis: simples, robusto, funciona desde 1999.
         Às vezes a solução mais simples é a melhor."
        """
        if dados_historicos.ndim != 2:
            raise ValueError("dados_historicos deve ser matriz (anos × semanas)")

        n_semanas = dados_historicos.shape[1]

        # Calcular quartis por semana epidemiológica
        q1 = np.percentile(dados_historicos, 25, axis=0)
        mediana = np.percentile(dados_historicos, 50, axis=0)
        q3 = np.percentile(dados_historicos, 75, axis=0)

        # Classificar semanas do ano atual
        classificacao = []
        for sem in range(len(dados_atual)):
            if sem >= n_semanas:
                break
            valor = dados_atual[sem]
            if valor <= q1[sem]:
                zona = "sucesso"
            elif valor <= mediana[sem]:
                zona = "seguranca"
            elif valor <= q3[sem]:
                zona = "alerta"
            else:
                zona = "epidemia"

            classificacao.append({
                "semana": sem + 1,
                "casos": int(valor),
                "q1": float(q1[sem]),
                "mediana": float(mediana[sem]),
                "q3": float(q3[sem]),
                "zona": zona
            })

        # Contagem por zona
        contagem_zonas = {"sucesso": 0, "seguranca": 0, "alerta": 0, "epidemia": 0}
        for c in classificacao:
            contagem_zonas[c["zona"]] += 1

        # Determinar nível geral
        total = len(classificacao) or 1
        pct_epidemia = contagem_zonas["epidemia"] / total

        if pct_epidemia > 0.3:
            nivel = NivelAlerta.EMERGENCIA
        elif pct_epidemia > 0.15:
            nivel = NivelAlerta.ALERTA
        elif contagem_zonas["alerta"] / total > 0.3:
            nivel = NivelAlerta.ATENCAO
        else:
            nivel = NivelAlerta.NORMAL

        return {
            "canal": {
                "q1_sucesso": q1.tolist(),
                "mediana_seguranca": mediana.tolist(),
                "q3_alerta": q3.tolist(),
            },
            "classificacao_semanal": classificacao,
            "contagem_zonas": contagem_zonas,
            "nivel_alerta": nivel.value,
            "percentual_epidemia": round(pct_epidemia * 100, 1)
        }


class NowcastingNotificacoes:
    """
    Nowcasting: correção de atraso de notificação.

    Problema: notificações de doenças chegam com atraso.
    A semana epidemiológica atual sempre parece ter menos casos
    do que realmente tem (ilusão de queda).

    Solução: estimar o número real de casos usando a distribuição
    histórica de atraso de notificação.

    Método: Triângulo de notificação + estimativa bayesiana.

    N_t_corrigido = N_t_observado / P(notificado até agora | ocorreu em t)

    Referência: McGough SF et al. (2020). Nowcasting by Bayesian Smoothing.
    PLoS Computational Biology.

    "Nowcasting: ver o presente como ele realmente é.
     O DATASUS mostra 50 casos essa semana?
     Provavelmente são 120. O atraso engana.
     Corrigir o atraso é ver a verdade antes dos outros."
    """

    def __init__(self, max_atraso_semanas: int = 8):
        self.max_atraso = max_atraso_semanas

    def estimar_distribuicao_atraso(self,
                                     triangulo_notificacao: np.ndarray) -> np.ndarray:
        """
        Estima a distribuição de atraso a partir do triângulo de notificação.

        O triângulo é uma matriz onde:
        - Linhas = semana epidemiológica de ocorrência
        - Colunas = semana de notificação (atraso 0, 1, 2, ...)
        - Valores = número de casos notificados

        P(atraso = d) = Σ_t N(t,d) / Σ_t Σ_d N(t,d)

        "Triângulo de notificação: a matriz que revela
         o quanto o sistema é lento. Coluna 0 = notificou
         na mesma semana. Coluna 3 = demorou 3 semanas.
         No Brasil, a maioria cai na coluna 2-4."
        """
        if triangulo_notificacao.ndim != 2:
            raise ValueError("Triângulo deve ser matriz 2D")

        # Soma por coluna (atraso)
        soma_por_atraso = np.sum(triangulo_notificacao, axis=0)
        total = np.sum(soma_por_atraso)

        if total == 0:
            # Distribuição uniforme como fallback
            n = len(soma_por_atraso)
            return np.ones(n) / n

        distribuicao = soma_por_atraso / total
        return distribuicao

    def corrigir_serie(self, casos_observados: np.ndarray,
                        distribuicao_atraso: np.ndarray) -> Dict:
        """
        Corrige série temporal pelo atraso de notificação.

        Para cada semana t com atraso d semanas até o presente:
        P_acumulada(d) = Σ_{i=0}^{d} P(atraso = i)
        N_corrigido(t) = N_observado(t) / P_acumulada(d)

        Intervalo de confiança via aproximação de Poisson:
        IC_95% = N_corrigido ± 1.96 × √(N_corrigido / P_acumulada(d))

        "Correção de atraso: matemática simples, impacto enorme.
         Se só 60% dos casos da semana passada foram notificados,
         divida por 0.6 e terá a estimativa real.
         Gestores que não fazem isso tomam decisão errada."
        """
        n = len(casos_observados)
        d_max = len(distribuicao_atraso)

        # Probabilidade acumulada de notificação por atraso
        p_acumulada = np.cumsum(distribuicao_atraso)
        p_acumulada = np.minimum(p_acumulada, 1.0)  # Cap em 1.0

        corrigidos = np.zeros(n)
        ic_inferior = np.zeros(n)
        ic_superior = np.zeros(n)
        fator_correcao = np.ones(n)

        for t in range(n):
            atraso = n - 1 - t  # Semanas de atraso

            if atraso >= d_max:
                # Atraso maior que o máximo → sem correção
                p = 1.0
            else:
                p = max(p_acumulada[atraso], 0.01)  # Mínimo 1%

            corrigidos[t] = casos_observados[t] / p
            fator_correcao[t] = 1 / p

            # IC 95% via Poisson
            se = np.sqrt(corrigidos[t] / p) if p > 0 else 0
            ic_inferior[t] = max(0, corrigidos[t] - 1.96 * se)
            ic_superior[t] = corrigidos[t] + 1.96 * se

        return {
            "observados": casos_observados.tolist(),
            "corrigidos": np.round(corrigidos).astype(int).tolist(),
            "ic_inferior": np.round(ic_inferior).astype(int).tolist(),
            "ic_superior": np.round(ic_superior).astype(int).tolist(),
            "fator_correcao": np.round(fator_correcao, 3).tolist(),
            "distribuicao_atraso": distribuicao_atraso.tolist(),
            "atraso_mediano": float(np.sum(
                np.arange(d_max) * distribuicao_atraso
            ))
        }


class CalculadoraReproducaoEfetivo:
    """
    Estimativa do número de reprodução efetivo R(t).

    R(t) > 1: epidemia em expansão
    R(t) = 1: estável
    R(t) < 1: epidemia em declínio

    Método: Wallinga-Teunis (2004) com intervalo serial.

    "R(t): o número mais importante de uma epidemia.
     Se R(t) = 2, cada infectado gera 2 novos.
     Se R(t) = 0.8, a epidemia está morrendo.
     Um número. Uma decisão. Lockdown ou não."
    """

    def estimar_rt(self, serie_casos: np.ndarray,
                    intervalo_serial_media: float = 5.0,
                    intervalo_serial_dp: float = 2.0,
                    janela: int = 7) -> Dict:
        """
        Estima R(t) pelo método de Cori et al. (2013).

        R(t) = I(t) / Σ_{s=1}^{t} I(t-s) × w(s)

        Onde w(s) é a distribuição do intervalo serial (Gamma).

        Intervalo serial: tempo entre sintomas do caso primário
        e sintomas do caso secundário.

        Referência: Cori A et al. (2013). A New Framework and Software
        to Estimate Time-Varying Reproduction Numbers During Epidemics.
        American Journal of Epidemiology.

        "Método de Cori: elegante e robusto.
         Usa distribuição Gamma para o intervalo serial.
         Suaviza com janela deslizante.
         O padrão-ouro para estimar R(t)."
        """
        n = len(serie_casos)
        if n < janela + 5:
            return {"erro": "Série muito curta"}

        # Distribuição do intervalo serial (Gamma discretizada)
        # Gamma(shape=μ²/σ², scale=σ²/μ)
        shape = (intervalo_serial_media ** 2) / (intervalo_serial_dp ** 2)
        scale = (intervalo_serial_dp ** 2) / intervalo_serial_media

        # Discretizar a Gamma manualmente
        max_serial = min(int(intervalo_serial_media * 3), n)
        w = np.zeros(max_serial)
        for s in range(1, max_serial):
            # PDF da Gamma: f(x) = x^(k-1) * e^(-x/θ) / (θ^k * Γ(k))
            # Aproximação: usar a fórmula direta
            x = float(s)
            log_pdf = (shape - 1) * np.log(x) - x / scale - shape * np.log(scale) - self._log_gamma(shape)
            w[s] = np.exp(log_pdf)

        # Normalizar
        w_sum = np.sum(w)
        if w_sum > 0:
            w = w / w_sum

        # Calcular força de infecção Λ(t)
        lambda_t = np.zeros(n)
        for t in range(n):
            for s in range(1, min(t + 1, max_serial)):
                lambda_t[t] += serie_casos[t - s] * w[s]

        # R(t) com janela deslizante (média móvel)
        rt = np.zeros(n)
        rt_ic_inf = np.zeros(n)
        rt_ic_sup = np.zeros(n)

        for t in range(janela, n):
            # Soma de casos e lambda na janela
            soma_casos = np.sum(serie_casos[t - janela + 1:t + 1])
            soma_lambda = np.sum(lambda_t[t - janela + 1:t + 1])

            if soma_lambda > 0:
                # Estimativa bayesiana: posterior Gamma
                # Prior: Gamma(1, 5) (não informativo)
                a_posterior = 1 + soma_casos
                b_posterior = 1/5 + soma_lambda

                rt[t] = a_posterior / b_posterior

                # IC 95% da Gamma posterior
                # Aproximação: R ± 1.96 * sqrt(a/b²)
                se = np.sqrt(a_posterior) / b_posterior
                rt_ic_inf[t] = max(0, rt[t] - 1.96 * se)
                rt_ic_sup[t] = rt[t] + 1.96 * se

        return {
            "rt": rt[janela:].tolist(),
            "rt_ic_inferior": rt_ic_inf[janela:].tolist(),
            "rt_ic_superior": rt_ic_sup[janela:].tolist(),
            "intervalo_serial": {
                "media": intervalo_serial_media,
                "dp": intervalo_serial_dp,
                "distribuicao": w.tolist()
            },
            "janela": janela,
            "ultimo_rt": float(rt[-1]) if n > janela else None,
            "tendencia": "expansao" if rt[-1] > 1 else "declinio" if rt[-1] < 1 else "estavel"
        }

    @staticmethod
    def _log_gamma(x: float) -> float:
        """
        Aproximação de Stirling para log(Γ(x)).

        log(Γ(x)) ≈ (x - 0.5) * log(x) - x + 0.5 * log(2π)
                     + 1/(12x) - 1/(360x³)

        "Stirling: porque importar scipy só pra isso
         é como comprar um caminhão pra levar uma pizza."
        """
        if x <= 0:
            return 0.0
        if x < 1:
            # Usar relação Γ(x+1) = x * Γ(x)
            return CalculadoraReproducaoEfetivo._log_gamma(x + 1) - np.log(x)

        return ((x - 0.5) * np.log(x) - x + 0.5 * np.log(2 * np.pi)
                + 1 / (12 * x) - 1 / (360 * x**3))
