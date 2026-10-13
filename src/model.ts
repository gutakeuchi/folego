export type Account = { id: string; name: string; opening: number };
export type Entry = {
  id: string;
  title: string;
  category: string;
  date: string;
  cents: number;
  type: "income" | "expense";
  accountId: string;
  recurring: boolean;
};
export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
};
export type Budget = { id: string; category: string; limit: number };
export type Finance = {
  accounts: Account[];
  entries: Entry[];
  goals: Goal[];
  budgets: Budget[];
};
export const MAX_CENTS = 100_000_000_000;
export const id = () => crypto.randomUUID();
export const emptyFinance = (): Finance => ({
  accounts: [{ id: "main", name: "Conta principal", opening: 0 }],
  entries: [],
  goals: [],
  budgets: [],
});
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseMoney(value: string) {
  const text = value.trim().replace(/\s|R\$/g, "");
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text))
    throw new Error("Use um valor como 150,00.");
  const cents = Math.round(
    Number(text.replace(/\./g, "").replace(",", ".")) * 100,
  );
  if (!Number.isSafeInteger(cents) || Math.abs(cents) > MAX_CENTS)
    throw new Error("Valor fora do limite.");
  return cents;
}
export const moneyInput = (cents: number) =>
  (cents / 100).toFixed(2).replace(".", ",");
