exports.command = 'ytdl';
exports.exec = async ({ sock, msg, text }) => {
  const args = text.trim().split(/\s+/);
  if (args.length < 2) return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: ytdl <youtube-url>' });
  const url = args[1];
  try {
    const ytdl = require('ytdl-core');
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
    // limit file size: stream and send as video (may fail on large files)
    const stream = ytdl(url, { quality: 'highestvideo' });
    await sock.sendMessage(msg.key.remoteJid, { video: stream, caption: `Downloaded: ${info.videoDetails.title}` });
  } catch (e) {
    console.error('ytdl error', e);
    await sock.sendMessage(msg.key.remoteJid, { text: 'Failed to download video.' });
  }
};
