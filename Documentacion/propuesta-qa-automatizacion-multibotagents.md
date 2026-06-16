# Propuesta de Estrategia de QA y Automatización — MultiBotAgents

## Introducción

### ¿De qué trata este documento?

MultiBotAgents es una plataforma que permite a empresas configurar y desplegar agentes de inteligencia artificial (RAG, cotizador, agendamiento) sobre canales de mensajería como WhatsApp. Este documento propone una **estrategia de aseguramiento de calidad (QA) y automatización de pruebas** para el proyecto.

### ¿Qué problema resuelve?

Hoy el proyecto tiene ~50 tests automatizados y 25 reportes de QA manual de excelente calidad, pero tiene tres problemas críticos:

1. **El pipeline de integración continua (CI) está roto** — las verificaciones automáticas nunca se ejecutan porque el archivo de configuración referencia un backend que ya no existe
2. **No hay tests que verifiquen las APIs del backend de verdad** — si alguien rompe el login o el CRUD de agentes, nadie se entera hasta que un humano lo prueba manualmente
3. **Los bugs corregidos pueden volver a aparecer** — no hay nada que "vigile" automáticamente que un bug ya corregido no se reintroduzca

### ¿Para quién es este documento?

Para el equipo de desarrollo y liderazgo técnico de MultiBotAgents. No se asume conocimiento previo de las herramientas de testing — cada concepto técnico se explica la primera vez que aparece.

### Guía de lectura

| Sección | ¿Qué encontrará? |
|---|---|
| **1. Situación actual** | Qué herramientas de QA ya tenemos funcionando en el proyecto y qué está roto o falta |
| **2. Tipos de pruebas** | Explicación detallada de cada tipo de prueba: qué es, cómo funciona paso a paso, qué herramientas intervienen, cómo interactúan entre sí, y cómo se integra todo en un flujo único con el QA manual |
| **3. Herramientas** | Lista completa de herramientas: cuáles ya están instaladas, cuáles hay que agregar, y para qué sirve cada una |
| **4. Mapa de cobertura** | Tabla que cruza las 15 soluciones del Solution Map de la iniciativa con cada tipo de prueba, mostrando qué ya existe, qué falta, y en qué orden se implementa |
| **5. Pruebas manuales** | Qué tipos de pruebas nunca se automatizan y por qué el QA manual sigue siendo esencial |
| **6. Plan de implementación** | Fases concretas con semanas, qué se hace en cada una, qué se instala, y qué gana el equipo |
| **7. Resumen ejecutivo** | Tabla resumen para toma de decisiones: herramientas, costos y beneficios por fase |

---

## 1. Situación actual

### Lo que YA tenemos funcionando

| Herramienta | ¿Qué es? | ¿Dónde está configurada? | ¿Qué hace hoy? |
|---|---|---|---|
| **Vitest** | Framework que ejecuta tests automatizados | Configurado en 4 paquetes: `core`, `db`, `api-multi-bots`, `functions` | Ejecuta ~50 tests unitarios que verifican funciones individuales (ej: "¿el chunking de PDFs divide bien?") |
| **fast-check** | Librería que genera datos aleatorios para probar reglas | Dentro de `packages/core` | Genera miles de datos al azar para verificar que ciertas reglas siempre se cumplan (ej: "un fragmento nunca puede estar vacío") |
| **ESLint** | Herramienta que revisa el código buscando errores y malas prácticas | Configurado en todos los paquetes con `pnpm lint` | Analiza el código sin ejecutarlo: detecta variables sin usar, imports rotos, código inalcanzable, etc. |
| **TypeScript strict** | Modo estricto del lenguaje TypeScript | `tsconfig.json` en todos los paquetes | Obliga a que todas las variables y funciones tengan tipos definidos. Si alguien escribe código ambiguo, TypeScript no deja compilar |
| **25 reportes QA manuales** | Documentos escritos por QA humano | `Documentacion/qa-reports/` | Cada reporte documenta los test cases ejecutados manualmente, bugs encontrados con severidad, causa raíz verificada en el código, y fix sugerido |

