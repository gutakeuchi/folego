# Fôlego: documentação e guia de estudo

> Registro histórico do protótipo v1. O projeto evoluiu para Tailwind e Supabase; veja [a documentação da versão atual](TAILWIND-E-BACKEND.md) antes de seguir exemplos de implementação deste arquivo.

Documentação preparada em 13 de outubro de 2026, a partir do código do repositório `gutakeuchi/folego`. A base examinada foi o commit `da89b72`. Este guia descreve a implementação existente; propostas futuras são identificadas como propostas.

## 1. O objetivo do projeto

O Fôlego nasceu da necessidade de deixar de controlar as finanças de cabeça. A ideia é oferecer uma ferramenta para registrar receitas e despesas, acompanhar orçamento e organizar objetivos, especialmente pelo celular.

O que existe hoje é um frontend funcional com partes demonstrativas e preparação inicial para PWA. Frontend é o programa que desenha a interface e responde às ações no navegador. Backend é o programa de servidor que, em uma versão completa, autentica usuários, autoriza operações e grava dados em um banco compartilhado. O backend ainda não foi implementado.

Uma tela pode parecer completa sem que todos os seus botões estejam implementados. Por isso, o estado real do produto deve ser entendido antes de estudar o código.

| Recurso                                             | Situação atual                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Navegação entre as cinco telas                      | Funciona por estado React                                                            |
| Cadastro de receita ou despesa                      | Funciona e altera os totais                                                          |
| Persistência dos lançamentos                        | Funciona no `localStorage` deste navegador                                           |
| Busca por descrição/categoria e filtro por tipo     | Funcionam                                                                            |
| Ocultar valores                                     | Funciona visualmente durante a sessão                                                |
| Importar e exportar CSV                             | Funcionam para o formato simples previsto; têm limitações                            |
| Contas, cartões, compromissos e orçamento           | Exibem exemplos fixos                                                                |
| Metas e aportes                                     | Exibem exemplos; aporte mostra mensagem, sem alterar o valor                         |
| Saúde financeira e gráficos históricos              | Indicadores demonstrativos, sem cálculo completo                                     |
| Troca de mês, notificações, perfil e mais ações     | Controles visuais sem fluxo completo                                                 |
| Repetir lançamento mensalmente                      | Checkbox existe; recorrência não é persistida nem executada                          |
| PWA                                                 | Manifesto e service worker implementados; instalação real ainda precisa de validação |
| Login, recuperação de acesso, banco e sincronização | Não disponíveis na interface atual                                                   |
| `model.ts` e `useFinance.ts`                        | Trabalho em andamento, ainda não integrado                                           |
| Código no GitHub                                    | Publicado na branch `main`                                                           |
| Endereço público do aplicativo                      | Não publicado nesta etapa                                                            |

## 2. Como o projeto evoluiu

1. O primeiro protótipo utilizou HTML, CSS e JavaScript diretamente, para experimentar telas e fluxos com custo baixo.
2. A interface foi reconstruída com React, TypeScript e Vite, mantendo a proposta de finanças pessoais.
3. O feedback mobile orientou mudanças concretas: remoção do título repetido, fonte Manrope carregada de fato, ícones SVG, alvos de toque maiores e botão central de adicionar.
4. O extrato passou a usar uma apresentação compacta no celular e colunas no desktop. Os cartões de resumo mobile foram reorganizados para evitar conteúdo cortado.
5. Foi adicionada persistência local para os lançamentos, além do manifesto e do cache do PWA.
6. Foi iniciado um novo modelo de dados e um hook de sincronização, mas essa integração não foi concluída.
7. O código foi enviado ao GitHub com documentação de execução. O repositório preserva código, não os registros financeiros guardados no navegador.

Houve tentativas de publicação pelo Sites, sem implantação confirmada. Um bloqueio de processos no ambiente prejudicou o publicador. O envio ao GitHub foi concluído posteriormente pelo GitHub CLI e Git, após renovar o login. As soluções de autenticação e transporte usadas no computador não são funcionalidades do app e não contêm credenciais no repositório.

