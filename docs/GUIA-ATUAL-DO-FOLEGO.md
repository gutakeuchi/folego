# Fôlego: implementação atual e guia de estudo

Documento atualizado em 13/10/2026. Este é o guia da aplicação atual; `GUIA-DE-ESTUDO.md` descreve o protótipo inicial e deve ser lido como histórico. As explicações abaixo correspondem ao código, não a uma promessa de que todos os fluxos foram homologados em produção.

## 1. O que construímos

O Fôlego começou como um protótipo HTML de finanças pessoais e evoluiu para uma aplicação web responsiva com autenticação e persistência remota. Não é um aplicativo nativo de Android/iOS: é um site preparado como PWA, que pode ser adicionado à tela inicial conforme o navegador.

O objetivo é registrar receitas e despesas, acompanhar contas, definir limites por categoria e organizar metas. Há demonstração local, separada dos dados associados à conta. O app não acessa bancos automaticamente, não realiza pagamentos e não movimenta dinheiro.

- Aplicação: https://gutakeuchi.github.io/folego/
- Código-fonte: https://github.com/gutakeuchi/folego

## 2. Tecnologias e por que existem

| Tecnologia              | Papel no projeto                                                 | Conceito para estudar                       |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| React 19                | Interface dividida em componentes e atualizada conforme os dados | Componentes, propriedades, estado e efeitos |
| TypeScript 5            | Tipos de contas, lançamentos, metas e funções                    | Tipagem estática e validação em execução    |
| Vite 8                  | Servidor local e geração do build de produção                    | Desenvolvimento versus build                |
| Tailwind CSS 4          | Classes de layout, tipografia, espaçamentos e responsividade     | Utilities, tokens e breakpoints             |
| CSS                     | Temas, animações, scrollbar e ajustes compartilhados             | Cascata, especificidade e variáveis         |
| Manrope                 | Tipografia da aplicação, distribuída com o frontend              | Fontes locais e legibilidade                |
| Lucide React            | Ícones consistentes                                              | SVG e componentes reutilizáveis             |
| clsx + tailwind-merge   | Composição de classes sem conflitos previsíveis                  | Variantes de componentes                    |
| Supabase Auth           | Cadastro, login, sessões e recuperação de senha                  | Autenticação                                |
| PostgreSQL no Supabase  | Persistência remota com RLS e revisão                            | Autorização, transações e concorrência      |
| PGlite + testes do Node | Testes de regras e políticas em PostgreSQL local em WASM         | Testes automatizados                        |
| GitHub Pages            | Hospedagem HTTPS do frontend estático                            | Deploy e separação frontend/backend         |

As versões completas e reproduzíveis estão em `package.json` e `package-lock.json`. TypeScript não substitui a validação dos dados recebidos: seus tipos desaparecem no JavaScript final.

## 3. Onde estudar no código

```text
src/
  main.tsx                  Inicialização do React e tema inicial
  App.tsx                   Sessão, navegação, telas, formulários e importação
  styles.css                Tokens, temas e animações
  model.ts                  Tipos, valores, datas, CSV e validações
  ofx.ts                    Leitura OFX e comparação de possíveis duplicados
  useFinance.ts             Cache, gravação, leitura remota e conflitos
  pwa.ts                    Registro do service worker
  lib/supabase.ts           Cliente do backend
  components/
    AuthScreen.tsx          Login, cadastro, recuperação e sugestão de senha
    ui.tsx                  Botões, cards, modal, skeleton e estado vazio
public/
  favicon.svg               Marca de vento
  manifest.webmanifest      Metadados da PWA
  sw.js                     Cache dos recursos estáticos
supabase/schema.sql         Baseline do banco já aplicado
tests/                      Testes das regras, banco e OFX
```

`App.tsx` ainda concentra bastante responsabilidade. Separar cada tela e os formulários em arquivos próprios é uma melhoria futura de manutenção, não algo que já foi feito.

## 4. Como os dados funcionam

Um lançamento contém descrição, categoria, data, valor em centavos, tipo, conta e indicação de recorrência. Contas têm saldo inicial; limites têm categoria e valor mensal; metas têm valor desejado, progresso e prazo.

**Dinheiro em centavos:** R$ 12,34 é armazenado como `1234`. Isso evita depender de operações fracionárias para os cálculos monetários. Os campos brasileiros são convertidos e validados antes da gravação.

