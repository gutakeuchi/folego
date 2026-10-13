# Fôlego v2: Tailwind e backend Supabase

> Para o estado consolidado após as melhorias de interface, publicação e importação OFX, leia o [Guia atual do Fôlego](GUIA-ATUAL-DO-FOLEGO.md). Este documento preserva os detalhes da entrega inicial de Tailwind/backend; referências a hospedagem pendente e à quantidade anterior de testes são históricas.

Esta documentação substitui as descrições de implementação do protótipo v1. O guia anterior continua disponível como registro histórico e introdução aos conceitos; a arquitetura atual está aqui.

## O que mudou

- Tailwind CSS 4.3, integrado ao Vite pelo plugin oficial. Não há CDN nem processamento de classes no navegador.
- Tokens de cor, fonte e sombra definidos em `@theme` e estilos por utilitários diretamente nos componentes.
- Componentes reutilizáveis `Button`, `Card`, `Modal`, `Metric` e `Progress`. `cn()` combina `clsx` e `tailwind-merge` para resolver sobrescritas de classes.
- Login, cadastro, confirmação de e-mail, saída e recuperação de senha pelo Supabase Auth.
- PostgreSQL com RLS por usuário, validação de documentos e gravação transacional com número de revisão.
- Lançamentos, contas, limites e metas agora são editáveis. Indicadores de saldo e orçamento usam registros reais, não números fixos.
- Valores armazenados em centavos inteiros; datas no formato ISO `YYYY-MM-DD`.
- Filtro mensal funcional, CSV com suporte a campos entre aspas, deduplicação por ID, backup JSON e migração explícita dos lançamentos v1.
- Recorrências mensais geradas por ação explícita, com prevenção de duplicatas. Não há agendador executando enquanto o app está fechado.
- Testes de domínio e de PostgreSQL com PGlite, além de verificações no banco remoto.

## Estado de implantação

O SQL foi aplicado ao projeto Supabase `bhbextfmjailoozdhidk`, chamado `folego`. O projeto criado pelo usuário está na região `ca-central-1` (Canadá), conforme a resposta da plataforma; a região não foi alterada automaticamente.

As verificações de segurança e desempenho do Supabase retornaram listas vazias. Testes temporários no banco remoto confirmaram gravação, revisão e isolamento de dados, com rollback ao final.

As telas de autenticação estão conectadas ao SDK. A entrega de confirmação/recuperação por e-mail e o ciclo completo com uma conta real ainda precisam ser verificados pelo proprietário. Nenhuma senha de usuário foi criada ou manipulada para teste.

Publicar o frontend e configurar os URLs permitidos do Auth continuam sendo passos de implantação. Ter o banco ativo não significa que o site já tenha um endereço público. O modo de demonstração funciona sem enviar dados ao Supabase.

## Estrutura atual

```text
src/
├── App.tsx                   # sessão, navegação e operações das telas
├── model.ts                  # tipos, valores, datas, CSV e migração
├── useFinance.ts             # persistência e sincronização
├── styles.css                # Tailwind, tokens e pequenos estilos globais
├── main.tsx                  # bootstrap
├── pwa.ts                    # registro do service worker
├── lib/
│   ├── supabase.ts           # cliente criado com a chave pública
│   └── cn.ts                 # composição de classes
└── components/
    ├── ui.tsx               # componentes visuais compartilhados
    └── AuthScreen.tsx       # formulários de autenticação
supabase/schema.sql           # baseline SQL do backend
tests/model.test.mjs           # testes de regras financeiras
tests/backend.test.mjs         # PostgreSQL local com usuários simulados
```

## 1. Por que Tailwind

Tailwind gera CSS a partir das classes usadas no código. Em vez de escrever um seletor para cada variação de layout, compomos utilitários:

```tsx
<div className="grid gap-4 md:grid-cols-2">...</div>
```

Sem prefixo, a regra vale desde as menores telas; `md:` altera o layout a partir do breakpoint médio. Isso torna a intenção responsiva visível no componente.

O projeto usa o fluxo CSS-first da versão 4. Em `styles.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand-600: #147b5c;
  --font-sans: "Manrope Variable", ui-sans-serif, system-ui, sans-serif;
}
```

Esses tokens geram utilitários como `bg-brand-600` e `font-sans`. Alterar o token mantém consistência. `@layer base` concentra padrões gerais e `@layer components` define apenas os padrões de formulário repetidos.

Não é preciso converter toda regra em uma classe: `dialog::backdrop` e a preferência por movimento reduzido continuam em CSS, pois são regras globais bem delimitadas. Classes dinâmicas devem ser escolhidas entre strings completas, e não montadas como `bg-${cor}-600`, para que o compilador as encontre.

### Sobrescritas com `cn`

Um botão tem `inline-flex` por padrão, mas o componente pai pode pedir `hidden sm:inline-flex`. Apenas concatenar strings não garante que a última classe vença, pois a ordem do CSS gerado também conta. `tailwind-merge` remove utilitários conflitantes; `clsx` organiza condições. O helper é aplicado em `Button` e `Card`.

