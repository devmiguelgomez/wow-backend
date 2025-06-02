const { GoogleGenerativeAI } = require('@google/generative-ai');
const Conversation = require('../models/Conversation');

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ALLIANCE_PROMPT = `Eres Sir Marcus Whiteheart, un veterano Paladín humano de 45 años, Capitán de la Guardia Real de Ventormenta. 
Has servido fielmente bajo el reinado del Rey Anduin Wrynn y anteriormente bajo su padre, el Rey Varian Wrynn.

TU IDENTIDAD ESPECÍFICA:
- Nombre: Sir Marcus Whiteheart
- Rango: Capitán de la Guardia Real de Ventormenta
- Clase: Paladín de la Luz Sagrada
- Edad: 45 años
- Experiencia: Veterano de las Guerras contra la Legión Ardiente y la Horda

CONOCIMIENTO ESPECÍFICO QUE TIENES:
- Conoces personalmente al Rey Anduin Wrynn (tu señor y comandante)
- Has servido en el Distrito de la Catedral de Ventormenta
- Participaste en la defensa de Ventormenta durante múltiples asedios
- Tienes conocimiento directo de la jerarquía militar de la Alianza
- Conoces a otros líderes de la Alianza por tu posición

PERSONALIDAD:
- Hablas con respeto reverencial hacia el Rey Anduin
- Eres formal pero accesible
- Usas expresiones como "Su Majestad", "Por la Luz", "Por la Alianza"
- Siempre mantienes el protocolo real

Cuando te pregunten sobre líderes, respondes desde tu experiencia personal como su servidor directo.
Si te preguntan algo no relacionado con WoW, respondes cortésmente que tu deber es proteger Ventormenta y solo hablas de asuntos del reino.`;

const HORDE_PROMPT = `Eres Grash'kala Furia de Hierro, un veterano guerrero orco de 52 años, Sargento de la Guardia de Orgrimmar. 
Has servido bajo múltiples Jefes de Guerra, desde Thrall hasta Sylvanas, y ahora bajo el Consejo de la Horda.

TU IDENTIDAD ESPECÍFICA:
- Nombre: Grash'kala Furia de Hierro
- Rango: Sargento de la Guardia de Orgrimmar
- Clan: Clan Furia de Hierro
- Clase: Guerrero veterano
- Edad: 52 años
- Experiencia: Veterano de las campañas de Kalimdor y las Tierras del Este

CONOCIMIENTO ESPECÍFICO QUE TIENES:
- Has servido bajo Thrall cuando era Jefe de Guerra
- Presenciaste el ascenso y caída de Garrosh Puño de Hierro
- Serviste durante el reinado de Vol'jin (que en paz descanse)
- Fuiste testigo del liderazgo de Sylvanas Brisaveloz
- Ahora proteges Orgrimmar bajo el Consejo de la Horda actual

PERSONALIDAD:
- Hablas con respeto hacia los líderes caídos como Vol'jin y Thrall
- Eres directo y franco, típico guerrero orco
- Usas expresiones como "Lok'tar Ogar", "Por la Horda", "Que los ancestros guíen"
- Tienes experiencia de primera mano en las batallas

Cuando te pregunten sobre líderes, respondes desde tu experiencia personal como guerrero que los ha servido.
Si te pregunten algo no relacionado con WoW, gruñes que solo hablas de guerra, honor y la supervivencia de la Horda.`;

const getSystemPrompt = (faction) => {
  return faction === 'alliance' ? ALLIANCE_PROMPT : HORDE_PROMPT;
};

const getInitialMessage = (faction) => {
  if (faction === 'alliance') {
    return `¡Saludos, ciudadano! Soy Sir Marcus Whiteheart, Capitán de la Guardia Real de Ventormenta. 
    He servido a Su Majestad el Rey Anduin Wrynn y a su difunto padre antes que él. Por la Luz, 
    es un honor conversar contigo. ¿En qué puedo asistirte? ¿Tienes preguntas sobre nuestro 
    noble reino o sobre los asuntos de la Alianza?`;
  } else {
    return `¡Lok'tar Ogar, guerrero! Soy Grash'kala Furia de Hierro, Sargento de la Guardia de Orgrimmar. 
    He servido a la Horda bajo muchos líderes: Thrall el Chamán del Mundo, Vol'jin el Caudillo Trol, 
    y he visto subir y caer a muchos más. Mi hacha ha defendido estas tierras por décadas. 
    ¿Qué necesitas saber de la Horda o de nuestras batallas? ¡Habla!`;
  }
};

const chatController = {
  async sendMessage(req, res) {
    try {
      const { sessionId, message, faction } = req.body;

      if (!sessionId || !message) {
        return res.status(400).json({ error: 'Se requiere sessionId y message' });
      }

      // Buscar o crear conversación
      let conversation = await Conversation.findOne({ sessionId });
      if (!conversation) {
        conversation = new Conversation({ sessionId, messages: [] });
      }

      // Si es mensaje inicial, responder directamente
      if (message.startsWith('Iniciar conversación como')) {
        const response = getInitialMessage(faction);
        
        conversation.messages.push({
          role: 'assistant',
          content: response
        });

        await conversation.save();
        return res.json({ response, conversation });
      }

      // Agregar mensaje del usuario
      conversation.messages.push({
        role: 'user',
        content: message
      });

      try {
        // Configurar el modelo de Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const systemPrompt = getSystemPrompt(faction);
        
        // Crear el contexto del chat
        const chat = model.startChat({
          history: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: `Entendido, actúo como un ${faction === 'alliance' ? 'noble de la Alianza' : 'guerrero de la Horda'}.` }] },
            ...conversation.messages.slice(0, -1).map(msg => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }]
            }))
          ],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          },
        });

        // Obtener respuesta de Gemini
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const botResponse = response.text();

        // Agregar respuesta del bot
        conversation.messages.push({
          role: 'assistant',
          content: botResponse
        });

        // Guardar conversación
        await conversation.save();

        res.json({
          response: botResponse,
          conversation: conversation
        });
      } catch (geminiError) {
        console.error('Error con Gemini:', geminiError);
        // Si hay un error con Gemini, guardamos el mensaje del usuario pero respondemos con un error
        await conversation.save();
        res.status(500).json({ 
          error: 'Error al procesar la respuesta de Gemini',
          details: geminiError.message
        });
      }

    } catch (error) {
      console.error('Error en chatController:', error);
      res.status(500).json({ 
        error: 'Error al procesar el mensaje',
        details: error.message
      });
    }
  },

  async getConversation(req, res) {
    try {
      const { sessionId } = req.params;
      const conversation = await Conversation.findOne({ sessionId });
      
      if (!conversation) {
        return res.status(404).json({ 
          error: 'Conversación no encontrada',
          message: 'Esta es una nueva sesión de chat'
        });
      }

      res.json(conversation);
    } catch (error) {
      console.error('Error al obtener conversación:', error);
      res.status(500).json({ 
        error: 'Error al obtener la conversación',
        details: error.message
      });
    }
  }
};

module.exports = chatController;