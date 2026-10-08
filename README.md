# Assistente de Orçamento — versão 0.1

Dashboard orçamentário feito em **Next.js + TypeScript + Tailwind CSS + Recharts**.

## O que já funciona
- Indicadores financeiros calculados a partir de **343 dotações reais** do relatório de 08/10/2026.
- Filtros combináveis por unidade, ação, fonte, natureza e texto.
- Gráfico de disponibilidade agrupado (unidade, ação, natureza ou fonte).
- Composição dos valores da dotação atual.
- Tabela paginada de dotações com exportação CSV (somente registros filtrados).
- Telas informativas de comparativos e importações, sem dados de histórico inventados.

## Rodar localmente

Requisitos: Node.js 20.9 ou superior, npm e internet na primeira instalação.

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Publicar na Vercel

1. Envie este projeto a um repositório privado no GitHub.
2. Importe o repositório na Vercel, usando o preset Next.js.
3. Clique em Deploy. Nenhuma variável de ambiente é necessária **nesta demonstração**.

**Atenção:** os dados reais estão empacotados no aplicativo, portanto não publique publicamente sem avaliar a confidencialidade do relatório. Na etapa de produção, os dados serão obtidos no servidor, após autenticação e autorização.

## Origem dos dados

`src/data/relatorio.json`: fotografia normalizada da planilha `verificacao_dotacoes_disponiveis_completa_relatorio_1791483236716.xls` (arquivo XLS com estrutura XLSX), emitida em 08/10/2026 às 15:13.

Os valores monetários estão em **centavos inteiros** para evitar erro de arredondamento em JavaScript.

Valide: `npm run test:data`.

## Próximas etapas

1. Integração segura com Google Sheets (conta de serviço, variáveis secretas da Vercel, regras de acesso).
2. Upload de XLS semanal, parser e validações no backend, com proteção contra duplicação de importações.
3. Histórico e comparativo entre duas referências, com identificador composto por exercício, órgão, unidade, ação, rubrica, natureza e fonte.
4. Login e autorização de acesso. Não permitir leitura/escrita de planilhas privadas diretamente do navegador.

**Nesta versão não há conexão ao Google Sheets e nem upload de arquivo ativo.**
