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

/**
 * Adds a message to a specific group in the messages queue.
 * If the current message group has both text and media messages,
 * a new message group is created to hold the new message.
 * Otherwise, the new message is added to the last message group.
 *
 * @param {Object} group - The group to add the message to.
 * @param {Object} msg - The message to add.
 */
const addMessageToGroup = (group, msg) => {
  // Check if the message is a text message
  const isText = !!msg.body;

  // Get the last message group in the group's messages queue
  const lastGroup = group.messages[group.messages.length - 1];

  // Check if the current message group has both text and media messages
  const hasText = lastGroup.some((message) => !!message.body);
  const hasMedia = lastGroup.some((message) => message.hasMedia);

  // If the current message group has both text and media messages and the new message is a text message,
  // create a new message group to hold the new message
  if (hasText && hasMedia && isText) {
    group.messages.push([msg]);
  } else {
    // Add the new message to the last message group
    lastGroup.push(msg);
  }
};

const processGroupMessages = async (group) => {
  if (!group || !group.messages.length) return;

  const messages = group.messages.shift();

  for (const message of messages) {
    await onMessageCreated(message);
  }

  if (group.messages.length > 0) {
    await processGroupMessages(group);
  }
};

const messageReceived = async (msg) => {
  const chatId = await msg.getChat().id._serialized;

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
const debouncedMessages = debounce(sendMessagesFromGroups, 1800000);

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
