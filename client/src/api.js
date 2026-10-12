import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true
});
export const getCurrentUser = () => api.get("/auth/me").then(res => res.data.user);
export const register = data => api.post("/auth/register", data).then(res => res.data.user);
export const login = data => api.post("/auth/login", data).then(res => res.data.user);
export const logout = () => api.post("/auth/logout");
export const getTransactions = params => api.get("/transactions", { params }).then(res => res.data);
export const findTransactionDuplicates = data => api.post("/transactions/duplicates", data).then(res => res.data.matches);
export const createTransaction = data => api.post("/transactions", data).then(res => res.data);
export const updateTransaction = (id, data) => api.put(`/transactions/${id}`, data).then(res => res.data);
export const deleteTransaction = id => api.delete(`/transactions/${id}`).then(res => res.data);
export const getSummary = () => api.get("/dashboard/summary").then(res => res.data);
