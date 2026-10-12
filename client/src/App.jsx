import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet, LayoutDashboard, ArrowLeftRight, ChartNoAxesCombined, Settings, Plus,
  Search, Bell, ChevronDown, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  CalendarDays, SlidersHorizontal, Pencil, Trash2, X, Menu, CircleDollarSign,
  ShoppingBag, CarFront, House, HeartPulse, GraduationCap, BriefcaseBusiness, Coffee, MoreHorizontal, LogOut, Download
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createTransaction, deleteTransaction, findTransactionDuplicates, getCurrentUser, getSummary, getTransactions, login, logout, register, updateTransaction } from "./api.js";
import Auth from "./Auth.jsx";
import { buildReportCsv } from "./reportExport.js";
import ReceiptScanner from "./ReceiptScanner.jsx";
import "./App.css";
import "./Reports.css";

const categories = ["Food", "Transport", "Housing", "Health", "Education", "Salary", "Freelance", "Shopping", "Bills", "Other"];
const blankForm = { title: "", type: "expense", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), note: "" };
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);
const iconFor = category => {
  const map = { Food: Coffee, Transport: CarFront, Housing: House, Health: HeartPulse, Education: GraduationCap, Salary: BriefcaseBusiness, Freelance: BriefcaseBusiness, Shopping: ShoppingBag, Bills: CircleDollarSign };
  const Icon = map[category] || MoreHorizontal;
  return <Icon size={17} />;
};

