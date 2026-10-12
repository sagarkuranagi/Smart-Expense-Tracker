const csvCell = (value, text = false) => {
  let cell = String(value ?? "");
  if (text && /^[\s]*[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replaceAll('"', '""')}"`;
};

const toCents = amount => Math.round(Number(amount) * 100);
const formatCents = cents => (cents / 100).toFixed(2);

export function buildReportCsv(transactions) {
  const incomeCents = transactions
    .filter(item => item.type === "income")
    .reduce((total, item) => total + toCents(item.amount), 0);
  const expenseCents = transactions
    .filter(item => item.type === "expense")
    .reduce((total, item) => total + toCents(item.amount), 0);
  const rows = [
    ["Date", "Title", "Type", "Category", "Amount (INR)", "Note"],
    ...transactions.map(item => [
      csvCell(item.date, true),
      csvCell(item.title, true),
      csvCell(item.type, true),
      csvCell(item.category, true),
      csvCell(formatCents(toCents(item.amount))),
      csvCell(item.note, true)
    ]),
    [],
    ["Total income", "", "", "", formatCents(incomeCents), ""],
    ["Total expenses", "", "", "", formatCents(expenseCents), ""],
    ["Net balance", "", "", "", formatCents(incomeCents - expenseCents), ""],
    ["Transaction count", "", "", "", String(transactions.length), ""]
  ];
  return {
    csv: `\uFEFF${rows.map(row => row.map(cell => cell || '""').join(",")).join("\r\n")}\r\n`,
    totals: { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents, transactionCount: transactions.length }
  };
}
