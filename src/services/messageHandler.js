import whatsappService from './whatsappService.js';
import appendToSheet from './googleSheetsService.js';

class MessageHandler {
  constructor() {
    this.userStates = {};
    this.userData = {};
  }

  async handleIncomingMessage(message, senderInfo) {
    const userId = message.from;
    const isText = message?.type === 'text' && message?.text?.body;
    const textBody = isText ? message.text.body.toLowerCase().trim() : '';

    // Inicializar datos del usuario si no existen
    if (!this.userData[userId]) {
      this.userData[userId] = {};
    }

    // Manejo del estado esperando_contacto
    if (this.userStates[userId] === 'esperando_contacto' && isText) {
      this.userData[userId].ciudad = textBody;

      // Guardar en Google Sheets
      await appendToSheet([
        new Date().toISOString(),
        this.userData[userId].uso || '',
        this.userData[userId].tipo || '',
        this.userData[userId].material || '',
        this.userData[userId].ciudad || '',
        userId
      ]);

      this.userStates[userId] = 'esperando_duda'; // siguiente paso si aplica

      await whatsappService.sendMessage(userId, 'Gracias por tu mensaje. Un asesor te atenderá pronto.');
      await whatsappService.markAsRead(message.id);
      return;
    }

    // Manejo del mensaje interactivo
    if (message?.type === 'interactive') {
      const optionId = message?.interactive?.button_reply?.id;
      await whatsappService.markAsRead(message.id);
      await this.handleMenuOption(userId, optionId);
      return;
    }

    await whatsappService.markAsRead(message.id);
  }

  getSenderName(senderInfo) {
    return senderInfo?.profile?.name || senderInfo?.wa_id || 'Usuario';
  }

  async sendWelcomeMessage(to, messageId, senderInfo = {}) {
    const name = this.getSenderName(senderInfo);
    const welcome = `Hola! ${name} 👋, Gracias por comunicarte con ProAscenso. Al continuar, aceptas el tratamiento de tus datos conforme a nuestra Política de Privacidad. Consúltala en https://cavar.com.co/política-de-datos`;
    await whatsappService.sendMessage(to, welcome, messageId);
    await this.sendWelcomeMenu(to);
  }

  async sendWelcomeMenu(to) {
    const menuMessage = "¿Cómo te podemos ayudar?";
    const buttons = [
      { type: 'reply', reply: { id: 'option_1', title: 'Ver Catálogo' } },
      { type: 'reply', reply: { id: 'option_2', title: 'Ayuda para comprar' } },
      { type: 'reply', reply: { id: 'option_3', title: 'Tengo una duda' } },
    ];
    await whatsappService.sendInteractiveButtons(to, menuMessage, buttons);
  }

