const { ChatTypes } = require("whatsapp-web.js");
const { CLIENT } = require("./config");
const { BOT_SETTINGS_GROUP, COMMANDS, DB_PATHS } = require("./const");
const { loadCacheFromFile, saveCacheToFile } = require("./saveGroups");

const destChats = loadCacheFromFile(DB_PATHS.BOT_SETTINGS)?.dest_chats || [];
const sourceChats =
  loadCacheFromFile(DB_PATHS.BOT_SETTINGS)?.source_chats || [];

const fileSizeInMb = (fileSize) => fileSize / 1024 / 1024 || 0;
const isVideoOrImage = (mediaType) =>
  mediaType?.startsWith("image/") || mediaType?.startsWith("video/");

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
};

const sendToDestChats = async (data) => {
  if (destChats && destChats.length < 1) return;

  for (const chatId of destChats) {
    await CLIENT.sendMessage(chatId, data);
  }
};

const onMessageCreated = async (msg) => {
  // if (msg.fromMe) return;

  const chat = await msg.getChat();

  console.log('Контент из WA:', msg.body)

  const isSourceChat = sourceChats.includes(chat.id._serialized);

  if (BOT_SETTINGS_GROUP.ID === chat.id._serialized) {
    botSettingsActions(msg);
    return;
  }

  try {
    if (!isSourceChat) return;

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

    let message = `${msg.body}\n\nКонтакты: wa.me/996709700433`;

    await sendToDestChats(message);
  } catch (err) {
    console.log("Случилась ошибка:", err);
  }
};

module.exports = { onMessageCreated };
