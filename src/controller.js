const { CLIENT } = require("./config");
const { BOT_HISTORY_GROUP } = require("./const");
const {
  exactPaths,
  generateUniqueId,
  fileSizeInMb,
  isVideoOrImage,
  sanitizeMessage,
  removeLinksFromText,
} = require("./utils");

let messageQueue = [];
let isProcessing = false;

const sendToDestChats = async (data, chat, msg) => {
  if (exactPaths && Object.keys(exactPaths).length < 1) return;

  const currentSourceChatId = chat.id._serialized;

  if (!exactPaths[currentSourceChatId]) return;

  for (const destChatId of exactPaths[currentSourceChatId]) {
    await CLIENT.sendMessage(destChatId, data);
  }

  // Отправляем те же сообщения в группу истории бота
  if (msg) {
    const messageWithHistory = `${data}\n\nИз какой группы: ${chat.name}`;
    await CLIENT.sendMessage(BOT_HISTORY_GROUP.ID, messageWithHistory);
  } else {
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

        await sendToDestChats(media, chat);
      }

      return;
    }

    const textWithoutLinks = removeLinksFromText(msg.body); // no links
    const textWithoutKeywords = sanitizeMessage(textWithoutLinks); // no keywords
    let message = `${textWithoutKeywords}\n\nАртикул: ${generateUniqueId?.()}\n\nКонтакты: wa.me/996709700433`;

    await sendToDestChats(message, chat, msg);
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

  // Добавление сообщения в очередь с проверкой типа
  messageQueue.push({ msg, chat });

  timerId = setTimeout(() => {
    if (!isProcessing) {
      messageQueue = reorderQueue(messageQueue);

      processQueue();
    }
  }, 5000);
};

function reorderQueue(messageQueue) {
  // Отделяем объекты с полем msg.body от тех, у кого его нет
  const withBody = messageQueue.find((item) => item.msg?.body);
  const withoutBody = messageQueue.filter((item) => !item.msg?.body);

  let emptyMessage = withBody;

  if (!withBody || !withBody.length) {
    emptyMessage = {
      msg: {
        body: "Новое поступление!",
      },
      chat: withoutBody[0]?.chat,
    };
  }

  // Объединяем массивы: сначала объекты без msg.body, затем объекты с msg.body
  return [...withoutBody, withBody ? { ...withBody } : emptyMessage];
}

module.exports = { onMessageCreated };
