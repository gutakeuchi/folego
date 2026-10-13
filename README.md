# Fôlego — finanças pessoais

Aplicativo web responsivo com React, TypeScript, Tailwind CSS 4 e backend Supabase. Prioriza o celular e permite registrar receitas/despesas, acompanhar contas, limites e metas.

## Documentação

- [Tailwind, backend e configuração atual](docs/TAILWIND-E-BACKEND.md).
- [Guia de estudo do protótipo v1](docs/GUIA-DE-ESTUDO.md), preservado como histórico.

## Funcionalidades

- Cadastro, login, saída e recuperação de senha via Supabase Auth.
- PostgreSQL com isolamento por usuário (RLS), validação e gravação com revisão.
- Criação, edição e exclusão de lançamentos, contas, limites e metas.
- Filtro mensal, busca e geração manual de recorrências.
- Valores em centavos e datas ISO; saldo e gastos calculados pelos registros.
- CSV, backup/restauração JSON e importação explícita da versão antiga.
- Demonstração local separada dos dados de conta.
- Preparação PWA com manifesto e service worker.

O banco já foi provisionado no projeto `bhbextfmjailoozdhidk`. O frontend está publicado em [gutakeuchi.github.io/folego](https://gutakeuchi.github.io/folego/) pelo GitHub Pages, com HTTPS. Os redirects do Auth ainda precisam ser configurados no painel Supabase; confirmação e recuperação por e-mail precisam de teste de aceitação com uma conta real.

## Usar no celular e publicação

Abra https://gutakeuchi.github.io/folego/ no navegador do celular. No Android, use o menu do Chrome para adicionar à tela inicial; no iPhone, use Compartilhar → Adicionar à Tela de Início no Safari. A disponibilidade da opção de instalação depende do navegador. A instalação e o modo offline ainda não foram validados em aparelhos reais.

Antes de testar cadastro e recuperação, no Supabase, acesse Authentication → URL Configuration. Defina Site URL como `https://gutakeuchi.github.io/folego/` e adicione aos Redirect URLs os endereços exatos `https://gutakeuchi.github.io/folego/` e `https://gutakeuchi.github.io/folego/?recovery=1`. Preserve os redirects de desenvolvimento necessários. Não desative confirmação de e-mail nem RLS.

A publicação de 13/10/2026 usa a branch `gh-pages`, pasta raiz, com `.nojekyll`. A branch `main` contém o código-fonte. Alterar `main` não publica automaticamente: para atualizar, execute `npm ci` e `npm run build` com as variáveis públicas configuradas e publique o conteúdo de `dist` em `gh-pages`, preservando `.nojekyll`. Nunca publique `.env.local`, senhas ou chaves administrativas. O GitHub Pages hospeda apenas o frontend; dados e autenticação permanecem no Supabase.

## Executar

Use Node.js 24 LTS (mínimo declarado: 22.18).

```powershell
npm ci
Copy-Item .env.example .env.local
```

Preencha `.env.local` com a URL do Supabase e sua chave **publishable**. Nunca coloque `service_role`, chave secreta ou senha do banco em variáveis `VITE_`.

```powershell
npm run dev
```

Sem variáveis configuradas, o app oferece a demonstração. Com as variáveis e o SQL aplicado, disponibiliza os formulários de conta. Veja [as instruções completas](docs/TAILWIND-E-BACKEND.md#7-como-configurar-e-executar).

## Verificar

```powershell
npm run typecheck
npm test
npm run build
npm run preview
```

Os testes de banco executam PostgreSQL local em WASM (PGlite), sem precisar de Docker. `supabase/schema.sql` é o baseline de um banco novo, já aplicado ao projeto desta entrega; não o execute novamente no mesmo projeto.

## Arquitetura

`App.tsx` organiza as telas e a sessão; `useFinance.ts` controla persistência e sincronização; `model.ts` reúne tipos e regras. Componentes visuais são compartilhados em `src/components/ui.tsx`. `styles.css` contém os tokens Tailwind e as regras globais.

O backend usa uma linha JSONB por usuário na tabela `finance_documents`. `save_finance` salva o documento atomicamente e acusa conflito se outra sessão avançou a revisão. Consulte a documentação para entender os limites e a futura normalização dessa arquitetura.

## Limites atuais

Recorrências são geradas por botão, não por agendador. Aportes não transferem dinheiro entre contas. Não há integração bancária, push, exclusão da conta Auth ou merge automático de conflitos. A cópia local do navegador não é criptografada. Instalação e ciclo offline do PWA ainda precisam de validação em Android/iOS reais.
