import "server-only";
import { parseXls, validateReportShape, ImportError } from "@/lib/parse-xls";

export const MAX_UPLOAD_SIZE = 3_500_000; // Vercel limita o request a 4,5 MB.
export async function readUploaded(request: Request) {
  const size = Number(request.headers.get("content-length") || 0);
  if (size > MAX_UPLOAD_SIZE + 200_000) throw new ImportError("Arquivo grande demais. Limite de 3,5 MB.");
  const body = await request.formData();
  const file = body.get("arquivo");
  if (!(file instanceof File) || !/\.xlsx?$/i.test(file.name)) throw new ImportError("Selecione um arquivo Excel .xls ou .xlsx.");
  if (file.size > MAX_UPLOAD_SIZE || file.size === 0) throw new ImportError("O arquivo deve ter até 3,5 MB.");
  const report = await parseXls(Buffer.from(await file.arrayBuffer()));
  validateReportShape(report);
  return { report, filename: file.name };
}