function Dashboard({ user, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0, monthlyExpenses: 0, transactionCount: 0 });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("month");
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportFrom, setReportFrom] = useState(() => new Date().toISOString().slice(0, 8) + "01");
  const [reportTo, setReportTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);
  const [reportError, setReportError] = useState("");
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [duplicateSignature, setDuplicateSignature] = useState("");
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, totals] = await Promise.all([
        getTransactions({ search, type: typeFilter === "all" ? "" : typeFilter, category: categoryFilter === "all" ? "" : categoryFilter }),
        getSummary()
      ]);
      setTransactions(items);
      setSummary(totals);
      setError("");
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onLogout();
        return;
      }
      setError("Cannot reach the API. Start the backend server and refresh this page.");
    } finally { setLoading(false); }
  }, [search, typeFilter, categoryFilter, onLogout]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const chartData = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      result.push({ month: date.toLocaleDateString("en-IN", { month: "short" }), key, expenses: 0, income: 0 });
    }
    transactions.forEach(item => {
      const key = String(item.date).slice(0, 7);
      const bucket = result.find(entry => entry.key === key);
      if (bucket) bucket[item.type === "income" ? "income" : "expenses"] += Number(item.amount);
    });
    return result;
  }, [transactions]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blankForm, date: new Date().toISOString().slice(0, 10) });
    setDuplicateMatches([]);
    setDuplicateSignature("");
    setAllowDuplicate(false);
    setDuplicateError("");
    setModalOpen(true);
  };
  const openEdit = item => {
    setEditing(item);
    setForm({ title: item.title, type: item.type, amount: String(item.amount), category: item.category, date: String(item.date).slice(0, 10), note: item.note || "" });
    setDuplicateMatches([]);
    setDuplicateSignature("");
    setAllowDuplicate(false);
    setDuplicateError("");
    setModalOpen(true);
  };
  const applyReceipt = fields => {
    setForm(current => ({
      ...current,
      title: fields.title || current.title,
      amount: fields.amount || current.amount,
      date: fields.date || current.date,
      type: "expense"
    }));
    setDuplicateMatches([]);
    setDuplicateSignature("");
    setAllowDuplicate(false);
    setDuplicateError("");
  };
  const updateForm = changes => {
    setForm(current => ({ ...current, ...changes }));
    setDuplicateMatches([]);
    setDuplicateSignature("");
    setAllowDuplicate(false);
    setDuplicateError("");
  };
  const currentDuplicateSignature = JSON.stringify([
    form.title.trim().toLowerCase(),
    Math.round(Number(form.amount) * 100),
    form.date,
    form.type
  ]);
  const duplicateConfirmationReady = duplicateMatches.length > 0 && duplicateSignature === currentDuplicateSignature;
  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setDuplicateError("");
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (!editing) {
        const signature = JSON.stringify([payload.title.trim().toLowerCase(), Math.round(payload.amount * 100), payload.date, payload.type]);
        const matches = await findTransactionDuplicates(payload);
        if (matches.length && !(allowDuplicate && duplicateSignature === signature)) {
          setDuplicateMatches(matches);
          setDuplicateSignature(signature);
          setAllowDuplicate(true);
          return;
        }
        setDuplicateMatches([]);
        setDuplicateSignature("");
        setAllowDuplicate(false);
      }
      if (editing) await updateTransaction(editing._id, payload);
      else await createTransaction(payload);
      setModalOpen(false);
      setToast(editing ? "Transaction updated successfully" : "Transaction added successfully");
      await load();
    } catch (err) {
      if (err.response?.status === 401) {
        onLogout();
      } else if (err.config?.url?.includes("/duplicates")) {
        setDuplicateError(err.response?.data?.message || "Could not check for possible duplicates.");
      } else {
        setError(err.response?.data?.message || "Could not save transaction. Please check the API.");
      }
    } finally { setBusy(false); }
  };
  const remove = async item => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await deleteTransaction(item._id);
      setToast("Transaction deleted");
      await load();
    } catch { setError("Could not delete this transaction."); }
  };
  const exportReport = async event => {
    event.preventDefault();
    const dateFrom = reportPeriod === "month" ? `${reportMonth}-01` : reportFrom;
    let dateTo = reportTo;
    if (reportPeriod === "month" && /^\d{4}-\d{2}$/.test(reportMonth)) {
      const [year, month] = reportMonth.split("-").map(Number);
      dateTo = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    }
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      setReportError("Choose a valid date range with the start on or before the end.");
      return;
    }

    setExporting(true);
    setReportError("");
    try {
      const items = await getTransactions({ dateFrom, dateTo });
      const { csv } = buildReportCsv(items);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `pennywise-report-${dateFrom}-to-${dateTo}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onLogout();
        return;
      }
      setReportError(requestError.response?.data?.message || "Could not export this report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Wallet size={22} /></div><span>Expense<span className="brand-dot">.</span></span><button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={19}/></button></div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          <button className="nav-item active"><LayoutDashboard size={19}/><span>Overview</span></button>
          <button className="nav-item" onClick={() => document.getElementById("transactions")?.scrollIntoView({ behavior: "smooth" })}><ArrowLeftRight size={19}/><span>Transactions</span><span className="nav-count">{summary.transactionCount}</span></button>
          <button className="nav-item" onClick={() => document.getElementById("reports")?.scrollIntoView({ behavior: "smooth" })}><ChartNoAxesCombined size={19}/><span>Reports</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-icon"><ChartNoAxesCombined size={20}/></div><strong>Build better habits</strong><p>Small steps today, more freedom tomorrow.</p><button onClick={openCreate}>Add transaction <ArrowUpRight size={15}/></button></div>
          <button className="nav-item muted"><Settings size={19}/><span>Settings</span></button>
          <div className="profile"><div className="avatar">{user.name.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase()}</div><div className="profile-copy"><strong>{user.name}</strong><span>{user.email}</span></div><button className="logout-button" onClick={onLogout} aria-label="Sign out" title="Sign out"><LogOut size={17}/></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={21}/></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-actions"><div className="today-pill"><CalendarDays size={15}/>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div><button className="icon-button notification" aria-label="Notifications"><Bell size={19}/><i/></button><div className="top-avatar">{user.name.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase()}</div><ChevronDown size={16} className="profile-chevron"/></div>
        </header>

        <div className="page-content">
          <section className="welcome-row"><div><div className="eyebrow">YOUR FINANCIAL SNAPSHOT</div><h1>Good to see you <span>👋</span></h1><p>Here's what's happening with your money.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18}/> Add transaction</button></section>

          {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={16}/></button></div>}
          {toast && <div className="toast" role="status">{toast}</div>}

          <section className="stats-grid">
            <article className="stat-card balance-card"><div className="stat-top"><span>Total balance</span><span className="stat-icon balance-icon"><Wallet size={19}/></span></div><div className="stat-value">{money(summary.balance)}</div><div className="stat-foot"><span className="positive-tag"><TrendingUp size={14}/> Available balance</span><span className="stat-caption">Income minus expenses</span></div><div className="balance-decoration decoration-one"/><div className="balance-decoration decoration-two"/></article>
            <article className="stat-card"><div className="stat-top"><span>Total income</span><span className="stat-icon income-icon"><ArrowDownRight size={19}/></span></div><div className="stat-value">{money(summary.income)}</div><div className="stat-foot"><span className="positive-text"><TrendingUp size={14}/> Money in</span><span className="stat-caption">All recorded income</span></div></article>
            <article className="stat-card"><div className="stat-top"><span>Total expenses</span><span className="stat-icon expense-icon"><ArrowUpRight size={19}/></span></div><div className="stat-value">{money(summary.expenses)}</div><div className="stat-foot"><span className="negative-text"><TrendingDown size={14}/> Money out</span><span className="stat-caption">All recorded expenses</span></div></article>
          </section>

          <section className="panel report-panel" id="reports">
            <div className="report-heading">
              <div><div className="eyebrow">YOUR DATA, YOUR WAY</div><h2>Reports &amp; export</h2><p>Download a CSV of transactions and totals for any period.</p></div>
              <span className="report-icon"><Download size={19}/></span>
            </div>
            <form className="report-controls" onSubmit={exportReport}>
              <label className="report-period-field">Period
                <select value={reportPeriod} onChange={event => { setReportPeriod(event.target.value); setReportError(""); }}>
                  <option value="month">Selected month</option>
                  <option value="range">Custom date range</option>
                </select>
              </label>
              {reportPeriod === "month" ? (
                <label className="report-date-field">Month
                  <input type="month" required value={reportMonth} onChange={event => setReportMonth(event.target.value)} />
                </label>
              ) : (
                <>
                  <label className="report-date-field">From
                    <input type="date" required value={reportFrom} onChange={event => setReportFrom(event.target.value)} />
                  </label>
                  <label className="report-date-field">To
                    <input type="date" required min={reportFrom} value={reportTo} onChange={event => setReportTo(event.target.value)} />
                  </label>
                </>
              )}
              <button className="primary-button report-download" type="submit" disabled={exporting || !reportMonth && reportPeriod === "month" || reportPeriod === "range" && (!reportFrom || !reportTo || reportFrom > reportTo)}>
                <Download size={16}/>{exporting ? "Preparing CSV…" : "Download CSV"}
              </button>
            </form>
            {reportError && <p className="report-error" role="alert">{reportError}</p>}
          </section>

          <section className="content-grid">
            <article className="panel chart-panel" id="spending-chart"><div className="panel-heading"><div><h2>Cash flow</h2><p>Income and expenses over the last 6 months</p></div><span className="chart-legend"><i className="legend-income"/> Income <i className="legend-expense"/> Expenses</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 6, left: -18, bottom: 0 }} barGap={5}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8b93a7", fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b93a7", fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : v}/><Tooltip formatter={value => money(value)} contentStyle={{ border: "1px solid #edf0f5", borderRadius: 12, boxShadow: "0 8px 30px #15234a12" }}/><Bar dataKey="income" name="Income" fill="#5b67e8" radius={[5,5,0,0]} maxBarSize={24}/><Bar dataKey="expenses" name="Expenses" fill="#f5a66b" radius={[5,5,0,0]} maxBarSize={24}/></BarChart></ResponsiveContainer></div></article>
            <article className="panel insight-panel"><div className="panel-heading"><div><h2>Quick insight</h2><p>Your money at a glance</p></div><span className="insight-spark">✦</span></div><div className="insight-graphic"><div className="ring"><div className="ring-inner"><TrendingUp size={26}/><strong>{summary.income > 0 ? Math.round((summary.balance / summary.income) * 100) : 0}%</strong><span>net balance</span></div></div></div><div className="insight-copy"><strong>{summary.balance >= 0 ? "You're in positive territory" : "Expenses are above income"}</strong><p>{summary.balance >= 0 ? "Keep tracking your spending to stay on top of your financial goals." : "Review your recent expenses and look for places to cut back."}</p></div><div className="insight-bottom"><span>Monthly expenses</span><strong>{money(summary.monthlyExpenses)}</strong></div></article>
          </section>

          <section className="panel transactions-panel" id="transactions"><div className="transactions-heading"><div><h2>Recent transactions</h2><p>Keep track of where your money goes.</p></div><button className="text-button" onClick={load}>Refresh <ArrowUpRight size={15}/></button></div>
            <div className="filters"><div className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..." aria-label="Search transactions"/>{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={14}/></button>}</div><div className="filter-select"><SlidersHorizontal size={16}/><select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} aria-label="Filter by type"><option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select></div><div className="filter-select"><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{categories.map(cat => <option key={cat}>{cat}</option>)}</select></div></div>
            <div className="table-wrap"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th>TYPE</th><th aria-label="Actions"/></tr></thead><tbody>
              {loading ? <tr><td colSpan="6" className="table-message">Loading transactions…</td></tr> : transactions.length === 0 ? <tr><td colSpan="6" className="table-message">No transactions found. Add one to get started.</td></tr> : transactions.map(item => <tr key={item._id}><td><div className="transaction-name"><span className={`category-icon category-${item.category.toLowerCase()}`}>{iconFor(item.category)}</span><span><strong>{item.title}</strong><small>{item.note || (item.type === "income" ? "Income received" : "Expense recorded")}</small></span></div></td><td><span className="category-label">{item.category}</span></td><td className="date-cell">{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td><td className={`amount-cell ${item.type}`}>{item.type === "income" ? "+" : "−"}{money(item.amount)}</td><td><span className={`type-badge ${item.type}`}>{item.type === "income" ? "Income" : "Expense"}</span></td><td><div className="row-actions"><button onClick={() => openEdit(item)} aria-label={`Edit ${item.title}`} title="Edit"><Pencil size={15}/></button><button onClick={() => remove(item)} aria-label={`Delete ${item.title}`} title="Delete"><Trash2 size={15}/></button></div></td></tr>)}
            </tbody></table></div><div className="table-footer"><span>Showing <strong>{transactions.length}</strong> transaction{transactions.length === 1 ? "" : "s"}</span><span>Amounts in INR (₹)</span></div>
          </section>
          <footer className="footer"><span>© {new Date().getFullYear()} Smart Expense Tracker</span><span>Made for smarter money habits <span className="footer-heart">♥</span></span></footer>
        </div>
      </main>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">{editing ? "UPDATE RECORD" : "NEW RECORD"}</div>
                <h2 id="modal-title">{editing ? "Edit transaction" : "Add transaction"}</h2>
                <p>Enter the details below to keep your finances up to date.</p>
              </div>
              <button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close modal"><X size={20}/></button>
            </div>
            {!editing && <ReceiptScanner onExtract={applyReceipt}/>}
            <form onSubmit={submit}>
              <div className="type-toggle">
                <button type="button" className={form.type === "expense" ? "selected expense-choice" : ""} onClick={() => updateForm({ type: "expense", category: ["Salary", "Freelance"].includes(form.category) ? "Food" : form.category })}><ArrowUpRight size={17}/> Expense</button>
                <button type="button" className={form.type === "income" ? "selected income-choice" : ""} onClick={() => updateForm({ type: "income", category: ["Food", "Transport", "Housing", "Health", "Education", "Shopping", "Bills"].includes(form.category) ? "Salary" : form.category })}><ArrowDownRight size={17}/> Income</button>
              </div>
              <label>Title<input required maxLength="100" value={form.title} onChange={event => updateForm({ title: event.target.value })} placeholder="e.g. Grocery shopping"/></label>
              <div className="form-two">
                <label>Amount (₹)<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={event => updateForm({ amount: event.target.value })} placeholder="0.00"/></label>
                <label>Category<select required value={form.category} onChange={event => updateForm({ category: event.target.value })}>{categories.filter(category => form.type === "income" ? ["Salary", "Freelance", "Other"].includes(category) : !["Salary", "Freelance"].includes(category)).map(category => <option key={category}>{category}</option>)}</select></label>
              </div>
              <label>Date<input required type="date" value={form.date} onChange={event => updateForm({ date: event.target.value })}/></label>
              <label>Note <span className="optional">(optional)</span><textarea rows="3" maxLength="300" value={form.note} onChange={event => updateForm({ note: event.target.value })} placeholder="Add a little more detail..."/></label>
              {duplicateMatches.length > 0 && duplicateSignature === currentDuplicateSignature && (
                <div className="duplicate-warning" role="alert">
                  <strong>Possible duplicate transaction</strong>
                  <p>We found similar transaction{duplicateMatches.length === 1 ? "" : "s"}. Review before saving; you can still choose to save anyway.</p>
                  <ul>{duplicateMatches.map(match => (
                    <li key={match.transaction._id}>
                      <span><b>{match.transaction.title}</b> · {new Date(`${match.transaction.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {money(match.transaction.amount)}</span>
                      <small>{match.reasons.join(" · ")} · {match.confidence}% match</small>
                    </li>
                  ))}</ul>
                </div>
              )}
              {duplicateError && <p className="form-error" role="alert">{duplicateError}</p>}
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={busy}>
                  {busy ? "Checking and saving…" : duplicateConfirmationReady ? "Save anyway" : editing ? "Save changes" : "Add transaction"} <ArrowUpRight size={16}/>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(currentUser => {
        if (active) setUser(currentUser);
      })
      .catch(requestError => {
        if (!active) return;
        if (requestError.response?.status !== 401) {
          setAuthError("Cannot reach the API. Start the backend server and try again.");
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => { active = false; };
  }, []);

  const handleAuthenticate = async (mode, credentials) => {
    const authenticatedUser = mode === "register"
      ? await register(credentials)
      : await login(credentials);
    setAuthError("");
    setUser(authenticatedUser);
  };

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setAuthError("");
    } catch {
      setAuthError("The server could not confirm sign-out. Please try again.");
    } finally {
      setUser(null);
    }
  }, []);

  if (checkingSession) {
    return <main className="auth-loading" aria-label="Checking sign-in status"><span /></main>;
  }
  if (!user) return <Auth onAuthenticate={handleAuthenticate} error={authError} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
