"""
DM-SUS-Analytics: Sistema de Alerta Precoce e Scoring Municipal
=================================================================
Autor: Eduardo Muniz Alves | DM Technology

Sistema integrado de alerta precoce para saúde pública:
- Scoring municipal composto (nota 0-1000)
- Semáforo de saúde com 16 indicadores
- Detecção de tendências via Mann-Kendall
- Geração automática de recomendações por prioridade
- Painel de indicadores ODS 3 (Saúde e Bem-Estar)

Referências:
- ODS 3 - Agenda 2030 (ONU)
- IDSUS (Índice de Desempenho do SUS)
- Mann HB (1945) - Nonparametric Tests Against Trend
- Kendall MG (1975) - Rank Correlation Methods

"Sistema de alerta: o painel de controle do gestor.
 16 indicadores, 4 cores, 1 nota final.
 Verde = tá bom. Vermelho = acorda.
 Simples o suficiente para prefeito entender."
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


class CorSemaforo(Enum):
    """Cores do semáforo de saúde."""
    VERDE = "verde"
    AMARELO = "amarelo"
    LARANJA = "laranja"
    VERMELHO = "vermelho"


class TendenciaSerie(Enum):
    """Tendência de uma série temporal."""
    MELHORA_SIGNIFICATIVA = "melhora_significativa"
    MELHORA_LEVE = "melhora_leve"
    ESTAVEL = "estavel"
    PIORA_LEVE = "piora_leve"
    PIORA_SIGNIFICATIVA = "piora_significativa"


@dataclass
class IndicadorSemaforo:
    """Um indicador no semáforo de saúde."""
    nome: str
    valor: float
    unidade: str
    cor: CorSemaforo
    meta: float
    referencia_nacional: float
    tendencia: TendenciaSerie
    peso: float = 1.0
    dimensao: str = ""
    recomendacao: str = ""


@dataclass
class ScoreMunicipal:
    """Score composto do município."""
    nota_final: float  # 0-1000
    classificacao: str  # A, B, C, D, E
    dimensoes: Dict[str, float] = field(default_factory=dict)
    indicadores: List[IndicadorSemaforo] = field(default_factory=list)
    alertas_criticos: List[str] = field(default_factory=list)
    recomendacoes_prioritarias: List[str] = field(default_factory=list)


class SemaforoSaude:
    """
    Semáforo de Saúde Municipal com 16 indicadores.

    Dimensões (modelo IDSUS adaptado):
    1. ACESSO (25%): cobertura ESF, vacinal, pré-natal, saúde bucal
    2. EFETIVIDADE (25%): TMI, TMM, ICSAB, mortalidade prematura
    3. VIGILÂNCIA (25%): notificação, investigação, surtos, R(t)
    4. GESTÃO (25%): gasto per capita, produtividade, satisfação

    Cada indicador recebe uma cor:
    - VERDE: meta atingida ou superada
    - AMARELO: próximo da meta (80-100%)
    - LARANJA: abaixo da meta (60-80%)
    - VERMELHO: crítico (< 60% da meta)

    "Semáforo: a linguagem universal.
     Todo mundo entende verde, amarelo, vermelho.
     Não precisa de mestrado em epidemiologia.
     O prefeito olha e sabe onde agir."
    """

    # Definição dos 16 indicadores com metas
    INDICADORES_CONFIG = {
        # ACESSO
        "cobertura_esf": {
            "nome": "Cobertura ESF", "meta": 100, "ref_nacional": 76.2,
            "unidade": "%", "dimensao": "acesso", "peso": 1.5,
            "maior_melhor": True
        },
        "cobertura_vacinal": {
            "nome": "Cobertura Vacinal", "meta": 95, "ref_nacional": 78.5,
            "unidade": "%", "dimensao": "acesso", "peso": 1.5,
            "maior_melhor": True
        },
        "cobertura_prenatal": {
            "nome": "Pré-natal ≥ 7 consultas", "meta": 80, "ref_nacional": 65.0,
            "unidade": "%", "dimensao": "acesso", "peso": 1.2,
            "maior_melhor": True
        },
        "cobertura_saude_bucal": {
            "nome": "Cobertura Saúde Bucal", "meta": 80, "ref_nacional": 45.0,
            "unidade": "%", "dimensao": "acesso", "peso": 0.8,
            "maior_melhor": True
        },
        # EFETIVIDADE
        "taxa_mortalidade_infantil": {
            "nome": "Taxa Mortalidade Infantil", "meta": 12, "ref_nacional": 11.9,
            "unidade": "/1.000 NV", "dimensao": "efetividade", "peso": 2.0,
            "maior_melhor": False
        },
        "razao_mortalidade_materna": {
            "nome": "Razão Mortalidade Materna", "meta": 70, "ref_nacional": 55.0,
            "unidade": "/100.000 NV", "dimensao": "efetividade", "peso": 2.0,
            "maior_melhor": False
        },
        "taxa_icsab": {
            "nome": "Taxa ICSAB", "meta": 100, "ref_nacional": 150.0,
            "unidade": "/10.000 hab", "dimensao": "efetividade", "peso": 1.5,
            "maior_melhor": False
        },
        "mortalidade_prematura_dcnt": {
            "nome": "Mortalidade Prematura DCNT", "meta": 200, "ref_nacional": 280.0,
            "unidade": "/100.000 hab", "dimensao": "efetividade", "peso": 1.3,
            "maior_melhor": False
        },
        # VIGILÂNCIA
        "taxa_notificacao_compulsoria": {
            "nome": "Notificação Compulsória", "meta": 90, "ref_nacional": 70.0,
            "unidade": "%", "dimensao": "vigilancia", "peso": 1.2,
            "maior_melhor": True
        },
        "investigacao_obitos_infantis": {
            "nome": "Investigação Óbitos Infantis", "meta": 90, "ref_nacional": 75.0,
            "unidade": "%", "dimensao": "vigilancia", "peso": 1.3,
            "maior_melhor": True
        },
        "tempo_resposta_surtos_dias": {
            "nome": "Tempo Resposta a Surtos", "meta": 2, "ref_nacional": 5.0,
            "unidade": "dias", "dimensao": "vigilancia", "peso": 1.0,
            "maior_melhor": False
        },
        "cobertura_agua_vigilancia": {
            "nome": "Vigilância Qualidade Água", "meta": 100, "ref_nacional": 80.0,
            "unidade": "%", "dimensao": "vigilancia", "peso": 0.8,
            "maior_melhor": True
        },
        # GESTÃO
        "gasto_saude_per_capita": {
            "nome": "Gasto Saúde Per Capita", "meta": 800, "ref_nacional": 650.0,
            "unidade": "R$/hab/ano", "dimensao": "gestao", "peso": 1.0,
            "maior_melhor": True
        },
        "percentual_receita_saude": {
            "nome": "% Receita em Saúde", "meta": 25, "ref_nacional": 22.0,
            "unidade": "%", "dimensao": "gestao", "peso": 0.8,
            "maior_melhor": True
        },
        "consultas_per_capita": {
            "nome": "Consultas Per Capita/Ano", "meta": 3, "ref_nacional": 2.5,
            "unidade": "consultas", "dimensao": "gestao", "peso": 0.7,
            "maior_melhor": True
        },
        "satisfacao_usuario": {
            "nome": "Satisfação do Usuário", "meta": 80, "ref_nacional": 60.0,
            "unidade": "%", "dimensao": "gestao", "peso": 0.5,
            "maior_melhor": True
        },
    }

    def avaliar_municipio(self, dados: Dict[str, float],
                           historico: Optional[Dict[str, np.ndarray]] = None) -> ScoreMunicipal:
        """
        Avalia o município em todos os 16 indicadores.

        Parâmetros:
            dados: dicionário {nome_indicador: valor_atual}
            historico: dicionário {nome_indicador: série_temporal} (opcional)

        "Avaliação: o check-up completo do município.
         16 indicadores, 4 dimensões, 1 nota.
         Não é julgamento. É diagnóstico.
         E diagnóstico é o primeiro passo da cura."
        """
        indicadores = []
        alertas = []
        scores_dimensao = {"acesso": [], "efetividade": [],
                           "vigilancia": [], "gestao": []}

        for chave, config in self.INDICADORES_CONFIG.items():
            valor = dados.get(chave, 0)
            meta = config["meta"]
            maior_melhor = config["maior_melhor"]

            # Calcular cor do semáforo
            cor = self._classificar_cor(valor, meta, maior_melhor)

            # Calcular score normalizado (0-100)
            score = self._calcular_score_indicador(valor, meta, maior_melhor)

            # Tendência (se houver histórico)
            tendencia = TendenciaSerie.ESTAVEL
            if historico and chave in historico:
                tendencia = self._analisar_tendencia_mann_kendall(
                    historico[chave], maior_melhor
                )

            # Recomendação
            recomendacao = self._gerar_recomendacao(chave, valor, meta, cor, maior_melhor)

            indicador = IndicadorSemaforo(
                nome=config["nome"],
                valor=valor,
                unidade=config["unidade"],
                cor=cor,
                meta=meta,
                referencia_nacional=config["ref_nacional"],
                tendencia=tendencia,
                peso=config["peso"],
                dimensao=config["dimensao"],
                recomendacao=recomendacao
            )
            indicadores.append(indicador)
            scores_dimensao[config["dimensao"]].append(score * config["peso"])

            # Alertas críticos
            if cor == CorSemaforo.VERMELHO:
                alertas.append(f"CRÍTICO: {config['nome']} = {valor} {config['unidade']} (meta: {meta})")

        # Score por dimensão (média ponderada)
        dim_scores = {}
        for dim, scores in scores_dimensao.items():
            dim_scores[dim] = float(np.mean(scores)) if scores else 0

        # Score final (0-1000)
        pesos_dim = {"acesso": 0.25, "efetividade": 0.25,
                     "vigilancia": 0.25, "gestao": 0.25}
        nota_final = sum(dim_scores[d] * pesos_dim[d] for d in pesos_dim) * 10

        # Classificação
        if nota_final >= 800:
            classif = "A"
        elif nota_final >= 600:
            classif = "B"
        elif nota_final >= 400:
            classif = "C"
        elif nota_final >= 200:
            classif = "D"
        else:
            classif = "E"

        # Top 5 recomendações prioritárias
        indicadores_ordenados = sorted(indicadores,
                                        key=lambda i: self._prioridade_cor(i.cor),
                                        reverse=True)
        recomendacoes = [i.recomendacao for i in indicadores_ordenados[:5]
                         if i.recomendacao]

        return ScoreMunicipal(
            nota_final=round(nota_final, 1),
            classificacao=classif,
            dimensoes=dim_scores,
            indicadores=indicadores,
            alertas_criticos=alertas,
            recomendacoes_prioritarias=recomendacoes
        )

    def _classificar_cor(self, valor: float, meta: float,
                          maior_melhor: bool) -> CorSemaforo:
        """Classifica a cor do semáforo."""
        if maior_melhor:
            razao = valor / max(meta, 1e-6)
        else:
            razao = meta / max(valor, 1e-6)

        if razao >= 1.0:
            return CorSemaforo.VERDE
        elif razao >= 0.8:
            return CorSemaforo.AMARELO
        elif razao >= 0.6:
            return CorSemaforo.LARANJA
        else:
            return CorSemaforo.VERMELHO

    @staticmethod
    def _calcular_score_indicador(valor: float, meta: float,
                                    maior_melhor: bool) -> float:
        """Score normalizado 0-100."""
        if maior_melhor:
            score = min(100, (valor / max(meta, 1e-6)) * 100)
        else:
            if valor <= 0:
                score = 100
            else:
                score = min(100, (meta / valor) * 100)
        return max(0, score)

    @staticmethod
    def _prioridade_cor(cor: CorSemaforo) -> int:
        """Prioridade numérica por cor."""
        return {CorSemaforo.VERMELHO: 4, CorSemaforo.LARANJA: 3,
                CorSemaforo.AMARELO: 2, CorSemaforo.VERDE: 1}.get(cor, 0)

    def _analisar_tendencia_mann_kendall(self, serie: np.ndarray,
                                          maior_melhor: bool) -> TendenciaSerie:
        """
        Teste de Mann-Kendall para tendência.

        S = Σᵢ<ⱼ sgn(xⱼ - xᵢ)

        Onde sgn(x) = 1 se x > 0, -1 se x < 0, 0 se x = 0.

        Variância: Var(S) = n(n-1)(2n+5)/18

        Z = (S - sgn(S)) / √Var(S)

        "Mann-Kendall: o teste que não liga para distribuição.
         Não-paramétrico. Robusto. Funciona com qualquer dado.
         Detecta tendência mesmo com ruído.
         O favorito dos epidemiologistas."
        """
        n = len(serie)
        if n < 5:
            return TendenciaSerie.ESTAVEL

        # Estatística S
        S = 0
        for i in range(n - 1):
            for j in range(i + 1, n):
                diff = serie[j] - serie[i]
                if diff > 0:
                    S += 1
                elif diff < 0:
                    S -= 1

        # Variância
        var_s = n * (n - 1) * (2 * n + 5) / 18

        # Z-score
        if S > 0:
            z = (S - 1) / max(np.sqrt(var_s), 1e-6)
        elif S < 0:
            z = (S + 1) / max(np.sqrt(var_s), 1e-6)
        else:
            z = 0

        # Interpretar (considerando se maior é melhor ou pior)
        if not maior_melhor:
            z = -z  # Inverter: para TMI, tendência de queda é melhora

        if z > 1.96:
            return TendenciaSerie.MELHORA_SIGNIFICATIVA
        elif z > 1.0:
            return TendenciaSerie.MELHORA_LEVE
        elif z < -1.96:
            return TendenciaSerie.PIORA_SIGNIFICATIVA
        elif z < -1.0:
            return TendenciaSerie.PIORA_LEVE
        else:
            return TendenciaSerie.ESTAVEL

    @staticmethod
    def _gerar_recomendacao(chave: str, valor: float, meta: float,
                              cor: CorSemaforo, maior_melhor: bool) -> str:
        """Gera recomendação baseada no indicador."""
        recomendacoes = {
            "cobertura_esf": "Expandir equipes ESF priorizando áreas descobertas. Cada equipe cobre 3.450 pessoas.",
            "cobertura_vacinal": "Intensificar busca ativa de faltosos. Implementar vacinação em escolas e creches.",
            "cobertura_prenatal": "Fortalecer captação precoce de gestantes. Garantir 1ª consulta até 12ª semana.",
            "cobertura_saude_bucal": "Ampliar equipes de saúde bucal. Priorizar escolares e gestantes.",
            "taxa_mortalidade_infantil": "Fortalecer pré-natal, assistência ao parto e atenção neonatal. Investigar cada óbito.",
            "razao_mortalidade_materna": "Qualificar assistência obstétrica. Garantir leitos UTI materna. Protocolo de emergência.",
            "taxa_icsab": "Melhorar resolutividade da AB. Protocolo de manejo de crônicos. Busca ativa de hipertensos/diabéticos.",
            "mortalidade_prematura_dcnt": "Programa de rastreamento de DCNT. Grupos de caminhada. Controle tabagismo.",
            "taxa_notificacao_compulsoria": "Capacitar profissionais em notificação. Simplificar formulários. Feedback aos notificadores.",
            "investigacao_obitos_infantis": "Comitê de investigação de óbitos ativo. Investigar 100% em até 48h.",
            "tempo_resposta_surtos_dias": "Protocolo de resposta rápida. Equipe de campo dedicada. Kit de coleta pronto.",
            "cobertura_agua_vigilancia": "Ampliar pontos de coleta. Monitorar cloro residual. Parceria com SAAE.",
            "gasto_saude_per_capita": "Revisar execução orçamentária. Captar emendas parlamentares. Consórcios intermunicipais.",
            "percentual_receita_saude": "Mínimo constitucional: 15%. Meta: 25%. Priorizar saúde no PPA/LOA.",
            "consultas_per_capita": "Ampliar oferta de consultas. Teleconsulta para demanda reprimida. Agenda aberta.",
            "satisfacao_usuario": "Pesquisa de satisfação trimestral. Ouvidoria ativa. Humanização do atendimento.",
        }

        if cor in [CorSemaforo.VERDE]:
            return f"Manter: {recomendacoes.get(chave, 'Indicador dentro da meta.')}"
        else:
            return f"AÇÃO: {recomendacoes.get(chave, 'Intervenção necessária.')}"


class GeradorRelatorio:
    """
    Gerador de relatório executivo para gestores.

    Produz um resumo estruturado com:
    - Score geral e classificação
    - Semáforo dos 16 indicadores
    - Top 5 alertas críticos
    - Top 5 recomendações prioritárias
    - Comparativo com referência nacional
    - Tendências (melhora/piora)

    "Relatório: a ponte entre dados e decisão.
     O gestor não quer ver tabela de 500 linhas.
     Quer saber: onde estou? pra onde vou? o que faço?
     3 perguntas. 1 página. Ação imediata."
    """

    def gerar_resumo_executivo(self, score: ScoreMunicipal,
                                 municipio: str) -> Dict:
        """Gera resumo executivo do município."""
        # Contagem por cor
        cores = {"verde": 0, "amarelo": 0, "laranja": 0, "vermelho": 0}
        for ind in score.indicadores:
            cores[ind.cor.value] += 1

        # Indicadores por dimensão
        por_dimensao = {}
        for ind in score.indicadores:
            if ind.dimensao not in por_dimensao:
                por_dimensao[ind.dimensao] = []
            por_dimensao[ind.dimensao].append({
                "nome": ind.nome,
                "valor": ind.valor,
                "unidade": ind.unidade,
                "cor": ind.cor.value,
                "meta": ind.meta,
                "tendencia": ind.tendencia.value
            })

        return {
            "municipio": municipio,
            "data_avaliacao": datetime.now().strftime("%Y-%m-%d"),
            "score": {
                "nota": score.nota_final,
                "classificacao": score.classificacao,
                "descricao": self._descricao_classificacao(score.classificacao)
            },
            "semaforo_resumo": cores,
            "dimensoes": {
                dim: round(val, 1)
                for dim, val in score.dimensoes.items()
            },
            "indicadores_por_dimensao": por_dimensao,
            "alertas_criticos": score.alertas_criticos,
            "recomendacoes_top5": score.recomendacoes_prioritarias,
            "total_indicadores": len(score.indicadores),
            "percentual_verde": round(cores["verde"] / max(len(score.indicadores), 1) * 100, 1)
        }

    @staticmethod
    def _descricao_classificacao(classif: str) -> str:
        """Descrição textual da classificação."""
        descricoes = {
            "A": "Excelente - Município referência em saúde pública",
            "B": "Bom - Maioria dos indicadores dentro da meta",
            "C": "Regular - Necessita melhorias em áreas específicas",
            "D": "Ruim - Múltiplos indicadores abaixo da meta",
            "E": "Crítico - Emergência em saúde pública, intervenção urgente"
        }
        return descricoes.get(classif, "Não classificado")
