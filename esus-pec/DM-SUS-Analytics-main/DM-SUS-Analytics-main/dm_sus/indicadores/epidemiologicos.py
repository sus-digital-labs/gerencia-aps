"""
DM-SUS-Analytics: Indicadores Epidemiológicos
===============================================
Autor: Eduardo Muniz Alves | DM Technology

Implementa cálculo de indicadores de saúde conforme
metodologia do Ministério da Saúde / DATASUS / RIPSA:

Mortalidade:
- Taxa de mortalidade geral (TMG)
- Taxa de mortalidade infantil (TMI)
- Taxa de mortalidade materna (TMM)
- Mortalidade proporcional por causa (Curva de Nelson de Moraes)
- Anos Potenciais de Vida Perdidos (APVP)

Morbidade:
- Taxa de incidência
- Taxa de prevalência
- Taxa de letalidade
- Razão de mortalidade padronizada (SMR)

Atenção Básica:
- Cobertura da Estratégia Saúde da Família (ESF)
- Cobertura vacinal por imunobiológico
- Taxa de internações por condições sensíveis à atenção básica (ICSAB)

"Indicadores: os sinais vitais de uma cidade.
 Assim como um médico mede pressão e temperatura,
 nós medimos mortalidade infantil e cobertura vacinal.
 Números que contam histórias de vida e morte."
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class FaixaEtaria(Enum):
    """Faixas etárias padrão do DATASUS."""
    MENOR_1 = "< 1 ano"
    DE_1_A_4 = "1-4 anos"
    DE_5_A_9 = "5-9 anos"
    DE_10_A_14 = "10-14 anos"
    DE_15_A_19 = "15-19 anos"
    DE_20_A_29 = "20-29 anos"
    DE_30_A_39 = "30-39 anos"
    DE_40_A_49 = "40-49 anos"
    DE_50_A_59 = "50-59 anos"
    DE_60_A_69 = "60-69 anos"
    DE_70_A_79 = "70-79 anos"
    MAIS_80 = "80+ anos"


class GrupoCID10(Enum):
    """Grupos de causa de óbito (CID-10 simplificado)."""
    INFECCIOSAS = "I - Doenças infecciosas e parasitárias"
    NEOPLASIAS = "II - Neoplasias"
    ENDOCRINAS = "IV - Doenças endócrinas, nutricionais e metabólicas"
    CIRCULATORIAS = "IX - Doenças do aparelho circulatório"
    RESPIRATORIAS = "X - Doenças do aparelho respiratório"
    DIGESTIVAS = "XI - Doenças do aparelho digestivo"
    EXTERNAS = "XX - Causas externas de morbidade e mortalidade"
    OUTRAS = "Demais causas"


@dataclass
class PopulacaoMunicipal:
    """Dados populacionais de um município."""
    codigo_ibge: str
    nome: str
    uf: str
    populacao_total: int
    populacao_por_faixa: Dict[str, int] = field(default_factory=dict)
    nascidos_vivos: int = 0
    populacao_feminina_10_49: int = 0  # para TMM

    @property
    def eh_pequeno_porte(self) -> bool:
        """Município de pequeno porte: < 20.000 hab."""
        return self.populacao_total < 20000


@dataclass
class DadosObito:
    """Dados de óbitos para cálculo de indicadores."""
    total_obitos: int
    obitos_menores_1: int = 0
    obitos_neonatais: int = 0       # < 28 dias
    obitos_pos_neonatais: int = 0   # 28 dias a < 1 ano
    obitos_maternos: int = 0
    obitos_por_faixa: Dict[str, int] = field(default_factory=dict)
    obitos_por_causa: Dict[str, int] = field(default_factory=dict)
    obitos_por_icsab: int = 0       # condições sensíveis à AB


@dataclass
class IndicadorSaude:
    """Resultado de um indicador calculado."""
    nome: str
    valor: float
    unidade: str
    interpretacao: str
    classificacao: str  # "bom", "regular", "ruim", "critico"
    referencia_nacional: Optional[float] = None
    meta_ods: Optional[float] = None  # Meta ODS 2030


class CalculadoraMortalidade:
    """
    Calcula indicadores de mortalidade.

    Referências:
    - RIPSA (Rede Interagencial de Informações para a Saúde)
    - Portaria MS/GM nº 3.947/1998
    - ODS 3 (Saúde e Bem-Estar) - Agenda 2030

    "Mortalidade: o indicador mais antigo e mais honesto.
     Não tem como mentir sobre morte. Os números são duros,
     mas necessários. Cada decimal é uma vida."
    """

    def taxa_mortalidade_geral(self, obitos: DadosObito,
                                populacao: PopulacaoMunicipal,
                                periodo_anos: int = 1) -> IndicadorSaude:
        """
        Taxa de Mortalidade Geral (TMG).

        TMG = (Nº de óbitos / População) × 1.000

        Referência Brasil (2022): ~6.5 por 1.000 hab.
        """
        tmg = (obitos.total_obitos / populacao.populacao_total) * 1000 / periodo_anos

        if tmg < 5:
            classif = "bom"
            interp = "Taxa abaixo da média nacional"
        elif tmg < 7:
            classif = "regular"
            interp = "Taxa próxima à média nacional"
        elif tmg < 10:
            classif = "ruim"
            interp = "Taxa acima da média nacional"
        else:
            classif = "critico"
            interp = "Taxa significativamente elevada"

        return IndicadorSaude(
            nome="Taxa de Mortalidade Geral",
            valor=round(tmg, 2),
            unidade="por 1.000 habitantes",
            interpretacao=interp,
            classificacao=classif,
            referencia_nacional=6.5
        )

    def taxa_mortalidade_infantil(self, obitos: DadosObito,
                                    populacao: PopulacaoMunicipal) -> IndicadorSaude:
        """
        Taxa de Mortalidade Infantil (TMI).

        TMI = (Óbitos < 1 ano / Nascidos vivos) × 1.000

        Meta ODS 3.2: reduzir para ≤ 12 por 1.000 NV até 2030.
        Referência Brasil (2022): ~11.9 por 1.000 NV.

        Componentes:
        - Neonatal precoce (0-6 dias): relacionada a assistência ao parto
        - Neonatal tardia (7-27 dias): relacionada a assistência neonatal
        - Pós-neonatal (28-364 dias): relacionada a condições ambientais

        "TMI: o termômetro do desenvolvimento.
         Países ricos: < 5. Brasil: ~12. Nordeste: ~15.
         Cada ponto a menos são centenas de bebês salvos."
        """
        if populacao.nascidos_vivos == 0:
            return IndicadorSaude(
                nome="Taxa de Mortalidade Infantil",
                valor=0, unidade="por 1.000 NV",
                interpretacao="Sem nascidos vivos no período",
                classificacao="indefinido"
            )

        tmi = (obitos.obitos_menores_1 / populacao.nascidos_vivos) * 1000

        if tmi <= 12:
            classif = "bom"
            interp = "Dentro da meta ODS 2030 (≤ 12/1.000 NV)"
        elif tmi <= 20:
            classif = "regular"
            interp = "Acima da meta ODS, requer atenção"
        elif tmi <= 30:
            classif = "ruim"
            interp = "Taxa elevada, intervenção necessária"
        else:
            classif = "critico"
            interp = "Taxa crítica, emergência em saúde materno-infantil"

        return IndicadorSaude(
            nome="Taxa de Mortalidade Infantil",
            valor=round(tmi, 2),
            unidade="por 1.000 nascidos vivos",
            interpretacao=interp,
            classificacao=classif,
            referencia_nacional=11.9,
            meta_ods=12.0
        )

    def taxa_mortalidade_materna(self, obitos: DadosObito,
                                   populacao: PopulacaoMunicipal) -> IndicadorSaude:
        """
        Razão de Mortalidade Materna (RMM).

        RMM = (Óbitos maternos / Nascidos vivos) × 100.000

        Meta ODS 3.1: reduzir para < 70 por 100.000 NV até 2030.
        Referência Brasil (2022): ~55 por 100.000 NV.

        "RMM: nenhuma mulher deveria morrer por dar à luz.
         Em 2024, ainda acontece. Este indicador mede
         a qualidade da assistência obstétrica.
         Cada caso é uma tragédia evitável."
        """
        if populacao.nascidos_vivos == 0:
            return IndicadorSaude(
                nome="Razão de Mortalidade Materna",
                valor=0, unidade="por 100.000 NV",
                interpretacao="Sem nascidos vivos no período",
                classificacao="indefinido"
            )

        rmm = (obitos.obitos_maternos / populacao.nascidos_vivos) * 100000

        if rmm < 30:
            classif = "bom"
            interp = "Abaixo da meta ODS 2030"
        elif rmm < 70:
            classif = "regular"
            interp = "Dentro da meta ODS, mas requer vigilância"
        elif rmm < 140:
            classif = "ruim"
            interp = "Acima da meta ODS, intervenção necessária"
        else:
            classif = "critico"
            interp = "Taxa crítica, emergência obstétrica"

        return IndicadorSaude(
            nome="Razão de Mortalidade Materna",
            valor=round(rmm, 2),
            unidade="por 100.000 nascidos vivos",
            interpretacao=interp,
            classificacao=classif,
            referencia_nacional=55.0,
            meta_ods=70.0
        )

    def apvp(self, obitos_por_idade: Dict[int, int],
              idade_limite: int = 70) -> IndicadorSaude:
        """
        Anos Potenciais de Vida Perdidos (APVP).

        APVP = Σ (idade_limite - idade_obito) para cada óbito com idade < limite

        Mede mortalidade prematura. Prioriza óbitos em idades jovens.

        "APVP: quanto tempo de vida foi roubado.
         Um óbito aos 20 anos pesa mais que aos 65.
         Não é que uma vida valha mais que outra.
         É que uma teve mais anos roubados."
        """
        total_apvp = 0
        for idade, n_obitos in obitos_por_idade.items():
            if idade < idade_limite:
                total_apvp += (idade_limite - idade) * n_obitos

        return IndicadorSaude(
            nome="Anos Potenciais de Vida Perdidos",
            valor=total_apvp,
            unidade="anos",
            interpretacao=f"Total de {total_apvp} anos de vida perdidos prematuramente",
            classificacao="informativo"
        )

    def mortalidade_proporcional_por_causa(self, obitos: DadosObito) -> Dict[str, float]:
        """
        Mortalidade proporcional por grupo de causas.

        MP_i = (Óbitos pela causa i / Total de óbitos) × 100

        Permite construir a Curva de Nelson de Moraes:
        - Nível I (subdesenvolvido): predomínio de infecciosas
        - Nível IV (desenvolvido): predomínio de circulatórias/neoplasias

        "Curva de Nelson de Moraes: o raio-X do desenvolvimento.
         Países pobres morrem de infecção. Países ricos morrem
         de infarto e câncer. O perfil de mortalidade conta
         a história socioeconômica de um lugar."
        """
        proporcoes = {}
        total = obitos.total_obitos

        if total == 0:
            return proporcoes

        for causa, n in obitos.obitos_por_causa.items():
            proporcoes[causa] = round((n / total) * 100, 2)

        return proporcoes


class CalculadoraAtencaoBasica:
    """
    Indicadores de Atenção Básica / Atenção Primária à Saúde.

    "Atenção Básica: a porta de entrada do SUS.
     Se funciona bem, o hospital não lota.
     Se funciona mal, o hospital colapsa.
     Prevenir é melhor (e mais barato) que remediar."
    """

    def cobertura_esf(self, equipes_esf: int,
                       populacao: PopulacaoMunicipal) -> IndicadorSaude:
        """
        Cobertura da Estratégia Saúde da Família (ESF).

        Cobertura = (Nº equipes × 3.450 / População) × 100

        Cada equipe ESF cobre ~3.450 pessoas (Portaria 2.436/2017).
        Meta: 100% de cobertura.

        "ESF: uma equipe, um território, 3.450 vidas.
         Médico, enfermeiro, técnico e agentes comunitários.
         A base do SUS. Quando funciona, é lindo."
        """
        cobertura = (equipes_esf * 3450 / populacao.populacao_total) * 100
        cobertura = min(cobertura, 100)  # Cap em 100%

        if cobertura >= 80:
            classif = "bom"
            interp = "Cobertura adequada"
        elif cobertura >= 60:
            classif = "regular"
            interp = "Cobertura parcial, expansão necessária"
        elif cobertura >= 40:
            classif = "ruim"
            interp = "Cobertura insuficiente"
        else:
            classif = "critico"
            interp = "Cobertura crítica, população desassistida"

        return IndicadorSaude(
            nome="Cobertura ESF",
            valor=round(cobertura, 1),
            unidade="%",
            interpretacao=interp,
            classificacao=classif
        )

    def cobertura_vacinal(self, doses_aplicadas: int,
                           populacao_alvo: int,
                           meta: float = 95.0) -> IndicadorSaude:
        """
        Cobertura vacinal por imunobiológico.

        CV = (Doses aplicadas / População-alvo) × 100

        Meta PNI (Programa Nacional de Imunizações):
        - Maioria dos imunobiológicos: ≥ 95%
        - BCG: ≥ 90%

        "Vacina: a intervenção de saúde pública mais
         custo-efetiva da história. Cada 1% de queda
         na cobertura abre brecha para surtos.
         Sarampo voltou por causa disso."
        """
        if populacao_alvo == 0:
            return IndicadorSaude(
                nome="Cobertura Vacinal", valor=0, unidade="%",
                interpretacao="População-alvo não definida",
                classificacao="indefinido"
            )

        cv = (doses_aplicadas / populacao_alvo) * 100

        if cv >= meta:
            classif = "bom"
            interp = f"Meta de {meta}% atingida"
        elif cv >= meta * 0.9:
            classif = "regular"
            interp = f"Próximo da meta ({meta}%), intensificar busca ativa"
        elif cv >= meta * 0.7:
            classif = "ruim"
            interp = "Cobertura insuficiente, risco de surtos"
        else:
            classif = "critico"
            interp = "Cobertura crítica, população vulnerável"

        return IndicadorSaude(
            nome="Cobertura Vacinal",
            valor=round(cv, 1),
            unidade="%",
            interpretacao=interp,
            classificacao=classif
        )

    def taxa_icsab(self, internacoes_icsab: int,
                    populacao: PopulacaoMunicipal) -> IndicadorSaude:
        """
        Taxa de Internações por Condições Sensíveis à Atenção Básica.

        ICSAB = (Internações por CSAB / População) × 10.000

        Lista de CSAB (Portaria SAS/MS nº 221/2008):
        - Diabetes, hipertensão, asma, pneumonia bacteriana
        - Gastroenterites, infecções urinárias, anemia
        - Doenças preveníveis por vacinação

        Taxa alta = Atenção Básica falha (não resolve, hospital resolve).

        "ICSAB: o indicador que envergonha.
         Se alguém interna por diabetes descompensado,
         é porque a UBS falhou em acompanhar.
         Cada internação evitável custa R$ 1.000+ ao SUS."
        """
        taxa = (internacoes_icsab / populacao.populacao_total) * 10000

        if taxa < 100:
            classif = "bom"
            interp = "AB resolutiva, poucas internações evitáveis"
        elif taxa < 200:
            classif = "regular"
            interp = "Taxa moderada, melhorar acompanhamento crônico"
        elif taxa < 300:
            classif = "ruim"
            interp = "Taxa elevada, AB com baixa resolutividade"
        else:
            classif = "critico"
            interp = "Taxa crítica, AB não está cumprindo seu papel"

        return IndicadorSaude(
            nome="Taxa de ICSAB",
            valor=round(taxa, 1),
            unidade="por 10.000 habitantes",
            interpretacao=interp,
            classificacao=classif
        )


class OtimizadorRecursos:
    """
    Otimização de alocação de recursos em saúde pública.

    Problema: dado um orçamento limitado, como distribuir
    recursos entre UBS, equipes ESF, vacinas, etc. para
    maximizar o impacto em saúde?

    Método: programação linear simplificada.
    Maximizar: Σ impacto_i × recurso_i
    Sujeito a: Σ custo_i × recurso_i ≤ orçamento

    "Otimização: a matemática da escassez.
     O SUS nunca tem dinheiro suficiente.
     Mas pode usar o que tem da melhor forma possível.
     Programação linear: fazer mais com menos."
    """

    @staticmethod
    def alocar_equipes_esf(populacao: int, orcamento: float,
                            custo_equipe_mensal: float = 45000.0) -> Dict:
        """
        Calcula número ótimo de equipes ESF dado orçamento.

        Cada equipe ESF:
        - Cobre ~3.450 pessoas
        - Custo médio: ~R$ 45.000/mês (MS + contrapartida municipal)
        - Composição: 1 médico, 1 enfermeiro, 1 técnico, 4-6 ACS

        "Alocar equipes: quantas equipes o dinheiro compra?
         E quantas a população precisa?
         O mínimo dos dois é a resposta realista."
        """
        equipes_necessarias = int(np.ceil(populacao / 3450))
        equipes_possiveis = int(orcamento / (custo_equipe_mensal * 12))

        equipes_alocadas = min(equipes_necessarias, equipes_possiveis)
        cobertura = (equipes_alocadas * 3450 / populacao) * 100

        return {
            "equipes_necessarias": equipes_necessarias,
            "equipes_possiveis_orcamento": equipes_possiveis,
            "equipes_alocadas": equipes_alocadas,
            "cobertura_estimada": round(min(cobertura, 100), 1),
            "custo_anual": equipes_alocadas * custo_equipe_mensal * 12,
            "deficit_equipes": max(0, equipes_necessarias - equipes_possiveis),
            "orcamento_necessario_100pct": equipes_necessarias * custo_equipe_mensal * 12,
        }

    @staticmethod
    def priorizar_investimentos(indicadores: List[IndicadorSaude]) -> List[Dict]:
        """
        Prioriza áreas de investimento baseado nos indicadores.

        Critério: indicadores classificados como "crítico" ou "ruim"
        têm prioridade máxima.

        "Priorização: onde o dinheiro faz mais diferença?
         Indicador crítico = investimento urgente.
         Indicador bom = manter. Simples assim."
        """
        prioridades = []
        peso_classif = {"critico": 4, "ruim": 3, "regular": 2, "bom": 1, "indefinido": 0, "informativo": 0}

        for ind in indicadores:
            peso = peso_classif.get(ind.classificacao, 0)
            prioridades.append({
                "indicador": ind.nome,
                "valor_atual": ind.valor,
                "unidade": ind.unidade,
                "classificacao": ind.classificacao,
                "prioridade": peso,
                "acao_sugerida": ind.interpretacao,
            })

        # Ordenar por prioridade (maior = mais urgente)
        prioridades.sort(key=lambda x: x["prioridade"], reverse=True)

        return prioridades
