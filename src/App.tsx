import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Home,
  LayoutGrid,
  LogOut,
  Moon,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Target,
  Trash2,
  Upload,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { useFinance } from "./useFinance";
import {
  exportEntries,
  id,
  importEntries,
  migrateLegacy,
  moneyInput,
  parseMoney,
  today,
  totals,
  validDate,
  validateFinance,
  type Account,
  type Budget,
  type Entry,
  type Goal,
} from "./model";
import { AuthScreen } from "./components/AuthScreen";
import { Button, Card, Empty, Eyebrow, Modal } from "./components/ui";

type View = "Início" | "Lançamentos" | "Contas" | "Planejamento" | "Metas";
const navigation: { name: View; icon: LucideIcon; mobile: string }[] = [
  { name: "Início", icon: Home, mobile: "Início" },
  { name: "Lançamentos", icon: ReceiptText, mobile: "Extrato" },
  { name: "Contas", icon: WalletCards, mobile: "Contas" },
  { name: "Planejamento", icon: LayoutGrid, mobile: "Planejar" },
  { name: "Metas", icon: Target, mobile: "Metas" },
];
type Editor = {
  kind: "entry" | "account" | "budget" | "goal" | "contribution";
  entry?: Entry;
  account?: Account;
  budget?: Budget;
  goal?: Goal;
};
const categories = [
  "Alimentação",
  "Moradia",
  "Transporte",
  "Saúde",
  "Lazer",
  "Contas",
  "Renda",
  "Outros",
];
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export default function App() {
  const [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(!!supabase),
    [demo, setDemo] = useState(false),
    [recovery, setRecovery] = useState(
      new URLSearchParams(location.search).has("recovery"),
    );
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          setSession(data.session);
          setLoading(false);
          if (error) setAuthError(error.message);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setAuthError("Falha ao verificar sua sessão.");
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  if (loading)
    return (
      <main className="grid min-h-dvh place-items-center text-sm text-slate-500">
        Abrindo seu Fôlego…
      </main>
    );
  if (recovery || (!session && !demo))
    return (
      <>
        <AuthScreen
          recovery={recovery}
          onRecovered={() => {
            setRecovery(false);
            history.replaceState(null, "", location.pathname);
          }}
          onDemo={() => setDemo(true)}
        />
        {authError && (
          <p role="alert" className="p-4 text-center text-sm text-red-700">
            {authError}
          </p>
        )}
      </>
    );
  return (
    <FinanceApp
      key={session?.user.id ?? "demo"}
      userId={session?.user.id ?? null}
      name={
        session?.user.user_metadata?.display_name ||
        session?.user.email?.split("@")[0] ||
        "você"
      }
      onExit={async () => {
        if (session && supabase) {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        }
        setDemo(false);
      }}
    />
  );
}

function FinanceApp({
  userId,
  name,
  onExit,
}: {
  userId: string | null;
  name: string;
  onExit: () => Promise<void>;
}) {
  const finance = useFinance(userId);
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("folego-theme");
      return saved
        ? saved === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#101d1b" : "#f3f7f5");
    try {
      localStorage.setItem("folego-theme", dark ? "dark" : "light");
    } catch {
      /* Preference is optional when storage is unavailable. */
    }
  }, [dark]);
  const { data, update } = finance;
  const [view, setView] = useState<View>("Início"),
    [month, setMonth] = useState(today().slice(0, 7)),
    [hidden, setHidden] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState<{
      title: string;
      action: () => void;
    } | null>(null);
  const csvInput = useRef<HTMLInputElement>(null),
    backupInput = useRef<HTMLInputElement>(null);
  const monthly = data.entries.filter((e) => e.date.startsWith(month));
  const summary = totals(monthly);
  const balance =
    data.accounts.reduce((s, a) => s + a.opening, 0) +
    totals(data.entries).balance;
  const money = (cents: number) =>
    hidden ? "R$ •••••" : currency.format(cents / 100);
  const monthLabel = new Date(month + "-15T12:00:00").toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric" },
  );
  const visible = monthly
    .filter(
      (e) =>
        (e.title + " " + e.category)
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()) &&
        (!filter || e.type === filter),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const budgetTotal = data.budgets.reduce((s, b) => s + b.limit, 0);
  const spent = (category: string) =>
    monthly
      .filter(
        (e) =>
          e.type === "expense" &&
          e.category.toLocaleLowerCase() === category.toLocaleLowerCase(),
      )
      .reduce((s, e) => s + e.cents, 0);
  function notify(text: string) {
    setToast(text);
  }
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  function act(fn: () => void) {
    setError("");
    try {
      fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    }
  }
  function changeMonth(offset: number) {
    const d = new Date(month + "-15T12:00:00");
    d.setMonth(d.getMonth() + offset);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function download(content: string, type: string, filename: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function backup() {
    download(
      JSON.stringify({ version: 3, data }, null, 2),
      "application/json",
      "folego-backup.json",
    );
  }
  function legacyImport() {
    act(() => {
      const raw = localStorage.getItem("folego.transactions.v1");
      if (!raw)
        throw new Error(
          "Nenhum registro antigo encontrado nesta origem do navegador. Abra a nova versão no mesmo endereço usado anteriormente.",
        );
      const legacy = JSON.parse(raw);
      const year = Number(today().slice(0, 4));
      const preview = migrateLegacy(legacy, year, data);
      const count = preview.entries.length - data.entries.length;
      setConfirm({
        title: `Importar ${count} lançamento(s) da versão antiga ${userId ? "para esta conta sincronizada" : "para a demonstração"}? Datas sem ano serão interpretadas como ${year}. Os dados antigos serão mantidos.`,
        action: () => {
          act(() => {
            update((d) => migrateLegacy(legacy, year, d));
            notify("Registros antigos importados.");
          });
        },
      });
    });
  }
  async function readFile(file: File | undefined, kind: "csv" | "backup") {
    if (!file) return;
    setError("");
    try {
      if (file.size > 5_000_000) throw new Error("Use um arquivo de até 5 MB.");
      const text = await file.text();
      if (kind === "csv") {
        update((d) => importEntries(text, d));
        notify("CSV importado. IDs existentes foram ignorados.");
      } else {
        const parsed = JSON.parse(text);
        if (parsed.version !== 3 || !validateFinance(parsed.data))
          throw new Error("Backup inválido ou de versão incompatível.");
        setConfirm({
          title:
            "Substituir os registros atuais pelo backup? Exporte uma cópia antes.",
          action: () => {
            update(() => parsed.data);
            notify("Backup restaurado.");
          },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Arquivo inválido.");
    }
  }
  function generateRecurring() {
    let count = 0;
    update((d) => {
      const next = structuredClone(d);
      const templates = new Map<string, Entry>();
      d.entries
        .filter((e) => e.recurring && e.date.slice(0, 7) < month)
        .forEach((e) => {
          const key = [e.title, e.category, e.accountId, e.type, e.cents].join(
            "|",
          );
          if (!templates.has(key) || templates.get(key)!.date < e.date)
            templates.set(key, e);
        });
      templates.forEach((e) => {
        const last = new Date(
          Number(month.slice(0, 4)),
          Number(month.slice(5, 7)),
          0,
        ).getDate();
        const date =
          month +
          "-" +
          String(Math.min(Number(e.date.slice(8)), last)).padStart(2, "0");
        if (
          next.entries.some(
            (x) =>
              x.title === e.title &&
              x.accountId === e.accountId &&
              x.type === e.type &&
              x.cents === e.cents &&
              x.date === date,
          )
        )
          return;
        next.entries.push({ ...e, id: id(), date });
        count++;
      });
      return next;
    });
    notify(
      count
        ? `${count} recorrência(s) criada(s) no mês.`
        : "Nenhuma recorrência pendente de meses anteriores.",
    );
  }
  const statusText = {
    loading: "Carregando",
    local: "Demonstração • dados locais",
    synced: "Sincronizado",
    pending: "Alterações pendentes",
    saving: "Salvando",
    error: "Falha de conexão",
    conflict: "Conflito entre aparelhos",
  }[finance.status];
  if (!finance.ready)
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <Card>
          <h1 className="font-bold">{statusText}</h1>
          {finance.error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {finance.error}
            </p>
          )}
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => location.reload()}
          >
            Tentar novamente
          </Button>
        </Card>
      </main>
    );
  const entryRows = (entries: Entry[]) =>
    entries.length ? (
      entries.map((e) => (
        <article
          key={e.id}
          className="flex min-w-0 items-center gap-3 border-t border-slate-100 py-4 first:border-0"
        >
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${e.type === "income" ? "bg-brand-50 text-brand-600" : "bg-orange-50 text-orange-600"}`}
          >
            {e.type === "income" ? (
              <ArrowDownLeft size={22} />
            ) : (
              <ArrowUpRight size={22} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{e.title}</p>
            <p className="mt-1 truncate text-xs text-slate-400">
              {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR")} ·{" "}
              {e.category}
            </p>
          </div>
          <strong
            className={`shrink-0 text-xs tabular-nums sm:text-sm ${e.type === "income" ? "text-brand-600" : ""}`}
          >
            {e.type === "income" ? "+" : "−"} {money(e.cents)}
          </strong>
          <button
            aria-label={`Editar ${e.title}`}
            onClick={() => setEditor({ kind: "entry", entry: e })}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-50"
          >
            <Pencil size={18} />
          </button>
        </article>
      ))
    ) : (
      <Empty>
        Você ainda não tem lançamentos neste período.
        <br />
        Use o botão + para começar.
      </Empty>
    );
  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-brand-950 p-5 text-white lg:flex">
        <div className="mb-10 flex items-center gap-3 px-2 text-2xl font-extrabold">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-500">
            F
          </span>
          Fôlego
        </div>
        <nav aria-label="Navegação principal" className="space-y-2">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-current={view === name ? "page" : undefined}
              onClick={() => setView(name)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold ${view === name ? "bg-white/12 text-white" : "text-emerald-100/60 hover:bg-white/5"}`}
            >
              <Icon size={21} />
              {name}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 p-4">
          <p className="text-xs text-emerald-200/60">Sua conta</p>
          <p className="mt-1 truncate text-sm font-bold">{name}</p>
          <button
            className="mt-4 flex items-center gap-2 text-xs text-emerald-100/70"
            onClick={() => void onExit().catch((e) => setError(String(e)))}
          >
            <LogOut size={16} />
            {userId ? "Sair da conta" : "Sair da demonstração"}
          </button>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {userId ? "SEU ESPAÇO FINANCEIRO" : "DEMONSTRAÇÃO LOCAL"}
            </p>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight">
              {view}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
              aria-pressed={dark}
              title={dark ? "Ativar tema claro" : "Ativar tema escuro"}
              onClick={() => setDark((value) => !value)}
              className="grid size-12 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500"
            >
              {dark ? <Sun size={22} /> : <Moon size={22} />}
            </button>
            <button
              aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
              aria-pressed={hidden}
              onClick={() => setHidden((v) => !v)}
              className="grid size-12 place-items-center rounded-xl border border-slate-200 text-slate-500"
            >
              {hidden ? <Eye size={22} /> : <EyeOff size={22} />}
            </button>
            <button
              aria-label={userId ? "Sair da conta" : "Sair da demonstração"}
              onClick={() => void onExit().catch((e) => setError(String(e)))}
              className="grid size-12 place-items-center rounded-xl border border-slate-200 text-slate-500 lg:hidden"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>
        <main
          key={view}
          className="screen-enter mx-auto max-w-7xl space-y-5 px-3 pt-5 pb-32 sm:px-8 lg:pb-12"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto">
              <button
                aria-label="Mês anterior"
                onClick={() => changeMonth(-1)}
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-white"
              >
                <ChevronLeft size={20} />
              </button>
              <p className="min-w-0 flex-1 text-center text-sm font-bold capitalize sm:min-w-40">
                {monthLabel}
              </p>
              <button
                aria-label="Próximo mês"
                onClick={() => changeMonth(1)}
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-white"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <Button
              onClick={() => setEditor({ kind: "entry" })}
              className="hidden sm:inline-flex"
            >
              <Plus size={19} />
              Adicionar lançamento
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span role="status">{statusText}</span>
            <div className="flex items-center gap-3">
              <button onClick={legacyImport} className="min-h-10 font-semibold">
                Importar versão antiga
              </button>
              {userId && (
                <button
                  onClick={finance.retry}
                  className="flex min-h-10 items-center gap-2 font-semibold"
                >
                  <RefreshCw size={14} />
                  Sincronizar
                </button>
              )}
            </div>
          </div>
          {(error || finance.error) && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error || finance.error}
            </p>
          )}
          {finance.status === "conflict" && (
            <Card>
              <h2 className="font-bold">
                Há alterações feitas em outro aparelho
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Suas alterações locais foram preservadas. Exporte um backup
                antes de carregar a versão salva no servidor.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={backup}>Exportar minha cópia</Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setConfirm({
                      title:
                        "Descartar alterações locais e carregar os registros do servidor?",
                      action: () => {
                        void finance
                          .reloadRemote()
                          .catch((e) => setError(String(e)));
                      },
                    })
                  }
                >
                  Carregar do servidor
                </Button>
              </div>
            </Card>
          )}
          {view === "Início" && (
            <>
              <section className="hero-banner flex items-start justify-between gap-4 rounded-3xl bg-linear-to-br from-brand-950 to-brand-700 p-6 text-white sm:p-8">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">
                    UM PASSO DE CADA VEZ
                  </p>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                    Olá, {name}
                  </h2>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-emerald-100/80">
                    {monthly.length
                      ? "Seu mês está aqui. Acompanhe os registros e ajuste os próximos passos."
                      : "Seu controle começa com o primeiro lançamento."}
                  </p>
                </div>
                <ShieldCheck size={32} className="shrink-0 text-emerald-200" />
              </section>
              <div className="grid gap-4 md:grid-cols-2">
                <Metric label="Saldo das contas" value={money(balance)} large />
                <Card>
                  <Eyebrow>RESUMO DO PERÍODO</Eyebrow>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400">Receitas</p>
                      <p className="mt-2 text-lg font-extrabold text-brand-600">
                        {money(summary.income)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Despesas</p>
                      <p className="mt-2 text-lg font-extrabold">
                        {money(summary.expense)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    {summary.income > 0
                      ? `${Math.round((summary.balance / summary.income) * 100)}% da renda do período disponível`
                      : "Cadastre receitas para calcular sua margem do mês."}
                  </p>
                </Card>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {navigation
                  .filter((n) => n.name !== "Início")
                  .map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      onClick={() => setView(name)}
                      className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs font-extrabold shadow-card"
                    >
                      <Icon size={23} className="shrink-0 text-brand-600" />
                      {name}
                    </button>
                  ))}
              </div>
              <div className="grid items-start gap-5 xl:grid-cols-2">
                <Card>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-extrabold">Atividade recente</h2>
                    <button
                      onClick={() => setView("Lançamentos")}
                      className="min-h-11 text-xs font-bold text-brand-600"
                    >
                      Ver extrato
                    </button>
                  </div>
                  {entryRows(
                    [...monthly]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 5),
                  )}
                </Card>
                <Card>
                  <h2 className="mb-5 font-extrabold">Limites por categoria</h2>
                  {data.budgets.length ? (
                    data.budgets.map((b) => (
                      <BudgetLine
                        key={b.id}
                        budget={b}
                        spent={spent(b.category)}
                        money={money}
                        onEdit={() => setEditor({ kind: "budget", budget: b })}
                      />
                    ))
                  ) : (
                    <Empty>
                      Defina um limite em Planejamento para acompanhar seus
                      gastos.
                    </Empty>
                  )}
                </Card>
              </div>
            </>
          )}
          {view === "Lançamentos" && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Metric label="Entradas" value={money(summary.income)} />
                <Metric label="Saídas" value={money(summary.expense)} />
                <Metric
                  label="Saldo do período"
                  value={money(summary.balance)}
                  className="col-span-2 md:col-span-1"
                />
              </div>
              <Card>
                <div className="mb-3 flex flex-wrap gap-2">
                  <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3">
                    <Search size={18} className="shrink-0 text-slate-400" />
                    <input
                      aria-label="Buscar lançamento"
                      placeholder="Buscar lançamento"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="min-h-12 w-full bg-transparent text-sm outline-none"
                    />
                  </label>
                  <select
                    aria-label="Filtrar por tipo"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="field max-w-32"
                  >
                    <option value="">Todos</option>
                    <option value="income">Receitas</option>
                    <option value="expense">Despesas</option>
                  </select>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button
                    variant="secondary"
                    className="min-w-0 px-3 sm:px-4"
                    onClick={() => csvInput.current?.click()}
                  >
                    <Upload size={17} />
                    Importar
                  </Button>
                  <Button
                    variant="secondary"
                    className="min-w-0 px-3 sm:px-4"
                    onClick={() =>
                      download(
                        exportEntries(data),
                        "text/csv;charset=utf-8",
                        "folego-lancamentos.csv",
                      )
                    }
                  >
                    <Download size={17} />
                    Exportar
                  </Button>
                  <Button
                    variant="secondary"
                    className="col-span-2 min-w-0 px-3 sm:px-4"
                    onClick={() => act(generateRecurring)}
                  >
                    <RefreshCw size={17} />
                    Gerar recorrências
                  </Button>
                </div>
                {entryRows(visible)}
              </Card>
            </>
          )}
          {view === "Contas" && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold">Suas contas</h2>
                <Button onClick={() => setEditor({ kind: "account" })}>
                  <Plus size={18} />
                  Nova conta
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.accounts.map((a) => (
                  <Card key={a.id}>
                    <div className="flex items-center justify-between">
                      <WalletCards size={24} className="text-brand-600" />
                      <button
                        aria-label={`Editar conta ${a.name}`}
                        onClick={() =>
                          setEditor({ kind: "account", account: a })
                        }
                        className="grid size-11 place-items-center rounded-xl hover:bg-slate-50"
                      >
                        <Pencil size={17} />
                      </button>
                    </div>
                    <h3 className="mt-3 font-bold">{a.name}</h3>
                    <p className="mt-3 text-2xl font-extrabold tabular-nums">
                      {money(
                        a.opening +
                          totals(
                            data.entries.filter((e) => e.accountId === a.id),
                          ).balance,
                      )}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Saldo inicial + todos os lançamentos desta conta
                    </p>
                  </Card>
                ))}
              </div>
              <Card>
                <h2 className="font-extrabold">Seus dados</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Mantenha uma cópia dos registros. Um backup inclui contas,
                  lançamentos, limites e metas.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={backup}>
                    <Download size={18} />
                    Backup completo
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => backupInput.current?.click()}
                  >
                    <Upload size={18} />
                    Restaurar backup
                  </Button>
                </div>
              </Card>
            </>
          )}
          {view === "Planejamento" && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold">Orçamento do mês</h2>
                <Button onClick={() => setEditor({ kind: "budget" })}>
                  <Plus size={18} />
                  Novo limite
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Metric
                  label="Limites cadastrados"
                  value={money(budgetTotal)}
                />
                <Metric
                  label="Gasto do período"
                  value={money(summary.expense)}
                />
              </div>
              <Card>
                {data.budgets.length ? (
                  data.budgets.map((b) => (
                    <BudgetLine
                      key={b.id}
                      budget={b}
                      spent={spent(b.category)}
                      money={money}
                      onEdit={() => setEditor({ kind: "budget", budget: b })}
                    />
                  ))
                ) : (
                  <Empty>Crie seu primeiro limite por categoria.</Empty>
                )}
              </Card>
              <p className="text-xs leading-5 text-slate-500">
                Os limites são mensais e se repetem nos períodos selecionados. O
                gasto considera a categoria de cada despesa.
              </p>
            </>
          )}
          {view === "Metas" && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold">Seus próximos passos</h2>
                <Button onClick={() => setEditor({ kind: "goal" })}>
                  <Plus size={18} />
                  Criar meta
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.goals.map((g) => (
                  <Card key={g.id}>
                    <div className="flex items-center justify-between">
                      <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                        <Target size={24} />
                      </span>
                      <button
                        aria-label={`Editar meta ${g.name}`}
                        onClick={() => setEditor({ kind: "goal", goal: g })}
                        className="grid size-11 place-items-center rounded-xl hover:bg-slate-50"
                      >
                        <Pencil size={17} />
                      </button>
                    </div>
                    <h3 className="mt-5 text-lg font-extrabold">{g.name}</h3>
                    <p className="mt-3 text-2xl font-extrabold">
                      {money(g.saved)}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      de {money(g.target)} · até{" "}
                      {new Date(g.deadline + "T12:00:00").toLocaleDateString(
                        "pt-BR",
                      )}
                    </p>
                    <Progress value={(g.saved / g.target) * 100} />
                    <Button
                      variant="secondary"
                      className="mt-5 w-full"
                      onClick={() =>
                        setEditor({ kind: "contribution", goal: g })
                      }
                    >
                      Registrar aporte
                    </Button>
                  </Card>
                ))}
              </div>
              {!data.goals.length && (
                <Card>
                  <Empty>Crie uma meta para acompanhar seu progresso.</Empty>
                </Card>
              )}
              <p className="text-xs leading-5 text-slate-500">
                Aportes atualizam o progresso da meta. Não movimentam
                automaticamente o saldo de uma conta.
              </p>
            </>
          )}
        </main>
      </div>
      <nav
        aria-label="Navegação mobile"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-center border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur lg:hidden"
      >
        {navigation
          .filter((n) => n.name !== "Contas")
          .slice(0, 2)
          .map((n) => (
            <NavItem key={n.name} item={n} active={view} onNavigate={setView} />
          ))}
        <button
          aria-label="Adicionar lançamento"
          onClick={() => setEditor({ kind: "entry" })}
          className="mx-auto -mt-7 grid size-16 place-items-center rounded-full border-4 border-canvas bg-brand-600 text-white shadow-lg shadow-brand-600/25"
        >
          <Plus size={29} />
        </button>
        {navigation
          .filter((n) => n.name !== "Contas")
          .slice(2)
          .map((n) => (
            <NavItem key={n.name} item={n} active={view} onNavigate={setView} />
          ))}
      </nav>
      <input
        ref={csvInput}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-label="Arquivo CSV"
        onChange={(e) => {
          void readFile(e.target.files?.[0], "csv");
          e.target.value = "";
        }}
      />
      <input
        ref={backupInput}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-label="Arquivo de backup"
        onChange={(e) => {
          void readFile(e.target.files?.[0], "backup");
          e.target.value = "";
        }}
      />
      {editor && (
        <EditorDialog
          editor={editor}
          accounts={data.accounts}
          onClose={() => setEditor(null)}
          onSave={(values) => {
            act(() => {
              if (editor.kind === "entry") {
                const cents = parseMoney(values.amount);
                const entry: Entry = {
                  id: editor.entry?.id ?? id(),
                  title: values.title.trim(),
                  category: values.category.trim(),
                  accountId: values.accountId,
                  date: values.date,
                  type: values.type as Entry["type"],
                  cents,
                  recurring: values.recurring === "true",
                };
                if (cents <= 0 || !validDate(entry.date))
                  throw new Error("Informe valor positivo e data válida.");
                update((d) => ({
                  ...d,
                  entries: [
                    ...d.entries.filter((e) => e.id !== entry.id),
                    entry,
                  ],
                }));
              }
              if (editor.kind === "account") {
                const account = {
                  id: editor.account?.id ?? id(),
                  name: values.name.trim(),
                  opening: parseMoney(values.amount),
                };
                update((d) => ({
                  ...d,
                  accounts: [
                    ...d.accounts.filter((a) => a.id !== account.id),
                    account,
                  ],
                }));
              }
              if (editor.kind === "budget") {
                const budget = {
                  id: editor.budget?.id ?? id(),
                  category: values.category.trim(),
                  limit: parseMoney(values.amount),
                };
                update((d) => ({
                  ...d,
                  budgets: [
                    ...d.budgets.filter((b) => b.id !== budget.id),
                    budget,
                  ],
                }));
              }
              if (editor.kind === "goal") {
                const goal = {
                  id: editor.goal?.id ?? id(),
                  name: values.name.trim(),
                  target: parseMoney(values.amount),
                  saved: editor.goal?.saved ?? 0,
                  deadline: values.date,
                };
                update((d) => ({
                  ...d,
                  goals: [...d.goals.filter((g) => g.id !== goal.id), goal],
                }));
              }
              if (editor.kind === "contribution") {
                const amount = parseMoney(values.amount);
                if (amount <= 0)
                  throw new Error("Informe um aporte maior que zero.");
                update((d) => ({
                  ...d,
                  goals: d.goals.map((g) =>
                    g.id === editor.goal?.id
                      ? { ...g, saved: g.saved + amount }
                      : g,
                  ),
                }));
              }
              setEditor(null);
              notify("Registro salvo.");
            });
          }}
          onDelete={() => {
            setConfirm({
              title: "Excluir este registro? Esta ação não pode ser desfeita.",
              action: () => {
                act(() => {
                  update((d) => {
                    if (editor.kind === "entry")
                      return {
                        ...d,
                        entries: d.entries.filter(
                          (e) => e.id !== editor.entry?.id,
                        ),
                      };
                    if (editor.kind === "account") {
                      if (
                        d.entries.some(
                          (e) => e.accountId === editor.account?.id,
                        )
                      )
                        throw new Error(
                          "Exclua ou mova os lançamentos da conta antes de removê-la.",
                        );
                      return {
                        ...d,
                        accounts: d.accounts.filter(
                          (a) => a.id !== editor.account?.id,
                        ),
                      };
                    }
                    if (editor.kind === "budget")
                      return {
                        ...d,
                        budgets: d.budgets.filter(
                          (b) => b.id !== editor.budget?.id,
                        ),
                      };
                    return {
                      ...d,
                      goals: d.goals.filter((g) => g.id !== editor.goal?.id),
                    };
                  });
                  setEditor(null);
                  notify("Registro excluído.");
                });
              },
            });
          }}
          error={error}
        />
      )}
      {confirm && (
        <Modal title="Confirme a alteração" onClose={() => setConfirm(null)}>
          <p className="text-sm leading-6 text-slate-500">{confirm.title}</p>
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const action = confirm.action;
                setConfirm(null);
                action();
              }}
            >
              Confirmar
            </Button>
          </div>
        </Modal>
      )}
      {toast && (
        <div
          role="status"
          className="fixed right-4 bottom-28 left-4 z-40 mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl bg-brand-950 px-5 py-4 text-sm font-semibold text-white shadow-xl lg:bottom-5"
        >
          <ShieldCheck size={19} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  large = false,
  className = "",
}: {
  label: string;
  value: string;
  large?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <Eyebrow>{label}</Eyebrow>
      <p
        className={`mt-3 font-extrabold tracking-tight tabular-nums ${large ? "text-3xl sm:text-4xl" : "text-lg sm:text-2xl"}`}
      >
        {value}
      </p>
    </Card>
  );
}
function Progress({ value }: { value: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Progresso"
      aria-valuenow={Math.round(Math.min(100, Math.max(0, value)))}
      aria-valuemin={0}
      aria-valuemax={100}
      className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
    >
      <div
        className={`h-full rounded-full ${value > 100 ? "bg-orange-500" : "bg-brand-500"}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
function BudgetLine({
  budget,
  spent,
  money,
  onEdit,
}: {
  budget: Budget;
  spent: number;
  money: (cents: number) => string;
  onEdit: () => void;
}) {
  return (
    <div className="border-t border-slate-100 py-5 first:border-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">{budget.category}</p>
          <p className="mt-2 text-xs text-slate-500">
            {money(spent)} de {money(budget.limit)}
          </p>
        </div>
        <button
          aria-label={`Editar limite ${budget.category}`}
          onClick={onEdit}
          className="grid size-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-50"
        >
          <Pencil size={17} />
        </button>
      </div>
      <Progress value={(spent / budget.limit) * 100} />
      {spent > budget.limit && (
        <p className="mt-2 text-xs text-orange-700">
          Limite ultrapassado em {money(spent - budget.limit)}.
        </p>
      )}
    </div>
  );
}
function NavItem({
  item,
  active,
  onNavigate,
}: {
  item: (typeof navigation)[number];
  active: View;
  onNavigate: (view: View) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onNavigate(item.name)}
      aria-current={item.name === active ? "page" : undefined}
      className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-bold ${item.name === active ? "bg-brand-50 text-brand-600" : "text-slate-400"}`}
    >
      <Icon size={25} strokeWidth={item.name === active ? 2.5 : 2} />
      {item.mobile}
    </button>
  );
}
function EditorDialog({
  editor,
  accounts,
  onClose,
  onSave,
  onDelete,
  error,
}: {
  editor: Editor;
  accounts: Account[];
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
  onDelete: () => void;
  error: string;
}) {
  const e = editor.entry,
    a = editor.account,
    b = editor.budget,
    g = editor.goal;
  const [values, setValues] = useState<Record<string, string>>({
    title: e?.title ?? "",
    category: e?.category ?? b?.category ?? "Alimentação",
    type: e?.type ?? "expense",
    accountId: e?.accountId ?? accounts[0]?.id ?? "",
    date: e?.date ?? g?.deadline ?? today(),
    amount: moneyInput(
      e?.cents ??
        a?.opening ??
        b?.limit ??
        (editor.kind === "goal" ? g?.target : 0) ??
        0,
    ),
    recurring: String(e?.recurring ?? false),
    name: a?.name ?? g?.name ?? "",
  });
  const set = (key: string, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));
  const kind = editor.kind;
  const title = {
    entry: e ? "Editar lançamento" : "Novo lançamento",
    account: a ? "Editar conta" : "Nova conta",
    budget: b ? "Editar limite" : "Novo limite",
    goal: g ? "Editar meta" : "Nova meta",
    contribution: `Aporte: ${g?.name ?? ""}`,
  }[kind];
  const amountLabel = {
    entry: "Valor (R$)",
    account: "Saldo inicial (R$)",
    budget: "Limite mensal (R$)",
    goal: "Valor desejado (R$)",
    contribution: "Valor do aporte (R$)",
  }[kind];
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSave(values);
        }}
      >
        {kind === "entry" && (
          <>
            <label className="label">
              Tipo
              <select
                className="field"
                value={values.type}
                onChange={(e) => set("type", e.target.value)}
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </label>
            <label className="label">
              Descrição
              <input
                autoFocus
                className="field"
                required
                maxLength={160}
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </label>
          </>
        )}
        {(kind === "account" || kind === "goal") && (
          <label className="label">
            Nome
            <input
              autoFocus
              className="field"
              required
              maxLength={160}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>
        )}
        <label className="label">
          {amountLabel}
          <input
            className="field"
            inputMode="decimal"
            required
            value={values.amount}
            onChange={(e) => set("amount", e.target.value)}
          />
        </label>
        {(kind === "entry" || kind === "goal") && (
          <label className="label">
            {kind === "goal" ? "Prazo" : "Data"}
            <input
              className="field"
              type="date"
              required
              value={values.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </label>
        )}
        {(kind === "entry" || kind === "budget") && (
          <label className="label">
            Categoria
            <input
              className="field"
              required
              maxLength={160}
              list="categories"
              value={values.category}
              onChange={(e) => set("category", e.target.value)}
            />
            <datalist id="categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        )}
        {kind === "entry" && (
          <>
            <label className="label">
              Conta
              <select
                className="field"
                required
                value={values.accountId}
                onChange={(e) => set("accountId", e.target.value)}
              >
                <option value="" disabled>
                  Selecione uma conta
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            {!accounts.length && (
              <p className="text-sm text-orange-700">
                Cadastre uma conta antes de adicionar lançamentos.
              </p>
            )}
            <label className="flex min-h-11 items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={values.recurring === "true"}
                onChange={(e) => set("recurring", String(e.target.checked))}
                className="size-5 accent-brand-600"
              />
              Disponibilizar como recorrência mensal
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1">
            Salvar
          </Button>
          {(e || a || b || (g && kind === "goal")) && (
            <Button type="button" variant="danger" onClick={onDelete}>
              <Trash2 size={18} />
              Excluir
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
