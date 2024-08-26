const { onMessageCreated } = require("../controller");
const { BOT_SETTINGS_GROUP, DB_PATHS } = require("../const");
const { exactPaths } = require("../utils");
const { debounce } = require("lodash");
const { botSettingsActions } = require("../whatsapp-dordoi-bot/actions");
const { CLIENT } = require("../config");
const { loadCacheFromFile, saveCacheToFile } = require("../saveGroups");

let groupsQueue = [];
let stopBot = false;
let groupsQueueFlag = false;
let messageQueueFlag = false;

const bot = loadCacheFromFile(DB_PATHS.BOT_SETTINGS);

const getMsFromMinutes = (ms) => ms * 60000;

const messagesCounter = () => {
  if (bot.messages_counter) {
    return ++bot.messages_counter;
  }
  return 1;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const addMessageToGroup = (group, message) => {
  const isText = !!message.body;
  // Получаем последнюю группу сообщений или создаем новую
  let lastGroup = group.messages.at(-1);

  // // Проверяем, содержит ли последняя группа текстовые и медиа сообщения
  // const containsText = lastGroup.some((msg) => !!msg.body);
  // const containsMedia = lastGroup.some((msg) => msg.hasMedia);

  // if (lastGroup[0]?.type === "chat") {
  //   lastGroup.unshift(message);
  //   return;
  // }

  // // Если последняя группа содержит и текстовые, и медиа сообщения
  // // и новое сообщение текстовое, создаем новую группу
  // if (containsText && containsMedia && isText) {
  //   group.messages.push([message]);
  //   return;
  // }

  lastGroup.push(message);

};

const processGroupMessages = async (group) => {
  if (!group || !group.messages.length) return;

  messageQueueFlag = true;

  while (group.messages.length > 0) {
    const messages = group.messages.shift();

    for (const message of messages) {
      await onMessageCreated(message);
    }

    await delay(getMsFromMinutes(2));
  }

  messageQueueFlag = false;
};

const messageReceived = async (msg) => {
  if (msg.body === "/start") {
    await CLIENT.sendMessage(
      BOT_SETTINGS_GROUP.ID,
      stopBot
        ? "Вы запустили бота, ожидаем команды!"
        : "Бот уже запущен, не надо нагнетать!"
    );
    stopBot = false;
    return;
  }

  if (stopBot) {
    await CLIENT.sendMessage(
      BOT_SETTINGS_GROUP.ID,
      "Внимание! Бот остановлен и не выполняет команды, введите /start чтобы вновь начать работу!"
    );
    return;
  }

  if (msg.body === "/stop") {
    await CLIENT.sendMessage(
      BOT_SETTINGS_GROUP.ID,
      "Бот остановлен, введите команду /start чтобы восстановить работу бота"
    );
    stopBot = true;
    return;
  }

  // Преобразование UNIX timestamp в миллисекунды и создание объекта Date
  const date = new Date(msg.timestamp * 1000);

  // Альтернативный способ - форматирование вручную
  const formattedDate = `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(
    date.getSeconds()
  ).padStart(2, "0")}`;

  const chatId = (await msg.getChat()).id?._serialized;

  if (BOT_SETTINGS_GROUP.ID === chatId) {
    await botSettingsActions(msg);
    return;
  }

  if (!exactPaths || !exactPaths[chatId]) return;

  const chat = await msg.getChat();

  saveCacheToFile(
    {
      ...bot,
      messages_counter: messagesCounter(),
    },
    DB_PATHS.BOT_SETTINGS
  );

  console.log(
    formattedDate,
    "msg.type =>",
    msg.type,
    "body =>",
    msg.body,
    "chatName",
    chat.name
  );

  const existingGroup = groupsQueue.find((group) => group.id === chatId);

  if (existingGroup) {
    addMessageToGroup(existingGroup, msg);
  } else {
    const newGroup = { id: chatId, messages: [[msg]] };
    groupsQueue.push(newGroup);
  }

  debouncedMessages();
};
const debouncedMessages = debounce(
  sendMessagesFromGroups,
  getMsFromMinutes(20)
);

async function sendMessagesFromGroups() {
  if (groupsQueueFlag) return;
  try {
    console.log("Начал обработку групп сообщений");

    groupsQueueFlag = true;

    while (groupsQueue.length > 0) {
      if (messageQueueFlag) {
        await delay(getMsFromMinutes(2));
        continue;
      }
      const group = groupsQueue.shift();
      await processGroupMessages(group);
      await delay(getMsFromMinutes(5));
    }

    groupsQueueFlag = false;

    if (groupsQueue.length > 0) {
      console.log(
        "Осталось еще группы сообщений, увы, перезапускаюсь",
        groupsQueue.length
      );
      sendMessagesFromGroups();
    }

    console.log("groupsQueue", groupsQueue.length);
  } catch (err) {
    console.error("Ошибка получения чата:", err);
  }
}

module.exports = {
  messageReceived,
};
