import { useState } from "react";
import { login } from "../api/auth.js";
import StatusBadge from "./StatusBadge.jsx";

function LoginForm({ onAuthenticated, onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setStatus("Email and password are required");
      setStatusType("error");
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus("Signing in...");
      setStatusType("loading");

      const data = await login(trimmedEmail, password);
      onAuthenticated(data.token, data.user);
    } catch (error) {
      setStatus(error.message || "Authentication failed");
      setStatusType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card-glass rounded-2xl p-6 animate-fade-in-up">
      <h2 className="text-xl font-semibold text-slate-100 mb-2">Sign in</h2>
      <p className="text-slate-400 text-sm mb-5">
        Your documents stay private to this account.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="input-field w-full rounded-xl px-4 py-3 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="input-field w-full rounded-xl px-4 py-3 text-sm"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full py-3 px-6 rounded-xl font-semibold text-sm disabled:opacity-40"
        >
          {isSubmitting ? "Please wait…" : "Sign in"}
        </button>
      </form>

      {status && <StatusBadge message={status} type={statusType} />}

      <button
        type="button"
        onClick={onSwitchToSignup}
        className="mt-4 text-sm text-blue-300 hover:text-blue-200"
      >
        Need an account? Create one
      </button>
    </div>
  );
}

export default LoginForm;
