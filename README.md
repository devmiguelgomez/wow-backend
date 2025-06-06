# Backend - Wow Chatbot

Este es el backend para la aplicación Wow Chatbot, un chatbot que simula conversaciones con personajes de World of Warcraft utilizando la API de Google Gemini y gestiona la autenticación de usuarios y el historial de chat.

## 🚀 Tecnologías Utilizadas

- **Node.js**: Runtime de JavaScript en el servidor
- **Express.js**: Framework web para Node.js
- **Mongoose**: Modelado de objetos MongoDB
- **MongoDB**: Base de datos NoSQL para almacenar usuarios e historial de chat
- **Google Gemini API**: API de inteligencia artificial para generar respuestas contextuales
- **JSON Web Tokens (JWT)**: Para la autenticación de usuarios
- **Bcrypt**: Para la encriptación de contraseñas
- **CORS**: Middleware para manejar solicitudes cross-origin
- **dotenv**: Para manejar variables de entorno
- **Vercel**: Plataforma de despliegue

## 📁 Estructura del Proyecto

```
backend/
├── controllers/     # Lógica de la aplicación (auth, chat)
├── models/         # Modelos de datos (User.js)
├── middleware/     # Middleware (autenticación)
├── routes/         # Rutas de la API (auth, chat)
├── server.js       # Punto de entrada de la aplicación
├── package.json    # Dependencias y scripts
├── package-lock.json # Bloqueo de dependencias
├── vercel.json     # Configuración de despliegue en Vercel
```

## 🔧 Configuración

1. Clona el repositorio.
2. Instala las dependencias:
```bash
npm install
```
3. Crea un archivo `.env` en la raíz del directorio `backend/` con las siguientes variables (copia `.env.example`):
```
MONGODB_URI=tu_uri_de_conexion_a_mongodb
JWT_SECRET=una_cadena_secreta_larga_y_aleatoria
GEMINI_API_KEY=tu_api_key_de_google
FRONTEND_URL=http://localhost:5173 # O la URL de tu frontend desplegado
```
4. Inicia el servidor:
```bash
npm start
```
El servidor se iniciará por defecto en `http://localhost:5000` (o el puerto que configures).

## 🌐 Endpoints

### Autenticación
- **POST /api/auth/register**
  - Descripción: Registra un nuevo usuario.
  - Body: `{ "username": "string", "email": "string", "password": "string" }`
  - Respuesta: `{ "token": "string", "user": { ... } }`
- **POST /api/auth/login**
  - Descripción: Inicia sesión con un usuario existente.
  - Body: `{ "email": "string", "password": "string" }`
  - Respuesta: `{ "token": "string", "user": { ... } }`

### Chat
- **GET /api/chat/history?faction=[:faction]**
  - Descripción: Obtiene el historial de chat para el usuario autenticado y la facción especificada.
  - Parámetros de consulta: `faction` (requerido - 'alliance' o 'horde')
  - Headers: `Authorization: Bearer [token]`
  - Respuesta: `{ "chatHistory": [ { "role": "user", "content": "string" }, { "role": "assistant", "content": "string" }, ... ] }` (Incluye el mensaje inicial si es la primera vez)
- **POST /api/chat/send**
  - Descripción: Envía un mensaje al chatbot para la facción especificada.
  - Headers: `Authorization: Bearer [token]`, `Content-Type: application/json`
  - Body: `{ "message": "string", "faction": "alliance|horde" }`
  - Respuesta: `{ "response": "respuesta del chatbot", "chatHistory": [ ... ] }` (Devuelve la respuesta del bot y el historial actualizado)

## 🤖 Funcionalidad

El backend maneja:
- Autenticación de usuarios (registro e inicio de sesión).
- Protección de rutas mediante middleware de autenticación JWT.
- Comunicación con la API de Google Gemini.
- **Almacenamiento de historial de chat por usuario y por facción (Alianza/Horda) en MongoDB.**
- Envío de un mensaje inicial específico al usuario la primera vez que accede al chat de una facción.
- Personalización de respuestas según la facción seleccionada.
- Manejo de errores y validaciones.
- Configuración de CORS para permitir solicitudes desde el frontend.

## 🚀 Despliegue

El backend está configurado para desplegarse en Vercel. La configuración se encuentra en `vercel.json`. Asegúrate de configurar las variables de entorno en Vercel.

# wow-backend
