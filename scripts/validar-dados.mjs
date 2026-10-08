import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(new URL('../src/data/relatorio.json', import.meta.url), 'utf8'));
const registros = data.registros;
const sum = (key) => registros.reduce((acc, row) => acc + row[key], 0);
const divergentes = registros.filter((r) => r.dotacaoAtual !== r.preEmpenhado + r.empenhado + r.reservas + r.bloqueios + r.disponivel);
const identifiers = registros.map((r) => `${r.orgaoCodigo}.${r.unidadeCodigo}/${r.acaoCodigo}/${r.id}/${r.naturezaCodigo}/${r.fonteCodigo}`);
if (registros.length !== 343 || sum('disponivel') !== 945388015 || divergentes.length !== 0 || new Set(identifiers).size !== registros.length) {
  console.error('Falha na validação.', { quantidade: registros.length, disponivel: sum('disponivel'), divergentes: divergentes.length, duplicados: registros.length - new Set(identifiers).size });
  process.exit(1);
}
console.log('Validação OK: 343 dotações; saldo R$ 9.453.880,15; nenhuma divergência ou chave duplicada.');
