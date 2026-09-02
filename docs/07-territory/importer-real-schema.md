# Importador territorial — schema PEC real

## Escopo de leitura

O importador usa uma conexão separada para a réplica PEC e exige a autorização explícita `TERRITORY_SOURCE_READ_ONLY_AUTHORIZED=true`. A confirmação literal do workflow é `CONFIRM_TERRITORY_SYNC`. A conexão fonte não é usada para qualquer escrita.

A consulta principal lê `tb_fat_cad_domiciliar` e agrega cidadãos em `tb_fat_cad_individual`. O vínculo técnico utilizado é `co_seq_fat_cad_domiciliar` com `co_seq_fat_cad_domiciliar` no individual. O filtro de município utiliza `co_dim_municipio`.

| Conceito | Tabela/campo | Tratamento |
|---|---|---|
| Identidade do domicílio | `tb_fat_cad_domiciliar.co_seq_fat_cad_domiciliar` | HMAC em `source_record_fingerprint` |
| Microárea | `tb_fat_cad_domiciliar.nu_micro_area` | `UNASSIGNED` quando vazio; limite de 32 caracteres |
| Latitude/longitude | `nu_latitude`, `nu_longitude` | Coordenadas conhecidas ou estado `pending` |
| Família | `co_seq_fat_cad_dom_familia` | Mantida como referência técnica do lote |
| Cidadãos | `tb_fat_cad_individual.co_seq_cidadao` | Somente contagem agregada no read model |
| Logradouro | `no_logradouro` | Componente do HMAC de endereço; não persistido em claro |
| Número | `nu_num_logradouro` | Componente do HMAC de endereço |
| Bairro | `no_bairro` | Componente do HMAC de endereço |
| Município | `co_dim_municipio` | Componente canônico do HMAC de endereço |
| UF/CEP/complemento | Ausentes no recorte validado | Representados como componentes vazios até contrato fonte autorizado |

## Joins territoriais

Os joins de unidade, equipe e município foram identificados no schema real por `co_dim_unidade_saude`, `co_dim_equipe` e `co_dim_municipio`. O recorte sintético homologado localmente contém um domicílio, uma família, uma microárea, uma unidade, uma equipe e um cidadão. O importador territorial atual materializa o agregado de domicílios e microáreas; a expansão da resposta nominal de cidadãos deve permanecer em endpoint autorizado, com minimização e controle de cardinalidade.

## Fingerprints

`source_record_fingerprint` é calculado com HMAC-SHA-256 sobre o domínio `source-record-v1`, tenant e identificador técnico do registro fonte. `address_fingerprint` é calculado com HMAC-SHA-256 sobre o domínio `address-v1`, tenant e os sete componentes de endereço normalizados por trim, colapso de espaços e uppercase ASCII.

A fonte do endereço não é gravada no read model. Isso reduz exposição de PII e permite comparar alterações de endereço sem transformar o fingerprint em identificador público.

## Regras de segurança

O importador nunca executa DDL ou DML na fonte. A role `territory_read_only` foi testada com seis operações negativas e todas foram negadas. A consulta alvo roda em transação com RLS por tenant e município, e o advisory lock é adquirido dentro da mesma transação.
