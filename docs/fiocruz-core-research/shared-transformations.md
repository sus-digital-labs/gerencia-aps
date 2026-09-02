# Mapa de transformações compartilhadas

**Snapshot:** `CampusVirtualFiocruz/painel-esus` — `d21fe44562fd73c4ae46261a40496079b6e94f15`  
**Objetivo:** encontrar reutilização real antes de criar uma primitive.

| Transformação | Indicador A | Indicador B | Outros consumidores | Evidência de código | Candidato core |
|---|---|---|---|---|---|
| Contexto de período e filtros CNES/equipe | Diabetes | Hipertensão | Criança, Idoso, Saúde Bucal, Cadastro | Geradores e queries recebem `cnes/equipe`; vários usam `datetime.today()`; `gen_where_cnes_equipe` é compartilhado apenas por parte dos módulos | **Sim — `CalculationContext`** |
| Leitura de Parquet por caminho relativo | Diabetes | Hipertensão | Criança, Idoso, Saúde Bucal, Cadastro | Funções `ler_dados_raw()` e queries usam `./dados/input`/`./dados/output` e `os.getcwd()` | Sim, mas infraestrutura de origem; não primeira primitive |
| Agrupamento por pessoa | Diabetes | Hipertensão | Criança, Idoso, Cadastro | `group_by`/`unique` por identificador técnico em geradores e bases derivadas | Sim, mas exige contrato de identidade e cardinalidade antes |
| Status de dado ausente versus zero | Saúde Bucal | Cadastro | Idoso, adapters de Diabetes/Hipertensão | Fallbacks e agregados retornam zeros/estruturas vazias sem distinguir fonte ausente de população vazia | **Sim — `DataQualityResult`, segunda opção** |
| Lista nominal, filtros e paginação | Saúde Bucal | Cadastro | Idoso, Diabetes/Hipertensão | Blocos semelhantes constroem filtros textuais e usam `limit/offset`; há risco quando filtros estão vazios | Sim, mas envolve API, privacidade e segurança; adiar |
| Normalização de CBO | Diabetes | Hipertensão | Criança, Idoso, Saúde Bucal | Dimensão `tb_dim_cbo` é ligada a FAI/FAO/visitas/procedimentos e depois usada em code sets | Sim, após confirmar code sets e versão |
| Resultado agregado para adapter | Diabetes | Hipertensão | Saúde Bucal, Criança, Idoso | Adapters transformam tuplas/agregados em estruturas de UI | Possível, mas apresentação não deve fechar metodologia |

## Primitive selecionada

A primeira primitive candidata é **`CalculationContext`**, limitada a `reference_date`/`reference_period`, filtros de unidade/equipe e versão da regra. Ela tem dois consumidores concretos no mesmo repositório compartilhado, reduz a dependência silenciosa de `datetime.today()` e permite teste diferencial sem alterar a fórmula.

## Primitive adiada

`DataQualityResult` é uma segunda opção forte e transversal, porque o upstream não distingue consistentemente fonte ausente, dataset vazio, erro de schema e zero real. Ela deve ser desenhada depois de observar as saídas de pelo menos dois consumidores com fixtures sintéticas; não incluir no primeiro patch para evitar alterar simultaneamente cálculo e contrato de resposta.

## Restrições

Nenhuma transformação é promovida a core só porque possui nome conveniente. A primitive deve resolver um problema observado, ter adoção incremental, ser determinística, ser serializável, não exigir reescrita ampla e ter teste diferencial. Não criar um pacote genérico de engine.

## Próximo passo

Implementar somente em branch de pesquisa um protótipo mínimo de contexto, sem publicar. Aplicar a dois consumidores, capturar `OLD_RESULT`/`NEW_RESULT` com data fixa e exigir equivalência exata quando as regras não forem alteradas.
