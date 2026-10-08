import "server-only";
import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import type { BudgetReport, Dotacao } from "@/lib/budget";
import { recordKey } from "@/lib/record-key";

export class ImportError extends Error {}
const columns = [13, 14, 15, 16, 17, 19, 21] as const;
const actionPattern = /^\d{2}\.\d{2}\.\d{2}\.\d{3}\.\d{4}\.\d{4}$/;
const monetaryFields = ["dotacaoInicial", "dotacaoAtual", "preEmpenhado", "empenhado", "reservas", "bloqueios", "disponivel"] as const;

function cents(value: ExcelJS.CellValue, line: number): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "object" && "result" in value) return cents(value.result as ExcelJS.CellValue, line);
  // O exportador coloca inclusive valores monetários em richText inline, não em células numéricas.
  if (typeof value === "object" && "richText" in value) {
    const fragments = value.richText as Array<{ text: string }>;
    return cents(fragments.map((part) => part.text).join(""), line);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new ImportError(`Valor inválido na linha ${line}.`);
    return Math.round(value * 100);
  }
  if (typeof value !== "string") throw new ImportError(`Valor monetário inválido na linha ${line}.`);
  const clean = value.trim().replace(/R\$|\s/g, "");
  if (!clean || clean === "-") return 0;
  // Formato do relatório: 1.234,56. Também aceita valor inteiro sem separadores.
  if (!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(clean)) {
    throw new ImportError(`Valor monetário inesperado na linha ${line}: ${value}.`);
  }
  const parsed = Number(clean.replaceAll(".", "").replace(",", "."));
  if (!Number.isFinite(parsed)) throw new ImportError(`Valor inválido na linha ${line}.`);
  return Math.round(parsed * 100);
}

export async function parseXls(buffer: Buffer): Promise<BudgetReport> {
  // Este exportador gera OOXML (XLSX) mesmo usando a extensão .xls.
  if (buffer.length < 4 || buffer.subarray(0, 4).toString("hex") !== "504b0304") {
    throw new ImportError("O arquivo deve ser Excel XLSX/OOXML. Este programa exporta OOXML mesmo com extensão .xls; arquivos XLS binários antigos não são suportados.");
  }
  const book = new ExcelJS.Workbook();
  try { await book.xlsx.load(buffer as never); }
  catch { throw new ImportError("Não foi possível abrir o Excel. Verifique se o arquivo não está corrompido."); }
  const sheet = book.worksheets[0];
  if (!sheet || sheet.rowCount > 30_000) throw new ImportError("Planilha ausente ou grande demais (máximo de 30.000 linhas).");

  let orgaoCodigo = "", orgao = "", unidadeCodigo = "", unidade = "", acaoCodigo = "", acao = "";
  let referencia = "";
  const registros: Dotacao[] = [];
  const keys = new Set<string>();
  sheet.eachRow((row, line) => {
    const text = (column: number) => row.getCell(column).text.trim();
    const colC = text(3);
    if (!referencia) {
      const date = text(20).match(/\b(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})\b/);
      if (date) referencia = date[1];
    }
    if (text(4) === "ÓRGÃO") { orgaoCodigo = text(9); orgao = text(11); }
    if (text(4) === "UNIDADE") { unidadeCodigo = text(9); unidade = text(11); }
    if (actionPattern.test(colC)) { acaoCodigo = colC; acao = text(12); }
    if (!/^\d{1,7}$/.test(colC) || !text(6) || !text(12) || !text(13)) return;
    if (!orgaoCodigo || !unidadeCodigo || !acaoCodigo) throw new ImportError(`Estrutura de órgão, unidade ou ação incompleta na linha ${line}.`);
    const [naturezaCodigo, fonteCodigo] = text(6).split(/\s+/);
    if (!naturezaCodigo || !fonteCodigo) throw new ImportError(`Códigos de natureza/fonte incompletos na linha ${line}.`);
    const [dotacaoInicial, dotacaoAtual, preEmpenhado, empenhado, reservas, bloqueios, disponivel] =
      columns.map((c) => cents(row.getCell(c).value, line));
    const record: Dotacao = { id: colC, orgaoCodigo, orgao, unidadeCodigo, unidade, acaoCodigo, acao,
      naturezaCodigo, fonteCodigo, descricao: text(12), dotacaoInicial, dotacaoAtual, preEmpenhado,
      empenhado, reservas, bloqueios, disponivel };
    if (record.dotacaoAtual - record.preEmpenhado - record.empenhado - record.reservas - record.bloqueios !== record.disponivel) {
      throw new ImportError(`Divergência entre dotação atual e disponível na linha ${line} (rubrica ${colC}).`);
    }
    const key = recordKey(record);
    if (keys.has(key)) throw new ImportError(`Rubrica repetida dentro do arquivo na linha ${line}: ${colC}.`);
    keys.add(key);
    registros.push(record);
  });
  if (!referencia) throw new ImportError("Data de referência não encontrada. Confirme que é o relatório de dotações disponíveis.");
  if (!registros.length) throw new ImportError("Nenhuma dotação encontrada. Confirme o modelo do relatório.");
  const [, , year] = referencia.substring(0, 10).split("/");
  if (!year || !Number.isInteger(Number(year))) throw new ImportError("Exercício não identificado.");
  return { referencia, exercicio: Number(year), municipio: "São Francisco de Paula / RS", registros };
}

export function snapshotHash(report: BudgetReport) {
  const stable = [...report.registros].sort((a, b) => recordKey(a).localeCompare(recordKey(b)));
  return createHash("sha256").update(JSON.stringify({ ref: report.referencia, year: report.exercicio, entries: stable })).digest("hex");
}

export function validateReportShape(report: BudgetReport) {
  for (const r of report.registros) for (const field of monetaryFields) {
    if (!Number.isSafeInteger(r[field])) throw new ImportError(`Valor fora do intervalo para ${field}.`);
  }
}
