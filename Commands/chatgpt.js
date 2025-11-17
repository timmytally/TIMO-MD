exports.command = 'gpt';
exports.exec = async ({ sock, msg, text, isOwner }) => {
  if (!isOwner) return sock.sendMessage(msg.key.remoteJid, { text: 'Owner only.' });
  const args = text.split(' ').slice(1).join(' ');
  if (!args) return sock.sendMessage(msg.key.remoteJid, { text: 'Usage: gpt <prompt>' });

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: args,
    });
    const out = resp.output?.[0]?.content?.[0]?.text || JSON.stringify(resp);
    await sock.sendMessage(msg.key.remoteJid, { text: out });
  } catch (e) {
    console.error('GPT error', e);
    await sock.sendMessage(msg.key.remoteJid, { text: 'Error calling OpenAI.' });
  }
};