O modal usa o elemento nativo `dialog` com `showModal()`. Isso fornece contenção de foco e suporte ao Escape pelo navegador. Os botões de ícone têm rótulos e áreas de toque amplas; não dependemos somente do desenho para comunicar a ação.

## 2. Como o backend funciona

```text
Frontend React
  ├── Supabase Auth → cadastro, sessão e recuperação
  └── Supabase Data API
        ├── SELECT finance_documents → ler o documento do usuário
        └── RPC save_finance → validar e gravar com revisão
              └── PostgreSQL + RLS → autorizar linhas por auth.uid()
```

Supabase é um backend como serviço. Nesta arquitetura, o SDK usa a sessão do usuário para chamar Auth e a Data API. Não há um servidor Express separado: as regras persistentes estão no PostgreSQL e nas políticas RLS.

A chave `sb_publishable_...` identifica o projeto e pode ser entregue ao navegador. Ela não autoriza acesso a dados privados sozinha. Essa autorização depende do token de sessão e das políticas do banco. Chaves `service_role` e `sb_secret_...` nunca devem aparecer em variáveis `VITE_`, no GitHub ou no bundle.

O nome exibido vem de `user_metadata`, mas não é usado para autorização. A identidade que protege os registros é `auth.uid()`, extraída da sessão verificada pelo Supabase.

## 3. O documento financeiro

A tabela `finance_documents` tem uma linha por usuário:

| Coluna       | Papel                                           |
| ------------ | ----------------------------------------------- |
| `user_id`    | Chave primária e referência ao usuário do Auth  |
| `data`       | JSONB com contas, lançamentos, limites e metas  |
| `revision`   | Inteiro incrementado a cada gravação            |
| `updated_at` | Data da última atualização definida no servidor |

As estruturas internas são tipadas em `model.ts`. `opening`, `cents`, `limit`, `target` e `saved` usam centavos. `accountId` relaciona lançamentos com contas do mesmo documento.

Escolhemos um documento por pessoa para manter o MVP pequeno e permitir salvar uma alteração de forma atômica. Isso é uma decisão de implementação, não uma regra universal de mercado. Para muitos registros, relatórios SQL complexos, compartilhamento ou transações independentes, tabelas normalizadas serão mais apropriadas.

Há limites explícitos: até 10 mil itens por coleção e documento de até 2 MB no banco. O aplicativo envia o documento completo ao salvar; não há paginação no estado atual. A chave primária já indexa `user_id`, que é a coluna usada nas políticas.

## 4. Segurança de acesso

RLS é habilitado na tabela. Existem políticas de SELECT, INSERT, UPDATE e DELETE para `authenticated`, sempre exigindo correspondência entre `auth.uid()` e `user_id`. UPDATE possui tanto `USING` quanto `WITH CHECK`, evitando que o usuário troque o proprietário de uma linha.

O papel anônimo não recebe acesso à tabela ou à função de gravação. As funções usam `SECURITY INVOKER` e `search_path` vazio; não elevam privilégios para ignorar RLS.

As regras não vivem apenas na interface. O banco verifica nomes, identificadores, valores inteiros, datas, referências a contas, limites duplicados e formato das coleções. Mesmo uma chamada direta à API deve respeitá-las.

O acesso de escrita à própria linha também está sujeito à validação e ao trigger de revisão. A função RPC é a rota usada pelo app para detectar edições concorrentes.

## 5. Concorrência entre aparelhos

Exemplo:

```text
Celular e computador carregam revisão 4.
Celular salva com expected_revision = 4 → servidor cria revisão 5.
Computador tenta salvar com expected_revision = 4 → servidor rejeita com 40001.
```

A condição da atualização e o incremento ocorrem na mesma operação no banco. No primeiro save, a revisão esperada é zero e a linha criada tem revisão 1. Se outra sessão já a criou, a função também acusa conflito.

No frontend, o conflito interrompe novos envios automáticos e preserva a cópia local. A tela permite exportar essa cópia e, mediante confirmação, carregar a versão do servidor. Não há merge automático de dois documentos conflitantes; essa é uma melhoria futura.

## 6. Sessão, dados locais e sincronização

`App` observa a sessão com o SDK. Cada usuário monta uma instância de `FinanceApp` identificada pelo ID da conta; trocar ou encerrar sessão desmonta os dados da interface anterior.

`useFinance` lê o servidor e mantém um rascunho em `folego.user.<id>.v3`. A demonstração usa `folego.demo.v3`. Isso separa a demonstração dos dados sincronizados e impede que dados fictícios sejam enviados automaticamente ao criar conta.

Uma alteração marca o documento como pendente. Após 650 ms sem uma nova alteração, o hook tenta salvar a cópia com a revisão conhecida. O indicador distingue pendente, salvando, sincronizado, erro e conflito. A leitura é renovada ao voltar à janela, recuperar conexão e a cada 30 segundos enquanto a página está visível; não há WebSocket Realtime nesta versão.

Se uma edição acontecer enquanto outra está sendo enviada, a revisão retornada é aplicada e a nova edição continua pendente. Em erro de rede, não mostramos sucesso: a cópia local permanece e o usuário pode tentar novamente.