**Datas:** o modelo usa `AAAA-MM-DD`, sem transformar uma data de lançamento em um instante com fuso horário. O filtro mensal compara o período da data. A apresentação pode usar o formato brasileiro.

**Saldo versus período:** o saldo de uma conta considera seu saldo inicial e todos os lançamentos associados. O resumo mensal considera apenas as movimentações do período selecionado. Esses números não precisam ser iguais.

**Metas:** um aporte altera o progresso da meta; não transfere dinheiro nem desconta automaticamente uma conta. **Recorrências:** são geradas por ação do usuário, não por um agendador automático.

## 5. Autenticação e segurança

O frontend usa o cliente Supabase para cadastro, login, saída e recuperação. O formulário foi ampliado com placeholder, mostrar/ocultar senha e sugestão de senha forte.

A sugestão tem 20 caracteres e combina letras, números e símbolos. A aleatoriedade usa `crypto.getRandomValues`, não `Math.random`. O usuário escolhe se deseja usar a sugestão. Ela fica no estado do formulário e não é gravada pelo gerador em localStorage; ao enviar o formulário, a senha é transmitida ao serviço de autenticação. Isso é diferente de armazenar uma senha num gerenciador: o app não substitui esse recurso.

O preenchimento tem `autocomplete` apropriado para senha atual ou nova senha. A sugestão nativa oferecida pelo navegador depende dele e do gerenciador instalado; o Fôlego oferece seu próprio botão, mas não controla essa interface nativa.

**Autenticação** responde quem é o usuário. **Autorização** define quais registros ele pode acessar. O banco usa RLS para restringir o documento ao proprietário autenticado. Esconder um botão ou filtrar uma lista no React não seria proteção suficiente.

O frontend contém somente configuração pública do Supabase. Chaves administrativas, `service_role`, senha do banco e tokens privados não devem entrar no código publicado. Variáveis `VITE_` são incorporadas ao build e podem ser lidas por qualquer visitante.

O banco armazena um documento JSONB por usuário. A função de gravação valida o documento e exige a revisão esperada. Se outro aparelho já salvou uma revisão mais nova, a gravação antiga é recusada. Não há merge automático: o app preserva a situação de conflito para resolução explícita.

A última consulta ao Security Advisor apontou proteção contra senhas vazadas desativada. A existência de RLS e testes não significa que uma auditoria completa de segurança foi concluída.

## 6. Persistência e sincronização

O hook `useFinance` centraliza leitura, cache e gravação. Alterar um registro atualiza o estado e marca alterações pendentes. A gravação usa a função do banco e recebe uma nova revisão.

O app verifica atualizações ao recuperar a conexão, ao receber foco e a cada 30 segundos. Isso é atualização periódica, não uma assinatura Supabase Realtime. Ao detectar edição local pendente, procura não sobrescrevê-la com uma leitura remota.

O cache do navegador é separado por conta e não é criptografado pelo aplicativo. Não trate um aparelho compartilhado como ambiente privado. O modo demonstração não envia seus registros para a conta autenticada.

## 7. Importações, exportações e OFX

Há CSV, backup/restauração JSON, importação da versão antiga e importação OFX. A importação antiga foi movida para **Contas → Seus dados**. O backup inclui contas, lançamentos, limites e metas, mas não senhas.

### Fluxo OFX

1. Acesse Lançamentos → Importar OFX.
2. Escolha a conta de destino.
3. Selecione o arquivo e revise os registros.
4. Marque apenas os lançamentos desejados.
5. Confirme a importação e revise as categorias.

O arquivo é lido no navegador. O original não é enviado pelo importador ao backend; os lançamentos confirmados seguem a sincronização normal da aplicação. Não compartilhe extratos reais publicamente para pedir ajuda.

O parser aceita transações `STMTTRN` de OFX com tags fechadas (XML) e campos sem fechamento individual (SGML). Lê data, valor com sinal, identificador bancário e descrição. Tenta UTF-8 e recorre a Windows-1252 se encontrar caracteres de substituição.

Limites: arquivo até 5 MB, entre 1 e 5.000 transações, moeda BRL e uma conta por arquivo. Datas impossíveis, valores não suportados e correções bancárias são recusados. Não há suporte completo à especificação OFX, investimentos, conversão de moedas ou importação de saldo inicial.

