# Auditoria de intake — tabela consolidada Saúde Brasil 360

> **Data da auditoria:** 2026-07-26
> **Decisão:** `REJECTED_AS_CANONICAL_SOURCE`
> **Uso permitido:** pista de pesquisa, sempre revalidada contra a fonte oficial
> **Entrada:** `pasted-text.txt` recebido como “Tabela Consolidada para Implementação e Auditoria dos Indicadores Saúde Brasil 360”
> **SHA-256 da entrada:** `adf92fba7397e39134b0358b102a9d1f41231e0d689ac6633253139a58e35d6d`

## Autoridade preservada

A entrada não substitui:

1. `docs/10-indicators/b360-rust-authority-matrix.json`, que define o estado
   reproduzível dos 21 cálculos;
2. `docs/11-indicator-field-catalog/sources/official-source-manifest-2026-07-25.json`,
   que fixa documentos oficiais, versões e hashes;
3. as regras versionadas compiladas em `Apps/rules/b360-rules/rules`;
4. resultados, goldens, dual-runs e auditorias persistidos no PostgreSQL.

Nenhuma afirmação do intake pode alterar regra, source contract, golden,
read model, BFF, feature flag ou autoridade clínica sem atravessar novamente
todos esses contratos.

## Colisões semânticas encontradas

| Rótulo recebido | Conteúdo da linha | Classificação correta | Decisão |
|---|---|---|---|
| `C1` | Cobertura populacional estimada de APS da PAS 2026 | Meta de planejamento, fora dos 21 códigos operacionais | não importar |
| `C2` | Cobertura populacional estimada de saúde bucal da PAS 2026 | Meta de planejamento, fora dos 21 códigos operacionais | não importar |
| `C7` | Gestantes com seis consultas de pré-natal | Meta da PAS/Rede Alyne, não é o C7 do motor | não importar |
| `C1` | Dimensão Cadastro do Vínculo e Acompanhamento Territorial | Agregação de regras `CVAT1`–`CVAT3`, não indicador C1 | decompor e revalidar |
| `C2` | Dimensão Acompanhamento do Vínculo e Acompanhamento Territorial | Agregação de `CVAT4`–`CVAT6`, não indicador C2 | decompor e revalidar |
| `C.1`–`C.7` | Indicadores de qualidade eSF/eAP | Candidatos a `C1`–`C7` | usar apenas como pista |
| `B.1`–`B.2` | Indicadores de saúde bucal | Candidatos a `B1`–`B2` | usar apenas como pista |

O intake repete os códigos literais `C1` e `C2` duas vezes com significados
incompatíveis. Também não fornece linhas equivalentes para `B3`–`B6`, `M1`,
`M2` e `CVAT1`–`CVAT6`. Portanto, ele não representa a matriz dos 21 cálculos.

## Problemas de proveniência

- As referências `[1]`–`[8]` não possuem URL, data de obtenção, página,
  versão ou SHA-256.
- Há mistura de fontes oficiais, material estadual, apresentação, consultoria
  privada e documento interno.
- Termos como “tabelas prováveis”, “não informado” e recomendações de produto
  aparecem na mesma superfície que regras declaradas oficiais.
- Algumas linhas usam normas gerais como se comprovassem numerador,
  denominador, CBO, SIGTAP, janela e exclusões específicos.
- Recomendações operacionais — alertas, busca ativa, capacitação ou integração
  com outros sistemas — não são fórmula clínica e não podem entrar no motor.

## Gates para reaproveitar uma afirmação

Uma célula do intake só pode migrar para o manifesto oficial quando houver:

1. código não ambíguo dentro de `B1`–`B6`, `C1`–`C7`, `M1`–`M2` ou
   `CVAT1`–`CVAT6`;
2. documento primário do Ministério da Saúde/SIAPS identificado por URL,
   número SEI quando existente, data, páginas e SHA-256;
3. versão de regra Rust distinta quando a semântica normativa mudar;
4. numerador, denominador, janela, escopo, equipes, CBOs, modelos e exclusões
   extraídos literalmente ou derivados de forma revisável;
5. mapeamento tipado para campos reais do DW, sem depender de nomes
   “prováveis”;
6. snapshot fechado, tombstones completos, linhagem e freshness comprovados;
7. golden clínico real do mesmo escopo/snapshot, dual-run agregado e aprovação
   humana antes de qualquer promoção.

## Estado real confrontado em 2026-07-26

