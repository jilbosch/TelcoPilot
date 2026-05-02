"""Seed realistic demo data for presentations. No LLM calls."""
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import List

from auth import hash_password
from incidents import INCIDENTS

# Demo operators (seeded alongside the default ones).
DEMO_OPERATORS = [
    {"email": "joan.gil@telco.es", "name": "Joan Gil", "password": "demo1234"},
    {"email": "carmen.ruiz@telco.es", "name": "Carmen Ruiz", "password": "demo1234"},
    {"email": "david.fernandez@telco.es", "name": "David Fernández", "password": "demo1234"},
]

# Realistic anonymized texts (already redacted form — no PII to begin with).
SCENARIOS = {
    "sin_datos": [
        {
            "text": "Cliente sin datos móviles desde ayer por la tarde. Tiene cobertura (4 barras). Datos móviles activados.",
            "ai": "**DIAGNÓSTICO PROBABLE:** APN probablemente corrupto tras una actualización OTA.\n\n**PASOS RECOMENDADOS (orden de prioridad):**\n1. Reiniciar terminal completo\n2. Verificar que datos móviles están activos\n3. Restablecer ajustes APN al valor por defecto\n4. Probar en modo avión 30s y reactivar\n\n**SI NO SE RESUELVE:** Escalar a N2 con log de intentos.",
        },
        {
            "text": "Cliente perdió los datos tras cambiar de terminal. Nuevo móvil Android.",
            "ai": "**DIAGNÓSTICO PROBABLE:** APN no configurado en el nuevo terminal.\n\n**PASOS RECOMENDADOS:**\n1. Guiar a Ajustes > Red móvil > APN\n2. Configurar APN corporativo (nombre/usuario/contraseña)\n3. Seleccionar como predeterminado y reiniciar\n\n**SI NO SE RESUELVE:** Verificar desde sistema que la SIM está provisionada correctamente.",
        },
    ],
    "apn": [
        {
            "text": "Cliente reporta que no puede enviar MMS aunque tiene internet. Android 13.",
            "ai": "**DIAGNÓSTICO PROBABLE:** APN de MMS configurado, pero APN secundario de MMS mal apuntado.\n\n**PASOS RECOMENDADOS:**\n1. Verificar APN principal (internet)\n2. Crear APN específico de MMS con servidor corporativo\n3. Activar como MMS en ajustes avanzados",
        },
    ],
    "roaming": [
        {
            "text": "Cliente viaja mañana a Francia y quiere asegurar que roaming funciona.",
            "ai": "**DIAGNÓSTICO PROBABLE:** Gestión proactiva, no incidencia.\n\n**PASOS RECOMENDADOS:**\n1. Verificar roaming activado en sistema\n2. Confirmar bono de roaming UE disponible\n3. Recomendar activar selección automática de red\n4. Avisar de coste al salir de zona UE",
        },
        {
            "text": "Cliente en Marruecos sin conexión desde hace 2 horas. Móvil Samsung.",
            "ai": "**DIAGNÓSTICO PROBABLE:** Marruecos es zona extra UE, probable bloqueo de datos por configuración.\n\n**PASOS RECOMENDADOS:**\n1. Verificar si la línea tiene activada zona fuera UE\n2. Seleccionar red manualmente (operadora local compatible)\n3. Reiniciar terminal\n4. Si persiste, escalar para activar manualmente desde core",
        },
    ],
    "fibra_caida": [
        {
            "text": "Fibra caída desde esta mañana. Router con luz roja parpadeando. Zona Girona.",
            "ai": "**DIAGNÓSTICO PROBABLE:** Pérdida de señal óptica. Posible incidencia zonal o fallo en acometida.\n\n**PASOS RECOMENDADOS:**\n1. Consultar mapa de incidencias masivas zona Girona\n2. Verificar LEDs ONT (PON en rojo confirma pérdida óptica)\n3. Reiniciar ONT+router 5 min\n4. Si persiste, escalar a N2 para ping de línea",
            "summary": "## TICKET DE ESCALADO A NIVEL 2\n**Categoría:** Conectividad Fibra - Sin Servicio\n**Síntoma reportado:** Fibra caída. LED rojo parpadeante en router. Zona Girona.\n**Acciones Nivel 1 realizadas:**\n- Consulta incidencias masivas: Sin incidencias detectadas en zona\n- Reinicio ONT+Router 5 min: Sin resultado\n**Resultado:** Pérdida óptica persiste.\n**Hipótesis técnica:** Pérdida de señal en enlace PON, posible fallo en acometida o roseta.\n**Acción recomendada para N2:** Ping de línea + visita técnica para revisión de acometida.\n**Prioridad sugerida:** ALTA",
        },
    ],
    "router": [
        {
            "text": "Cliente no recuerda contraseña WiFi del router. Modelo Livebox.",
            "ai": "**DIAGNÓSTICO PROBABLE:** Recuperación estándar.\n\n**PASOS RECOMENDADOS:**\n1. Indicar que la contraseña WiFi por defecto está en la pegatina trasera del router\n2. Si la ha cambiado, acceder a panel 192.168.1.1\n3. Credenciales admin en la misma pegatina\n4. Si la ha perdido, reset de fábrica 10s",
        },
    ],
    "portabilidad": [
        {
            "text": "Cliente con portabilidad prevista para hoy pero sigue con su operadora anterior.",
            "ai": "**DIAGNÓSTICO PROBABLE:** Portabilidad en curso o retrasada.\n\n**PASOS RECOMENDADOS:**\n1. Consultar estado portabilidad en sistema\n2. Verificar si hay rechazo (deuda pendiente)\n3. Confirmar ventana horaria (portabilidades se completan durante el día)\n4. Indicar al cliente mantener terminal encendido",
            "summary": "## TICKET DE ESCALADO A NIVEL 2\n**Categoría:** Portabilidad - Retraso\n**Síntoma reportado:** Portabilidad programada hoy, cliente sigue con operadora origen.\n**Acciones Nivel 1 realizadas:**\n- Consulta sistema portabilidad: En curso, ventana hasta 18h\n- Verificación rechazos: Sin rechazos\n**Resultado:** Portabilidad normal, dentro de ventana.\n**Hipótesis técnica:** Retraso normal en el proceso de portabilidad; se completará durante la tarde.\n**Acción recomendada para N2:** Monitorizar finalización; si a las 19h no se ha completado, escalar a equipo de portabilidad.\n**Prioridad sugerida:** MEDIA",
        },
    ],
    "microcortes": [
        {
            "text": "Cliente reporta microcortes cada 10-15 minutos por la noche. Fibra.",
            "ai": "**DIAGNÓSTICO PROBABLE:** Saturación/interferencia WiFi en horario prime-time.\n\n**PASOS RECOMENDADOS:**\n1. Revisar historial de sincronizaciones\n2. Cambiar canal WiFi 2.4GHz (menos saturado por la noche)\n3. Probar canal 5GHz\n4. Si ocurre también por cable, escalar a N2 para análisis SNR",
        },
    ],
    "velocidad_lenta": [
        {
            "text": "Cliente contrata 600Mb pero el test de velocidad da 120Mb. Por WiFi.",
            "ai": "**DIAGNÓSTICO PROBABLE:** Test por WiFi no refleja velocidad real de la línea.\n\n**PASOS RECOMENDADOS:**\n1. Pedir test de velocidad POR CABLE (speedtest.net)\n2. Si por cable da 600Mb: problema de WiFi (canal, distancia)\n3. Si por cable da <600Mb: posible degradación, escalar a N2\n4. Recomendar conectar equipos que requieran velocidad por cable",
            "summary": "## TICKET DE ESCALADO A NIVEL 2\n**Categoría:** Velocidad - Bajada\n**Síntoma reportado:** Cliente contrata 600Mb, obtiene 120Mb por WiFi. Por cable también 400Mb.\n**Acciones Nivel 1 realizadas:**\n- Test por cable confirma degradación (400/600)\n- Reinicio ONT+Router sin mejora\n- Verificación Cat 6 OK\n**Resultado:** Velocidad 33% inferior a contratada incluso por cable.\n**Hipótesis técnica:** Posible degradación de línea o saturación de OLT.\n**Acción recomendada para N2:** Análisis SNR y niveles de potencia óptica. Considerar cambio de puerto OLT.\n**Prioridad sugerida:** MEDIA",
        },
    ],
}