## 3. Tecnologias: o papel de cada uma

As versões abaixo são as declaradas no `package.json` do projeto, não uma lista das versões mais recentes disponíveis.

| Tecnologia           | Versão declarada                | Papel no Fôlego                                                   |
| -------------------- | ------------------------------- | ----------------------------------------------------------------- |
| React e React DOM    | 19.2.6                          | Componentes, atualização da interface e renderização no navegador |
| TypeScript           | 5.9.3                           | Verificação de tipos durante o desenvolvimento                    |
| Vite                 | 8.0.13                          | Servidor de desenvolvimento e build                               |
| Plugin React do Vite | 6.0.2                           | Integração da transformação de código React                       |
| Lucide React         | `^1.31.0`                       | Ícones SVG usados como componentes                                |
| Manrope Variable     | `^5.3.0`                        | Fonte carregada pelo pacote Fontsource                            |
| CSS                  | Sem framework visual            | Cores, espaçamento, layout e adaptação mobile                     |
| Node.js              | Requisito declarado `>=22.13.0` | Executa as ferramentas locais                                     |

HTML dá estrutura à página. CSS controla sua apresentação. JavaScript executa a lógica. TypeScript acrescenta informações de tipo ao JavaScript, que são removidas na transformação do código. React organiza a interface em funções chamadas componentes. Vite prepara esses arquivos para o navegador.

O navegador não executa o TypeScript original diretamente. Também não precisa de Node.js para abrir a versão compilada hospedada. Node é necessário para instalar dependências e executar as ferramentas no seu computador.

O projeto não usa Tailwind, Next.js, React Native ou um backend na versão enviada. Pastas antigas do ambiente de prototipação não foram incluídas no repositório limpo.

## 4. O mapa dos arquivos

```text
folego/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── README.md
├── public/
│   ├── favicon.svg
│   ├── manifest.webmanifest
│   └── sw.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles.css
│   ├── pwa.ts
│   ├── model.ts          # ainda não integrado
│   └── useFinance.ts     # ainda não integrado
└── docs/
    └── GUIA-DE-ESTUDO.md
```

`index.html` contém a página inicial, metadados e o elemento `root`. `main.tsx` encontra esse elemento e monta o React nele. `App.tsx` reúne estado, funções e componentes das telas. `styles.css` define a aparência. `public/` guarda arquivos copiados para a saída de produção.

`package.json` descreve o projeto, scripts e dependências. `package-lock.json` registra a resolução das dependências para instalações reproduzíveis. `tsconfig.json` configura a checagem TypeScript. `vite.config.ts` configura o build. `.gitignore` evita versionar dependências, saída compilada, variáveis locais e arquivos de ferramentas.

## 5. Como a aplicação inicia

O fluxo principal é:

```text
index.html → main.tsx → App → componentes das telas
```

Em `main.tsx`, `createRoot(...).render(...)` coloca a aplicação no elemento `root`. O operador `!` após `getElementById` informa ao TypeScript que esperamos um elemento existente. Ele não cria o elemento nem o verifica em tempo de execução.

Os imports da fonte e do CSS permitem que o Vite inclua esses recursos no build. `registerOffline()` prepara o registro do service worker quando as condições são atendidas.

`StrictMode` auxilia o desenvolvimento, incluindo verificações e ciclos extras de efeitos em desenvolvimento. Ele não significa criptografia, segurança de login ou modo de produção. Efeitos devem tolerar execução e limpeza, sem depender de acontecerem uma única vez.

## 6. React explicado com o próprio Fôlego

### Componentes e JSX

Um componente é uma função que descreve uma parte da interface. `Sidebar` desenha o menu lateral, `TransactionRow` desenha um lançamento e `TransactionDialog` desenha o formulário.

JSX é a sintaxe parecida com HTML usada dentro dessas funções. Por exemplo:

```tsx
<TransactionRow item={item} money={money} detailed />
```

