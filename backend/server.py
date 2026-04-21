"""TelcoPilot backend - AI copilot for Level 1 telecom helpdesk."""
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import APIRouter, Depends, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

from anonymizer import anonymize_text
from auth import create_token, get_current_user, hash_password, require_role, verify_password
from incidents import get_catalog, get_incident

# ---------- MongoDB ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="TelcoPilot API")
api = APIRouter(prefix="/api")

# ---------- Models ----------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str = "operator"


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class AnonymizePreview(BaseModel):
    text: str


class AnonymizeResponse(BaseModel):
    redacted: str
    redactions: List[dict]


class StartSessionReq(BaseModel):
    incident_type: str


class AnalyzeReq(BaseModel):
    free_text: str


class ChecklistUpdateReq(BaseModel):
    step_id: str
    status: str  # "pending" | "ok" | "fail"


class SessionOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    operator_id: str
    incident_type: str
    incident_title: str
    checklist: List[dict]
    ai_suggestion: Optional[str] = None
    summary: Optional[str] = None
    created_at: str
    updated_at: str


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _get_session_or_404(session_id: str, operator_id: str) -> dict:
    doc = await db.sessions.find_one({"id": session_id, "operator_id": operator_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return doc


# ---------- LLM ----------
async def llm_suggest(incident_title: str, checklist: List[dict], anonymized_text: str) -> str:
    """Ask Claude for a diagnosis suggestion based on anonymized description."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    system = (
        "Eres TelcoPilot, un asistente experto en soporte técnico de telecomunicaciones Nivel 1 "
        "para teleoperadores en España (castellano/català). Ayudas al operador a diagnosticar "
        "incidencias de forma rápida y precisa. Responde SIEMPRE en español, de forma concisa y "
        "estructurada. NO pidas datos personales. El texto del cliente ya viene ANONIMIZADO "
        "(verás marcadores como [REDACTED_NAME], [REDACTED_PHONE], etc.) — es normal, no pidas "
        "esos datos al operador. Da pasos accionables y priorizados."
    )
    checklist_str = "\n".join(f"- {c['step']}" for c in checklist)
    prompt = (
        f"Tipo de incidencia: {incident_title}\n\n"
        f"Checklist estándar disponible:\n{checklist_str}\n\n"
        f"Descripción del cliente (anonimizada):\n\"{anonymized_text}\"\n\n"
        "Devuelve tu respuesta en este formato exacto:\n\n"
        "**DIAGNÓSTICO PROBABLE:** (1-2 frases)\n\n"
        "**PASOS RECOMENDADOS (orden de prioridad):**\n"
        "1. ...\n2. ...\n3. ...\n\n"
        "**SI NO SE RESUELVE:** (cuándo y cómo escalar a Nivel 2)"
    )

    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"suggest-{uuid.uuid4()}",
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    resp = await chat.send_message(UserMessage(text=prompt))
    return resp


async def llm_summary(
    incident_title: str, checklist: List[dict], anonymized_text: str, ai_suggestion: Optional[str]
) -> str:
    """Generate a Level-2 escalation ticket summary."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    system = (
        "Eres TelcoPilot. Generas tickets de escalado a Nivel 2 claros, concisos y profesionales "
        "para centros de soporte telco. NO incluyas datos personales del cliente — solo síntomas, "
        "diagnósticos y acciones ya realizadas."
    )
    done = [c for c in checklist if c.get("status") == "ok"]
    failed = [c for c in checklist if c.get("status") == "fail"]
    pending = [c for c in checklist if c.get("status", "pending") == "pending"]

    prompt = (
        f"Incidencia: {incident_title}\n\n"
        f"Descripción (anonimizada): \"{anonymized_text or 'No proporcionada'}\"\n\n"
        f"Pasos verificados OK: {[d['step'] for d in done] or 'Ninguno'}\n"
        f"Pasos fallidos: {[d['step'] for d in failed] or 'Ninguno'}\n"
        f"Pasos pendientes: {[d['step'] for d in pending] or 'Ninguno'}\n\n"
        f"Sugerencia IA previa: {ai_suggestion or 'N/A'}\n\n"
        "Genera el ticket de escalado en este formato:\n\n"
        "## TICKET DE ESCALADO A NIVEL 2\n"
        "**Categoría:** ...\n"
        "**Síntoma reportado:** ...\n"
        "**Acciones Nivel 1 realizadas:** (lista)\n"
        "**Resultado:** ...\n"
        "**Hipótesis técnica:** ...\n"
        "**Acción recomendada para N2:** ..."
    )

    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"summary-{uuid.uuid4()}",
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    resp = await chat.send_message(UserMessage(text=prompt))
    return resp


# ---------- Auth routes ----------
@api.post("/auth/register", response_model=AuthResponse)
async def register(body: UserRegister):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "email": body.email.lower(),
        "name": body.name,
        "role": "operator",
        "password_hash": hash_password(body.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_token(uid, body.email.lower(), "operator")
    return AuthResponse(
        token=token,
        user=UserOut(id=uid, email=body.email.lower(), name=body.name, role="operator"),
    )


@api.post("/auth/login", response_model=AuthResponse)
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    role = user.get("role", "operator")
    token = create_token(user["id"], user["email"], role)
    return AuthResponse(
        token=token,
        user=UserOut(id=user["id"], email=user["email"], name=user["name"], role=role),
    )


@api.get("/auth/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return UserOut(
        id=doc["id"], email=doc["email"], name=doc["name"], role=doc.get("role", "operator")
    )


# ---------- Incident catalog ----------
@api.get("/incidents/catalog")
async def incidents_catalog(user=Depends(get_current_user)):
    return {"incidents": get_catalog()}


# ---------- Anonymization preview ----------
@api.post("/anonymize/preview", response_model=AnonymizeResponse)
async def anonymize_preview(body: AnonymizePreview, user=Depends(get_current_user)):
    redacted, redactions = anonymize_text(body.text)
    return AnonymizeResponse(redacted=redacted, redactions=redactions)


# ---------- Sessions ----------
@api.post("/sessions/start", response_model=SessionOut)
async def start_session(body: StartSessionReq, user=Depends(get_current_user)):
    inc = get_incident(body.incident_type)
    if not inc:
        raise HTTPException(status_code=400, detail="Tipo de incidencia no válido")
    sid = str(uuid.uuid4())
    checklist = [{**c, "status": "pending"} for c in inc["checklist"]]
    doc = {
        "id": sid,
        "operator_id": user["id"],
        "incident_type": inc["id"],
        "incident_title": inc["title"],
        "checklist": checklist,
        "ai_suggestion": None,
        "summary": None,
        "anonymized_text": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.sessions.insert_one(doc.copy())
    doc.pop("_id", None)
    return SessionOut(**doc)


@api.get("/sessions", response_model=List[SessionOut])
async def list_sessions(user=Depends(get_current_user)):
    docs = (
        await db.sessions.find({"operator_id": user["id"]}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(100)
    )
    return [SessionOut(**d) for d in docs]


@api.get("/sessions/{session_id}", response_model=SessionOut)
async def get_session(session_id: str, user=Depends(get_current_user)):
    doc = await _get_session_or_404(session_id, user["id"])
    return SessionOut(**doc)


@api.post("/sessions/{session_id}/analyze")
async def analyze_session(session_id: str, body: AnalyzeReq, user=Depends(get_current_user)):
    doc = await _get_session_or_404(session_id, user["id"])
    redacted, redactions = anonymize_text(body.free_text)
    try:
        suggestion = await llm_suggest(doc["incident_title"], doc["checklist"], redacted)
    except Exception as e:
        logging.exception("LLM suggest failed")
        raise HTTPException(status_code=502, detail=f"Error IA: {str(e)[:120]}")
    await db.sessions.update_one(
        {"id": session_id, "operator_id": user["id"]},
        {
            "$set": {
                "anonymized_text": redacted,
                "ai_suggestion": suggestion,
                "updated_at": now_iso(),
            }
        },
    )
    return {
        "session_id": session_id,
        "redacted": redacted,
        "redactions": redactions,
        "ai_suggestion": suggestion,
    }


@api.patch("/sessions/{session_id}/checklist", response_model=SessionOut)
async def update_checklist(
    session_id: str, body: ChecklistUpdateReq, user=Depends(get_current_user)
):
    if body.status not in ("pending", "ok", "fail"):
        raise HTTPException(status_code=400, detail="status inválido")
    doc = await _get_session_or_404(session_id, user["id"])
    updated = False
    for step in doc["checklist"]:
        if step["id"] == body.step_id:
            step["status"] = body.status
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Paso no encontrado")
    doc["updated_at"] = now_iso()
    await db.sessions.update_one(
        {"id": session_id, "operator_id": user["id"]},
        {"$set": {"checklist": doc["checklist"], "updated_at": doc["updated_at"]}},
    )
    return SessionOut(**doc)


@api.post("/sessions/{session_id}/summary")
async def generate_summary(session_id: str, user=Depends(get_current_user)):
    doc = await _get_session_or_404(session_id, user["id"])
    try:
        summary = await llm_summary(
            doc["incident_title"],
            doc["checklist"],
            doc.get("anonymized_text") or "",
            doc.get("ai_suggestion"),
        )
    except Exception as e:
        logging.exception("LLM summary failed")
        raise HTTPException(status_code=502, detail=f"Error IA: {str(e)[:120]}")
    await db.sessions.update_one(
        {"id": session_id, "operator_id": user["id"]},
        {"$set": {"summary": summary, "updated_at": now_iso()}},
    )
    return {"session_id": session_id, "summary": summary}


# ---------- Stats ----------
@api.get("/stats/me")
async def my_stats(user=Depends(get_current_user)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    total = await db.sessions.count_documents({"operator_id": user["id"]})
    today = await db.sessions.count_documents(
        {"operator_id": user["id"], "created_at": {"$gte": today_start}}
    )
    resolved = await db.sessions.count_documents(
        {"operator_id": user["id"], "summary": {"$ne": None}}
    )
    return {"total": total, "today": today, "escalated": resolved}


# ---------- Supervisor dashboard ----------
@api.get("/admin/overview")
async def admin_overview(user=Depends(require_role("supervisor", "admin"))):
    """Aggregated metrics for supervisor/admin. No PII exposed."""
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=7)).isoformat()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    total = await db.sessions.count_documents({})
    today = await db.sessions.count_documents({"created_at": {"$gte": today_start}})
    week = await db.sessions.count_documents({"created_at": {"$gte": week_start}})
    escalated = await db.sessions.count_documents({"summary": {"$ne": None}})

    # Incidents breakdown
    pipeline_inc = [
        {"$group": {"_id": "$incident_title", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    inc_counts = await db.sessions.aggregate(pipeline_inc).to_list(20)
    incidents_breakdown = [{"title": d["_id"], "count": d["count"]} for d in inc_counts]

    # Per-operator stats (join users)
    pipeline_op = [
        {
            "$group": {
                "_id": "$operator_id",
                "sessions": {"$sum": 1},
                "escalated": {
                    "$sum": {"$cond": [{"$ne": ["$summary", None]}, 1, 0]}
                },
            }
        },
        {"$sort": {"sessions": -1}},
        {"$limit": 20},
    ]
    ops_raw = await db.sessions.aggregate(pipeline_op).to_list(50)
    # Resolve names
    op_ids = [o["_id"] for o in ops_raw]
    users = await db.users.find(
        {"id": {"$in": op_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}
    ).to_list(100)
    user_map = {u["id"]: u for u in users}
    per_operator = [
        {
            "operator_id": o["_id"],
            "name": user_map.get(o["_id"], {}).get("name", "—"),
            "email": user_map.get(o["_id"], {}).get("email", "—"),
            "sessions": o["sessions"],
            "escalated": o["escalated"],
            "escalation_rate": round(o["escalated"] / o["sessions"], 3) if o["sessions"] else 0,
        }
        for o in ops_raw
    ]

    # Sessions per day (last 7)
    daily = []
    for i in range(6, -1, -1):
        d = now - timedelta(days=i)
        start = d.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        end = d.replace(hour=23, minute=59, second=59, microsecond=0).isoformat()
        c = await db.sessions.count_documents(
            {"created_at": {"$gte": start, "$lte": end}}
        )
        daily.append({"date": d.strftime("%d/%m"), "sessions": c})

    # Avg resolution (TMO proxy): avg seconds between created_at and updated_at for sessions with summary
    pipeline_tmo = [
        {"$match": {"summary": {"$ne": None}}},
        {
            "$project": {
                "dur": {
                    "$dateDiff": {
                        "startDate": {"$toDate": "$created_at"},
                        "endDate": {"$toDate": "$updated_at"},
                        "unit": "second",
                    }
                }
            }
        },
        {"$group": {"_id": None, "avg": {"$avg": "$dur"}}},
    ]
    tmo_agg = await db.sessions.aggregate(pipeline_tmo).to_list(1)
    avg_seconds = int(tmo_agg[0]["avg"]) if tmo_agg and tmo_agg[0].get("avg") else 0

    # Total operator count
    operators = await db.users.count_documents({"role": "operator"})

    return {
        "kpis": {
            "total_sessions": total,
            "today": today,
            "week": week,
            "escalated": escalated,
            "escalation_rate": round(escalated / total, 3) if total else 0,
            "avg_resolution_seconds": avg_seconds,
            "operators": operators,
        },
        "incidents_breakdown": incidents_breakdown,
        "per_operator": per_operator,
        "daily": daily,
    }


# ---------- Startup: seed supervisor ----------
async def seed_supervisor():
    sup_email = "supervisor@telco.es"
    existing = await db.users.find_one({"email": sup_email})
    if existing:
        # Ensure role upgraded if legacy doc exists
        if existing.get("role") != "supervisor":
            await db.users.update_one(
                {"email": sup_email}, {"$set": {"role": "supervisor"}}
            )
        return
    await db.users.insert_one(
        {
            "id": str(uuid.uuid4()),
            "email": sup_email,
            "name": "Supervisor Demo",
            "role": "supervisor",
            "password_hash": hash_password("super123"),
            "created_at": now_iso(),
        }
    )


@app.on_event("startup")
async def on_startup():
    try:
        await seed_supervisor()
    except Exception:
        logging.exception("Seeding supervisor failed")


# ---------- Root ----------
@api.get("/")
async def root():
    return {"service": "TelcoPilot", "status": "ok"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
