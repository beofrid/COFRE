import type { Dotacao } from "@/lib/budget";

/** O Google Sheets pode eliminar zeros à esquerda em códigos numéricos. */
export function normalizeRubricaId(value: string | number) {
  const id = String(value).trim();
  return /^\d+$/.test(id) ? id.replace(/^0+(?=\d)/, "") : id;
}

function normalizeShortCode(value: string) {
  const code = String(value).trim();
  return /^\d+$/.test(code) ? code.replace(/^0+(?=\d)/, "") : code;
}

/** Chave completa: preservada para detectar duplicatas e calcular o hash. */
export function recordKey(r: Dotacao) {
  return [
    normalizeShortCode(r.orgaoCodigo),
    normalizeShortCode(r.unidadeCodigo),
    String(r.acaoCodigo).trim(),
    normalizeRubricaId(r.id),
    String(r.naturezaCodigo).trim(),
    String(r.fonteCodigo).trim(),
  ].join("|");
}