Aqui, `item`, `money` e `detailed` são propriedades, chamadas props. O pai entrega dados e funções ao filho. `detailed` sem valor explícito equivale a `detailed={true}`.

Separar componentes ajuda a reutilizar a mesma linha no início e no extrato. Os componentes ainda estão juntos em `App.tsx`; uma futura refatoração pode separá-los em arquivos, sem alterar seu significado.

### Estado: a memória da interface

Em `App.tsx`:

```tsx
const [view, setView] = useState<View>("Início");
```

`view` contém a tela escolhida. `setView` solicita sua atualização. Depois disso, o React executa novamente a renderização com o novo valor. O estado não é uma variável global e não é, por si só, um banco de dados.

O tipo `View` aceita apenas os nomes previstos. Isso ajuda a evitar erros como `setView("Metass")` durante a checagem.

`transactions` guarda os lançamentos; `dialogOpen` controla a abertura do modal; `query` guarda a busca; `hideValues` controla a exibição dos valores; `form` guarda os campos digitados.

### Navegação condicional

```tsx
{
  view === "Contas" && <AccountsView money={money} />;
}
```

Essa expressão mostra o componente quando a condição é verdadeira. Não existe uma rota `/contas` implementada. Trocar de tela muda o estado, mas não cria um endereço específico no navegador. Recarregar retorna a navegação ao estado inicial.

### Formulários controlados

Um campo recebe `value={form.title}` e atualiza o estado em `onChange`. Assim, o React controla o valor exibido.

```tsx
onChange={(event) => onChange({ ...form, title: event.target.value })}
```

O primeiro `onChange` é o evento do campo. O segundo é uma função recebida por prop. `...form` copia as outras propriedades, e `title` substitui somente o campo alterado. Essa cópia evita modificar o objeto anterior diretamente.

### Atualizações funcionais e imutabilidade

```tsx
setTransactions((current) => [novoLancamento, ...current]);
```

A função recebe o estado mais recente e retorna um novo array. O lançamento entra no começo da lista. Essa forma é útil quando o resultado depende do valor anterior, inclusive com atualizações enfileiradas pelo React.

### `useEffect`, `useMemo` e `useRef`

`useEffect` sincroniza a aplicação com algo externo ao cálculo da interface. No Fôlego, grava os lançamentos no armazenamento do navegador e registra a ferramenta experimental WebMCP.

`useMemo` reaproveita o resultado da busca enquanto suas dependências não mudam. Ele é uma otimização: não salva dados e não deve ser necessário para a correção da regra.

`useRef` guarda uma referência ao input de arquivo. O botão de importar chama `fileInput.current?.click()`. O operador `?.` evita chamar `click` quando a referência ainda não existe. Alterar uma referência não provoca renderização como alterar estado.

### Listas e identificadores

`map` transforma cada lançamento em um `TransactionRow`. A prop `key={item.id}` permite ao React identificar os itens quando a lista muda. O cadastro atual usa `Date.now()` como identificador. Isso é suficiente para experimentar o fluxo, mas não garante unicidade em operações simultâneas; o modelo futuro usa UUID.

## 7. O percurso de um lançamento

```text
Toque no botão +
  → dialogOpen recebe true
  → formulário aparece
  → usuário preenche os campos
  → submitTransaction valida descrição e valor
  → setTransactions cria uma lista nova
  → React atualiza lista e totais
  → useEffect grava JSON no localStorage
```

`event.preventDefault()` impede o envio convencional do formulário com recarregamento da página. A descrição passa por `trim`, que remove espaços nas extremidades. O valor é convertido retirando pontos de milhar e trocando a vírgula decimal por ponto. Valores não finitos ou não positivos são rejeitados.

O formulário atual espera a convenção brasileira: `1.234,56`. Digitar `1234.56` não é equivalente, porque o ponto será removido. Esse é um exemplo de regra que precisa ser explícita e melhor validada antes de produção.

Depois de salvar, o modal fecha e uma mensagem temporária, chamada toast, confirma a operação. A mensagem não prova que os dados chegaram a um servidor: nesta versão, o destino é o navegador.

