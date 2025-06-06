require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const chatRoutes = require('./routes/chatRoutes');
const authRoutes = require('./routes/auth');
const auth = require('./middleware/auth');

const app = express();

// Configuración de CORS para rutas /api
const apiCorsOptions = {
  origin: 'https://wow-fronted.vercel.app', // Especifica el origen exacto del frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
};

// Aplica CORS solo a las rutas que empiezan con /api
app.use('/api', cors(apiCorsOptions));

app.use(express.json());

// Configuración de MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wow-chatbot')
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

// Configuración de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas protegidas
app.use('/api/conversations', auth, require('./routes/conversations'));

// Rutas
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API del Chatbot de World of Warcraft funcionando' });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
}); 