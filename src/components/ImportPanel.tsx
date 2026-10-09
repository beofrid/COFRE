"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, FileSpreadsheet, FileUp, Info, LoaderCircle, ShieldCheck } from "lucide-react";
import { humanDate, money } from "@/lib/budget";
import type { ImportSummary } from "@/lib/sheets";

type Preview = {
  referencia: string; exercicio: number; registros: number; saldoCentavos: number; podeSalvar: boolean; motivo?: string | null;
  comparativo: null | { alteradas: number; novas: number; ausentes: number; diferenca: number };
};
export default function ImportPanel({ imports, connected, demo }: { imports: ImportSummary[]; connected: boolean; demo: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function send(endpoint: string) {
    if (!file) return null;
    const body = new FormData(); body.append("arquivo", file);
    const response = await fetch(endpoint, { method: "POST", body });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Não foi possível processar o arquivo.");
    return result;
  }
  async function validate() {
    setBusy(true); setError(""); setMessage(""); setPreview(null);
    try { setPreview(await send("/api/importacoes/validar") as Preview); }
    catch (e) { setError(e instanceof Error ? e.message : "Arquivo inválido."); }
    finally { setBusy(false); }
  }
  function cancelPreview() {
    if (busy) return;
    setPreview(null);
    setFile(null);
    setError("");
    setMessage("");
    if (input.current) input.current.value = "";
  }
  async function persist() {
    setBusy(true); setError(""); setMessage("");
    try {
      await send("/api/importacoes");
      setMessage("Referência salva com sucesso no Google Sheets!"); setPreview(null); setFile(null);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao gravar."); }
    finally { setBusy(false); }
  }
  return <>
    <section className="panel upload-panel">
      <div className="panel-header"><div><h2>Nova importação semanal</h2><p>Selecione o relatório Excel exportado pelo programa</p></div><FileUp size={20}/></div>
      <div className="upload-workspace"><label className="upload-zone"><FileSpreadsheet size={30}/><strong>{file ? file.name : "Escolher arquivo XLS ou XLSX"}</strong><span>Até 3,5 MB · validação antes de salvar</span>
        <input type="file" ref={input} accept=".xls,.xlsx" onChange={e => { setFile(e.target.files?.[0] ?? null); setPreview(null); setError(""); setMessage(""); }} /></label>
      <button className="export-btn" disabled={!file || busy} onClick={validate}>{busy ? <LoaderCircle size={16} className="spin"/> : <ShieldCheck size={16}/>} Validar arquivo</button></div>
      {preview && <div className="import-preview"><strong><Check size={16}/> Arquivo validado</strong>
        <div className="preview-stats"><div><span>Referência</span><b>{preview.referencia}</b></div><div><span>Dotações</span><b>{preview.registros}</b></div><div><span>Disponibilidade</span><b>{money(preview.saldoCentavos)}</b></div></div>
        {preview.comparativo && <p>Em relação à última referência: <b>{preview.comparativo.alteradas} alteradas</b>, {preview.comparativo.novas} novas, {preview.comparativo.ausentes} ausentes; variação de {money(preview.comparativo.diferenca)}.</p>}
        <div className="preview-actions">
          <button className="confirm-btn" disabled={busy || !preview.podeSalvar} onClick={persist}>{busy ? "Salvando…" : "Confirmar e salvar histórico"}</button>
          <button className="cancel-btn" type="button" disabled={busy} onClick={cancelPreview}>Cancelar</button>
        </div>
        {!preview.podeSalvar && <p>{preview.motivo ?? "Não é possível salvar esta referência."}</p>}
      </div>}
      {error && <div role="alert" className="import-alert error">{error}</div>}
      {message && <div role="status" className="import-alert success">{message}</div>}
      {!connected && <div className="import-note"><Info size={18}/><div><strong>Google Sheets não configurado</strong><p>A validação funciona, mas o armazenamento exige as variáveis de ambiente no servidor. Veja o README.</p></div></div>}
    </section>
    <div className="section-line"><div><h2>Histórico de importações</h2><span>{imports.length ? "Dados armazenados no Google Sheets" : "Nenhuma referência persistida ainda"}</span></div><span className="count-pill">{imports.length} importações</span></div>
    <section className="panel imports-panel">
      {imports.map((entry) => <div className="import-item" key={entry.importId}><span className="import-file-icon"><FileSpreadsheet size={23}/></span><div className="import-details"><strong>{entry.arquivo}</strong><span>Referência: {humanDate(entry.referencia)} · Exercício {entry.exercicio}</span></div><span className="import-count">{entry.registros} dotações</span><span className="status-ok"><Check size={14}/> Validado</span></div>)}
      {!imports.length && <div className="import-note"><CalendarDays size={17}/><div><strong>{demo ? "Dados demonstrativos disponíveis" : "Nenhum registro"}</strong><p>O dashboard mostra a referência do arquivo de exemplo até que você importe o primeiro XLS para o Google Sheets.</p></div></div>}
    </section>
  </>;
}
