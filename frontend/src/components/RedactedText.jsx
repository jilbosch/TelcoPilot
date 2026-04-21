import { ShieldCheck } from "lucide-react";

/**
 * Renders text with [REDACTED_XXX] markers replaced by styled chips.
 */
export default function RedactedText({ text, empty = "Aún sin texto" }) {
    if (!text) {
        return (
            <div className="text-[13px] text-slate-500 italic" data-testid="redacted-empty">
                {empty}
            </div>
        );
    }

    const parts = text.split(/(\[REDACTED_[A-Z]+\])/g);
    return (
        <div className="ai-text" data-testid="redacted-text">
            {parts.map((p, i) => {
                const m = p.match(/^\[REDACTED_([A-Z]+)\]$/);
                if (m) {
                    return (
                        <span key={i} className="redacted-chip">
                            <ShieldCheck size={10} className="mr-1" />
                            {m[1]}
                        </span>
                    );
                }
                return <span key={i}>{p}</span>;
            })}
        </div>
    );
}
