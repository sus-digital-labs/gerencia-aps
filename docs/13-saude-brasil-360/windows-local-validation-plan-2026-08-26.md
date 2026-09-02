# Plano de testes e validação local no Windows

**Projeto:** SUS Analytics Web  
**Escopo:** B1–B6 e C2–C7  
**Revisão:** 2026-08-26

## 1. Objetivo

Verificar, em ambiente Windows reproduzível, que os indicadores de Saúde Bucal (B1–B6) e Cuidado Integral (C2–C7) calculam somente a população elegível, usam fontes e code sets corretos, respeitam competência e território, exibem status honesto e não expõem dados pessoais.

O plano não homologa o Siaps. Ele valida a implementação local contra as fichas metodológicas, o contrato de dados, fixtures controladas e uma referência independente de cálculo. O C1 permanece fora da reabertura: deve continuar bloqueado até a conclusão da issue P0 [1].

## 2. Princípios de validação

| Princípio | Aplicação |
|---|---|
| Fonte antes do código | Cada esperado deve apontar para a nota metodológica e sua versão. |
| Fixture dourada | Casos pequenos, determinísticos e revisados por indicador. |
| Oráculo independente | O esperado não pode ser obtido chamando a mesma função testada. |
| Falha segura | Dado ausente, schema incompleto ou versão incompatível gera bloqueio/pendência. |
| Sem PII | Fixtures usam IDs sintéticos; logs e snapshots são agregados. |
| Reprodutibilidade | Mesmo commit, lockfile, versão de Node/pnpm e mesmas fixtures. |
| Evidência | Cada execução salva comando, versão, resultado e hash do artefato. |

## 3. Preparação do ambiente Windows

Abra PowerShell em uma cópia limpa do checkout. Confirme que o caminho do projeto não contém arquivos pessoais, dados reais ou segredos.

```powershell
Set-Location 'D:\dm-hub\apps\dm-contribution\sus-analytics-web'
node --version
corepack --version
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm --version
Copy-Item .env.example apps/frontend/.env.local
```

Preencha apenas variáveis públicas necessárias ao frontend. Não copie tokens, CPF, CNS ou strings de conexão para o arquivo, fixtures ou logs.

