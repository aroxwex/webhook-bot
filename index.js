const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const webhookUrl = process.env.WEBHOOK_URL;

client.once('ready', () => {
    console.log(`${client.user.tag} olarak giriş yapıldı!`);
});

client.on('guildMemberAdd', (member) => {
    const payload = {
        content: `${member.user.tag} sunucuya katıldı! Hoş geldin!`
    };
    fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(err => console.error('Webhook hatası:', err));
});

client.login(process.env.BOT_TOKEN);
