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
const Queue = require("bull");

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

const groupQueues = new Map();
const processQueue = new Queue("processQueue", {
  redis: {
    host: "127.0.0.1",
    port: 6379,
  },
  limiter: {
    max: 1, // Максимальное количество одновременно обрабатываемых задач
    duration: 5000, // Продолжительность в миллисекундах
  },
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

processQueue.on("error", (err) => {
  console.error("Ошибка подключения к Redis:", err);
});

processQueue.on("completed", (job, result) => {
  console.log(`Задача завершена для группы: ${job.data.groupId}`);
});

processQueue.on("stalled", (job) => {
  console.log(`Задача застряла для группы: ${job.data.groupId}`);
});

processQueue.process(async (job) => {
  console.log(`Получены данные задачи: ${JSON.stringify(job.data)}`);

  const { groupId, messages } = job.data;

  if (!Array.isArray(messages)) {
    console.error(
      `Ошибка: messages не является массивом для группы ${groupId}`,
      messages
    );
    return;
  }

  console.log(`Начата обработка группы: ${groupId}`);

  try {
    for (const msgData of messages) {
      console.log(
        `Обработка сообщения: ${JSON.stringify(msgData.id._serialized)}`
      );
      const msg = await CLIENT.getMessageById(String(msgData.id._serialized));
      await onMessageCreated(msg);
    }
  } catch (err) {
    console.error("Ошибка при обработке сообщения:", err);
  }

  console.log(`Закончена обработка группы: ${groupId}`);
  await delay(60000); // Задержка между обработкой групп
});

const addToQueue = async (groupId, msg) => {
  if (!groupQueues.has(groupId)) {
    groupQueues.set(groupId, []);
  }

  const currentGroupMessages = groupQueues.get(groupId).at(-1) || [];
  const currentGroupHasText = currentGroupMessages.some(
    (message) => message.body
  );
  const currentGroupHasMedia = currentGroupMessages.some(
    (message) => message.hasMedia
  );

  if (currentGroupHasText && currentGroupHasMedia && msg.body) {
    groupQueues.get(groupId).push([msg]);
  } else {
    currentGroupMessages.push(msg);
    groupQueues.set(groupId, [
      ...groupQueues.get(groupId).slice(0, -1),
      currentGroupMessages,
    ]);
  }

  const lastQueueItem = groupQueues.get(groupId).at(-1);

  if (!Array.isArray(lastQueueItem)) {
    console.error(
      `Ошибка: последняя очередь для группы ${groupId} не является массивом`,
      lastQueueItem
    );
    groupQueues.set(groupId, [...groupQueues.get(groupId), []]);
    return;
  }

  console.log(`Добавление задачи в очередь для группы: ${groupId}`);
  await processQueue.add({ groupId, messages: lastQueueItem });
};

processQueue.on("failed", (job, err) => {
  console.error(
    `Ошибка при обработке задачи для группы: ${job.data.groupId}`,
    err
  );
});

processQueue.on("error", (err) => {
  console.error("Ошибка в очереди:", err);
});

CLIENT.on(CLIENT_EVENTS.MESSAGE_RECEIVED, async (msg) => {
  try {
    const chat = await msg.getChat();
    const groupId = chat.id._serialized;

    if (BOT_SETTINGS_GROUP.ID === groupId) {
      await botSettingsActions(msg);
      return;
    }

    const isBlockedThread = shouldBlockThread(groupId);

    if (isBlockedThread || (!msg.body && !msg.hasMedia)) return;

    await addToQueue(groupId, msg);
  } catch (err) {
    console.error("Ошибка получения чата:", err);
  }
});

CLIENT.once(CLIENT_EVENTS.READY, async () => {
  console.log("started getting groups");
  listGroups();
  console.log("CLIENT is ready! Groups are Ready!");
  whatsAppBotReady();
});

CLIENT.on(CLIENT_EVENTS.QR, async (qr) => {
  sendQr(qr);
});

CLIENT.on(CLIENT_EVENTS.AUTH_FAILURE, () => {
  console.error("Ошибка авторизации!");
});

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
