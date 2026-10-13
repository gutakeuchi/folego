import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Home,
  Landmark,
  LayoutGrid,
  ListFilter,
  ListTree,
  MoreHorizontal,
  PiggyBank,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";

type View = "Início" | "Lançamentos" | "Contas" | "Planejamento" | "Metas";
type Transaction = {
  id: number;
  title: string;
  category: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  account: string;
};

const initialTransactions: Transaction[] = [
  { id: 1, title: "Salário", category: "Renda", date: "05 out", amount: 4850, type: "income", account: "Conta principal" },
  { id: 2, title: "Supermercado", category: "Alimentação", date: "08 out", amount: 387.45, type: "expense", account: "Cartão principal" },
  { id: 3, title: "Aluguel", category: "Moradia", date: "07 out", amount: 1450, type: "expense", account: "Conta principal" },
  { id: 4, title: "Internet", category: "Contas", date: "06 out", amount: 119.9, type: "expense", account: "Conta principal" },
  { id: 5, title: "Freelance", category: "Renda extra", date: "03 out", amount: 650, type: "income", account: "Conta principal" },
];

const navigation = [
  { name: "Início" as View, icon: Home },
  { name: "Lançamentos" as View, icon: ReceiptText },
  { name: "Contas" as View, icon: WalletCards },
  { name: "Planejamento" as View, icon: LayoutGrid },
  { name: "Metas" as View, icon: Target },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function App() {
  const [view, setView] = useState<View>("Início");
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem("folego.transactions.v1");
      if (!saved) return initialTransactions;
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.every((item) => item && typeof item.id === "number" && typeof item.title === "string" && typeof item.category === "string" && typeof item.date === "string" && typeof item.account === "string" && Number.isFinite(item.amount) && item.amount > 0 && ["income", "expense"].includes(item.type))) return initialTransactions;
      return parsed;
    } catch { return initialTransactions; }
  });
  const [hideValues, setHideValues] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "Alimentação",
    type: "expense" as "income" | "expense",
    account: "Conta principal",
    date: "2026-10-09",
    recurring: false,
  });
  const [formError, setFormError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { localStorage.setItem("folego.transactions.v1", JSON.stringify(transactions)); }
    catch { setToast("Não foi possível salvar neste dispositivo. Exporte seus lançamentos para guardar uma cópia."); }
  }, [transactions]);

  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expenses;
  const money = (value: number) => (hideValues ? "R$ •••••" : currency.format(value));
  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (item) =>
          (item.title + item.category).toLowerCase().includes(query.toLowerCase()) &&
          (!typeFilter || item.type === typeFilter),
      ),
    [transactions, query, typeFilter],
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function submitTransaction(event: FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount.replace(/\./g, "").replace(",", "."));
    if (!form.title.trim()) {
      setFormError("Digite uma descrição para o lançamento.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Informe um valor maior que zero.");
      return;
    }
    const date = new Date(form.date + "T12:00:00")
      .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
      .replace(".", "");
    setTransactions((current) => [
      {
        id: Date.now(),
        title: form.title.trim(),
        category: form.category,
        date,
        amount,
        type: form.type,
        account: form.account,
      },
      ...current,
    ]);
    setForm({ title: "", amount: "", category: "Alimentação", type: "expense", account: "Conta principal", date: "2026-10-09", recurring: false });
    setFormError("");
    setDialogOpen(false);
    showToast("Lançamento adicionado com sucesso");
  }

  function exportCsv() {
    const rows = [
      "Descrição,Categoria,Data,Tipo,Conta,Valor",
      ...transactions.map((item) => [item.title, item.category, item.date, item.type, item.account, item.amount].join(",")),
    ];
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    anchor.download = "lancamentos-folego.csv";
    anchor.click();
    showToast("Arquivo CSV exportado");
  }

  function importCsv(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = String(reader.result).split(/\r?\n/).slice(1).filter(Boolean);
      let imported = 0;
      const additions: Transaction[] = [];
      rows.forEach((line, index) => {
        const [title, category, date, type, account, rawAmount] = line.split(",").map((value) => value.trim());
        const amount = Number(rawAmount?.replace(",", "."));
        if (title && Number.isFinite(amount) && amount > 0) {
          additions.push({
            id: Date.now() + index,
            title,
            category: category || "Outros",
            date: date || "Hoje",
            type: type === "income" ? "income" : "expense",
            account: account || "Conta principal",
            amount,
          });
          imported += 1;
        }
      });
      setTransactions((current) => [...additions, ...current]);
      showToast(imported ? `${imported} lançamento(s) importado(s)` : "Nenhum lançamento válido encontrado");
    };
    reader.readAsText(file, "utf-8");
  }

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    void context.registerTool(
      {
        name: "add_financial_transaction",
        title: "Adicionar lançamento financeiro",
        description: "Adiciona uma receita ou despesa ao painel financeiro visível.",
        inputSchema: {
          type: "object",
          properties: {
            description: { type: "string" },
            category: { type: "string" },
            amount: { type: "number" },
            type: { enum: ["income", "expense"] },
          },
          required: ["description", "category", "amount", "type"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input: unknown) {
          const data = input as { description: string; category: string; amount: number; type: "income" | "expense" };
          if (!data.description || !Number.isFinite(data.amount) || data.amount <= 0) throw new Error("Dados inválidos");
          setTransactions((current) => [
            { id: Date.now(), title: data.description, category: data.category, amount: data.amount, type: data.type, date: "Hoje", account: "Conta principal" },
            ...current,
          ]);
          return { status: "adicionado", description: data.description, amount: data.amount };
        },
      },
      { signal: controller.signal },
    );
    return () => controller.abort();
  }, []);

  return (
    <div className="app-shell">
      <Sidebar active={view} onNavigate={setView} />
      <div className="app-main">
        <AppHeader active={view} hidden={hideValues} onToggleHidden={() => setHideValues((value) => !value)} />
        <main className="page">
          {view === "Início" && (
            <HomeView
              balance={balance}
              income={income}
              expenses={expenses}
              money={money}
              transactions={transactions}
              onNavigate={setView}
              onAdd={() => setDialogOpen(true)}
              hidden={hideValues}
              onToggleHidden={() => setHideValues((value) => !value)}
            />
          )}
          {view === "Lançamentos" && (
            <TransactionsView
              transactions={filteredTransactions}
              income={income}
              expenses={expenses}
              money={money}
              query={query}
              typeFilter={typeFilter}
              onQuery={setQuery}
              onTypeFilter={setTypeFilter}
              onAdd={() => setDialogOpen(true)}
              onExport={exportCsv}
              onImport={() => fileInput.current?.click()}
            />
          )}
          {view === "Contas" && <AccountsView money={money} />}
          {view === "Planejamento" && <PlanningView money={money} />}
          {view === "Metas" && <GoalsView money={money} onToast={showToast} />}
        </main>
      </div>

      <MobileNavigation active={view} onNavigate={setView} onAdd={() => setDialogOpen(true)} />
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => importCsv(event.target.files?.[0])}
      />
      {dialogOpen && (
        <TransactionDialog
          form={form}
          error={formError}
          onChange={setForm}
          onClose={() => {
            setDialogOpen(false);
            setFormError("");
          }}
          onSubmit={submitTransaction}
        />
      )}
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">
        <ShieldCheck size={18} />
        {toast}
      </div>
    </div>
  );
}