**Duplicidade exata:** a conta escolhida, identificação bancária/conta do arquivo e `FITID` formam uma chave convertida em SHA-256. A mesma transação na mesma conta recebe o mesmo ID, permitindo bloquear uma reimportação. O hash é identificador, não criptografia do conteúdo financeiro.

**Possível duplicidade:** coincidência de conta, data, valor, tipo e descrição deixa o item desmarcado. O usuário pode conferir e selecionar. Descrições ou IDs diferentes podem escapar; contas de destino incorretas também comprometem a comparação. Transações legítimas podem ter os mesmos dados, por isso a coincidência não é bloqueada automaticamente.

Categorias iniciam como “Outros”; o saldo inicial não muda. O mês selecionado na tela pode ser diferente do mês das transações importadas. Nesse caso, mude o período para encontrá-las.

## 8. Evolução visual e responsividade

Foram feitos estes ajustes:

- Migração da estilização para Tailwind e adoção da fonte Manrope.
- Ícones maiores, áreas de toque confortáveis e navegação inferior no mobile.
- Seletor de mês usando toda a largura disponível no celular.
- Busca e filtro separados em telas pequenas; ações reorganizadas em grade.
- Acesso direto a Contas na navegação mobile e botão “+” flutuante.
- Tema claro/escuro com preferência local e aplicação desde a inicialização.
- Correção dos fundos e textos de inputs/selects no tema escuro.
- Fonte de 16px nos campos mobile, em vez de 14px.
- Categoria com select e opção “Outra categoria…”, substituindo o datalist.
- Rolagem interna apenas no conteúdo, com cabeçalho e navegação estáveis.
- Separação entre contêiner de rolagem e conteúdo centralizado: a scrollbar fica na borda direita.
- Área desktop mais ampla, cards adaptáveis e alturas alinhadas por linha.
- Espaçamentos menores em desktops com pouca altura útil.
- Cards com bordas arredondadas, sombras suaves e efeitos discretos.
- Ícones nos estados vazios e remoção de bordas duplas em Planejamento/Metas.
- Tela de login com fundo escuro discreto e superfícies melhor separadas.

**Flex versus Grid:** Flex organiza cabeçalho e barras de ações. Grid distribui cards em linhas/colunas. `min-width: 0` evita que conteúdo interno force a expansão de uma coluna; `min-height: 0` permite que uma região flexível encolha e role. `items-stretch` alinha a altura de cards na mesma linha.

Responsivo não significa caber tudo em qualquer altura sem rolar. O conteúdo deve continuar legível e acessível; reduzir arbitrariamente os cards ou esconder excesso com `overflow: hidden` não resolve o problema.

Os temas usam variáveis CSS para cores semânticas e ajustes específicos para superfícies. A correção dos campos escuros mostrou uma lição de cascata: mudar a cor do texto sem mudar a classe que define o fundo pode produzir texto claro sobre branco.

## 9. Loading, animações e acessibilidade

O carregamento de tela passou de texto simples para indicador circular e, depois, para skeleton loading: blocos simulam cabeçalho, cartões e linhas sem expor valores antes de carregar. O círculo permanece no botão de envio do login. Não foi acrescentado atraso artificial para mostrar a animação.

O skeleton usa `aria-busy`, uma mensagem de status e elementos decorativos ocultos de leitores de tela. Ele é um modelo genérico do dashboard, não um skeleton específico para cada tela.

As telas e grupos entram com pequenas mudanças de opacidade e deslocamento; botões e navegação têm feedback ao interagir; barras de progresso têm transição de largura. `prefers-reduced-motion` reduz animações para quem prefere menos movimento.

Botões de ícone têm rótulos acessíveis, campos têm labels, navegação indica a página ativa e o modal usa `dialog`. Ainda são necessários testes completos com teclado, leitores de tela e aparelhos reais. Usar atributos ARIA não comprova sozinho acessibilidade completa.

## 10. Marca e cache

A marca evoluiu de um F tipográfico para um F curvo e, por escolha do projeto, para três linhas de vento. O símbolo atual tem pontas arredondadas, fundo verde-menta e traços verde-escuros. É SVG, mantendo nitidez em diferentes tamanhos, sem biblioteca extra.

