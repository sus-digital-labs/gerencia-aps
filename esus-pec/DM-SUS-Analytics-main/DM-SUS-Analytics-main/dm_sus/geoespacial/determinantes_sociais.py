"""
DM-SUS-Analytics: Análise Geoespacial de Determinantes Sociais
================================================================
Autor: Eduardo Muniz Alves | DM Technology

Módulo de análise geoespacial dos determinantes sociais de saúde:
- Índice de Vulnerabilidade em Saúde (IVS) por território
- Autocorrelação espacial (Moran's I) para clusters de risco
- Kernel Density Estimation (KDE) para mapas de calor
- Análise de correlação entre indicadores sociais e saúde

Referências:
- Dahlgren G, Whitehead M (1991) - Modelo de Determinantes Sociais
- Moran PAP (1950) - Notes on Continuous Stochastic Phenomena
- CNDSS (2008) - Comissão Nacional sobre Determinantes Sociais da Saúde
- IBGE - Índice de Vulnerabilidade Social

"Determinantes sociais: a saúde começa antes do hospital.
 Renda, educação, saneamento, moradia...
 80% da saúde é determinada fora do consultório.
 Tratar doença sem tratar a causa é enxugar gelo."
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class DadosTerritorio:
    """Dados socioeconômicos e de saúde de um território."""
    codigo: str
    nome: str
    latitude: float
    longitude: float
    populacao: int

    # Determinantes socioeconômicos
    renda_per_capita: float = 0.0
    taxa_analfabetismo: float = 0.0  # %
    taxa_desemprego: float = 0.0  # %
    percentual_extrema_pobreza: float = 0.0  # % < R$ 218/mês
    idh_municipal: float = 0.0  # 0-1

    # Determinantes ambientais
    cobertura_agua_tratada: float = 0.0  # %
    cobertura_esgoto: float = 0.0  # %
    cobertura_coleta_lixo: float = 0.0  # %
    domicilios_adequados: float = 0.0  # %

    # Indicadores de saúde
    taxa_mortalidade_infantil: float = 0.0
    cobertura_esf: float = 0.0  # %
    cobertura_vacinal: float = 0.0  # %
    taxa_icsab: float = 0.0  # por 10.000


class CalculadoraIVS:
    """
    Índice de Vulnerabilidade em Saúde (IVS).

    Composto por 3 dimensões (modelo Dahlgren-Whitehead adaptado):
    1. Socioeconômica (40%): renda, educação, emprego
    2. Ambiental/Infraestrutura (30%): saneamento, moradia
    3. Saúde/Acesso (30%): cobertura, mortalidade

    Cada indicador é normalizado (min-max) e ponderado.
    IVS final: 0 (sem vulnerabilidade) a 1 (vulnerabilidade máxima).

    Classificação:
    - Muito baixo: 0.00 - 0.20
    - Baixo: 0.20 - 0.40
    - Médio: 0.40 - 0.60
    - Alto: 0.60 - 0.80
    - Muito alto: 0.80 - 1.00

    "IVS: um número que resume a vulnerabilidade.
     Não é perfeito. Nenhum índice é.
     Mas é melhor que intuição.
     E infinitamente melhor que ignorância."
    """

    # Pesos por dimensão
    PESO_SOCIOECONOMICA = 0.40
    PESO_AMBIENTAL = 0.30
    PESO_SAUDE = 0.30

    def calcular_ivs(self, territorios: List[DadosTerritorio]) -> List[Dict]:
        """
        Calcula o IVS para cada território.

        Normalização min-max:
        - Indicadores onde MAIOR = PIOR: x_norm = (x - min) / (max - min)
        - Indicadores onde MAIOR = MELHOR: x_norm = (max - x) / (max - min)

        "Normalização: colocar tudo na mesma escala.
         Renda em reais, analfabetismo em %, mortalidade em taxa...
         Sem normalizar, é comparar banana com foguete."
        """
        n = len(territorios)
        if n < 2:
            return [{"codigo": t.codigo, "ivs": 0.5, "classificacao": "medio"}
                    for t in territorios]

        # Extrair arrays de indicadores
        indicadores = {
            # Socioeconômicos (maior = pior, exceto renda e IDH)
            "renda": np.array([t.renda_per_capita for t in territorios]),
            "analfabetismo": np.array([t.taxa_analfabetismo for t in territorios]),
            "desemprego": np.array([t.taxa_desemprego for t in territorios]),
            "extrema_pobreza": np.array([t.percentual_extrema_pobreza for t in territorios]),
            "idh": np.array([t.idh_municipal for t in territorios]),
            # Ambientais (maior = melhor)
            "agua": np.array([t.cobertura_agua_tratada for t in territorios]),
            "esgoto": np.array([t.cobertura_esgoto for t in territorios]),
            "lixo": np.array([t.cobertura_coleta_lixo for t in territorios]),
            "moradia": np.array([t.domicilios_adequados for t in territorios]),
            # Saúde (misto)
            "tmi": np.array([t.taxa_mortalidade_infantil for t in territorios]),
            "esf": np.array([t.cobertura_esf for t in territorios]),
            "vacina": np.array([t.cobertura_vacinal for t in territorios]),
            "icsab": np.array([t.taxa_icsab for t in territorios]),
        }

        # Normalizar (0 = bom, 1 = ruim)
        norm = {}
        for nome, arr in indicadores.items():
            vmin, vmax = np.min(arr), np.max(arr)
            rng = max(vmax - vmin, 1e-6)

            if nome in ["renda", "idh", "agua", "esgoto", "lixo",
                        "moradia", "esf", "vacina"]:
                # Maior = melhor → inverter
                norm[nome] = (vmax - arr) / rng
            else:
                # Maior = pior
                norm[nome] = (arr - vmin) / rng

        # Dimensão socioeconômica
        dim_socio = (norm["renda"] * 0.30 + norm["analfabetismo"] * 0.20 +
                     norm["desemprego"] * 0.20 + norm["extrema_pobreza"] * 0.15 +
                     norm["idh"] * 0.15)

        # Dimensão ambiental
        dim_ambiental = (norm["agua"] * 0.30 + norm["esgoto"] * 0.30 +
                         norm["lixo"] * 0.20 + norm["moradia"] * 0.20)

        # Dimensão saúde
        dim_saude = (norm["tmi"] * 0.30 + norm["esf"] * 0.25 +
                     norm["vacina"] * 0.25 + norm["icsab"] * 0.20)

        # IVS composto
        ivs = (dim_socio * self.PESO_SOCIOECONOMICA +
               dim_ambiental * self.PESO_AMBIENTAL +
               dim_saude * self.PESO_SAUDE)

        # Classificar
        resultados = []
        for i, t in enumerate(territorios):
            valor_ivs = float(ivs[i])
            if valor_ivs < 0.20:
                classif = "muito_baixo"
            elif valor_ivs < 0.40:
                classif = "baixo"
            elif valor_ivs < 0.60:
                classif = "medio"
            elif valor_ivs < 0.80:
                classif = "alto"
            else:
                classif = "muito_alto"

            resultados.append({
                "codigo": t.codigo,
                "nome": t.nome,
                "ivs": round(valor_ivs, 4),
                "classificacao": classif,
                "dimensao_socioeconomica": round(float(dim_socio[i]), 4),
                "dimensao_ambiental": round(float(dim_ambiental[i]), 4),
                "dimensao_saude": round(float(dim_saude[i]), 4),
                "populacao": t.populacao
            })

        return resultados


class AnaliseEspacial:
    """
    Análise de autocorrelação espacial.

    Moran's I: mede se valores similares estão agrupados
    espacialmente (cluster) ou dispersos (outlier).

    I = (N / W) × (Σᵢ Σⱼ wᵢⱼ (xᵢ - x̄)(xⱼ - x̄)) / (Σᵢ (xᵢ - x̄)²)

    Onde:
    - N = número de unidades espaciais
    - wᵢⱼ = peso espacial (1/distância ou vizinhança)
    - W = soma de todos os pesos
    - x̄ = média dos valores

    Interpretação:
    - I > 0: autocorrelação positiva (clusters)
    - I ≈ 0: distribuição aleatória
    - I < 0: autocorrelação negativa (dispersão)

    "Moran's I: a matemática dos vizinhos.
     Se um bairro pobre está cercado de bairros pobres,
     isso não é coincidência. É padrão espacial.
     E padrões espaciais exigem políticas espaciais."
    """

    def calcular_moran_i(self, valores: np.ndarray,
                           coordenadas: np.ndarray,
                           tipo_peso: str = "inversa_distancia") -> Dict:
        """
        Calcula o Índice de Moran I global.

        Parâmetros:
            valores: array de valores do indicador
            coordenadas: array (N, 2) com lat/lon
            tipo_peso: "inversa_distancia" ou "vizinhos_k"

        Teste de significância via permutação (999 permutações).

        "Moran's I global: o resumo em um número.
         Mas cuidado: pode haver clusters locais
         mesmo quando o global diz 'aleatório'.
         Por isso existe o LISA (Moran local)."
        """
        N = len(valores)
        if N < 5:
            return {"erro": "Mínimo 5 unidades espaciais"}

        x_bar = np.mean(valores)
        desvios = valores - x_bar

        # Matriz de pesos espaciais
        W = self._calcular_pesos(coordenadas, tipo_peso)

        # Moran's I
        numerador = N * np.sum(W * np.outer(desvios, desvios))
        denominador = np.sum(W) * np.sum(desvios ** 2)

        if abs(denominador) < 1e-10:
            return {"moran_i": 0, "significativo": False}

        I = numerador / denominador

        # Valor esperado sob hipótese nula
        E_I = -1 / (N - 1)

        # Teste de significância por permutação
        n_permutacoes = 999
        I_permutados = np.zeros(n_permutacoes)

        rng = np.random.RandomState(42)
        for p in range(n_permutacoes):
            perm = rng.permutation(valores)
            dev_perm = perm - np.mean(perm)
            num_p = N * np.sum(W * np.outer(dev_perm, dev_perm))
            den_p = np.sum(W) * np.sum(dev_perm ** 2)
            I_permutados[p] = num_p / max(abs(den_p), 1e-10)

        # p-valor (bilateral)
        p_valor = np.mean(np.abs(I_permutados) >= np.abs(I))

        # Classificação
        if I > E_I and p_valor < 0.05:
            padrao = "clusterizado"
        elif I < E_I and p_valor < 0.05:
            padrao = "disperso"
        else:
            padrao = "aleatorio"

        return {
            "moran_i": round(float(I), 4),
            "esperado": round(float(E_I), 4),
            "p_valor": round(float(p_valor), 4),
            "significativo": p_valor < 0.05,
            "padrao_espacial": padrao,
            "n_unidades": N,
            "n_permutacoes": n_permutacoes
        }

    def moran_local_lisa(self, valores: np.ndarray,
                           coordenadas: np.ndarray) -> List[Dict]:
        """
        LISA (Local Indicators of Spatial Association).

        Iᵢ = (xᵢ - x̄) / s² × Σⱼ wᵢⱼ (xⱼ - x̄)

        Classifica cada unidade em:
        - Alto-Alto (HH): valor alto cercado de altos → cluster quente
        - Baixo-Baixo (LL): valor baixo cercado de baixos → cluster frio
        - Alto-Baixo (HL): valor alto cercado de baixos → outlier
        - Baixo-Alto (LH): valor baixo cercado de altos → outlier

        "LISA: o mapa que mostra onde estão os problemas.
         HH = cluster de miséria. LL = cluster de riqueza.
         HL e LH = anomalias. Cada um pede uma política diferente.
         O prefeito que não olha LISA governa no escuro."
        """
        N = len(valores)
        x_bar = np.mean(valores)
        s2 = np.var(valores)

        if s2 < 1e-10:
            return [{"codigo": i, "lisa": 0, "tipo": "nao_significativo"}
                    for i in range(N)]

        W = self._calcular_pesos(coordenadas, "inversa_distancia")
        desvios = valores - x_bar

        resultados = []
        for i in range(N):
            # Moran local
            lag_espacial = np.sum(W[i, :] * desvios) / max(np.sum(W[i, :]), 1e-10)
            I_local = (desvios[i] / s2) * lag_espacial

            # Classificação no diagrama de espalhamento de Moran
            if desvios[i] > 0 and lag_espacial > 0:
                tipo = "alto_alto"  # HH - cluster quente
            elif desvios[i] < 0 and lag_espacial < 0:
                tipo = "baixo_baixo"  # LL - cluster frio
            elif desvios[i] > 0 and lag_espacial < 0:
                tipo = "alto_baixo"  # HL - outlier
            elif desvios[i] < 0 and lag_espacial > 0:
                tipo = "baixo_alto"  # LH - outlier
            else:
                tipo = "nao_significativo"

            resultados.append({
                "indice": i,
                "lisa": round(float(I_local), 4),
                "tipo": tipo,
                "valor": float(valores[i]),
                "lag_espacial": round(float(lag_espacial), 4)
            })

        return resultados

    def kernel_density(self, pontos: np.ndarray,
                        grid_size: int = 50,
                        bandwidth: float = 0.01) -> Dict:
        """
        Kernel Density Estimation (KDE) para mapas de calor.

        f̂(x) = (1/nh) × Σᵢ K((x - xᵢ)/h)

        Kernel Gaussiano: K(u) = (1/√2π) × exp(-u²/2)

        "KDE: transformar pontos em superfície.
         Cada caso de dengue é um ponto no mapa.
         KDE transforma em mapa de calor contínuo.
         Onde está vermelho, está o problema."
        """
        if pontos.ndim != 2 or pontos.shape[1] != 2:
            raise ValueError("Pontos devem ser array (N, 2)")

        lat_min, lat_max = np.min(pontos[:, 0]), np.max(pontos[:, 0])
        lon_min, lon_max = np.min(pontos[:, 1]), np.max(pontos[:, 1])

        # Grid
        lat_grid = np.linspace(lat_min - bandwidth, lat_max + bandwidth, grid_size)
        lon_grid = np.linspace(lon_min - bandwidth, lon_max + bandwidth, grid_size)
        LAT, LON = np.meshgrid(lat_grid, lon_grid)

        # KDE com kernel gaussiano
        densidade = np.zeros_like(LAT)
        n = len(pontos)

        for i in range(n):
            dlat = (LAT - pontos[i, 0]) / bandwidth
            dlon = (LON - pontos[i, 1]) / bandwidth
            densidade += np.exp(-0.5 * (dlat**2 + dlon**2))

        densidade /= (n * bandwidth * 2 * np.pi)

        # Normalizar para 0-1
        d_max = np.max(densidade)
        if d_max > 0:
            densidade_norm = densidade / d_max
        else:
            densidade_norm = densidade

        return {
            "grid_lat": lat_grid.tolist(),
            "grid_lon": lon_grid.tolist(),
            "densidade": densidade_norm.tolist(),
            "densidade_maxima": float(d_max),
            "n_pontos": n,
            "bandwidth": bandwidth,
            "grid_size": grid_size
        }

    @staticmethod
    def _calcular_pesos(coordenadas: np.ndarray,
                         tipo: str = "inversa_distancia") -> np.ndarray:
        """Calcula matriz de pesos espaciais."""
        N = len(coordenadas)
        W = np.zeros((N, N))

        for i in range(N):
            for j in range(N):
                if i != j:
                    d = np.sqrt(np.sum((coordenadas[i] - coordenadas[j]) ** 2))
                    W[i, j] = 1 / max(d, 1e-6)

        # Normalizar por linha (row-standardization)
        row_sums = W.sum(axis=1, keepdims=True)
        row_sums[row_sums == 0] = 1
        W = W / row_sums

        return W
