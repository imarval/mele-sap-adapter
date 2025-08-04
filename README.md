# SAPAdapter - Cliente de Integración SAP

Un robusto adaptador de integración para conectar sistemas SAP ERP con IntegrationBridge usando RFC/BAPI. Construido con arquitectura limpia (Clean Architecture) y soporte completo para comunicación en tiempo real vía SignalR y webhooks HTTP.

## Características Principales

- **🏗️ Arquitectura Limpia**: Separación clara de responsabilidades con capas de Dominio, Aplicación e Infraestructura
- **🔗 Conectividad SAP RFC**: Integración nativa con SAP usando node-rfc y BAPIs estándar
- **🔄 Comunicación Dual**: Soporte para SignalR (tiempo real) y webhooks HTTP
- **📦 Persistencia Local**: Almacenamiento SQLite para eventos y registros SAP
- **🔄 Reintentos Automáticos**: Lógica configurable de reintentos para eventos fallidos
- **📊 Monitoreo Completo**: Health checks, métricas y estadísticas detalladas
- **⚙️ Configuración Flexible**: JSON + variables de entorno
- **🚀 Listo para Producción**: Logging completo, manejo de errores y apagado elegante

## Instalación Rápida

### Prerrequisitos

1. **Node.js 16+** y **npm 7+**
2. **SAP NetWeaver RFC SDK** (descargue desde SAP Support Portal)
3. **Sistema SAP** accesible con credenciales RFC

### Configuración del SDK SAP

```bash
# Descargar SAP NetWeaver RFC SDK 7.50 PL 7 o superior
# Extraer y configurar variables de entorno

# Linux/macOS
export SAPNWRFC_HOME=/path/to/nwrfcsdk
export LD_LIBRARY_PATH=$SAPNWRFC_HOME/lib:$LD_LIBRARY_PATH

# Windows
set SAPNWRFC_HOME=C:\path\to\nwrfcsdk
set PATH=%SAPNWRFC_HOME%\lib;%PATH%
```

### Instalación del Adaptador

```bash
# Clonar el repositorio
git clone https://github.com/imarval/mele-sap-adapter.git
cd mele-sap-adapter

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con su configuración SAP
```

## Configuración

### Configuración Básica

Cree o edite `config/default.json`:

```json
{
  "sap": {
    "enabled": true,
    "host": "sap-server.empresa.com",
    "systemNumber": "00",
    "client": "100",
    "user": "RFC_USER",
    "passwd": "password",
    "language": "ES",
    "companyCode": "1000",
    "plant": "1000"
  },
  "signalR": {
    "enabled": true,
    "url": "https://integration-bridge.empresa.com/hubs/outbound-events",
    "subscriptionId": "sap-tenant-prod"
  },
  "webhook": {
    "enabled": true,
    "port": 3000,
    "secret": "webhook-secret-seguro"
  }
}
```

### Variables de Entorno

```bash
# Configuración SAP
SAP_HOST=sap-server.empresa.com
SAP_SYSTEM_NUMBER=00
SAP_CLIENT=100
SAP_USER=RFC_USER
SAP_PASSWORD=password_seguro
SAP_LANGUAGE=ES
SAP_COMPANY_CODE=1000
SAP_PLANT=1000

# Configuración SignalR
SIGNALR_URL=https://integration-bridge.empresa.com/hubs/outbound-events
SIGNALR_SUBSCRIPTION_ID=sap-tenant-prod

# Configuración Webhook
WEBHOOK_PORT=3000
WEBHOOK_SECRET=webhook_secret_muy_seguro

# Configuración de Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/sap-adapter.log
```

## Uso Básico

### Inicialización Rápida

```javascript
const { SAPAdapter } = require('@integrationbridge/sap-adapter');

async function main() {
  // Crear instancia del adaptador
  const adapter = new SAPAdapter({
    sap: {
      host: 'sap-server.empresa.com',
      systemNumber: '00',
      client: '100',
      user: 'RFC_USER',
      passwd: 'password',
      companyCode: '1000'
    },
    signalR: {
      url: 'https://bridge.empresa.com/hubs/outbound-events',
      subscriptionId: 'sap-tenant'
    },
    webhook: {
      port: 3000
    }
  });

  // Iniciar el adaptador
  await adapter.start();
  
  console.log('Adaptador SAP ejecutándose!');
  console.log(`Webhook URL: http://localhost:3000/webhook/events`);
}

main().catch(console.error);
```

### Procesamiento de Eventos

```javascript
// Registrar manejador de eventos personalizado
adapter.onEvent((eventType, data) => {
  console.log('Evento procesado:', {
    tipo: eventType,
    eventoId: data.integrationEvent?.eventId,
    exitoso: data.result?.success,
    tiempoProcesamiento: data.result?.processingTime
  });
});

