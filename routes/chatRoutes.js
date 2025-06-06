const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Ruta para enviar mensaje
router.post('/send', chatController.sendMessage);

// Ruta para obtener conversación
router.get('/conversation', chatController.getConversation);

module.exports = router; 