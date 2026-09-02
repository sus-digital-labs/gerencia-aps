# Rule Versioning

Formato: <INDICADOR>@<ANO>.<REVISAO> (ex.: C2@2026.1, C5@2026.1, B3@2026.2).

Nova versao quando mudar: denominador, numerador, janela temporal, tabela/campo, CBO/procedimento/CID/CIAP, regra oficial, exclusao ou pendencia.

Nao cria nova versao: typo, texto, performance sem mudar resultado, refatoracao interna, visual.

Estados: draft, requires_official_validation, validated, implemented_source, implemented_runtime, deprecated, superseded.

Campos obrigatorios no resultado: indicatorCode, program=SAUDE_BRASIL_360, ruleVersion, calculatedAt, sourceFreshness, inputHash (quando aplicavel), implementationVersion.
