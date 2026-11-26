# Complementos oficiais para CVAT5 e CVAT6

Na página **Vínculos e Acompanhamento Territorial**, use **Importar complementos JSON** para carregar dados por CNES, INE e competência. O arquivo usa o esquema `sus-analytics-web.cvat-complements.v1` e tem limite de 512 KiB. O perfil local guarda os complementos em `/run/b360/complementos.json`. O cache identifica a versão do arquivo.

## Dados de origem

| Métrica | Origem necessária |
| --- | --- |
| CVAT5 | Quantidades agregadas e deduplicadas de pessoas acompanhadas nos quatro estratos. A fonte cobre PBF e BPC na competência de referência. |
| CVAT6 | Nota final da exportação do Siaps por INE, ou os quatro meses de PBF/BPC, cadastro e vínculo conciliados, parâmetro IBGE/SCNES e totais de atendimentos e avaliações do Meu SUS Digital. |

Use dados agregados autorizados do mesmo recorte. Uma contagem igual a zero deve vir de uma fonte fechada. As exportações detalhadas ficam no módulo [Transferência de Arquivos do Siaps](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/transferencia-arquivos/).

O CSV público de **Cofinanciamento da APS** serve à distribuição municipal por classificação. Importe o CSV de Vínculo e Acompanhamento Territorial ou o combinado com Qualidade em **Importar CSV público**. Esses relatórios agrupam equipes e são exibidos por tipo de equipe e quadrimestre. [Painel público do Siaps](https://siaps.saude.gov.br/publico/painel-avaliacao-quadrimestre)

## Esquema

O objeto raiz contém `schema` e `records`. Cada registro contém `cnes` com sete dígitos, `ine` com dez dígitos, `month` no formato AAAA-MM e pelo menos um dos objetos seguintes.

- `benefits` contém `coverage` igual a `PBF_E_BPC`, `withoutPriority`, `demographicOnly`, `benefitOnly`, `both` e `source`. As contagens pertencem a estratos disjuntos de pessoas acompanhadas.
- `consolidation` contém `referencePopulation`, `individualOnly`, `individualAndHousehold`, `attendanceCount`, `evaluations`, `tieGroups`, `registrySource`, `populationSource` e `satisfactionSource`. Os totais cadastrais devem refletir o resultado da atribuição de equipe pelos critérios oficiais.
- `publishedFinal` contém `system` igual a `SIAPS`, `score` entre 0 e 10 e `source`. Use a nota da exportação por equipe, com `month` apontando abril, agosto ou dezembro do quadrimestre correspondente.
- Cada referência de fonte contém `authority`, `document` e `coveredThrough` no formato AAAA-MM-DD. A cobertura deve alcançar o fim da competência.
- Cada item de `tieGroups` contém `persons`, a quantidade de pessoas que compartilham o mesmo conjunto de evidências, e `candidates`, a lista de equipes candidatas. Cada candidata contém `cnes`, `ine`, `careContacts`, `lastCare` e `registrationDate`. Use `lastCare: null` quando `careContacts` é zero. Use a lista vazia quando a fonte reconciliada confirma ausência de disputa. Empates exatos bloqueiam o escore.

A apuração local de CVAT1 a CVAT4 usa a população vinculada identificada no PEC. A consolidação de CVAT6 usa as fontes agregadas reconciliadas e segue os quadrimestres de janeiro a abril, maio a agosto e setembro a dezembro.

[Portaria SAPS/MS 161/2024](https://bvsms.saude.gov.br/bvs/saudelegis/saps/2024/prt0161_20_12_2024.html) · [NT 30/2025](https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/notas-tecnicas/2025/nota-tecnica-no-30-2025-cgesco-desco-saps-ms.pdf) · [NT 08/2026](https://sisaps.saude.gov.br/sistemas/siaps/assets/files/NT_08-2025_cvat-8638ee08a7310014262c2326c234d35a.pdf)
