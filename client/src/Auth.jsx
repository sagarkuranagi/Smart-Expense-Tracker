import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Wallet } from "lucide-react";
import "./Auth.css";

function Auth({ onAuthenticate, error }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const isRegister = mode === "register";

  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await onAuthenticate(mode, { name, email, password });
    } catch (requestError) {
      const message = requestError.response?.data?.message
        || (requestError.request
          ? "Cannot connect to the API. Make sure the backend is running, then try again."
          : "We couldn't sign you in. Please try again.");
      setFormError(message);
    } finally {
      setBusy(false);
    }
  };

  const changeMode = nextMode => {
    setMode(nextMode);
    setFormError("");
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-brand"><span className="auth-brand-mark"><Wallet size={22} /></span>Smart Expense Tracker <span className="auth-brand-dot">.</span></div>
        <div className="auth-story-copy">
          <span className="auth-kicker">A LITTLE MORE CLARITY</span>
          <h1>Make your money<br />feel more <em>manageable.</em></h1>
          <p>Your personal space to understand spending, celebrate progress, and plan what comes next.</p>
        </div>
        <div className="auth-story-note"><span>✦</span> Better money habits start with a clearer picture.</div>
        <div className="auth-decoration auth-decoration-one" />
        <div className="auth-decoration auth-decoration-two" />
      </section>

      <section className="auth-form-area">
        <div className="auth-card">
          <div className="auth-heading">
            <div className="auth-mobile-brand"><span className="auth-brand-mark"><Wallet size={20} /></span> Pennywise<span className="auth-brand-dot">.</span></div>
            <span className="auth-kicker">{isRegister ? "START YOUR JOURNEY" : "WELCOME BACK"}</span>
            <h2>{isRegister ? "Create your account" : "Sign in to your account"}</h2>
            <p>{isRegister ? "A few details and your finances are all in one place." : "Your financial snapshot is just a sign-in away."}</p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {isRegister && <label>Full name<input autoComplete="name" required minLength="2" maxLength="60" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Sam Kumar" /></label>}
            <label>Email address<input type="email" autoComplete="email" required maxLength="254" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></label>
            <label>Password
              <span className="auth-password-field">
                <input type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} required minLength={isRegister ? 8 : undefined} maxLength="72" value={password} onChange={event => setPassword(event.target.value)} placeholder={isRegister ? "At least 8 characters" : "Enter your password"} />
                <button type="button" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
              {isRegister && <small>Use at least 8 characters.</small>}
            </label>
            {(formError || error) && <p className="auth-error" role="alert">{formError || error}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"} {!busy && <ArrowRight size={17} />}</button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New to Pennywise?"}
            <button type="button" onClick={() => changeMode(isRegister ? "login" : "register")}>{isRegister ? "Sign in" : "Create an account"}</button>
          </p>
          <p className="auth-privacy">Your account and financial data are private to you.</p>
        </div>
      </section>
    </main>
  );
}

export default Auth;
