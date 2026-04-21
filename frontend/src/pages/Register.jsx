import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import Logo from "../components/Logo";
import { ShieldCheck, UserPlus, AlertCircle } from "lucide-react";

export default function Register() {
    const { register } = useAuth();
    const nav = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            await register(email, password, name);
            nav("/");
        } catch (ex) {
            setErr(ex?.response?.data?.detail || "Error al registrarse");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative min-h-screen flex items-center justify-center p-4"
            data-testid="register-page"
        >
            <div className="tp-grid-bg absolute inset-0 opacity-20 pointer-events-none" />
            <div className="relative z-10 w-full max-w-[420px] tp-panel p-8 tp-fade-up">
                <Logo size={20} />
                <div className="eyebrow mt-6 mb-2">Nuevo operador</div>
                <h2 className="font-display text-2xl font-bold text-white mb-6">
                    Crear cuenta
                </h2>
                <form onSubmit={submit} className="space-y-4" data-testid="register-form">
                    <div>
                        <label className="eyebrow block mb-2">Nombre</label>
                        <input
                            className="tp-input"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="María García"
                            data-testid="register-name-input"
                        />
                    </div>
                    <div>
                        <label className="eyebrow block mb-2">Email</label>
                        <input
                            className="tp-input"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="operador@telco.es"
                            data-testid="register-email-input"
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
                            placeholder="mínimo 6 caracteres"
                            data-testid="register-password-input"
                        />
                    </div>
                    {err && (
                        <div className="flex items-center gap-2 text-[12px] text-red-400 font-mono" data-testid="register-error">
                            <AlertCircle size={14} />
                            {err}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="tp-btn-primary w-full flex items-center justify-center gap-2"
                        data-testid="register-submit-btn"
                    >
                        <UserPlus size={14} />
                        {loading ? "Creando…" : "Crear cuenta"}
                    </button>
                </form>
                <div className="mt-6 text-[12px] text-slate-400">
                    ¿Ya tienes cuenta?{" "}
                    <Link to="/login" className="text-[#00E5FF] hover:underline" data-testid="register-goto-login">
                        Iniciar sesión
                    </Link>
                </div>
                <div className="mt-6">
                    <span className="gdpr-badge">
                        <ShieldCheck size={11} />
                        RGPD
                    </span>
                </div>
            </div>
        </div>
    );
}
