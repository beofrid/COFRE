import type { Dotacao } from "@/lib/budget";
export function recordKey(r: Dotacao) {
  return [r.orgaoCodigo, r.unidadeCodigo, r.acaoCodigo, r.id, r.naturezaCodigo, r.fonteCodigo].join("|");
}
