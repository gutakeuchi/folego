import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { emptyFinance } from "../src/model.ts";

test("Postgres: validação, isolamento por usuário e controle de concorrência", async (t) => {
  const db = new PGlite();
  const alice = "00000000-0000-4000-8000-000000000001",
    bob = "00000000-0000-4000-8000-000000000002";
  try {
    await db.exec(`create schema auth; create role authenticated; create role anon;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated,anon;
      grant execute on function auth.uid() to authenticated,anon;
      insert into auth.users values ('${alice}'),('${bob}');`);
    await db.exec(
      await readFile(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const asUser = async (user) => {
      await db.exec("reset role; set role authenticated;");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user,
      ]);
    };
    await t.test(
      "Primeiro save cria revisão 1, segundo save incrementa e versão antiga é recusada",
      async () => {
        await asUser(alice);
        const first = await db.query(
          "select public.save_finance($1::jsonb,0) as revision",
          [JSON.stringify(emptyFinance())],
        );
        assert.equal(first.rows[0].revision, 1);
        const second = await db.query(
          "select public.save_finance($1::jsonb,1) as revision",
          [JSON.stringify(emptyFinance())],
        );
        assert.equal(second.rows[0].revision, 2);
        await assert.rejects(
          db.query("select public.save_finance($1::jsonb,1)", [
            JSON.stringify(emptyFinance()),
          ]),
          (e) => e.code === "40001",
        );
      },
    );
    await t.test(
      "Bob não lê, altera, insere ou exclui dados de Alice",
      async () => {
        await asUser(bob);
        const rows = await db.query("select * from public.finance_documents");
        assert.equal(rows.rows.length, 0);
        const updated = await db.query(
          "update public.finance_documents set revision=revision+1 where user_id=$1 returning user_id",
          [alice],
        );
        assert.equal(updated.rows.length, 0);
        const removed = await db.query(
          "delete from public.finance_documents where user_id=$1 returning user_id",
          [alice],
        );
        assert.equal(removed.rows.length, 0);
        await assert.rejects(
          db.query(
            "insert into public.finance_documents(user_id,data,revision) values($1,$2::jsonb,1)",
            [alice, JSON.stringify(emptyFinance())],
          ),
        );
        await db.query("select public.save_finance($1::jsonb,0)", [
          JSON.stringify(emptyFinance()),
        ]);
        const own = await db.query(
          "select user_id from public.finance_documents",
        );
        assert.deepEqual(own.rows, [{ user_id: bob }]);
      },
    );
    await t.test(
      "A API não permite trocar o proprietário de uma linha existente",
      async () => {
        await asUser(alice);
        await assert.rejects(
          db.query(
            "update public.finance_documents set user_id=$1,revision=revision+1 where user_id=$2",
            [bob, alice],
          ),
        );
      },
    );
    await t.test(
      "Documento inválido é recusado no servidor, mesmo ignorando o frontend",
      async () => {
        await asUser(alice);
        const invalid = emptyFinance();
        invalid.entries.push({
          id: "bad",
          title: "Teste",
          category: "Outros",
          date: "2026-02-30",
          cents: 1,
          type: "expense",
          accountId: "main",
          recurring: false,
        });
        await assert.rejects(
          db.query("select public.save_finance($1::jsonb,2)", [
            JSON.stringify(invalid),
          ]),
          (e) => e.code === "22023",
        );
        await assert.rejects(
          db.query("select public.save_finance($1::jsonb,2)", [
            JSON.stringify({
              accounts: [null],
              entries: [],
              goals: [],
              budgets: [],
            }),
          ]),
          (e) => e.code === "22023",
        );
      },
    );
    await t.test(
      "Anônimo não consulta documentos nem executa a função de gravação",
      async () => {
        await db.exec("reset role; set role anon;");
        await db.query("select set_config('request.jwt.claim.sub','',false)");
        await assert.rejects(
          db.query("select * from public.finance_documents"),
          (e) => e.code === "42501",
        );
        await assert.rejects(
          db.query("select public.save_finance($1::jsonb,0)", [
            JSON.stringify(emptyFinance()),
          ]),
          (e) => e.code === "42501",
        );
      },
    );
  } finally {
    await db.close();
  }
});
