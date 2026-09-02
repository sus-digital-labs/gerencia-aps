# Decisão da primeira primitive do core

**Estado:** proposta privada para revisão  
**Resultado atual:** `FIOCRUZ_CORE_NEEDS_MORE_EVIDENCE`

## Nome

`CalculationContext`

## Problema resolvido

Os geradores de Diabetes e Hipertensão, além de outros módulos, calculam janelas temporais com `datetime.today()` e recebem filtros de unidade/equipe por parâmetros dispersos. Isso torna a coorte dependente do dia de execução e dificulta a comparação diferencial.

A primitive deve carregar somente o contexto necessário para tornar a execução explícita e serializável: data/período de referência, unidade, equipe, versão de metodologia e versão do modelo de dados quando disponível.

## Consumidores

Os primeiros consumidores são Diabetes e Hipertensão, que compartilham `HypertensionDiabetesRepository`, `HypertensionAdapter`/`DiabetesAdapter` e gerador SQL. Idoso, Criança, Saúde Bucal e Cadastro são consumidores futuros possíveis, mas não devem entrar no primeiro patch.

## Por que é core

A proposta resolve um problema real demonstrado em dois consumidores, melhora determinismo e testabilidade, é pequena o suficiente para revisão e pode ser adotada incrementalmente sem reescrever os cálculos. Também prepara o cálculo para execução particionada no futuro sem introduzir infraestrutura distribuída.

## Por que agora

A dependência de `today()` impede uma baseline comparável e pode alterar a população elegível no limite da janela. Sem contexto explícito, um teste diferencial não consegue afirmar se uma divergência veio da mudança de código ou do calendário.

## Por que não uma primitive maior

`NormalizedEncounter` exigiria resolver primeiro identidade, cardinalidade, code sets e semântica de cada fato. `MethodologySpec` exigiria fechar fórmulas e versões normativas ainda não comprovadas. `DataQualityResult` é transversal, mas altera contratos de resposta e deve ser uma segunda contribuição após observar no-data/zero em mais consumidores.

## Limites da primeira implementação

- Não alterar fórmulas, code sets ou janelas oficiais.
- Não corrigir bugs de SQL no mesmo patch.
- Não alterar o contrato de C1.
- Não migrar todos os módulos.
- Não criar pacote chamado `engine`, `core_v2` ou equivalente.
- Não publicar código antes de baseline e revisão.

## Critérios de decisão final

A proposta só vira contribuição quando houver Parquet/fixtures sintéticas disponíveis, baseline capturada, teste diferencial com equivalência exata, dois consumidores adotando o contexto, nenhuma alteração metodológica não intencional e revisão humana aprovada.
