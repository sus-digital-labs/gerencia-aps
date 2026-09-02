# CBO / Permission Map

## Objetivo

Definir matriz de autorização para correções operacionais por perfil funcional, CBO e escopo territorial, sem permitir bypass de governança.

## Princípios

1. Perfil técnico não substitui CBO válido.
2. CBO válido sem escopo (município/CNES/INE) também não autoriza.
3. Toda ação gera trilha de auditoria.
4. Em caso de dúvida normativa, bloquear execução e permitir apenas orientação.

## Matriz de autorização (alto nível)

| Perfil de sistema | CBO (família) | Escopo obrigatório | Ações permitidas | Ações bloqueadas | Aprovação |
| --- | --- | --- | --- | --- | --- |
| Administrador da Instalação | Gestão TI/Saúde (sem ação clínica) | tenant + installation | parametrização, filas, reprocessamento | correção clínica/cadastral nominal | Não para operação técnica |
| Administrador Municipal | Gestão APS | tenant + installation + municipality | aprovar/rejeitar correções, política de fluxo | execução clínica direta sem CBO | Sim (aprovação final) |
| Coordenador de Unidade | Gestão local | municipality + CNES | revisão de pendências e aprovação local | envio LEDI sem executor elegível | Sim |
| ACS | CBO ACS compatível | municipality + CNES + INE | cadastro territorial, visita domiciliar suportada | registro clínico privativo | Depende da política |
| Técnico/Auxiliar de enfermagem | CBO enfermagem nível médio | municipality + CNES + INE | ações operacionais permitidas por modelo | atos privativos médicos | Sim para casos sensíveis |
| Enfermeiro(a) | CBO enfermagem superior | municipality + CNES + INE | vacinação/seguimento/APS conforme modelo | atos fora de escopo normativo | Sim ou dispensada por regra |
| Médico(a) | CBO médico APS | municipality + CNES + INE | atendimento/procedimento clínico conforme modelo | ações fora da carteira permitida | Sim para fluxos críticos |
| Odontologia (dentista/ASB/TSB) | CBO saúde bucal | municipality + CNES + INE (equipe SB) | registros de saúde bucal suportados | ações fora do domínio SB | Sim |
| eMulti | CBO multiprofissional eMulti | municipality + CNES + INE eMulti | ações interprofissionais suportadas | ações fora de perfil/cbo | Sim |
| Auditor/Controle interno | perfil auditoria | tenant + municipality | leitura de trilhas, evidências anonimizadas | execução de correção | Não |

## Permissões técnicas recomendadas

- `correction:draft:create`
- `correction:submit`
- `correction:approve`
- `correction:reject`
- `correction:ledi:dispatch`
- `correction:audit:read`
- `indicator:nominal:read` (sempre com escopo e máscara)
- `indicator:aggregated:read`

## Regras de bloqueio automático

- CBO incompatível para o tipo de correção.
- Profissional sem vínculo com `CNES/INE` da pendência.
- Usuário fora do município da instalação alvo.
- Tentativa de envio LEDI sem aprovação exigida.
- Tentativa de visualizar PII fora de perfil explícito.

## status_fonte

- Matriz de permissão: `confirmed` (como diretriz de arquitetura deste projeto)
- CBO detalhado por indicador: `requires_official_validation`