def _checklist_with_random_state(base_checklist: List[dict], resolved: bool) -> List[dict]:
    """Return a copy of checklist with realistic statuses."""
    out = []
    for i, c in enumerate(base_checklist):
        if resolved:
            # First 2-4 OK, maybe 1 fail, rest pending
            if i < 2:
                status = "ok"
            elif i == 2:
                status = random.choice(["ok", "ok", "fail"])
            elif i == 3:
                status = random.choice(["ok", "fail", "pending"])
            else:
                status = "pending"
        else:
            if i < 2:
                status = random.choice(["ok", "ok", "pending"])
            else:
                status = "pending"
        out.append({**c, "status": status})
    return out


async def seed_demo_data(db) -> dict:
    """Seed demo operators + ~14 sessions spread across last 7 days.
    Idempotent: if demo operators already exist, does nothing."""
    created_operators = 0
    for op in DEMO_OPERATORS:
        existing = await db.users.find_one({"email": op["email"]})
        if existing:
            continue
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email": op["email"],
                "name": op["name"],
                "role": "operator",
                "password_hash": hash_password(op["password"]),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        created_operators += 1

    # Get all operator user ids (include the default one too)
    op_docs = await db.users.find(
        {"role": "operator"}, {"_id": 0, "id": 1, "name": 1}
    ).to_list(50)
    if not op_docs:
        return {"created_operators": 0, "created_sessions": 0, "skipped": True}

    # Check if demo sessions already seeded
    existing_sessions = await db.sessions.count_documents({"_demo": True})
    if existing_sessions > 0:
        return {
            "created_operators": created_operators,
            "created_sessions": 0,
            "already_seeded": True,
        }

    # Build ~14 sessions spread across last 7 days
    now = datetime.now(timezone.utc)
    created_sessions = 0
    incident_map = {i["id"]: i for i in INCIDENTS}

    plan = []
    for _ in range(14):
        incident_id = random.choice(list(SCENARIOS.keys()))
        plan.append(incident_id)

    for idx, incident_id in enumerate(plan):
        inc = incident_map[incident_id]
        scenario = random.choice(SCENARIOS[incident_id])
        op = random.choice(op_docs)
        # Spread across 7 days
        days_back = random.randint(0, 6)
        hours_back = random.randint(8, 20)
        created_at = now - timedelta(days=days_back, hours=hours_back, minutes=random.randint(0, 59))
        duration_min = random.randint(3, 12)
        updated_at = created_at + timedelta(minutes=duration_min)

        resolved = "summary" in scenario or random.random() < 0.45
        checklist = _checklist_with_random_state(inc["checklist"], resolved)

        doc = {
            "id": str(uuid.uuid4()),
            "operator_id": op["id"],
            "incident_type": inc["id"],
            "incident_title": inc["title"],
            "checklist": checklist,
            "ai_suggestion": scenario["ai"],
            "summary": scenario.get("summary") if resolved else None,
            "anonymized_text": scenario["text"],
            "created_at": created_at.isoformat(),
            "updated_at": updated_at.isoformat(),
            "_demo": True,
        }
        await db.sessions.insert_one(doc)
        created_sessions += 1

    return {
        "created_operators": created_operators,
        "created_sessions": created_sessions,
    }


async def reset_demo_data(db) -> dict:
    """Remove all demo sessions (not operators)."""
    res = await db.sessions.delete_many({"_demo": True})
    return {"deleted_sessions": res.deleted_count}
