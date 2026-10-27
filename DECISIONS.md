# Decisiones

## Decisión 1: modelo de datos mínimo

El enunciado dice qué hay que guardar, pero no cómo. Lo reduje a cuatro tablas: `Conversation`, `Message`, `Proposal` y `Trace`.

- **Solo el estado que crea la aplicación.** Las reservas, los documentos y las identidades no se copian, porque ya tienen su fuente (el servicio remoto y los ficheros del kit) y una copia podría desviarse.
- **Una fila por evento, con la respuesta dentro, en vez de una fila del huésped y otra del asistente.** Con dos filas, el replay tenía que juntar ambas y el `eventId` se repetía. Con una, repetir un evento es leer una fila.
- **Sin tablas de aprobaciones ni de operaciones.** Una propuesta tiene como mucho una aprobación y una operación, así que `approvedBy`, `approvedAt`, `operationKey` y `receipt` van en `Proposal`.
- **`operationKey` en su propia columna, en vez de reutilizar el `id` de la propuesta.** Deja visible qué clave se envía a reservas. Se genera al crear la propuesta, antes de cualquier escritura.
- **`Proposal` no guarda `conversationId`, `stayId` ni `hotelId`.** Los saca de `message → conversation`, que no cambia. Guardarlos dos veces permitiría una propuesta que pertenece a dos conversaciones.
- **El `id` de la conversación lo pone el cliente y no tiene `@default`.** Es el `conversation_id` del body. Sin valor por defecto, olvidarlo es un error de tipos y no una conversación que el cliente no conoce.
- **El dueño se guarda en `ownerId`.** Se llegó a quitar porque cada huésped tiene una sola reserva; lo volví a poner para no depender de eso al rechazar una conversación ajena.
- **`Trace` cuelga del mensaje con una clave foránea real, no de la conversación.** El `trace_id` es el `id` del mensaje y cada llamada sabe a qué evento pertenece; colgarla de la conversación mezclaría eventos. Después añadí `proposalId`, opcional, para seguir la propuesta. Las dos claves usan `ON DELETE SET NULL`, para que borrar un mensaje o una propuesta no se lleve su registro.
- **Enums con los valores del contrato, en minúscula.** La API devuelve lo que hay en la base de datos sin traducirlo.

**Coste.** `Proposal` está atada a la salida tardía (horas, `stayVersion`, `feeEur`). Otro tipo de cambio necesitaría un `kind` y un `payload`.

## Decisión 2: separar efectos externos, reglas y persistencia

Elegí separar el código por responsabilidad para que las reglas importantes se puedan probar sin depender de la base de datos ni de los servicios remotos.

- **Los clientes hablan con servicios externos.** `clients/` contiene únicamente la comunicación con reservas y con la IA. No importa tipos de Prisma ni decide estados de negocio.
- **El dominio aplica reglas sin I/O.** `domain/policy.ts` recibe los documentos como parámetro y devuelve una decisión calculada. Así se puede probar la selección de políticas sin leer ficheros ni acceder a la base de datos.
- **Los repositorios solo acceden a la base de datos.** `repositories/` contiene la sintaxis de Prisma y no conoce detalles de HTTP ni de los servicios remotos.
- **Los servicios orquestan el flujo.** `services/` combina autenticación, clientes, reglas de dominio y repositorios. Es el único lugar donde se traduce el resultado de un cliente externo a un estado de la aplicación.
- **Los clientes devuelven resultados tipados en vez de lanzar excepciones de negocio.** Reservas devuelve resultados como `ok` o `error`; una escritura puede ser `applied`, `rejected` o `uncertain`; y la consulta de una operación puede ser `applied` o `unresolved`. De esta forma, un timeout o una respuesta incompleta no termina automáticamente en un `500` ni se interpreta como un rechazo.
- **La validación ocurre en cada frontera.** Se validan el `.env`, las identidades, los documentos, los cuerpos de las peticiones y las respuestas remotas. Un fichero mal formado falla al arrancar, mientras que una respuesta externa inválida se trata dentro del flujo correspondiente.
- **El dominio usa tipos discriminados.** La identidad se representa como una unión por rol: un huésped tiene `stayId`, mientras que un manager no. Así, TypeScript impide utilizar una reserva donde no existe.
- **Las claves remotas se resuelven mediante un mapa explícito.** Se usa un `Map` de sesión a variable de entorno en lugar de construir dinámicamente el nombre de la variable a partir del token. Esto limita las claves disponibles y evita consultar accidentalmente otra credencial. La credencial de tester queda fuera de ese mapa.

**Alternativas descartadas.** Un servicio único habría requerido menos archivos, pero habría mezclado HTTP, reglas, persistencia y traducción de errores. También habría sido más difícil probar las reglas sin efectos secundarios. La separación actual añade código y obliga a manejar más resultados explícitos, pero hace visibles los errores y reduce el riesgo de afirmar un resultado que no se ha comprobado.

## Decisión 3: concurrencia e idempotencia en la base de datos

En vez de locks en memoria, las garantías salen de restricciones y escrituras condicionadas en SQLite. Así valen entre peticiones y sobreviven a un reinicio.

