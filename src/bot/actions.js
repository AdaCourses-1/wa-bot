const { CLIENT } = require("../config");
const {
  BOT_SETTINGS_GROUP,
  COMMANDS,
  DB_PATHS,
  KEYWORDS_TO_REMOVE,
} = require("../const");
const { loadCacheFromFile, saveCacheToFile } = require("../saveGroups");

const botSettingsActions = async (msg) => {
  const command = await msg.body;

  if (command === COMMANDS.GET_CHATS) {
    const chats = loadCacheFromFile(DB_PATHS.GROUPS);

    let message = ``;

    chats?.forEach((chat) => {
      message += `Название: ${chat.name}\n` + `ID: ${chat.id}\n` + `\n---\n`; // Adds a separator line for clarity
    });

    console.log(`Поступила команда ${COMMANDS.GET_CHATS}, выполняю!`);

    try {
      await CLIENT.sendMessage(BOT_SETTINGS_GROUP.ID, message);
    } catch (err) {
      console.log(
        `Не смог выполнить команду ${COMMANDS.GET_CHATS}, причина: ${err.message}`
      );
    }
  }

  if (command.includes(COMMANDS.ADD_DEST_TYPE)) {
    console.log(`Поступила команда:${COMMANDS.ADD_DEST_TYPE}, выполняю!`);
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

  if (command.includes(COMMANDS.GET_KEYWORDS)) {
    try {
      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        KEYWORDS_TO_REMOVE.join(", ")
      );
    } catch (err) {
      console.log(
        `Не смог выполнить команду ${COMMANDS.GET_KEYWORDS}, причина: ${err.message}`
      );
    }
  }

  if (command.includes(COMMANDS.GET_ADDED_GROUPS)) {
    const chats = await CLIENT.getChats();
    const bot = await loadCacheFromFile(DB_PATHS.BOT_SETTINGS);

    if (!bot) return;
  
    let getSourceChats = `Группы откуда берутся товары:\n\n`
    let getDestChats = `Группы куда скидываются товары:\n\n`

    chats?.forEach((chat) => {
      if (bot.source_chats.includes(chat.id._serialized)) {
        getSourceChats +=`Название: ${chat.name}\n` + `ID: ${chat.id._serialized}\n` + `\n---\n`
      }
      if (bot.dest_chats.includes(chat.id._serialized)) {
        getDestChats += `Название: ${chat.name}\n` + `ID: ${chat.id._serialized}\n` + `\n---\n`
      }
    });

    console.log(`Поступила команда ${COMMANDS.GET_ADDED_GROUPS}, выполняю!`);

    try {
      await CLIENT.sendMessage(BOT_SETTINGS_GROUP.ID, getSourceChats);
      await CLIENT.sendMessage(BOT_SETTINGS_GROUP.ID, getDestChats);
    } catch (err) {
      console.log(
        `Не смог выполнить команду ${COMMANDS.GET_ADDED_GROUPS}, причина: ${err.message}`
      );
    }
  }
};

module.exports = {
  botSettingsActions,
};
