import test from "node:test";
import assert from "node:assert/strict";
import { parseOfx, possibleDuplicate } from "../src/ofx.ts";
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
