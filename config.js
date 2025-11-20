const axios = require("axios");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const fs = require("fs");
if (fs.existsSync("config.env")) require("dotenv").config({ path: "./config.env" });

// REQUIRED IMPORTS (you were missing these!)
const { Configuration, OpenAIApi } = require("openai");

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

// Warning storage
let warnings = {};

// ---------------- COMMANDS ----------------
const commands = {

    ping: async ({ msg, sock }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: "🏓 Pong!" });
    },

    hello: async ({ msg, sock }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: "👋 Hello! How are you?" });
    },

    info: async ({ msg, sock }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `ℹ️ Bot Name: ${BOT_INFO.name}\nOwner: ${BOT_INFO.owner}\nPrefix: ${BOT_INFO.prefix}`,
        });
    },

    // FIXED STICKER COMMAND (NOW WORKING!)
    sticker: async ({ msg, sock }) => {
        if (!msg.message.imageMessage)
            return sock.sendMessage(msg.key.remoteJid, { text: "📸 Send an image with caption *.sticker*" });

        const buffer = await sock.downloadMediaMessage(msg);

        await sock.sendMessage(msg.key.remoteJid, {
            sticker: buffer,
            packname: BOT_INFO.stickerName,
            author: BOT_INFO.owner,
        });
    },

    quote: async ({ msg, sock }) => {
        const quotes = [
            "✨ Be the change you wish to see in the world.",
            "💡 Knowledge is power.",
            "🔥 Dreams don’t work unless you do.",
            "🌱 Every day is a new beginning.",
        ];
        await sock.sendMessage(msg.key.remoteJid, { text: quotes[Math.floor(Math.random() * quotes.length)] });
    },

    joke: async ({ msg, sock }) => {
        const jokes = [
            "Why don’t scientists trust atoms? Because they make up everything! 🤣",
            "I told my computer I needed a break, and it said: 'No problem, I'll go to sleep.' 😆",
            "Why did the scarecrow win an award? Because he was outstanding in his field! 😂",
        ];
        await sock.sendMessage(msg.key.remoteJid, { text: jokes[Math.floor(Math.random() * jokes.length)] });
    },

    time: async ({ msg, sock }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `🕒 Time: ${new Date().toLocaleString()}` });
    },

    date: async ({ msg, sock }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `📅 Date: ${new Date().toDateString()}` });
    },

    // ---------------- GROUP COMMANDS ----------------

    itawatu: async ({ msg, sock }) => {
        const jid = msg.key.remoteJid;
        if (!jid.endsWith("@g.us"))
            return sock.sendMessage(jid, { text: "❌ Group only." });

        const group = await sock.groupMetadata(jid);
        const mentions = group.participants.map(p => p.id);

        await sock.sendMessage(jid, { text: "👥 @yoh niggas", mentions });
    },

    autotyping: async ({ msg, sock }) => {
        await sock.sendPresenceUpdate("composing", msg.key.remoteJid);
    },

    autorecording: async ({ msg, sock }) => {
        await sock.sendPresenceUpdate("recording", msg.key.remoteJid);
    },

    kick: async ({ msg, sock, args }) => {
        const jid = msg.key.remoteJid;
        if (!jid.endsWith("@g.us"))
            return sock.sendMessage(jid, { text: "❌ Group only." });

        // FIXED MENTION SUPPORT
        let user = args[0]?.replace(/[^0-9]/g, "");
        if (!user)
            return sock.sendMessage(jid, { text: "❌ Tag or enter number.\nExample: .kick 2547xxxxxxx" });

        try {
            await sock.groupParticipantsUpdate(jid, [`${user}@s.whatsapp.net`], "remove");
            await sock.sendMessage(jid, { text: `✅ Removed ${user}` });
        } catch (err) {
            await sock.sendMessage(jid, { text: "⚠️ Bot must be admin." });
        }
    },

    warn: async ({ msg, sock, args }) => {
        let user = args[0]?.replace(/[^0-9]/g, "");
        if (!user)
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Tag or enter number." });

        warnings[user] = (warnings[user] || 0) + 1;
        await sock.sendMessage(msg.key.remoteJid, {
            text: `⚠️ User: ${user}\nWarnings: ${warnings[user]}/3`,
        });
    },

    // ---------------- ChatGPT AI ----------------
   chatgpt: async ({ msg, sock, args }) => {
    const axios = require("axios");
    const prompt = args.join(" ");
    if (!prompt)
        return sock.sendMessage(msg.key.remoteJid, { text: "❌ Provide text to ask AI." });

    try {
        const response = await axios.get(
            `https://bk9.fun/gpt4o?text=${encodeURIComponent(prompt)}`
        );

        await sock.sendMessage(msg.key.remoteJid, { text: response.data.result });

    } catch (err) {
        await sock.sendMessage(msg.key.remoteJid, { text: "⚠ AI request failed." });
    }
},

    // ---------------- MENU ----------------
    menu: async ({ msg, sock }) => {
        let menuText = `╔════════════════════
║ 🌟 *${BOT_INFO.name} Menu* 🌟
╠════════════════════
║ 🔹 Prefix: ${BOT_INFO.prefix}
║ 🔹 Owner: ${BOT_INFO.owner}
╠════════════════════
║ 📌 Commands:\n`;

        let i = 1;
        for (let cmd in commands) menuText += `║ ${i++}️⃣ ${cmd}\n`;

        menuText += `╚════════════════════
${BOT_INFO.description}`;

        await sock.sendMessage(msg.key.remoteJid, { text: menuText });
    },
};

module.exports = {
    BOT_INFO,
    SETTINGS,
    commands,
    SESSION_ID: process.env.SESSION_ID || "",
};
