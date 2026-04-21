"""
Static catalog of telecom helpdesk incidents for Level 1 operators.
Each incident has a predefined guided diagnostic checklist.
"""
from typing import List, Dict

INCIDENTS: List[Dict] = [
    {
        "id": "sin_datos",
        "title": "Sin datos móviles",
        "icon": "SmartphoneNfc",
        "description": "El cliente no tiene conexión de datos en el móvil",
        "checklist": [
            {"id": "s1", "step": "Confirmar que el cliente tiene cobertura (barras de señal)"},
            {"id": "s2", "step": "Verificar que los datos móviles están activados en Ajustes"},
            {"id": "s3", "step": "Revisar que el APN esté configurado correctamente"},
            {"id": "s4", "step": "Comprobar si hay restricción de datos por consumo/saldo"},
            {"id": "s5", "step": "Reiniciar el dispositivo"},
            {"id": "s6", "step": "Probar activar/desactivar modo avión (30s)"},
            {"id": "s7", "step": "Verificar si hay bloqueo por roaming si está fuera de España"},
        ],
    },
    {
        "id": "apn",
        "title": "APN",
        "icon": "Network",
        "description": "Configuración del Access Point Name",
        "checklist": [
            {"id": "a1", "step": "Preguntar marca/modelo y sistema operativo del terminal"},
            {"id": "a2", "step": "Guiar al cliente a Ajustes > Red móvil > APN"},
            {"id": "a3", "step": "Borrar el APN actual si está corrupto"},
            {"id": "a4", "step": "Crear nuevo APN con los datos corporativos de la operadora"},
            {"id": "a5", "step": "Guardar y seleccionar el nuevo APN como predeterminado"},
            {"id": "a6", "step": "Reiniciar el terminal y probar conexión"},
        ],
    },
    {
        "id": "roaming",
        "title": "Roaming",
        "icon": "Globe2",
        "description": "Problemas de conexión en el extranjero",
        "checklist": [
            {"id": "r1", "step": "Confirmar país de destino del cliente"},
            {"id": "r2", "step": "Verificar que el roaming esté activado en la línea (sistema interno)"},
            {"id": "r3", "step": "Confirmar que los datos en roaming están activos en el terminal"},
            {"id": "r4", "step": "Seleccionar red manualmente (no automática)"},
            {"id": "r5", "step": "Comprobar consumo de bono de roaming disponible"},
            {"id": "r6", "step": "Revisar si hay restricciones por país (fuera de zona UE)"},
        ],
    },
    {
        "id": "fibra_caida",
        "title": "Fibra caída",
        "icon": "Cable",
        "description": "Conexión de fibra no funciona",
        "checklist": [
            {"id": "f1", "step": "Consultar si hay incidencia masiva en la zona"},
            {"id": "f2", "step": "Verificar estado de los LEDs de la ONT (PON, LOS, POWER)"},
            {"id": "f3", "step": "Comprobar que el cable de fibra no esté doblado o dañado"},
            {"id": "f4", "step": "Apagar ONT y router 5 minutos y volver a encender"},
            {"id": "f5", "step": "Revisar que los latiguillos ethernet ONT-Router estén bien"},
            {"id": "f6", "step": "Si persiste, escalar a N2 para ping de línea y/o visita técnica"},
        ],
    },
    {
        "id": "router",
        "title": "Router",
        "icon": "Router",
        "description": "Configuración o problemas del router",
        "checklist": [
            {"id": "ro1", "step": "Identificar modelo de router (marca y serie)"},
            {"id": "ro2", "step": "Revisar estado de LEDs (Power, Internet, WiFi)"},
            {"id": "ro3", "step": "Acceder al panel web del router (192.168.1.1)"},
            {"id": "ro4", "step": "Verificar credenciales WiFi (SSID y contraseña)"},
            {"id": "ro5", "step": "Probar reset de fábrica (botón 10 segundos) si aplica"},
            {"id": "ro6", "step": "Actualizar firmware si hay versión disponible"},
        ],
    },
    {
        "id": "portabilidad",
        "title": "Portabilidad",
        "icon": "ArrowRightLeft",
        "description": "Gestión de portabilidad entre operadoras",
        "checklist": [
            {"id": "p1", "step": "Confirmar datos del cliente (titular) sin pedir DNI por voz"},
            {"id": "p2", "step": "Consultar estado de la portabilidad en sistema interno"},
            {"id": "p3", "step": "Verificar si hay rechazo por deuda o contrato en vigor"},
            {"id": "p4", "step": "Confirmar fecha y ventana de portabilidad acordada"},
            {"id": "p5", "step": "Indicar al cliente que mantenga el terminal encendido ese día"},
            {"id": "p6", "step": "Si ya finalizada pero sin servicio, reiniciar terminal y red"},
        ],
    },
    {
        "id": "microcortes",
        "title": "Microcortes",
        "icon": "Activity",
        "description": "Pérdidas intermitentes de conexión",
        "checklist": [
            {"id": "m1", "step": "Pedir al cliente que describa frecuencia y horario de los cortes"},
            {"id": "m2", "step": "Revisar historial de sincronizaciones de la línea en sistema"},
            {"id": "m3", "step": "Verificar temperatura del router (ventilación)"},
            {"id": "m4", "step": "Comprobar interferencias WiFi (canal, vecinos)"},
            {"id": "m5", "step": "Cambiar canal WiFi a uno menos saturado (2.4 o 5 GHz)"},
            {"id": "m6", "step": "Escalar a N2 para análisis de SNR/atenuación de línea"},
        ],
    },
    {
        "id": "velocidad_lenta",
        "title": "Velocidad lenta",
        "icon": "Gauge",
        "description": "Bajada de velocidad en la conexión",
        "checklist": [
            {"id": "v1", "step": "Pedir test de velocidad por cable (speedtest.net)"},
            {"id": "v2", "step": "Comparar con la velocidad contratada"},
            {"id": "v3", "step": "Revisar cuántos dispositivos están conectados simultáneamente"},
            {"id": "v4", "step": "Verificar que el cable ethernet sea Cat 5e/6"},
            {"id": "v5", "step": "Comprobar si hay descargas/streaming saturando la red"},
            {"id": "v6", "step": "Probar en otra banda WiFi (5 GHz mejor para velocidad)"},
            {"id": "v7", "step": "Si persiste con cable, escalar a N2 para diagnóstico de línea"},
        ],
    },
]


def get_catalog() -> List[Dict]:
    """Return a lightweight catalog (id, title, icon, description) without full checklists."""
    return [
        {"id": i["id"], "title": i["title"], "icon": i["icon"], "description": i["description"]}
        for i in INCIDENTS
    ]


def get_incident(incident_id: str) -> Dict | None:
    for i in INCIDENTS:
        if i["id"] == incident_id:
            return i
    return None
