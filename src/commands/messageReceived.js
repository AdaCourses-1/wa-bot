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
  const containsText = !!message.body;

  let latestGroup = group.messages[group.messages.length - 1];

  if (!latestGroup) {
    latestGroup = [];
    group.messages.push(latestGroup);
  }

  const latestGroupContainsText = latestGroup.some((msg) => !!msg.body);
  const latestGroupContainsMedia = latestGroup.some((msg) => msg.hasMedia);

  if (latestGroupContainsText && latestGroupContainsMedia) {
    if (containsText) {
      group.messages.push([message]);
    } else {
      latestGroup.push(message);
    }
  } else {
    latestGroup.push(message);
    const updatedContainsText = latestGroup.some((msg) => !!msg.body);
    const updatedContainsMedia = latestGroup.some((msg) => msg.hasMedia);

    if (
      (updatedContainsText && !updatedContainsMedia) ||
      (updatedContainsMedia && !updatedContainsText)
    ) {
      group.messages.push([]);
    }
  }
};

const processGroupMessages = async (group) => {
  if (!group || !group.messages.length) return;

  const messages = group.messages.shift();
  const prevMessage = null;

  for (const message of messages) {
    if (message.body && prevMessage.body) {
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

  const chatId = (await msg.getChat()).id?._serialized;

  console.log(chatId, "chatId");

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
