import reportData from "@/data/relatorio.json";

export type Dotacao = {
  id: string;
  orgaoCodigo: string;
  orgao: string;
  unidadeCodigo: string;
  unidade: string;
  acaoCodigo: string;
  acao: string;
  naturezaCodigo: string;
  fonteCodigo: string;
  descricao: string;
  dotacaoInicial: number;
  dotacaoAtual: number;
  preEmpenhado: number;
  empenhado: number;
  reservas: number;
  bloqueios: number;
  disponivel: number;
};

export type BudgetReport = {
  referencia: string;
  exercicio: number;
  municipio: string;
  registros: Dotacao[];
};

// Base local temporária: substituir por leitura autenticada do Google Sheets numa etapa futura.
export const report = reportData as BudgetReport;

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function money(cents: number) {
  return brl.format(cents / 100);
}

export function shortMoney(cents: number) {
  const amount = cents / 100;
  if (Math.abs(amount) >= 1_000_000) return `R$ ${(amount / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (Math.abs(amount) >= 1000) return `R$ ${(amount / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return money(cents);
}

export function total(rows: Dotacao[], field: keyof Pick<Dotacao, "dotacaoAtual" | "dotacaoInicial" | "empenhado" | "disponivel" | "preEmpenhado" | "reservas" | "bloqueios">) {
  return rows.reduce((sum, row) => sum + row[field], 0);
}

export type GroupKey = "unidade" | "acao" | "natureza" | "fonte";

export function groupBy(rows: Dotacao[], key: GroupKey) {
  const buckets = new Map<string, { label: string; code: string; value: number; count: number }>();
  for (const row of rows) {
    const code = key === "unidade" ? `${row.unidadeCodigo}` : key === "acao" ? row.acaoCodigo : key === "natureza" ? row.naturezaCodigo : row.fonteCodigo;
    const label = key === "unidade" ? row.unidade : key === "acao" ? row.acao : key === "natureza" ? row.descricao : row.fonteCodigo;
    const current = buckets.get(code) ?? { label, code, value: 0, count: 0 };
    current.value += row.disponivel;
    current.count += 1;
    buckets.set(code, current);
  }
  return [...buckets.values()].sort((a, b) => b.value - a.value);
}

export function pct(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

export function humanDate(date: string) {
  const [day, month, yearAndTime] = date.split("/");
  const [year, hour] = yearAndTime.split(" ");
  return `${day}/${month}/${year} às ${hour}`;
}

export function csvFromRows(rows: Dotacao[]) {
  const columns = ["id", "orgao", "unidadeCodigo", "unidade", "acaoCodigo", "acao", "naturezaCodigo", "fonteCodigo", "descricao", "dotacaoInicial", "dotacaoAtual", "preEmpenhado", "empenhado", "reservas", "bloqueios", "disponivel"] as const;
  const headers = ["Rubrica", "Órgão", "Cód. unidade", "Unidade", "Cód. ação", "Ação", "Natureza", "Fonte", "Descrição", "Dotação inicial", "Dotação atual", "Pré-empenhado", "Empenhado", "Reservas", "Bloqueios", "Disponível"];
  const currencyColumns = new Set(["dotacaoInicial", "dotacaoAtual", "preEmpenhado", "empenhado", "reservas", "bloqueios", "disponivel"]);
  const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const lines = [headers.map(escapeCsv).join(";")];
  for (const row of rows) {
    lines.push(columns.map((column) => {
      const value = row[column];
      return escapeCsv(currencyColumns.has(column) ? (Number(value) / 100).toFixed(2).replace(".", ",") : String(value));
    }).join(";"));
  }
  return "\uFEFF" + lines.join("\r\n");
}
