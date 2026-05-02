import { useEffect, useState } from "react";
import {
    X,
    ChevronDown,
    ChevronRight,
    ShieldCheck,
    Sparkles,
    FileText,
    Loader2,
    Check,
    AlertTriangle,
    Circle,
    SmartphoneNfc,
    Network,
    Globe2,
    Cable,
    Router,
    ArrowRightLeft,
    Activity,
    Gauge,
    Mail,
    Clock,
} from "lucide-react";
import { api } from "../lib/api";
import RedactedText from "./RedactedText";
import AiOutput from "./AiOutput";

const ICONS = {
    sin_datos: SmartphoneNfc,
    apn: Network,
    roaming: Globe2,
    fibra_caida: Cable,
    router: Router,
    portabilidad: ArrowRightLeft,
    microcortes: Activity,
    velocidad_lenta: Gauge,
};

export default function OperatorSessionsDrawer({ operatorId, onClose }) {
    const [data, setData] = useState(null);
    const [err, setErr] = useState("");
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        if (!operatorId) return;
        setData(null);
        setErr("");
        setExpanded(null);
        api.get(`/admin/operators/${operatorId}/sessions`)
            .then((r) => setData(r.data))
            .catch((e) =>
                setErr(e?.response?.data?.detail || "Error al cargar")
            );
    }, [operatorId]);

    if (!operatorId) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 tp-fade-up"
                onClick={onClose}
                data-testid="drawer-backdrop"
            />
            {/* Drawer */}
            <aside
                className="fixed top-0 right-0 h-full w-full sm:w-[640px] bg-[#0B1120] border-l border-[#212E4E] z-50 flex flex-col tp-fade-up"
                data-testid="operator-drawer"
            >
                <header className="flex items-center justify-between p-4 border-b border-[#212E4E]">
                    <div>
                        <div className="eyebrow mb-1" style={{ fontSize: 9 }}>
                            Tickets del operador
                        </div>
                        {data && (
                            <>
                                <h2 className="font-display text-lg font-bold text-white">
                                    {data.operator.name}
                                </h2>
                                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-0.5">
                                    <Mail size={10} />
                                    {data.operator.email}
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="tp-btn-ghost flex items-center gap-1"
                        data-testid="drawer-close-btn"
                    >
                        <X size={16} />
                    </button>
                </header>

                <div className="flex-1 overflow-auto tp-scroll p-4 space-y-2">
                    {err && (
                        <div className="text-[12px] text-red-400 font-mono flex items-center gap-2">
                            <AlertTriangle size={13} />
                            {err}
                        </div>
                    )}
                    {!data && !err && (
                        <div className="flex items-center gap-2 text-[12px] text-slate-500 font-mono">
                            <Loader2 size={13} className="animate-spin" />
                            Cargando sesiones…
                        </div>
                    )}
                    {data && data.sessions.length === 0 && (
                        <div className="text-[12px] text-slate-500 italic">
                            Este operador aún no tiene sesiones.
                        </div>
                    )}
                    {data &&
                        data.sessions.map((s) => (
                            <SessionRow
                                key={s.id}
                                session={s}
                                isOpen={expanded === s.id}
                                onToggle={() =>
                                    setExpanded(expanded === s.id ? null : s.id)
                                }
                            />
                        ))}
                </div>

                {data && (
                    <footer className="border-t border-[#212E4E] p-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>
                            {data.sessions.length} sesión
                            {data.sessions.length !== 1 ? "es" : ""}
                        </span>
                        <span className="text-violet-400 flex items-center gap-1">
                            <ShieldCheck size={11} />
                            Datos anonimizados · RGPD
                        </span>
                    </footer>
                )}
            </aside>
        </>
    );
}

