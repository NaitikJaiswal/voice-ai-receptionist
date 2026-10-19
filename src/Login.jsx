import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function Login({ onLogin }) {
  // First-time users see "register"; users who have already registered see "login"
  const [mode, setMode] = useState(() => {
    const hasRegistered =
      localStorage.getItem("hasRegistered") === "true" ||
      localStorage.getItem("isRegistered") === "true" ||
      Boolean(localStorage.getItem("registeredEmail")) ||
      Boolean(localStorage.getItem("user"));

    return hasRegistered ? "login" : "register";
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => {
    return localStorage.getItem("registeredEmail") || "";
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const isRegister = mode === "register";
  const isReset = mode === "reset";
  const isLogin = mode === "login";

  const switchMode = (targetMode) => {
    setMode(targetMode);
    setError("");
    setSuccessMsg("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if ((isRegister || isReset) && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if ((isRegister || isReset) && password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      const endpoint = isRegister
        ? "register"
        : isReset
        ? "reset-password"
        : "login";

      const payload = isRegister
        ? { name: name.trim(), email: email.trim(), password }
        : isReset
        ? { email: email.trim(), newPassword: password }
        : { email: email.trim(), password };

      const response = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // If registration fails because account already exists, flag as registered
        if (
          isRegister &&
          (response.status === 409 ||
            (data.message &&
              data.message.toLowerCase().includes("already exists")))
        ) {
          localStorage.setItem("hasRegistered", "true");
          localStorage.setItem("isRegistered", "true");
          localStorage.setItem("registeredEmail", email.trim());
        }

        throw new Error(
          data.message ||
            `${
              isRegister
                ? "Registration"
                : isReset
                ? "Password reset"
                : "Login"
            } failed. Please try again.`
        );
      }

      if (!data.token) {
        throw new Error("Authentication token was not returned.");
      }

      // Mark user as registered so subsequent visits show login
      localStorage.setItem("hasRegistered", "true");
      localStorage.setItem("isRegistered", "true");
      localStorage.setItem("registeredEmail", email.trim());
      localStorage.setItem("token", data.token);

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      onLogin();
    } catch (err) {
      setError(
        err.message || "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold shadow-lg shadow-blue-600/20">
            V
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            VoiceDesk <span className="text-blue-400">AI</span>
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Your intelligent AI receptionist dashboard
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
          {/* First-time vs Registered Tab Selector */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition ${
                isRegister
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Register (First Time)
            </button>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition ${
                isLogin
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Log In (Existing User)
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold">
              {isRegister
                ? "Create your account"
                : isReset
                ? "Reset your password"
                : "Welcome back"}
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              {isRegister
                ? "First time here? Register your account to get started."
                : isReset
                ? "Enter your email and choose a new password."
                : "Already registered? Log in to manage your receptionist dashboard."}
            </p>
          </div>

          {successMsg && (
            <div className="mb-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {successMsg}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              <div className="flex flex-col gap-2">
                <span>{error}</span>

                {isRegister &&
                  error.toLowerCase().includes("already exists") && (
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="w-fit text-xs font-semibold text-blue-400 underline hover:text-blue-300"
                    >
                      Already have an account? Click here to Log In →
                    </button>
                  )}

                {isLogin &&
                  error.toLowerCase().includes("no account found") && (
                    <button
                      type="button"
                      onClick={() => switchMode("register")}
                      className="w-fit text-xs font-semibold text-blue-400 underline hover:text-blue-300"
                    >
                      Email not registered. Click here to Register →
                    </button>
                  )}

                {isLogin &&
                  error.toLowerCase().includes("incorrect password") && (
                    <button
                      type="button"
                      onClick={() => switchMode("reset")}
                      className="w-fit text-xs font-semibold text-amber-400 underline hover:text-amber-300"
                    >
                      Forgot your password? Click here to Reset Password →
                    </button>
                  )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Full name
                </label>

                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300"
                >
                  {isReset ? "New password" : "Password"}
                </label>

                {isLogin && (
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isRegister || isReset ? "new-password" : "current-password"
                  }
                  placeholder={
                    isRegister || isReset
                      ? "At least 8 characters"
                      : "Enter your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={isRegister || isReset ? 8 : undefined}
                  maxLength={72}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 pr-11 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {(isRegister || isReset) && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Confirm {isReset ? "new password" : "password"}
                </label>

                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  maxLength={72}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : isRegister
                ? "Create account"
                : isReset
                ? "Update password & log in"
                : "Log in"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-5 text-center text-sm text-slate-400">
            {isRegister ? (
              <>
                Already registered before?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-semibold text-blue-400 hover:text-blue-300"
                >
                  Log in instead
                </button>
              </>
            ) : isReset ? (
              <>
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-semibold text-blue-400 hover:text-blue-300"
                >
                  Back to login
                </button>
              </>
            ) : (
              <>
                First time at VoiceDesk AI?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-semibold text-blue-400 hover:text-blue-300"
                >
                  Register your account
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Secure access to your VoiceDesk AI account
        </p>
      </div>
    </div>
  );
}