export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function validateFinance(value: unknown): value is Finance {
  if (!value || typeof value !== "object") return false;
  const d = value as Finance;
  const text = (v: unknown) =>
    typeof v === "string" && v.trim().length > 0 && v.length <= 160;
  const money = (v: unknown) =>
    typeof v === "number" &&
    Number.isSafeInteger(v) &&
    Math.abs(v) <= MAX_CENTS;
  const unique = (a: { id: string }[]) =>
    new Set(a.map((v) => v.id)).size === a.length;
  if (
    ![d.accounts, d.entries, d.goals, d.budgets].every(
      (v) => Array.isArray(v) && v.length <= 10000,
    )
  )
    return false;
  if (
    !d.accounts.every(
      (a) => a && text(a.id) && text(a.name) && money(a.opening),
    ) ||
    !unique(d.accounts)
  )
    return false;
  if (
    !d.entries.every(
      (e) =>
        e &&
        text(e.id) &&
        text(e.title) &&
        text(e.category) &&
        validDate(e.date) &&
        money(e.cents) &&
        e.cents > 0 &&
        ["income", "expense"].includes(e.type) &&
        d.accounts.some((a) => a.id === e.accountId) &&
        typeof e.recurring === "boolean",
    ) ||
    !unique(d.entries)
  )
    return false;
  if (
    !d.goals.every(
      (g) =>
        g &&
        text(g.id) &&
        text(g.name) &&
        money(g.target) &&
        g.target > 0 &&
        money(g.saved) &&
        g.saved >= 0 &&
        validDate(g.deadline),
    ) ||
    !unique(d.goals)
  )
    return false;
  return (
    d.budgets.every(
      (b) =>
        b && text(b.id) && text(b.category) && money(b.limit) && b.limit > 0,
    ) &&
    unique(d.budgets) &&
    new Set(d.budgets.map((b) => b.category.toLowerCase())).size ===
      d.budgets.length
  );
}
export function totals(entries: Entry[]) {
  const income = entries
      .filter((e) => e.type === "income")
      .reduce((s, e) => s + e.cents, 0),
    expense = entries
      .filter((e) => e.type === "expense")
      .reduce((s, e) => s + e.cents, 0);
  return { income, expense, balance: income - expense };
}
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("CSV com aspas incompletas.");
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export const csvCell = (value: string | number) =>
  '"' + String(value).replace(/"/g, '""') + '"';
export function exportEntries(data: Finance) {
  return (
    "\uFEFF" +
    [
      [
        "id",
        "descricao",
        "categoria",
        "data",
        "tipo",
        "conta",
        "centavos",
        "recorrente",
      ],
      ...data.entries.map((e) => [
        e.id,
        e.title,
        e.category,
        e.date,
        e.type,
        data.accounts.find((a) => a.id === e.accountId)?.name || "",
        e.cents,
        String(e.recurring),
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
export function importEntries(text: string, current: Finance): Finance {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (
    rows[0]?.join(",") !==
    "id,descricao,categoria,data,tipo,conta,centavos,recorrente"
  )
    throw new Error(
      "Use um CSV exportado pelo Fôlego atual (coluna centavos).",
    );
  const next = structuredClone(current);
  const ids = new Set(next.entries.map((e) => e.id));
  for (const [
    entryId,
    title,
    category,
    date,
    type,
    accountName,
    cents,
    recurring,
  ] of rows.slice(1)) {
    if (ids.has(entryId)) continue;
    let account = next.accounts.find((a) => a.name === accountName);
    if (!account) {
      account = { id: id(), name: accountName, opening: 0 };
      next.accounts.push(account);
    }
    next.entries.push({
      id: entryId || id(),
      title,
      category,
      date,
      type: type as Entry["type"],
      accountId: account.id,
      cents: Number(cents),
      recurring: recurring === "true",
    });
    ids.add(entryId);
  }
  if (!validateFinance(next))
    throw new Error(
      "O CSV contém dados inválidos. Nenhuma linha foi importada.",
    );
  return next;
}
export function demoFinance(): Finance {
  const month = today().slice(0, 7);
  return {
    accounts: [
      { id: "main", name: "Conta principal", opening: 0 },
      { id: "reserve", name: "Reserva", opening: 0 },
    ],
    entries: [
      {
        id: "salary",
        title: "Salário",
        category: "Renda",
        date: `${month}-05`,
        cents: 550000,
        type: "income",
        accountId: "main",
        recurring: true,
      },
      {
        id: "rent",
        title: "Aluguel",
        category: "Moradia",
        date: `${month}-07`,
        cents: 145000,
        type: "expense",
        accountId: "main",
        recurring: true,
      },
      {
        id: "market",
        title: "Supermercado",
        category: "Alimentação",
        date: `${month}-08`,
        cents: 38745,
        type: "expense",
        accountId: "main",
        recurring: false,
      },
    ],
    budgets: [
      { id: "home", category: "Moradia", limit: 180000 },
      { id: "food", category: "Alimentação", limit: 90000 },
    ],
    goals: [
      {
        id: "emergency",
        name: "Reserva de emergência",
        target: 1500000,
        saved: 845000,
        deadline: `${Number(month.slice(0, 4)) + 1}-04-01`,
      },
    ],
  };
}

export function migrateLegacy(
  value: unknown,
  year: number,
  current: Finance,
): Finance {
  if (
    !Array.isArray(value) ||
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 9999
  )
    throw new Error("Dados antigos ou ano inválidos.");
  const next = structuredClone(current);
  const months = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  for (const old of value) {
    if (
      !old ||
      typeof old.id !== "number" ||
      !Number.isFinite(old.amount) ||
      old.amount <= 0
    )
      throw new Error("Um lançamento antigo contém dados inválidos.");
    const entryId = `legacy-${old.id}`;
    if (next.entries.some((e) => e.id === entryId)) continue;
    let date = old.date;
    if (!validDate(date)) {
      const match =
        typeof date === "string"
          ? date.toLowerCase().match(/^(\d{1,2})\s+([a-zç]+)\.?$/)
          : null;
      const month = match ? months.indexOf(match[2]) : -1;
      if (date === "Hoje") date = today();
      else if (match && month >= 0)
        date = `${year}-${String(month + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
      else throw new Error("Uma data antiga não pôde ser interpretada.");
    }
    let account = next.accounts.find((a) => a.name === old.account);
    if (!account) {
      account = { id: id(), name: old.account, opening: 0 };
      next.accounts.push(account);
    }
    next.entries.push({
      id: entryId,
      title: old.title,
      category: old.category,
      date,
      cents: Math.round(old.amount * 100),
      type: old.type,
      accountId: account.id,
      recurring: false,
    });
  }
  if (!validateFinance(next))
    throw new Error(
      "Dados antigos incompatíveis. Nenhum registro foi importado.",
    );
  return next;
}
