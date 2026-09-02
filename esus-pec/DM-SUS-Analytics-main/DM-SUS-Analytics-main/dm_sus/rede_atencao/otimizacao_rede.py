"""
DM-SUS-Analytics: Otimização de Rede de Atenção Básica
=======================================================
Autor: Eduardo Muniz Alves | DM Technology

Módulo de otimização da rede de UBS e equipes ESF:
- Localização ótima de novas UBS (problema de p-mediana)
- Balanceamento de carga entre equipes ESF
- Análise de acessibilidade geográfica (isócronas)
- Dimensionamento de equipes por complexidade territorial

Referências:
- Portaria nº 2.436/2017 (PNAB)
- PMAQ-AB (Programa de Melhoria do Acesso e da Qualidade)
- Daskin MS (2013) - Network and Discrete Location
- Church R, ReVelle C (1974) - Maximal Covering Location Problem

"Rede de Atenção Básica: onde colocar as UBS?
 Não é achismo. É programação matemática.
 O lugar certo pode reduzir 30% do tempo de
 deslocamento da população. Geometria que cura."
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class PontoGeografico:
    """Coordenada geográfica com metadados."""
    latitude: float
    longitude: float
    nome: str = ""
    populacao: int = 0
    tipo: str = ""  # "ubs", "centroide_setor", "hospital"


@dataclass
class UBS:
    """Unidade Básica de Saúde."""
    codigo_cnes: str
    nome: str
    localizacao: PontoGeografico
    equipes_esf: int = 0
    populacao_adscrita: int = 0
    capacidade_maxima: int = 12000  # ~3.450 × 3-4 equipes
    possui_saude_bucal: bool = False
    possui_nasf: bool = False
    nota_pmaq: float = 0.0  # 0 a 100


@dataclass
class SetorCensitario:
    """Setor censitário (IBGE) como unidade de demanda."""
    codigo: str
    centroide: PontoGeografico
    populacao: int
    domicilios: int
    renda_media: float = 0.0
    ubs_referencia: Optional[str] = None
    distancia_ubs_km: float = 0.0


class OtimizadorRedeUBS:
    """
    Otimiza localização e dimensionamento de UBS.

    Problema de p-mediana:
    Minimizar: Σᵢ Σⱼ wᵢ × dᵢⱼ × xᵢⱼ
    Sujeito a:
    - Σⱼ xᵢⱼ = 1 ∀i (cada setor atendido por exatamente 1 UBS)
    - Σⱼ yⱼ = p (exatamente p UBS abertas)
    - xᵢⱼ ≤ yⱼ ∀i,j (só atende se aberta)

    Onde:
    - wᵢ = população do setor i (peso)
    - dᵢⱼ = distância do setor i à UBS j
    - xᵢⱼ = 1 se setor i atendido por UBS j
    - yⱼ = 1 se UBS j está aberta

    Resolução: heurística de Teitz-Bart + busca local.

    "p-mediana: o problema de localização mais clássico.
     Minimizar a distância ponderada pela população.
     NP-hard? Sim. Mas heurísticas resolvem bem.
     Melhor que o prefeito escolher no mapa com o dedo."
    """

    @staticmethod
    def distancia_haversine(p1: PontoGeografico,
                             p2: PontoGeografico) -> float:
        """
        Distância geodésica entre dois pontos (fórmula de Haversine).

        d = 2R × arcsin(√(sin²(Δφ/2) + cos(φ₁)cos(φ₂)sin²(Δλ/2)))

        R = 6.371 km (raio médio da Terra)

        Precisão: ~0.5% para distâncias < 1000 km.
        Para o Brasil, mais que suficiente.

        "Haversine: geometria esférica em 3 linhas.
         A Terra não é plana (desculpa, terraplanistas).
         Para distâncias municipais, funciona perfeitamente."
        """
        R = 6371.0  # km

        lat1 = np.radians(p1.latitude)
        lat2 = np.radians(p2.latitude)
        dlat = np.radians(p2.latitude - p1.latitude)
        dlon = np.radians(p2.longitude - p1.longitude)

        a = (np.sin(dlat / 2) ** 2 +
             np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2)
        c = 2 * np.arcsin(np.sqrt(a))

        return R * c

    def calcular_matriz_distancias(self, setores: List[SetorCensitario],
                                     locais_candidatos: List[PontoGeografico]) -> np.ndarray:
        """
        Calcula matriz de distâncias setores × locais candidatos.

        Complexidade: O(n × m) onde n = setores, m = candidatos.

        "Matriz de distâncias: o ingrediente básico.
         Cada célula é a distância de um bairro a uma UBS.
         Sem isso, não tem otimização. É o alicerce."
        """
        n = len(setores)
        m = len(locais_candidatos)
        D = np.zeros((n, m))

        for i, setor in enumerate(setores):
            for j, local in enumerate(locais_candidatos):
                D[i, j] = self.distancia_haversine(setor.centroide, local)

        return D

    def resolver_p_mediana(self, setores: List[SetorCensitario],
                            locais_candidatos: List[PontoGeografico],
                            p: int, max_iter: int = 1000) -> Dict:
        """
        Resolve o problema de p-mediana via heurística gulosa + busca local.

        Fase 1 - Construção gulosa:
        1. Selecionar o local que minimiza a distância total ponderada
        2. Repetir até ter p locais

        Fase 2 - Melhoria por troca (Teitz-Bart):
        1. Para cada local aberto, tentar trocar por cada fechado
        2. Aceitar troca se reduz custo total
        3. Repetir até sem melhoria

        "Heurística gulosa + busca local: não é ótimo global,
         mas é 95-99% do ótimo na prática.
         Para resolver exato precisaria de branch-and-bound,
         e o prefeito não tem paciência pra esperar."
        """
        n = len(setores)
        m = len(locais_candidatos)

        if p > m:
            raise ValueError(f"p ({p}) não pode ser maior que candidatos ({m})")

        # Matriz de distâncias ponderadas pela população
        D = self.calcular_matriz_distancias(setores, locais_candidatos)
        pesos = np.array([s.populacao for s in setores], dtype=float)
        W = D * pesos[:, np.newaxis]  # Distância ponderada

        # Fase 1: Construção gulosa
        abertos = []
        fechados = list(range(m))

        for _ in range(p):
            melhor_j = None
            melhor_custo = float('inf')

            for j in fechados:
                candidatos_abertos = abertos + [j]
                custo = np.sum(np.min(W[:, candidatos_abertos], axis=1))
                if custo < melhor_custo:
                    melhor_custo = custo
                    melhor_j = j

            abertos.append(melhor_j)
            fechados.remove(melhor_j)

        # Fase 2: Busca local (Teitz-Bart)
        melhorou = True
        iteracao = 0
        custo_atual = np.sum(np.min(W[:, abertos], axis=1))

        while melhorou and iteracao < max_iter:
            melhorou = False
            iteracao += 1

            for i_ab, j_aberto in enumerate(abertos):
                for j_fechado in fechados:
                    # Testar troca
                    teste = abertos.copy()
                    teste[i_ab] = j_fechado
                    custo_teste = np.sum(np.min(W[:, teste], axis=1))

                    if custo_teste < custo_atual - 1e-6:
                        fechados.remove(j_fechado)
                        fechados.append(j_aberto)
                        abertos[i_ab] = j_fechado
                        custo_atual = custo_teste
                        melhorou = True
                        break

                if melhorou:
                    break

        # Atribuir setores às UBS mais próximas
        atribuicao = np.argmin(D[:, abertos], axis=1)
        distancias_atribuidas = np.min(D[:, abertos], axis=1)

        # Resultados por UBS
        resultado_ubs = []
        for idx, j in enumerate(abertos):
            setores_atribuidos = np.where(atribuicao == idx)[0]
            pop_total = sum(setores[s].populacao for s in setores_atribuidos)
            dist_media = np.mean(distancias_atribuidas[setores_atribuidos]) if len(setores_atribuidos) > 0 else 0
            equipes_necessarias = int(np.ceil(pop_total / 3450))

            resultado_ubs.append({
                "local": locais_candidatos[j].nome or f"Local_{j}",
                "latitude": locais_candidatos[j].latitude,
                "longitude": locais_candidatos[j].longitude,
                "setores_atendidos": len(setores_atribuidos),
                "populacao_adscrita": pop_total,
                "distancia_media_km": round(dist_media, 2),
                "equipes_esf_necessarias": equipes_necessarias
            })

        return {
            "locais_selecionados": resultado_ubs,
            "custo_total_ponderado": float(custo_atual),
            "distancia_media_geral_km": float(np.mean(distancias_atribuidas)),
            "distancia_maxima_km": float(np.max(distancias_atribuidas)),
            "populacao_coberta": sum(r["populacao_adscrita"] for r in resultado_ubs),
            "iteracoes_busca_local": iteracao,
            "p_ubs": p
        }

    def analisar_acessibilidade(self, setores: List[SetorCensitario],
                                  ubs_existentes: List[UBS],
                                  raio_km: float = 2.0) -> Dict:
        """
        Análise de acessibilidade geográfica à rede de UBS.

        Métricas:
        - % população dentro do raio de cobertura
        - Distância média ponderada por população
        - Índice de Gini de acessibilidade
        - Vazios assistenciais (setores sem UBS no raio)

        Referência: Portaria 2.436/2017 - Cada UBS deve ser
        acessível em até 2 km (área urbana) ou 5 km (rural).

        "Acessibilidade: não adianta ter UBS se ninguém chega.
         2 km parece pouco, mas para idoso, gestante,
         mãe com criança no colo... é uma jornada.
         Mapear vazios é o primeiro passo para corrigi-los."
        """
        pop_total = sum(s.populacao for s in setores)
        pop_coberta = 0
        distancias = []
        vazios = []

        for setor in setores:
            dist_min = float('inf')
            ubs_mais_proxima = None

            for ubs in ubs_existentes:
                d = self.distancia_haversine(setor.centroide, ubs.localizacao)
                if d < dist_min:
                    dist_min = d
                    ubs_mais_proxima = ubs.codigo_cnes

            distancias.append((setor.populacao, dist_min))

            if dist_min <= raio_km:
                pop_coberta += setor.populacao
            else:
                vazios.append({
                    "setor": setor.codigo,
                    "populacao": setor.populacao,
                    "distancia_ubs_mais_proxima_km": round(dist_min, 2),
                    "latitude": setor.centroide.latitude,
                    "longitude": setor.centroide.longitude
                })

        # Distância média ponderada
        dist_ponderada = sum(p * d for p, d in distancias) / max(pop_total, 1)

        # Índice de Gini de acessibilidade
        # Mede desigualdade na distribuição de distâncias
        gini = self._calcular_gini([d for _, d in distancias])

        return {
            "populacao_total": pop_total,
            "populacao_coberta": pop_coberta,
            "cobertura_percentual": round(pop_coberta / max(pop_total, 1) * 100, 1),
            "distancia_media_ponderada_km": round(dist_ponderada, 2),
            "gini_acessibilidade": round(gini, 4),
            "vazios_assistenciais": vazios,
            "total_vazios": len(vazios),
            "populacao_descoberta": pop_total - pop_coberta,
            "raio_cobertura_km": raio_km
        }

    @staticmethod
    def _calcular_gini(valores: List[float]) -> float:
        """
        Coeficiente de Gini.

        G = (2 × Σᵢ i × xᵢ) / (n × Σᵢ xᵢ) - (n + 1) / n

        0 = igualdade perfeita, 1 = desigualdade máxima.

        "Gini: o indicador da desigualdade.
         Gini de renda todo mundo conhece.
         Gini de acesso à saúde? Poucos calculam.
         Mas deviam. A desigualdade mata."
        """
        if not valores or len(valores) < 2:
            return 0.0

        arr = np.sort(np.array(valores, dtype=float))
        n = len(arr)
        soma = np.sum(arr)

        if soma == 0:
            return 0.0

        indices = np.arange(1, n + 1)
        gini = (2 * np.sum(indices * arr)) / (n * soma) - (n + 1) / n

        return max(0.0, min(1.0, gini))


class BalanceadorCarga:
    """
    Balanceamento de carga entre equipes ESF.

    Problema: distribuir a população entre equipes de forma
    que nenhuma fique sobrecarregada.

    Cada equipe ESF deve ter entre 2.000 e 3.500 pessoas
    (Portaria 2.436/2017). Ideal: ~3.000.

    "Balanceamento: democracia na saúde.
     Se uma equipe tem 5.000 e outra tem 1.500,
     algo está muito errado. Redistribuir é justiça."
    """

    def balancear_equipes(self, setores: List[SetorCensitario],
                           n_equipes: int,
                           capacidade_ideal: int = 3000) -> Dict:
        """
        Balanceia setores entre equipes minimizando desvio da capacidade ideal.

        Algoritmo: bin packing com first-fit decreasing adaptado.
        1. Ordenar setores por população (decrescente)
        2. Atribuir cada setor à equipe mais vazia
        3. Refinar com busca local

        "Bin packing: encaixar peças no espaço.
         Cada equipe é uma 'caixa' de 3.000 vagas.
         Cada setor é uma 'peça' com N pessoas.
         Minimizar o desperdício. Tetris da saúde."
        """
        n = len(setores)
        equipes = [{"setores": [], "populacao": 0} for _ in range(n_equipes)]

        # Ordenar setores por população (decrescente)
        indices_ordenados = sorted(range(n), key=lambda i: setores[i].populacao, reverse=True)

        # First-fit decreasing
        for idx in indices_ordenados:
            # Atribuir à equipe com menor população
            equipe_min = min(range(n_equipes), key=lambda e: equipes[e]["populacao"])
            equipes[equipe_min]["setores"].append(idx)
            equipes[equipe_min]["populacao"] += setores[idx].populacao

        # Métricas
        populacoes = [e["populacao"] for e in equipes]
        desvio_padrao = float(np.std(populacoes))
        coef_variacao = desvio_padrao / max(np.mean(populacoes), 1)

        resultado_equipes = []
        for i, eq in enumerate(equipes):
            carga = eq["populacao"] / capacidade_ideal
            if carga > 1.15:
                status = "sobrecarregada"
            elif carga < 0.6:
                status = "subutilizada"
            else:
                status = "adequada"

            resultado_equipes.append({
                "equipe": i + 1,
                "setores": [setores[s].codigo for s in eq["setores"]],
                "populacao": eq["populacao"],
                "carga_relativa": round(carga, 2),
                "status": status
            })

        return {
            "equipes": resultado_equipes,
            "populacao_media": round(float(np.mean(populacoes))),
            "desvio_padrao": round(desvio_padrao),
            "coeficiente_variacao": round(coef_variacao, 3),
            "equipes_sobrecarregadas": sum(1 for e in resultado_equipes if e["status"] == "sobrecarregada"),
            "equipes_subutilizadas": sum(1 for e in resultado_equipes if e["status"] == "subutilizada"),
            "equipes_adequadas": sum(1 for e in resultado_equipes if e["status"] == "adequada"),
        }
