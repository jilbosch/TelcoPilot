import { Radio } from "lucide-react";

export default function Logo({ size = 20 }) {
    return (
        <div className="flex items-center gap-2">
            <div
                className="flex items-center justify-center rounded-sm"
                style={{
                    width: size + 10,
                    height: size + 10,
                    background:
                        "linear-gradient(135deg, #0055FF 0%, #00E5FF 100%)",
                    boxShadow: "0 0 14px rgba(0, 229, 255, 0.35)",
                }}
            >
                <Radio size={size - 2} className="text-white" />
            </div>
            <div className="flex flex-col leading-none">
                <span className="font-display font-extrabold text-white text-[15px] tracking-tight">
                    Telco<span style={{ color: "#00E5FF" }}>Pilot</span>
                </span>
                <span className="eyebrow" style={{ fontSize: 9 }}>
                    Helpdesk Copilot
                </span>
            </div>
        </div>
    );
}
