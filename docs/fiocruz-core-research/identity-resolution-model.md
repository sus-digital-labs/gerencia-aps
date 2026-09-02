# Modelo privado de resolução de identidade

## Limite

Este documento define política e casos sintéticos; não implementa um `IdentityResolver` nem usa dados reais. Identidade de cidadão e relacionamento entre equipes são domínios separados.

## Modelo

`Citizen` possui um `citizen_id` interno, imutável e não derivado de CPF/CNS. `CitizenIdentifier` associa zero ou mais identificadores externos ao cidadão, com `type` (`CPF` ou `CNS`), valor protegido, origem, vigência, versão e estado de validação.

Relacionamentos familiares, domiciliares, territoriais e assistenciais referenciam `citizen_id`. O identificador original usado no evento é preservado para linhagem.

## Algoritmo de decisão

1. Normalizar e validar estruturalmente CPF/CNS sem logging nominal.
2. Consultar correspondências exatas por identificador validado.
3. Se CPF e CNS resolvem o mesmo `citizen_id`, retornar `MATCH`.
4. Se apenas um resolve e não existe conflito, retornar o cidadão e anexar o novo identificador somente por fluxo auditado.
5. Se resolvem cidadãos distintos, retornar `IDENTITY_CONFLICT`; nunca auto-merge.
6. Se nenhum resolve, criar identidade somente quando o contrato de ingestão autorizar; caso contrário retornar `PENDING_IDENTITY`.
7. Nunca resolver por nome, endereço, telefone ou similaridade.

## Estados

`MATCH`, `MATCH_BY_CPF`, `MATCH_BY_CNS`, `PENDING_IDENTITY`, `IDENTITY_CONFLICT`, `INVALID_IDENTIFIER`.

## FCI/FCDT

A FCI e a FCDT conservam evento, identificador original, responsável, domicílio, território, competência e versão. Mudança posterior de CNS-only para CPF+CNS adiciona um alias à identidade existente; não reescreve eventos históricos nem remove vínculos por CNS.

## Segurança

Logs e resultados agregados carregam apenas identificadores técnicos opacos, contagens, estado e código de motivo. CPF/CNS completos, nome, telefone e endereço são proibidos.

## Readiness

O modelo está `READY_FOR_IMPLEMENTATION_DESIGN`, não `READY_FOR_PRODUCTION`. Faltam contrato de persistência, transação/concorrência, índice único versionado, política de merge manual e dois consumidores reais antes de promover a primitive ao core.