É usado no login, menu lateral, cabeçalho mobile e favicon. No desktop, evita-se repetir a marca no cabeçalho porque ela já está no menu lateral.

O navegador mostrou a imagem antiga mesmo após a publicação. As referências passaram a usar uma versão explícita na URL (`?v=wind-2`) e o service worker teve sua versão de cache alterada. Assim, trocar a marca não exige apagar dados financeiros locais. Ícones já instalados na tela inicial ainda podem depender da atualização feita pelo sistema/navegador.

## 11. PWA e limites do offline

O manifesto define nome, ícone, escopo, endereço inicial e apresentação standalone. O service worker é registrado em produção e armazena recursos estáticos da mesma origem. Requisições externas do Supabase não são incluídas nesse cache.

Não é correto concluir que toda a aplicação funciona offline porque o shell pode ser carregado do cache. Autenticação, sincronização, instalação e recuperação após perda de conexão precisam de testes reais. O manifesto usa SVG; compatibilidade de ícones e instalação em Android/iOS ainda deve ser validada, incluindo possíveis versões PNG e apple-touch-icon.

## 12. Desenvolvimento e publicação

Use Node 24, conforme a orientação do projeto, e execute na pasta do repositório:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Preencha o arquivo local com URL e chave pública do Supabase. Ele não deve ser publicado. Consulte `TAILWIND-E-BACKEND.md` para configuração do banco; não reaplique o baseline já instalado no projeto existente.

```powershell
npm run typecheck
npm test
npm run build
npm run preview
```

O código-fonte está em `main`. O build estático é publicado na raiz de `gh-pages`, com `.nojekyll`, e servido pelo GitHub Pages. Alterar `main` não publica automaticamente: é preciso gerar e publicar um novo build. `dist` é saída de compilação; não é o lugar para editar funcionalidades.

Para autenticação em produção, conferir no Supabase Site URL e redirects do endereço publicado, incluindo o retorno de recuperação com `?recovery=1`. Não documentamos esses ajustes como concluídos sem confirmar o painel e testar o fluxo real.

## 13. O que foi verificado e o que falta

Verificações realizadas durante as entregas:

- Typecheck e builds de produção.
- 14 testes automatizados: regras financeiras, CSV, migração, OFX e banco/RLS.
- Consultas remotas confirmando RLS e execução do Security Advisor.
- Conferências pontuais no navegador em mobile e desktop, incluindo largura, rolagem e contraste dos campos.
- Verificação dos builds publicados e recursos atualizados no GitHub Pages.

Esses resultados não substituem homologação completa. Ainda pendentes:

- Cadastro novo, confirmação de e-mail e recuperação com caixa postal real.
- Conferência final de redirects e configuração de entrega de e-mails.
- Sincronização ponta a ponta em dois aparelhos reais, com edições e desconexões.
- Variações OFX de bancos reais e tratamento de casos não suportados.
- Instalação, teclado virtual, offline e atualização de ícone em Android/iOS reais.
- Auditoria de acessibilidade, privacidade, proteção contra abuso e segurança.
- Exclusão da conta/dados, política de privacidade e operação de backups com restauração validada.

Não existem integração Open Finance, IA no aplicativo, pagamentos, cartões/parcelamentos completos, notificações push, agendamento de recorrências ou publicação automática implementados nesta entrega.

## 14. Roteiro para aprender com o projeto

1. Leia os tipos e as funções de dinheiro/data em `model.ts`.
2. Entenda `Button`, `Card`, `Empty` e `Modal` e como recebem propriedades.
3. Acompanhe um lançamento do formulário até `update` e a função de gravação.
4. Estude o estado de sessão e a diferença entre demonstração e conta.
5. Leia as políticas RLS junto dos testes que tentam acessar dados de outro usuário.
6. Compare o CSS dos temas e teste breakpoints sem alterar regras financeiras.
7. Leia `ofx.ts` junto dos testes: identifique validação, conversão e idempotência.
8. Entenda cache e versionamento antes de alterar o service worker.

Exercícios seguros: crie uma categoria e um lançamento na demonstração; mude a largura da janela; teste o tema salvo; importe um OFX sintético duas vezes; altere um texto num branch de estudo e execute os testes. Não use extratos pessoais como exemplos públicos e não teste exclusões ou restaurações sobre sua única cópia dos dados.
