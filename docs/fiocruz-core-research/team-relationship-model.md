# Modelo privado de relacionamento entre equipes

## Domínio

`Team`, `TeamIdentifier`, `TeamType` e `TeamRelationship` são independentes de `CitizenIdentity`.

```text
TeamRelationship(
  source_team_id,
  target_team_id,
  relationship_type,
  effective_from,
  effective_to,
  source,
  competence
)
```

INE e CNES são identificadores externos versionados; não substituem a chave interna. O relacionamento eSB → eSF/eAP precisa vir de fonte oficial aplicável à competência. Compartilhar CNES/unidade não prova vínculo.

## Resolução

- Um vínculo único, vigente e validado retorna `MATCH`.
- Ausência retorna `TEAM_RELATIONSHIP_MISSING`.
- Mais de um vínculo elegível retorna `TEAM_RELATIONSHIP_AMBIGUOUS`.
- Vínculo fora da competência retorna `TEAM_RELATIONSHIP_OUT_OF_PERIOD`.
- Par CNES/INE inconsistente permanece pendente até validação na referência aplicável.

## Casos de teste futuros

1. eSB ligada a uma eSF/eAP na competência: resolver uma relação.
2. eSB sem vínculo: não inferir por unidade.
3. vínculo encerrado antes da competência: rejeitar.
4. dois vínculos simultâneos: marcar ambiguidade.

**Estado:** modelo pronto para validação documental; implementação bloqueada pela fonte oficial de relacionamento e pela ausência de dois consumidores comprovados no runtime atual.
