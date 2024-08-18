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
// const qrcode = require("qrcode-terminal");

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

const messageQueues = new Map();
let processing = false;
let groups = {};
let stopBot = null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processQueue = async (groupId) => {
  // Устанавливаем флаг обработки
  processing = true;

  console.log("delay started");
  await delay(60000);

  console.log(groups);
  const groupKeys = Object.keys(groups);

  for (const groupKey of groupKeys) {
    const messages = groups[groupKey].shift();

    console.log("messages", messages.length);

    for (const message of messages) {
      await onMessageCreated(message);
    }

    await delay(60000);
  }

  // Удаляем обработанную очередь
  console.log(groups, "splicedGroups");
  await delay(15000);
  console.log("delay ended");

  // Сбрасываем флаг обработки
  processing = false;

  // Обрабатываем следующую очередь
  processNextQueue();
};

const processNextQueue = async () => {
  if (processing) return;

  const [groupValues] = Object.values(groups);

  if (groupValues.length > 0) {
    processQueue();
  }

  console.log('groupValues', groupValues)
};

// When the CLIENT is ready, run this code (only once)
CLIENT.once(CLIENT_EVENTS.READY, async () => {
  console.log("started getting groups");
  listGroups();
  console.log("CLIENT is ready! Groups is Ready!");
  // whatsAppBotReady?.();
});

CLIENT.on(CLIENT_EVENTS.MESSAGE_RECEIVED, async (msg) => {
  try {
    const chat = await msg.getChat();
    const groupId = chat.id._serialized;

    const isBlockedThread = shouldBlockThread(groupId);

    if (isBlockedThread || (!msg.body && !msg.hasMedia)) return;

    if (BOT_SETTINGS_GROUP.ID === groupId) {
      await botSettingsActions(msg);
      return;
    }

    if (msg.body === '/start') {
      stopBot = false;
    }
    if (msg.body === '/stop') {
      stopBot = true;
    }
    if (stopBot) return;

    if (!groups[groupId]) {
      groups[groupId] = [];
    }

    // Создаем очередь для группы, если ее нет
    if (!messageQueues.has(groupId)) {
      messageQueues.set(groupId, []);
    }

    const isText = msg.body;
    const currentGroup = groups[groupId].at(-1) || [];
    const currentMessageGroupHasText = currentGroup.some(
      (message) => message.body
    );
    const currentMessageGroupHasMedia = currentGroup.some(
      (message) => message.hasMedia
    );

    if (currentMessageGroupHasText && currentMessageGroupHasMedia && isText) {
      groups[groupId].push([msg]);
    } else {
      // Добавить сообщение в поледний массив
      currentGroup.push(msg);

      // Если currentGroup был undefined, обновить последний массив
      if (
        groups[groupId].length === 0 ||
        groups[groupId].at(-1) !== currentGroup
      ) {
        groups[groupId].push(currentGroup);
      }
    }

    console.log(
      msg.type,
      msg.body ? msg.body : `Это картинка с группы ${chat.name}`
    );

    // Запускаем обработку, если не было запущено
    processNextQueue();
  } catch (err) {
    console.error("Ошибка получения чата:", err);
  }
});

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
