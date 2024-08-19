const { onMessageCreated } = require("../controller");
const { BOT_SETTINGS_GROUP } = require("../const");
const { shouldBlockThread, exactPaths } = require("../utils");
const { debounce } = require("lodash");
const { botSettingsActions } = require("../whatsapp-dordoi-bot/actions");
const { CLIENT } = require("../config");

let groupsQueue = [];
let stopBot = false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const addMessageToGroup = (group, msg) => {
  const isText = msg.body;
  const currentMessagesQueue = group.messages.at(-1);

  const currentMessageGroupHasText = currentMessagesQueue.some(
    (message) => message.body
  );
  const currentMessageGroupHasMedia = currentMessagesQueue.some(
    (message) => message.hasMedia
  );

  if (currentMessageGroupHasText && currentMessageGroupHasMedia && isText) {
    group.messages.push([msg]);
  } else {
    // Добавить сообщение в поледний массив
    currentMessagesQueue.push(msg);
  }
};

const sendMessagesQueue = async (group) => {
  if (!group) return;

  const messages = group?.messages?.shift();
  let prevMessageType = null;

  if (!messages || !messages.length) {
    console.log("В группе нет сообщений для обработки =>", group);
    return;
  }
  console.log("messages.queue.length =>", messages.length);

  for (const message of messages) {
    if (message.type === "chat" && prevMessageType === "chat") {
      await delay(10000);
      await onMessageCreated(message);
    } else {
      await onMessageCreated(message);
    }

    prevMessageType = message.type;
  }

  if (group.messages.length > 0) {
    console.log(
      "В этой группе еще есть сообщения в очереди, начинаю их обрабатывать, остаток =>",
      group.messages.length
    );
    await delay(60000);
    sendMessagesQueue(group);
    return;
  }
  console.log("Полностью обработал всю группу! =>", group);
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

  const chat = await msg.getChat();
  const groupId = chat.id._serialized;

  // send to settings group
  if (BOT_SETTINGS_GROUP.ID === groupId) {
    await botSettingsActions(msg);
    return;
  }

  // Do not accept messages from not related to bot groups
  if (!exactPaths || !exactPaths[groupId]) return;

  const isBlockedThread = shouldBlockThread(groupId);
  // Do not accept messages from not related to bot groups
  if (isBlockedThread || (!msg.body && !msg.hasMedia)) return;

  await delay(30000)

  const addedGroup = groupsQueue.find((group) => group.id === groupId);

  if (addedGroup && !addedGroup.messages.length) {
    addedGroup.messages = [[]];
    console.log("Группа уже была, но без messageQueue, создал новый queue");
  }

  if (addedGroup) {
    addMessageToGroup(addedGroup, msg);
  }

  if (!addedGroup) {
    const newGroup = { id: groupId, messages: [[msg]] };

    groupsQueue.push(newGroup);

    console.log("Была создана и добавлена новая группа =>", groupsQueue);
  }

  debouncedMessages();
};
const debouncedMessages = debounce(sendMessagesFromGroups, 60000);

async function sendMessagesFromGroups() {
  try {
    console.log("Начал обработку групп сообщений");

    while (groupsQueue.length > 0) {
      const group = groupsQueue.shift();
      await delay(60000);
      await sendMessagesQueue(group);
    }

    console.log("groupsQueue", groupsQueue.length);
  } catch (err) {
    console.error("Ошибка получения чата:", err);
  }
}

module.exports = {
  messageReceived,
};
