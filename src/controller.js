const { CLIENT } = require("./config");
const {
  BOT_HISTORY_GROUP,
  BOT_SETTINGS_GROUP,
  GROUP_DIVIDER,
} = require("./const");
const {
  exactPaths,
  generateUniqueId,
  fileSizeInMb,
  isVideoOrImage,
  sanitizeMessage,
  removeLinksFromText,
  getFormattedDate,
} = require("./utils");

let messageQueue = [];
let isProcessing = false;
let prevChatName = null;

const sendToDestChats = async (data, chat, msg) => {
  if (exactPaths && Object.keys(exactPaths).length < 1) return;

  const currentSourceChatId = chat.id._serialized;

  if (!exactPaths[currentSourceChatId]) return;

  if (!prevChatName) {
    prevChatName = chat.name;
  }

  for (const destChatId of exactPaths[currentSourceChatId]) {
    if (prevChatName !== chat.name) {
      await CLIENT.sendMessage(destChatId, GROUP_DIVIDER);
      await CLIENT.sendMessage(
        BOT_HISTORY_GROUP.ID,
        `Закончил рассылать: ${prevChatName}\nКогда: ${getFormattedDate()}\n${GROUP_DIVIDER}\nНачал рассылать: ${chat.name}\nКогда: ${getFormattedDate()}`
      );
      prevChatName = chat.name;
    }
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
    await CLIENT.sendMessage(
      BOT_SETTINGS_GROUP.ID,
      `Данное сообщение не было доставлено клиентам по так как не было информации про CHAT и про MESSAGE\n\nКонтекст: message - ${msg}\nchat: ${
        chat ? chat.name : chat
      }`
    );
    return;
  }

  try {
    if (msg.hasMedia) {
      const media = await msg.downloadMedia();

      if (isVideoOrImage(media?.mimetype)) {
        if (fileSizeInMb(media?.fileSize) > 100) {
          // Проверка на размер более 100 МБ
          await CLIENT.sendMessage(
            BOT_SETTINGS_GROUP.ID,
            `Медиа-файл не был доставлен клиетам так как размер файла превышал допустимые нормы в 100МБ`
          );
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
    await CLIENT.sendMessage(
      BOT_SETTINGS_GROUP.ID,
      `Случилась непредвиденная ошибка с системой WhatsApp, контекст ошибки: \n\n${err.message}`
    );
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
      // messageQueue = reorderQueue(messageQueue)

      console.log("messageQueue", messageQueue.length);

      processQueue();
    }
  }, 5000);
};

function reorderQueue(messageQueue) {
  // Разделяем элементы с msg.body и без него
  const withBody = messageQueue.filter((item) => item.msg?.body);
  const withoutBody = messageQueue.filter((item) => item.msg?.hasMedia);

  // Если есть хотя бы один элемент с msg.body, перемещаем его в конец
  if (withBody.length > 0) {
    return [...withoutBody, ...withBody];
  } else {
    const emptyMessage = {
      msg: {
        body: "Новое поступление!",
      },
      chat: withoutBody[0]?.chat,
    };
    return [...withoutBody, emptyMessage];
  }
}

module.exports = { onMessageCreated };
