import type { BudgetReport, Dotacao } from "@/lib/budget";
import { normalizeRubricaId, recordKey } from "@/lib/record-key";

export type Change = {
  key: string;
  item: Dotacao;
  tipo: "aumentou" | "diminuiu" | "outros" | "nova" | "ausente";
  anterior: number;
  atual: number;
  diferenca: number;
  mudancas: string[];
};
export type Comparison = { anterior: string; atual: string; totalAnterior: number; totalAtual: number; alteradas: number; novas: number; ausentes: number; mudancas: Change[] };
const numeric = ["dotacaoInicial", "dotacaoAtual", "preEmpenhado", "empenhado", "reservas", "bloqueios", "disponivel"] as const;

/**
 * A rubrica é o identificador estável entre exportações do mesmo exercício.
 * Para uma rubrica que se repita dentro de alguma referência, usamos a chave
 * completa como alternativa, evitando misturar lançamentos distintos.
 */
function indexingKeys(prev: Dotacao[], next: Dotacao[]) {
  const counts = new Map<string, number>();
  for (const item of [...prev, ...next]) {
    const id = normalizeRubricaId(item.id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const perReport = (rows: Dotacao[]) => {
    const local = new Map<string, number>();
    for (const item of rows) {
      const id = normalizeRubricaId(item.id);
      local.set(id, (local.get(id) ?? 0) + 1);
    }
    return new Map(rows.map(item => {
      const id = normalizeRubricaId(item.id);
      return [local.get(id) === 1 && (counts.get(id) ?? 0) <= 2 ? `rubrica:${id}` : `completo:${recordKey(item)}`, item] as const;
    }));
  };
  return { before: perReport(prev), after: perReport(next) };
}

export function compareReports(prev: BudgetReport, next: BudgetReport): Comparison {
  if (prev.exercicio !== next.exercicio) {
    throw new Error("Não é possível comparar referências de exercícios diferentes.");
  }
  const { before: prevByKey, after: nextByKey } = indexingKeys(prev.registros, next.registros);
  const changes: Change[] = [];
  for (const [key, row] of nextByKey) {
    const old = prevByKey.get(key);
    if (!old) changes.push({ key, item: row, tipo: "nova", anterior: 0, atual: row.disponivel, diferenca: row.disponivel, mudancas: ["Nova dotação"] });
    else {
      const changed = numeric.filter(name => row[name] !== old[name]);
      if (changed.length) {
        const dif = row.disponivel - old.disponivel;
        changes.push({ key, item: row, tipo: dif > 0 ? "aumentou" : dif < 0 ? "diminuiu" : "outros", anterior: old.disponivel, atual: row.disponivel, diferenca: dif, mudancas: [...changed] });
      }
    }
  }
  for (const [key, old] of prevByKey) if (!nextByKey.has(key)) changes.push({ key, item: old, tipo: "ausente", anterior: old.disponivel, atual: 0, diferenca: -old.disponivel, mudancas: ["Ausente no novo arquivo"] });
  changes.sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));
  return {
    anterior: prev.referencia, atual: next.referencia,
    totalAnterior: prev.registros.reduce((s, r) => s + r.disponivel, 0),
    totalAtual: next.registros.reduce((s, r) => s + r.disponivel, 0),
    alteradas: changes.filter(c => !["nova", "ausente"].includes(c.tipo)).length,
    novas: changes.filter(c => c.tipo === "nova").length,
    ausentes: changes.filter(c => c.tipo === "ausente").length,
    mudancas: changes,
  };
}