O cache local não é criptografado. O logout limpa a sessão visual, mas mantém o rascunho local para recuperação; use um perfil de navegador confiável e considere limpeza de dados locais em uma política futura. O app não promete um login inicial sem internet. A restauração de sessão offline depende do SDK e deve ser validada em aparelhos reais.

## 7. Como configurar e executar

Recomendado: Node.js 24 LTS. O mínimo declarado é 22.18, devido ao carregamento nativo da configuração TypeScript.

```powershell
git clone https://github.com/gutakeuchi/folego.git
cd folego
npm ci
Copy-Item .env.example .env.local
```

Preencha `.env.local` com:

```dotenv
VITE_SUPABASE_URL=https://bhbextfmjailoozdhidk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
```

A chave pública fica em API Keys no painel do projeto. `.env.local` é ignorado pelo Git. O exemplo não contém uma senha ou chave administrativa. Reinicie o Vite depois de alterar variáveis; em produção, elas são lidas no build.

No painel Supabase, configure os URLs em Authentication → URL Configuration:

- Para desenvolvimento, permita o endereço exato exibido pelo Vite, por exemplo `http://127.0.0.1:5175/` e `http://127.0.0.1:5175/?recovery=1`.
- Para hospedagem, use o domínio HTTPS definitivo como Site URL e adicione as URLs de callback/recuperação correspondentes.
- Não use uma lista ampla de domínios em produção. O formulário envia o endereço atual como destino do e-mail.

Confirme que o provedor de e-mail/senha está habilitado, mantenha confirmação de e-mail e configure a política de senha no servidor. O formulário de cadastro sugere pelo menos 12 caracteres; a política do servidor é quem impõe a regra de segurança. Antes de abrir cadastros para qualquer pessoa, configure SMTP próprio e verifique os limites de envio do plano.

```powershell
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

Sem configuração Supabase, o app oferece somente demonstração. Com configuração e SQL aplicados, cadastro e login são disponibilizados. Não desative RLS para corrigir erros de conexão: confira URL, chave pública, grants e sessão.

## 8. Aplicar o banco em outro projeto

`supabase/schema.sql` é um baseline para banco novo. Ele já foi aplicado ao projeto informado nesta conversa com a migração remota `folego_backend_v1`; não deve ser executado novamente nesse mesmo projeto.

Para um projeto dedicado e vazio, revise o SQL e execute no SQL Editor. Para evoluções, use migrações incrementais geradas pelo CLI, verificando os comandos com `supabase --help`. Não recrie tabelas nem modifique migrações já aplicadas. O arquivo SQL deste repositório é a definição inicial, não uma ferramenta de reconciliação automática de bancos existentes.

## 9. Preservar registros antigos

O botão “Importar versão antiga” procura `folego.transactions.v1` na mesma origem do navegador. Antes de converter, mostra a quantidade e o ano usado para datas antigas sem ano. A importação só acontece depois de confirmação.

Os dados antigos não são apagados. IDs recebem o prefixo `legacy-`, permitindo repetir a importação sem duplicar os mesmos registros. Datas não interpretáveis fazem a operação falhar por inteiro.

Se o protótipo era aberto por `file://` e a nova versão por localhost ou HTTPS, o navegador pode não disponibilizar o armazenamento antigo na nova origem. Mantenha a versão antiga e exporte seus registros antes da migração; arquivos CSV da versão antiga não têm o mesmo contrato da versão atual e exigem conversão explícita.

O backup JSON atual contém `version: 3` e o documento financeiro. Restaurar substitui a cópia atual, pede confirmação e passa pela validação. CSV contém somente lançamentos; não é um backup completo das metas e limites.

## 10. Verificação e limites

Os testes automatizados usam PGlite, um PostgreSQL em WASM, para executar o SQL real do backend. Eles simulam as funções e papéis do Auth localmente, sem autenticar pessoas reais.

Cobertura inclui conversão monetária, datas, CSV com caracteres especiais, IDs duplicados, migração antiga, primeiro save, incremento de revisão, conflito, leitura/alteração entre usuários, tentativa de trocar proprietário e acesso anônimo.

No banco remoto foram verificadas RLS, políticas, funções sem elevação de privilégios, save e concorrência em uma transação com usuários temporários e rollback. Nenhum usuário temporário desse teste ficou cadastrado.

A interface foi revisada no mobile: cadastro e edição recalcularam saldo/orçamento, os registros permaneceram após recarregar e o aporte alterou o valor da meta. O fluxo real de e-mail e o uso em dois aparelhos autenticados ainda precisam de teste de aceitação após configurar os redirects.

Não foram adicionados integração bancária, notificações push, exclusão da conta Auth, conciliação ou um agendador de recorrências. Aporte é registro de progresso, não transferência de dinheiro. Os limites por categoria se repetem mensalmente; não há orçamento diferente por mês ainda.

## Referências oficiais

- [Tailwind com Vite](https://tailwindcss.com/docs/installation/using-vite).
- [Supabase Auth com React](https://supabase.com/docs/guides/auth/quickstarts/react).
- [RLS no Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Recuperação de senha](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).
