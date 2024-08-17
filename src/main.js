const { onMessageCreated } = require("./controller");
const { CLIENT_EVENTS, DB_PATHS, BOT_SETTINGS_GROUP } = require("./const");
const { CLIENT } = require("./config");
const { saveCacheToFile } = require("./saveGroups");
const { shouldBlockThread } = require("./utils");
const {
  sendQr,
  whatsAppBotReady,
  whatsAppBotLostConnection,
} = require("./telegram-notifier-bot/actions");
const { botSettingsActions } = require("./whatsapp-dordoi-bot/actions");

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

const Queue = require('bull');
const messageQueue = new Queue('messageQueue');
let processing

// Процессор очереди
messageQueue.process(async (job) => {
  const { messages } = job.data;
  
  for (let msg of messages) {
    try {
      await onMessageCreated(msg);
    } catch (err) {
      console.error('Ошибка при обработке сообщения:', err);
    }
  }

  await delay(60000); // Задержка между пачками сообщений
});

// Получение нового сообщения
CLIENT.on(CLIENT_EVENTS.MESSAGE_RECEIVED, async (msg) => {
  try {
    const chat = await msg.getChat();
    const groupId = chat.id._serialized;

    if (BOT_SETTINGS_GROUP.ID == chat.id._serialized) {
      await botSettingsActions(msg);
      return;
    }

    const isBlockedThread = shouldBlockThread(groupId);
    if (isBlockedThread || (!msg.body && !msg.hasMedia)) return;

    const currentGroup = groupsQueues.get(groupId) || [[]];
    const currentGroupMessages = currentGroup.at(-1);

    const currentGroupHasText = currentGroupMessages.some(
      (message) => message.body
    );
    const currentGroupHasMedia = currentGroupMessages.some(
      (message) => message.hasMedia
    );

    if (currentGroupHasText && currentGroupHasMedia && msg.body) {
      currentGroup.push([msg]);
    } else {
      currentGroupMessages.push(msg);
    }

    groupsQueues.set(groupId, currentGroup);

    if (!processing) {
      messageQueue.add({ groupId, messages: currentGroupMessages });
      processing = true;
    }
  } catch (err) {
    console.error("Ошибка получения чата:", err);
  }
});

// When the CLIENT is ready, run this code (only once)
CLIENT.once(CLIENT_EVENTS.READY, async () => {
  console.log("started getting groups");
  listGroups();
  console.log("CLIENT is ready! Groups is Ready!");
  whatsAppBotReady();
});

// Событие генерации QR-кода
CLIENT.on(CLIENT_EVENTS.QR, async (qr) => {
  sendQr(qr);
});

CLIENT.on(CLIENT_EVENTS.AUTH_FAILURE, () => {
  console.error("Ошибка авторизации!");
});

// Start your CLIENT
CLIENT.initialize();

let reconnectInterval = null;

const attemptReconnect = () => {
  console.log("Попытка восстановить соединение...");
  whatsAppBotLostConnection();

  CLIENT.initialize().then(() => {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
    whatsAppBotReady();
  });
};

CLIENT.on(CLIENT_EVENTS.DISCONNECTED, () => {
  console.error("Соединение потеряно. Переподключение через 1 минуту...");

  if (!reconnectInterval) {
    reconnectInterval = setInterval(attemptReconnect, 60000);
  }
});
