import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import Logo from "../components/Logo";
import RedactedText from "../components/RedactedText";
import AiOutput from "../components/AiOutput";
import {
    SmartphoneNfc,
    Network,
    Globe2,
    Cable,
    Router,
    ArrowRightLeft,
    Activity,
    Gauge,
    Check,
    X,
    Circle,
    LogOut,
    Sparkles,
    ShieldCheck,
    FileText,
    Copy,
    History as HistoryIcon,
    Loader2,
    Clock,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";

const ICONS = {
    SmartphoneNfc,
    Network,
    Globe2,
    Cable,
    Router,
    ArrowRightLeft,
    Activity,
    Gauge,
};

// Debounce hook
function useDebounced(value, delay = 350) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

export default function Workspace() {
    const { user, logout } = useAuth();
    const [catalog, setCatalog] = useState([]);
    const [selected, setSelected] = useState(null); // incident_type id
    const [session, setSession] = useState(null);
    const [freeText, setFreeText] = useState("");
    const [preview, setPreview] = useState({ redacted: "", redactions: [] });
    const [previewLoading, setPreviewLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summary, setSummary] = useState("");
    const [stats, setStats] = useState({ total: 0, today: 0, escalated: 0 });
    const [history, setHistory] = useState([]);
    const [copied, setCopied] = useState(false);
    const debouncedText = useDebounced(freeText, 400);

    // Load catalog + stats + history
    useEffect(() => {
        api.get("/incidents/catalog").then((r) => setCatalog(r.data.incidents));
        refreshStats();
        refreshHistory();
    }, []);

    const refreshStats = () => {
        api.get("/stats/me")
            .then((r) => setStats(r.data))
            .catch(() => {});
    };

    const refreshHistory = () => {
        api.get("/sessions")
            .then((r) => setHistory(r.data))
            .catch(() => {});
    };

    // Live anonymization preview
    useEffect(() => {
        if (!debouncedText.trim()) {
            setPreview({ redacted: "", redactions: [] });
            return;
        }
        setPreviewLoading(true);
        api.post("/anonymize/preview", { text: debouncedText })
            .then((r) => setPreview(r.data))
            .catch(() => {})
            .finally(() => setPreviewLoading(false));
    }, [debouncedText]);

    const startIncident = async (incId) => {
        setSelected(incId);
        setSummary("");
        setFreeText("");
        setPreview({ redacted: "", redactions: [] });
        const r = await api.post("/sessions/start", { incident_type: incId });
        setSession(r.data);
        refreshStats();
        refreshHistory();
    };

    const analyze = async () => {
        if (!session || !freeText.trim()) return;
        setAiLoading(true);
        try {
            const r = await api.post(`/sessions/${session.id}/analyze`, {
                free_text: freeText,
            });
            setSession((s) => ({
                ...s,
                ai_suggestion: r.data.ai_suggestion,
                anonymized_text: r.data.redacted,
            }));
        } catch (e) {
            alert("Error IA: " + (e?.response?.data?.detail || e.message));
        } finally {
            setAiLoading(false);
        }
    };

    const toggleStep = async (stepId, status) => {
        if (!session) return;
        const r = await api.patch(`/sessions/${session.id}/checklist`, {
            step_id: stepId,
            status,
        });
        setSession(r.data);
    };

    const genSummary = async () => {
        if (!session) return;
        setSummaryLoading(true);
        try {
            const r = await api.post(`/sessions/${session.id}/summary`);
            setSummary(r.data.summary);
            refreshStats();
            refreshHistory();
        } catch (e) {
            alert("Error IA: " + (e?.response?.data?.detail || e.message));
        } finally {
            setSummaryLoading(false);
        }
    };

    const copySummary = async () => {
        if (!summary) return;
        await navigator.clipboard.writeText(summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const loadHistoryItem = async (sid) => {
        const r = await api.get(`/sessions/${sid}`);
        setSession(r.data);
        setSelected(r.data.incident_type);
        setFreeText("");
        setPreview({ redacted: "", redactions: [] });
        setSummary(r.data.summary || "");
    };

    const incidentTitle = useMemo(() => {
        return catalog.find((i) => i.id === selected)?.title || "";
    }, [selected, catalog]);

    return (
        <div
            className="min-h-screen flex flex-col"
            data-testid="workspace-page"
        >
            {/* Top bar */}
            <header className="border-b border-[#212E4E] bg-[#0B1120]/80 backdrop-blur sticky top-0 z-30">
                <div className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-8">
                        <Logo size={18} />
                        <div className="hidden md:flex items-center gap-5">
                            <HeaderStat
                                icon={<Clock size={13} />}
                                label="Sesiones hoy"
                                value={stats.today}
                                testid="stat-today"
                            />
                            <HeaderStat
                                icon={<CheckCircle2 size={13} />}
                                label="Totales"
                                value={stats.total}
                                testid="stat-total"
                            />
                            <HeaderStat
                                icon={<AlertTriangle size={13} />}
                                label="Escaladas"
                                value={stats.escalated}
                                testid="stat-escalated"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="gdpr-badge hidden sm:inline-flex">
                            <ShieldCheck size={11} />
                            RGPD Activo
                        </span>
                        <div
                            className="text-right hidden md:block"
                            data-testid="operator-name"
                        >
                            <div className="text-[12px] text-white font-medium">
                                {user?.name}
                            </div>
                            <div className="eyebrow" style={{ fontSize: 9 }}>
                                {user?.email}
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="tp-btn-ghost flex items-center gap-1"
                            data-testid="logout-btn"
                            title="Cerrar sesión"
                        >
                            <LogOut size={13} />
                            <span className="hidden sm:inline">Salir</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-12 gap-3 p-3 sm:p-4">
                {/* Sidebar: history */}
                <aside className="col-span-12 lg:col-span-3 xl:col-span-2 tp-panel p-4 tp-scroll overflow-auto max-h-[calc(100vh-96px)]">
                    <div className="flex items-center gap-2 mb-3">
                        <HistoryIcon size={14} className="text-[#00E5FF]" />
                        <span className="eyebrow">Historial</span>
                    </div>
                    {history.length === 0 && (
                        <div className="text-[12px] text-slate-500 italic">
                            Sin sesiones aún
                        </div>
                    )}
                    <div
                        className="space-y-2"
                        data-testid="history-list"
                    >
                        {history.map((h) => (
                            <button
                                key={h.id}
                                onClick={() => loadHistoryItem(h.id)}
                                className={`w-full text-left p-2 rounded-sm border transition-all ${
                                    session?.id === h.id
                                        ? "border-[#0055FF] bg-[#0055FF]/10"
                                        : "border-[#212E4E] bg-[#1A2542] hover:border-[#0055FF]/50"
                                }`}
                                data-testid={`history-item-${h.id}`}
                            >
                                <div className="text-[12px] font-medium text-white truncate">
                                    {h.incident_title}
                                </div>
                                <div
                                    className="eyebrow mt-1"
                                    style={{ fontSize: 9 }}
                                >
                                    {new Date(h.created_at).toLocaleString(
                                        "es-ES",
                                        {
                                            day: "2-digit",
                                            month: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        }
                                    )}
                                </div>
                                {h.summary && (
                                    <div
                                        className="text-[10px] mt-1 font-mono"
                                        style={{ color: "#10B981" }}
                                    >
                                        ● Escalado
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Main workspace */}
                <main className="col-span-12 lg:col-span-9 xl:col-span-10 space-y-3">
                    {/* Incident grid */}
                    <section className="tp-panel p-4" data-testid="incident-grid-section">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="eyebrow mb-1">
                                    Paso 1 · Selecciona la incidencia
                                </div>
                                <h2 className="font-display text-base font-bold text-white">
                                    Categoría del problema
                                </h2>
                            </div>
                            {session && (
                                <div className="flex items-center gap-2">
                                    <span className="tp-pulse w-2 h-2 rounded-full bg-[#00E5FF]" />
                                    <span className="eyebrow">
                                        Sesión activa · {incidentTitle}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                            {catalog.map((inc) => {
                                const Icon = ICONS[inc.icon] || Circle;
                                const active = selected === inc.id;
                                return (
                                    <button
                                        key={inc.id}
                                        onClick={() => startIncident(inc.id)}
                                        className={`flex flex-col items-center justify-center p-3 border rounded-sm transition-all text-center min-h-[86px] ${
                                            active
                                                ? "bg-[#0055FF]/15 border-[#0055FF] text-[#00E5FF]"
                                                : "bg-[#1A2542] border-[#212E4E] hover:border-[#0055FF] text-slate-300"
                                        }`}
                                        data-testid={`incident-card-${inc.id}`}
                                    >
                                        <Icon
                                            size={22}
                                            className={
                                                active
                                                    ? "text-[#00E5FF]"
                                                    : "text-slate-400"
                                            }
                                        />
                                        <span className="text-[11px] font-semibold mt-2 leading-tight">
                                            {inc.title}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {!session && (
                        <div className="tp-panel p-8 text-center tp-grid-bg" data-testid="empty-state">
                            <Sparkles
                                className="mx-auto mb-3 text-[#00E5FF]"
                                size={28}
                            />
                            <div className="font-display text-lg font-bold text-white mb-1">
                                Inicia seleccionando una incidencia
                            </div>
                            <div className="text-[12px] text-slate-400">
                                TelcoPilot te guiará paso a paso y sugerirá
                                soluciones sin tocar datos sensibles.
                            </div>
                        </div>
                    )}

                    {session && (
                        <>
                            {/* Row: Free-text + Anonymization preview */}
                            <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div className="tp-panel p-4" data-testid="freetext-panel">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <div className="eyebrow mb-1">
                                                Paso 2 · Describe el problema
                                            </div>
                                            <h3 className="font-display text-sm font-bold text-white">
                                                Texto del operador
                                            </h3>
                                        </div>
                                        <button
                                            onClick={analyze}
                                            disabled={
                                                aiLoading || !freeText.trim()
                                            }
                                            className="tp-btn-primary flex items-center gap-2"
                                            data-testid="analyze-btn"
                                        >
                                            {aiLoading ? (
                                                <Loader2
                                                    size={13}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <Sparkles size={13} />
                                            )}
                                            {aiLoading
                                                ? "Analizando…"
                                                : "Analizar con IA"}
                                        </button>
                                    </div>
                                    <textarea
                                        value={freeText}
                                        onChange={(e) =>
                                            setFreeText(e.target.value)
                                        }
                                        className="tp-input h-36 resize-none font-mono"
                                        placeholder='Ej: "Me llamo Juan García, DNI 12345678A, mi teléfono 666123456. No tengo datos móviles desde ayer por la tarde."'
                                        data-testid="freetext-input"
                                    />
                                    <div
                                        className="text-[10px] mt-2 text-slate-500 font-mono"
                                        style={{ letterSpacing: "0.05em" }}
                                    >
                                        El texto se anonimiza automáticamente
                                        antes de enviarse a la IA.
                                    </div>
                                </div>

                                <div className="tp-panel p-4" style={{ borderColor: "rgba(139,92,246,0.3)" }} data-testid="anonymize-panel">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <div className="eyebrow mb-1 flex items-center gap-2">
                                                <ShieldCheck
                                                    size={11}
                                                    className="text-violet-400"
                                                />
                                                Vista anonimizada · RGPD
                                            </div>
                                            <h3 className="font-display text-sm font-bold text-white">
                                                Lo que ve la IA
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {previewLoading && (
                                                <Loader2
                                                    size={12}
                                                    className="animate-spin text-violet-400"
                                                />
                                            )}
                                            <span className="gdpr-badge">
                                                {preview.redactions.length}{" "}
                                                redacciones
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-[#0B1120] border border-[#212E4E] rounded-sm p-3 min-h-[144px] tp-scroll overflow-auto max-h-[144px]">
                                        <RedactedText
                                            text={preview.redacted}
                                            empty="La vista anonimizada aparecerá aquí mientras escribes."
                                        />
                                    </div>
                                    {preview.redactions.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {[
                                                ...new Set(
                                                    preview.redactions.map(
                                                        (r) => r.type
                                                    )
                                                ),
                                            ].map((t) => (
                                                <span
                                                    key={t}
                                                    className="redacted-chip"
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Row: AI suggestion + Checklist */}
                            <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div className="tp-panel p-4" data-testid="ai-suggestion-panel">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <div className="eyebrow mb-1 flex items-center gap-2">
                                                <Sparkles
                                                    size={11}
                                                    className="text-[#00E5FF]"
                                                />
                                                Copiloto IA
                                            </div>
                                            <h3 className="font-display text-sm font-bold text-white">
                                                Diagnóstico sugerido
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="bg-[#0B1120] border border-[#212E4E] rounded-sm p-3 min-h-[220px] tp-scroll overflow-auto max-h-[360px]">
                                        {aiLoading && (
                                            <div className="flex items-center gap-2 text-[12px] text-[#00E5FF] font-mono">
                                                <Loader2
                                                    size={13}
                                                    className="animate-spin"
                                                />
                                                Consultando IA…
                                            </div>
                                        )}
                                        {!aiLoading &&
                                            !session.ai_suggestion && (
                                                <div className="text-[12px] text-slate-500 italic">
                                                    Escribe el problema del
                                                    cliente y pulsa "Analizar
                                                    con IA" para obtener un
                                                    diagnóstico.
                                                </div>
                                            )}
                                        {session.ai_suggestion && (
                                            <AiOutput
                                                text={session.ai_suggestion}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="tp-panel p-4" data-testid="checklist-panel">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <div className="eyebrow mb-1">
                                                Paso 3 · Diagnóstico guiado
                                            </div>
                                            <h3 className="font-display text-sm font-bold text-white">
                                                Checklist · {incidentTitle}
                                            </h3>
                                        </div>
                                        <ChecklistProgress
                                            checklist={session.checklist}
                                        />
                                    </div>
                                    <div className="divide-y divide-[#212E4E]">
                                        {session.checklist.map((step, idx) => (
                                            <ChecklistRow
                                                key={step.id}
                                                idx={idx + 1}
                                                step={step}
                                                onToggle={(s) =>
                                                    toggleStep(step.id, s)
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Row: Summary / escalation ticket */}
                            <section className="tp-panel p-4" data-testid="summary-panel">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="eyebrow mb-1 flex items-center gap-2">
                                            <FileText
                                                size={11}
                                                className="text-[#00E5FF]"
                                            />
                                            Paso 4 · Resumen y escalado
                                        </div>
                                        <h3 className="font-display text-sm font-bold text-white">
                                            Ticket de escalado a Nivel 2
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {summary && (
                                            <button
                                                onClick={copySummary}
                                                className="tp-btn-secondary flex items-center gap-2"
                                                data-testid="copy-summary-btn"
                                            >
                                                <Copy size={13} />
                                                {copied
                                                    ? "Copiado ✓"
                                                    : "Copiar"}
                                            </button>
                                        )}
                                        <button
                                            onClick={genSummary}
                                            disabled={summaryLoading}
                                            className="tp-btn-primary flex items-center gap-2"
                                            data-testid="generate-ticket-btn"
                                        >
                                            {summaryLoading ? (
                                                <Loader2
                                                    size={13}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <FileText size={13} />
                                            )}
                                            {summaryLoading
                                                ? "Generando…"
                                                : "Generar ticket"}
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-[#0B1120] border border-[#212E4E] rounded-sm p-3 min-h-[140px] tp-scroll overflow-auto max-h-[360px]">
                                    {!summary && !summaryLoading && (
                                        <div className="text-[12px] text-slate-500 italic">
                                            Cuando hayas completado el
                                            diagnóstico, genera un ticket
                                            estructurado listo para Nivel 2.
                                        </div>
                                    )}
                                    {summary && <AiOutput text={summary} />}
                                </div>
                            </section>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

function HeaderStat({ icon, label, value, testid }) {
    return (
        <div className="flex items-center gap-2" data-testid={testid}>
            <span className="text-slate-500">{icon}</span>
            <div>
                <div className="font-display text-sm font-bold text-white leading-none">
                    {value}
                </div>
                <div
                    className="eyebrow mt-1"
                    style={{ fontSize: 9, letterSpacing: "0.15em" }}
                >
                    {label}
                </div>
            </div>
        </div>
    );
}

function ChecklistProgress({ checklist }) {
    const ok = checklist.filter((c) => c.status === "ok").length;
    const fail = checklist.filter((c) => c.status === "fail").length;
    const total = checklist.length;
    return (
        <div className="text-right" data-testid="checklist-progress">
            <div className="font-mono text-[11px] text-slate-400">
                <span className="text-[#10B981]">{ok}</span>
                <span className="text-slate-600"> / </span>
                <span className="text-[#EF4444]">{fail}</span>
                <span className="text-slate-600"> / </span>
                <span>{total}</span>
            </div>
            <div
                className="eyebrow mt-1"
                style={{ fontSize: 9 }}
            >
                OK / FAIL / TOTAL
            </div>
        </div>
    );
}

function ChecklistRow({ idx, step, onToggle }) {
    const st = step.status || "pending";
    return (
        <div
            className="flex items-start justify-between gap-3 py-2"
            data-testid={`checklist-row-${step.id}`}
        >
            <div className="flex items-start gap-2 flex-1">
                <span
                    className="font-mono text-[11px] text-slate-500 mt-0.5"
                    style={{ minWidth: 22 }}
                >
                    {String(idx).padStart(2, "0")}
                </span>
                <span
                    className={`text-[12px] leading-snug ${
                        st === "ok"
                            ? "text-[#10B981]"
                            : st === "fail"
                              ? "text-[#EF4444] line-through opacity-70"
                              : "text-slate-300"
                    }`}
                >
                    {step.step}
                </span>
            </div>
            <div className="flex gap-1 shrink-0">
                <button
                    onClick={() => onToggle(st === "ok" ? "pending" : "ok")}
                    title="Marcar OK"
                    className={`p-1.5 rounded-sm border transition-all ${
                        st === "ok"
                            ? "bg-[#10B981] border-[#10B981] text-white"
                            : "bg-[#1A2542] border-[#212E4E] text-slate-500 hover:border-[#10B981] hover:text-[#10B981]"
                    }`}
                    data-testid={`step-ok-${step.id}`}
                >
                    <Check size={12} />
                </button>
                <button
                    onClick={() => onToggle(st === "fail" ? "pending" : "fail")}
                    title="Marcar FALLO"
                    className={`p-1.5 rounded-sm border transition-all ${
                        st === "fail"
                            ? "bg-[#EF4444] border-[#EF4444] text-white"
                            : "bg-[#1A2542] border-[#212E4E] text-slate-500 hover:border-[#EF4444] hover:text-[#EF4444]"
                    }`}
                    data-testid={`step-fail-${step.id}`}
                >
                    <X size={12} />
                </button>
            </div>
        </div>
    );
}
