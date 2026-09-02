# Contrato de importação idempotente e multitenant

O importador não faz parte deste repositório público. Esta especificação é obrigatória para uma implementação compatível.

## Configuração territorial

Município e UF são configuração da instalação. Nenhum importador pode possuir município, UF, CNES ou INE fixos no código.

Campos mínimos de contexto:

- `municipality_ibge`;
- `source`;
- `source_record_id`;
- `schema_version`;
- `event_competence`;
- hash do conteúdo normalizado.

## Chave idempotente

A chave natural mínima é:

```text
municipality_ibge:source:source_record_id:schema_version
```

A persistência deve possuir restrição `UNIQUE` equivalente e executar `upsert` dentro de transação. O mesmo lote e o mesmo registro podem ser reprocessados sem gerar nova linha. Mudança de conteúdo atualiza a versão materializada e registra linhagem; repetição do mesmo hash é `NO_CHANGE`.

## Resultado do lote

O importador deve informar separadamente:

- inseridos;
- atualizados;
- inalterados;
- rejeitados;
- conflitos de identidade;
- falhas de validação CNES/INE/CNS/CBO.

Banco indisponível ou tabelas sem dados não pode ser convertido em sucesso, zero oficial ou projeção. O estado correto deve ser `API_UNAVAILABLE` ou `NO_DATA`, conforme o caso.
