"use client";
import { useState } from "react";
import { Landmark, LockKeyhole } from "lucide-react";
export default function Entrar() {
  const [senha, setSenha] = useState(""); const [erro, setErro] = useState(""); const [busy, setBusy] = useState(false);
  async function entrar(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setErro("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha no login.");
      window.location.assign("/");
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha no acesso."); setBusy(false); }
  }
  return <main className="login-page"><form className="login-card" onSubmit={entrar}>
    <div className="brand-icon"><Landmark size={24}/></div><h1>Assistente de Orçamento</h1><p>Entre para acessar os dados orçamentários.</p>
    <label htmlFor="senha"><LockKeyhole size={15}/> Senha de acesso</label>
    <input id="senha" type="password" autoComplete="current-password" autoFocus required value={senha} onChange={e => setSenha(e.target.value)}/>
    {erro && <p className="login-error" role="alert">{erro}</p>}
    <button type="submit" disabled={busy}>{busy ? "Entrando…" : "Acessar painel"}</button>
  </form></main>;
}
