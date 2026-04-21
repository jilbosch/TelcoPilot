"""
Anonymization module for TelcoPilot.
Redacts sensitive data (DNI/NIE, phone numbers, emails, IBAN, IPs, names)
BEFORE any text is sent to the LLM. This is the GDPR safety layer.
"""
import re
from typing import Tuple, List, Dict

# Spanish DNI: 8 digits + letter
DNI_RE = re.compile(r"\b\d{8}[A-HJ-NP-TV-Z]\b", re.IGNORECASE)
# Spanish NIE: X/Y/Z + 7 digits + letter
NIE_RE = re.compile(r"\b[XYZ]\d{7}[A-HJ-NP-TV-Z]\b", re.IGNORECASE)
# Spanish phone: 9 digits starting 6,7,8,9, with optional country code +34
PHONE_RE = re.compile(r"\b(?:\+?34[\s\-]?)?[6789]\d{2}[\s\-]?\d{3}[\s\-]?\d{3}\b")
# Email
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
# IBAN (Spanish): ES + 22 digits
IBAN_RE = re.compile(r"\bES\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}\b", re.IGNORECASE)
# IPv4
IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
# MAC address
MAC_RE = re.compile(r"\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b")
# Postal code (Spain): 5 digits (we keep loose — only redact when context suggests)
POSTAL_RE = re.compile(r"\b(?:CP|c\.p\.|código postal|codigo postal)\s*:?\s*(\d{5})\b", re.IGNORECASE)

# Name patterns: "me llamo X", "soy X Y", "mi nombre es X", "cliente: X Y"
NAME_PATTERNS = [
    re.compile(r"(me llamo|mi nombre es|soy el cliente|soy la cliente|soy|cliente\s*[:\-]|client\s*[:\-]|em dic|el meu nom és)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})", re.IGNORECASE),
]

# Address patterns: "calle X", "carrer X", "avenida X", "av. X"
ADDRESS_RE = re.compile(r"\b(calle|c\/|carrer|avenida|av\.|avinguda|plaza|plaça|paseo|passeig)\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ\s]{2,40}?(?:\s+\d{1,4})?(?=[,.\n]|\s+(?:piso|puerta|nº|número)|$)", re.IGNORECASE)


def anonymize_text(text: str) -> Tuple[str, List[Dict[str, str]]]:
    """
    Returns (redacted_text, list_of_redactions).
    Each redaction: {"type": "DNI|PHONE|EMAIL|...", "placeholder": "[REDACTED_DNI]"}
    The original value is NEVER returned to the caller — only the type.
    """
    redactions: List[Dict[str, str]] = []
    redacted = text

    def _replace(pattern: re.Pattern, tag: str, s: str, group: int = 0) -> str:
        def sub(m: re.Match) -> str:
            redactions.append({"type": tag, "placeholder": f"[REDACTED_{tag}]"})
            full = m.group(0)
            if group == 0:
                return f"[REDACTED_{tag}]"
            # Replace only the captured group inside the full match
            captured = m.group(group)
            return full.replace(captured, f"[REDACTED_{tag}]")
        return pattern.sub(sub, s)

    # Order matters: DNI/NIE before generic digit patterns, emails before phones, etc.
    redacted = _replace(EMAIL_RE, "EMAIL", redacted)
    redacted = _replace(IBAN_RE, "IBAN", redacted)
    redacted = _replace(DNI_RE, "DNI", redacted)
    redacted = _replace(NIE_RE, "NIE", redacted)
    redacted = _replace(PHONE_RE, "PHONE", redacted)
    redacted = _replace(MAC_RE, "MAC", redacted)
    redacted = _replace(IP_RE, "IP", redacted)

    # Names (group 2)
    for pat in NAME_PATTERNS:
        def sub_name(m: re.Match) -> str:
            redactions.append({"type": "NAME", "placeholder": "[REDACTED_NAME]"})
            prefix = m.group(1)
            return f"{prefix} [REDACTED_NAME]"
        redacted = pat.sub(sub_name, redacted)

    # Addresses
    def sub_addr(m: re.Match) -> str:
        redactions.append({"type": "ADDRESS", "placeholder": "[REDACTED_ADDRESS]"})
        return "[REDACTED_ADDRESS]"
    redacted = ADDRESS_RE.sub(sub_addr, redacted)

    # Postal codes with context
    def sub_pc(m: re.Match) -> str:
        redactions.append({"type": "POSTAL", "placeholder": "[REDACTED_POSTAL]"})
        return m.group(0).replace(m.group(1), "[REDACTED_POSTAL]")
    redacted = POSTAL_RE.sub(sub_pc, redacted)

    return redacted, redactions