O checkbox de recorrência não entra no objeto salvo. Portanto, marcar “Repetir todo mês” ainda não agenda nada.

## 8. Como os totais e filtros são calculados

`filter` seleciona receitas ou despesas. `reduce` soma os valores selecionados:

```tsx
const income = transactions
  .filter((item) => item.type === "income")
  .reduce((sum, item) => sum + item.amount, 0);
```

O zero é o valor inicial da soma. O saldo é receitas menos despesas. `Intl.NumberFormat` formata o número em reais; formatar não muda o valor armazenado.

Os dados de exemplo têm receitas de R$ 5.500,00 e despesas de R$ 1.957,35, resultando em R$ 3.542,65. Essa parte é calculada. A nota de saúde `82`, a taxa `64%`, o histórico do gráfico e diversos valores de planejamento são fixos, mesmo que novos lançamentos sejam adicionados.

A busca junta descrição e categoria, converte para minúsculas e verifica se contém o texto digitado. Isso ignora diferenças de maiúsculas, mas não normaliza acentos. O filtro por tipo funciona junto com a busca.

Os totais exibidos no extrato usam todos os lançamentos, enquanto a lista usa os filtrados. O período exibido é fixo; não há filtragem mensal real. As datas atuais são rótulos como `05 out`, sem ano armazenado no lançamento, o que impede uma separação confiável entre anos.

## 9. Armazenamento local, JSON e limites

`localStorage` é um armazenamento de texto do navegador associado à origem do site. Origem combina protocolo, domínio e porta. Por exemplo, duas portas diferentes de localhost podem ter armazenamentos distintos.

O projeto usa a chave `folego.transactions.v1`. `JSON.stringify` converte o array em texto; `JSON.parse` reconstrói os dados. Ao iniciar, a função passada ao `useState` tenta ler e validar esse conteúdo. Se a leitura falhar ou os dados forem inválidos, usa os exemplos iniciais.

O `try/catch` evita uma falha total da interface se o conteúdo estiver corrompido ou o armazenamento não estiver disponível. Contudo, voltar silenciosamente aos exemplos não é uma estratégia completa de recuperação: os dados antigos não são migrados ou restaurados automaticamente.

Limitações práticas:

- Os registros não acompanham a conta do GitHub e não aparecem automaticamente em outro computador.
- Limpar os dados do navegador pode remover os lançamentos.
- Não há separação por usuário na interface atual: quem usa o mesmo perfil do navegador acessa os mesmos registros.
- Ocultar valores só altera a apresentação. Não criptografa o armazenamento.
- Múltiplas abas podem sobrescrever alterações; não há coordenação pelo evento `storage`.
- O comportamento de armazenamento em arquivos `file://` não deve ser tratado como equivalente a um site hospedado.

Para conferir durante o estudo, use as ferramentas do navegador, na seção de armazenamento local, e procure a chave acima. Faça experiências com dados fictícios e exporte uma cópia antes de apagar qualquer coisa.

## 10. CSV: o que foi feito e o que falta

A exportação cria linhas com descrição, categoria, data, tipo, conta e valor. `Blob` representa o arquivo em memória; `URL.createObjectURL` produz uma URL temporária; um elemento de link inicia o download.

A importação usa `FileReader` para ler o arquivo e transforma cada linha válida em um lançamento. Os tipos técnicos são `income` para receita e `expense` para despesa. Um exemplo simples compatível:

```csv
Descrição,Categoria,Data,Tipo,Conta,Valor
Salário,Renda,05 out,income,Conta principal,4850
Mercado,Alimentação,08 out,expense,Conta principal,387.45
```

O importador atual separa colunas com `split(",")`. Ele não interpreta corretamente todos os CSVs, especialmente descrições com vírgulas, aspas ou quebras de linha. Importar o mesmo arquivo novamente duplica os registros. O exportador também não trata esses caracteres nem proteção contra fórmulas em planilhas. A URL temporária deveria ser revogada depois do uso.

