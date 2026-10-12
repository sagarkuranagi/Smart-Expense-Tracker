const monthNames = {
  jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
  apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07",
  july: "07", aug: "08", august: "08", sep: "09", sept: "09", september: "09",
  oct: "10", october: "10", nov: "11", november: "11", dec: "12", december: "12"
};

function validDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : "";
}

function parseDate(text) {
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numeric = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (numeric) return validDate(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]));

  const named = text.match(/\b(\d{1,2})[\s/-]+([a-z]{3,9})[\s,/-]+(20\d{2})\b/i);
  if (named) {
    const month = monthNames[named[2].toLowerCase()];
    if (month) return validDate(Number(named[3]), Number(month), Number(named[1]));
  }
  return "";
}

function parseAmount(line) {
  const matches = [...line.matchAll(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)/gi)];
  if (!matches.length) return "";
  const rawAmount = matches[matches.length - 1][1].replaceAll(",", "");
  const amount = Number(rawAmount);
  return Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : "";
}

function parseTotal(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const totalLine = lines.find(line => /\b(grand\s+total|total\s+due|amount\s+paid|net\s+amount|total)\b/i.test(line));
  if (totalLine) return parseAmount(totalLine);

  const currencyLine = lines.find(line => /(?:₹|rs\.?|inr)\s*\d/i.test(line));
  return currencyLine ? parseAmount(currencyLine) : "";
}

function parseMerchant(text) {
  const excluded = /\b(receipt|invoice|tax invoice|gstin|phone|tel|date|time|cashier|customer|address|thank you|bill no|order no)\b/i;
  return text.split(/\r?\n/)
    .map(line => line.replace(/[^\p{L}\p{N}&'. -]/gu, " ").replace(/\s+/g, " ").trim())
    .find(line => line.length >= 3 && /[\p{L}]/u.test(line) && !excluded.test(line))
    ?.slice(0, 100) || "";
}

export function parseReceiptText(text) {
  return {
    title: parseMerchant(text),
    amount: parseTotal(text),
    date: parseDate(text)
  };
}
