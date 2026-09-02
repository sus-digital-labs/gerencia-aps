# Multitenancy Installation Model

## Modelo hierárquico canônico

- `organization_id`
- `installation_id`
- `municipality_id` / `ibge_code`
- `health_unit_id` / `cnes`
- `team_id` / `ine`
- `professional_id` / `cbo`
- `user_id`

## Regras de cardinalidade

- **1 agente = 1 instalação PEC**
- **1 instalação PEC = 1 ou mais municípios**
- **1 município = várias unidades/CNES**
- **1 unidade = várias equipes/INE**

## Perfis administrativos

- **Administrador da Instalação**: escopo da instalação inteira
- **Administrador Municipal**: escopo restrito ao município

## Isolamento obrigatório

- filtro por tenant/installation em toda consulta
- filtro por município/IBGE em toda operação nominal
- validação de escopo `CNES/INE` para execução de correções
- auditoria por usuário/perfil/escopo

## Risco de cross-tenant

### Cenários de risco

1. cache key sem `installation_id` e `municipality_ibge`
2. consulta nominal sem filtro de escopo completo
3. comando LEDI roteado para agente de outra instalação

### Mitigações

- chave de cache sempre inclui `tenant + installation + municipality`
- policy middleware de escopo antes do handler
- assinatura de comando com validação de destinatário (`agent_id`)

## Modelo de chave de escopo (recomendado)

`scope_key = organization_id:installation_id:municipality_ibge:cnes:ine`

## status_fonte

- Hierarquia e isolamento: `confirmed`
- Regras regulatórias por perfil local: `requires_official_validation`
