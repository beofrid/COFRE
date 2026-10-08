"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3,
  CalendarDays, Check, ChevronLeft, ChevronRight, CircleHelp, Clock3,
  Download, FileClock, FileSpreadsheet, FilterX, Landmark, LayoutDashboard,
  Menu, PieChart as PieIcon, Search, ShieldCheck, SlidersHorizontal,
  TableProperties, Wallet, X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  type BudgetReport, type Dotacao, type GroupKey,
  csvFromRows, groupBy, humanDate, money, pct, shortMoney, total,
} from "@/lib/budget";

type View = "dashboard" | "dotacoes" | "comparativo" | "importacoes";

type Selection = { unidade: string; acao: string; fonte: string; natureza: string; search: string };
const emptySelection: Selection = { unidade: "", acao: "", fonte: "", natureza: "", search: "" };
const groupOptions: { value: GroupKey; label: string }[] = [
  { value: "unidade", label: "Unidade" },
  { value: "acao", label: "Ação" },
  { value: "natureza", label: "Natureza" },
  { value: "fonte", label: "Fonte" },
];
const nav: { view: View; label: string; icon: typeof LayoutDashboard }[] = [
  { view: "dashboard", label: "Visão geral", icon: LayoutDashboard },
  { view: "dotacoes", label: "Dotações", icon: TableProperties },
  { view: "comparativo", label: "Comparativos", icon: Activity },
  { view: "importacoes", label: "Importações", icon: FileClock },
];

function labelTrunc(text: string, length = 26) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { label?: string; code?: string }; value?: number }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{point.payload?.label ?? point.payload?.code}</div>
      <div className="chart-tooltip-value">{money(Number(point.value ?? 0))}</div>
    </div>
  );
}