`model.ts` contém um parser mais elaborado e uma função para escapar células, mas eles ainda não substituem o importador/exportador da interface. Não confunda a presença dessas funções com integração concluída.

## 11. Design mobile e acessibilidade

A fonte Manrope é importada de um pacote, em vez de apenas citada no CSS. Isso evita que o resultado dependa da fonte padrão do computador. Os ícones Lucide são SVGs, o que permite tamanho e traço consistentes.

O CSS usa variáveis em `:root`, Flexbox, Grid e media queries. Variáveis concentram escolhas como cores. Flexbox ajuda em alinhamentos lineares; Grid ajuda a definir linhas e colunas. As media queries aplicam regras em larguras de até 980, 640 e 380 pixels.

No celular, a navegação inferior mostra Início, Extrato, Planejar e Metas, com o botão central de adicionar. Contas pode ser acessada pelo atalho da tela inicial. Os ícones dessa navegação têm 24 pixels e botões com área mínima maior que o desenho do ícone.

Foi removido o título duplicado no extrato. O cabeçalho identifica a tela; a área de conteúdo apresenta o contexto do mês. No desktop, adicionar tem texto explícito; no celular, o botão central torna a ação fácil de alcançar.

Há `aria-label` em botões de ícone, `aria-current` na navegação e `aria-live` nas mensagens. O modal usa `role="dialog"` e `aria-modal`. Esses atributos ajudam tecnologias assistivas a compreender a interface, mas não garantem acessibilidade completa. Ainda faltam testes de teclado, gerenciamento de foco ao abrir e fechar o modal e contenção do foco dentro dele. O CSS considera a preferência por menos movimento.

## 12. PWA: aplicação web instalável

PWA é uma aplicação web que pode oferecer comportamentos associados a apps, como abertura independente e suporte offline. Não transforma automaticamente o projeto em React Native nem publica na Play Store ou App Store.

O manifesto define nome, cores, endereço inicial, escopo e `display: "standalone"`. Esse último pede uma janela sem a interface usual de abas, quando instalado e suportado. O manifesto atual fornece apenas um ícone SVG; compatibilidade com diferentes plataformas ainda requer revisão, incluindo ícones PNG e Apple Touch Icon conforme o alvo.

Em `pwa.ts`, o registro só é tentado no build de produção, em protocolo HTTP/HTTPS e em navegador com service worker. Na prática, o navegador exige contexto seguro, normalmente HTTPS, com exceção de localhost. O arquivo `file://` não atende ao fluxo de instalação.

### O service worker existente

Um service worker executa separado da página e pode interceptar requisições dentro de seu escopo. Ele não tem acesso direto ao DOM nem ao `localStorage` da página.

O `sw.js` implementa três eventos:

| Evento     | Comportamento atual                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `install`  | Busca o HTML e guarda os assets locais encontrados nele                                           |
| `activate` | Remove caches antigos do Fôlego com nome diferente                                                |
| `fetch`    | Para navegação, tenta rede e usa o HTML do cache em falha; para assets, tenta cache antes da rede |

Requisições que não são GET, de outra origem ou com `/api/` são ignoradas pelo cache. Isso evita tratar respostas de API como arquivos estáticos nessa implementação.

A cache inicial identifica recursos referenciados diretamente no HTML. Fontes referenciadas dentro do CSS dependem de terem sido solicitadas enquanto o worker controla a página para entrar no cache. Portanto, primeiro carregamento online e instalação do worker não são prova de que todos os recursos já funcionam offline.

O nome atual é `folego-shell-v1`. Atualizações precisam considerar versionamento de cache, ciclo de ativação e compatibilidade entre HTML e arquivos antigos. O código não usa `skipWaiting` nem `clients.claim`; uma nova versão pode aguardar o fechamento de páginas anteriores. Isso deve ser testado antes de distribuir o app.

Cache da interface e armazenamento de lançamentos são coisas diferentes. Ter a tela offline não significa ter sincronização, backup ou autenticação offline segura.

## 13. O código futuro de domínio e sincronização

