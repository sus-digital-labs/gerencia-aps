# Checkpoints and Freshness

## Tabelas de controle locais

- `agent_checkpoint` (cursor por tabela/contexto);
- `agent_sync_run` (execuções e resultado);
- `agent_sync_batch` (lotes e ack/retry).

## Cursor por tabela

- cada tabela possui cursor independente;
- cursor inclui recorte de instalação/município/equipe quando aplicável.

## last_success_at

- persistir timestamp da última execução bem-sucedida por tabela;
- usar no cálculo de lag.

## Lag por tabela

- `lag_seconds = now - last_success_at`;
- limites por classe de tabela (crítica vs apoio).

## Freshness por município/equipe

- freshness agregada por `tenant/installation/municipality`;
- quando aplicável, recorte por equipe/CNES/INE.

## Status

- `fresh`: dentro da janela alvo;
- `stale`: atraso acima do limite;
- `fail`: erro persistente sem recuperação.

## Impacto no cache de indicadores

- mudança de freshness deve acionar política de invalidação segura;
- nunca publicar indicador como atualizado com freshness `fail`.
