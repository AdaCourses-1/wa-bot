const { botSettingsActions } = require("./bot/actions");
const { CLIENT } = require("./config");
const { BOT_SETTINGS_GROUP, BOT_HISTORY_GROUP } = require("./const");
const {
  destChats,
  generateUniqueId,
  fileSizeInMb,
  isVideoOrImage,
  sanitizeMessage,
  removeLinksFromText,
} = require("./utils");

let messageQueue = [];
let isProcessing = false;

const sendToDestChats = async (data, chat) => {
  if (destChats && destChats.length < 1) return;

  for (const chatId of destChats) {
    await CLIENT.sendMessage(chatId, data);
  }

  // Отправляем те же сообщения в группу истории бота
  if (chat) {
    const messageWithHistory = `${data}\n\nИз какой группы: ${chat.name}`;
    await CLIENT.sendMessage(BOT_HISTORY_GROUP.ID, messageWithHistory);
  }
  else {
    await CLIENT.sendMessage(BOT_HISTORY_GROUP.ID, data);
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

    const textWithoutLinks = removeLinksFromText(msg.body); // no links
    const textWithoutKeywords = sanitizeMessage(textWithoutLinks); // no keywords
    let message = `${textWithoutKeywords}\n\nАртикул: ${generateUniqueId?.()}\n\nКонтакты: wa.me/996709700433`;

    await sendToDestChats(message, chat);
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
    isProcessing = false;
    return;
  }

  // Добавление сообщения в очередь с проверкой типа
  messageQueue.push({ msg, chat });

  timerId = setTimeout(() => {
    if (!isProcessing) {
      const firstMessage = messageQueue[0];

      if (firstMessage && firstMessage.msg?.body) {
        const elements = messageQueue.slice(1).reverse();

        messageQueue = [...elements, firstMessage];
      }

      processQueue();
    }
  }, 5000);
};

module.exports = { onMessageCreated };