`App.tsx` ainda trabalha com o tipo `Transaction`, valores em reais e datas formatadas. `model.ts` propõe outro modelo:

| Tipo      | Responsabilidade proposta                                           |
| --------- | ------------------------------------------------------------------- |
| `Account` | Identificador, nome e saldo inicial                                 |
| `Entry`   | Receita/despesa com conta relacionada, data ISO e valor em centavos |
| `Goal`    | Objetivo, valor alvo, valor guardado e prazo                        |
| `Budget`  | Limite de uma categoria                                             |
| `Finance` | Agrupa as quatro coleções                                           |

Centavos inteiros ajudam a representar operações monetárias com precisão dentro dos limites definidos. Exemplo: R$ 12,34 corresponde a `1234` centavos. Essa convenção precisaria ser aplicada consistentemente à API, ao armazenamento e à apresentação. O saldo inicial também precisa ter sua unidade explicitada, pois seu campo se chama apenas `opening`.

`validateFinance` verifica formato, limites de coleção, identificadores únicos e referências a contas existentes. TypeScript ajuda durante o desenvolvimento; uma validação em execução é necessária para dados recebidos de arquivos, armazenamento ou rede. Uma asserção `as Finance` não valida o conteúdo sozinha. O validador iniciado ainda merece testes com entradas inesperadas.

`useFinance.ts` propõe centralizar leitura, armazenamento e envio dos dados. Hook personalizado é uma função que reutiliza lógica com hooks React; não é um servidor.

O contrato esperado, ainda sem implementação no backend, é:

```text
GET /api/finance
  → { user, data, revision }

PUT /api/finance
  ← { data, revision }
  → { revision }
```

O campo `dirty` representa alterações locais não enviadas. `revision` representa a versão conhecida no servidor. Se dois computadores editarem a mesma versão, o servidor deveria aceitar uma atualização e recusar a outra com HTTP 409. Essa técnica se chama controle otimista de concorrência.

O hook trata 401 como necessidade de login e 409 como conflito. Há espera de 500 ms antes de enviar, para agrupar mudanças próximas. Também há tentativa de reenvio ao detectar conexão online. Porém, não existe login, API, banco, tela de conflito ou integração do hook em `App`. O cabeçalho `X-Folego-Request` não é autenticação nem proteção suficiente sozinho.

Antes de integrar, é necessário testar mudanças simultâneas durante uma requisição, falha ao salvar, troca de conta, expiração da sessão e recuperação após conflito. O hook acessa `location` no módulo, por isso também precisaria ser adaptado caso o projeto passe a renderizar no servidor.

Não basta importar `useFinance` para concluir o produto. Primeiro deve existir uma API autorizada por usuário, com contrato validado, e uma migração explícita dos registros locais antigos para o novo formato.

## 14. WebMCP experimental

O código verifica se `document.modelContext` oferece registro de ferramentas. Quando disponível, registra `add_financial_transaction`, uma ação para adicionar um lançamento à interface.

A integração é opcional: sem suporte, o efeito retorna e o restante do app funciona. A ferramenta atua no estado local do React; não conversa com banco ou instituição financeira. `AbortController` é usado para limpar o registro ao desmontar o efeito.

O schema descreve os argumentos esperados, mas o executor atual faz uma validação limitada. Antes de produção, todas as entradas devem receber validação em execução. Essa integração é experimental e não é necessária para o usuário cadastrar lançamentos manualmente.

## 15. Rodar, verificar e compilar

No computador em que você quer estudar, instale uma versão de Node compatível com as dependências e Git. Os comandos são executados no terminal:

```powershell
git clone https://github.com/gutakeuchi/folego.git
cd folego
npm ci
npm run dev
```

`npm ci` usa o lockfile e exige que ele corresponda ao `package.json`. `npm install` também instala dependências e pode atualizar sua resolução. Para reproduzir a versão registrada, prefira começar com `npm ci`.

Abra o endereço exibido pelo terminal. O script usa `127.0.0.1`, que é o próprio computador; esse endereço não é um link acessível automaticamente por outro aparelho.