### Lo que está roto o falta

| Problema | ¿Por qué importa? |
|---|---|
| **El pipeline CI está roto** | El pipeline CI es un proceso automático de GitHub que debería ejecutar verificaciones cada vez que alguien sube código. El archivo actual (`.github/workflows/ci.yml`) ejecuta comandos de Python (`pip install ruff`, `pytest`) contra un backend que ya no existe — el proyecto ahora es TypeScript con MongoDB. **Resultado: los ~50 tests que ya tenemos nunca se ejecutan automáticamente. Nadie se entera si un test falla hasta que alguien lo ejecuta manualmente en su máquina** |
| **No hay tests que llamen a las APIs del backend** | El backend tiene 14 módulos con URLs que reciben y devuelven datos (ej: `POST /auth/login` recibe email y contraseña, devuelve un token). Ninguna de estas URLs tiene un test que la llame de verdad. Si un desarrollador cambia el código y rompe el login, **nadie se entera hasta que un humano abre el navegador y prueba manualmente** |
| **No hay tests que abran un navegador** | El frontend tiene 17 secciones (login, dashboard, agentes, knowledge, inbox...) pero no hay nada que abra Chrome automáticamente y verifique que los botones funcionen, que los formularios se envíen, que las tablas muestren datos. **Todo depende de que un humano lo pruebe** |
| **Los bugs corregidos pueden volver** | Cuando QA manual encuentra un bug y se corrige, no hay nada que impida que el mismo bug reaparezca si alguien modifica el código después. Los reportes documentan lo que se encontró, pero no "vigilan" que no vuelva a pasar |

---

## 2. ¿Qué tipos de pruebas existen y cómo funciona cada una?

Hay 3 capas de pruebas automatizadas, más el QA manual que ya se hace. Cada capa verifica algo diferente, usa herramientas diferentes, y funciona de manera diferente. Aquí se explica cada una en detalle.

### CAPA 1 — Pruebas unitarias: "¿Esta función calcula bien?"

**¿Qué son?** Tests que toman una función individual del código, le pasan datos de entrada, y verifican que el resultado sea el esperado. No conectan a bases de datos, no llaman a APIs externas, no abren navegadores. Solo verifican lógica pura.

**¿Cómo funcionan paso a paso?**

```
1. El desarrollador escribe un archivo de test (ej: chunking.test.ts)
2. En ese archivo, importa la función que quiere probar (ej: chunkText)
3. Llama a la función con datos conocidos (ej: chunkText("texto largo...", 500))
4. Verifica que el resultado sea el esperado (ej: "debe devolver 3 fragmentos, cada uno ≤ 500 tokens")
5. Ejecuta el test con: pnpm --filter @multibotagents/core test
6. Vitest (el framework de testing) ejecuta la función, compara el resultado, y reporta ✅ o ❌
```

**¿Qué herramientas intervienen y cómo interactúan?**

```
Desarrollador ejecuta "pnpm test"
       │
       ▼
  Turborepo (el gestor del monorepo) delega a cada paquete
       │
       ▼
  Vitest (el framework de testing) busca archivos *.test.ts y *.spec.ts
       │
       ▼
  Para cada test: importa la función → la ejecuta → compara resultado esperado vs real
       │
       ├── ✅ Resultado coincide → test pasa
       └── ❌ Resultado no coincide → test falla, muestra qué se esperaba vs qué se obtuvo
```

**¿Qué tenemos hoy?** ~50 tests que cubren: RAG engine (prompt, tokens, threshold), memoria conversacional, WhatsApp (webhooks, firma, encriptación), knowledge (chunking, extracción de texto), auth, repositorios de MongoDB.

**¿Qué falta?** Tests para las funcionalidades que aún no los tienen: cálculos del cotizador, lógica de disponibilidad del agendamiento, cálculos de métricas, pipeline de transcripción de voz.

---

### CAPA 2 — Pruebas de integración de API: "¿La URL del backend responde correctamente?"

