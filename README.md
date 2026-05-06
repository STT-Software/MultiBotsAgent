<div align="center">

<!-- Header Banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6366f1,50:8b5cf6,100:06b6d4&height=220&section=header&text=MultiBotAgents&fontSize=52&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=Plataforma%20de%20Agentes%20Conversacionales%20Inteligentes&descSize=18&descAlignY=55&descColor=e0e7ff" width="100%" />

<!-- Badges -->
<p>
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/NestJS-10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/AWS-Cloud-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" />
  <img src="https://img.shields.io/badge/SST-v3-E27152?style=for-the-badge&logo=serverless&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Turborepo-2.3-0F172A?style=for-the-badge&logo=turborepo&logoColor=white" />
  <img src="https://img.shields.io/badge/pnpm-9.x-F69220?style=for-the-badge&logo=pnpm&logoColor=white" />
</p>

<!-- Short Description -->
<p><strong>Plataforma plug & play para configurar, desplegar y gestionar agentes de IA especializados sobre canales de mensajería masiva.</strong></p>

<p>
  <a href="#-inicio-rápido">Inicio Rápido</a> •
  <a href="#-arquitectura">Arquitectura</a> •
  <a href="#-estructura-del-proyecto">Estructura</a> •
  <a href="#-desarrollo-local">Desarrollo</a> •
  <a href="#-despliegue">Despliegue</a> •
  <a href="#-documentación">Docs</a>
</p>

</div>

---

## 🎯 Visión del Producto

> Permitir a empresas activar agentes de IA como módulos configurables sobre WhatsApp, sin desarrollo custom, desde un panel de administración intuitivo.

<table>
<tr>
<td width="33%" align="center">
  <img width="60" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" />
  <br /><strong>Panel Web</strong>
  <br /><sub>Gestión de agentes, métricas e inbox</sub>
</td>
<td width="33%" align="center">
  <img width="60" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-plain-wordmark.svg" />
  <br /><strong>Cloud Native</strong>
  <br /><sub>Lambdas + Fargate en AWS</sub>
</td>
<td width="33%" align="center">
  <img width="60" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" />
  <br /><strong>Multi-Agente</strong>
  <br /><sub>RAG, Cotizador, Agendamiento</sub>
</td>
</tr>
</table>

---

## ⚡ Inicio Rápido

### Prerequisitos