// Procesar evento manualmente
const evento = {
  eventType: 'Create',
  entityType: 'Product',
  eventId: 'producto-001',
  timeStamp: new Date().toISOString(),
  payload: {
    data: {
      id: 'MAT001',
      name: 'Producto de Prueba',
      type: 'FERT',
      baseUnit: 'EA',
      materialGroup: 'PRODUCTOS'
    }
  }
};

const resultado = await adapter.processEvent(evento);
console.log('Resultado:', resultado.success ? 'Éxito' : 'Error');
```

## Arquitectura

### Estructura del Proyecto

```
SAPAdapter/
├── src/
│   ├── domain/                 # Lógica de negocio y entidades
│   │   ├── entities/          # Entidades del dominio (IntegrationEvent, SAPRecord)
│   │   ├── interfaces/        # Contratos de repositorios y servicios
│   │   └── services/          # Servicios del dominio
│   ├── infrastructure/        # Detalles técnicos externos
│   │   ├── sap/              # Servicio RFC/BAPI de SAP
│   │   ├── signalr/          # Cliente SignalR
│   │   ├── http/             # Servidor webhook HTTP
│   │   └── database/         # Repositorios SQLite
│   └── application/          # Casos de uso y orquestación
│       ├── handlers/         # Manejadores de eventos
│       └── services/         # Servicios de aplicación (SAPAdapter)
├── config/                   # Archivos de configuración
├── examples/                # Ejemplos de uso
└── scripts/                 # Scripts de utilidad
```

### Principios de Arquitectura Limpia

- **Capa de Dominio**: Entidades SAP, eventos de integración y reglas de negocio
- **Capa de Aplicación**: Orquestación y casos de uso específicos de SAP
- **Capa de Infraestructura**: RFC SAP, SignalR, HTTP, base de datos
- **Inversión de Dependencias**: Las capas internas no dependen de las externas

## Entidades SAP Soportadas

### Materiales (Products)
- **Tabla SAP**: MARA
- **BAPI Create**: BAPI_MATERIAL_SAVEDATA
- **BAPI Update**: BAPI_MATERIAL_SAVEDATA
- **BAPI Read**: BAPI_MATERIAL_GET_DETAIL

```javascript
// Ejemplo de evento de Material
{
  eventType: 'Create',
  entityType: 'Product',
  payload: {
    data: {
      id: 'MAT001',
      name: 'Producto Ejemplo',
      type: 'FERT',           // Tipo de material
      baseUnit: 'EA',         // Unidad base
      materialGroup: 'GRUPO1', // Grupo de material
      weight: 1.5,
      description: 'Descripción del producto'
    }
  }
}
```

### Clientes (Customers)
- **Tabla SAP**: KNA1
- **BAPI Create**: BAPI_CUSTOMER_CREATEFROMDATA1
- **BAPI Update**: BAPI_CUSTOMER_CHANGE
- **BAPI Read**: BAPI_CUSTOMER_GETDETAIL2

### Usuarios (Users)
- **Tabla SAP**: USR02
- **BAPI Create**: BAPI_USER_CREATE1
- **BAPI Update**: BAPI_USER_CHANGE
- **BAPI Read**: BAPI_USER_GET_DETAIL

### Centros/Tiendas (Stores/Plants)
- **Tabla SAP**: T001W
- **BAPI Create**: BAPI_PLANT_CREATE
- **BAPI Update**: BAPI_PLANT_CHANGE
- **BAPI Read**: BAPI_PLANT_GETDETAIL

## Métodos de Comunicación

### SignalR (Tiempo Real)

Recibe eventos inmediatamente cuando ocurren en IntegrationBridge:

```javascript
const config = {
  signalR: {
    enabled: true,
    url: 'https://bridge.empresa.com/hubs/outbound-events',
    subscriptionId: 'sap-tenant-prod',
    autoReconnect: true,
    timeout: 30000
  }
};
```

### HTTP Webhooks

Endpoint HTTP para recibir eventos vía POST:

```bash
# Enviar evento de prueba
curl -X POST http://localhost:3000/webhook/events \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=signature" \
  -d '{
    "eventType": "Create",
    "entityType": "Product",
    "eventId": "test-001",
    "timeStamp": "2024-01-01T00:00:00Z",
    "payload": {
      "data": {
        "id": "MAT001",
        "name": "Producto de Prueba",
        "type": "FERT"
      }
    }
  }'