```powershell
npm run typecheck
npm run build
npm run preview
```

`typecheck` checa os arquivos incluídos no `tsconfig`. Ele não executa os fluxos financeiros nem comprova segurança. `build` gera `dist/`. `preview` serve esse build localmente e permite estudar o comportamento de produção. Para testar o worker, use o build e o preview; o registro é desativado no desenvolvimento.

Em `vite.config.ts`, `base: "./"` gera referências relativas; `outDir` escolhe `dist`; `emptyOutDir` limpa essa pasta na próxima compilação; `sourcemap: false` deixa de gerar mapas externos; `cssMinify: false` desativa a compactação de CSS. Esta última opção foi usada para contornar um problema de dependência nativa no ambiente, não para acrescentar funcionalidade ao app.

O ambiente de criação precisou de reparos locais em dependências para compilar. Mudanças em `node_modules` não foram enviadas ao GitHub. Uma instalação limpa em outro computador precisa ser verificada; o build bem-sucedido no ambiente original não prova que todos os ambientes reproduzem o mesmo resultado.

## 16. Verificação realizada e verificação pendente

Foram executadas checagem de tipos e compilação. Houve inspeção visual das telas em larguras de celular e desktop, revisão dos ícones e do modal e conferência do arquivo independente gerado para demonstração. O envio ao GitHub foi confirmado comparando o commit local com o remoto.

Esses resultados têm limites. O projeto não contém uma suíte automatizada de testes. Não foram confirmados login, autorização entre usuários, recuperação de conta, sincronização em aparelhos reais, instalação em Android/iOS ou recuperação completa offline.

Um roteiro manual útil, com dados fictícios:

1. Anote os totais iniciais e cadastre uma despesa de R$ 10,00; confirme que despesa sobe 10 e saldo cai 10.
2. Recarregue e confira a persistência do lançamento.
3. Busque sua descrição e altere entre receitas/despesas.
4. Exporte o CSV; confira seu conteúdo em um editor antes de importar.
5. Verifique o modal com teclado e os rótulos dos controles.
6. No build servido, confira registro do worker, recarregue e só então simule ausência de rede.

Esse roteiro não substitui testes automatizados, mas ajuda a aprender a observar comportamento e evidência.

## 17. GitHub, hospedagem e dados: três conceitos distintos

Git registra versões dos arquivos; GitHub hospeda o repositório. Um commit é uma versão identificada por um hash. A branch `main` aponta para a linha principal de desenvolvimento. `push` envia commits ao remoto; `pull` obtém e integra alterações.

