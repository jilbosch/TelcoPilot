import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
} from "recharts";
import {
    Users,
    Activity,
    CheckCircle2,
    AlertTriangle,
    TrendingUp,
    Clock,
    ArrowLeft,
    Loader2,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import Logo from "../components/Logo";

export default function Dashboard() {
    const { user, logout } = useAuth();
    const nav = useNavigate();
    const [data, setData] = useState(null);
    const [err, setErr] = useState("");
    const [seeding, setSeeding] = useState(false);
    const [seedMsg, setSeedMsg] = useState("");

    const reload = () => {
        api.get("/admin/overview")
            .then((r) => setData(r.data))
            .catch((e) =>
                setErr(e?.response?.data?.detail || "Error al cargar")
            );
    };

    useEffect(() => {
        reload();
    }, []);

    const seedDemo = async () => {
        setSeeding(true);
        setSeedMsg("");
        try {
            const r = await api.post("/admin/seed-demo");
            if (r.data.already_seeded) {
                setSeedMsg("Los datos demo ya estaban cargados.");
            } else {
                setSeedMsg(
                    `✓ ${r.data.created_operators} operadores y ${r.data.created_sessions} sesiones creadas.`
                );
            }
            reload();
        } catch (e) {
            setSeedMsg(
                "Error: " + (e?.response?.data?.detail || e.message)
            );
        } finally {
            setSeeding(false);
            setTimeout(() => setSeedMsg(""), 6000);
        }
    };

    const resetDemo = async () => {
        if (!window.confirm("¿Eliminar todas las sesiones demo?")) return;
        setSeeding(true);
        try {
            const r = await api.post("/admin/reset-demo");
            setSeedMsg(`✓ ${r.data.deleted_sessions} sesiones demo eliminadas.`);
            reload();
        } catch (e) {
            setSeedMsg(
                "Error: " + (e?.response?.data?.detail || e.message)
            );
        } finally {
            setSeeding(false);
            setTimeout(() => setSeedMsg(""), 6000);
        }
    };

    if (err) {
        return (
            <div
                className="min-h-screen flex items-center justify-center text-slate-300"
                data-testid="dashboard-error"
            >
                <div className="tp-panel p-6 text-center">
                    <AlertTriangle className="mx-auto text-yellow-400 mb-2" />
                    <div>{err}</div>
                    <button
                        onClick={() => nav("/")}
                        className="tp-btn-secondary mt-4"
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }
    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-[#00E5FF]" />
            </div>
        );
    }

    const k = data.kpis;
    const avgMin = Math.floor(k.avg_resolution_seconds / 60);
    const avgSec = k.avg_resolution_seconds % 60;

    return (
        <div className="min-h-screen flex flex-col" data-testid="dashboard-page">
            <header className="border-b border-[#212E4E] bg-[#0B1120]/80 backdrop-blur sticky top-0 z-30">
                <div className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-5">
                        <Logo size={18} />
                        <span className="gdpr-badge" style={{ background: "rgba(0,85,255,0.15)", color: "#00E5FF", borderColor: "rgba(0,85,255,0.4)" }}>
                            Dashboard Supervisor
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={seedDemo}
                            disabled={seeding}
                            className="tp-btn-secondary flex items-center gap-2"
                            data-testid="seed-demo-btn"
                            title="Cargar sesiones y operadores de demostración"
                        >
                            {seeding ? (
                                <Loader2 size={13} className="animate-spin" />
                            ) : (
                                <Database size={13} />
                            )}
                            <span className="hidden sm:inline">Cargar demo</span>
                        </button>
                        <button
                            onClick={resetDemo}
                            disabled={seeding}
                            className="tp-btn-ghost flex items-center gap-1"
                            data-testid="reset-demo-btn"
                            title="Eliminar sesiones demo"
                        >
                            <Trash2 size={12} />
                        </button>
                        <div className="text-right hidden md:block">
                            <div className="text-[12px] text-white font-medium">
                                {user?.name}
                            </div>
                            <div className="eyebrow" style={{ fontSize: 9 }}>
                                {user?.role?.toUpperCase()}
                            </div>
                        </div>
                        <button
                            onClick={() => nav("/")}
                            className="tp-btn-secondary flex items-center gap-2"
                            data-testid="dashboard-back-btn"
                        >
                            <ArrowLeft size={13} />
                            Workspace
                        </button>
                        <button
                            onClick={logout}
                            className="tp-btn-ghost"
                            data-testid="dashboard-logout-btn"
                        >
                            Salir
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-4 space-y-4">
                {seedMsg && (
                    <div
                        className="tp-panel p-3 text-[12px] font-mono"
                        style={{
                            borderColor: seedMsg.startsWith("Error")
                                ? "#EF4444"
                                : "#10B981",
                            color: seedMsg.startsWith("Error")
                                ? "#F87171"
                                : "#34D399",
                        }}
                        data-testid="seed-msg"
                    >
                        {seedMsg}
                    </div>
                )}
                {/* KPIs */}
                <section
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
                    data-testid="dashboard-kpis"
                >
                    <Kpi
                        label="Sesiones totales"
                        value={k.total_sessions}
                        icon={<Activity size={14} />}
                    />
                    <Kpi
                        label="Hoy"
                        value={k.today}
                        icon={<Clock size={14} />}
                        accent
                    />
                    <Kpi
                        label="Últimos 7 días"
                        value={k.week}
                        icon={<TrendingUp size={14} />}
                    />
                    <Kpi
                        label="Escaladas"
                        value={k.escalated}
                        icon={<AlertTriangle size={14} />}
                    />
                    <Kpi
                        label="Tasa escalado"
                        value={`${Math.round(k.escalation_rate * 100)}%`}
                        icon={<CheckCircle2 size={14} />}
                    />
                    <Kpi
                        label="TMO medio"
                        value={`${avgMin}m ${avgSec}s`}
                        icon={<Clock size={14} />}
                        accent
                    />
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="tp-panel p-4" data-testid="chart-daily">
                        <div className="eyebrow mb-1">Actividad</div>
                        <h3 className="font-display text-sm font-bold text-white mb-3">
                            Sesiones últimos 7 días
                        </h3>
                        <div className="h-[240px]" style={{ minHeight: 240, minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.daily}>
                                    <CartesianGrid
                                        stroke="#212E4E"
                                        strokeDasharray="3 3"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748B"
                                        style={{ fontSize: 11 }}
                                    />
                                    <YAxis
                                        stroke="#64748B"
                                        style={{ fontSize: 11 }}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: "#0B1120",
                                            border: "1px solid #212E4E",
                                            borderRadius: 4,
                                            fontSize: 12,
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="sessions"
                                        stroke="#00E5FF"
                                        strokeWidth={2}
                                        dot={{ fill: "#0055FF", r: 3 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="tp-panel p-4" data-testid="chart-incidents">
                        <div className="eyebrow mb-1">Ranking</div>
                        <h3 className="font-display text-sm font-bold text-white mb-3">
                            Incidencias más comunes
                        </h3>
                        <div className="h-[240px]" style={{ minHeight: 240, minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={data.incidents_breakdown}
                                    layout="vertical"
                                    margin={{ left: 80 }}
                                >
                                    <CartesianGrid
                                        stroke="#212E4E"
                                        strokeDasharray="3 3"
                                        horizontal={false}
                                    />
                                    <XAxis
                                        type="number"
                                        stroke="#64748B"
                                        style={{ fontSize: 11 }}
                                        allowDecimals={false}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="title"
                                        stroke="#94A3B8"
                                        style={{ fontSize: 11 }}
                                        width={120}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: "#0B1120",
                                            border: "1px solid #212E4E",
                                            borderRadius: 4,
                                            fontSize: 12,
                                        }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill="#0055FF"
                                        radius={[0, 3, 3, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </section>

                <section className="tp-panel p-4" data-testid="operators-table">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <div className="eyebrow mb-1 flex items-center gap-2">
                                <Users size={11} />
                                Equipo
                            </div>
                            <h3 className="font-display text-sm font-bold text-white">
                                Rendimiento por operador
                            </h3>
                        </div>
                        <div className="eyebrow">
                            {data.per_operator.length} operadores activos
                        </div>
                    </div>
                    <div className="overflow-auto tp-scroll">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="border-b border-[#212E4E]">
                                    <Th>Operador</Th>
                                    <Th>Email</Th>
                                    <Th align="right">Sesiones</Th>
                                    <Th align="right">Escaladas</Th>
                                    <Th align="right">Tasa escalado</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.per_operator.map((op) => (
                                    <tr
                                        key={op.operator_id}
                                        className="border-b border-[#212E4E] hover:bg-[#1A2542]/50"
                                        data-testid={`operator-row-${op.operator_id}`}
                                    >
                                        <Td>
                                            <span className="text-white font-medium">
                                                {op.name}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="font-mono text-slate-400">
                                                {op.email}
                                            </span>
                                        </Td>
                                        <Td align="right">{op.sessions}</Td>
                                        <Td align="right">
                                            <span className="text-amber-400">
                                                {op.escalated}
                                            </span>
                                        </Td>
                                        <Td align="right">
                                            <EscalationBadge
                                                rate={op.escalation_rate}
                                            />
                                        </Td>
                                    </tr>
                                ))}
                                {data.per_operator.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="text-center py-8 text-slate-500 italic"
                                        >
                                            Sin datos todavía
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}

function Kpi({ label, value, icon, accent }) {
    return (
        <div
            className="tp-panel p-4"
            style={accent ? { borderColor: "rgba(0,229,255,0.4)" } : undefined}
        >
            <div className="flex items-center gap-2 text-slate-500 mb-1">
                {icon}
                <span className="eyebrow" style={{ fontSize: 10 }}>
                    {label}
                </span>
            </div>
            <div
                className="font-display text-2xl font-extrabold"
                style={{ color: accent ? "#00E5FF" : "#F8FAFC" }}
            >
                {value}
            </div>
        </div>
    );
}

function Th({ children, align }) {
    return (
        <th
            className="py-2 px-2 eyebrow text-slate-400"
            style={{ textAlign: align || "left", fontSize: 10 }}
        >
            {children}
        </th>
    );
}

function Td({ children, align }) {
    return (
        <td
            className="py-2 px-2"
            style={{ textAlign: align || "left" }}
        >
            {children}
        </td>
    );
}

function EscalationBadge({ rate }) {
    const pct = Math.round(rate * 100);
    const color =
        rate <= 0.3 ? "#10B981" : rate <= 0.6 ? "#F59E0B" : "#EF4444";
    return (
        <span
            className="font-mono font-semibold"
            style={{ color }}
        >
            {pct}%
        </span>
    );
}
