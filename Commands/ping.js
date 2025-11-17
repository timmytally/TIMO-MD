exports.command = 'ping';
exports.exec = async ({ sock, msg }) => {
  await sock.sendMessage(msg.key.remoteJid, { text: 'pong 🏓' });
};
