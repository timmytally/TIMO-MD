// ===================================
//            BOT INFO
// ===================================
const BOT_INFO = {
    name: "TIMO-MD",
    owner: "OKERI-TECH",
    prefix: ".",
    menuImage: "https://files.catbox.moe/woe4tl.png",

    description: "🤖 TIMO-MD is active and ready!"
};

// ===================================
//           SETTINGS
// ===================================
const SETTINGS = {
    autoTyping: false,
    autoRecording: false,
    warnLimit: 3
};

// ===================================
//      COMMAND STORAGE (ORIGINAL)
// ===================================
const COMMANDS = {};   // Your original storage
const warnings = {};   // For warn system

// =========================
//     CATEGORY ARRAYS
// =========================
const toolsCommands = [
    "ping",
    "hello",
    "info",
    "sticker"
];

const groupCommands = [
    "itawatu",
    "autotyping",
    "autorecording",
    "kick",
    "warn"
];

const ownerCommands = [
    // for now empty (your choice)
];

// ===================================
//      COMMAND DEFINITIONS
// ===================================

// ----- ping -----
COMMANDS.ping = async ({ msg, sock }) => {
    await sock.sendMessage(msg.key.remoteJid, { text: "PONG 🏓" });
};

// ----- hello -----
COMMANDS.hello = async ({ msg, sock }) => {
    await sock.sendMessage(msg.key.remoteJid, { text: "Hello! 👋" });
};

// ----- info -----
COMMANDS.info = async ({ msg, sock }) => {
    await sock.sendMessage(msg.key.remoteJid, { text: "This is TIMO-MD bot info." });
};

// ----- sticker -----
COMMANDS.sticker = async ({ msg, sock }) => {
    if (!msg.message.imageMessage) {
        return sock.sendMessage(msg.key.remoteJid, { text: "Reply to an image with .sticker" });
    }

    const buffer = await sock.downloadMediaMessage(msg);
    await sock.sendMessage(msg.key.remoteJid, {
        sticker: buffer
    });
};

// ----- itawatu (group message) -----
COMMANDS.itawatu = async ({ msg, sock }) => {
    await sock.sendMessage(msg.key.remoteJid, { text: "naita watu apa 😂" });
};

// ----- auto typing -----
COMMANDS.autotyping = async ({ msg, sock, args }) => {
    if (!args[0]) return sock.sendMessage(msg.key.remoteJid, { text: "Use: .autotyping on/off" });
    SETTINGS.autoTyping = args[0].toLowerCase() === "on";
    await sock.sendMessage(msg.key.remoteJid, { text: `Auto typing set to ${SETTINGS.autoTyping}` });
};

// ----- auto recording -----
COMMANDS.autorecording = async ({ msg, sock, args }) => {
    if (!args[0]) return sock.sendMessage(msg.key.remoteJid, { text: "Use: .autorecording on/off" });
    SETTINGS.autoRecording = args[0].toLowerCase() === "on";
    await sock.sendMessage(msg.key.remoteJid, { text: `Auto recording set to ${SETTINGS.autoRecording}` });
};

// ----- kick -----
COMMANDS.kick = async ({ msg, sock, args }) => {
    if (!msg.message.extendedTextMessage) return;
    const target = msg.message.extendedTextMessage.contextInfo.participant;

    await sock.groupParticipantsUpdate(msg.key.remoteJid, [target], "remove");
    await sock.sendMessage(msg.key.remoteJid, { text: "User removed" });
};

// ----- warn -----
COMMANDS.warn = async ({ msg, sock }) => {
    if (!msg.message.extendedTextMessage) return;
    const target = msg.message.extendedTextMessage.contextInfo.participant;

    if (!warnings[target]) warnings[target] = 0;
    warnings[target]++;

    if (warnings[target] >= SETTINGS.warnLimit) {
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [target], "remove");
        warnings[target] = 0; // reset
        return sock.sendMessage(msg.key.remoteJid, { text: "User auto-removed (warn limit)" });
    }

    await sock.sendMessage(msg.key.remoteJid, {
        text: `⚠️ Warned ${target}\nWarnings: ${warnings[target]}`
    });
};

// ===================================
//             MENU COMMAND
// ===================================
COMMANDS.menu = async ({ msg, sock }) => {
    const categories = {
        "TOOLS MENU": toolsCommands,
        "GROUP MENU": groupCommands,
        "OWNER MENU": ownerCommands
    };

    let menuText = `┏▣ ◈ *${BOT_INFO.name}* ◈
┃ Owner: ${BOT_INFO.owner}
┃ Prefix: [ ${BOT_INFO.prefix} ]
┗▣\n\n`;

    for (const [cat, cmds] of Object.entries(categories)) {
        if (!cmds.length) continue;
        menuText += `┏▣ ◈ *${cat}* ◈\n`;
        for (const c of cmds) menuText += `│➽ ${c}\n`;
        menuText += "┗▣\n\n";
    }

    menuText += BOT_INFO.description;

    await sock.sendMessage(msg.key.remoteJid, {
        image: { url: BOT_INFO.menuImage },  // TOP IMAGE
        caption: menuText                     // TEXT MENU BELOW
    });
};

// ===================================
//           EXPORT MODULE
// ===================================
module.exports = {
    BOT_INFO,
    SETTINGS,
     commands: COMMANDS,
    warnings
};
