import test from "node:test";
import assert from "node:assert/strict";
import {
  demoFinance,
  emptyFinance,
  exportEntries,
  importEntries,
  migrateLegacy,
  parseMoney,
  totals,
  validateFinance,
  validDate,
} from "../src/model.ts";

test("Valores brasileiros são convertidos para centavos sem aceitar frações extras", () => {
  assert.equal(parseMoney("1.234,56"), 123456);
  assert.equal(parseMoney("R$ 0,01"), 1);
  assert.equal(parseMoney("-50,00"), -5000);
  assert.throws(() => parseMoney("1234.56"));
  assert.throws(() => parseMoney("1,999"));
  assert.throws(() => parseMoney("Infinity"));
});
test("Datas impossíveis e referências a contas inexistentes são rejeitadas", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(validateFinance(null), false);
  assert.equal(
    validateFinance({ accounts: [null], entries: [], goals: [], budgets: [] }),
    false,
  );
  const data = demoFinance();
  assert.equal(validateFinance(data), true);
  data.entries[0].accountId = "missing";
  assert.equal(validateFinance(data), false);
});
test("Saldo do mês é derivado dos registros em centavos", () => {
  assert.deepEqual(totals(demoFinance().entries), {
    income: 550000,
    expense: 183745,
    balance: 366255,
  });
});
test("CSV preserva vírgulas, aspas e quebras de linha e não duplica IDs", () => {
  const original = demoFinance();
  original.entries[0].title = 'Serviço, "extra"\nno fim de semana';
  const csv = exportEntries(original);
  const restored = importEntries(csv, emptyFinance());
  assert.equal(restored.entries[0].title, original.entries[0].title);
  assert.equal(restored.entries[0].cents, original.entries[0].cents);
  assert.equal(
    importEntries(csv, restored).entries.length,
    original.entries.length,
  );
  assert.throws(() =>
    importEntries(csv.replace("550000", "NaN"), emptyFinance()),
  );
});
test("O documento recusa identificadores e limites duplicados", () => {
  const data = demoFinance();
  data.accounts.push({ ...data.accounts[0] });
  assert.equal(validateFinance(data), false);
  const other = demoFinance();
  other.budgets.push({ id: "other", category: "moradia", limit: 100 });
  assert.equal(validateFinance(other), false);
});
test("Migração antiga converte valores e datas e preserva IDs para não duplicar", () => {
  const old = [
    {
      id: 7,
      title: "Salário",
      amount: 1234.56,
      type: "income",
      category: "Renda",
      date: "05 out",
      account: "Conta principal",
    },
  ];
  const next = migrateLegacy(old, 2026, emptyFinance());
  assert.equal(next.entries[0].cents, 123456);
  assert.equal(next.entries[0].date, "2026-10-05");
  assert.equal(migrateLegacy(old, 2026, next).entries.length, 1);
});
