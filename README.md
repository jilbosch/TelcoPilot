# TelcoPilot

Copiloto con IA para operadores de soporte técnico de nivel 1 en telecomunicaciones. Guía el diagnóstico, sugiere pasos con IA y prepara el ticket de escalado a nivel 2 sin que la IA vea datos personales del cliente.

![Stack](https://img.shields.io/badge/stack-FastAPI%20%2B%20React%20%2B%20MongoDB-0055FF)
![AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-00E5FF)
![RGPD](https://img.shields.io/badge/RGPD-anonimizaci%C3%B3n-8B5CF6)
![License](https://img.shields.io/badge/license-Proprietary-111827)

---

## El problema

Los teleoperadores de Nivel 1 en call centers de telecomunicaciones enfrentan el mismo patrón cada día:

1. El cliente llama con un problema (fibra caída, sin datos, roaming, APN…).
2. El operador busca en manuales internos, pregunta al supervisor, pierde tiempo.
3. Resultado: llamadas largas, AHT alto, escalados innecesarios a Nivel 2, clientes insatisfechos.

Además, los operadores manejan datos personales del cliente (DNI, teléfono, dirección) por lo que cualquier asistente IA debe cumplir RGPD estrictamente.

---

## La solución

TelcoPilot está pensado para el operador de nivel 1:

- Diagnóstico guiado paso a paso con checklists predefinidos por tipo de incidencia.
- Sugerencias IA basadas en el texto libre del operador (Gemini 2.5 Flash).
- Anonimización automática de datos sensibles antes de enviar el texto a la IA. El modelo nunca ve datos personales.
- Tickets de escalado a Nivel 2 generados con un clic, exportables a PDF o formato Jira.
- Dashboard de supervisor con KPIs agregados (TMO, FCR, escalados, ranking).

---

## Pantallas

### Login (acceso operador / supervisor)
Tema oscuro estilo NOC (Network Operations Center), colores azul eléctrico + cian, tipografía Chivo + IBM Plex Mono.

### Workspace (operador)
Layout en "sala de control" con 4 paneles:
1. Grid de 8 incidencias (Sin datos / APN / Roaming / Fibra caída / Router / Portabilidad / Microcortes / Velocidad).
2. Textarea del operador + vista anonimizada en paralelo (chips violetas sobre los datos redactados).
3. Checklist con botones OK/FAIL + sugerencia IA paso a paso.
4. Generador de ticket con botones: Generar ticket, Copiar, Jira, PDF.

### Dashboard (supervisor)
- 6 KPIs: Sesiones totales / Hoy / Últimos 7 días / Escaladas / Tasa escalado / TMO medio.
- Gráfico de líneas: actividad últimos 7 días.
- Gráfico de barras: ranking de incidencias más comunes.
- Tabla: rendimiento por operador con tasa de escalado color-coded.

---

## Arquitectura

```
┌──────────────────┐      HTTPS       ┌──────────────────────┐
│  React Frontend  │ ───────────────▶ │  FastAPI Backend     │
│  (NOC UI)        │   /api/*          │  + JWT roles         │
└──────────────────┘                   │  + Anonymizer (regex)│
                                       │  + LLM client        │
                                       └─────────┬────────────┘
                                                 │
                                      ┌──────────▼──────────┐       ┌───────────────────┐
                                      │  MongoDB            │       │  Google Gemini API│
                                      │  users + sessions   │       │  Gemini 2.5 Flash │
                                      └─────────────────────┘       └───────────────────┘
```

### Tech stack
- Backend: Python 3.11, FastAPI, Motor (async Mongo), PyJWT, bcrypt, google-generativeai (Gemini 2.5 Flash).
- Frontend: React 19, react-router-dom 7, Tailwind CSS, lucide-react, recharts, jsPDF, axios.
- Database: MongoDB (2 collections: `users`, `sessions`).
- Auth: JWT con `role` claim (`operator` / `supervisor` / `admin`).

### Flujo de anonimización (clave RGPD)
```
Operador escribe texto libre
       │
       ▼
Backend recibe texto
       │
       ▼
 ┌─────────────────────────┐
 │ anonymizer.py (regex)   │  ← DNI, NIE, phone ES, email,
 │ devuelve texto redactado│    IBAN, IP, MAC, nombre, dirección
 └──────────┬──────────────┘
            │ solo texto anonimizado
            ▼
       Gemini 2.5 Flash
            │
            ▼
   Diagnóstico sugerido
```
El LLM nunca ve datos personales. Es el principal argumento RGPD.

---

## Instalación local

### Requisitos
- Python 3.11+
- Node.js 18+ con **yarn**
- MongoDB 6+ corriendo localmente

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # editar variables (ver abajo)
uvicorn server:app --reload --port 8001
```

### 2. Frontend
```bash
cd frontend
yarn install
yarn start    # por defecto en http://localhost:3000
```

### 3. Variables de entorno

**`backend/.env`**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=telcopilot
CORS_ORIGINS=*
GEMINI_API_KEY=tu-clave-gemini            # https://aistudio.google.com/apikey
JWT_SECRET=cambiame-en-produccion          # generar con: openssl rand -hex 32
JWT_ALGORITHM=HS256
JWT_EXP_HOURS=12
```

**`frontend/.env`**
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## Credenciales de prueba

El backend crea automáticamente un usuario supervisor al arrancar.

| Rol        | Email                   | Contraseña | Acceso                      |
|------------|-------------------------|------------|-----------------------------|
| Supervisor | `supervisor@telco.es`   | `super123` | Workspace + Dashboard       |
| Operador   | `operador@telco.es`     | `telco123` | Solo Workspace *(registrar)*|

Para crear operadores adicionales, usar la página de registro en `/register`.

> En producción **cambiar** el `JWT_SECRET` y cambiar las contraseñas por defecto.

---

## Tests

### Backend (pytest, 32 tests)
```bash
cd backend
pytest tests/test_telcopilot.py -v
```

Cubre: auth (registro/login/me/JWT), catálogo, anonimización (8 tipos PII), sesiones (CRUD + ownership), LLM analyze/summary, roles, supervisor dashboard.

---

## API

Todas las rutas bajo `/api/`.

### Públicas
| Método | Ruta                 | Descripción                  |
|--------|----------------------|------------------------------|
| POST   | `/auth/register`     | Crear cuenta (siempre rol `operator`) |
| POST   | `/auth/login`        | Devuelve JWT + user          |
| GET    | `/`                  | Health check                 |

### Autenticadas (Bearer token)
| Método | Ruta                                  | Rol requerido  |
|--------|---------------------------------------|----------------|
| GET    | `/auth/me`                            | cualquiera     |
| GET    | `/incidents/catalog`                  | cualquiera     |
| POST   | `/anonymize/preview`                  | cualquiera     |
| POST   | `/sessions/start`                     | cualquiera     |
| GET    | `/sessions`                           | cualquiera     |
| GET    | `/sessions/{id}`                      | owner          |
| POST   | `/sessions/{id}/analyze`              | owner          |
| PATCH  | `/sessions/{id}/checklist`            | owner          |
| POST   | `/sessions/{id}/summary`              | owner          |
| GET    | `/stats/me`                           | cualquiera     |
| GET    | `/admin/overview`                     | supervisor/admin |

---

## Roadmap

### Hecho
- MVP: auth, anonimización, diagnóstico guiado, IA, escalado.
- Roles + dashboard supervisor + export PDF/Jira.

### Siguiente
- Traductor en tiempo real **Catalán ↔ Castellano**.
- Streaming SSE de respuestas IA (menos latencia percibida).
- Rate limiting en `/auth/login`.
- Informe semanal exportable desde el dashboard.

---

## Licencia

Código propietario, todos los derechos reservados. Para uso comercial o personalización, contacta conmigo.

---

## Autor

Joan Gil Bosch. Trabajé de técnico de helpdesk de nivel 1 y TelcoPilot nace de lo que vi allí: mucho tiempo buscando en manuales y escalados que se podían evitar.

[jilbosch.com](https://jilbosch.com) · [LinkedIn](https://www.linkedin.com/in/joangilbosch)
