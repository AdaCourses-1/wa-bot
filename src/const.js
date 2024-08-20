const { Events } = require("whatsapp-web.js");

const CLIENT_EVENTS = {
  MESSAGE_CREATE: Events.MESSAGE_CREATE,
  MESSAGE_RECEIVED: Events.MESSAGE_RECEIVED,
  AUTH_FAILURE: Events.AUTHENTICATION_FAILURE,
  QR: Events.QR_RECEIVED,
  READY: Events.READY,
  DISCONNECTED: Events.DISCONNECTED,
};

const DB_PATHS = {
  GROUPS: "./db/groups.json",
  BOT_SETTINGS: "./db/bot_settings.json",
};

// ID тестовой группы куда скидываются товары

const BOT_SETTINGS_GROUP = {
  NAME: "Настройки Бота",
  ID: "120363321873527844@g.us",
  USER_ID: "120363321873527844",
};

const BOT_HISTORY_GROUP = {
  NAME: "История Бота",
  ID: "120363325237594651@g.us",
  USER_ID: "120363321873527844",
};

const COMMANDS = {
  GET_CHATS: "Получить чаты",
  GET_ALL_COMMANDS: "Получить команды",
  GET_ADDED_GROUPS: "Получить добавленные группы",
  ADD_DEST_TYPE: "Куда скидывать",
  ADD_SOURCE_TYPE: "Откуда брать",
  CLEAR_CHATS: "Удалить все добавленные группы",
  GET_KEYWORDS: "Получить ключевые слова",
  ADD_KEYWORDS: "Добавить ключевые слова",
  ADD_EXACT_PATHS: "Добавить откуда и куда",
  GET_EXACT_PATHS: "Получить откуда и куда",
  DELETE_EXACT_PATHS: "Удалить 1 группы откуд и куда",
  CLEAR_EXACT_PATHS: "Удалить все группы откуда и куда",
  ADD_ALL_GROUPS: "Добавить все группы!"
};

const KEYWORDS_TO_REMOVE = [
  "Проход 9 контейнер 892/12",
  "892/12",
  "Адрес 9",
  "893/8",
  "892",
  "893",
  "Дордой",
  "Дорд",
  "проход",
  "прох",
  "конт",
  "контейнер",
  "рынок",
  "кон",
  "ряд",
  "р.",
  "-1",
  "-2",
  "-3",
  "-4",
  "-5",
  "АЗС",
  "азс",
  "север",
  "Арктика",
  "Гермес",
  "/",
  "\\",
  "|",
  "пр",
  "к.",
  "китайский",
  "кит",
  "лэп",
  "кишка",
  "Алкан",
  "Меркурий",
  "Брючный",
  "адрес",
  "адр.",
];

const LINKS_TO_REMOVE = ["https", "http", "wa.me", "t.me"];

module.exports = {
  CLIENT_EVENTS,
  BOT_SETTINGS_GROUP,
  COMMANDS,
  DB_PATHS,
  KEYWORDS_TO_REMOVE,
  LINKS_TO_REMOVE,
  BOT_HISTORY_GROUP
};
