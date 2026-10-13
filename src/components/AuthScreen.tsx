import { useState, type FormEvent } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Button, Card } from "./ui";
export function AuthScreen({
  onDemo,
  recovery,
  onRecovered,
}: {
  onDemo: () => void;
  recovery: boolean;
  onRecovered: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Senha atualizada.");
        onRecovered();
      } else if (mode === "signup") {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: location.origin + location.pathname,
          },
        });
        if (error) throw error;
        if (!data.session)
          setMessage(
            "Confira seu e-mail para confirmar o cadastro e depois entre.",
          );
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + location.pathname + "?recovery=1",
        });
        if (error) throw error;
        setMessage(
          "Se o endereço estiver cadastrado, você receberá as instruções de recuperação.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  const title = recovery
    ? "Escolha sua nova senha"
    : mode === "signup"
      ? "Dê um respiro às suas finanças"
      : mode === "forgot"
        ? "Recupere seu acesso"
        : "Seu dinheiro, com mais clareza";
  return (
    <main className="auth-screen grid min-h-dvh place-items-center p-5 sm:p-8">
      <div className="w-full max-w-md">
        <a
          href="#"
          className="mb-8 flex items-center justify-center gap-3 text-2xl font-extrabold"
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-brand-600 text-white">
            F
          </span>
          Fôlego
        </a>
        <Card className="auth-card rounded-3xl p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {supabase
              ? "Entre na sua conta para acessar seus registros em qualquer aparelho."
              : location.protocol === "file:"
                ? "Esta é uma prévia em arquivo. Para usar sua conta, abra o app por um servidor ou endereço HTTPS. Você pode explorar a demonstração abaixo."
                : "A conexão com o banco ainda precisa ser configurada. Você pode explorar uma demonstração local."}
          </p>
          {supabase ? (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && !recovery && (
                <label className="label">
                  Seu nome
                  <input
                    className="field"
                    required
                    maxLength={80}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}
              {!recovery && (
                <label className="label">
                  E-mail
                  <input
                    className="field"
                    type="email"
                    placeholder="voce@exemplo.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )}
              {(mode !== "forgot" || recovery) && (
                <label className="label">
                  Senha
                  <input
                    className="field"
                    type="password"
                    required
                    minLength={recovery || mode === "signup" ? 12 : 1}
                    maxLength={128}
                    autoComplete={
                      mode === "login" && !recovery
                        ? "current-password"
                        : "new-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {(mode === "signup" || recovery) && (
                    <span className="text-xs font-normal">
                      Use pelo menos 12 caracteres.
                    </span>
                  )}
                </label>
              )}
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="text-sm text-brand-700">
                  {message}
                </p>
              )}
              <Button type="submit" disabled={busy} className="w-full">
                {busy
                  ? "Aguarde…"
                  : recovery
                    ? "Salvar nova senha"
                    : mode === "signup"
                      ? "Criar conta"
                      : mode === "forgot"
                        ? "Enviar instruções"
                        : "Entrar"}
                <ArrowRight size={18} />
              </Button>
              {!recovery && (
                <div className="flex flex-wrap justify-between gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "signup" ? "login" : "signup");
                      setError("");
                      setMessage("");
                    }}
                  >
                    {mode === "signup" ? "Já tenho uma conta" : "Criar conta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "forgot" ? "login" : "forgot");
                      setError("");
                      setMessage("");
                    }}
                  >
                    {mode === "forgot"
                      ? "Voltar para entrar"
                      : "Esqueci minha senha"}
                  </button>
                </div>
              )}
            </form>
          ) : null}
          {!recovery && (
            <Button
              variant="secondary"
              onClick={onDemo}
              className="mt-5 w-full"
            >
              Experimentar demonstração
            </Button>
          )}
          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-400">
            <ShieldCheck size={17} className="shrink-0" />A demonstração não
            envia registros financeiros para uma conta. Os dados ficam apenas
            neste navegador.
          </p>
        </Card>
      </div>
    </main>
  );
}
