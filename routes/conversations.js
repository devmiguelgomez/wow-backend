const express = require('express');
const router = express.Router();
const conversationsController = require('../controllers/conversationsController');

// Rutas protegidas - requieren autenticación (aplicada en server.js)

// Obtener todas las conversaciones del usuario
router.get('/', conversationsController.getUserConversations);

// Obtener una conversación específica por ID
router.get('/:id', conversationsController.getConversationById);

// Crear una nueva conversación
router.post('/', conversationsController.createConversation);

// Añadir un mensaje a una conversación existente
router.post('/:id/messages', conversationsController.addMessageToConversation);

// (Opcional) Eliminar una conversación
// router.delete('/:id', conversationsController.deleteConversation);

module.exports = router; 