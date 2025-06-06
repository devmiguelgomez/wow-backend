const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Ruta para enviar mensaje
router.post('/send', chatController.sendMessage);

// Ruta para obtener conversación por ID
router.get('/conversation/:id', chatController.getConversationById);

module.exports = router; 