```

## Monitoreo y Operaciones

### Health Checks

```bash
# Verificar estado del adaptador
curl http://localhost:3000/health

# Respuesta esperada
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "sap": {
      "connected": true,
      "responseTime": 150
    },
    "signalR": {
      "connected": true,
      "state": "Connected"
    },
    "webhook": {
      "running": true,
      "port": 3000
    }
  }
}
```

### Estadísticas de Rendimiento

```javascript
// Obtener estadísticas del adaptador
const status = adapter.getStatus();
console.log('Estadísticas:', {
  eventosRocesados: status.stats.eventsProcessed,
  eventosExitosos: status.stats.eventsSuccessful,
  eventosFallidos: status.stats.eventsFailed,
  tiempoPromedioMS: status.stats.averageProcessingTime,
  tiempoActividad: status.uptime
});
```

### Logs y Debugging

```javascript
// Configurar logging detallado
const config = {
  logging: {
    level: 'debug',
    console: { enabled: true, colorize: true },
    file: {
      enabled: true,
      filename: './logs/sap-adapter.log',
      maxsize: 10485760,
      maxFiles: 5
    }
  }
};
```

## Despliegue en Producción

### Docker

```dockerfile
FROM node:18-alpine

# Instalar dependencias del sistema para SAP RFC SDK
RUN apk add --no-cache \
    gcc \
    g++ \
    make \
    python3 \
    libc-dev

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p data logs

