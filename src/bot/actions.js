const { CLIENT } = require("../config");
const {
  BOT_SETTINGS_GROUP,
  COMMANDS,
  DB_PATHS,
  KEYWORDS_TO_REMOVE,
  BOT_HISTORY_GROUP,
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
    return;
  }

  if (command === COMMANDS.GET_ALL_COMMANDS) {
    const allCommands = Object.values(COMMANDS);
    try {
      allCommands.forEach(async (botCommand, index) => {
        await CLIENT.sendMessage(
          BOT_SETTINGS_GROUP.ID,
          `${index + 1}. Команда: ${botCommand}`
        );
      });
    } catch (err) {
      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        `Не получилось выполнить команду: ${COMMANDS.GET_ALL_COMMANDS} по причине:\n\n${err.message}`
      );
    }

    return;
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

    let getSourceChats = `Группы откуда берутся товары:\n\n`;
    let getDestChats = `Группы куда скидываются товары:\n\n`;

    chats?.forEach((chat) => {
      if (bot.source_chats.includes(chat.id._serialized)) {
        getSourceChats +=
          `Название: ${chat.name}\n` +
          `ID: ${chat.id._serialized}\n` +
          `\n---\n`;
      }
      if (bot.dest_chats.includes(chat.id._serialized)) {
        getDestChats +=
          `Название: ${chat.name}\n` +
          `ID: ${chat.id._serialized}\n` +
          `\n---\n`;
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

  if (command.includes(COMMANDS.ADD_EXACT_PATHS)) {
    const bot = loadCacheFromFile(DB_PATHS.BOT_SETTINGS);

    try {
      const lines = command.trim().split("\n");

      // Извлекаем chat_id1 и chat_id2
      const chatId1 = lines[2].split(": ")[1]; // 2 строка
      const chatId2 = lines[3].split(": ")[1]; // 3 строка

      const newExactPath = {
        source_chat: chatId1,
        dest_chat: chatId2,
      };

      if (bot.exact_paths) {
        const data = {
          ...bot,
          exact_paths: [...bot.exact_paths, newExactPath],
        };
        saveCacheToFile(data, DB_PATHS.BOT_SETTINGS);
      } else {
        const data = {
          ...bot,
          exact_paths: [newExactPath],
        };
        saveCacheToFile(data, DB_PATHS.BOT_SETTINGS);
      }

      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        `Успешно добавил 2 группы!\n\nТеперь товары будут браться конкретно из группы ${newExactPath.source_chat} и добавляться конкретно в группу ${newExactPath.dest_chat}`
      );
    } catch (err) {
      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        `Не получилось реализовать команду ${COMMANDS.ADD_EXACT_PATHS} по причине:\n\n${err.message}`
      );
    }
    return;
  }

  if (command.includes(COMMANDS.GET_EXACT_PATHS)) {
    const bot = loadCacheFromFile(DB_PATHS.BOT_SETTINGS);
    const chats = await CLIENT.getChats();

    try {
      bot.exact_paths?.forEach(async (path) => {
        const sourceChat = chats.find(
          (chat) => chat.id._serialized === path.source_chat
        );
        const destChat = chats.find(
          (chat) => chat.id._serialized === path.dest_chat
        );

        await CLIENT.sendMessage(
          BOT_SETTINGS_GROUP.ID,
          `Откуда:\nНазвание:${sourceChat?.name}\nID:${sourceChat?.id?._serialized}\n\nКуда:\nНазвание:${destChat?.name}\nID:${destChat?.id?._serialized}`
        );
      });
    } catch (err) {
      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        `Не получилось выполнить команду ${COMMANDS.GET_EXACT_PATHS} по причине:\n\n ${err.message}`
      );
    }

    return;
  }

  if (command.includes(COMMANDS.CLEAR_EXACT_PATHS)) {
    const bot = loadCacheFromFile(DB_PATHS.BOT_SETTINGS);
    try {
      const data = {
        ...bot,
        exact_paths: [],
      };
      saveCacheToFile(data, DB_PATHS.BOT_SETTINGS);

      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        `Все группы куда и откуда скидываются товары были удалены!`
      );
    } catch (err) {
      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        `Не получилось куда и откуда скидываются товары удалить по причине:\n\n${err.message}`
      );
    }
  }
};

module.exports = {
  botSettingsActions,
};
