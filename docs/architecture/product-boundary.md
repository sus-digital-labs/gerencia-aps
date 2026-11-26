# Fronteira do produto

**Perfil distribuído:** painel e API local para e-SUS PEC

O [perfil Docker](../../README.md#instalação) inclui a interface e a API da mesma origem. A fronteira de distribuição está na [ADR-001](../adr/ADR-001-PUBLIC-REPOSITORY-SCOPE.md).

## Capacidades atuais

| Componente | Estado | Descrição verificável |
|---|---|---|
| Interface | Local | Painel, vínculos, equipes, lista nominal, gestão ACS, território, vigilância, qualidade cadastral, relatórios e configurações. |
| API do painel | Local | Sessão de operador, checagem dos recortes, consultas ao PEC em transações de leitura e cache de agregados. |
| Dados do PEC | Instalação | Cópia e credencial provisionadas por quem opera o ambiente. |
| CVAT no Siaps | Instalação | A distribuição municipal vem do CSV público. CVAT5 e CVAT6 por equipe exigem os complementos descritos no [contrato CVAT](../13-saude-brasil-360/complementos-cvat-local.md). |
| Exportações | Local | CSV autenticado de conferência para os relatórios. O processamento e o envio oficial usam os sistemas responsáveis. |
| Situação de tarefas | Instalação | Estado operacional local em volume persistente, separado do prontuário. |

## Evidência de fonte

A API distingue resultado apurado, ausência de dados, evidência parcial, fonte pendente e consulta indisponível. Quando uma condição do indicador fica sem comprovação, o painel apresenta o motivo. O ambiente sintético de testes é descartável e usa uma rede Docker independente.