O repositório publicado está em [gutakeuchi/folego](https://github.com/gutakeuchi/folego). Foram enviados código, configuração e documentação. `node_modules`, cache de ferramentas, credenciais e saída `dist` não foram enviados.

Para atualizar sua cópia depois de alterações no GitHub:

```powershell
git status
git pull --ff-only
npm ci
```

Se houver alterações suas, revise-as antes de atualizar. Não use comandos destrutivos para resolver diferenças sem entender o que será perdido.

Hospedagem é servir o build em um endereço HTTPS. Ela permite acessar a interface de outro aparelho. Sincronização é guardar os registros em um servidor por usuário. Publicar o frontend sozinho não cria sincronização.

Uma evolução completa teria:

```text
Navegador ou PWA
  → API autenticada
    → autorização de cada operação
      → banco de dados por usuário
```

Guardar código no GitHub não deve significar guardar dados financeiros ou senhas nele. O campo `private: true` do `package.json` impede publicação acidental no registro npm; não torna o repositório GitHub privado.

## 18. Sequência proposta para concluir o produto

Esta seção é um plano de implementação, não uma lista de funcionalidades entregues.

1. Unificar o modelo financeiro: centavos, datas ISO, contas por identificador e migração dos lançamentos existentes.
2. Tornar contas, limites e metas editáveis, com valores derivados dos registros reais.
3. Implementar API, banco e autorização por usuário. Definir como autenticar, recuperar acesso e encerrar sessões no serviço escolhido.
4. Integrar o frontend à API e testar conflitos, falhas e troca de usuários. Separar dados locais por conta.
5. Adicionar backup, restauração e exportação robustos; testar perda de conexão e recuperação.
6. Publicar por HTTPS e validar instalação, atualização do worker e offline em Android e iOS.
7. Só depois avaliar notificações, integrações bancárias e empacotamento nativo.

Cada etapa precisa de critério de conclusão observável. Por exemplo, “sincronização pronta” deve significar que o mesmo usuário vê um lançamento em outro aparelho, que outro usuário não o vê e que edições concorrentes não desaparecem silenciosamente.

## 19. Trilha de estudo com exercícios

Faça cada exercício em uma branch própria e use dados fictícios. As alterações abaixo são sugestões para estudo.

| Ordem | Tema         | Exercício                             | Resultado esperado                                                     |
| ----- | ------------ | ------------------------------------- | ---------------------------------------------------------------------- |
| 1     | HTML e CSS   | Trocar uma cor em `:root`             | A mesma cor muda em vários componentes                                 |
| 2     | JSX e props  | Criar um pequeno cartão de resumo     | O componente recebe título e valor por props                           |
| 3     | Estado       | Mostrar contagem dos lançamentos      | O contador muda após cadastro                                          |
| 4     | Arrays       | Calcular percentual livre da renda    | Indicador acompanha receitas e despesas; renda zero é tratada          |
| 5     | Formulários  | Rejeitar data vazia ou inválida       | Erro aparece sem fechar o modal                                        |
| 6     | Persistência | Salvar preferência de ocultar valores | A preferência continua depois de recarregar                            |
| 7     | CSV          | Testar descrição com vírgula e aspas  | Identificar e depois corrigir o limite atual                           |
| 8     | Modelagem    | Converter reais para centavos         | Testar R$ 0,01, R$ 1.234,56 e entradas inválidas                       |
| 9     | PWA          | Inspecionar instalação e cache        | Explicar quais recursos estão realmente disponíveis offline            |
| 10    | Backend      | Desenhar contrato de API e isolamento | Explicar por que o servidor não confia no usuário enviado pelo cliente |

Antes de programar um exercício, escreva o comportamento esperado. Depois compare o resultado com essa expectativa. Isso ajuda a aprender raciocínio de implementação, não apenas sintaxe.

## 20. Glossário e referências

| Termo        | Significado neste projeto                                |
| ------------ | -------------------------------------------------------- |
| DOM          | Estrutura da página que o navegador mantém               |
| Componente   | Função que descreve uma parte da interface               |
| Props        | Dados e funções enviados do componente pai ao filho      |
| Estado       | Informação que o React mantém entre renderizações        |
| Efeito       | Sincronização com recursos externos à renderização       |
| Build        | Transformação do projeto em arquivos de distribuição     |
| API          | Contrato de comunicação entre programas                  |
| Autenticação | Identificar quem está acessando                          |
| Autorização  | Decidir quais dados e operações essa pessoa pode acessar |
| Persistência | Manter dados depois de encerrar a execução atual         |
| Cache        | Cópia reutilizável de um recurso                         |
| PWA          | Aplicação web com capacidades progressivas de app        |
| Commit       | Versão registrada no Git                                 |
| Deploy       | Publicação de uma versão em um ambiente acessível        |

Leituras oficiais para aprofundamento:

- [React: primeiros passos](https://react.dev/learn), para componentes, props, estado e eventos.
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html), para estudar tipos e os limites da checagem estática.
- [Vite: guia de uso](https://vite.dev/guide/), para entender desenvolvimento e build.
- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps), para instalação, funcionamento offline e service workers.

Ao estudar uma referência, volte ao arquivo que implementa o conceito. Por exemplo: estado em `App.tsx`, build em `vite.config.ts` e cache em `public/sw.js`. Essa associação entre conceito e código facilita identificar depois o que precisa ser alterado.
