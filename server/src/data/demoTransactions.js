import { demoTransactions } from "./demoStore.js";

const demoTransactionsByUser = new Map();

export function getDemoTransactions(userId) {
  if (!demoTransactionsByUser.has(userId)) {
    demoTransactionsByUser.set(userId, demoTransactions.map(item => ({ ...item })));
  }
  return demoTransactionsByUser.get(userId);
}
