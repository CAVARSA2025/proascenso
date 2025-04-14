import whatsappService from './whatsappService.js';

class MessageHandler {
  constructor() {
    this.userStates = {};
  }

  async handleIncomingMessage(message, senderInfo) {
    const userId = message.from;
    const isText = message?.type === 'text' && message?.text?.body;
    const textBody = isText ? message.text.body.toLowerCase().trim() : '';

    if (isText) {
      if (this.userStates[userId] === 'esperando_asesor') {
        await whatsappService.markAsRead(message.id);
        return;
      }

      await whatsappService.markAsRead(message.id);
      await this.sendWelcomeMessage(userId, message.id, senderInfo);
      this.userStates[userId] = 'esperando_asesor';
      return;
    }

    if (message?.type === 'interactive') {
      const optionId = message?.interactive?.button_reply?.id;
      await whatsappService.markAsRead(message.id);
      await this.handleMenuOption(userId, optionId);
      return;
    }

    await whatsappService.markAsRead(message.id);
  }

  getSenderName(senderInfo) {
    return senderInfo.profile?.name || senderInfo.wa_id;
  }

  async sendWelcomeMessage(to, messageId, senderInfo) {
    const name = this.getSenderName(senderInfo);
    const welcome = `Hola! ${name} 👋, Gracias por comunicarte con ProAscenso. Al continuar, aceptas el tratamiento de tus datos conforme a nuestra Política de Privacidad. Consúltala en https://cavar.com.co/política-de-datos`;
    await whatsappService.sendMessage(to, welcome, messageId);
    await this.sendWelcomeMenu(to);
  }

  async sendWelcomeMenu(to) {
    const menuMessage = "¿Cómo te podemos ayudar?";
    const buttons = [
      { type: 'reply', reply: { id: 'option_1', title: 'Ver Catálogo' } },
      { type: 'reply', reply: { id: 'option_2', title: 'Más Información' } },
    ];
    await whatsappService.sendInteractiveButtons(to, menuMessage, buttons);
  }

  async handleMenuOption(to, optionId) {
    switch (optionId) {
      case 'option_1':
        await whatsappService.sendMessage(to, 'Aquí puedes ver nuestro catálogo de *productos disponibles*: https://www.proascenso.co');
        await whatsappService.sendInteractiveButtons(to, "¿Encontraste lo que buscabas?", [
          { type: 'reply', reply: { id: 'catalogo_si', title: 'Sí' }},
          { type: 'reply', reply: { id: 'catalogo_no', title: 'No' }},
        ]);
        break;

      case 'option_2':
        await whatsappService.sendMessage(to, "Para ayudarte mejor, por favor comunícate con nuestra línea de atención al cliente, te ayudaremos con tus dudas.\n");
        await whatsappService.sendContact(to, {
          name: { formatted_name: 'Servicio Al Cliente', first_name: 'Servicio', last_name: 'Al Cliente' },
          phones: [{ phone: '573160185250', type: 'CELL', wa_id: '573160185250' }],
          org: { company: 'ProAscenso', department: 'Atención al cliente' },
        });
        this.userStates[to] = 'esperando_asesor';
        break;

      case 'catalogo_si':
        await whatsappService.sendMessage(to, '¡Nos alegra saber que encontraste lo que buscabas! Si necesitas más información, no dudes en escribirnos.');
        await whatsappService.sendInteractiveButtons(to, "¿Deseas ayuda adicional?", [
          { type: 'reply', reply: { id: 'ayuda_compra', title: 'Ayuda con mi compra' } },
          { type: 'reply', reply: { id: 'asesor_horn', title: 'Cotización formal' } },
          { type: 'reply', reply: { id: 'volver_menu', title: 'Volver al menú' } },
        ]);
        break;

      case 'catalogo_no':
        await whatsappService.sendMessage(to, 'Lamentamos que no hayas encontrado lo que buscabas.');
        await whatsappService.sendInteractiveButtons(to, '¿Cómo prefieres continuar?', [
          { type: 'reply', reply: { id: 'hablar_asesor', title: 'Hablar con un asesor' } },
          { type: 'reply', reply: { id: 'volver_menu', title: 'Volver al menú' } },
        ]);
        break;

      case 'hablar_asesor':
        await whatsappService.sendMessage(to, 'Si no encontraste lo que buscabas, ¡no te preocupes! Por favor llena el siguiente formulario: https://wkf.ms/4jceQPU y en breve uno de nuestros asesores se comunicará contigo.');
        this.userStates[to] = 'esperando_asesor';
        break;

      case 'ayuda_compra':
        await whatsappService.sendMessage(to, "¡Lamentamos que estés teniendo inconvenientes!\n\nPara ayudarte mejor, por favor comunícate con nuestra línea de atención al cliente.");
        await whatsappService.sendContact(to, {
          name: { formatted_name: 'Servicio Al Cliente', first_name: 'Servicio', last_name: 'Al Cliente' },
          phones: [{ phone: '573160185250', type: 'CELL', wa_id: '573160185250' }],
          org: { company: 'ProAscenso', department: 'Atención al cliente' },
        });
        this.userStates[to] = 'esperando_asesor';
        break;

      case 'asesor_horn':
        await whatsappService.sendMessage(to, "¡Perfecto! Si deseas una cotización formal comunícate con el asesor de la empresa fabricante para continuar con tu compra.");
        await whatsappService.sendContact(to, {
          name: { formatted_name: 'Asesora Comercial', first_name: 'Andrea', last_name: 'Montenegro' },
          phones: [{ phone: '573176425564', type: 'CELL', wa_id: '573176425564' }],
          org: { company: 'Horn', department: 'Asesor Comercial' },
        });
        this.userStates[to] = 'esperando_asesor';
        break;

      case 'volver_menu':
        this.userStates[to] = null;
        await this.sendWelcomeMessage(to, null, { profile: { name: '' }, wa_id: to });
        break;

      default:
        await whatsappService.sendMessage(to, 'Lo siento, no entendí tu selección. Por favor, elige una de las respuestas del menú.');
        break;
    }
  }
}

export default new MessageHandler();
