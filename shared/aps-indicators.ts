export const QUALITY_APS_CODES = [
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "M1",
  "M2",
] as const;

export const CVAT_CODES = [
  "CVAT1",
  "CVAT2",
  "CVAT3",
  "CVAT4",
  "CVAT5",
  "CVAT6",
] as const;

export const OPERATIONAL_METRIC_CODES = [
  ...QUALITY_APS_CODES,
  ...CVAT_CODES,
] as const;

export type IndicatorCode = (typeof OPERATIONAL_METRIC_CODES)[number];

export const CVAT_NOMINAL_CODES = ["CVAT1", "CVAT2", "CVAT3", "CVAT4"] as const;
export const NOMINAL_METRIC_CODES = ["C1", "B2", "B3", "B5", "B6", "M1", ...CVAT_NOMINAL_CODES] as const;
export type NominalMetricCode = (typeof NOMINAL_METRIC_CODES)[number];

export const QUALITY_APS_NAMES: Readonly<
  Record<(typeof QUALITY_APS_CODES)[number], string>
> = Object.freeze({
  B1: "Primeira Consulta Programada por equipe de Saúde Bucal",
  B2: "Tratamento Concluído por equipe de Saúde Bucal",
  B3: "Taxa de Exodontia por equipe de Saúde Bucal",
  B4: "Escovação Supervisionada em faixa etária escolar (6 a 12 anos)",
  B5: "Procedimentos Odontológicos Preventivos",
  B6: "Tratamento Restaurador Atraumático (ART)",
  C1: "Mais Acesso à APS",
  C2: "Cuidado no Desenvolvimento Infantil",
  C3: "Cuidado na Gestação e Puerpério",
  C4: "Cuidado da Pessoa com Diabetes",
  C5: "Cuidado da Pessoa com Hipertensão",
  C6: "Cuidado da Pessoa Idosa",
  C7: "Cuidado da Mulher na Prevenção do Câncer",
  M1: "Média de Atendimentos por Pessoa pela eMulti na APS",
  M2: "Ações Interprofissionais realizadas pela eMulti na APS",
});

export const CVAT_NAMES: Readonly<Record<(typeof CVAT_CODES)[number], string>> = {
  CVAT1: "Cadastro individual válido",
  CVAT2: "Cadastro individual e domiciliar completo",
  CVAT3: "Cadastro atualizado por modelo de informação",
  CVAT4: "Acompanhamento assistencial qualificado",
  CVAT5: "Vulnerabilidade e ponderação",
  CVAT6: "Vínculo, desempate e escore consolidado",
};

export const INDICATOR_NAMES: Readonly<Record<IndicatorCode, string>> = {
  ...QUALITY_APS_NAMES, ...CVAT_NAMES,
};

export const APS_INDICATOR_GROUPS = {
  primary: { name: "Atenção primária e Saúde da Família", codes: ["C1", "C2", "C3", "C4", "C5", "C6", "C7"] },
  dental: { name: "Saúde Bucal", codes: ["B1", "B2", "B3", "B4", "B5", "B6"] },
  multi: { name: "Equipes Multiprofissionais", codes: ["M1", "M2"] },
  territorial: { name: "Vínculo e Acompanhamento Territorial", codes: CVAT_CODES },
} as const;

export function isIndicatorCode(code: string): code is IndicatorCode {
  return (OPERATIONAL_METRIC_CODES as readonly string[]).includes(code);
}