  async handleMenuOption(to, optionId) {
    switch (optionId) {
      case 'option_1':
        await whatsappService.sendMessage(to, 'Aquí puedes ver nuestro catálogo de *productos disponibles*: https://www.proascenso.co/collections/all');
        await whatsappService.sendInteractiveButtons(to, "¿Encontraste lo que buscabas?", [
          { type: 'reply', reply: { id: 'catalogo_si', title: 'Sí' }},
          { type: 'reply', reply: { id: 'catalogo_no', title: 'No' }},
        ]);
        break;

      case 'catalogo_si':
        await whatsappService.sendMessage(to, '¡Nos alegra saber que encontraste lo que buscabas! Si necesitas más información, no dudes en escribirnos.');
        await whatsappService.sendInteractiveButtons(to, "¿Deseas ayuda adicional?", [
          { type: 'reply', reply: { id: 'hablar_asesor', title: 'Hablar con un asesor' } },
          { type: 'reply', reply: { id: 'volver_menu', title: 'Volver al menú' } },
        ]);
        break;

      case 'catalogo_no':
        await whatsappService.sendMessage(to, 'Lamentamos que no hayas encontrado lo que buscabas.');
        await whatsappService.sendInteractiveButtons(to, '¿Cómo prefieres continuar?', [
          { type: 'reply', reply: { id: 'ayuda_compra', title: 'Ayuda con mi compra' } },
          { type: 'reply', reply: { id: 'volver_menu', title: 'Volver al menú' } },
        ]);
        break;

      case 'option_2':
      case 'ayuda_compra':
        this.userStates[to] = 'elegir_uso';
        await whatsappService.sendMessage(to, "Para ayudarte con tu compra te haremos algunas preguntas");
        await whatsappService.sendInteractiveButtons(to, '¿Para qué uso necesitas la escalera?', [
          { type: 'reply', reply: { id: 'uso_hogar', title: 'Hogar' } },
          { type: 'reply', reply: { id: 'uso_negocio', title: 'Negocio' } },
          { type: 'reply', reply: { id: 'uso_industria', title: 'Industria' } },
        ]);
        break;

      case 'uso_hogar':
      case 'uso_negocio':
      case 'uso_industria':
        this.userStates[to] = 'tipo_escalera';
        this.userData[to] = { ...this.userData[to], uso: optionId };
        await whatsappService.sendInteractiveButtons(to, '¿Qué tipo de escalera te interesa?', [
          { type: 'reply', reply: { id: 'portatiles', title: 'Escaleras portátiles' } },
          { type: 'reply', reply: { id: 'moviles', title: 'Escaleras móviles' } },
          { type: 'reply', reply: { id: 'andamios', title: 'Andamios' } },
        ]);
        break;

      case 'portatiles':
      case 'moviles':
      case 'andamios':
        this.userStates[to] = 'material_escalera';
        this.userData[to].tipo = optionId;
        await whatsappService.sendInteractiveButtons(to, '¿Prefieres escaleras de:', [
          { type: 'reply', reply: { id: 'aluminio', title: 'Aluminio' } },
          { type: 'reply', reply: { id: 'frp', title: 'Fibra de vidrio (FRP)' } },
          { type: 'reply', reply: { id: 'no_seguro', title: 'No estoy seguro' } },
        ]);
        break;

      case 'aluminio':
      case 'frp':
      case 'no_seguro':
        this.userData[to].material = optionId;
        this.userStates[to] = 'esperando_contacto';
        await whatsappService.sendMessage(to, '¿En qué ciudad estás ubicado(a)?');
        break;

      case 'option_3':
        this.userStates[to] = 'esperando_duda';
        await whatsappService.sendInteractiveButtons(to, '¡Con gusto! Selecciona una pregunta común:', [
          { type: 'reply', reply: { id: 'envios', title: '¿Hacen envíos?' } },
          { type: 'reply', reply: { id: 'entrega', title: '¿Tiempo de entrega?' } },
          { type: 'reply', reply: { id: 'garantia', title: '¿Garantía?' } },
        ]);
        break;

      case 'envios':
        await whatsappService.sendMessage(to, 'Sí, hacemos envíos a todo el país.');
        break;

      case 'entrega':
        await whatsappService.sendMessage(to, 'El tiempo de entrega depende de tu ciudad, pero normalmente es entre 2 a 5 días hábiles.');
        break;

      case 'garantia':
        await whatsappService.sendMessage(to, 'Nuestros productos cuentan con garantía de 1 año por defectos de fabricación.');
        break;

      case 'hablar_asesor':
        await whatsappService.sendMessage(to, 'Un asesor se comunicará contigo pronto.');
        break;

      case 'volver_menu':
        await this.sendWelcomeMenu(to);
        break;

      case 'cotizacion':
        await whatsappService.sendMessage(to, 'Puedes solicitar tu cotización completando este formulario: https://www.proascenso.co/pages/contacto');
        break;

      default:
        await whatsappService.sendMessage(to, 'Lo siento, no entendí esa opción. Por favor intenta de nuevo.');
        break;
    }
  }
}

export default MessageHandler;
