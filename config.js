const fs = require("fs");
if (fs.existsSync("config.env")) require("dotenv").config({ path: "./config.env" });

// Convert env string to boolean
function toBool(text, defaultValue = true) {
    if (text === undefined) return defaultValue;
    return text.toLowerCase() === "true";
}

// ---------------- BOT SETTINGS ----------------
const BOT_INFO = {
    prefix: process.env.PREFIX || ".",
    name: process.env.BOT_NAME || "TIMO-MD",
    owner: process.env.OWNER_NAME || "TIMO-TECH",
    ownerNumber: process.env.OWNER_NUMBER || "25445898330",
    stickerName: process.env.STICKER_NAME || "TIMO-MD",
    menuImage: process.env.MENU_IMAGE_URL || "https://files.catbox.moe/4j07ae.jpg",
    description: process.env.DESCRIPTION || "*© POWERED BY TIMO MD*",
};

// ---------------- FEATURE SETTINGS ----------------
const SETTINGS = {
    autoSeen: toBool(process.env.AUTO_STATUS_SEEN),
    autoReply: toBool(process.env.AUTO_REPLY),
    autoReact: toBool(process.env.AUTO_STATUS_REACT),
    autoStatusReply: toBool(process.env.AUTO_STATUS_REPLY),
    autoStatusMsg: process.env.AUTO_STATUS_MSG,
    antiDelete: toBool(process.env.ANTI_DELETE),
    antiLink: toBool(process.env.ANTI_LINK),
    welcome: toBool(process.env.WELCOME),
    alwaysOnline: toBool(process.env.ALWAYS_ONLINE),
    chatbot: toBool(process.env.CHATBOT),
    autoSticker: toBool(process.env.AUTO_STICKER),
    autoTyping: toBool(process.env.AUTO_TYPING),
    autoRecording: toBool(process.env.AUTO_RECORDING),
    readMessage: toBool(process.env.READ_MESSAGE),
    antiCall: toBool(process.env.ANTICALL),
    customReact: toBool(process.env.CUSTOM_REACT),
    customReactEmojis: (process.env.CUSTOM_REACT_EMOJIS || "💝,💖,💗,❤️‍🩹,❤️,🧡,💛,💚,💙,💜,🤎,🖤,🤍").split(","),

};

// ---------------- COMMANDS ----------------
// Define commands here as functions
const commands = {
    ping: async ({ msg, sock }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: "🏓 Pong!" });
    },
    menu: async ({ msg, sock }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📜 *${BOT_INFO.name} Menu*\nPrefix: ${BOT_INFO.prefix}\nCommands: ping, menu, hello`
        });
    },
    hello: async ({ msg, sock }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: "👋 Hello! How are you?" });
    },
};

module.exports = {    BOT_INFO,
    commands,
    SESSION_ID: process.env.SESSION_ID || "",
    AUTO_STATUS_SEEN: process.env.AUTO_STATUS_SEEN || "true",
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "false",
    AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT || "true",
    ANTI_CALL: process.env.ANTI_CALL || "true",
    ANTI_DELETE: process.env.ANTI_DELETE || "true",
    WELCOME: process.env.WELCOME || "true",
    ANTI_LINK: process.env.ANTI_LINK || "true",
    MENTION_REPLY: process.env.MENTION_REPLY || "false",
    MENU_IMAGE_URL: process.env.MENU_IMAGE_URL || "https://files.catbox.moe/52dotx.jpg",};