# Configurar SDK SAP (debe montarse como volumen)
ENV SAPNWRFC_HOME=/opt/sap/nwrfcsdk
ENV LD_LIBRARY_PATH=$SAPNWRFC_HOME/lib:$LD_LIBRARY_PATH

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD [\"node\", \"examples/basic-usage.js\"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  sap-adapter:
    build: .
    ports:
      - \"3000:3000\"
    environment:
      - NODE_ENV=production
      - SAP_HOST=sap-server.empresa.com
      - SAP_CLIENT=100
      - SAP_USER=RFC_USER
      - SAP_PASSWORD=password_seguro
      - SIGNALR_URL=https://bridge.empresa.com/hubs/outbound-events
      - SIGNALR_SUBSCRIPTION_ID=sap-tenant-prod
      - WEBHOOK_SECRET=webhook_secret_seguro
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./sap-sdk:/opt/sap/nwrfcsdk:ro
    restart: unless-stopped
    healthcheck:
      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:3000/health\"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sap-adapter
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sap-adapter
  template:
    metadata:
      labels:
        app: sap-adapter
    spec:
      containers:
      - name: sap-adapter
        image: mele/sap-adapter:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: \"production\"
        - name: SAP_HOST
          valueFrom:
            secretKeyRef:
              name: sap-credentials
              key: host
        - name: SAP_USER
          valueFrom:
            secretKeyRef:
              name: sap-credentials
              key: user
        - name: SAP_PASSWORD
          valueFrom:
            secretKeyRef:
              name: sap-credentials
              key: password
        volumeMounts:
        - name: sap-sdk
          mountPath: /opt/sap/nwrfcsdk
          readOnly: true
        - name: data-volume
          mountPath: /app/data
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: sap-sdk
        configMap:
          name: sap-sdk-config
      - name: data-volume
        persistentVolumeClaim:
          claimName: sap-adapter-data
---
apiVersion: v1
kind: Service
metadata:
  name: sap-adapter-service
spec:
  selector:
    app: sap-adapter
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

## Configuración Avanzada

### Mapeo de Entidades Personalizado

```json
{
  \"entityMappings\": {
    \"Product\": {
      \"sapEntityType\": \"MATERIAL\",
      \"bapiCreate\": \"BAPI_MATERIAL_SAVEDATA\",
      \"keyField\": \"MATERIAL\",
      \"fieldMappings\": {
        \"id\": \"MATERIAL\",
        \"name\": \"DESCRIPTION\",
        \"category\": \"MATERIAL_GROUP\",
        \"baseUnit\": \"BASE_UOM\"
      }
    },
    \"CustomEntity\": {
      \"sapEntityType\": \"ZCUSTOM\",
      \"bapiCreate\": \"Z_BAPI_CUSTOM_CREATE\",
      \"bapiUpdate\": \"Z_BAPI_CUSTOM_UPDATE\",
      \"table\": \"ZCUSTOM_TABLE\",
      \"keyField\": \"CUSTOM_ID\"
    }
  }
}
```

### Configuración de Reintentos

```json
{
  \"processing\": {
    \"maxRetries\": 5,
    \"retryDelay\": 2000,
    \"exponentialBackoff\": true,
    \"retryableErrors\": [
      \"RFC_ERROR_COMMUNICATION\",
      \"RFC_ERROR_TIMEOUT\",
      \"BAPI_TEMPORARY_ERROR\"
    ]
  }
}
```

### Validación de Firma Webhook

```json
{
  \"webhook\": {
    \"secret\": \"webhook-secret-muy-seguro\",
    \"signatureAlgorithm\": \"sha256\",
    \"validateSignature\": true
  }
}
```

## Testing

### Pruebas Unitarias

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar con cobertura
npm run test:coverage

# Ejecutar en modo watch
npm run test:watch
```

### Pruebas de Integración

```bash
# Configurar variables de entorno de prueba
export SAP_HOST=sap-test.empresa.com
export SAP_CLIENT=100
export SAP_USER=TEST_USER
export SAP_PASSWORD=test_password

# Ejecutar pruebas de integración
npm run test:integration
```

### Pruebas Manuales

```bash
# Validar conexión RFC
node scripts/validate-rfc-connection.js

# Probar endpoint webhook
curl -X POST http://localhost:3000/webhook/test \
  -H \"Content-Type: application/json\" \
  -d '{\"message\": \"test\"}'

# Verificar health check
curl http://localhost:3000/health
```

## Solución de Problemas

### Errores Comunes

#### 1. Error de Conexión SAP RFC
```
Error: RFC_ERROR_COMMUNICATION
```

**Solución**:
- Verificar conectividad de red al servidor SAP
- Validar credenciales RFC (usuario, contraseña, cliente)
- Confirmar que el usuario tiene permisos RFC
- Verificar que el sistema SAP está ejecutándose

#### 2. Error de SDK SAP
```
Error: Cannot find module 'node-rfc'
```

**Solución**:
```bash
# Instalar SAP NetWeaver RFC SDK
# Configurar variables de entorno
export SAPNWRFC_HOME=/path/to/nwrfcsdk
export LD_LIBRARY_PATH=$SAPNWRFC_HOME/lib:$LD_LIBRARY_PATH

# Reinstalar node-rfc
npm rebuild node-rfc
```

#### 3. Error de SignalR
```
SignalR connection failed
```

**Solución**:
- Verificar URL del hub SignalR
- Validar subscription ID/tenant ID
- Comprobar conectividad de red
- Revisar logs del servidor IntegrationBridge

#### 4. Errores BAPI
```
BAPI_MATERIAL_SAVEDATA failed: Missing required field
```

**Solución**:
- Revisar mapeo de campos en configuración
- Validar datos de entrada contra requisitos SAP
- Consultar documentación BAPI específica
- Verificar permisos del usuario RFC

### Logs de Debug

Habilitar logging detallado:

```json
{
  \"logging\": {
    \"level\": \"debug\",
    \"console\": { \"enabled\": true, \"colorize\": true }
  }
}
```

### Monitoreo de Performance

```javascript
// Habilitar métricas detalladas
const config = {
  monitoring: {
    enabled: true,
    metrics: {
      enabled: true,
      interval: 60000,
      includeSystemMetrics: true
    }
  }
};
```

## Scripts de Utilidad

### Validación de Conexión SAP

```bash
# Probar conexión RFC
node scripts/validate-rfc-connection.js

# Salida esperada:
# ✓ SAP connection successful
# ✓ RFC_SYSTEM_INFO executed
# ✓ System: NPL (SAP NetWeaver 7.54)
```

### Configuración Inicial

```bash
# Configurar entorno SAP automáticamente
node scripts/setup-sap-environment.js

# Generar certificados para HTTPS
node scripts/generate-certificates.js
```

## Contribuir

### Estructura de Desarrollo

```bash
# Clonar repositorio
git clone https://github.com/imarval/mele-sap-adapter.git
cd mele-sap-adapter

# Instalar dependencias de desarrollo
npm install

# Configurar hooks de pre-commit
npm run prepare

# Ejecutar en modo desarrollo
npm run dev
```

### Guías de Contribución

1. **Fork** el repositorio
2. **Crear** rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Implementar** cambios siguiendo las convenciones de código
4. **Escribir** pruebas para nuevas funcionalidades
5. **Ejecutar** test suite completo (`npm test`)
6. **Commit** cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
7. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
8. **Abrir** Pull Request

### Convenciones de Código

- **ESLint**: Seguir configuración estándar
- **Prettier**: Formateo automático de código
- **JSDoc**: Documentar todas las funciones públicas
- **Testing**: Cobertura mínima del 80%

## Licencia

MIT License - ver archivo [LICENSE](LICENSE) para detalles.

---