**¿Qué son?** Tests que levantan el backend NestJS completo en memoria, le envían peticiones HTTP reales (como si fueran un navegador o una app), y verifican que las respuestas sean correctas.

**¿En qué se diferencian de las unitarias?** Las unitarias prueban una función aislada. Las de integración prueban el sistema completo: la petición HTTP entra por el controlador → pasa por la validación → llega al servicio → consulta la base de datos → devuelve la respuesta. Si algo falla en cualquier punto de esa cadena, el test lo detecta.

**¿Cómo funcionan paso a paso?**

```
1. El test levanta una instancia del backend NestJS en memoria (no en un servidor real)
2. Levanta una base de datos MongoDB de prueba (temporal, se borra al terminar)
3. Crea datos de prueba (ej: una empresa y un usuario de prueba)
4. Envía una petición HTTP real usando Supertest (ej: POST /auth/login con email y contraseña)
5. Verifica la respuesta:
   - ¿El status code es 200 (éxito)?
   - ¿La respuesta contiene un token de acceso?
   - ¿El token es válido?
6. Repite con escenarios negativos:
   - ¿Qué pasa si envío credenciales incorrectas? → Debe devolver 401 (no autorizado)
   - ¿Qué pasa si no envío email? → Debe devolver 400 (datos inválidos)
7. Al terminar, borra todos los datos de prueba y cierra la base de datos temporal
```

**¿Qué herramientas intervienen y cómo interactúan?**

```
Vitest (framework de testing)
   │
   ▼ levanta
NestJS (backend completo, en memoria)
   │
   ├── Conecta a MongoDB de test (temporal, datos aislados)
   │
   └── Expone las URLs del backend internamente
          │
          ▼ Supertest envía peticiones HTTP a esas URLs
       Supertest (librería que simula un cliente HTTP)
          │
          ├── POST /auth/login → ¿Devuelve token? ✅/❌
          ├── POST /auth/login con clave incorrecta → ¿Devuelve 401? ✅/❌
          ├── POST /agents → ¿Crea un agente? ✅/❌
          ├── GET /agents → ¿Solo devuelve agentes de MI empresa? ✅/❌
          └── DELETE /agents/:id → ¿Elimina y ya no aparece en GET? ✅/❌
```

**¿Qué necesitamos instalar?** Solo la librería `supertest` (`pnpm add -D supertest`). El framework de testing de NestJS (`@nestjs/testing`) ya está instalado en el proyecto.

**¿Cómo funciona en el pipeline CI (GitHub Actions)?** GitHub levanta un contenedor de MongoDB temporal solo para los tests. Los tests se ejecutan contra esa base de datos temporal. Al terminar, el contenedor se destruye. Ningún dato de producción se toca.

---

### CAPA 3 — Pruebas E2E (End-to-End): "¿El flujo completo funciona en el navegador?"

**¿Qué son?** Tests que abren un navegador real (Chrome), navegan a la aplicación web, hacen clic en botones, llenan formularios, y verifican que lo que aparece en pantalla sea correcto. Simulan exactamente lo que haría un usuario humano.

**¿En qué se diferencian de las de integración?** Las de integración verifican que el backend responda correctamente. Las E2E verifican el sistema completo de punta a punta: el frontend muestra un formulario → el usuario llena datos → el frontend envía al backend → el backend procesa → el frontend muestra el resultado. Si algo falla en cualquier punto (un botón que no responde, un formulario que no envía, una pantalla que no se actualiza), el test lo detecta.

**¿Cómo funcionan paso a paso?**

```
1. Playwright abre Chrome (sin que se vea, en modo "headless")
2. Navega a la URL de la app (puede ser localhost o staging)
3. Ejecuta acciones como un usuario:
   - Escribe email y contraseña en el formulario de login
   - Hace clic en "Iniciar sesión"
   - Espera a que cargue el dashboard
   - Verifica que aparezcan las tarjetas de KPIs
   - Navega a "Agentes"
   - Hace clic en "Crear agente"
   - Llena el formulario de creación
   - Hace clic en "Guardar"
   - Verifica que el nuevo agente aparezca en la tabla
4. Si algo no funciona (un botón no responde, un texto no aparece, una pantalla no carga):
   - El test falla
   - Playwright toma un screenshot del estado del navegador en el momento de la falla
   - Guarda un video del flujo completo para que el equipo pueda ver qué pasó
```

