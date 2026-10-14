import test from "node:test";
import assert from "node:assert/strict";
import { harness, nodes, text } from "./support/harness.mjs";
function setup(auth, recovery = false) {
  const h = harness(
    "src/components/AuthScreen.tsx",
    { "../lib/supabase": { supabase: { auth } } },
    { location: { origin: "https://example.test", pathname: "/folego/" } },
  );
  let recovered = 0;
  h.start("AuthScreen", {
    recovery,
    onRecovered: () => recovered++,
    onDemo() {},
  });
  return {
    h,
    get recovered() {
      return recovered;
    },
  };
}
const click = async (h, label) => {
  nodes(h.current)
    .find((n) => n.type === "button" && text(n) === label)
    .props.onClick();
  await h.flush();
};
const submit = async (h) => {
  await nodes(h.current)
    .find((n) => n.type === "form")
    .props.onSubmit({ preventDefault() {} });
  await h.flush();
};
test("Cadastro envia redirect correto e solicita confirmação sem sessão", async () => {
  let received;
  const { h } = setup({
    signUp: async (p) => (
      (received = p),
      { error: null, data: { session: null } }
    ),
  });
  await click(h, "Criar conta");
  await submit(h);
  assert.equal(
    received.options.emailRedirectTo,
    "https://example.test/folego/",
  );
  assert.match(text(h.current), /Confira seu e-mail/);
  h.close();
});
test("Cadastro com sessão não exibe confirmação pendente", async () => {
  const { h } = setup({
    signUp: async () => ({ error: null, data: { session: {} } }),
  });
  await click(h, "Criar conta");
  await submit(h);
  assert.doesNotMatch(text(h.current), /Confira seu e-mail/);
  h.close();
});
test("Recuperação mantém subdiretório e mensagem não revela existência da conta", async () => {
  let received;
  const { h } = setup({
    resetPasswordForEmail: async (email, options) => (
      (received = options),
      { error: null }
    ),
  });
  await click(h, "Esqueci minha senha");
  await submit(h);
  assert.equal(received.redirectTo, "https://example.test/folego/?recovery=1");
  assert.match(text(h.current), /Se o endereço estiver cadastrado/);
  h.close();
});
test("Erro de login aparece e desbloqueia envio", async () => {
  const { h } = setup({
    signInWithPassword: async () => ({
      error: new Error("Credenciais inválidas"),
    }),
  });
  await submit(h);
  assert.match(text(h.current), /Credenciais inválidas/);
  assert.equal(
    nodes(h.current).find((n) => n.props.type === "submit").props.disabled,
    false,
  );
  h.close();
});
test("Falha de rede no login também desbloqueia envio", async () => {
  const { h } = setup({
    signInWithPassword: async () => {
      throw new Error("Sem conexão");
    },
  });
  await submit(h);
  assert.match(text(h.current), /Sem conexão/);
  assert.equal(
    nodes(h.current).find((n) => n.props.type === "submit").props.disabled,
    false,
  );
  h.close();
});
test("Nova senha chama conclusão apenas quando backend confirma", async () => {
  const state = setup({ updateUser: async () => ({ error: null }) }, true);
  await submit(state.h);
  assert.equal(state.recovered, 1);
  state.h.close();
});
test("Falha ao redefinir senha não encerra recuperação", async () => {
  const state = setup(
    { updateUser: async () => ({ error: new Error("Sessão expirada") }) },
    true,
  );
  await submit(state.h);
  assert.equal(state.recovered, 0);
  assert.match(text(state.h.current), /Sessão expirada/);
  state.h.close();
});
