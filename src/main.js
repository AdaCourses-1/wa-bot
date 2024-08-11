const qrcode = require("qrcode-terminal");
const { onMessageCreated } = require("./controller");
const { CLIENT_EVENTS, DB_PATHS } = require("./const");
const { CLIENT } = require("./config");
const { saveCacheToFile } = require("./saveGroups");

const listGroups = async () => {
  try {
    const chats = await CLIENT.getChats();
    const groups = chats.filter((chat) => chat.isGroup);

    if (groups.length === 0) {
      console.log("Бот не добавлен ни в одну группу.");
    } else {
      const mappedGroups = groups
        .filter((group) => group.isGroup)
        .map((gp) => ({
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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processQueue = async (groupId) => {
  const queue = messageQueues.get(groupId);
  if (!queue || queue.length === 0) return;

  // Устанавливаем флаг обработки
  processing = true;

  while (queue.length > 0) {
    const { msg } = queue.shift();

    try {
      await onMessageCreated(msg);
      await delay(1000)
    } catch (err) {
      console.error("Ошибка при обработке сообщения:", err);
    }
  }

  console.log('delay started')
  await delay(60000)
  console.log('delay ended')

  // Удаляем обработанную очередь
  messageQueues.delete(groupId);
  
  // Сбрасываем флаг обработки
  processing = false;

  // Обрабатываем следующую очередь
  processNextQueue();
};

const processNextQueue = async () => {
  if (processing) return;

  // Получаем очередь из первого доступного ключа
  const groupId = Array.from(messageQueues.keys())[0];
  if (groupId) {
    processQueue(groupId);
  }
};

CLIENT.on(CLIENT_EVENTS.MESSAGE_CREATE, async (msg) => {
  try {
    const chat = await msg.getChat();
    const groupId = chat.id._serialized;

    // Создаем очередь для группы, если ее нет
    if (!messageQueues.has(groupId)) {
      messageQueues.set(groupId, []);
    }

    // Добавляем сообщение в соответствующую очередь
    const queue = messageQueues.get(groupId);

    if (!queue) return;
  
    queue.push({ msg });

    // Запускаем обработку, если не было запущено
    if (!processing) {
      processNextQueue();
    }
  } catch (err) {
    console.error("Ошибка получения чата:", err);
  }
});
// When the CLIENT is ready, run this code (only once)
CLIENT.once(CLIENT_EVENTS.READY, () => {
  listGroups();
  console.log("CLIENT is ready!");
});

// When the CLIENT received QR-Code
CLIENT.on(CLIENT_EVENTS.QR, (qr) => {
  qrcode.generate(qr, { small: true });

  console.log("QR RECEIVED", qr);
});

CLIENT.on(CLIENT_EVENTS.AUTH_FAILURE, () => {
  console.error("Ошибка авторизации!");
});

// Start your CLIENT
CLIENT.initialize();