**¿Qué herramientas intervienen y cómo interactúan?**

```
Playwright (herramienta de testing en navegador)
   │
   ▼ abre
Chrome (navegador real, en modo invisible)
   │
   ▼ navega a
Frontend Next.js (la app web desplegada en staging o en localhost)
   │
   ▼ el frontend llama a
Backend NestJS (el servidor que procesa las peticiones)
   │
   ▼ el backend consulta
MongoDB Atlas (la base de datos)
   │
   ▼ Playwright verifica lo que Chrome muestra en pantalla
   │
   ├── ✅ La pantalla muestra lo esperado → test pasa
   └── ❌ La pantalla no muestra lo esperado → test falla + screenshot + video
```

**¿Qué necesitamos instalar?** La herramienta Playwright (`pnpm add -D @playwright/test`) y los navegadores de prueba (`npx playwright install chromium`).

**¿Contra qué entorno se ejecutan los E2E?**
- **En local:** Playwright levanta el servidor de desarrollo del frontend (`pnpm dev` en `apps/web`) y ejecuta los tests contra `http://localhost:3000`
- **En CI (GitHub Actions):** Se ejecutan contra el entorno de staging (la URL de CloudFront) para verificar que la app desplegada funcione

---

### QA MANUAL — "¿La experiencia del usuario se siente bien?"

**Esto ya se hace y se sigue haciendo.** Los 25 reportes en `Documentacion/qa-reports/` son la evidencia. Las pruebas automáticas NO reemplazan el QA manual. Lo complementan:

| Lo que detecta la automatización | Lo que detecta el QA humano |
|---|---|
| "El endpoint devuelve error 500" | "El botón se ve cortado en móvil" |
| "El formulario no envía los datos" | "Las animaciones se sienten lentas" |
| "La tabla no muestra el agente creado" | "Los colores no son consistentes entre pantallas" |
| "Un bug que ya se corrigió volvió a aparecer" | "El flujo de crear agente es confuso para un usuario nuevo" |

**Flujo combinado propuesto:**

```
Desarrollador sube código
       │
       ▼
┌──────────────────────────────────────────────────┐
│  CI AUTOMÁTICO (GitHub Actions)                   │
│                                                   │
│  1. TypeScript verifica que no hay errores de     │
│     tipos (pnpm type-check)                       │
│                                                   │
│  2. ESLint revisa calidad del código              │
│     (pnpm lint)                                   │
│                                                   │
│  3. Vitest ejecuta los tests unitarios            │
│     (pnpm test)                                   │
│                                                   │
│  4. Vitest + Supertest llaman a los endpoints     │
│     del backend contra MongoDB temporal           │
│     (pnpm test:integration)                       │
│                                                   │
│  5. [Solo si el PR va a main]                     │
│     Playwright abre Chrome y prueba los flujos    │
│     críticos contra staging                       │
│                                                   │
│  Si CUALQUIER paso falla → PR BLOQUEADO ❌        │
│  El desarrollador ve exactamente qué falló        │
│  y dónde, directamente en GitHub                  │
└──────────────────────┬───────────────────────────┘
                       │ ✅ Todo pasó
                       ▼
┌──────────────────────────────────────────────────┐
│  QA HUMANO (como ya se hace hoy)                  │
│                                                   │
│  El QA abre la app en staging, prueba el flujo    │
│  del PR manualmente, y documenta:                 │
│  - UX y diseño visual                             │
│  - Edge cases complejos                           │
│  - Sensación general de la experiencia            │
│  - Bugs en el reporte QA por slice                │
│                                                   │
│  Si encuentra un bug → se corrige Y se crea       │
│  un test automático para que no vuelva a pasar    │
└──────────────────────┬───────────────────────────┘
                       │ ✅ Aprobado
                       ▼
                 Merge a main ✅
```

