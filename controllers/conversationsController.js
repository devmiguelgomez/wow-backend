const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Obtener todas las conversaciones para el usuario autenticado
exports.getUserConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener conversaciones', error: error.message });
  }
};

// Obtener una conversación específica para el usuario autenticado
exports.getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, user: req.user._id });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }
    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener conversación', error: error.message });
  }
};

// Crear una nueva conversación para el usuario autenticado
exports.createConversation = async (req, res) => {
  try {
    const newConversation = new Conversation({
      user: req.user._id,
      title: req.body.title || 'Nueva conversación'
    });
    await newConversation.save();
    res.status(201).json(newConversation);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear conversación', error: error.message });
  }
};

// Añadir un mensaje a una conversación existente del usuario autenticado
exports.addMessageToConversation = async (req, res) => {
  try {
    const { role, content } = req.body;
    const conversation = await Conversation.findOne({ _id: req.params.id, user: req.user._id });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    conversation.messages.push({ role, content });
    await conversation.save();
    
    // Devolvemos el último mensaje añadido (el que acabamos de pushear)
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    res.status(201).json(lastMessage);

  } catch (error) {
    res.status(500).json({ message: 'Error al añadir mensaje', error: error.message });
  }
};

// (Opcional) Eliminar una conversación
exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    res.status(200).json({ message: 'Conversación eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar conversación', error: error.message });
  }
}; 