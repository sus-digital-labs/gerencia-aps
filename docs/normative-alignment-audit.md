# Normative Alignment Audit - Saude Brasil 360

Data da auditoria: `2026-05-20`
Fonte de verdade desta rodada: `docs/Saude Brasil 360/*`.

## Resumo executivo
Esta auditoria fecha o gate P0 de alinhamento normativo entre runtime canonic e notas metodologicas oficiais locais do Saude Brasil 360. O foco foi corrigir apenas divergencias comprovadas em `C5`, `B3`, `B4`, `B5` e `B6`.

| Indicador | Classificacao | Decisao |
|---|---|---|
| `C5` | `wrong_indicator_mapping` | corrigir de diabetes/HbA1c para hipertensao |
| `B3` | `requires_rule_rewrite` | corrigir para taxa de exodontia |
| `B4` | `inverted_formula` | corrigir para escovacao supervisionada 6 a 12 anos |
| `B5` | `inverted_formula` | corrigir para procedimentos odontologicos individuais preventivos |
| `B6` | `wrong_denominator` | corrigir para ART sobre restauradores, sem acao coletiva |

## C5
- nome atual anterior no runtime/docs: `Diabeticos com HbA1c solicitada`
- nome oficial: `Cuidado da pessoa com hipertensao`
- objetivo oficial: medir o cuidado ofertado as pessoas com hipertensao vinculadas a equipe
- numerador oficial: somatorio ponderado das boas praticas
  - consulta medica/enfermagem em 6 meses
  - afericao de pressao arterial em 6 meses
  - peso + altura em 12 meses
  - 2 visitas ACS/TACS com intervalo minimo de 30 dias em 12 meses
- denominador oficial: pessoas com hipertensao vinculadas a equipe no periodo, ponderadas em 100 pontos
- unidade: percentual ponderado
- polaridade/parâmetro oficial: maior melhor; regular `<=25`, suficiente `>25 <=50`, bom `>50 <=75`, otimo `>75 <=100`
- CBOs: medico, enfermeiro, ACS/TACS
- SIGTAP: NA no nucleo da formula; pratica assistencial e de visita
- modelos de informacao: cadastro individual, atendimento individual, visita domiciliar
- janelas temporais: 6 meses para consulta e PA; 12 meses para antropometria e visitas
- implementacao anterior: `st_diabete`, HbA1c/glicemia, pe diabetico
- divergencia: mapeamento de indicador errado; semantica de diabetes pertencia a C4
- decisao de correcao: `C5@2026.4`, remover diabetes/HbA1c/glicemia/pe diabetico e aplicar hipertensao ponderada

## B3
- nome atual anterior no runtime/docs: `Exodontias e preventivos`
- nome oficial: `Taxa de exodontia`
- objetivo oficial: medir a participacao de exodontias no total de procedimentos preventivos + curativos + exodontias
- numerador oficial: exodontias realizadas
- denominador oficial: procedimentos preventivos + curativos + exodontias
- unidade: taxa/percentual
- polaridade/parâmetro oficial: regular `<8` ou `>=14`; suficiente `>=12 <14`; bom `>=10 <12`; otimo `>=8 <10`
- CBOs: cirurgiao-dentista `2232-08`, `2232-93`, `2232-72`
- SIGTAP principal: exodontias `0414020138`, `0414020146`
- modelos de informacao: procedimento odontologico individual
- janelas temporais: periodo do indicador
- implementacao anterior: participacao de preventivos e coletivas sobre total odontologico
- divergencia: formula de indicador diferente da nota oficial
- decisao de correcao: `B3@2026.3`, usar taxa de exodontia com code set oficial e remover coletiva da formula

## B4
- nome atual anterior no runtime/docs: `Procedimentos preventivos odontologicos`
- nome oficial: `Escovacao supervisionada em faixa etaria escolar (de 6 a 12 anos)`
- objetivo oficial: medir a realizacao de escovacao supervisionada em criancas de 6 a 12 anos
- numerador oficial: criancas de 6 a 12 anos participantes de acao coletiva de escovacao supervisionada realizada pela eSB
- denominador oficial: criancas de 6 a 12 anos vinculadas a eSF/eAP de referencia da eSB
- unidade: razao/cobertura
- polaridade/parâmetro oficial: regular `<=0.25`; suficiente `>0.25 <=0.5`; bom `>0.5 <=1`; otimo `>1`
- CBOs: equipe de saude bucal em atividade coletiva
- SIGTAP: `0101020031` quando aplicavel
- modelos de informacao: atividade coletiva e populacao de referencia
- janelas temporais: periodo do indicador com faixa etaria 6 a 12 anos
- implementacao anterior: cobertura de pacientes com procedimento preventivo
- divergencia: formula invertida com o atual B5
- decisao de correcao: `B4@2026.3`, usar atividade coletiva + populacao 6 a 12 anos da unidade de referencia

## B5
- nome atual anterior no runtime/docs: `Escovacao supervisionada`
- nome oficial: `Procedimentos odontologicos individuais preventivos`
- objetivo oficial: medir a participacao de procedimentos preventivos individuais no total de procedimentos odontologicos individuais
- numerador oficial: procedimentos preventivos individuais
- denominador oficial: total de procedimentos odontologicos individuais
- unidade: percentual
- polaridade/parâmetro oficial: regular `<40` ou `>85`; suficiente `>=40 <60`; bom `>=60 <80`; otimo `>=80 <=85`
- CBOs: cirurgiao-dentista e tecnico em saude bucal conforme nota
- SIGTAP preventivos oficiais: `0101020058`, `0101020066`, `0101020074`, `0101020082`, `0101020090`, `0101020104`
- modelos de informacao: procedimento odontologico individual
- janelas temporais: periodo do indicador
- implementacao anterior: escovacao supervisionada/atividade coletiva
- divergencia: formula invertida com o atual B4
- decisao de correcao: `B5@2026.3`, usar code set preventivo oficial sobre o total individual odontologico

## B6
- nome atual anterior no runtime/docs: `ART e acoes coletivas de saude bucal`
- nome oficial: `Tratamento restaurador atraumatico`
- objetivo oficial: medir a participacao de ART no conjunto de procedimentos restauradores
- numerador oficial: procedimentos ART
- denominador oficial: procedimentos restauradores
- unidade: percentual
- polaridade/parâmetro oficial: regular `<=3`; suficiente `>3 <=6`; bom `>6 <=8`; otimo `>8`
- CBOs: cirurgiao-dentista
- SIGTAP oficial: numerador `0307010074`; denominador restauradores `0307010031`, `0307010074`, `0307010082`, `0307010090`, `0307010104`, `0307010112`, `0307010120`, `0307010139`
- modelos de informacao: procedimento odontologico individual
- janelas temporais: periodo do indicador
- implementacao anterior: ART + acoes coletivas sobre producao total
- divergencia: denominador e universo errados; coletiva nao faz parte da formula oficial
- decisao de correcao: `B6@2026.3`, usar ART/restauradores e remover coletiva

## Resultado do gate P0
- `C5`, `B3`, `B4`, `B5` e `B6` foram corrigidos no runtime canonico e validados local/publicamente.
- `requires_official_validation` foi mantido em todos.
- nenhum indicador foi promovido para `normative_validated`.
