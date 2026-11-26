import { describe, expect, it } from "vitest";
import { parsePublicCvatCsv } from "./cvat-public";

const heading = "Ministério da Saúde - MS\nSistema de Informação para a Atenção Primária à Saúde - Siaps\n";
const header = "Quadrimestre/Ano;UF;Código IBGE;Município;Tipo de Equipe;Dimensão por tipo de equipe;Total de equipe - REGULAR;Total de equipe - SUFICIENTE;Total de equipe - BOM;Total de equipe - ÓTIMO";

describe("relatório público do CVAT", () => {
  it("preserva exclusivamente distribuições municipais no mesmo quadrimestre", () => {
    const source = `${heading}Relatorio Publico - Vínculo e Acompanhamento Territorial\n${header}\n` +
      '2026Q2\t;"BA\t";"990000\t";"Município sintético\t";"eSF\t";"CVAT - Dimensão Acompanhamento\t";0;1;1;10\n';
    expect(parsePublicCvatCsv(Buffer.from(source))).toMatchObject([
      { ibge: "990000", quarter: "2026Q2", teamType: "eSF", dimension: "acompanhamento", regular: 0, suficiente: 1, bom: 1, ótimo: 10 },
    ]);
  });

  it("rejeita arquivo nominal ou linha de formato incompatível", () => {
    expect(() => parsePublicCvatCsv(Buffer.from(`${heading}INE;Nome;CNS`))).toThrow();
    const source = `${heading}Relatorio Publico - Vínculo e Acompanhamento Territorial\n${header}\n` +
      "2026Q2;BA;990000;Município sintético;eSF;CVAT - Dimensão Cadastro;0;-1;1;10\n";
    expect(() => parsePublicCvatCsv(Buffer.from(source))).toThrow();
  });
});
