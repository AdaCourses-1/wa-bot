const { onMessageCreated } = require("../controller");
const { BOT_SETTINGS_GROUP } = require("../const");
const { shouldBlockThread, exactPaths } = require("../utils");
const { debounce } = require("lodash");
const { botSettingsActions } = require("../whatsapp-dordoi-bot/actions");
const { CLIENT } = require("../config");

let groupsQueue = [];
let stopBot = false;
let groupsQueueFlag = false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const addMessageToGroup = (group, message) => {
  const isText = !!message.body;

  // Получаем последнюю группу сообщений или создаем новую
  let lastGroup = group.messages[group.messages.length - 1];

  if (!lastGroup) {
    lastGroup = [];
    group.messages.push(lastGroup);
  }

  // Проверяем, содержит ли последняя группа текстовые и медиа сообщения
  const containsText = lastGroup.some((msg) => !!msg.body);
  const containsMedia = lastGroup.some((msg) => msg.hasMedia);

  // Если последняя группа содержит и текстовые, и медиа сообщения
  // и новое сообщение текстовое, создаем новую группу
  if (containsText && containsMedia && isText) {
    group.messages.push([message]);
    return;
  }

  // Добавляем сообщение в последнюю группу
  lastGroup.push(message);

  // Проверяем, содержит ли последняя группа теперь текстовые и медиа сообщения
  const updatedContainsText = lastGroup.some((msg) => !!msg.body);
  const updatedContainsMedia = lastGroup.some((msg) => msg.hasMedia);

  // Создаем новую группу только если предыдущая группа содержит и текстовые, и медиа сообщения
  if (
    containsText &&
    containsMedia &&
    ((updatedContainsText && !updatedContainsMedia) ||
      (!updatedContainsText && updatedContainsMedia))
  ) {
    group.messages.push([]);
  }
};

const processGroupMessages = async (group) => {
  if (!group || !group.messages.length) return;

  const messages = group.messages.shift();
  let prevMessage = null;

  for (const message of messages) {
    if (prevMessage && message.body && prevMessage?.body) {
      await delay(6000);
    }
    await onMessageCreated(message);

    prevMessage = message;
  }

  if (group.messages.length > 0) {
    await processGroupMessages(group);
  }
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
  console.log(formattedDate);

  console.log(formattedDate, "timestamp", 'msg.type =>', msg.type);

  const chatId = (await msg.getChat()).id?._serialized;

  if (BOT_SETTINGS_GROUP.ID === chatId) {
    await botSettingsActions(msg);
    return;
  }

  if (!exactPaths || !exactPaths[chatId]) return;

  const existingGroup = groupsQueue.find((group) => group.id === chatId);

  if (existingGroup) {
    addMessageToGroup(existingGroup, msg);
  } else {
    const newGroup = { id: chatId, messages: [[msg]] };
    groupsQueue.push(newGroup);
  }

  debouncedMessages();
};
const debouncedMessages = debounce(sendMessagesFromGroups, 25000);

async function sendMessagesFromGroups() {
  if (groupsQueueFlag) return;
  try {
    console.log("Начал обработку групп сообщений");

    groupsQueueFlag = true;

    while (groupsQueue.length > 0) {
      const group = groupsQueue.shift();
      await delay(60000);
      await processGroupMessages(group);
    }

    groupsQueueFlag = false;

    if (groupsQueue.length > 0) {
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
