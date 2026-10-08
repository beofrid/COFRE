import "server-only";
import type { BudgetReport } from "@/lib/budget";

// Demonstração fictícia para a interface compilar sem qualquer dado real no Git.
// Substituída pelos dados da planilha COFRE_DB_API após a primeira importação.
export const exampleReport: BudgetReport = {
  referencia: "01/01/2026 00:00",
  exercicio: 2026,
  municipio: "EXEMPLO — Dados fictícios",
  registros: [
    {
      id: "101", orgaoCodigo: "01", orgao: "Órgão exemplo",
      unidadeCodigo: "001", unidade: "Unidade fictícia A",
      acaoCodigo: "01.01.01.001.0001.0001", acao: "Ação ilustrativa A",
      naturezaCodigo: "3.3.90.30", fonteCodigo: "1500", descricao: "Material de consumo (exemplo)",
      dotacaoInicial: 50000000, dotacaoAtual: 60000000, preEmpenhado: 1000000,
      empenhado: 25000000, reservas: 5000000, bloqueios: 4000000, disponivel: 25000000,
    },
    {
      id: "102", orgaoCodigo: "01", orgao: "Órgão exemplo",
      unidadeCodigo: "002", unidade: "Unidade fictícia B",
      acaoCodigo: "01.01.01.001.0002.0002", acao: "Ação ilustrativa B",
      naturezaCodigo: "3.3.90.39", fonteCodigo: "1540", descricao: "Serviços (exemplo)",
      dotacaoInicial: 40000000, dotacaoAtual: 40000000, preEmpenhado: 2000000,
      empenhado: 15000000, reservas: 3000000, bloqueios: 0, disponivel: 20000000,
    },
  ],
};