| Herramienta | Versión | Instalación |
|-------------|---------|-------------|
| Node.js | >= 18 | [nvm](https://github.com/nvm-sh/nvm) |
| pnpm | >= 9.x | `npm install -g pnpm` |
| Docker | Latest | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| AWS CLI | v2 | [AWS CLI](https://aws.amazon.com/cli/) |
| SST CLI | v3 | [SST Docs](https://sst.dev) |

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/multibotagents.git
cd multibotagents

# 2. Instalar dependencias
pnpm install

# 3. Verificar que todo compila
pnpm run type-check

# 4. Build completo
pnpm run build
```

---

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTES                                     │
│   📱 WhatsApp Business API    🌐 Panel Web (Next.js 15)             │
└──────────────┬────────────────────────────────┬─────────────────────┘
               │                                │
┌──────────────▼────────────────────────────────▼─────────────────────┐
│                        AWS CLOUD (us-east-1)                         │
│                                                                      │
│  ┌─────────────────────┐    ┌──────────────────────────────────┐    │
│  │   API Gateway        │    │   CloudFront + S3                 │    │
│  │   (REST/WebSocket)   │    │   (Frontend SSR)                  │    │
│  └──────────┬───────────┘    └──────────────────────────────────┘    │
│             │                                                        │
│  ┌──────────▼───────────┐    ┌──────────────────────────────────┐    │
│  │   Lambda Handlers    │    │   ECS Fargate                     │    │
│  │   (TypeScript nativo)│    │   (NestJS Services)               │    │
│  │                      │    │                                    │    │
│  │  • Webhooks          │    │  • API Multi-Bots                 │    │
│  │  • Event processors  │    │  • Agent Engines                  │    │
│  │  • Async tasks       │    │  • Background Workers             │    │
│  └──────────┬───────────┘    └───────────────┬──────────────────┘    │
│             │                                │                        │
│  ┌──────────▼────────────────────────────────▼──────────────────┐    │
│  │                    Shared Layer                                │    │
│  │  📦 @multibotagents/core    (Lógica de negocio)               │    │
│  │  📦 @multibotagents/types   (Tipos compartidos)               │    │
│  │  📦 @multibotagents/db      (Adaptadores de BD)               │    │
│  └──────────────────────────────┬───────────────────────────────┘    │
│                                 │                                     │
│  ┌──────────────────────────────▼───────────────────────────────┐    │
│  │                    Data Layer                                  │    │
│  │  🍃 MongoDB Atlas    ⚡ DynamoDB    🐘 PostgreSQL              │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
multibotagents/
├── 📂 apps/
│   ├── 📂 web/                  → Frontend Next.js 15 (App Router)
│   ├── 📂 functions/            → AWS Lambda handlers (TypeScript nativo)
│   └── 📂 services/
│       └── 📂 api-multi-bots/   → Servicio NestJS en Fargate
│
├── 📂 packages/
│   ├── 📂 types/                → @multibotagents/types — Tipos compartidos
│   ├── 📂 core/                 → @multibotagents/core — Lógica de negocio
│   ├── 📂 db/                   → @multibotagents/db — Capa de BD (adaptadores)
│   └── 📂 config/               → @multibotagents/config — TSConfig + ESLint
│
├── 📂 infra/                    → Infraestructura SST v3 (Ion/Pulumi)
│   └── 📂 src/
│       ├── apis/                → API Gateway definitions
│       ├── databases/           → MongoDB, DynamoDB
│       ├── networking/          → VPC, subnets
│       └── services/            → ECS Fargate services
│
├── 📂 Documentacion/            → Documentación de producto
├── 📂 infra-docs/               → Documentación de infraestructura
├── 📄 sst.config.ts             → Configuración raíz SST
├── 📄 turbo.json                → Pipeline de Turborepo
├── 📄 docker-compose.yml        → Servicios para desarrollo local
└── 📄 pnpm-workspace.yaml       → Definición del workspace
```

---

## 💻 Desarrollo Local

### Opción 1: Desarrollo completo con AWS

```bash
# Terminal 1 — Lambdas con live reload
sst dev --stage tu-nombre

# Terminal 2 — Servicio NestJS
pnpm --filter @multibotagents/api-multi-bots dev

# Terminal 3 — Frontend Next.js
pnpm --filter @multibotagents/web dev
```

### Opción 2: Servicios con Docker

```bash
# Levantar servicios Fargate localmente
docker-compose up

# Solo un servicio específico
docker-compose up api-multi-bots
```

### Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `pnpm run build` | 🔨 Build de todas las apps |
| `pnpm run type-check` | ✅ Verificación de tipos |
| `pnpm run lint` | 🔍 Lint del monorepo |
| `pnpm run clean` | 🧹 Limpiar builds y node_modules |
| `pnpm run dev` | 🚀 Dev mode (todas las apps) |

### Filtrar por paquete

```bash
pnpm --filter @multibotagents/web <comando>
pnpm --filter @multibotagents/core <comando>
pnpm --filter @multibotagents/functions <comando>
pnpm --filter @multibotagents/api-multi-bots <comando>
```

---

## 🚀 Despliegue

### Stages

| Stage | Uso | Política |
|-------|-----|----------|
| `tu-nombre` | Desarrollo personal | Efímero |
| `dev` | Desarrollo compartido | Efímero |
| `prod` | Producción | `retain` en recursos críticos |

### Comandos de deploy

```bash
# Deploy a stage personal
sst deploy --stage tu-nombre

# Deploy a desarrollo
sst deploy --stage dev

# Deploy a producción
sst deploy --stage prod

# Eliminar un stage (⚠️ destructivo)
sst remove --stage tu-nombre
```

### Gestión de secrets

```bash
sst secrets list --stage dev
sst secrets set API_KEY "valor" --stage dev
sst secrets remove API_KEY --stage dev
```

---

## 🧩 Agentes Disponibles

<table>
<tr>
<td width="33%" valign="top">

### 🧠 Agente RAG

Responde preguntas basándose en la base de conocimiento configurada.

- ✅ Consulta documentos
- ✅ Soporte multimedia
- ✅ Memoria temporal
- ✅ Personalidad configurable
- ✅ Escalamiento a humano

</td>
<td width="33%" valign="top">

### 🛒 Agente Cotizador

Gestiona catálogos, cotizaciones y seguimiento de pedidos.

- ✅ Consulta de catálogo
- ✅ Armado de cotizaciones
- ✅ Confirmación de pedidos
- ✅ Seguimiento de estado
- ✅ Notificaciones multi-canal

</td>
<td width="33%" valign="top">

### 📅 Agente Agendamiento

Gestiona citas con integración a Google Calendar.

- ✅ Verificar disponibilidad
- ✅ Agendar citas
- ✅ Recordatorios proactivos
- ✅ Cancelar/Reprogramar
- ✅ Configuración de horarios

</td>
</tr>
</table>

---

## 🛠 Stack Tecnológico

<table>
<tr>
<th>Capa</th>
<th>Tecnología</th>
<th>Propósito</th>
</tr>
<tr>
<td><strong>Frontend</strong></td>
<td><img src="https://img.shields.io/badge/Next.js_15-black?logo=next.js" /></td>
<td>Panel de administración (App Router + RSC)</td>
</tr>
<tr>
<td><strong>API Serverless</strong></td>
<td><img src="https://img.shields.io/badge/AWS_Lambda-FF9900?logo=awslambda&logoColor=white" /></td>
<td>Handlers de eventos, webhooks, tareas async</td>
</tr>
<tr>
<td><strong>Servicios</strong></td>
<td><img src="https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white" /></td>
<td>APIs REST en ECS Fargate</td>
</tr>
<tr>
<td><strong>Base de Datos</strong></td>
<td><img src="https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white" /></td>
<td>Almacenamiento principal</td>
</tr>
<tr>
<td><strong>Infra as Code</strong></td>
<td><img src="https://img.shields.io/badge/SST_v3-E27152?logo=serverless&logoColor=white" /></td>
<td>Infraestructura declarativa (Ion/Pulumi)</td>
</tr>
<tr>
<td><strong>Monorepo</strong></td>
<td><img src="https://img.shields.io/badge/Turborepo-0F172A?logo=turborepo&logoColor=white" /></td>
<td>Orquestación de builds y tasks</td>
</tr>
<tr>
<td><strong>Package Manager</strong></td>
<td><img src="https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white" /></td>
<td>Gestión de dependencias del workspace</td>
</tr>
<tr>
<td><strong>Lenguaje</strong></td>
<td><img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" /></td>
<td>Strict mode en todo el monorepo</td>
</tr>
<tr>
<td><strong>Contenedores</strong></td>
<td><img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" /></td>
<td>Desarrollo local y deploy de servicios</td>
</tr>
</table>

---

## 📐 Patrones de Arquitectura

| Patrón | Descripción |
|--------|-------------|
| **Handlers nativos** | Lambdas sin framework, tipado directo de eventos AWS |
| **Servicios NestJS** | APIs REST con inyección de dependencias en Fargate |
| **Core aislado** | Lógica de negocio sin dependencias de infraestructura |
| **Adaptador de BD** | Patrón adaptador para MongoDB, PostgreSQL, DynamoDB |
| **Tipos compartidos** | DTOs, interfaces y enums centralizados |
| **Config centralizada** | TSConfig y ESLint base extendidos por cada paquete |

---

## 📚 Documentación

| Documento | Contenido |
|-----------|-----------|
| [01 - Visión General](infra-docs/01-vision-general.md) | Propósito y alcance del proyecto |
| [02 - Estructura](infra-docs/02-estructura-proyecto.md) | Organización del monorepo |
| [03 - Config Raíz](infra-docs/03-configuracion-raiz.md) | Archivos de configuración principales |
| [04 - Configs Compartidas](infra-docs/04-configuraciones-compartidas.md) | TSConfig y ESLint centralizados |
| [05 - Paquetes](infra-docs/05-paquetes-compartidos.md) | Paquetes internos del workspace |
| [06 - Aplicaciones](infra-docs/06-aplicaciones.md) | Apps del monorepo |
| [07 - Infraestructura](infra-docs/07-infraestructura-sst.md) | SST v3 y recursos AWS |
| [08 - Desarrollo Local](infra-docs/08-desarrollo-local.md) | Setup del entorno de desarrollo |
| [09 - Comandos](infra-docs/09-comandos-y-dependencias.md) | CLI y dependencias |
| [10 - Docker](infra-docs/10-docker-y-servicios.md) | Contenedores y servicios |
| [ARCHITECTURE](infra-docs/ARCHITECTURE.md) | Visión completa de arquitectura |

---

## 🗺 Roadmap

```mermaid
gantt
    title Roadmap de Ejecución
    dateFormat  YYYY-MM-DD
    section Fase 0
    Panel Web + Empresas           :f0, 2026-05-01, 30d
    section Fase 1
    Motor RAG + WhatsApp           :f1, after f0, 45d
    section Fase 2
    Escalamiento + Notificaciones  :f2, after f1, 30d
    section Fase 3
    Integraciones Externas         :f3, after f0, 60d
    section Fase 4
    Agente Agendamiento            :f4, after f2, 30d
    section Fase 5
    Agente Cotizador               :f5, after f2, 30d
    section Fase 6
    Métricas y Analíticas          :f6, after f4, 20d
```
---

## 📄 Licencia

ST&T LTDA 2026 —  Todos los derechos reservados.

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6366f1,50:8b5cf6,100:06b6d4&height=100&section=footer" width="100%" />

<sub>Construido con 💜 usando TypeScript, AWS y mucha IA</sub>

</div>
