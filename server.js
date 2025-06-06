require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const chatRoutes = require('./routes/chatRoutes');
const authRoutes = require('./routes/auth');
const auth = require('./middleware/auth');

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'https://wow-fronted.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
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