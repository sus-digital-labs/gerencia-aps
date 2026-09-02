# Registro de pesquisa externa — Saúde Brasil 360 / Siaps

**Data da consulta:** 2026-08-26  
**Finalidade:** preservar as fontes externas usadas na atualização documental.

## Fontes e achados

| Fonte | Achado utilizado |
|---|---|
| [Índice de Notas Metodológicas do Siaps](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/) | Lista a Nota Técnica nº 08/2026, CVAT, C1–C7, B1–B6, M1–M2, P1–P6, CR1–CR4 e R1–R6. Registra a existência de materiais descontinuados. |
| [Apresentação do Manual do Siaps](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/inerte/visao-geral) | Afirma que o Siaps foi instituído pela Portaria GM/MS nº 7.639, de 18/07/2025, e apresenta Componentes Fixo, Vínculo e Acompanhamento Territorial e Qualidade. |
| [Nota Técnica nº 08/2026](https://sisaps.saude.gov.br/sistemas/siaps/assets/files/NT_08-2025_cvat-8638ee08a7310014262c2326c234d35a.pdf) | Resultados mensais servem ao monitoramento; resultados quadrimestrais são a média dos meses; a Nota Final do Componente III usa pesos; C2/C3 têm tratamento especial para meses sem encerramento de coorte. Revoga a Nota Técnica nº 06/2025. |
| [Nota Metodológica C1](https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c1-mais-acesso/view) | Define C1 como a relação entre atendimentos de demanda programada e o total de atendimentos, com registros do Atendimento Individual e CBOs elegíveis. |
| [Página temática eSF/eAP](https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia) | Publicada em 23/05/2025 e atualizada em 30/09/2025; lista C1–C7, publicados em 23/09/2025. |
| [Página temática eSB](https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-saude-bucal) | Publicada em 23/05/2025 e atualizada em 23/09/2025; lista B1–B6, publicados em 15/05/2026. |
| [Página temática eMulti](https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipes-multiprofissionais-emulti) | Publicada em 23/05/2025 e atualizada em 23/09/2025; lista M1–M2, publicados em 01/07/2026. |
| [Nota Técnica nº 12/2025](https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NT_12-2025_criterio_validacao_dados_siaps-0394bed57dc6efcddaa83dab337f9533.pdf) | Dados enviados por versões liberadas há mais de 12 meses são invalidados; o critério passa a valer a partir de 01/01/2026. Integrações LEDI também devem usar versões compatíveis. |
| [Nota Informativa nº 13/2025](https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NI_13-2025_cenario_versoes_incompativeis-90647909abe17697641f1a44b859e48a.pdf) | Em dados de setembro/2025, 652 municípios enviaram 136.462 registros via CDS Offline; 67 municípios enviaram 728.128 registros em versões 5.3.19 ou anteriores. CDS Offline e versões antigas tinham prazos de aceitação encerrados entre dezembro/2025 e 2026, conforme a tabela da nota. |
| [Notas da versão e-SUS APS 5.5.24](https://sisaps.saude.gov.br/sistemas/esusaps/docs/Versoes/versao_5_5) | Versão 5.5.24 publicada em 03/08/2026. Inclui mudanças no Cadastro Individual, priorização do CPF, identificação domiciliar e territorial, vacinação, CBO e módulos de acompanhamento. |
| [Calendário Siaps 2026](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/calendario-siaps/) | Envio mensal até o décimo dia útil do mês seguinte; calendário oficial apresenta as datas de janeiro a dezembro de 2026. |
| [Notícias oficiais do Siaps](https://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026/julho/siaps-atualizacao-do-sistema-de-informacoes-da-atencao-primaria-amplia-busca-por-perfil-territorial-de-saude) | Em 17/07/2026, o Ministério da Saúde comunicou atualização dos relatórios públicos com filtros de perfil territorial e populacional e recortes dos modelos de informação da APS. |

## Correções documentais derivadas

A cronologia do Siaps deve indicar sua instituição pela Portaria GM/MS nº 7.639, de 18/07/2025. Se algum texto disser que a instituição ocorreu em junho de 2025, deve ser corrigido; uma eventual atividade anterior deve ser descrita como preparação, anúncio ou transição, não como instituição jurídica do sistema.

O C1 não deve ser calculado com proxy enquanto o schema de `tb_fat_atendimento_individual` não expuser o tipo de demanda exigido pela nota metodológica. A ausência do campo foi registrada como achado do schema auditado do projeto, não como afirmação do Ministério da Saúde.

Os números de municípios e registros da Nota Informativa nº 13/2025 são um retrato da competência setembro/2025. Não devem ser apresentados como fotografia nacional de agosto/2026 sem nova extração oficial.

## Observação metodológica

As fontes externas sustentam contexto, regra, periodicidade e compatibilidade. O status de execução do produto depende de evidência interna do schema, dos testes e do runtime. Fonte oficial e runtime não são equivalentes.
