"use client";
import { Activity, ArrowDownRight, ArrowUpRight, Clock3, FileClock } from "lucide-react";
import { humanDate, money } from "@/lib/budget";
import type { Comparison } from "@/lib/compare";
import type { ImportSummary } from "@/lib/sheets";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ComparisonPanel({ comparison, imports }: { comparison: Comparison | null; imports: ImportSummary[] }) {
  if (!comparison) return <section className="panel comparison-empty"><FileClock size={32}/><h2>Aguardando segunda importação</h2><p>Importe duas referências diferentes para acompanhar aumentos, reduções, dotações novas e ausentes.</p></section>;
  const history = [...imports].reverse().map((x) => ({ data: x.referencia.slice(0, 10), saldo: x.saldoCentavos }));
  return <>
    <section className="panel trend-panel"><div className="panel-header"><div><h2>Evolução do saldo disponível</h2><p>Histórico de todas as referências importadas</p></div></div>
      <ResponsiveContainer width="100%" height={235}><LineChart data={history} margin={{ top: 12, right: 25, left: 4, bottom: 6 }}>
      <CartesianGrid stroke="#edf1f4" strokeDasharray="4 4"/><XAxis dataKey="data" tick={{ fontSize: 11 }} />
      <YAxis tickFormatter={v => `R$ ${(Number(v)/100000000).toFixed(1)} mi`} tick={{ fontSize: 11 }}/>
      <Tooltip formatter={v => money(Number(v))}/><Line dataKey="saldo" stroke="#167e63" strokeWidth={3} type="monotone" dot={{ r: 4 }}/></LineChart></ResponsiveContainer>
    </section>
    <div className="compare-period"><Clock3 size={16}/> {humanDate(comparison.anterior)} <span>→</span> {humanDate(comparison.atual)}</div>
    <section className="compare-kpis"><div className="panel"><span>Anterior</span><strong>{money(comparison.totalAnterior)}</strong></div><div className="panel"><span>Atual</span><strong>{money(comparison.totalAtual)}</strong></div><div className="panel"><span>Variação</span><strong>{money(comparison.totalAtual - comparison.totalAnterior)}</strong></div><div className="panel"><span>Alteradas / novas / ausentes</span><strong>{comparison.alteradas} / {comparison.novas} / {comparison.ausentes}</strong></div></section>
    <section className="panel records-panel"><div className="panel-header"><div><h2>Movimentações identificadas</h2><p>{comparison.mudancas.length} dotações com diferenças entre as referências</p></div><Activity size={19}/></div>
      <div className="table-scroll"><table><thead><tr><th>Rubrica / descrição</th><th>Unidade · fonte</th><th>Tipo</th><th className="table-money">Antes</th><th className="table-money">Agora</th><th className="table-money">Diferença</th></tr></thead>
      <tbody>{comparison.mudancas.map((item) => <tr key={item.key}><td><div className="cell-main">{item.item.id} · {item.item.descricao}</div><div className="cell-muted" title={item.item.acao}>{item.item.acaoCodigo}</div></td><td><div className="cell-main">{item.item.unidade}</div><div className="cell-muted">{item.item.fonteCodigo}</div></td><td><span className="type-chip">{item.tipo === "outros" ? "Outros valores" : item.tipo}</span></td><td className="table-money">{money(item.anterior)}</td><td className="table-money">{money(item.atual)}</td><td className="table-money"><span className={item.diferenca >= 0 ? "positive" : "negative"}>{item.diferenca > 0 ? <ArrowUpRight size={14}/> : item.diferenca < 0 ? <ArrowDownRight size={14}/> : null}{money(item.diferenca)}</span></td></tr>)}</tbody>
      </table>{!comparison.mudancas.length && <p className="no-comparison">Nenhuma diferença encontrada.</p>}</div>
    </section>
  </>;
}
