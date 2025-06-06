const { GoogleGenerativeAI } = require('@google/generative-ai');
const Conversation = require('../models/Conversation');

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ALLIANCE_PROMPT = `Eres Sir Marcus Whiteheart, un veterano Paladín humano de 45 años, Capitán de la Guardia Real de Ventormenta. \nHas servido fielmente bajo el reinado del Rey Anduin Wrynn y anteriormente bajo su padre, el Rey Varian Wrynn.\n\nTU IDENTIDAD ESPECÍFICA:\n- Nombre: Sir Marcus Whiteheart\n- Rango: Capitán de la Guardia Real de Ventormenta\n- Clase: Paladín de la Luz Sagrada\n- Edad: 45 años\n- Experiencia: Veterano de las Guerras contra la Legión Ardiente y la Horda\n\nCONOCIMIENTO ESPECÍFICO QUE TIENES:\n- Conoces personalmente al Rey Anduin Wrynn (tu señor y comandante)\n- Has servido en el Distrito de la Catedral de Ventormenta\n- Participaste en la defensa de Ventormenta durante múltiples asedios\n- Tienes conocimiento directo de la jerarquía militar de la Alianza\n- Conoces a otros líderes de la Alianza por tu posición\n\nPERSONALIDAD:\n- Hablas con respeto reverencial hacia el Rey Anduin\n- Eres formal pero accesible\n- Usas expresiones como "Su Majestad", "Por la Luz", "Por la Alianza"\n- Siempre mantienes el protocolo real\n\nCuando te pregunten sobre líderes, respondes desde tu experiencia personal como su servidor directo.\nSi te pregunten algo no relacionado con WoW, respondes cortésmente que tu deber es proteger Ventormenta y solo hablas de asuntos del reino.`;

const HORDE_PROMPT = `Eres Grash'kala Furia de Hierro, un veterano guerrero orco de 52 años, Sargento de la Guardia de Orgrimmar. \nHas servido bajo múltiples Jefes de Guerra, desde Thrall hasta Sylvanas, y ahora bajo el Consejo de la Horda.\n\nTU IDENTIDAD ESPECÍFICA:\n- Nombre: Grash'kala Furia de Hierro\n- Rango: Sargento de la Guardia de Orgrimmar\n- Clan: Clan Furia de Hierro\n- Clase: Guerrero veterano\n- Edad: 52 años\n- Experiencia: Veterano de las campañas de Kalimdor y las Tierras del Este\n\nCONOCIMIENTO ESPECÍFICO QUE TIENES:\n- Has servido bajo Thrall cuando era Jefe de Guerra\n- Presenciaste el ascenso y caída de Garrosh Puño de Hierro\n- Serviste durante el reinado de Vol'jin (que en paz descanse)\n- Fuiste testigo del liderazgo de Sylvanas Brisaveloz\n- Ahora proteges Orgrimmar bajo el Consejo de la Horda actual\n\nPERSONALIDAD:\n- Hablas con respeto hacia los líderes caídos como Vol'jin y Thrall\n- Eres directo y franco, típico guerrero orco\n- Usas expresiones como "Lok'tar Ogar", "Por la Horda", "Que los ancestros guíen"\n- Tienes experiencia de primera mano en las batallas\n\nCuando te pregunten sobre líderes, respondes desde tu experiencia personal como guerrero que los ha servido.\nSi te pregunten algo no relacionado con WoW, gruñes que solo hablas de guerra, honor y la supervivencia de la Horda.`;

const getSystemPrompt = (faction) => {
  return faction === 'alliance' ? ALLIANCE_PROMPT : HORDE_PROMPT;
};

