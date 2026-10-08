import { existsSync, readFileSync } from 'node:fs';

// Dados reais de teste ficam fora do Git; teste opcional caso exista.
const file = new URL('../src/data/relatorio.json', import.meta.url);
if (!existsSync(file)) {
  console.log('Amostra real não presente (src/data/ ignorado pelo Git). Teste de dados de origem omitido.');
  process.exit(0);
}
const data = JSON.parse(readFileSync(file, 'utf8'));
const registros = data.registros;
const sum = (key) => registros.reduce((acc, row) => acc + row[key], 0);
const divergentes = registros.filter((r) => r.dotacaoAtual !== r.preEmpenhado + r.empenhado + r.reservas + r.bloqueios + r.disponivel);
const identifiers = registros.map((r) => `${r.orgaoCodigo}.${r.unidadeCodigo}/${r.acaoCodigo}/${r.id}/${r.naturezaCodigo}/${r.fonteCodigo}`);
if (divergentes.length !== 0 || new Set(identifiers).size !== registros.length) {
  console.error('Falha na validação.', { quantidade: registros.length, disponivel: sum('disponivel'), divergentes: divergentes.length, duplicados: registros.length - new Set(identifiers).size });
  process.exit(1);
}
console.log(`Validação OK: ${registros.length} dotações; saldo em centavos ${sum('disponivel')}; sem divergências.`);
