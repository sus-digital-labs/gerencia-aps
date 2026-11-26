# ADR-001: Escopo do repositório público

## Decisão

O repositório público contém o frontend, a API local que consulta o PEC, os testes com dados sintéticos, o empacotamento Docker e a documentação do perfil distribuído. O operador provisiona a conexão autorizada com o PEC no ambiente de execução.

Credenciais, verificadores de login, estado de tarefas, exportações de operação, arquivos do Siaps e dados nominais são artefatos da instalação. Os valores necessários à configuração entram por variáveis de ambiente e arquivos montados no Docker.

## Motivos

- reduzir a superfície de ataque;
- impedir a publicação de detalhes operacionais;
- manter a documentação alinhada ao código executável;
- deixar explícita a responsabilidade da API por autenticação e autorização.

## Consequências

O pacote local serve a interface e sua API na mesma origem. A API autentica o operador, executa consultas de leitura no PEC e mantém o estado administrativo do aplicativo em armazenamento separado. A suíte descartável usa dados sintéticos.
