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

const groupsQueues = new Map();
let processing = false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processQueue = async (groupId) => {
  const queue = groupsQueues.get(groupId);
  if (!queue || queue.length === 0) return;

  // Устанавливаем флаг обработки
  processing = true;

  console.log("Обработка началась!");
  await delay(6000);

  for (let i = 0; i < queue.length; i++) {
    const messages = queue[i];

    while (messages.length > 0) {
      const msg = messages.shift();

      try {
        await onMessageCreated(msg);
      } catch (err) {
        console.error("Ошибка при обработке сообщения:", err);
      }
    }

    await delay(120000);
  }

  console.log("Обработка закончилась!");

  // Сбрасываем флаг обработки
  processing = false;

  // Обрабатываем следующую очередь
  processNextQueue();
};

const processNextQueue = async () => {
  if (processing) return;

  // Получаем очередь из первого доступного ключа
  const groupId = Array.from(groupsQueues.keys())[0];
  if (groupId) {
    processQueue(groupId);
  }
  else {
    groupsQueues.delete(groupId);
  }
};

// When the CLIENT is ready, run this code (only once)
CLIENT.once(CLIENT_EVENTS.READY, async () => {
  console.log("started getting groups");
  listGroups();
  console.log("CLIENT is ready! Groups is Ready!");
  whatsAppBotReady();
});

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

    if (!groupsQueues.has(groupId) || !groupsQueues.has(groupId).length) {
      groupsQueues.set(groupId, [[]]);
    }

    const currentGroup = groupsQueues.get(groupId);
    const currentGroupMessages = currentGroup.at(-1);
    console.log(currentGroup, '118')
    const currentGroupHasText = currentGroupMessages?.some(
      (message) => message.body
    );
    const currentGroupHasMedia = currentGroupMessages?.some(
      (message) => message.hasMedia
    );

    console.log(msg.body ? msg.body : `Это картинка c группы: ${chat.name}`);

    if (currentGroupHasText && currentGroupHasMedia && msg.body) {
      groupsQueues.set(groupId, [...currentGroup, [msg]]);
    }
    else {
      currentGroupMessages.push(msg);
    }

    console.log(currentGroup, '135')

    // Запускаем обработку, если не было запущено
    if (!processing) {
      processNextQueue();
    }
  } catch (err) {
    console.error("Ошибка получения чата:", err);
  }
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
