const { Events } = require("whatsapp-web.js");

const CLIENT_EVENTS = {
  MESSAGE_CREATE: Events.MESSAGE_CREATE,
  MESSAGE_RECEIVED: Events.MESSAGE_RECEIVED,
  AUTH_FAILURE: "auth_failure",
  QR: "qr",
  READY: "ready",
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
const COMMANDS = {
  GET_CHATS: "Получить чаты",
  ADD_DEST_TYPE: "Куда скидывать",
  ADD_SOURCE_TYPE: "Откуда брать",
  CLEAR_CHATS: "Удалить все добавленные группы",
  GET_KEYWORDS: "Получить ключевые слова",
  ADD_KEYWORDS: "Добавить ключевые слова",
};

const KEYWORDS_TO_REMOVE = [
  "893/8",
  "Дордой",
  "дордой",
  "Дорд",
  "дорд",
  "прох",
  "проход",
  "Прох",
  "Проход",
  "конт",
  "кон",
  "Конт",
  "Кон",
  "ряд",
  "р.",
  "-1",
  "-2",
  "-3",
  "-4",
  "-5",
  "АЗС",
  "азс",
  "Азс",
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
  "ЛЭП",
  "лэп",
  "Кишка",
  "кишка",
  "Алкан",
  "Меркурий",
  "Брючный",
  "адрес",
  "Адрес",
  "адр.",
  "Адр.",
];

const LINKS_TO_REMOVE = ["https", "http", "wa.me/", "t.me/"];

module.exports = {
  CLIENT_EVENTS,
  BOT_SETTINGS_GROUP,
  COMMANDS,
  DB_PATHS,
  KEYWORDS_TO_REMOVE,
  LINKS_TO_REMOVE
};
