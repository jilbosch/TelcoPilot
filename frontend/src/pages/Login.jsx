import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import Logo from "../components/Logo";
import { ShieldCheck, LogIn, AlertCircle } from "lucide-react";

export default function Login() {
    const { login } = useAuth();
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            await login(email, password);
            nav("/");
        } catch (ex) {
            setErr(ex?.response?.data?.detail || "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 sm:p-8"
            data-testid="login-page"
        >
            {/* Background image layer */}
            <div
                className="absolute inset-0 opacity-25"
                style={{
                    backgroundImage:
                        "url(https://images.pexels.com/photos/4716292/pexels-photo-4716292.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(2px) saturate(1.2)",
                }}
            />
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(135deg, rgba(11,17,32,0.95) 0%, rgba(11,17,32,0.75) 50%, rgba(18,28,51,0.9) 100%)",
                }}
            />
            <div className="tp-grid-bg absolute inset-0 opacity-30" />

            <div className="relative w-full max-w-[920px] grid md:grid-cols-5 gap-0 tp-fade-up">
                {/* Left: brand pane */}
                <div className="md:col-span-3 p-8 md:p-12 flex flex-col justify-between tp-panel rounded-r-none md:rounded-r-none md:rounded-l-md hidden md:flex">
                    <div>
                        <Logo size={24} />
                        <div className="mt-10">
                            <div className="eyebrow mb-3">
                                Nivel 1 · Telecom
                            </div>
                            <h1 className="font-display text-[34px] leading-[1.05] font-extrabold text-white mb-4">
                                Copiloto IA
                                <br />
                                para el soporte
                                <br />
                                <span style={{ color: "#00E5FF" }}>
                                    de primera línea.
                                </span>
                            </h1>
                            <p className="text-[13px] text-slate-400 max-w-[380px] leading-relaxed">
                                Diagnóstico guiado, sugerencias con IA y
                                escalados automáticos a Nivel 2. Diseñado para
                                reducir TMO y aumentar FCR sin comprometer
                                datos sensibles.
                            </p>
                        </div>
                    </div>
                    <div className="mt-10 grid grid-cols-3 gap-4">
                        <Stat value="-28%" label="TMO medio" />
                        <Stat value="+41%" label="FCR" />
                        <Stat value="100%" label="Anonimizado" />
                    </div>
                </div>

                {/* Right: form */}
                <div className="md:col-span-2 p-8 md:p-10 tp-panel md:rounded-l-none">
                    <div className="md:hidden mb-6">
                        <Logo size={20} />
                    </div>
                    <div className="eyebrow mb-2">Acceso operador</div>
                    <h2 className="font-display text-2xl font-bold text-white mb-6">
                        Iniciar sesión
                    </h2>
                    <form onSubmit={submit} className="space-y-4" data-testid="login-form">
                        <div>
                            <label className="eyebrow block mb-2">Email</label>
                            <input
                                className="tp-input"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="operador@telco.es"
                                data-testid="login-email-input"
                            />
                        </div>
                        <div>
                            <label className="eyebrow block mb-2">
                                Contraseña
                            </label>
                            <input
                                className="tp-input"
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                data-testid="login-password-input"
                            />
                        </div>
                        {err && (
                            <div
                                className="flex items-center gap-2 text-[12px] text-red-400 font-mono"
                                data-testid="login-error"
                            >
                                <AlertCircle size={14} />
                                {err}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="tp-btn-primary w-full flex items-center justify-center gap-2"
                            data-testid="login-submit-btn"
                        >
                            <LogIn size={14} />
                            {loading ? "Conectando…" : "Entrar"}
                        </button>
                    </form>
                    <div className="mt-6 text-[12px] text-slate-400">
                        ¿No tienes cuenta?{" "}
                        <Link
                            to="/register"
                            className="text-[#00E5FF] hover:underline"
                            data-testid="login-goto-register"
                        >
                            Crear cuenta de operador
                        </Link>
                    </div>
                    <div className="mt-8 flex items-center justify-between">
                        <span className="gdpr-badge">
                            <ShieldCheck size={11} />
                            RGPD · Sin datos sensibles
                        </span>
                        <span className="eyebrow">v1.0</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Stat({ value, label }) {
    return (
        <div>
            <div
                className="font-display text-[22px] font-extrabold"
                style={{ color: "#00E5FF" }}
            >
                {value}
            </div>
            <div className="eyebrow" style={{ fontSize: 10 }}>
                {label}
            </div>
        </div>
    );
}
