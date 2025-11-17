exports.command = 'menu';
exports.exec = async ({ sock, msg }) => {
  const text = `TIMO-MD Menu
- ping
- menu
- sticker (reply image/video)
- ytdl <youtube-url>
- gpt <prompt> (owner only)
`;
  await sock.sendMessage(msg.key.remoteJid, { text });
};