**Punto clave:** Cuando QA humano encuentra un bug y se corrige, se crea un test automático que verifica que ese bug específico no vuelva a aparecer. Así, los reportes QA manuales alimentan la automatización: cada bug encontrado manualmente se convierte en un "vigilante" automático permanente.

---

## 3. Herramientas — resumen

| Herramienta | ¿Qué es? | ¿Qué hace en este proyecto? | ¿Ya está instalada? | ¿En qué capa se usa? |
|---|---|---|---|---|
| **Vitest** | Framework que ejecuta tests | Ejecuta tests unitarios (Capa 1) y de integración (Capa 2) | ✅ Ya instalado | Capa 1 y 2 |
| **fast-check** | Generador de datos aleatorios para tests | Genera miles de datos al azar para verificar que reglas se cumplan siempre | ✅ Ya instalado | Capa 1 |
| **ESLint** | Analizador de calidad de código | Revisa el código buscando errores comunes sin ejecutar la app | ✅ Ya instalado | Capa 1 |
| **TypeScript** | Lenguaje con tipos estrictos | Verifica que el código tenga tipos correctos antes de ejecutarse | ✅ Ya instalado | Capa 1 |
| **Supertest** | Librería para llamar URLs desde tests | Envía peticiones HTTP al backend NestJS dentro de los tests de Vitest | ❌ Instalar en Fase 2 | Capa 2 |
| **Playwright** | Herramienta de testing en navegador | Abre Chrome, navega por la app, hace clic, verifica pantallas | ❌ Instalar en Fase 3 | Capa 3 |
| **k6** | Herramienta de pruebas de carga | Simula cientos de usuarios al mismo tiempo para verificar que el servidor aguante | ❌ Instalar en Fase 4 | Carga (futuro) |
| **OWASP ZAP** | Escáner de seguridad web | Busca automáticamente vulnerabilidades (accesos no autorizados, inyección de datos) | ❌ Ejecutar en Docker en Fase 4 | Seguridad (futuro) |

---

## 4. Mapa de cobertura por funcionalidad

Esta tabla cubre **las 15 soluciones del Solution Map** de la iniciativa. Los números (SL01–SL15) corresponden al documento de la iniciativa.

### Soluciones Core (SL01–SL06)

| # | Solución | Capa 1: Unitaria (Vitest) | Capa 2: API (Supertest) | Capa 3: E2E (Playwright) | QA Manual | Lo que falta hacer |
|---|---|:---:|:---:|:---:|:---:|---|
| SL01 | **Panel de Administración Web** (Dashboard, CRUD agentes, gestión pedidos) | ✅ 7 tests + ⚠️ parcial en agentes | 🔨 | 🔨 | ✅ sol01-s02 a s07 | Integración del CRUD de agentes + E2E de dashboard, crear/editar/eliminar agente |
| SL02 | **Motor de Agente RAG** (query, prompt, tokens, threshold) | ✅ | 🔨 | — | — | Integración del endpoint de query (validar que devuelve fragmentos relevantes) |
| SL03 | **Motor de Agente Cotizador** (catálogo, cotizaciones, pedidos, seguimiento) | ❌ | 🔨 | 🔨 | — | Todo: unitarias de cálculos + integración de CRUD de pedidos + E2E del flujo |
| SL04 | **Motor de Agente Agendamiento** (disponibilidad, reservas, cancelación) | ❌ | 🔨 | — | — | Todo: unitarias de slots/disponibilidad + integración de reservas |
| SL05 | **Conector de WhatsApp** (webhook, firma Meta, envío/recepción, Embedded Signup) | ✅ Firma, validación | 🔨 | — | — | Integración que valide procesamiento de mensajes entrantes reales |
| SL06 | **Base de Conocimiento** (upload PDF, chunking, indexación, integraciones) | ✅ Chunking, extractor | 🔨 | 🔨 | ✅ sol06 | Integración de upload/listado/eliminación + E2E del flujo de subir PDF |

### Soluciones Transversales (SL07–SL15)