function SessionRow({ session, isOpen, onToggle }) {
    const Icon = ICONS[session.incident_type] || Circle;
    const ok = session.checklist.filter((c) => c.status === "ok").length;
    const fail = session.checklist.filter((c) => c.status === "fail").length;
    const total = session.checklist.length;
    const resolved = !!session.summary;

    return (
        <div
            className="border border-[#212E4E] rounded-sm bg-[#121C33]"
            data-testid={`drawer-session-${session.id}`}
        >
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 p-3 hover:bg-[#1A2542] transition-colors text-left"
            >
                {isOpen ? (
                    <ChevronDown size={14} className="text-[#00E5FF]" />
                ) : (
                    <ChevronRight size={14} className="text-slate-500" />
                )}
                <Icon
                    size={18}
                    className={resolved ? "text-[#10B981]" : "text-slate-400"}
                />
                <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white truncate">
                        {session.incident_title}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(session.created_at).toLocaleString(
                                "es-ES",
                                {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                }
                            )}
                        </span>
                        <span>
                            <span className="text-[#10B981]">{ok}</span>/
                            <span className="text-[#EF4444]">{fail}</span>/
                            <span>{total}</span>
                        </span>
                    </div>
                </div>
                {resolved ? (
                    <span
                        className="gdpr-badge"
                        style={{
                            background: "rgba(16,185,129,0.15)",
                            color: "#10B981",
                            borderColor: "rgba(16,185,129,0.3)",
                        }}
                    >
                        Escalado
                    </span>
                ) : (
                    <span
                        className="gdpr-badge"
                        style={{
                            background: "rgba(245,158,11,0.12)",
                            color: "#F59E0B",
                            borderColor: "rgba(245,158,11,0.3)",
                        }}
                    >
                        En curso
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="border-t border-[#212E4E] p-3 space-y-3 bg-[#0B1120]">
                    {session.anonymized_text && (
                        <Section
                            icon={<ShieldCheck size={11} />}
                            title="Texto anonimizado"
                            color="#8B5CF6"
                        >
                            <RedactedText text={session.anonymized_text} />
                        </Section>
                    )}

                    {session.ai_suggestion && (
                        <Section
                            icon={<Sparkles size={11} />}
                            title="Sugerencia IA"
                            color="#00E5FF"
                        >
                            <AiOutput text={session.ai_suggestion} />
                        </Section>
                    )}

                    <Section
                        icon={<Check size={11} />}
                        title={`Checklist (${ok}/${total})`}
                        color="#F8FAFC"
                    >
                        <div className="divide-y divide-[#212E4E]">
                            {session.checklist.map((step, i) => (
                                <div
                                    key={step.id}
                                    className="py-1.5 flex items-start gap-2"
                                >
                                    <span className="font-mono text-[10px] text-slate-500 mt-0.5">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <StatusDot status={step.status} />
                                    <span
                                        className={`text-[12px] ${
                                            step.status === "ok"
                                                ? "text-[#10B981]"
                                                : step.status === "fail"
                                                  ? "text-[#EF4444] line-through opacity-60"
                                                  : "text-slate-400"
                                        }`}
                                    >
                                        {step.step}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {session.summary && (
                        <Section
                            icon={<FileText size={11} />}
                            title="Ticket de escalado a Nivel 2"
                            color="#00E5FF"
                        >
                            <AiOutput text={session.summary} />
                        </Section>
                    )}
                </div>
            )}
        </div>
    );
}

function Section({ icon, title, color, children }) {
    return (
        <div>
            <div
                className="eyebrow mb-2 flex items-center gap-2"
                style={{ color, fontSize: 10 }}
            >
                {icon}
                {title}
            </div>
            <div className="bg-[#121C33] border border-[#212E4E] rounded-sm p-2">
                {children}
            </div>
        </div>
    );
}

function StatusDot({ status }) {
    const color =
        status === "ok"
            ? "#10B981"
            : status === "fail"
              ? "#EF4444"
              : "#64748B";
    return (
        <span
            className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
            style={{ background: color }}
        />
    );
}
