import { useCallback, useEffect, useRef, useState } from "react";
import {
  demoFinance,
  emptyFinance,
  validateFinance,
  type Finance,
} from "./model";
import { supabase } from "./lib/supabase";
type RecordData = { data: Finance; revision: number; dirty: boolean };
type Status =
  "loading" | "local" | "synced" | "pending" | "saving" | "error" | "conflict";
export function useFinance(userId: string | null) {
  const key = userId ? `folego.user.${userId}.v3` : "folego.demo.v3";
  const [record, setRecord] = useState<RecordData>({
    data: userId ? emptyFinance() : demoFinance(),
    revision: 0,
    dirty: false,
  });
  const [status, setStatus] = useState<Status>("loading"),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false),
    [retry, setRetry] = useState(0);
  const latest = useRef(record),
    saving = useRef(false),
    mounted = useRef(true),
    editVersion = useRef(0);
  latest.current = record;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const load = useCallback(async () => {
    if (!userId || !supabase) return;
    const { data, error } = await supabase
      .from("finance_documents")
      .select("data,revision")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data && !validateFinance(data.data))
      throw new Error("Dados recebidos em formato inválido.");
    return {
      data: data?.data ?? emptyFinance(),
      revision: data?.revision ?? 0,
      dirty: false,
    } as RecordData;
  }, [userId]);
  useEffect(() => {
    let alive = true;
    let cached: RecordData | undefined;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      if (
        parsed &&
        validateFinance(parsed.data) &&
        Number.isSafeInteger(parsed.revision) &&
        typeof parsed.dirty === "boolean"
      )
        cached = parsed;
    } catch {}
    if (!userId) {
      setRecord(cached ?? { data: demoFinance(), revision: 0, dirty: false });
      setReady(true);
      setStatus("local");
      return;
    }
    (async () => {
      try {
        const remote = await load();
        if (!alive || !remote) return;
        const next = cached?.dirty ? cached : remote;
        setRecord(next);
        setStatus(
          cached?.dirty
            ? cached.revision !== remote.revision
              ? "conflict"
              : "pending"
            : "synced",
        );
        setReady(true);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar");
        if (cached) {
          setRecord(cached);
          setReady(true);
        }
        setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [key, userId, load]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(record));
    } catch {
      setError("Não foi possível guardar uma cópia local. Exporte um backup.");
    }
  }, [key, record, ready]);
  const save = useCallback(async () => {
    if (
      !supabase ||
      !userId ||
      saving.current ||
      !latest.current.dirty ||
      status === "conflict"
    )
      return;
    const snapshot = latest.current;
    saving.current = true;
    setStatus("saving");
    setError("");
    try {
      const { data, error } = await supabase.rpc("save_finance", {
        document: snapshot.data,
        expected_revision: snapshot.revision,
      });
      if (error) {
        if (error.code === "40001") {
          setStatus("conflict");
          return;
        }
        throw new Error(error.message);
      }
      if (!Number.isSafeInteger(data))
        throw new Error("Resposta de versão inválida.");
      if (!mounted.current) return;
      const stillPending = latest.current.data !== snapshot.data;
      setRecord((current) => ({
        ...current,
        revision: data,
        dirty: current.data !== snapshot.data,
      }));
      setStatus(stillPending ? "pending" : "synced");
    } catch (e) {
      if (mounted.current) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Falha ao sincronizar");
      }
    } finally {
      saving.current = false;
    }
  }, [userId, status]);
  useEffect(() => {
    if (
      !ready ||
      !record.dirty ||
      !userId ||
      ["error", "conflict"].includes(status)
    )
      return;
    const timer = setTimeout(() => void save(), 650);
    return () => clearTimeout(timer);
  }, [record, ready, userId, status, save, retry]);
  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    const refresh = async () => {
      if (saving.current || disposed || document.visibilityState === "hidden")
        return;
      if (latest.current.dirty) {
        setStatus((s) => (s === "conflict" ? s : "pending"));
        setRetry((n) => n + 1);
        return;
      }
      const version = editVersion.current;
      try {
        const remote = await load();
        if (
          !disposed &&
          remote &&
          !latest.current.dirty &&
          editVersion.current === version
        ) {
          setRecord(remote);
          setStatus("synced");
          setError("");
        }
      } catch {
        /* Keep last confirmed data. */
      }
    };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 30000);
    return () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [userId, load]);
  function update(fn: (data: Finance) => Finance) {
    const data = fn(latest.current.data);
    if (!validateFinance(data)) throw new Error("Confira os valores e campos.");
    editVersion.current++;
    const next = { ...latest.current, data, dirty: !!userId };
    latest.current = next;
    setRecord(next);
    if (status !== "conflict") setStatus(userId ? "pending" : "local");
  }
  async function reloadRemote() {
    const version = editVersion.current;
    const remote = await load();
    if (editVersion.current !== version)
      throw new Error(
        "Novas alterações surgiram durante a leitura. Exporte sua cópia antes de tentar novamente.",
      );
    if (remote) {
      setRecord(remote);
      setStatus("synced");
      setError("");
    }
  }
  return {
    data: record.data,
    update,
    status,
    error,
    ready,
    dirty: record.dirty,
    retry: () => {
      setStatus((current) => (current === "conflict" ? current : "pending"));
      setRetry((n) => n + 1);
    },
    reloadRemote,
  };
}