| # | Solución | Capa 1: Unitaria (Vitest) | Capa 2: API (Supertest) | Capa 3: E2E (Playwright) | QA Manual | Lo que falta hacer |
|---|---|:---:|:---:|:---:|:---:|---|
| SL07 | **Memoria Conversacional** (contexto temporal, reinicio) | ✅ | — | — | — | Cubierta. Sin acción inmediata |
| SL08 | **Escalamiento a Humano** (detección, inbox, tomar/liberar conversación) | ⚠️ Parcial | 🔨 | 🔨 | ✅ sol08 | Integración de tomar/liberar conversación + E2E del Inbox |
| SL09 | **Mensajes Proactivos** (recordatorios de citas, actualizaciones de pedido) | ❌ | 🔨 | — | — | Unitarias de scheduling/programación + integración del envío de templates |
| SL10 | **Notificaciones** (a empresa y a cliente: plataforma, WhatsApp, correo) | ✅ Parcial | 🔨 | — | — | Integración de eventos de dominio (pedido confirmado → notifica empresa, escalamiento → notifica admin) |
| SL11 | **Personalidad del Agente** (tono, nombre, idioma, restricciones, bienvenida) | ✅ Prompt building | 🔨 | 🔨 | — | Integración de guardar/leer configuración de personalidad + E2E de editar personalidad desde el panel |
| SL12 | **Métricas y Analíticas** (tasa de éxito, consultas frecuentes, métricas por tipo) | ❌ | 🔨 | — | — | Unitarias de cálculos de métricas + integración del endpoint |
| SL13 | **Integraciones Externas** (Google Drive, Calendar, Notion, Confluence, etc.) | ❌ | 🔨 | 🔨 | — | Unitarias del flujo OAuth + integración de conectores + E2E de conexión desde el panel |
| SL14 | **Gestión de Empresas y Acceso** (registro, auth, perfil, multi-empresa) | ✅ | 🔨 | 🔨 | ✅ sol14 | Integración de login/registro/refresh/perfil + E2E del flujo de auth en navegador |
| SL15 | **Procesamiento de Voz — STT** (transcripción de notas de voz con Whisper) | ❌ | 🔨 | — | — | Unitarias del pipeline de transcripción + integración del procesamiento de audio entrante |

**Leyenda:**
- ✅ = Ya existe y funciona
- 🔨 = Propuesto en esta estrategia (la herramienta está indicada en la cabecera de cada columna)
- ⚠️ = Existe parcialmente
- ❌ = No existe
- — = No aplica para esa funcionalidad

### Prioridad de implementación

Alineada con el roadmap de fases de la iniciativa — se prueban primero las soluciones que ya están implementadas o en desarrollo activo:

| Prioridad | Soluciones | Fase del roadmap | ¿Por qué en este orden? |
|---|---|---|---|
| 🔴 1 | SL14 (Auth/Empresas) + SL01 (Panel Web) | Fase 0 | Si el auth se rompe, nadie puede usar nada. El panel es la puerta de entrada |
| 🔴 2 | SL06 (Knowledge) + SL02 (RAG) + SL05 (WhatsApp) + SL07 (Memoria) + SL11 (Personalidad) | Fase 1 | Son las piezas del primer agente RAG funcional de punta a punta |
| 🟡 3 | SL08 (Escalamiento) + SL10 (Notificaciones) | Fase 2 | Red de seguridad para todos los agentes |
| 🟡 4 | SL13 (Integraciones Externas) | Fase 3 | Prerequisito para agendamiento (Google Calendar) |
| 🟢 5 | SL04 (Agendamiento) + SL09 (Mensajes Proactivos) + SL03 (Cotizador) | Fases 4-5 | Agentes especializados en desarrollo |
| 🟢 6 | SL12 (Métricas) + SL15 (STT) | Fase 6+ | Funcionalidades complementarias, se prueban cuando se implementen |

---

## 5. ¿Qué NUNCA se automatiza?

Estas pruebas siempre serán manuales y **eso está bien**:

- **UX y "sensación"** — ¿Las animaciones se sienten naturales? ¿Los efectos visuales son agresivos?
- **Diseño visual** — ¿Los colores son consistentes? ¿Los espacios se ven bien en diferentes pantallas?
- **Escenarios de negocio complejos** — Flujos que requieren múltiples sistemas conectados o condiciones difíciles de reproducir
- **Testing exploratorio** — Un QA humano navega la app sin un guión predefinido, buscando cosas que se sientan raras

Los 25 reportes QA que ya se producen cubren exactamente estos puntos. **No se eliminan. Se complementan** con la automatización: la automatización atrapa las regresiones técnicas, el QA humano atrapa los problemas de experiencia.

---

## 6. Plan de implementación por fases

### Fase 1: Arreglar el pipeline CI roto (Semana 1)

**Problema:** El archivo `.github/workflows/ci.yml` ejecuta comandos de un backend Python que ya no existe. Los tests que ya tenemos nunca se ejecutan automáticamente en GitHub.

**¿Qué se hace?** Reescribir ese archivo para que ejecute los comandos correctos del proyecto actual:
- `pnpm type-check` — TypeScript verifica que no haya errores de tipos
- `pnpm lint` — ESLint revisa la calidad del código
- `pnpm test` — Vitest ejecuta los ~50 tests unitarios

**¿Qué se instala?** Nada. Las 3 herramientas ya están en el proyecto. Solo hay que reescribir 1 archivo.

**¿Qué gana el equipo?** Cada vez que alguien sube código a GitHub, las verificaciones que ya existen se ejecutan automáticamente. Si algo falla, el desarrollador ve el error directamente en GitHub en menos de 3 minutos.

---

### Fase 2: Tests de integración de API (Semana 2-3)

**Problema:** Los 14 módulos del backend tienen URLs que reciben y devuelven datos, pero ninguna tiene un test que la llame. Si alguien rompe el login, nadie se entera hasta que un humano lo prueba.

**¿Qué se hace?**
1. Instalar la librería `supertest` (`pnpm add -D supertest`)
2. Escribir tests que levanten el backend en memoria, le envíen peticiones HTTP reales, y verifiquen las respuestas
3. En GitHub Actions, levantar un contenedor de MongoDB temporal solo para los tests
4. Agregar el comando `pnpm test:integration` al pipeline CI

**Se cubren primero (en orden de criticidad):**

| Orden | Módulo | ¿Qué se prueba? |
|---|---|---|
| 1 | Auth (SL14) | Login devuelve token, credenciales incorrectas devuelven error 401, registro crea usuario, token expirado devuelve error 403 |
| 2 | Agentes (SL01) | Crear agente devuelve 201, listar solo devuelve agentes de mi empresa, eliminar agente lo quita de la lista, crear con datos inválidos devuelve error 400 |
| 3 | Knowledge (SL06) | Subir PDF devuelve 201, archivo vacío devuelve error 400, listar fuentes devuelve las subidas, eliminar fuente la quita |
| 4 | RAG Engine (SL02) | Query con contexto devuelve fragmentos relevantes, query sin coincidencias devuelve respuesta genérica |
| 5 | Escalamiento (SL08) | Tomar conversación bloquea al bot, liberar conversación reactiva al bot |

**¿Qué se instala?** 1 librería (`supertest`).

**¿Qué gana el equipo?** Si alguien rompe una API, el PR se bloquea automáticamente en GitHub. No llega a QA manual un código que ya tiene APIs rotas.

---

### Fase 3: Tests E2E del frontend (Semana 4-6)

**Problema:** Los reportes QA manuales documentan bugs encontrados, pero no impiden que esos mismos bugs vuelvan. Ejemplo real: en el reporte sol01-s02 se encontró que la sesión se perdía al recargar. Si alguien modifica el código de sesión después del fix, el bug puede volver sin que nadie se dé cuenta hasta la siguiente ronda manual.

**¿Qué se hace?**
1. Instalar Playwright (`pnpm add -D @playwright/test`)
2. Instalar el navegador de prueba (`npx playwright install chromium`)
3. Escribir tests que abran Chrome, naveguen por la app, y verifiquen los flujos críticos
4. Agregar los tests al pipeline CI, solo en PRs dirigidos a la rama `main`

