import "server-only";
import type { BudgetReport, Dotacao } from "@/lib/budget";
import { snapshotHash } from "@/lib/parse-xls";

export type ImportSummary = {
  importId: string;
  referencia: string;
  exercicio: number;
  municipio: string;
  arquivo: string;
  criadoEm: string;
  registros: number;
  saldoCentavos: number;
  hash: string;
};

type ApiResponse = {
  sucesso: boolean;
  erro?: string;
  importacao?: ImportSummary;
  importacoes?: ImportSummary[];
  linhas?: unknown[][];
  sistema?: string;
  banco?: string;
  abas?: string[];
};

export const sheetsConfigured = () => Boolean(process.env.COFRE_SCRIPT_URL && process.env.COFRE_API_KEY);

/** A chave do Apps Script nunca sai do servidor Next.js. */
async function callScript(acao: string, args: Record<string, unknown> = {}): Promise<ApiResponse> {
  const url = process.env.COFRE_SCRIPT_URL;
  const chave = process.env.COFRE_API_KEY;
  if (!url || !chave) throw new Error("Configure COFRE_SCRIPT_URL e COFRE_API_KEY no .env.local.");

  const target = new URL(url);
  if (target.protocol !== "https:" || target.hostname !== "script.google.com" || !/^\/macros\/s\/[^/]+\/exec$/.test(target.pathname)) {
    throw new Error("COFRE_SCRIPT_URL inválida: utilize a URL de implantação /exec do Apps Script.");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...args, acao, chave }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    throw new Error("Não foi possível acessar o COFRE_API. Verifique URL, implantação e conexão.");
  }

  if (!response.ok) {
    throw new Error(`COFRE_API respondeu HTTP ${response.status}. Verifique a publicação e as permissões.`);
  }

  let data: ApiResponse;
  try {
    data = await response.json() as ApiResponse;
  } catch {
    throw new Error("COFRE_API não retornou JSON. Confirme que a implantação é pública e executa como você.");
  }
  if (!data.sucesso) throw new Error(data.erro || `Falha na ação ${acao} do COFRE_API.`);
  return data;
}

function timestamp(value: string): number {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  return match ? Date.UTC(+match[3], +match[2] - 1, +match[1], +match[4], +match[5]) : 0;
}

export async function testConnection() {
  const { sucesso, sistema, banco, abas } = await callScript("status");
  return { sucesso, sistema, banco, abas };
}

export async function listImports(): Promise<ImportSummary[]> {
  if (!sheetsConfigured()) return [];
  const result = await callScript("listarImportacoes");
  if (!Array.isArray(result.importacoes)) throw new Error("Resposta inválida da ação listarImportacoes.");
  return result.importacoes
    .map(item => ({
      importId: String(item.importId),
      referencia: String(item.referencia),
      exercicio: Number(item.exercicio),
      municipio: String(item.municipio ?? ""),
      arquivo: String(item.arquivo ?? ""),
      criadoEm: String(item.criadoEm ?? ""),
      registros: Number(item.registros),
      saldoCentavos: Number(item.saldoCentavos),
      hash: String(item.hash ?? ""),
    }))
    .filter(item => /^[a-f0-9]{24}$/i.test(item.importId) && Number.isSafeInteger(item.registros))
    .sort((a, b) => timestamp(b.referencia) - timestamp(a.referencia) || b.criadoEm.localeCompare(a.criadoEm));
}

const text = (value: unknown) => String(value ?? "");
const money = (value: unknown) => Number(value ?? 0);

function decodeRecord(row: unknown[]): Dotacao {
  if (row.length !== 18) throw new Error("Linha com número incorreto de colunas em Dotacoes.");
  const result: Dotacao = {
    id: text(row[1]), orgaoCodigo: text(row[2]), orgao: text(row[3]),
    unidadeCodigo: text(row[4]), unidade: text(row[5]),
    acaoCodigo: text(row[6]), acao: text(row[7]),
    naturezaCodigo: text(row[8]), fonteCodigo: text(row[9]), descricao: text(row[10]),
    dotacaoInicial: money(row[11]), dotacaoAtual: money(row[12]), preEmpenhado: money(row[13]),
    empenhado: money(row[14]), reservas: money(row[15]), bloqueios: money(row[16]), disponivel: money(row[17]),
  };
  for (const field of ["dotacaoInicial", "dotacaoAtual", "preEmpenhado", "empenhado", "reservas", "bloqueios", "disponivel"] as const) {
    if (!Number.isSafeInteger(result[field])) throw new Error(`Valor inválido (${field}) na dotação ${result.id}.`);
  }
  return result;
}

export async function getReportsFor(imports: ImportSummary[]): Promise<Map<string, BudgetReport>> {
  if (!imports.length) return new Map();
  const lookup = new Map(imports.map(meta => [meta.importId, meta] as const));
  const res = await callScript("listarDotacoes", { importIds: [...lookup.keys()] });
  if (!Array.isArray(res.linhas)) throw new Error("Resposta inválida da ação listarDotacoes.");
  const reports = new Map(imports.map(meta => [meta.importId, {
    referencia: meta.referencia, exercicio: meta.exercicio, municipio: meta.municipio, registros: [] as Dotacao[],
  }] as const));
  for (const row of res.linhas) {
    if (!Array.isArray(row) || !lookup.has(text(row[0]))) continue;
    reports.get(text(row[0]))!.registros.push(decodeRecord(row));
  }
  for (const meta of imports) {
    const current = reports.get(meta.importId)!;
    if (current.registros.length !== meta.registros || current.registros.reduce((total, row) => total + row.disponivel, 0) !== meta.saldoCentavos) {
      throw new Error(`O histórico da referência ${meta.referencia} está incompleto ou divergente.`);
    }
  }
  return reports;
}

export async function saveReport(report: BudgetReport, filename: string): Promise<ImportSummary> {
  if (!sheetsConfigured()) throw new Error("COFRE_API não configurada no servidor.");
  if (report.registros.length > 3000) throw new Error("O Apps Script aceita até 3.000 dotações por importação.");
  const hash = snapshotHash(report);
  const existing = await listImports();
  if (existing.some(x => x.hash === hash)) throw new Error("Este arquivo já foi importado.");
  if (existing.some(x => x.referencia === report.referencia && x.exercicio === report.exercicio)) {
    throw new Error("Já existe importação para esta data e hora de referência.");
  }
  const response = await callScript("salvarImportacao", {
    hash,
    arquivo: filename.slice(0, 160),
    relatorio: report,
  });
  if (!response.importacao || response.importacao.importId !== hash.slice(0, 24)) {
    throw new Error("O Apps Script não confirmou a gravação. Consulte a aba Importacoes antes de repetir.");
  }
  return response.importacao;
}
