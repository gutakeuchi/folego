import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const root = "https://example.test/folego/";
function worker(fetch) {
  const handlers = {},
    stored = new Map(),
    deleted = [],
    added = [];
  const cache = {
    put: async (k, v) => stored.set(typeof k === "string" ? k : k.url, v),
    addAll: async (urls) => added.push(...urls),
  };
  const caches = {
    open: async () => cache,
    match: async (request) =>
      stored.get(typeof request === "string" ? request : request.url),
    keys: async () => ["folego-shell-old", "unrelated-app"],
    delete: async (name) => deleted.push(name),
  };
  vm.runInNewContext(
    fs.readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"),
    {
      URL,
      fetch,
      caches,
      self: {
        location: new URL(root + "sw.js"),
        addEventListener: (name, fn) => (handlers[name] = fn),
      },
    },
  );
  return { handlers, stored, deleted, added };
}
async function emit(w, name, request) {
  let response;
  const pending = [];
  w.handlers[name]({
    request,
    waitUntil: (p) => pending.push(p),
    respondWith: (p) => (response = p),
  });
  const result = response ? await response : undefined;
  await Promise.all(pending);
  return result;
}
test("Offline: navegação retorna shell já armazenado quando a rede cai", async () => {
  const w = worker(async () => {
    throw Error("offline");
  });
  w.stored.set(root, new Response("shell"));
  assert.equal(
    await (
      await emit(w, "fetch", { url: root, method: "GET", mode: "navigate" })
    ).text(),
    "shell",
  );
});
test("Navegação prefere HTML atual da rede em vez de cache antigo", async () => {
  const w = worker(async () => new Response("new"));
  w.stored.set(root, new Response("old"));
  assert.equal(
    await (
      await emit(w, "fetch", { url: root, method: "GET", mode: "navigate" })
    ).text(),
    "new",
  );
});
test("Não intercepta Supabase externo, API ou requisição POST", async () => {
  let calls = 0;
  const w = worker(async () => {
    calls++;
  });
  for (const request of [
    {
      url: "https://backend.supabase.co/rest/v1/finance_documents",
      method: "GET",
    },
    { url: root + "api/private", method: "GET" },
    { url: root, method: "POST" },
  ])
    assert.equal(await emit(w, "fetch", request), undefined);
  assert.equal(calls, 0);
});
test("Não armazena resposta de asset com erro", async () => {
  const w = worker(async () => new Response("missing", { status: 404 }));
  await emit(w, "fetch", { url: root + "missing.js", method: "GET" });
  assert.equal(w.stored.size, 0);
});
test("Atualização remove somente caches antigos do próprio Fôlego", async () => {
  const w = worker(async () => {});
  await emit(w, "activate");
  assert.deepEqual(w.deleted, ["folego-shell-old"]);
});
test("Instalação armazena shell e assets locais, excluindo scripts externos", async () => {
  const w = worker(
    async () =>
      new Response(
        '<script src="./assets/app.js"></script><link href="./favicon.svg?v=wind-2"><script src="https://other.test/a.js"></script>',
      ),
  );
  await emit(w, "install");
  assert.ok(w.stored.has(root));
  assert.ok(w.added.includes(root + "assets/app.js"));
  assert.ok(w.added.includes(root + "favicon.svg?v=wind-2"));
  assert.ok(!w.added.some((x) => x.includes("other.test")));
});
test("Instalação falha se HTML inicial não estiver disponível", async () => {
  const w = worker(async () => new Response("unavailable", { status: 503 }));
  await assert.rejects(() => emit(w, "install"), /indisponível/);
});
test("Manifesto tem escopo relativo e arquivo do ícone existe", () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      new URL("../public/manifest.webmanifest", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons)
    assert.ok(
      fs.existsSync(
        new URL("../public/" + icon.src.split("?")[0], import.meta.url),
      ),
    );
});
