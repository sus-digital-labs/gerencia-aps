# eMulti

## 1. Objetivo deste arquivo
Registrar as fontes oficiais do dominio eMulti e o estado operacional atual dos indicadores M1/M2 no contrato canonico `saudeBrasil360.calcularIndicador`.

## 2. Fontes vinculadas
- `SRC-CTX-005` Fichas Tecnicas SAPS/MS
- `SRC-EMULTI-014` Equipes Multiprofissionais (eMulti)
- `SRC-EMULTI-015` Nota Informativa n 4/2025-CGESCO/DESCO/SAPS/MS
- `SRC-EMULTI-018` Nota Metodologica M1 - Media de atendimentos por pessoa pela eMulti na APS
- `SRC-EMULTI-019` Nota Metodologica M2 - Acoes interprofissionais realizadas pela eMulti na APS

## 3. O que estas fontes validam hoje
- dominio institucional da eMulti dentro do componente de qualidade;
- existencia de notas metodologicas oficiais especificas para M1 e M2;
- formula base oficial:
  - M1 = media de atendimentos individuais e coletivos por pessoa atendida pela eMulti;
  - M2 = proporcao de acoes compartilhadas realizadas pela eMulti;
- contexto de incentivo adicional, equipe elegivel e granularidade por INE.

## 4. Source-health validado antes do gate
Tabelas e campos validados por leitura agregada segura antes da implementacao:
- `tb_dim_equipe`
- `tb_dim_profissional`
- `tb_dim_cbo`
- `tb_fat_atendimento_individual`
- `tb_fat_atividade_coletiva`
- `tb_fat_atvdd_coletiva_part`
- campos de escopo/proxy confirmados: `nu_ine`, `ds_filtro`, `co_dim_profissional_2`, `st_nasf_*`, `st_conduta_agendamento_emulti`, `nu_uuid_ficha`

## 5. Estado operacional atual
- M1: `validated_runtime_public` + `requires_official_validation`
- M2: `validated_runtime_public` + `requires_official_validation`
- ambos estao implementados no endpoint canonico `saudeBrasil360.calcularIndicador`
- ambos usam payload agregado e sem PII
- ambos bloqueiam honestamente quando o runtime nao consegue provar o escopo eMulti solicitado

## 6. Proxies e riscos ainda abertos
- escopo de equipe eMulti ainda depende de proxy por `tb_dim_equipe.ds_filtro`/`no_equipe`; a replica nao expoe uma ponte simples e comprovada do INE analitico para o tipo de equipe 72 no cadastro transacional
- o recorte de perfil profissional eMulti ainda depende de `tb_dim_profissional`/`tb_dim_cbo` associados ao time efetivo, sem amarracao normativa fechada para todos os cenarios de equipe apoiada
- M1 ainda usa identificacao de pessoa assistida por `co_fat_cidadao_pec` e fallback controlado para `CNS`, com warning explicito
- M2 ainda usa sinais de multiprofissionalidade em atendimento individual (`co_dim_profissional_2`, `st_nasf_*`, `st_conduta_agendamento_*`) e composicao coletiva por `nu_uuid_ficha`, com warning explicito

## 7. Regra de bloqueio para proximas mudancas
Nao alterar M1/M2 sem:
- revisar `official-sources-registry.md`;
- aplicar `source-review-checklist.md`;
- vincular a fonte oficial primaria impactada;
- atualizar `ruleVersion` se houver mudanca em formula, CBO, janela, granularidade, equipe elegivel ou identificacao de pessoa/acao;
- manter `requires_official_validation` ate a revisao metodologica interna fechar os proxies ainda necessarios.