function SelectFilter({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  return (
    <label className="filter-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Kpi({ label, amount, icon: Icon, detail, emphasis = false, percent }: {
  label: string;
  amount: string;
  icon: typeof Wallet;
  detail: string;
  emphasis?: boolean;
  percent?: number;
}) {
  return (
    <article className={`kpi ${emphasis ? "kpi-emphasis" : ""}`}>
      <div className="kpi-top"><span>{label}</span><span className="kpi-icon"><Icon size={19} strokeWidth={1.8} /></span></div>
      <div className="kpi-value" title={amount}>{amount}</div>
      {percent !== undefined ? (
        <div className="kpi-footer progress-footer">
          <div className="progress"><div style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div>
          <span>{detail}</span>
        </div>
      ) : <div className="kpi-footer"><span className="small-indicator" /><span>{detail}</span></div>}
    </article>
  );
}

function saveCsv(rows: Dotacao[]) {
  const content = csvFromRows(rows);
  const file = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "dotacoes_filtradas_2026.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard({ report }: { report: BudgetReport }) {
  const [view, setView] = useState<View>("dashboard");
  const [filters, setFilters] = useState<Selection>(emptySelection);
  const [group, setGroup] = useState<GroupKey>("unidade");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const rows = report.registros;
  const options = useMemo(() => {
    const unique = (values: { value: string; label: string }[]) => [...new Map<string, { value: string; label: string }>(values.map((item) => [item.value, item] as const)).values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    return {
      unidade: unique(rows.map((r) => ({ value: `${r.unidadeCodigo}:${r.unidade}`, label: r.unidade }))),
      acao: unique(rows.map((r) => ({ value: r.acaoCodigo, label: `${r.acaoCodigo.split(".").at(-1)} · ${labelTrunc(r.acao, 45)}` }))),
      fonte: unique(rows.map((r) => ({ value: r.fonteCodigo, label: r.fonteCodigo }))),
      natureza: unique(rows.map((r) => ({ value: r.naturezaCodigo, label: `${r.naturezaCodigo.split(".").slice(0, 4).join(".")} · ${labelTrunc(r.descricao, 34)}` }))),
    };
  }, [rows]);

  const filtered = useMemo(() => rows.filter((row) => {
    const query = filters.search.toLocaleLowerCase("pt-BR").trim();
    return (!filters.unidade || `${row.unidadeCodigo}:${row.unidade}` === filters.unidade)
      && (!filters.acao || row.acaoCodigo === filters.acao)
      && (!filters.fonte || row.fonteCodigo === filters.fonte)
      && (!filters.natureza || row.naturezaCodigo === filters.natureza)
      && (!query || [row.id, row.unidade, row.acao, row.acaoCodigo, row.naturezaCodigo, row.fonteCodigo, row.descricao].some((v) => v.toLocaleLowerCase("pt-BR").includes(query)));
  }), [rows, filters]);

  const updated = (field: keyof Selection, value: string) => { setFilters((prev) => ({ ...prev, [field]: value })); setPage(1); };
  const reset = () => { setFilters(emptySelection); setPage(1); };
  const filterCount = [filters.unidade, filters.acao, filters.fonte, filters.natureza, filters.search].filter(Boolean).length;
  const available = total(filtered, "disponivel");
  const current = total(filtered, "dotacaoAtual");
  const committed = total(filtered, "empenhado");
  const reserved = total(filtered, "reservas");
  const blocked = total(filtered, "bloqueios");
  const preCommitted = total(filtered, "preEmpenhado");
  const currentPercent = pct(committed, current);
  const categories = useMemo(() => groupBy(filtered, group).slice(0, 8), [filtered, group]);
  const leading = useMemo(() => [...filtered].sort((a, b) => b.disponivel - a.disponivel).slice(0, 6), [filtered]);
  const tableRows = useMemo(() => [...filtered].sort((a, b) => b.disponivel - a.disponivel), [filtered]);
  const maxPage = Math.max(1, Math.ceil(tableRows.length / 12));
  const currentPage = Math.min(page, maxPage);
  const paginated = tableRows.slice((currentPage - 1) * 12, currentPage * 12);
  const donut = [
    { name: "Disponível", value: available, color: "#16A16D" },
    { name: "Empenhado", value: committed, color: "#3B79DA" },
    { name: "Reservas", value: reserved, color: "#D6A14D" },
    { name: "Pré-empenhado", value: preCommitted, color: "#8463C5" },
    { name: "Bloqueios", value: blocked, color: "#DB6A6A" },
  ].filter((item) => item.value > 0);

  const openView = (target: View) => { setView(target); setSidebarOpen(false); };
  const pageTitles: Record<View, { eyebrow: string; title: string; description: string }> = {
    dashboard: { eyebrow: "PAINEL FINANCEIRO", title: "Visão geral", description: "Acompanhe a disponibilidade orçamentária e seus principais indicadores." },
    dotacoes: { eyebrow: "CONSULTA DETALHADA", title: "Dotações orçamentárias", description: "Encontre e exporte informações das dotações por código, unidade, fonte e natureza." },
    comparativo: { eyebrow: "EVOLUÇÃO DOS RECURSOS", title: "Comparativos", description: "Compare referências semanais e identifique mudanças nos valores." },
    importacoes: { eyebrow: "CONTROLE DE DADOS", title: "Importações", description: "Acompanhe as referências disponíveis na base orçamentária." },
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Fechar navegação" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><Landmark size={22} strokeWidth={2.1} /></div>
          <div className="brand-copy"><strong>COFRE</strong><span>Controle Oficial de Finanças e Recursos da Educação</span></div>
          <button className="sidebar-close" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <div className="sidebar-section-title">ESPAÇO DE TRABALHO</div>
        <nav className="main-nav" aria-label="Navegação principal">
          {nav.map(({ view: target, label, icon: Icon }) => (
            <button className={`nav-link ${view === target ? "nav-active" : ""}`} onClick={() => openView(target)} key={target}>
              <Icon size={19} strokeWidth={1.9} /><span>{label}</span>
              {target === "importacoes" && <span className="nav-count">1</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <span className="sidebar-note-icon"><ShieldCheck size={17} /></span>
          <strong>Base verificada</strong>
          <p>Os valores desta referência passaram por validação contábil.</p>
          <span className="sidebar-note-date"><Check size={13} /> 343 registros consistentes</span>
        </div>
        <div className="sidebar-footer"><div className="profile-avatar">SF</div><div><strong>Educação municipal</strong><span>São Francisco de Paula / RS</span></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button>
            <span className="breadcrumbs">Orçamento <ChevronRight size={14} /> <strong>{view === "dashboard" ? "Visão geral" : pageTitles[view].title}</strong></span>
          </div>
          <div className="topbar-right"><span className="updated-dot" /><span>Relatório de {humanDate(report.referencia)}</span><span className="avatar">SF</span></div>
        </header>

        <div className="page-container">
          <section className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" />{pageTitles[view].eyebrow}</div><h1>{pageTitles[view].title}</h1><p>{pageTitles[view].description}</p></div>
            <div className="year-badge"><CalendarDays size={16} /> Exercício {report.exercicio}</div>
          </section>

          {(view === "dashboard" || view === "dotacoes") && (
            <section className="filters-bar" aria-label="Filtros do relatório">
              <div className="filter-title"><SlidersHorizontal size={17} /> Filtros <span>{filterCount > 0 ? `${filterCount} ativos` : ""}</span></div>
              <div className="filters-content">
                <SelectFilter label="Unidade" value={filters.unidade} options={options.unidade} onChange={(v) => updated("unidade", v)} />
                <SelectFilter label="Ação" value={filters.acao} options={options.acao} onChange={(v) => updated("acao", v)} />
                <SelectFilter label="Natureza" value={filters.natureza} options={options.natureza} onChange={(v) => updated("natureza", v)} />
                <SelectFilter label="Fonte" value={filters.fonte} options={options.fonte} onChange={(v) => updated("fonte", v)} />
                <label className="filter-search"><Search size={17} /><input value={filters.search} onChange={(e) => updated("search", e.target.value)} placeholder="Buscar dotação..." aria-label="Buscar dotação" /></label>
                {filterCount > 0 && <button className="clear-filters" onClick={reset}><FilterX size={16} /> Limpar</button>}
              </div>
            </section>
          )}

          {view === "dashboard" && <>
            <div className="section-line"><div><h2>Resumo orçamentário</h2><span>Dados consolidados dos filtros selecionados</span></div><span className="count-pill">{filtered.length} dotações</span></div>
            <section className="kpi-grid" aria-label="Indicadores financeiros">
              <Kpi label="Saldo disponível" amount={money(available)} icon={Wallet} detail="Recursos ainda disponíveis" emphasis />
              <Kpi label="Dotação atual" amount={money(current)} icon={Landmark} detail="Orçamento atualizado" />
              <Kpi label="Total empenhado" amount={money(committed)} icon={ArrowUpRight} detail="Compromissos registrados" />
              <Kpi label="Percentual empenhado" amount={`${currentPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} icon={BarChart3} detail="Da dotação atual" percent={currentPercent} />
            </section>

            <section className="analysis-grid" aria-label="Análise por agrupamento">
              <article className="panel categories-panel">
                <div className="panel-header"><div><h2>Distribuição de recursos</h2><p>Saldo disponível por agrupamento</p></div><label className="group-select-label"><span>Ver por</span><select value={group} onChange={(e) => setGroup(e.target.value as GroupKey)}>{groupOptions.map((opt) => <option value={opt.value} key={opt.value}>{opt.label}</option>)}</select></label></div>
                {categories.length ? (
                  <div className="bar-container"><ResponsiveContainer width="100%" height={332}>
                    <BarChart data={categories.map((d) => ({ ...d, short: labelTrunc(d.label, group === "fonte" ? 12 : 22) }))} layout="vertical" margin={{ top: 5, right: 24, left: 1, bottom: 0 }} barCategoryGap="34%">
                      <CartesianGrid stroke="#edf1f4" horizontal={false} />
                      <XAxis type="number" tickFormatter={shortMoney} tick={{ fontSize: 11, fill: "#94a0af" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="short" width={164} tick={{ fontSize: 11, fill: "#677486" }} axisLine={false} tickLine={false} interval={0} />
                      <Tooltip cursor={{ fill: "#f7faf9" }} content={<ChartTooltip />} />
                      <Bar dataKey="value" fill="#167e63" radius={[0, 5, 5, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer></div>
                ) : <EmptyFilter />}
                <div className="panel-footer"><span><span className="legend-dot green" /> Disponível</span><span>Até 8 grupos com maior saldo</span></div>
              </article>
              <article className="panel composition-panel">
                <div className="panel-header"><div><h2>Composição orçamentária</h2><p>Distribuição da dotação atual</p></div><PieIcon className="panel-icon" size={18} /></div>
                {current > 0 ? <>
                  <div className="donut-chart"><ResponsiveContainer width="100%" height={236}>
                    <PieChart><Pie data={donut} dataKey="value" nameKey="name" innerRadius={77} outerRadius={98} paddingAngle={2} strokeWidth={0}>
                      {donut.map((slice) => <Cell fill={slice.color} key={slice.name} />)}
                    </Pie><Tooltip formatter={(value) => money(Number(value))} /></PieChart>
                  </ResponsiveContainer><div className="donut-center"><span>Dotação atual</span><strong>{shortMoney(current)}</strong></div></div>
                  <div className="composition-list">{donut.map((part) => <div className="composition-item" key={part.name}><span className="composition-name"><i style={{ background: part.color }} />{part.name}</span><span className="composition-numeric"><strong>{money(part.value)}</strong><small>{pct(part.value, current).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</small></span></div>)}</div>
                </> : <EmptyFilter />}
              </article>
            </section>

            <section className="detail-grid">
              <article className="panel highlights-panel">
                <div className="panel-header"><div><h2>Maiores saldos disponíveis</h2><p>Dotações com maior disponibilidade</p></div><button className="text-link" onClick={() => openView("dotacoes")}>Ver todas <ArrowRight size={15} /></button></div>
                {leading.length ? <div className="highlight-list">{leading.map((row) => <div className="highlight-item" key={`${row.id}:${row.fonteCodigo}`}><div className="rank-icon">{row.id}</div><div className="highlight-description"><strong title={row.descricao}>{row.descricao}</strong><span title={`${row.unidade} · ${row.acao}`}>{row.unidade} · {labelTrunc(row.acao, 35)}</span></div><div className="highlight-amount">{money(row.disponivel)}</div></div>)}</div> : <EmptyFilter />}
              </article>
              <aside className="insight-card"><div className="insight-icon"><CircleHelp size={22} /></div><span className="insight-kicker">LEITURA DOS DADOS</span><h2>Um retrato claro dos recursos.</h2><p>Este painel apresenta a situação do orçamento em <strong>08 de outubro de 2026</strong>. A evolução semanal será exibida após a próxima importação.</p><div className="insight-bottom"><Clock3 size={15} /> 1 referência disponível</div></aside>
            </section>
          </>}

          {view === "dotacoes" && <>
            <div className="section-line"><div><h2>Relação de dotações</h2><span>{filtered.length} resultados encontrados</span></div><button className="export-btn" onClick={() => saveCsv(filtered)} disabled={!filtered.length}><Download size={16} /> Exportar CSV</button></div>
            <section className="panel records-panel">
              <div className="table-scroll"><table><thead><tr><th>Rubrica</th><th>Descrição / Natureza</th><th>Unidade / Ação</th><th>Fonte</th><th className="table-money">Dotação atual</th><th className="table-money">Empenhado</th><th className="table-money">Disponível</th></tr></thead>
                <tbody>{paginated.map((row) => <tr key={`${row.id}-${row.fonteCodigo}`}><td><span className="code-badge">{row.id}</span></td><td><div className="cell-main" title={row.descricao}>{row.descricao}</div><div className="cell-muted">{row.naturezaCodigo}</div></td><td><div className="cell-main">{row.unidade}</div><div className="cell-muted" title={row.acao}>{row.acaoCodigo}</div></td><td className="cell-mono">{row.fonteCodigo}</td><td className="table-money">{money(row.dotacaoAtual)}</td><td className="table-money">{money(row.empenhado)}</td><td className={`table-money amount-available ${row.disponivel <= 0 ? "zero" : ""}`}>{money(row.disponivel)}</td></tr>)}</tbody>
              </table>{!paginated.length && <EmptyFilter />}</div>
              <div className="table-footer"><span>Exibindo {filtered.length === 0 ? 0 : (currentPage - 1) * 12 + 1}–{Math.min(currentPage * 12, filtered.length)} de {filtered.length}</span><div className="pagination"><button aria-label="Página anterior" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}><ChevronLeft size={18} /></button><span>Página {currentPage} de {maxPage}</span><button aria-label="Próxima página" onClick={() => setPage(Math.min(maxPage, currentPage + 1))} disabled={currentPage >= maxPage}><ChevronRight size={18} /></button></div></div>
            </section>
          </>}

          {view === "comparativo" && <section className="placeholder-panel panel"><div className="placeholder-visual"><Activity size={33} /></div><span className="placeholder-badge">PRÓXIMA ETAPA</span><h2>Histórico a partir da segunda referência</h2><p>Já temos a fotografia de {humanDate(report.referencia)}. Com mais uma importação, poderemos calcular aumentos, reduções, dotações novas e dotações ausentes.</p><div className="mini-steps"><div><span className="step-check"><Check size={16} /></span><strong>1ª referência</strong><small>08/10/2026</small></div><span className="step-line" /><div><span className="step-next"><ArrowRight size={16} /></span><strong>2ª referência</strong><small>Aguardando importação</small></div></div></section>}

          {view === "importacoes" && <><div className="section-line"><div><h2>Referências cadastradas</h2><span>Uma fotografia orçamentária disponível</span></div><span className="count-pill">1 importação</span></div><section className="panel imports-panel"><div className="import-item"><span className="import-file-icon"><FileSpreadsheet size={23} /></span><div className="import-details"><strong>Relatório completo de dotações disponíveis</strong><span>Referência: {humanDate(report.referencia)} · Exercício {report.exercicio}</span></div><span className="import-count">343 dotações</span><span className="status-ok"><Check size={14} /> Validado</span></div><div className="import-note"><CalendarDays size={17} /><div><strong>Próxima importação semanal</strong><p>O envio de arquivos XLS pelo navegador e o salvamento do histórico no Google Sheets serão implementados na próxima etapa.</p></div></div></section></>}

          <footer className="page-footer"><span>Assistente de Orçamento · Secretaria Municipal de Educação</span><span>Dados: {humanDate(report.referencia)}</span></footer>
        </div>
      </main>
    </div>
  );
}

function EmptyFilter() {
  return <div className="empty-filter"><Search size={23} /><strong>Nenhum resultado</strong><span>Altere os filtros para encontrar registros.</span></div>;
}
