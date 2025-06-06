const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  messages: [messageSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt
conversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema); 