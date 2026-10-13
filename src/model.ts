export type Account = { id: string; name: string; opening: number };
export type Entry = { id: string; title: string; category: string; date: string; cents: number; type: 'income' | 'expense'; accountId: string; recurring: boolean };
export type Goal = { id: string; name: string; target: number; saved: number; deadline: string };
export type Budget = { id: string; category: string; limit: number };
export type Finance = { accounts: Account[]; entries: Entry[]; goals: Goal[]; budgets: Budget[] };
export const emptyFinance = (): Finance => ({ accounts: [{ id: 'main', name: 'Conta principal', opening: 0 }], entries: [], goals: [], budgets: [] });
export const id = () => crypto.randomUUID();
export function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function parseMoney(value: string) {
  const text = value.trim().replace(/\s|R\$/g, '');
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) throw new Error('Use um valor como 150,00.');
  const cents = Math.round(Number(text.replace(/\./g,'').replace(',','.'))*100);
  if (!Number.isSafeInteger(cents) || Math.abs(cents)>100_000_000_000) throw new Error('Valor fora do limite.');
  return cents;
}
export function validDate(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value; }
export function validateFinance(value: unknown): value is Finance {
  if (!value || typeof value !== 'object') return false;
  const d = value as Finance;
  const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 160;
  const money = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && Math.abs(v)<=100_000_000_000;
  const unique = (a: {id:string}[]) => new Set(a.map(v=>v.id)).size === a.length;
  if (![d.accounts,d.entries,d.goals,d.budgets].every(v=>Array.isArray(v) && v.length<=10000)) return false;
  if (!d.accounts.every(a=>a && text(a.id)&&text(a.name)&&money(a.opening)) || !unique(d.accounts)) return false;
  if (!d.entries.every(e=>e&&text(e.id)&&text(e.title)&&text(e.category)&&validDate(e.date)&&money(e.cents)&&e.cents>0&&['income','expense'].includes(e.type)&&d.accounts.some(a=>a.id===e.accountId)&&typeof e.recurring==='boolean') || !unique(d.entries)) return false;
  if (!d.goals.every(g=>g&&text(g.id)&&text(g.name)&&money(g.target)&&g.target>0&&money(g.saved)&&g.saved>=0&&validDate(g.deadline)) || !unique(d.goals)) return false;
  return d.budgets.every(b=>b&&text(b.id)&&text(b.category)&&money(b.limit)&&b.limit>0) && unique(d.budgets) && new Set(d.budgets.map(b=>b.category.toLowerCase())).size===d.budgets.length;
}
export function parseCsv(text: string): string[][] {
  const rows: string[][]=[]; let row: string[]=[]; let field=''; let quoted=false;
  for(let i=0;i<text.length;i++) { const c=text[i]; if(c==='"') { if(quoted&&text[i+1]==='"'){field+='"';i++;} else quoted=!quoted; } else if(c===','&&!quoted){row.push(field);field='';} else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c; }
  if(quoted)throw new Error('CSV com aspas incompletas.'); row.push(field);if(row.some(Boolean))rows.push(row);return rows;
}
export const csvCell = (value: string | number) => '"'+String(value).replace(/"/g,'""')+'"';
