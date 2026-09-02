# Source Review Checklist

Use este checklist antes de reutilizar qualquer fonte em regra, backlog ou `ruleVersion`.

## 1. Identificacao minima
- [ ] A fonte e oficial?
- [ ] Orgao emissor identificado.
- [ ] Tipo de fonte classificado no registry.
- [ ] Titulo exato registrado.
- [ ] URL ou caminho rastreavel registrado.
- [ ] Data de publicacao identificada ou marcada como `sem data visivel nesta rodada`.

## 2. Vigencia e hierarquia
- [ ] A fonte esta vigente?
- [ ] Ha evidencia de revogacao, substituicao ou complemento?
- [ ] Existe fonte mais nova no mesmo assunto?
- [ ] A fonte muda governanca/incentivo ou muda formula de calculo?
- [ ] A hierarquia normativa foi entendida (portaria, nota, ficha tecnica, pagina institucional)?

## 3. Escopo do impacto
- [ ] A fonte fala de contexto institucional ou de regra de calculo?
- [ ] Quais indicadores ela afeta?
- [ ] Afeta dominio ESF, ESB, eMulti ou todos?
- [ ] Afeta equipe elegivel, CBO, CNES, INE, unidade ou vinculo territorial?

## 4. Impacto metodologico
- [ ] Altera numerador?
- [ ] Altera denominador?
- [ ] Altera coorte elegivel?
- [ ] Altera janela temporal?
- [ ] Altera code set de procedimentos, vacinas, CID, CIAP ou CBO?
- [ ] Altera fonte primaria (ex.: atendimento individual, vacinacao, odonto, eMulti)?
- [ ] Altera pagamento/incentivo sem alterar formula?
- [ ] Exige validacao complementar por outra fonte oficial?

## 5. Governanca de implementacao
- [ ] A fonte exige criar ou atualizar `ruleVersion`?
- [ ] A fonte exige novo warning tecnico?
- [ ] A fonte reduz ou elimina `requires_official_validation`?
- [ ] A fonte exige atualizar backlog, matrix, testing e QA?
- [ ] A fonte exige revalidacao de runtime local/publico?

## 6. Seguranca e privacidade
- [ ] A fonte nao induz retorno de PII no contrato agregado.
- [ ] Se houver lista nominal, RBAC e mascaramento foram reavaliados.
- [ ] Nenhuma credencial, token, JWT, CPF ou CNS completo foi inserido na documentacao.

## 7. Decisao final
- [ ] Registrar conclusao no `official-sources-registry.md`.
- [ ] Vincular a fonte ao indicador impactado.
- [ ] Manter `requires_official_validation` se a revisao metodologica continuar incompleta.
- [ ] Nao codar regra nova antes de concluir os itens acima.
