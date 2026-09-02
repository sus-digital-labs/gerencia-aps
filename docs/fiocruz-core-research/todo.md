# TODO — C1, identidade e entrada progressiva no core

- [x] S10 normalizada.
- [x] Falsos alarmes removidos dos documentos canônicos ativos auditados.
- [x] 21 cálculos canônicos verificados (15 Qualidade APS + 6 CVAT).
- [x] C1 permanece bloqueado e sem resultado numérico.
- [x] Cadeia FK → dimensão → campo semântico documentada.
- [x] Issue C1 pronta para revisão humana e não publicada.
- [ ] Idempotência reproduzida no checkout que contém o importador (`NOT_RUN` neste standalone).
- [x] Parametrização municipal verificada no runtime standalone.
- [x] Escopo de `@ts-nocheck` verificado no código ativo.
- [x] Modelo privado de identidade concluído.
- [x] Casos familiares sintéticos concluídos.
- [x] Modelo de relacionamento de equipes concluído.
- [x] B3/B5/B6 auditados documentalmente; vínculo oficial ainda pendente.
- [x] Guard de escopo e regressão B4/B5 adicionados.
- [x] Gates finais registrados; `check:full` e `format:check` permanecem falhos por dívida preexistente.
- [x] Nenhuma base real conectada e nenhuma credencial usada.
- [x] Nenhuma issue, PR, commit ou push realizado.

## Próximos bloqueios reais

1. Resposta dos maintainers sobre o contrato de tipo de demanda do Atendimento Individual.
2. Checkout/fixture do importador para reproduzir conflict target e testes de upsert.
3. Fonte oficial e versionada do relacionamento eSB↔eSF/eAP por competência.
4. Contrato persistente de identidade e política transacional de conflito/merge manual.
5. Parquet/fixtures sintéticas para baseline diferencial de `CalculationContext`.
