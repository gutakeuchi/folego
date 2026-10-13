import type { Entry } from "./model";

export async function parseOfx(
  text: string,
  accountId: string,
): Promise<Entry[]> {
  if (!/<OFX[>\s]/i.test(text) || /<!DOCTYPE|<!ENTITY/i.test(text))
    throw new Error("Arquivo OFX inválido.");
  const value = (block: string, tag: string) =>
    (block.match(new RegExp(`<${tag}\\s*>([^<]*)`, "i"))?.[1] ?? "")
      .trim()
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  if (Array.from(text.matchAll(/<(?:STMTRS|CCSTMTRS)>/gi)).length > 1)
    throw new Error("Exporte apenas uma conta por arquivo.");
  const currency = value(text, "CURDEF");
  if (currency !== "BRL") throw new Error("Importe um extrato em reais (BRL).");
  const blocks = [...text.matchAll(/<STMTTRN\s*>([\s\S]*?)<\/STMTTRN\s*>/gi)];
  if (!blocks.length || blocks.length > 5000)
    throw new Error("O extrato deve ter entre 1 e 5.000 lançamentos.");
  const bank = [value(text, "BANKID"), value(text, "ACCTID")];
  return Promise.all(
    blocks.map(async ([, block], index) => {
      if (value(block, "CORRECTFITID"))
        throw new Error(
          "Extratos com correções bancárias ainda não são suportados.",
        );
      const rawDate = value(block, "DTPOSTED");
      const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      const amount = value(block, "TRNAMT");
      const fitid = value(block, "FITID");
      if (
        !/^\d{8}/.test(rawDate) ||
        Number.isNaN(Date.parse(date)) ||
        new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date ||
        !/^[+-]?\d+(?:[.,]\d{1,2})?$/.test(amount) ||
        !fitid
      )
        throw new Error(
          `Lançamento ${index + 1}: data, valor ou identificador inválido.`,
        );
      const signed = Math.round(Number(amount.replace(",", ".")) * 100);
      if (
        !Number.isSafeInteger(signed) ||
        Math.abs(signed) > 100_000_000_000 ||
        signed === 0
      )
        throw new Error(`Lançamento ${index + 1}: valor não suportado.`);
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify([accountId, ...bank, fitid])),
      );
      const id =
        "ofx-" +
        [...new Uint8Array(digest)]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
      return {
        id,
        accountId,
        date,
        cents: Math.abs(signed),
        type: signed < 0 ? "expense" : "income",
        title: (
          value(block, "NAME") ||
          value(block, "MEMO") ||
          "Movimentação bancária"
        ).slice(0, 160),
        category: "Outros",
        recurring: false,
      };
    }),
  );
}

export function possibleDuplicate(a: Entry, b: Entry) {
  return (
    a.accountId === b.accountId &&
    a.date === b.date &&
    a.cents === b.cents &&
    a.type === b.type &&
    a.title.trim().toLocaleLowerCase() === b.title.trim().toLocaleLowerCase()
  );
}
