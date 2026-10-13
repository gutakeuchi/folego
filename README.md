# Fôlego — finanças pessoais

Protótipo funcional e responsivo de um produto para organização financeira pessoal. A interface foi pensada primeiro para celular, sem perder uma experiência completa no computador.

## Documentação para estudo

Leia o [guia completo do projeto](docs/GUIA-DE-ESTUDO.md): histórico, arquitetura, tecnologias, exemplos do código, React, TypeScript, armazenamento local, CSV, design mobile, PWA, Git/GitHub, limitações reais, plano de evolução e exercícios práticos.

## Tecnologias

- React 19 para componentes e estado da interface.
- TypeScript 5.9 para segurança de tipos e manutenção.
- Vite 8 para desenvolvimento e build de produção.
- Lucide React para ícones SVG consistentes e acessíveis.
- Manrope Variable para uma tipografia moderna e arredondada.
- CSS responsivo sem dependência de um framework visual.
- WebMCP experimental para expor a ação de adicionar uma movimentação a agentes compatíveis.

## Funcionalidades do protótipo

- Painel com saldo, receitas, despesas e saúde financeira.
- Lançamentos com busca, filtro, resumo mensal e importação/exportação CSV.
- Cadastro de receita ou despesa em modal responsivo.
- Contas e cartões.
- Planejamento e limites por categoria.
- Metas e aportes.
- Ocultação de valores financeiros.
- Navegação adaptada para desktop e mobile.

Os dados iniciais são demonstrativos. Os lançamentos da interface atual ficam salvos no armazenamento local deste navegador, sem sincronização entre aparelhos. Contas, planejamento e metas ainda têm partes demonstrativas.

O projeto contém manifesto PWA e service worker para instalação e cache offline quando servido por HTTPS (ou localhost no desenvolvimento). Abrir o HTML por `file://` serve apenas para prévia e não permite instalar o PWA.

`src/model.ts` e `src/useFinance.ts` são trabalhos em andamento para validação e sincronização. Ainda não estão conectados à interface e não existe uma API `/api/finance` funcional nesta versão. Login real, banco de dados e sincronização continuam pendentes. Não considere esta versão pronta para produção.

## Executar localmente

Requer Node.js 22.13 ou superior.

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. Para validar a versão de produção:

```bash
npm run typecheck
npm run build
npm run preview
```

## Estrutura principal

- `src/App.tsx`: componentes, telas e interações.
- `src/styles.css`: design system e responsividade.
- `src/main.tsx`: inicialização do React e fonte.
- `public/favicon.svg`: ícone do produto.
- `public/manifest.webmanifest` e `public/sw.js`: instalação e cache do PWA.
- `src/model.ts` e `src/useFinance.ts`: implementação em andamento, ainda não integrada.

## Acessar em outro computador

Baixe o código nesse computador, instale Node.js e execute os comandos acima. O código será o mesmo, mas os dados locais de um navegador não aparecem automaticamente em outro. Uma publicação HTTPS fornece um endereço compartilhável para acessar a interface; sincronizar os dados exige concluir o backend.
