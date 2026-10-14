import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./support/harness.mjs";
import * as model from "../src/model.ts";
test("Edição durante gravação continua pendente após confirmação da versão anterior", async () => {
  let resolve;
  const s = setup({ rpc: () => new Promise((r) => (resolve = r)) });
  await s.h.flush();
  s.h.current.update((d) => ({ ...d }));
  await s.h.flush();
  await s.save();
  assert.equal(s.h.current.status, "saving");
  const edited = {
    ...s.h.current.data,
    goals: [
      {
        id: "test",
        name: "Objetivo",
        target: 10000,
        saved: 0,
        deadline: "2027-01-01",
      },
    ],
  };
  s.h.current.update(() => edited);
  await s.h.flush();
  resolve({ data: 3, error: null });
  await s.h.flush();
  assert.equal(s.h.current.status, "pending");
  assert.equal(s.h.current.dirty, true);
  assert.equal(s.h.current.data, edited);
  s.h.close();
});
test("Retorno da conexão atualiza documento remoto quando não há edição local", async () => {
  const remote = { data: model.emptyFinance(), revision: 2 };
  const s = setup({ remote });
  await s.h.flush();
  remote.data = model.demoFinance();
  remote.revision = 3;
  await s.events.online();
  await s.h.flush();
  assert.equal(s.h.current.data, remote.data);
  assert.equal(s.h.current.status, "synced");
  s.h.close();
});
test("Foco não substitui alterações locais por outro documento remoto", async () => {
  const remote = { data: model.emptyFinance(), revision: 2 };
  const s = setup({ remote });
  await s.h.flush();
  const edited = { ...s.h.current.data };
  s.h.current.update(() => edited);
  await s.h.flush();
  remote.data = model.demoFinance();
  await s.events.focus();
  await s.h.flush();
  assert.equal(s.h.current.data, edited);
  assert.equal(s.h.current.dirty, true);
  s.h.close();
});
function setup({
  user = "alice",
  cached,
  remote = { data: model.emptyFinance(), revision: 2 },
  readError = null,
  rpc = async () => ({ data: 3, error: null }),
  storageError = false,
} = {}) {
  const events = {},
    timers = new Map(),
    store = new Map();
  let seq = 0,
    calls = [];
  const key = user ? `folego.user.${user}.v3` : "folego.demo.v3";
  if (cached) store.set(key, JSON.stringify(cached));
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: remote, error: readError }),
        }),
      }),
    }),
    rpc: async (name, payload) => {
      calls.push(payload);
      return rpc(payload);
    },
  };
  const h = harness(
    "src/useFinance.ts",
    { "./model": model, "./lib/supabase": { supabase: client } },
    {
      localStorage: {
        getItem: (k) => store.get(k) ?? null,
        setItem: (k, v) => {
          if (storageError) throw Error("Quota");
          store.set(k, v);
        },
      },
      window: {
        addEventListener: (k, fn) => (events[k] = fn),
        removeEventListener: (k) => delete events[k],
      },
      document: { visibilityState: "visible" },
      setTimeout: (fn) => {
        const id = ++seq;
        timers.set(id, fn);
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
      setInterval: () => ++seq,
      clearInterval() {},
    },
  );
  h.start("useFinance", user);
  return {
    h,
    events,
    store,
    key,
    calls,
    async save() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((fn) => fn());
      return h.flush();
    },
  };
}
test("Leitura remota limpa estabelece estado sincronizado", async () => {
  const s = setup();
  await s.h.flush();
  assert.equal(s.h.current.status, "synced");
  assert.equal(s.h.current.ready, true);
  s.h.close();
});
test("Cache sujo com revisão igual é preservado para envio", async () => {
  const data = model.demoFinance();
  const s = setup({ cached: { data, revision: 2, dirty: true } });
  await s.h.flush();
  assert.equal(s.h.current.status, "pending");
  assert.deepEqual(s.h.current.data, data);
  s.h.close();
});
test("Cache sujo divergente entra em conflito sem sobrescrever dados", async () => {
  const data = model.demoFinance();
  const s = setup({ cached: { data, revision: 1, dirty: true } });
  await s.h.flush();
  assert.equal(s.h.current.status, "conflict");
  await s.save();
  assert.equal(s.calls.length, 0);
  assert.deepEqual(s.h.current.data, data);
  s.h.close();
});
test("Sem rede conserva cache e apresenta erro; sem cache não libera dados", async () => {
  for (const cached of [
    undefined,
    { data: model.emptyFinance(), revision: 1, dirty: false },
  ]) {
    const s = setup({ cached, readError: { message: "Offline" } });
    await s.h.flush();
    assert.equal(s.h.current.status, "error");
    assert.equal(s.h.current.ready, !!cached);
    s.h.close();
  }
});
test("Gravação envia revisão esperada e confirma nova versão", async () => {
  const s = setup();
  await s.h.flush();
  s.h.current.update((d) => ({ ...d, goals: [] }));
  await s.h.flush();
  await s.save();
  assert.equal(s.calls[0].expected_revision, 2);
  assert.equal(s.h.current.status, "synced");
  assert.equal(s.h.current.dirty, false);
  assert.equal(JSON.parse(s.store.get(s.key)).revision, 3);
  s.h.close();
});
test("Erro 40001 bloqueia reenvio automático e preserva edição", async () => {
  const s = setup({
    rpc: async () => ({
      data: null,
      error: { code: "40001", message: "stale" },
    }),
  });
  await s.h.flush();
  s.h.current.update((d) => ({ ...d }));
  await s.h.flush();
  await s.save();
  assert.equal(s.h.current.status, "conflict");
  assert.equal(s.h.current.dirty, true);
  s.h.current.retry();
  await s.h.flush();
  await s.save();
  assert.equal(s.calls.length, 1);
  s.h.close();
});
test("Resposta inválida de versão não confirma gravação", async () => {
  const s = setup({ rpc: async () => ({ data: "3", error: null }) });
  await s.h.flush();
  s.h.current.update((d) => ({ ...d }));
  await s.h.flush();
  await s.save();
  assert.equal(s.h.current.status, "error");
  assert.equal(s.h.current.dirty, true);
  s.h.close();
});
test("Modo demonstração não grava no backend e possui chave própria", async () => {
  const s = setup({ user: null });
  await s.h.flush();
  s.h.current.update((d) => ({ ...d }));
  await s.h.flush();
  await s.save();
  assert.equal(s.h.current.status, "local");
  assert.equal(s.calls.length, 0);
  assert.ok(s.store.has("folego.demo.v3"));
  assert.ok(!s.store.has("folego.user.alice.v3"));
  s.h.close();
});
test("Falha ao guardar cache orienta exportação sem apagar estado", async () => {
  const s = setup({ storageError: true });
  await s.h.flush();
  assert.match(s.h.current.error, /Exporte um backup/);
  assert.equal(s.h.current.ready, true);
  s.h.close();
});
test("Dado remoto inválido é recusado", async () => {
  const s = setup({ remote: { data: { entries: [] }, revision: 2 } });
  await s.h.flush();
  assert.equal(s.h.current.ready, false);
  assert.match(s.h.current.error, /formato inválido/);
  s.h.close();
});
test("Eventos de foco são removidos ao desmontar", async () => {
  const s = setup();
  await s.h.flush();
  assert.equal(typeof s.events.focus, "function");
  assert.equal(typeof s.events.online, "function");
  s.h.close();
  assert.equal(s.events.focus, undefined);
  assert.equal(s.events.online, undefined);
});
