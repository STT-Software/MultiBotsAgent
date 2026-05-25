# Guía: Probar Verificación del Webhook con Meta Developer

## Prerequisitos

- Deploy exitoso (`sst deploy --stage <tu-stage>`)
- URL del API Gateway (la muestra SST al terminar el deploy)
- Secret configurado: `sst secrets set WhatsAppVerifyToken "<tu-token>" --stage <tu-stage>`

---

## Paso 1: Crear cuenta de desarrollador en Meta

1. Ve a [developers.facebook.com](https://developers.facebook.com)
2. Inicia sesión con tu cuenta de Facebook personal
3. Click en "Comenzar" o "Get Started"
4. Acepta los términos de desarrollador
5. Verifica tu cuenta (puede pedir número de teléfono)

> No necesitas tarjeta de crédito ni aprobación especial.

---

## Paso 2: Crear una App de Meta

1. En el dashboard de desarrollador, click **"Crear app"**
2. Selecciona caso de uso: **"Otro"** (Other)
3. Tipo de app: **"Business"**
4. Ponle un nombre (ej: "MultiBotsAgent Dev")
5. Click **"Crear app"**

---

## Paso 3: Agregar producto WhatsApp

1. En tu app, ve a **"Agregar productos"** en el menú lateral
2. Busca **"WhatsApp"** y click **"Configurar"**
3. Selecciona o crea una cuenta de Meta Business (es gratis para desarrollo)
4. Meta te asignará un número de prueba automáticamente

---

## Paso 4: Configurar el Webhook

1. En el menú lateral: **WhatsApp → Configuración** (o Configuration)
2. En la sección **"Webhook"**, click **"Editar"**
3. Completa los campos:

| Campo | Valor |
|-------|-------|
| **URL de devolución de llamada** | `https://<tu-api-gateway-url>/webhooks/whatsapp` |
| **Token de verificación** | El mismo valor que configuraste con `sst secrets set` |

4. Click **"Verificar y guardar"**

### ¿Qué pasa al dar click?

```
Meta → GET https://<tu-url>/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<tu-token>&hub.challenge=<random>
Tu Lambda → valida token → responde 200 con el challenge
Meta → ✅ Webhook verificado
```

Si todo está bien, verás un mensaje de éxito. El webhook queda verificado.

---

## Paso 5: Suscribirse a eventos (opcional)

Después de verificar, puedes suscribirte a eventos:

1. En la misma sección de Webhook, click **"Administrar"**
2. Selecciona los campos a los que quieres suscribirte:
   - `messages` — mensajes entrantes
   - `message_deliveries` — confirmaciones de entrega
   - `message_reads` — confirmaciones de lectura

> Nota: El POST handler es un placeholder por ahora. Solo la verificación (GET) está implementada.

---

## Troubleshooting

### "La URL de devolución de llamada no se pudo validar"

| Causa probable | Solución |
|----------------|----------|
| Lambda no desplegada | Verifica con `curl` primero (ver abajo) |
| Token no coincide | Verifica que el secret y el campo en Meta sean idénticos |
| URL incorrecta | Debe ser HTTPS, sin trailing slash |
| Timeout | Revisa logs en CloudWatch |

### Verificar manualmente con curl antes de Meta

```bash
# Simula exactamente lo que Meta envía
curl -v "https://<tu-api-url>/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<tu-token>&hub.challenge=test123"

# Respuesta esperada:
# HTTP/2 200
# content-type: text/plain
# body: test123
```

Si curl funciona, Meta también funcionará.

### Ver logs de la Lambda

```bash
# Opción 1: Consola SST
sst console

# Opción 2: AWS CLI
aws logs tail /aws/lambda/<nombre-de-tu-lambda> --follow --profile multibot
```

---

## Resumen del flujo completo

```
┌─────────────────────────────────────────────────────────┐
│ 1. sst deploy --stage dev                               │
│ 2. sst secrets set WhatsAppVerifyToken "abc123"         │
│ 3. curl para verificar que funciona                     │
│ 4. Pegar URL + token en Meta → Verificar y guardar      │
│ 5. ✅ Webhook verificado                                │
└─────────────────────────────────────────────────────────┘
```

---

## Limitaciones del modo desarrollo

| Recurso | Límite sandbox |
|---------|----------------|
| Número de prueba | 1 (asignado por Meta) |
| Destinatarios | Hasta 5 números verificados |
| Webhooks | Sin límite (funcionan igual que producción) |
| Rate limit | 80 mensajes/segundo |
| Costo | Gratis |

Para pasar a producción necesitas: verificación de negocio, número propio, y aprobación de Meta.
