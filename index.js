// index.js - TIMO-MD (Multi-Device, modular command loader)
// IMPORTANT: install the packages listed below before running.

const makeDebug = require('debug')('timo-md');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  generateMessageID,
} = require('@whiskeysockets/baileys');

const { default: Pino } = require('pino');

// web panel (optional)
const express = require('express');
const qrcode = require('qrcode');

const COMMANDS_DIR = path.join(__dirname, 'commands');
const SESSION_DIR = path.join(__dirname, 'session'); // persistent auth
const PORT = process.env.PORT || 3000;

let sock = null;
let QR_DATA_URL = null;
let BOT_STATUS = 'starting';

// load commands map from /commands folder
const commands = new Map();

function loadCommands() {
  commands.clear();
  if (!fs.existsSync(COMMANDS_DIR)) fs.mkdirSync(COMMANDS_DIR, { recursive: true });
  const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      delete require.cache[require.resolve(path.join(COMMANDS_DIR, file))];
      const mod = require(path.join(COMMANDS_DIR, file));
      if (mod && mod.command && typeof mod.exec === 'function') {
        commands.set(mod.command, mod);
        console.log('[CMD] Loaded', mod.command);
      }
    } catch (e) {
      console.error('[CMD] Failed to load', file, e);
    }
  }
}

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [4, 0, 0] }));

  sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false, // we generate QR for web & console
    browser: ['TIMO-MD', 'Chrome', '1.0.0'],
  });

  // save creds
  sock.ev.on('creds.update', saveCreds);

  // connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      QR_DATA_URL = await qrcode.toDataURL(qr);
      BOT_STATUS = 'qr';
      console.log('[QR] New QR generated (open web panel or terminal).');
      // also print small ascii qr:
      require('qrcode-terminal').generate(qr, { small: true });
    }

    if (connection === 'open') {
      BOT_STATUS = 'connected';
      QR_DATA_URL = null;
      console.log('TIMO-MD connected ✅');
      loadCommands(); // reload commands on connect
    }

    if (connection === 'close') {
      BOT_STATUS = 'disconnected';
      const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.name;
      console.warn('[CONN] closed, reason=', reason);
      if (reason === DisconnectReason.loggedOut) {
        console.warn('Logged out. Remove session folder and re-scan QR.');
        // do not auto-reconnect; require manual rescan
      } else {
        console.log('Attempting reconnect in 3s...');
        setTimeout(() => startSock(), 3000);
      }
    }
  });

  // messages
  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg || msg.key?.fromMe) return;

      // Auto-read feature (set to read receipts)
      try { await sock.readMessages([msg.key]); } catch (e) { /* ignore */ }

      // simple command parsing:
      const content = msg.message;
      let text = '';
      if (content.conversation) text = content.conversation;
      else if (content.extendedTextMessage) text = content.extendedTextMessage.text;
      else if (content.imageMessage?.caption) text = content.imageMessage.caption;
      else if (content.videoMessage?.caption) text = content.videoMessage.caption;

      if (!text) return;

      const prefix = process.env.CMD_PREFIX || '';
      const cmdName = text.trim().split(/\s+/)[0].replace(prefix, '').toLowerCase();

      // command hot reload: allow "!reload" from owner if needed
      if (cmdName === 'reload' && isFromOwner(msg)) {
        loadCommands();
        return sock.sendMessage(msg.key.remoteJid, { text: 'Commands reloaded.' });
      }

      if (commands.has(cmdName)) {
        const mod = commands.get(cmdName);
        try {
          await mod.exec({ sock, msg, text, isOwner: isFromOwner(msg) });
        } catch (err) {
          console.error('Command exec error', err);
          await sock.sendMessage(msg.key.remoteJid, { text: 'Error running command.' });
        }
      }
    } catch (err) {
      console.error('messages.upsert error', err);
    }
  });

  // group participants update (welcome/left)
  sock.ev.on('group-participants.update', async (update) => {
    try {
      const jid = update.id;
      for (const p of update.participants) {
        if (update.action === 'add') {
          const message = `Welcome @${p.split('@')[0]} 👋`;
          await sock.sendMessage(jid, {
            text: message,
            mentions: [p]
          });
        } else if (update.action === 'remove') {
          await sock.sendMessage(jid, { text: `Bye @${p.split('@')[0]} 💙`, mentions: [p] });
        }
      }
    } catch (e) { console.error(e); }
  });

  // anti-delete: re-send deleted messages to group (optional)
  sock.ev.on('messages.delete', async (ev) => {
    // ev has keys of deleted messages; we can attempt to fetch and notify
    try {
      // implementation can be improved: stash messages on incoming and restore here
      console.log('[ANTI-DELETE] message deleted, ids:', ev.keys);
    } catch (e) { /* ignore */ }
  });

  // calls - auto-block or send message
  sock.ev.on('call', async (call) => {
    try {
      // auto reply: do not accept calls
      const from = call[0].from;
      await sock.sendMessage(from, { text: 'I cannot accept calls. Please message me.' });
    } catch (e) { /* ignore */ }
  });

  return sock;
}

function isFromOwner(msg) {
  const owner = process.env.OWNER_JID; // e.g. "123456789@s.whatsapp.net"
  if (!owner) return false;
  return msg.key.participant === owner || msg.key.remoteJid === owner;
}

// ------------------ EXPRESS PANEL (optional) ------------------
const app = express();
app.use(express.static(path.join(__dirname, 'web')));

app.get('/status', (req, res) => {
  res.json({ status: BOT_STATUS, qr: QR_DATA_URL });
});

app.get('/restart', async (req, res) => {
  BOT_STATUS = 'restarting';
  try {
    if (sock) try { await sock.logout(); } catch (e) {}
  } catch {}
  await startSock();
  res.json({ ok: true });
});

app.get('/commands', (req, res) => {
  res.json({ commands: Array.from(commands.keys()) });
});

app.listen(PORT, () => {
  console.log(`Web panel running on port ${PORT}`);
});

// start the socket
startSock().catch(err => {
  console.error('START FAILED', err);
});