Instale exatamente o lockfile e confirme o estado do workspace:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @sus-analytics/frontend exec vitest --version
```

Se `pnpm install --frozen-lockfile` falhar, registre a versão de Node, pnpm, mensagem completa e hash do commit. Não substitua por `npm install` nem altere o lockfile durante esta rodada.

## 4. Gates técnicos iniciais

Execute os comandos na ordem abaixo. Um gate vermelho interrompe a promoção do indicador e precisa ser corrigido ou formalmente aceito como bloqueio.

```powershell
pnpm check
pnpm --filter @sus-analytics/frontend test
pnpm --filter @sus-analytics/frontend format:check
pnpm build
pnpm verify:release
```

A suíte existente em `apps/frontend/src/lib/analytics-contract.test.ts` já verifica a divisão 15 + 6 do escopo, o bloqueio determinístico do C1, problemas de cadastro e a chave idempotente [2]. Esses testes devem passar antes dos testes específicos de B/C.

## 5. Camadas de teste

### 5.1 Contrato e registro

Validar tipos, campos obrigatórios, status, versão de regra, competência, unidade, equipe e chave de importação. O teste deve confirmar que um indicador sem fonte obrigatória não retorna `ok`, que status de ausência de dado não é convertido em zero e que reprocessar o mesmo registro não duplica fatos.

### 5.2 Fórmula e polaridade

Para cada indicador, construir uma fixture com numerador, denominador e resultado esperado calculados manualmente em uma planilha ou função independente. Cobrir denominador zero, numerador zero, todos os elegíveis, nenhum elegível, limite inferior, limite superior, código desconhecido e registro fora da janela.

Não copiar o resultado do runtime para definir o esperado. O oráculo deve ser revisado por outra pessoa da equipe.

### 5.3 Schema e qualidade

Testar tabela ausente, coluna ausente, chave nula, dimensão vazia, code set inválido, relação um-para-muitos, duplicidade de fato, competência inválida, equipe inexistente, CBO não elegível e versão incompatível. Cada falha deve gerar `blocked`, `pending` ou descarte com motivo explícito.

### 5.4 Integração tRPC e adaptador

O adaptador de compatibilidade transforma respostas de `previneBrasil.calcularTodos` em campos de tela e possui fallbacks de lista vazia [3]. Validar o payload bruto, a transformação para `indicator_code`, `numerator`, `denominator`, `result_percentage` e `target_percentage`, além do comportamento de erro. Falha de API não pode parecer ausência de dados válida.

### 5.5 Interface

Verificar filtros de competência, unidade e equipe; presença de todos os códigos B1–B6 e C2–C7; rótulo e fonte; status de pendência; ausência de PII; arredondamento; faixa ótima/teto quando aplicável; e diferenciação visual entre zero real, sem dados e bloqueio.

## 6. Fixtures mínimas por indicador

| Indicador | Fixture mínima | Casos obrigatórios |
|---|---|---|
| B1 | Pessoas eSB elegíveis, primeira consulta odontológica programada, equipe/CBO e janela | Elegível com evento, sem evento, CBO inválido, duplicidade e denominador zero. |
| B2 | Pessoas com primeira consulta e tratamento odontológico | Tratamento concluído, não concluído, evento fora da janela e consulta inelegível. |
| B3 | Procedimentos odontológicos separados em exodontia, preventivo e curativo | Exodontia zero, exodontia total, código SIGTAP desconhecido e denominador zero. |
| B4 | Crianças elegíveis e participação em escovação supervisionada | Faixa etária limite, participação duplicada, ação não elegível e competência divergente. |
| B5 | Procedimentos odontológicos individuais preventivos e total individual elegível | Código preventivo válido, procedimento fora do conjunto, duplicidade e denominador zero. |
| B6 | Procedimentos ART e restauradores | ART válido, restaurador válido, código inválido, duplicidade e denominador zero. |
| C2 | Crianças elegíveis, consultas, antropometria, visitas e vacinação | Criança completa, prática faltante, aniversário fora do quadrimestre e cadastro sem vínculo. |
| C3 | Gestação/puerpério, consultas, exames, vacinação e odontologia | Gestação elegível, marco de puerpério, evento fora da janela e registro sem diagnóstico. |
| C4 | Pessoas com diabetes, consultas, PA/antropometria, exames, pés e visitas | Critérios completos, cada critério faltante, CID/CIAP inválido e coorte vazia. |
| C5 | Pessoas com hipertensão, consultas, PA/antropometria e visitas | Critérios completos, medida fora da janela, diagnóstico inválido e coorte vazia. |
| C6 | Pessoas com 60 anos ou mais, consulta, medidas, visita e influenza | Idade limite, vacinação válida, evento atrasado e pessoa sem vínculo. |
| C7 | Coorte de prevenção do câncer, exames, procedimentos e vacinação | Faixa etária limite, exame válido, exame fora da janela e código inválido. |

Os detalhes de fórmula, pesos, janelas e code sets devem ser preenchidos a partir da nota metodológica específica de cada indicador. Esta tabela define a cobertura de teste, não substitui a norma.

## 7. Matriz de casos de teste

| ID | Camada | Cenário | Resultado esperado |
|---|---|---|---|
| CT-01 | Contrato | Fixture válida de cada B/C | Resultado e status coerentes com o oráculo independente. |
| CT-02 | Contrato | Denominador vazio | `NO_DATA` ou estado equivalente, nunca divisão inválida. |
| CT-03 | Fórmula | Numerador zero com universo válido | Percentual zero legítimo e distinguível de fonte vazia. |
| CT-04 | Fórmula | Registro duplicado | Contagem deduplicada conforme a chave oficial. |
| CT-05 | Elegibilidade | Idade, sexo/coorte ou vínculo no limite | Inclusão/exclusão igual à nota vigente. |
| CT-06 | Tempo | Evento um dia fora da janela | Evento excluído e evidência registrada. |
| CT-07 | Território | Equipe/unidade incompatível | Registro excluído ou pendente com motivo. |
| CT-08 | Profissional | CBO fora do code set | Registro não entra no cálculo. |
| CT-09 | Procedimento | SIGTAP fora do conjunto vigente | Registro rejeitado/pendente, sem classificação aproximada. |
| CT-10 | Schema | Tabela ou coluna obrigatória ausente | Bloqueio determinístico. |
| CT-11 | Fonte | Versão incompatível | Lote rejeitado conforme regra de compatibilidade [4] [5]. |
| CT-12 | API | tRPC indisponível | `API_UNAVAILABLE`, sem exibir lista vazia como resultado válido. |
| CT-13 | Reprocessamento | Mesmo lote processado duas vezes | Mesmos fatos, sem duplicação e mesma saída. |
| CT-14 | Privacidade | Snapshot de resposta | Sem CPF, CNS completo, nome, endereço ou SQL bruto. |
| CT-15 | UI | Todos os códigos B1–B6 e C2–C7 | Todos presentes, com rótulo, status e fonte corretos. |

## 8. Validação independente por indicador

Para cada B1–B6 e C2–C7, preencher um registro com código, versão da regra, fonte, competência, hash da fixture, numerador esperado, denominador esperado, percentual esperado, resultado observado, diferença, status, warnings e aprovação do revisor.

Uma diferença só pode ser aceita quando houver explicação documentada, como arredondamento, deduplicação ou mudança oficial de janela. Diferença sem causa reproduzível é falha.

## 9. Execução recomendada por ondas

| Onda | Escopo | Saída |
|---:|---|---|
| 0 | Ambiente, lockfile, contrato e privacidade | Ambiente reproduzível e gates verdes. |
| 1 | B1–B3 | Primeira bateria odontológica e correções de code set. |
| 2 | B4–B6 | Coletivas, preventivos, exodontias e ART. |
| 3 | C2–C3 | Infância, gestação e puerpério com janelas temporais. |
| 4 | C4–C5 | Diabetes e hipertensão com critérios clínicos. |
| 5 | C6–C7 | Pessoa idosa e prevenção do câncer. |
| 6 | Integração | tRPC, adaptador, dashboard, privacidade e regressão completa. |

Não executar a onda seguinte com falha aberta na anterior, salvo decisão formal registrada no changelog.

## 10. Pacote de evidências

Para cada onda, salvar em diretório de artefatos fora do controle de versão ou em armazenamento aprovado: commit, versão de Node/pnpm, comando, data/hora, resultado dos gates, fixture sintética, esperado independente, saída observada, snapshot sanitizado e parecer do revisor.

Nunca salvar banco de produção, exportação nominal, token, conexão, CPF, CNS completo ou stack trace em anexos de QA.

## 11. Critério de promoção

Um indicador pode ser promovido para `validated_runtime_public` apenas quando a fórmula estiver ligada à fonte correta, a fixture dourada passar, o schema e code set estiverem comprovados, filtros e janelas forem testados, o adaptador preservar o contrato, a UI exibir todos os estados e a revisão de privacidade estiver aprovada.

`validated_runtime_public` significa validação técnica naquele ambiente e período. Não significa homologação normativa do Siaps [1].

## 12. Referências

[1]: c1-data-contract-issue-2026-08-26.md "Issue P0 do C1 e critérios de aceite"
[2]: ../../apps/frontend/src/lib/analytics-contract.test.ts "Suíte Vitest do contrato analítico"
[3]: ../../apps/frontend/src/lib/trpc-adapter.ts "Adaptador tRPC de compatibilidade"
[4]: siaps-operational-compatibility-2026-08-26.md "Manual de compatibilidade operacional"
[5]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NT_12-2025_criterio_validacao_dados_siaps-0394bed57dc6efcddaa83dab337f9533.pdf "Nota Técnica nº 12/2025"
[6]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NI_13-2025_cenario_versoes_incompativeis-90647909abe17697641f1a44b859e48a.pdf "Nota Informativa nº 13/2025"
[7]: https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/ "Índice oficial de Notas Metodológicas do Siaps"

**Resultado esperado:** uma matriz assinada pela equipe para B1–B6 e C2–C7, com falhas abertas classificadas e sem promoção indevida de indicadores.
