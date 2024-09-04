const { CLIENT } = require("../config");
const {
  BOT_SETTINGS_GROUP,
  COMMANDS,
  DB_PATHS,
  KEYWORDS_TO_REMOVE,
  BOT_HISTORY_GROUP,
} = require("../const");
const { loadCacheFromFile, saveCacheToFile } = require("../saveGroups");
const { exec } = require("child_process");

const botSettingsActions = async (msg) => {
  const command = await msg.body;

  if (command === COMMANDS.GET_CHATS) {
    const chats = loadCacheFromFile(DB_PATHS.GROUPS);

    console.log(`Поступила команда ${COMMANDS.GET_CHATS}, выполняю!`);

    try {
      chats?.forEach(async (chat, index) => {
        await CLIENT.sendMessage(
          BOT_SETTINGS_GROUP.ID,
          `${index + 1}. Название: ${chat.name}\n` + `ID: ${chat.id}`
        );
      });
    } catch (err) {
      console.log(
        `Не смог выполнить команду ${COMMANDS.GET_CHATS}, причина: ${err.message}`
      );
    }
    return;
  }

  if (command.includes(COMMANDS.GET_ALL_COMMANDS)) {
    const allCommands = Object.values(COMMANDS);

    try {
      for (let index = 0; index < allCommands.length; index++) {
        const botCommand = allCommands[index];

        await CLIENT.sendMessage(
          BOT_SETTINGS_GROUP.ID,
          `${index + 1}. Команда: ${botCommand}`
        );
      }
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
    return;
  }

  if (command.includes(COMMANDS.ADD_KEYWORDS)) {
    const bot = loadCacheFromFile(DB_PATHS.BOT_SETTINGS);
    const keywordIndex = command.indexOf(COMMANDS.ADD_KEYWORDS);

    try {
      const keywordsPart = command.slice(keywordIndex + "Добавить ключевые слова:".length).trim();

      // Разбиваем текст на строки по каждому новому слову или значку новой строки
      const keywordsArray = keywordsPart.split(/\r?\n/).filter(line => line.trim() !== "");

      // Удаляем дубликаты
      const newKeywords = keywordsArray.filter(key => !bot.keywords_to_remove.includes(key));

      const data = {
        ...bot,
        keywords_to_remove: [...bot.keywords_to_remove, ...newKeywords],
      };

      saveCacheToFile(data, DB_PATHS.BOT_SETTINGS);
      await CLIENT.sendMessage(BOT_SETTINGS_GROUP.ID, `Добавление новых ключевых слов прошло успешно!\n\nПопробуйте получить список ключевых слов, чтобы увидеть результат.`);
      exec("pm2 restart bots");
    } catch (err) {
      await CLIENT.sendMessage(BOT_SETTINGS_GROUP.ID, `Не получилось добавить новые ключевые слова по причине: ${err.message}`);
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
    return;
  }

  if (command.includes(COMMANDS.ADD_EXACT_PATHS)) {
    const bot = loadCacheFromFile(DB_PATHS.BOT_SETTINGS);

    try {
      const lines = command.trim().split("\n");

      // Извлекаем chat_id1 и chat_id2
      const chatId1 = lines[2].split(":")[1]?.trim(); // 2 строка
      const chatId2 = lines[3].split(":")[1]?.trim(); // 3 строка

      const newExactPath = {
        source_chat: chatId1,
        dest_chat: chatId2,
      };

      const sourceChat = bot.exact_paths?.[chatId1];

      if (sourceChat) {
        const isGroupAlreadyAdded = sourceChat.includes(chatId2);

        if (isGroupAlreadyAdded) {
          await CLIENT.sendMessage(
            BOT_SETTINGS_GROUP.ID,
            `Эта группа уже была добавлена!`
          );
          return;
        }

        const data = {
          ...bot,
          exact_paths: {
            ...bot.exact_paths,
            [chatId1]: [...sourceChat, chatId2],
          },
        };
        saveCacheToFile(data, DB_PATHS.BOT_SETTINGS);
      } else {
        const data = {
          ...bot,
          exact_paths: {
            ...bot.exact_paths,
            [chatId1]: [chatId2],
          },
        };
        saveCacheToFile(data, DB_PATHS.BOT_SETTINGS);
      }

      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        `Успешно добавил 2 группы!\n\nТеперь товары будут браться конкретно из группы ${newExactPath.source_chat} и добавляться конкретно в группу ${newExactPath.dest_chat}`
      );
      exec("pm2 restart bots");
    } catch (err) {
      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        `Не получилось реализовать команду ${COMMANDS.ADD_EXACT_PATHS} по причине:\n\n${err.message}`
      );
    }
    return;
  }

  if (command.includes(COMMANDS.GET_EXACT_PATHS)) {
    const bot = await loadCacheFromFile(DB_PATHS.BOT_SETTINGS);

    const chats = await CLIENT.getChats();
    const sourceChats = Object.keys(bot.exact_paths || {});

    try {
      if (!sourceChats.length) {
        return await CLIENT.sendMessage(
          BOT_SETTINGS_GROUP.ID,
          "Извините, но нет добавленных групп!"
        );
      }

      for (const savedSourceChatId of sourceChats) {
        const sourceChat = chats.find(
          (chat) => chat.id._serialized === savedSourceChatId
        );
        const destChats = chats.filter((chat) =>
          bot.exact_paths[savedSourceChatId].includes(chat.id._serialized)
        );

        const sourceChatMessage = `Откуда:\nНазвание: ${sourceChat?.name}\nID: ${sourceChat?.id?._serialized}\n\n`;
        let destChatsMessage = `Куда:\n`;

        for (const destChat of destChats) {
          destChatsMessage += `Название: ${destChat?.name}\nID: ${destChat?.id?._serialized}\n\n`;
        }

        await CLIENT.sendMessage(
          BOT_SETTINGS_GROUP.ID,
          `${sourceChatMessage}${destChatsMessage}`
        );
      }
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
      exec("pm2 restart bots");
    } catch (err) {
      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        `Не получилось куда и откуда скидываются товары удалить по причине:\n\n${err.message}`
      );
    }
  }

  if (command.includes(COMMANDS.DELETE_EXACT_PATHS)) {
    const bot = await loadCacheFromFile(DB_PATHS.BOT_SETTINGS);

    const lines = command.trim().split("\n");

    try {
      // Извлекаем chat_id1 и chat_id2
      const chatId1 = lines[2].split(":")[1]?.trim(); // 2 строка
      const chatId2 = lines[3].split(":")[1]?.trim(); // 3 строка

      const data = {
        ...bot,
        exact_paths: {
          ...bot.exact_paths,
          [chatId1]: bot.exact_paths[chatId1].filter((id) => id !== chatId2),
        },
      };

      saveCacheToFile(data, DB_PATHS.BOT_SETTINGS);

      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        `Успешно удалил группы!\n\nТеперь товары НЕ будут браться конкретно из группы ${chatId1} и добавляться конкретно в группу ${chatId2}`
      );
      exec("pm2 restart bots");
    } catch (err) {
      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        `Не получилось реализовать команду ${COMMANDS.DELETE_EXACT_PATHS} по причине:\n\n${err.message}`
      );
    }
  }

  if (command.includes(COMMANDS.GET_INFO)) {
    const bot = await loadCacheFromFile(DB_PATHS.BOT_SETTINGS);
    const botSourceChatsCounter = Object.keys(bot.exact_paths)?.length;
    const botDestChatsCounter = Object.keys(bot.exact_paths).reduce(
      (chats, key) => {
        if (bot.exact_paths[key]) {
          bot.exact_paths[key].forEach((id) => {
            if (!chats.includes(id)) {
              chats = [...chats, id];
            }
          });
        }
        return chats;
      },
      []
    ).length;

    try {
      await CLIENT.sendMessage(
        BOT_SETTINGS_GROUP.ID,
        `Имя: Dordoi Killer\nДата Создания: 05.08.2024\nКонфигурация Сервера: 3 CPU, 4GB RAM, 15GB SSD\nКоличество чатов куда рассылаются сообщения: ${botDestChatsCounter}\nКоличество чатов откуда берутся сообщения: ${botSourceChatsCounter}`
      );
    } catch (err) {
      await CLIENT.sendMessage(
        BOT_HISTORY_GROUP.ID,
        `Не смог получить информацию из сервера по причине:${err.message}`
      );
    }
  }
};

module.exports = {
  botSettingsActions,
};