function Sidebar({ active, onNavigate }: { active: View; onNavigate: (view: View) => void }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span>F</span>
        <strong>Fôlego</strong>
      </div>
      <nav aria-label="Navegação principal">
        {navigation.map(({ name, icon: Icon }) => (
          <button key={name} className={active === name ? "active" : ""} aria-current={active === name ? "page" : undefined} onClick={() => onNavigate(name)}>
            <Icon size={20} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-progress">
        <span>PLANEJAMENTO DO MÊS</span>
        <strong>64% da renda livre</strong>
        <div className="progress-track"><i style={{ width: "64%" }} /></div>
        <small>Seu melhor resultado em 3 meses</small>
      </div>
      <button className="profile-button">
        <span className="avatar">GM</span>
        <span><strong>Gustavo</strong><small>Conta pessoal</small></span>
        <ChevronDown size={16} />
      </button>
    </aside>
  );
}

function AppHeader({ active, hidden, onToggleHidden }: { active: View; hidden: boolean; onToggleHidden: () => void }) {
  return (
    <header className="app-header">
      <div>
        <span className="demo-label">DADOS DE DEMONSTRAÇÃO</span>
        <h1>{active}</h1>
      </div>
      <div className="header-actions">
        <button className="icon-button" onClick={onToggleHidden} aria-label={hidden ? "Mostrar valores" : "Ocultar valores"} aria-pressed={hidden}>
          {hidden ? <Eye size={21} /> : <EyeOff size={21} />}
        </button>
        <button className="icon-button notification-button" aria-label="Notificações"><Bell size={21} /><i /></button>
        <button className="header-profile"><span className="avatar small">GM</span><span>Gustavo</span><ChevronDown size={15} /></button>
      </div>
    </header>
  );
}

function HomeView({
  balance, income, expenses, money, transactions, onNavigate, onAdd, hidden, onToggleHidden,
}: {
  balance: number; income: number; expenses: number; money: (value: number) => string; transactions: Transaction[];
  onNavigate: (view: View) => void; onAdd: () => void; hidden: boolean; onToggleHidden: () => void;
}) {
  return (
    <div className="home-grid">
      <section className="welcome-card">
        <div>
          <span className="eyebrow light">OUTUBRO DE 2026</span>
          <h2>Bom dia, Gustavo</h2>
          <p>Seu planejamento está saudável e todas as contas estão em dia.</p>
        </div>
        <button className="month-button">Outubro <ChevronDown size={16} /></button>
      </section>
      <section className="balance-card card">
        <div className="card-top">
          <span className="eyebrow">SALDO DISPONÍVEL</span>
          <button className="text-button" onClick={onToggleHidden}>{hidden ? <Eye size={17} /> : <EyeOff size={17} />}{hidden ? "Mostrar" : "Ocultar"}</button>
        </div>
        <strong className="hero-value">{money(balance)}</strong>
        <p className="positive-line"><TrendingUp size={17} /> Você guardou 64% da sua renda neste mês</p>
        <div className="metric-pair">
          <div><span>RECEITAS</span><strong>{money(income)}</strong></div>
          <div><span>DESPESAS</span><strong>{money(expenses)}</strong></div>
        </div>
      </section>
      <section className="health-card card">
        <div className="card-top"><div><span className="eyebrow">SAÚDE FINANCEIRA</span><h3>Seu mês está equilibrado</h3></div><strong className="score">82<small>/100</small></strong></div>
        <div className="progress-track large" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={82}><i style={{ width: "82%" }} /></div>
        <div className="health-signals">
          <span><ShieldCheck size={18} /> Contas em dia</span>
          <span><TrendingUp size={18} /> Gastos 12% abaixo do previsto</span>
        </div>
      </section>
      <QuickActions onAdd={onAdd} onNavigate={onNavigate} />
      <section className="chart-card card">
        <div className="card-top"><div><span className="eyebrow">FLUXO DO MÊS</span><h3>Receitas e despesas</h3></div><button className="secondary-button">6 meses <ChevronDown size={15} /></button></div>
        <div className="bar-chart" aria-label="Comparação de receitas e despesas dos últimos seis meses">
          {[["mai",66,40],["jun",73,50],["jul",69,45],["ago",80,54],["set",75,47],["out",88,36]].map(([month,inc,exp]) => (
            <div className="bar-group" key={month}>
              <div><i className="bar-income" style={{ height: `${inc}%` }} /><i className="bar-expense" style={{ height: `${exp}%` }} /></div>
              <span>{month}</span>
            </div>
          ))}
        </div>
        <div className="chart-legend"><span><i className="income-dot" />Receitas</span><span><i className="expense-dot" />Despesas</span></div>
      </section>
      <BudgetCard money={money} onNavigate={onNavigate} />
      <RecentTransactions transactions={transactions} money={money} onNavigate={onNavigate} />
    </div>
  );
}

function QuickActions({ onAdd, onNavigate }: { onAdd: () => void; onNavigate: (view: View) => void }) {
  return (
    <section className="quick-actions">
      <button onClick={onAdd}><span><Plus size={21} /></span><strong>Novo lançamento</strong><small>Receita ou despesa</small></button>
      <button onClick={() => onNavigate("Planejamento")}><span><ListTree size={21} /></span><strong>Revisar orçamento</strong><small>5 limites ativos</small></button>
      <button onClick={() => onNavigate("Metas")}><span><PiggyBank size={21} /></span><strong>Fazer um aporte</strong><small>3 metas ativas</small></button>
      <button onClick={() => onNavigate("Contas")}><span><WalletCards size={21} /></span><strong>Contas e cartões</strong><small>Saldos e faturas</small></button>
    </section>
  );
}

function BudgetCard({ money, onNavigate }: { money: (value: number) => string; onNavigate: (view: View) => void }) {
  const items = [["Moradia",1450,1800,"violet"],["Alimentação",687,900,"orange"],["Transporte",310,500,"teal"]] as const;
  return (
    <section className="budget-card card">
      <div className="card-top"><div><span className="eyebrow">ORÇAMENTO</span><h3>Limites por categoria</h3></div><button className="text-button" onClick={() => onNavigate("Planejamento")}>Ver detalhes</button></div>
      <div className="budget-list">
        {items.map(([name,current,total,color]) => (
          <div className="budget-item" key={name}>
            <div><strong>{name}</strong><span>{money(current)} de {money(total)}</span></div>
            <div className="progress-track"><i className={color} style={{ width: `${(current/total)*100}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentTransactions({ transactions, money, onNavigate }: { transactions: Transaction[]; money: (value: number) => string; onNavigate: (view: View) => void }) {
  return (
    <section className="recent-card card">
      <div className="card-top"><div><span className="eyebrow">MOVIMENTAÇÕES</span><h3>Atividade recente</h3></div><button className="text-button" onClick={() => onNavigate("Lançamentos")}>Ver extrato</button></div>
      <div className="transaction-list">
        {transactions.slice(0,5).map((item) => <TransactionRow key={item.id} item={item} money={money} />)}
      </div>
    </section>
  );
}

function TransactionsView({
  transactions, income, expenses, money, query, typeFilter, onQuery, onTypeFilter, onAdd, onExport, onImport,
}: {
  transactions: Transaction[]; income: number; expenses: number; money: (value: number) => string; query: string; typeFilter: string;
  onQuery: (value: string) => void; onTypeFilter: (value: string) => void; onAdd: () => void; onExport: () => void; onImport: () => void;
}) {
  return (
    <div className="transactions-page">
      <div className="context-bar">
        <div className="month-switcher"><button aria-label="Mês anterior"><ChevronLeft size={19} /></button><div><strong>Outubro de 2026</strong><small>{transactions.length} movimentações</small></div><button aria-label="Próximo mês"><ChevronRight size={19} /></button></div>
        <div className="desktop-actions">
          <button className="secondary-button" onClick={onImport}><Upload size={18} />Importar</button>
          <button className="secondary-button" onClick={onExport}><Download size={18} />Exportar</button>
          <button className="primary-button" onClick={onAdd}><Plus size={19} />Adicionar lançamento</button>
        </div>
      </div>
      <section className="summary-strip">
        <div><span className="summary-icon income"><ArrowDownLeft size={20} /></span><p>Entradas</p><strong>{money(income)}</strong></div>
        <div><span className="summary-icon expense"><ArrowUpRight size={20} /></span><p>Saídas</p><strong>{money(expenses)}</strong></div>
        <div><span className="summary-icon balance"><CircleDollarSign size={20} /></span><p>Saldo do mês</p><strong>{money(income-expenses)}</strong></div>
      </section>
      <section className="transactions-panel card">
        <div className="filters">
          <label className="search-field"><Search size={19} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Buscar lançamento" aria-label="Buscar lançamento" /></label>
          <label className="filter-select"><ListFilter size={18} /><select value={typeFilter} onChange={(event) => onTypeFilter(event.target.value)} aria-label="Filtrar por tipo"><option value="">Todos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></label>
          <button className="mobile-import" onClick={onImport} aria-label="Importar CSV"><Upload size={20} /></button>
        </div>
        <div className="transaction-table">
          <div className="table-head"><span>Descrição</span><span>Categoria</span><span>Conta</span><span>Data</span><span>Valor</span><span /></div>
          {transactions.map((item) => <TransactionRow key={item.id} item={item} money={money} detailed />)}
          {!transactions.length && <div className="empty-state"><Search size={26} /><h3>Nenhum lançamento encontrado</h3><p>Tente alterar os filtros da busca.</p></div>}
        </div>
      </section>
    </div>
  );
}

function TransactionRow({ item, money, detailed = false }: { item: Transaction; money: (value: number) => string; detailed?: boolean }) {
  return (
    <article className={`transaction-row ${detailed ? "detailed" : ""}`}>
      <span className={`transaction-icon ${item.type}`}>{item.type === "income" ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}</span>
      <div className="transaction-name"><strong>{item.title}</strong><small>{item.date} · {item.account}</small></div>
      {detailed && <span className="desktop-cell category-pill">{item.category}</span>}
      {detailed && <span className="desktop-cell">{item.account}</span>}
      {detailed && <span className="desktop-cell">{item.date}</span>}
      <strong className={`transaction-amount ${item.type}`}>{item.type === "income" ? "+" : "−"} {money(item.amount)}</strong>
      {detailed && <button className="more-button" aria-label={`Mais ações para ${item.title}`}><MoreHorizontal size={20} /></button>}
    </article>
  );
}

function AccountsView({ money }: { money: (value: number) => string }) {
  return (
    <div className="content-stack">
      <div className="context-bar"><div><span className="eyebrow">SUA CARTEIRA</span><p>Contas, cartões e compromissos em um só lugar.</p></div><button className="primary-button"><Plus size={19} />Adicionar conta</button></div>
      <div className="accounts-grid">
        <section className="account-card primary-account"><span><Landmark size={21} />Conta principal</span><small>Banco Essencial · •• 4581</small><strong>{money(3542.65)}</strong><p>Disponível para uso</p></section>
        <section className="account-card"><span><PiggyBank size={21} />Reserva</span><small>Conta rendimento</small><strong>{money(8450)}</strong><p>Objetivo: emergência</p></section>
        <section className="account-card dark"><span><CreditCard size={21} />Cartão principal</span><small>Fatura vence dia 22</small><strong>{money(842.3)}</strong><div className="mini-progress"><i /></div><p>{money(3657.7)} de limite disponível</p></section>
      </div>
      <section className="card schedule-card"><div className="card-top"><div><span className="eyebrow">AGENDA FINANCEIRA</span><h3>Próximos compromissos</h3></div><button className="secondary-button"><CalendarDays size={17} />Ver calendário</button></div>
        {[["15 out","Energia elétrica","Contas",168],["18 out","Academia","Saúde",99],["22 out","Fatura do cartão","Cartão",842.3]].map(([date,title,category,value]) => <div className="schedule-row" key={String(title)}><span>{date}</span><div><strong>{title}</strong><small>{category}</small></div><strong>{money(value as number)}</strong></div>)}
      </section>
    </div>
  );
}

function PlanningView({ money }: { money: (value: number) => string }) {
  const items = [["Moradia",1450,1800,81],["Alimentação",687,900,76],["Transporte",310,500,62],["Lazer",190,350,54],["Saúde",95,250,38]] as const;
  return (
    <div className="content-stack">
      <div className="context-bar"><div><span className="eyebrow">OUTUBRO DE 2026</span><p>Defina limites e acompanhe o ritmo do mês.</p></div><button className="primary-button"><Plus size={19} />Novo limite</button></div>
      <section className="summary-strip planning"><div><p>Renda planejada</p><strong>{money(5500)}</strong></div><div><p>Limite de gastos</p><strong>{money(3950)}</strong></div><div className="highlight"><p>Planejado para guardar</p><strong>{money(1550)}</strong></div></section>
      <div className="planning-grid">
        <section className="card"><div className="card-top"><div><span className="eyebrow">CATEGORIAS</span><h3>Previsto × realizado</h3></div></div><div className="planning-list">{items.map(([name,current,total,percent]) => <div className="planning-row" key={name}><div><strong>{name}</strong><span>{money(current)} de {money(total)}</span></div><div className="progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${percent}%`}} /></div></div>)}</div></section>
        <section className="forecast-card"><Sparkles size={24} /><span className="eyebrow light">PREVISÃO DO MÊS</span><h3>Você deve fechar no azul</h3><strong>{money(1740)}</strong><p>Saldo livre estimado para 31 de outubro.</p><div className="forecast-tag"><TrendingUp size={17} /> {money(190)} acima da sua meta</div></section>
      </div>
    </div>
  );
}

function GoalsView({ money, onToast }: { money: (value: number) => string; onToast: (message: string) => void }) {
  const goals = [["Reserva de emergência",8450,15000,56,"Abril de 2027"],["Viagem de férias",1820,5000,36,"Julho de 2027"],["Notebook novo",500,4500,11,"Março de 2028"]] as const;
  return (
    <div className="content-stack">
      <div className="context-bar"><div><span className="eyebrow">SEUS OBJETIVOS</span><p>Avance um pouco a cada mês, sem perder o equilíbrio.</p></div><button className="primary-button"><Plus size={19} />Criar meta</button></div>
      <section className="summary-strip"><div><p>Total guardado</p><strong>{money(10770)}</strong></div><div><p>Aportes no mês</p><strong>{money(850)}</strong></div><div><p>Metas ativas</p><strong>3</strong></div></section>
      <div className="goals-grid">{goals.map(([name,current,total,percent,date]) => <section className="goal-card card" key={name}><div className="goal-icon"><Target size={22} /></div><span className="eyebrow">META ATIVA</span><h3>{name}</h3><strong>{money(current)}</strong><p>de {money(total)} · previsão {date}</p><div className="progress-track large" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${percent}%`}} /></div><footer><span>{percent}% concluído</span><button className="secondary-button" onClick={() => onToast("Aporte registrado no protótipo")}>Fazer aporte</button></footer></section>)}</div>
    </div>
  );
}

function MobileNavigation({ active, onNavigate, onAdd }: { active: View; onNavigate: (view: View) => void; onAdd: () => void }) {
  const mobileItems = navigation.filter(({ name }) => name !== "Contas");
  return (
    <nav className="mobile-nav" aria-label="Navegação mobile">
      {mobileItems.slice(0,2).map(({ name, icon: Icon }) => <MobileNavItem key={name} name={name} active={active} icon={Icon} onNavigate={onNavigate} />)}
      <button className="nav-fab" aria-label="Adicionar lançamento" onClick={onAdd}><Plus size={27} strokeWidth={2.4} /></button>
      {mobileItems.slice(2).map(({ name, icon: Icon }) => <MobileNavItem key={name} name={name} active={active} icon={Icon} onNavigate={onNavigate} />)}
    </nav>
  );
}

function MobileNavItem({ name, active, icon: Icon, onNavigate }: { name: View; active: View; icon: LucideIcon; onNavigate: (view: View) => void }) {
  return <button className={active === name ? "active" : ""} aria-current={active === name ? "page" : undefined} onClick={() => onNavigate(name)}><Icon size={24} strokeWidth={active === name ? 2.5 : 2.1} /><span>{name === "Lançamentos" ? "Extrato" : name === "Planejamento" ? "Planejar" : name}</span></button>;
}

function TransactionDialog({
  form, error, onChange, onClose, onSubmit,
}: {
  form: { title: string; amount: string; category: string; type: "income" | "expense"; account: string; date: string; recurring: boolean };
  error: string;
  onChange: (value: typeof form) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose]);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">NOVO LANÇAMENTO</span><h2 id="dialog-title">Registre uma movimentação</h2></div><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X size={21} /></button></header>
        <div className="type-switch"><button type="button" className={form.type === "expense" ? "active expense" : ""} onClick={() => onChange({...form,type:"expense"})}><ArrowUpRight size={18} />Despesa</button><button type="button" className={form.type === "income" ? "active income" : ""} onClick={() => onChange({...form,type:"income"})}><ArrowDownLeft size={18} />Receita</button></div>
        <label>Descrição<input autoFocus value={form.title} onChange={(event) => onChange({...form,title:event.target.value})} placeholder="Ex.: Supermercado" /></label>
        <div className="form-row"><label>Valor (R$)<input inputMode="decimal" value={form.amount} onChange={(event) => onChange({...form,amount:event.target.value})} placeholder="0,00" /></label><label>Data<input type="date" value={form.date} onChange={(event) => onChange({...form,date:event.target.value})} /></label></div>
        <div className="form-row"><label>Categoria<select value={form.category} onChange={(event) => onChange({...form,category:event.target.value})}>{["Alimentação","Moradia","Transporte","Saúde","Lazer","Renda","Outros"].map((category) => <option key={category}>{category}</option>)}</select></label><label>Conta<select value={form.account} onChange={(event) => onChange({...form,account:event.target.value})}><option>Conta principal</option><option>Cartão principal</option><option>Dinheiro</option></select></label></div>
        <label className="checkbox-label"><input type="checkbox" checked={form.recurring} onChange={(event) => onChange({...form,recurring:event.target.checked})} />Repetir todo mês</label>
        <p className="form-error" aria-live="polite">{error}</p>
        <button className="submit-button" type="submit">Salvar lançamento</button>
      </form>
    </div>
  );
}
