import test from "node:test";
import assert from "node:assert/strict";
import { parseOfx, possibleDuplicate } from "../src/ofx.ts";
test("OFX recusa extrato sem transações, múltiplas contas e correções", async () => {
  for (const input of [
    "<OFX><CURDEF>BRL</OFX>",
    statement().replace("<STMTRS>", "<STMTRS><STMTRS>"),
    statement().replace("<FITID>", "<CORRECTFITID>old<FITID>"),
  ])
    await assert.rejects(() => parseOfx(input, "main"));
});
test("OFX identifica separadamente contas bancárias distintas", async () => {
  const a = (await parseOfx(statement(), "main"))[0];
  const b = (
    await parseOfx(statement().replace("<ACCTID>123", "<ACCTID>456"), "main")
  )[0];
  assert.notEqual(a.id, b.id);
});
test("OFX não confunde receitas e despesas no detector aproximado", async () => {
  const a = (await parseOfx(statement(), "main"))[0];
  assert.equal(possibleDuplicate(a, { ...a, type: "income" }), false);
  assert.equal(possibleDuplicate(a, { ...a, accountId: "other" }), false);
});
test("OFX admite vírgula decimal e rejeita zero e valor excessivo", async () => {
  assert.equal((await parseOfx(statement("-0,01"), "main"))[0].cents, 1);
  for (const amount of ["0", "1000000001", "NaN", "1e3"])
    await assert.rejects(() => parseOfx(statement(amount), "main"));
});
const statement = (amount = "-12.34", date = "20261013", fitid = "abc") =>
  `<OFX><STMTRS><CURDEF>BRL<BANKID>001<ACCTID>123<BANKTRANLIST><STMTTRN><DTPOSTED>${date}<TRNAMT>${amount}<FITID>${fitid}<NAME>Mercado &amp; Cia</STMTTRN></BANKTRANLIST></STMTRS></OFX>`;
test("OFX SGML converte sinal, centavos, entidades e mantém identidade estável", async () => {
  const [a] = await parseOfx(statement(), "main");
  assert.equal(a.cents, 1234);
  assert.equal(a.type, "expense");
  assert.equal(a.date, "2026-10-13");
  assert.equal(a.title, "Mercado & Cia");
  assert.equal(a.id, (await parseOfx(statement(), "main"))[0].id);
  assert.notEqual(a.id, (await parseOfx(statement(), "another"))[0].id);
  assert.ok(possibleDuplicate(a, { ...a, id: "manual" }));
});
test("OFX XML aceita receitas e rejeita datas, valores, moeda e identificadores inválidos", async () => {
  const xml = statement("10.05")
    .replace("BRL<", "BRL</CURDEF><")
    .replace("001<", "001</BANKID><")
    .replace("123<", "123</ACCTID><");
  assert.equal((await parseOfx(xml, "main"))[0].type, "income");
  for (const file of [
    statement("1.999"),
    statement("1", "20260230"),
    statement("1", "20261013", ""),
    statement().replace("BRL", "USD"),
    statement().replace("<OFX>", "<!DOCTYPE OFX><OFX>"),
  ])
    await assert.rejects(() => parseOfx(file, "main"));
});