**Se automatizan primero los flujos que los reportes QA manuales ya validaron** (para prevenir que los bugs encontrados vuelvan):

| Reporte QA existente | ¿Qué se automatiza? |
|---|---|
| sol14-slice02 (autenticación) | Login completo: escribir email/clave → hacer clic en "Iniciar sesión" → verificar que cargue el dashboard |
| sol01-slice06 (eliminar agente) | Eliminar agente: abrir menú → clic en "Eliminar" → verificar diálogo de confirmación → confirmar → verificar que desaparece de la tabla |
| sol06-slice01 (ingesta knowledge) | Subir PDF: navegar a knowledge → clic en "Subir archivo" → seleccionar PDF → verificar que aparece en la lista con estado "Procesando" |
| sol01-slice02 (dashboard) | Dashboard: verificar que las tarjetas de KPIs rendericen, que los conteos sean números, que la navegación funcione |

**¿Qué se instala?** 1 herramienta (Playwright).

**¿Qué gana el equipo?** Los bugs que QA manual ya encontró y que se corrigieron quedan "vigilados" permanentemente. Si alguien los reintroduce por accidente, el PR se bloquea automáticamente.

---

### Fase 4: Carga y seguridad (Antes del primer release a clientes reales)

**No se implementa ahora.** No tiene sentido simular 100 usuarios al mismo tiempo si el producto aún no tiene usuarios reales. Se implementará cuando el producto esté en un estado estable y listo para clientes.

**¿Qué se hará cuando llegue el momento?**

| Herramienta | ¿Qué hará? | Escenarios concretos |
|---|---|---|
| **k6** (pruebas de carga) | Simular muchos usuarios al mismo tiempo para verificar que el servidor no se caiga ni se ponga lento | Enviar 100 mensajes de WhatsApp simultáneos al webhook (SL05), hacer 50 consultas RAG al mismo tiempo (SL02), 200 intentos de login concurrentes (SL14) |
| **OWASP ZAP** (seguridad) | Buscar automáticamente vulnerabilidades en la app desplegada | ¿Un usuario de la Empresa A puede ver agentes de la Empresa B? (aislamiento multitenant), ¿Se puede subir un archivo malicioso como "PDF"? (file upload), ¿Se valida la firma de Meta en el webhook de WhatsApp? |

---

## 7. Resumen para toma de decisiones

### ¿Cuántas herramientas nuevas se necesitan?

| Fase | ¿Qué se instala? | Costo |
|---|---|---|
| **Fase 1** (Semana 1) | Nada — solo reescribir 1 archivo YAML | 0 herramientas nuevas |
| **Fase 2** (Semana 2-3) | `supertest` — 1 librería que se usa dentro de Vitest | 1 librería |
| **Fase 3** (Semana 4-6) | `Playwright` — herramienta que abre Chrome automáticamente | 1 herramienta |
| **Fase 4** (Pre-release) | `k6` + `OWASP ZAP` | 2 herramientas, solo cuando haya clientes reales |

### ¿Qué gana el equipo con cada fase?

| Sin esta propuesta | Con Fase 1 | Con Fase 2 | Con Fase 3 |
|---|---|---|---|
| Un dev puede romper el login y nadie se entera hasta QA manual días después | Cada push verifica tipos, calidad de código y tests unitarios. Los errores se detectan en minutos | Cada push también verifica las APIs del backend. Si alguien rompe un endpoint, el PR se bloquea automáticamente | Los flujos críticos del panel se verifican en Chrome automáticamente. Los bugs que ya se corrigieron no pueden volver |

---

*Elaborado en base al análisis de: las 15 soluciones del Solution Map de la iniciativa, 14 módulos NestJS, 17 features frontend, 3 handlers Lambda, 25 reportes QA manuales existentes, pipeline CI actual (roto — referencia backend Python inexistente), y las configuraciones de Vitest y ESLint ya instaladas en los paquetes del proyecto.*
