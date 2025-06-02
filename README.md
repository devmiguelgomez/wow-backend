# Backend - Wow Chatbot

Este es el backend para la aplicación Wow Chatbot, un chatbot que simula conversaciones con personajes de World of Warcraft utilizando la API de Google Gemini.

## 🚀 Tecnologías Utilizadas

- **Node.js**: Runtime de JavaScript en el servidor
- **Express.js**: Framework web para Node.js
- **Google Gemini API**: API de inteligencia artificial para generar respuestas contextuales
- **CORS**: Middleware para manejar solicitudes cross-origin
- **dotenv**: Para manejar variables de entorno
- **Vercel**: Plataforma de despliegue

## 📁 Estructura del Proyecto

```
backend/
├── controllers/     # Controladores de la aplicación
├── models/         # Modelos de datos
├── routes/         # Rutas de la API
├── server.js       # Punto de entrada de la aplicación
├── package.json    # Dependencias y scripts
└── vercel.json     # Configuración de despliegue en Vercel
```

## 🔧 Configuración

1. Instalar dependencias:
```bash
npm install
```

2. Crear archivo `.env` con las siguientes variables:
```
GEMINI_API_KEY=tu_api_key_de_google
```

3. Iniciar el servidor:
```bash
npm start
```

## 🌐 Endpoints

### POST /api/chat
- **Descripción**: Endpoint principal para la conversación con el chatbot
- **Body**:
  ```json
  {
    "message": "mensaje del usuario",
    "faction": "alliance|horde",
    "sessionId": "id_de_sesión"
  }
  ```
- **Respuesta**:
  ```json
  {
    "response": "respuesta del chatbot",
    "sessionId": "id_de_sesión"
  }
  ```

## 🤖 Funcionalidad

El backend maneja:
1. Comunicación con la API de Google Gemini
2. Gestión de sesiones de chat
3. Personalización de respuestas según la facción seleccionada (Alianza/Horda)
4. Manejo de errores y validaciones
5. CORS para permitir solicitudes desde el frontend

## 🚀 Despliegue

El backend está configurado para desplegarse en Vercel. La configuración se encuentra en `vercel.json`.

# wow-backend
