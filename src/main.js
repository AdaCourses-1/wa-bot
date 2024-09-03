const { CLIENT_EVENTS, DB_PATHS, BOT_SETTINGS_GROUP } = require("./const");
const { CLIENT } = require("./config");
const { saveCacheToFile } = require("./saveGroups");
const {
  sendQr,
  whatsAppBotReady,
  whatsAppBotLostConnection,
} = require("./telegram-notifier-bot/actions");
const qrcode = require("qrcode-terminal");
const { messageReceived } = require("./commands/messageReceived");

const listGroups = async () => {
  try {
    const chats = await CLIENT.getChats();
    const groups = chats.filter((chat) => chat.isGroup);

    if (groups.length === 0) {
      console.log("Бот не добавлен ни в одну группу.");
    } else {
      const mappedGroups = groups.map((gp) => ({
        name: gp.name,
        userId: gp.id.user,
        id: gp.id._serialized,
        createdAt: new Date(gp.timestamp * 1000),
        type: null,
      }));

      saveCacheToFile(mappedGroups, DB_PATHS.GROUPS);
    }
  } catch (err) {
    console.error("Ошибка при получении списка групп:", err);
  }
};

// When the CLIENT is ready, run this code (only once)
CLIENT.once(CLIENT_EVENTS.READY, async () => {
  listGroups();
  await whatsAppBotReady?.();
});

CLIENT.on(CLIENT_EVENTS.MESSAGE_RECEIVED, messageReceived);

// Событие генерации QR-кода
CLIENT.on(CLIENT_EVENTS.QR, async (qr) => {
  sendQr?.(qr);
  // qrcode.generate(qr, { small: true });
});

CLIENT.on(CLIENT_EVENTS.AUTH_FAILURE, () => {
  console.error("Ошибка авторизации!");
});

// Start your CLIENT
CLIENT.initialize();

let reconnectInterval = null;

const attemptReconnect = () => {
  console.log("Попытка восстановить соединение...");
  whatsAppBotLostConnection?.();

  CLIENT.initialize().then(() => {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
    whatsAppBotReady?.();
  });
};

CLIENT.on(CLIENT_EVENTS.DISCONNECTED, () => {
  console.error("Соединение потеряно. Переподключение через 1 минуту...");

  if (!reconnectInterval) {
    reconnectInterval = setInterval(attemptReconnect, 60000);
  }
});
