// index.js - TIMO-MD (Multi-Device, single config command loader)
const fs = require("fs");
const path = require("path");
const express = require("express");
const qrcode = require("qrcode");
const pino = require("pino");
const { BOT_INFO, SETTINGS, commands, SESSION_ID } = require("./config");
const PREFIX = BOT_INFO.prefix;



const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
} = require("@whiskeysockets/baileys");


const SESSION_DIR = path.join(__dirname, "session");
const PORT = process.env.PORT || 3000;

let sock = null;
let QR_DATA_URL = null;
let BOT_STATUS = "starting";

// ---------------- SAFE MESSAGE EXTRACTOR ----------------
function getTextMessage(msg) {
    const m = msg.message;
    if (!m) return null;

    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.imageMessage?.caption) return m.imageMessage.caption;
    if (m.videoMessage?.caption) return m.videoMessage.caption;
    if (m.buttonsResponseMessage)
        return m.buttonsResponseMessage.selectedButtonId;
    if (m.listResponseMessage)
        return m.listResponseMessage.singleSelectReply.selectedRowId;

    return null;
}

// ---------------- HANDLE COMMAND ----------------------

async function handleCommand(msg, text, sock) {
    if (!text.startsWith(PREFIX)) return;

    const args = text.slice(PREFIX.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();

    const cmd = commands[cmdName];
    if (!cmd) {
        return sock.sendMessage(msg.key.remoteJid, {
            text: `❌ Unknown command: *${cmdName}*`
        });
    }

    try {
        await cmd({ msg, sock, args, text, PREFIX });
    } catch (err) {
        console.error("[CMD ERROR]", err);
        await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Command error. Check console." });
    }
}

// ------------------- START SOCKET ----------------------
async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        auth: state,
        version,
        logger: pino({ level: "silent" }),
        browser: ["TIMO-MD", "Chrome", "1.0.0"],
        printQRInTerminal: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            QR_DATA_URL = await qrcode.toDataURL(qr);
            BOT_STATUS = "qr";
            require("qrcode-terminal").generate(qr, { small: true });
            console.log("[QR] Scan QR from Web Panel or Terminal!");
        }

        if (connection === "open") {
            BOT_STATUS = "connected";
            QR_DATA_URL = null;
            console.log(`${BOT_INFO.name} connected ✅`);
        }

        if (connection === "close") {
            BOT_STATUS = "disconnected";
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.warn("[CONN CLOSED] reason =", reason);

            if (reason === DisconnectReason.loggedOut) {
                console.log("Logged out — delete session & rescan.");
            } else {
                console.log("Reconnecting in 3 seconds...");
                setTimeout(startSock, 3000);
            }
        }
    });

// ---------------- MESSAGE RECEIVER -----------------
sock.ev.on("messages.upsert", async (m) => {
    try {
        const msg = m.messages[0];
        if (!msg) return;

        const text = getTextMessage(msg);
        if (!text) return;

        console.log("Message:", text);
        await handleCommand(msg, text, sock); // <-- pass sock here
    } catch (err) {
        console.error("messages.upsert ERROR:", err);
    }
});
 return sock;
}

// ---------------------- WEB PANEL --------------------
const app = express();
app.use(express.static(path.join(__dirname, "web")));

app.get("/status", (req, res) => {
    res.json({ status: BOT_STATUS, qr: QR_DATA_URL });
});

app.listen(PORT, () => {
    console.log("Web panel running on port", PORT);
});

// --------------------- START BOT ---------------------
startSock().catch((e) => console.error("START FAILED", e));