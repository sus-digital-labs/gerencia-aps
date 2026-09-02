# Desativacao total do usuario esus-feedback

Data: 2026-02-20 13:27:17 -0300

## Linux
- Conta mantida, mas desativada (lock + expirada + shell nologin)
- Removida do grupo sudo

## SSH
- Override especifico removido e ssh recarregado

## PostgreSQL
- Role esus_feedback alterada para NOLOGIN + sem privilegios administrativos