const chatController = {
  async sendMessage(req, res) {
    try {
      const { conversationId, message, faction } = req.body;
      const userId = req.user._id; // Obtenemos el ID del usuario autenticado

      if (!message) {
        return res.status(400).json({ error: 'Se requiere el campo message' });
      }

      let conversation = null;

      if (conversationId) {
        // Intentar encontrar la conversación existente por ID y usuario
        conversation = await Conversation.findOne({ _id: conversationId, user: userId });
        
        if (!conversation) {
          // Si no se encuentra la conversación para este usuario, puede ser un ID inválido o no pertenecer a él.
          // En lugar de retornar 404 aquí, permitiremos crear una nueva conversación si el frontend no especifica conversationId.
          // Si conversationId fue enviado pero no se encontró, esto podría indicar un problema en el frontend o un request malicioso,
          // pero el flujo principal es crear si no se especifica ID.
          console.warn(`Conversación ID ${conversationId} no encontrada para el usuario ${userId}. Se creará una nueva si no se envió conversationId, de lo contrario, se manejará como error.`);
        }
      }
      
      // Si no se encontró una conversación (ya sea porque conversationId no se envió o no se encontró una coincidencia)
      // Y el frontend NO envió un conversationId inválido (es decir, no se especificó ninguno en la petición original)
      // Creamos una nueva conversación.
      if (!conversation && !conversationId) { // Solo crear si no se encontró Y NO se especificó un ID (inválido)
         conversation = new Conversation({
          user: userId,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : '') // Usar parte del primer mensaje como título
        });
        await conversation.save(); // Guardar la nueva conversación para obtener su ID (_id)
         console.log(`Nueva conversación creada con ID: ${conversation._id} para usuario ${userId}`);
      } else if (!conversation && conversationId) {
         // Si se especificó un conversationId pero no se encontró, retornamos error.
         return res.status(404).json({ message: 'Conversación especificada no encontrada o no pertenece a este usuario.' });
      }

      // En este punto, 'conversation' es definitivamente un documento válido de Conversation con el campo 'user' asignado.

      // Agregar mensaje del usuario a la conversación
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date() // Asegurar que el timestamp se guarda
      });

      try {
        // Configurar el modelo de Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const systemPrompt = getSystemPrompt(faction);
        
        // Preparar historial para Gemini (incluyendo el prompt del sistema como primer 'user' y la confirmación del modelo)
        // Incluir mensajes anteriores, incluyendo el último mensaje del usuario para el contexto del modelo
        const history = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: `Entendido, actúo como un ${faction === 'alliance' ? 'noble de la Alianza' : 'guerrero de la Horda'}.` }] },
          ...conversation.messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }))
        ];

        // Obtener respuesta de Gemini. Pasamos la conversación completa como historial.
        // La API de Gemini 1.5 flash maneja el historial directamente en startChat.
        const chat = model.startChat({ history });
        const result = await chat.sendMessage({ text: message }); // Envía el último mensaje como el nuevo turno
        const response = await result.response;
        const botResponse = response.text();

        // Agregar respuesta del bot a la conversación
        conversation.messages.push({
          role: 'assistant',
          content: botResponse,
          timestamp: new Date() // Asegurar que el timestamp se guarda
        });

        // Guardar la conversación actualizada
        await conversation.save();
         console.log(`Mensaje añadido y conversación actualizada para ID: ${conversation._id}`);

        // Devolver la respuesta del bot y el ID de la conversación
        res.json({
          response: botResponse,
          conversationId: conversation._id 
        });
      } catch (geminiError) {
        console.error('Error con Gemini:', geminiError);
        // Si hay un error con Gemini, guardamos la conversación con el mensaje del usuario
        // pero respondemos con un error al frontend. La conversación ya incluye el mensaje del usuario aquí.
        await conversation.save(); // Guardar para no perder el mensaje del usuario
        res.status(500).json({ 
          error: 'Error al procesar la respuesta de Gemini',
          details: geminiError.message,
          conversationId: conversation._id 
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

  // Función para obtener una conversación específica por ID y usuario
  async getConversationById(req, res) {
    try {
      const { id } = req.params; // ID de la conversación de los parámetros de la URL
      const userId = req.user._id; // ID del usuario autenticado

      const conversation = await Conversation.findOne({ _id: id, user: userId });
      
      if (!conversation) {
        // Si no se encuentra la conversación para este usuario, retorna 404
        return res.status(404).json({ 
          message: 'Conversación no encontrada para este usuario.',
        });
      }

      // Devuelve la conversación encontrada
      res.status(200).json(conversation);
    } catch (error) {
      console.error('Error al obtener conversación por ID:', error);
      res.status(500).json({ 
        message: 'Error al obtener la conversación',
        details: error.message
      });
    }
  }
};

module.exports = chatController;