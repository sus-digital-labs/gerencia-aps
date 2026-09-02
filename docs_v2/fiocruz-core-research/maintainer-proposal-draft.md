# Maintainer Proposal Draft

Durante a análise para implementação do C1 - Mais Acesso, identifiquei etapas comuns de contexto, metodologia e resultado que podem ser reutilizadas por outros indicadores. A nota vigente exige granularidade INE, competência mensal, tipos específicos de demanda, CBO elegíveis e equipes eSF/eAP. A extração atual de Atendimento Individual ainda não materializa todos os campos necessários para provar esse contrato.

Antes de implementar o cálculo, proponho alinharmos quais campos e códigos das versões PEC suportadas representam tipo de demanda, profissional, INE/CNES e vigência/tipo da equipe. Com esse contrato confirmado, posso preparar uma abordagem pequena e compatível com o fluxo atual: fixture sintética, golden tests, período explícito, metodologia versionada e resultado estruturado, usando o C1 como primeiro consumidor. Os indicadores existentes permaneceriam intactos e a adoção seria incremental.

Perguntas objetivas para alinhamento:

1. Quais versões do PEC devem ser suportadas pelo novo contrato?
2. O upstream considera o campo/chave de `tb_dim_tipo_atendimento` a fonte canônica para os seis tipos do C1?
3. Qual é a regra preferida para denominador zero: `NO_DATA` com valor nulo ou outra representação?
4. A ampliação da extração e o cálculo C1 devem vir na mesma PR ou em duas unidades coerentes?

