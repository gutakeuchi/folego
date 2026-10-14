# Testes e homologação do Fôlego

Atualizado em 14/10/2026. A ampliação desta suíte não altera o comportamento da aplicação nem o banco remoto.

Resultado desta execução: **47 testes passaram, sem falhas**, além de typecheck e build aprovados. São 33 testes adicionais em relação aos 14 anteriores: 7 de autenticação, 14 de sincronização, 8 de PWA/cache e 4 novos casos OFX.

## Executar

```powershell
npm ci
npm test
npm run typecheck
npm run build
```

Os testes usam o executor nativo do Node e dependências já existentes. Não precisam de `.env.local`, token administrativo, e-mail real, senha de usuário ou conexão com Supabase. Nenhum e-mail é enviado, nenhum usuário é criado e nenhum registro de produção é alterado. Instalar dependências com `npm ci` exige acesso ao registro de pacotes; executar a suíte após a instalação não depende do backend.

## Cobertura por finalidade

| Arquivo                     | O que verifica                                                                                                                                                                                              | O que não comprova                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `auth.test.mjs`             | Chamadas de cadastro, recuperação, login e redefinição; redirects com subdiretório; mensagens, erros e desbloqueio do envio                                                                                 | Entrega de e-mail, validade real do link, sessão no navegador e configuração do painel                |
| `sync.test.mjs`             | Cache pendente, conflitos, revisão esperada, falhas de rede/cache, resposta inválida, retorno online, foco e edição durante gravação                                                                        | Dois aparelhos físicos e todo o ciclo real do React/navegador                                         |
| `pwa.test.mjs`              | Código real do service worker: instalação, assets locais, navegação offline, preferência pela rede, exclusão de caches antigos, proteção contra cache de APIs/POST/erros; manifesto e existência dos ícones | Instalação efetiva em Android/iOS, teclado, limites de armazenamento e funcionamento offline completo |
| `ofx.test.mjs`              | Formatos sintéticos SGML/XML, valores, sinais, datas, moeda, IDs, contas, correções e duplicidade                                                                                                           | Todas as variações dos bancos e arquivos pessoais reais                                               |
| Testes de banco existentes  | Políticas e função SQL em PostgreSQL local via PGlite; usuário não acessa outro usuário; validação e concorrência                                                                                           | Configuração integral do serviço Supabase de produção                                                 |
| Testes de modelo existentes | Centavos, datas, totais, CSV, identificadores e migração                                                                                                                                                    | Aparência ou interação de telas                                                                       |

## Como funcionam as simulações

`tests/support/harness.mjs` transpila os arquivos TypeScript/TSX reais em memória e executa os handlers num contexto isolado. Substitui os imports de React e Supabase por adaptadores de teste. As funções do cliente simulado devolvem sucesso, erro ou promessas controladas.

O adaptador mantém estado, referências, dependências dos efeitos e callbacks. Os timers são controlados, sem aguardar os intervalos reais. O valor de `import.meta.env.BASE_URL` é substituído somente na cópia em memória executada no teste. O código do app não é reescrito no disco.

Esse harness é deliberadamente pequeno: não implementa toda a semântica de React, não é um DOM, não testa StrictMode, foco, layout nem validação HTML nativa. Os testes verificam lógica dos handlers e hooks; não devem ser apresentados como testes de ponta a ponta. Uma próxima etapa adequada é usar um renderer real de React/Testing Library e testes de navegador, com ambiente separado de produção.

Os testes do service worker também executam o arquivo real num contexto isolado, com `fetch` e Cache Storage simulados. Isso comprova decisões de interceptação e cache, não a implementação desses recursos pelo sistema operacional.

## Exclusão de conta, privacidade e segurança

A exclusão de conta ainda não foi implementada. Não há teste que possa aprovar uma funcionalidade inexistente. Para implementá-la com segurança, será necessário definir confirmação, autorização no backend, revogação de sessão, remoção dos dados vinculados, limpeza local e política de retenção/backup. Nunca colocar uma chave administrativa no frontend para excluir usuários.

A política de privacidade ainda precisa ser produzida conforme os dados efetivamente tratados e os serviços usados. Testes podem comprovar comportamentos técnicos, mas não certificar conformidade legal ou substituir uma revisão documental.

RLS e validações têm testes locais. Uma auditoria final de segurança deve incluir configuração do Auth, permissões reais, proteção contra abuso, dependências, tratamento de sessão, armazenamento local, logs e operação. Nenhuma certificação de segurança é alegada por esta suíte.

## Roteiro manual pendente

1. Em ambiente de teste, criar conta com e-mail controlado pelo responsável e confirmar o recebimento. Nunca compartilhar senha ou links/token de autenticação no chat.
2. Abrir o link recebido e conferir o domínio/caminho do app, entrada na sessão e ausência de erros.
3. Solicitar recuperação, usar o link e definir a nova senha pessoalmente. Conferir que o link expirado/reutilizado apresenta falha segura e que a senha antiga não permite novo login.
4. Usar dois aparelhos com a mesma conta de teste; cadastrar no primeiro, verificar no segundo e provocar uma edição concorrente. Confirmar preservação da alteração local e conflito explícito.
5. Desconectar/reconectar, confirmar indicação de pendência e não duplicação de gravações. Comparar valores e revisões sem publicar dados pessoais.
6. Instalar no Android/iOS e testar abertura, navegação, atualização, teclado e seletores. Verificar offline após uma primeira abertura online, sem presumir que login ou sincronização funcionam sem rede.
7. Importar extrato OFX real anonimizado e conferido contra o original. Testar reimportação, períodos sobrepostos e transações legítimas iguais. Guardar cópia antes de restaurar ou substituir dados.

## Critério de conclusão

Manter separados os resultados: suíte automatizada aprovada, testes de navegador aprovados e homologação real aprovada. Um resultado não implica os demais. No momento desta entrega, a suíte automatizada foi ampliada; as etapas manuais acima continuam pendentes.
