# COFRE v0.3

**COFRE — Controle Orçamentário e de Finanças de Recursos da Educação**

Aplicação Next.js + TypeScript com dados em **COFRE_DB_API**, armazenados via Google Apps Script (sem conta de serviço do Google Cloud).

## Migração da v0.2

Esta versão troca as chamadas diretas à Google Sheets API pelas chamadas ao Apps Script.

**Antes de usar:** preserve seu `.env.local` local. O pacote contém somente `.env.example`, nunca suas credenciais.

1. Atualize o código do Next.js pelos arquivos desta versão. Preserve suas alterações particulares quando houver conflito.
2. No `Código.gs` do projeto `COFRE_API`, mantenha os blocos `status`, `listarImportacoes` e `salvarImportacao` já publicados. **Acrescente o conteúdo de `apps-script/ADICIONAR_DENTRO_DO_DOPOST.gs` dentro da função `doPost(e)`, depois da verificação de chave e antes de `Ação desconhecida`.**
3. No Apps Script: **Implantar > Gerenciar implantações > Editar > Nova versão > Implantar**. Confirme que executa como você e está publicado para *Qualquer pessoa*.
4. Em `.env.local`, configure:

```env
COFRE_SCRIPT_URL="https://script.google.com/macros/s/SEU_DEPLOYMENT_ID/exec"
COFRE_API_KEY="MESMA_CHAVE_DAS_PROPRIEDADES_DO_SCRIPT"
```

Deixe também `APP_PASSWORD` e `SESSION_SECRET` configuradas para login. Não exponha a chave usando `NEXT_PUBLIC_` e não faça commit do `.env.local`.

5. Instale dependências e inicie:

```bash
npm install
npm run dev
```

6. Faça login e abra `http://localhost:3000/api/cofre/status` para verificar a API. Depois abra **Importações**, selecione o Excel, clique **Validar arquivo** e **Confirmar e salvar histórico**.

As duas abas da planilha continuam com os nomes **Importacoes** e **Dotacoes**. Não altere a ordem das colunas.

## Fluxo

- Enquanto o banco estiver vazio, o dashboard mostra números **fictícios**, identificados como demonstração.
- O Next.js recebe e processa `.xls` (que contém OOXML no modelo do programa) e `.xlsx`.
- O usuário valida os totais e a data antes de confirmar.
- O servidor Next.js envia `{ acao: 'salvarImportacao', chave, hash, relatorio, arquivo }` ao Apps Script. A chave nunca vai para o navegador.
- O Apps Script grava a referência em `Importacoes` e todas as dotações em `Dotacoes`.
- O Next.js consulta `listarImportacoes` e `listarDotacoes` para popular a interface e comparar as últimas referências.

**Importante:** a nova ação `listarDotacoes` é necessária para abrir o dashboard quando existir pelo menos uma referência importada. Se ela não estiver implantada, a gravação pode funcionar, mas o painel não conseguirá ler as dotações. 

## Publicação na Vercel

- Adicione `APP_PASSWORD`, `SESSION_SECRET`, `COFRE_SCRIPT_URL` e `COFRE_API_KEY` às variáveis de ambiente da Vercel.
- Não configure `GOOGLE_SHEETS_ID`, `GOOGLE_CLIENT_EMAIL` ou `GOOGLE_PRIVATE_KEY`: a v0.3 não as utiliza.
- Use um repositório **privado**: o código usa apenas dados ilustrativos; seus dados reais em `src/data/` são ignorados pelo Git.

## Limites conhecidos

- O Apps Script tem cotas e tempo máximo de execução; uso semanal individual é o objetivo inicial.
- Este modelo usa uma senha compartilhada como MVP; para múltiplos usuários, evolua a autenticação.
- Não há transações no Google Sheets. Se uma gravação for interrompida, confira `Importacoes` e `Dotacoes` antes de repetir.
- A validação monetária usa centavos inteiros. A chave de identificação de cada dotação combina órgão, unidade, ação, código, natureza e fonte.
- Não há teste com sua implantação real no pacote: o teste de integração requer suas credenciais privadas.

## Verificações

```bash
npm run typecheck
npm run test:data
npm run build
```
