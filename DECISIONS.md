# Decisiones

## Decisión 1: modelo de datos mínimo

Cuatro tablas (`Conversation`, `Message`, `Proposal`, `Trace`) que guardan solo el estado que crea la aplicación y que debe sobrevivir a un reinicio.

- **Fuera de la base de datos.** Las reservas (servicio remoto), los documentos (`documentos.jsonl`) y las identidades (`identidades.json`) ya tienen fuente de verdad externa.
- **Un evento, una fila (`Message`).** Guarda el texto del huésped y la respuesta ya calculada. `@@unique([conversationId, eventId])` es la clave de deduplicación: el replay devuelve esa fila y un `text` distinto da 409.
- **La aprobación es un campo, no una tabla.** `Proposal` lleva `approvedBy` y `approvedAt`. Aprobar es una transición atómica `awaiting_approval -> processing`, que resuelve la carrera de dos aprobaciones.
- **La propuesta congela lo que cubre la aprobación:** versión de la reserva (`stayVersion`), hora, importe y política. Al aprobar se vuelve a leer todo y, si algo difiere, pasa a `stale`.
- **`Trace` cuelga de `Message`.** El `trace_id` es el `id` del mensaje; aprobar, rechazar y reconciliar registran bajo el mensaje de origen. Todo lo ocurrido con una propuesta sale con una consulta.
- **Nombres y estados iguales al contrato** (`eventId`, `feeEur`, `awaiting_approval`...), para no tener una capa extra.
