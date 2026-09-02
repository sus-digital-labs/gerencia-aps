# Data Sources

- PEC local: read-only para descoberta/schema. Escrita proibida.
- Replica analytics: fonte preferencial de calculo Saude Brasil 360.
- DW/freshness: status operacional e invalida cache.
- LEDI: fluxo oficial de correcao; nao substitui calculo.

Proibido: UPDATE direto no PEC, envio de senha PEC ao servidor central, log de connection string com credencial, log de CPF/CNS/nome completo, mock como calculo real.