- source Rust e resultado persistido: `21/21`;
- autoridade ativa e comprovada: somente `M1` e `M2`;
- `B3`, `B5` e `B6`: resultado `READY`, golden real e dual-run `MATCH`, mas
  auditoria `BLOCKED`;
- bloqueio comum de `B3`, `B5` e `B6`:
  `DENTAL_LINKAGE_EVIDENCE_MISSING` e
  `SOURCE_TEAM_ELIGIBILITY_INCOMPLETE`;
- autoridade odontológica observada: eSB homologada, 40h, SCNES/e-Gestor
  presentes, porém sem artefato oficial que prove o vínculo
  eSB→eSF/eAP;
- `C1` e `C2`: sem golden e sem dual-run, mantendo `BLOCKED_BY_SOURCE`.

O próximo lote continua sendo `B3/B5/B6`, mas somente após a obtenção do
artefato oficial de vínculo de equipe. CNES compartilhado, produção, distância
entre INEs ou associação local não substituem essa prova.

## Segundo intake — alegada matriz auditável de 50 fontes

> **Entrada:** `pasted-text.txt` recebido como “Matriz de Evidência Auditável
> (50 fontes)”
> **SHA-256 da entrada:**
> `54c3aa05387c982b4394ec50a533544723df1a44884f119feb46bbb389568fad`
> **Decisão:** `RESEARCH_CATALOG_ONLY`

A separação entre fontes oficiais, internas e secundárias é útil como
taxonomia de pesquisa, mas a entrada não é uma matriz de evidência auditável
nem comprova “50 artefatos mapeados no DW”.

### Falhas impeditivas

- diversas referências usam URLs truncadas, nomes de portais, “Não extraída”
  ou “Acesso Web” em lugar de um endereço resolvível;
- a maioria dos binários não possui bytes, SHA-256, data de recuperação,
  snapshot arquivado ou inspeção de assinatura;
- CRC de documento SEI não substitui SHA-256 dos bytes obtidos nem prova que
  o conteúdo efetivamente recuperado é o documento citado;
- páginas web dinâmicas não têm captura versionada, hash do conteúdo nem
  identificação do trecho que sustenta uma regra;
- o item 08 é projeto de lei em tramitação e não pode ser autoridade
  normativa vigente;
- o item 05 descreve C1 de eCR e não pode substituir a Nota Metodológica C1
  de eSF/eAP já fixada pelo SEI `0054814890`;
- manuais antigos, notícias, vídeos, trabalhos acadêmicos, consultorias e
  código comunitário podem orientar pesquisa, mas não definir fórmula,
  elegibilidade, glosa ou cutover;
- documentos internos comprovam decisões de implementação somente quando
  vinculados a arquivo e commit; não são autoridade clínica oficial;
- o item 50 é texto colado não versionado e não pode receber “Git Hash da
  Branch” retroativamente;
- não existe relação verificável entre cada fonte e os códigos exatos
  `B1`–`B6`, `C1`–`C7`, `M1`–`M2` e `CVAT1`–`CVAT6`, nem indicação de páginas,
  regra, versão, campo do DW e resultado da validação.

### Classes aceitas para futura triagem

| Classe | Exigência | Uso permitido |
|---|---|---|
| `A_OFFICIAL_FROZEN` | binário oficial, URL direta, páginas, bytes, SHA-256 e data de obtenção | candidato a autoridade normativa |
| `B_OFFICIAL_DYNAMIC` | página oficial capturada, conteúdo versionado e trecho aplicável | contexto; regra apenas se a metodologia estiver explícita |
| `C_INTERNAL_EVIDENCE` | arquivo do repositório e commit imutável | arquitetura, implementação e operação |
| `D_SECONDARY` | proveniência identificada, sem autoridade ministerial | descoberta e triangulação |

Somente os documentos `A_OFFICIAL_FROZEN` já presentes em
`official-source-manifest-2026-07-25.json` continuam canônicos. A nova entrada
não foi copiada para o README nem para o manifesto, pois isso daria aparência
de validação a referências ainda não verificadas.

## Resultado do intake

`NO_RULE_CHANGE`, `NO_SOURCE_CONTRACT_CHANGE`, `NO_GOLDEN_REGISTRATION`,
`NO_AUTHORITY_PROMOTION`.

O conteúdo útil foi preservado apenas como roteiro de investigação. A matriz
canônica e os bloqueios fail-closed permanecem inalterados.
