import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  Check,
  Eye,
  EyeOff,
  LayoutDashboard,
  BarChart3,
  Shield,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import { RequiredMark } from "../components/ui/Input";
import toast from "react-hot-toast";
import { adminHome } from "../utils/adminPaths";

const LOGO_URL =
  "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/BPS.png?updatedAt=1773667763921";

const FEATURES = [
  "Project Management",
  "Blog Management",
  "Lead Tracking",
  "Portfolio Management",
  "Analytics & Insights",
];

function PasswordField({ value, onChange, id = "admin-password" }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-admin-text">
        Password
        <RequiredMark />
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          className="admin-login-input w-full rounded-xl border border-admin-border bg-white/80 py-3 pl-4 pr-11 text-sm text-admin-text shadow-sm backdrop-blur-sm transition-all placeholder:text-slate-400 focus:border-admin-primary focus:outline-none focus:ring-4 focus:ring-blue-500/10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-admin-textMuted transition-colors hover:text-admin-text"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="admin-login-preview pointer-events-none mt-6 hidden select-none lg:block xl:mt-8">
      <div className="admin-login-preview-glow" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur-md">
        <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="ml-2 text-xs font-medium text-white/50">BluePeak Dashboard</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Projects", value: "24" },
            { label: "Leads", value: "18" },
            { label: "Revenue", value: "₹2.4L" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white/10 p-3">
              <p className="text-[10px] uppercase tracking-wide text-white/45">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {[72, 48, 86].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300" style={{ width: `${w}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="admin-login flex h-[100dvh] items-center justify-center overflow-hidden bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-400" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={adminHome()} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate(adminHome());
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login h-[100dvh] overflow-hidden bg-slate-950 text-white">
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        {/* Brand panel */}
        <section
          className="admin-login-brand relative flex min-h-0 flex-[1.1] flex-col justify-between overflow-hidden px-6 py-6 sm:px-8 sm:py-7 lg:flex-[1.35] lg:px-10 lg:py-10 xl:px-14"
          aria-label="BluePeak Studio admin portal"
        >
          <div className="admin-login-brand-bg" aria-hidden="true" />
          <div className="admin-login-orb admin-login-orb-1" aria-hidden="true" />
          <div className="admin-login-orb admin-login-orb-2" aria-hidden="true" />

          <div className="admin-login-brand-content relative z-10">
            <div className="flex items-center gap-3">
              <img
                src={LOGO_URL}
                alt="BluePeak Studio"
                className="h-10 w-10 rounded-xl bg-white/10 object-contain p-1.5 shadow-lg ring-1 ring-white/20 sm:h-11 sm:w-11"
              />
              <div>
                <p className="text-sm font-semibold tracking-wide text-white">BluePeak Studio</p>
                <p className="text-xs text-blue-200/70">Agency Operations Hub</p>
              </div>
            </div>

            <div className="mt-5 max-w-xl lg:mt-8 xl:mt-10">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-blue-100/90 backdrop-blur-sm">
                <Sparkles size={14} className="text-cyan-300" />
                Premium admin workspace
              </div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl xl:text-[2.65rem] xl:leading-[1.12]">
                Manage Your Agency
                <span className="block bg-gradient-to-r from-blue-200 via-cyan-200 to-white bg-clip-text text-transparent">
                  From One Place
                </span>
              </h1>
              <p className="admin-login-desc mt-3 max-w-lg text-sm leading-relaxed text-blue-100/75 sm:text-[0.9375rem] lg:mt-4 lg:text-base">
                Manage projects, leads, blogs, portfolios, and agency operations
                through a centralized dashboard.
              </p>
            </div>

            <ul className="admin-login-features mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-2 lg:mt-6">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-blue-50/90">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <DashboardPreview />
          </div>

          <div className="relative z-10 mt-4 hidden items-center gap-6 text-xs text-white/40 lg:flex">
            <span className="inline-flex items-center gap-1.5">
              <Shield size={14} />
              Secure access
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LayoutDashboard size={14} />
              Built for agencies
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BarChart3 size={14} />
              Real-time insights
            </span>
          </div>
        </section>

        {/* Login panel */}
        <section className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden bg-slate-50 px-5 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-8 xl:px-14">
          <div className="admin-login-form-glow pointer-events-none hidden lg:block" aria-hidden="true" />

          <div className="admin-login-card relative z-10 mx-auto w-full max-w-[420px]">
            <div className="mb-6 lg:mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-admin-primary">
                Admin Portal
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-admin-text sm:text-[1.75rem]">
                Welcome back
              </h2>
              <p className="mt-1.5 text-sm text-admin-textMuted">
                Sign in to continue to your dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-admin-text">
                  Email address
                  <RequiredMark />
                </label>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="Enter your email"
                  className="admin-login-input w-full rounded-xl border border-admin-border bg-white py-3 px-4 text-sm text-admin-text shadow-sm transition-all placeholder:text-slate-400 focus:border-admin-primary focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />

              <Button
                type="submit"
                size="lg"
                loading={submitting}
                className="admin-login-submit w-full rounded-xl py-3 text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.99]"
              >
                {submitting ? "Signing in…" : "Sign in to dashboard"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs leading-relaxed text-admin-textMuted">
              Authorized personnel only. All activity is logged for security.
            </p>
          </div>

          <p className="relative z-10 mx-auto mt-4 hidden text-center text-[11px] text-slate-400 lg:block">
            © {new Date().getFullYear()} BluePeak Studio. All rights reserved.
          </p>
        </section>
      </div>
    </div>
  );
}
