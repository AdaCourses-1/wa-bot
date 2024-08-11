const { CLIENT } = require("./config");
const { BOT_SETTINGS_GROUP, COMMANDS, DB_PATHS } = require("./const");
const { loadCacheFromFile, saveCacheToFile } = require("./saveGroups");
const {
  destChats,
  generateUniqueId,
  fileSizeInMb,
  isVideoOrImage,
} = require("./utils");

let messageQueue = [];
let isProcessing = false;

const botSettingsActions = async (msg) => {
  const command = await msg.body;

  if (command === COMMANDS.GET_CHATS) {
    const chats = loadCacheFromFile(DB_PATHS.GROUPS);

    let message = ``;

    chats?.forEach((chat) => {
      message += `Название: ${chat.name}\n` + `ID: ${chat.id}\n` + `\n---\n`; // Adds a separator line for clarity
    });

    await CLIENT.sendMessage(BOT_SETTINGS_GROUP.ID, message);
  }

  if (command.includes(COMMANDS.ADD_DEST_TYPE)) {
    const destChatId = command?.split(":")[1]?.trim();
    const bot = loadCacheFromFile(DB_PATHS.BOT_SETTINGS);

    if (destChatId && bot && !bot.dest_chats.includes(destChatId)) {
      const data = { ...bot, dest_chats: [...bot.dest_chats, destChatId] };
      saveCacheToFile(data, DB_PATHS.BOT_SETTINGS);
    }
  }

  if (command.includes(COMMANDS.ADD_SOURCE_TYPE)) {
    const sourceChatId = command?.split(":")[1]?.trim();
    const bot = loadCacheFromFile(DB_PATHS.BOT_SETTINGS);

    if (sourceChatId && bot && !bot.source_chats.includes(sourceChatId)) {
      const data = {
        ...bot,
        source_chats: [...bot.source_chats, sourceChatId],
      };
      saveCacheToFile(data, DB_PATHS.BOT_SETTINGS);
    }
  }

  // Обязательно сбрасывайте isProcessing и продолжайте обработку очереди
  isProcessing = false;
};

const sendToDestChats = async (data) => {
  if (destChats && destChats.length < 1) return;

  for (const chatId of destChats) {
    await CLIENT.sendMessage(chatId, data);
  }
};

const processQueue = async () => {
  if (isProcessing || messageQueue.length < 1) return;
  // if (msg.fromMe) return;

  isProcessing = true;
  const { msg, chat } = messageQueue.shift();

  if (!msg || !chat) {
    isProcessing = false;
    return;
  }

  try {
    if (msg.hasMedia) {
      const media = await msg.downloadMedia();

      if (isVideoOrImage(media?.mimetype)) {
        if (fileSizeInMb(media?.fileSize) > 100) {
          // Проверка на размер более 100 МБ
          console.error("Файл превышает максимальный размер 100 МБ");
          return;
        }

        await sendToDestChats(media);
      }

      return;
    }

    let message = `${
      msg.body
    }\n\nАртикул: ${generateUniqueId?.()}\n\nКонтакты: wa.me/996709700433`;

    await sendToDestChats(message);
  } catch (err) {
    console.log("Случилась ошибка:", err);
  } finally {
    isProcessing = false;
    processQueue(); // Продолжаем обработку очереди
  }
};

let timerId = 0;

const onMessageCreated = async (msg) => {
  clearTimeout(timerId);
  const chat = await msg.getChat();

  if (BOT_SETTINGS_GROUP.ID == chat.id._serialized) {
    await botSettingsActions(msg);
    return;
  }

  // Добавление сообщения в очередь с проверкой типа
  if (msg.hasMedia) {
    messageQueue.unshift({ msg, chat }); // Медиа-сообщения в начало очереди
  } else {
    messageQueue.push({ msg, chat }); // Текстовые сообщения в конец очереди
  }

  timerId = setTimeout(() => {
    if (!isProcessing) {
      const messageText = messageQueue.at(-1);
      const elements = messageQueue.slice(0, -1).reverse();

      messageQueue = [...elements, messageText];
      processQueue();
    }
  }, 10000);
};

module.exports = { onMessageCreated };
