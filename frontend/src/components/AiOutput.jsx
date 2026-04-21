/**
 * Renders AI markdown-ish text (bold **) as styled HTML.
 */
export default function AiOutput({ text }) {
    if (!text) return null;
    // Escape HTML, then convert **bold**
    const esc = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const html = esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return (
        <div
            className="ai-text"
            dangerouslySetInnerHTML={{ __html: html }}
            data-testid="ai-output"
        />
    );
}