- **Duplicados con la restricción única `(conversationId, eventId)`.** Es por conversación y no global: con un `eventId` único en toda la tabla, dos huéspedes que usaran `evt-001` chocarían. El 409 compara el `text` guardado; no hace falta un hash, porque la reserva ya va ligada a la conversación.
- **Aprobar y rechazar son un `updateMany` condicionado al estado** (`moveProposal`). Solo cambia la fila si sigue en `awaiting_approval`, y `count === 1` dice qué petición ganó. Dos aprobaciones simultáneas producen un solo cambio, y no se puede rechazar algo que ya se está ejecutando.
- **Primero se reclama la propuesta y después se comprueba la reserva.** Una versión intermedia lo hacía al revés: la segunda aprobación podía ver la reserva ya cambiada por la primera y marcar como `stale` una propuesta recién completada.
- **Si la comprobación previa falla, la propuesta vuelve a `awaiting_approval`.** No se ha enviado nada, así que se puede volver a aprobar.
- **El mensaje y su propuesta se crean en una sola escritura.** Se guardan los dos o ninguno, así que no puede quedar una propuesta sin respuesta.
- **La conversación se crea con un `upsert` sin `update`.** Si ya existe, no cambia de dueño.

**Coste.** Dos mensajes idénticos exactamente a la vez chocan con la restricción y el segundo recibe 500 en vez de `replayed`. La segunda aprobación simultánea recibe 409, no el mismo recibo. Si la app se cae a mitad de una aprobación, la propuesta se queda en `processing`. El mensaje y sus trazas se guardan en dos escrituras. Además, al aprobar no se vuelve a comprobar la política y todavía no hay `reconcile`.

## Ayuda de IA utilizada

He utilizado Claude Code (Anthropic) durante el proyecto, con una sesión de trabajo por rama.

La IA se utilizó como apoyo para explorar alternativas, generar borradores de código y tests, y revisar posibles casos límite. Las decisiones de alcance, arquitectura y comportamiento final fueron revisadas y adaptadas manualmente.

- **Planificación.** La IA ayudó a leer el kit, resumir los contratos y repartir el trabajo disponible. A partir de esa revisión decidí priorizar el flujo completo de solicitud, aprobación y aplicación del cambio.
- **Modelo de datos.** La IA propuso un esquema inicial que reduje hasta las cuatro tablas actuales. No mantuve algunas propuestas, como reutilizar `proposal.id` como clave de operación; elegí una columna `operationKey` independiente porque representa explícitamente la clave enviada al servicio de reservas.
- **Clientes externos y tests.** La IA generó parte de los clientes de reservas y de IA, junto con sus tests basados en `fetch` simulado. Revisé los casos contra los contratos y comprobé que los tests fallaban al introducir errores deliberados.
- **Políticas, mensajes y propuestas.** La IA preparó esqueletos de implementación que adapté al alcance del proyecto. Decidí mantener las reglas de política separadas, limitar la carga de documentos a `documents.ts`, reservar `repositories/` para la base de datos y mantener las trazas en su propio repositorio.
- **Revisión de resultados.** Revisé el código generado mediante type-check, lint, tests y pruebas manuales contra los servicios del kit. La IA propuso soluciones que no siempre eran correctas, por lo que ninguna respuesta generada se incorporó sin comprobar su comportamiento.
- **Errores detectados.** Durante la revisión corregí, entre otros, la aceptación incorrecta de respuestas `201` del servicio de reservas, el tratamiento de un `Retry-After` vacío y la configuración de compilación de `better-sqlite3`.
- **Límites de la automatización.** La IA no llamó directamente a los servicios remotos. Solo ejecutó comprobaciones locales. Las pruebas con la aplicación y los servicios reales, incluyendo `curl` y `pnpm env:reset`, las ejecuté manualmente.

## Fallos reproducidos y corregidos

### Fallo 1: un cambio aplicado se leía como error

- **Qué pasaba.** `toResult`, en el cliente de reservas, solo aceptaba un 200 como éxito. `POST /changes` responde **201** cuando aplica un cambio nuevo, así que un cambio hecho de verdad habría llegado como `api_error`. Eso permite anunciar el fallo de un cambio que sí se aplicó, uno de los fallos graves del enunciado. Se detectó al revisar `getStay`, antes de que `applyChange` lo usara.
- **Corrección.** `toResult` recibe los estados válidos por parámetro, y `applyChange` pasa `[200, 201]` (commit `5149856`).
- **Cómo reproducirlo.** En `src/server/clients/reservations/client.ts`, cambiar `toResult(raw, receiptSchema, [200, 201])` por `[200]` y ejecutar `pnpm test`. Fallan `applyChange > returns applied on a 201` y `returns uncertain when the receipt does not match`.

### Fallo 2: un `Retry-After` vacío hacía reintentar sin esperar

- **Qué pasaba.** `retryDelayFrom` hacía `Number(header)`, y `Number('')` es `0`. Con la cabecera vacía, la IA se reintentaba al instante en vez de esperar el segundo por defecto (commit `a32ab18`).
- **Corrección.** Una cabecera vacía se trata como ausente y se esperan los 1000 ms por defecto (commit `14a2591`), con su caso en el test.
- **Cómo reproducirlo.** En `src/server/clients/llm/client.ts`, quitar `|| header.trim() === ''` y ejecutar `pnpm test`. Falla el caso `''` de `retryDelayFrom`.

### Otro fallo encontrado: la base de datos daba 500

- **Qué pasaba.** pnpm 11 no ejecuta los scripts de instalación de las dependencias salvo que se permitan, y `pnpm-workspace.yaml` tenía `better-sqlite3: false`. Sin su binario nativo, cualquier acceso a la base de datos devolvía 500 (`Could not locate the bindings file`). Los tests y el type-check pasaban porque no abren la base de datos.
- **Corrección.** `better-sqlite3: true` en `allowBuilds` y `pnpm rebuild better-sqlite3` (commit `a2c9b42`).
- **Cómo reproducirlo.** Volver a poner `better-sqlite3: false`, reinstalar las dependencias desde cero y enviar un `POST /api/messages` a la app local.
