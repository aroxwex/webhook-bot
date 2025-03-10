const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');
const express = require('express');

const app = express();
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const webhookUrl = process.env.WEBHOOK_URL;

// Basit bir web sunucusu (uyku modunu önlemek için)
app.get('/ping', (req, res) => {
    res.send('Bot aktif!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Web sunucusu ${port} portunda çalışıyor`);
});

client.once('ready', () => {
    console.log(`${client.user.tag} olarak giriş yapıldı!`);
});

client.on('guildMemberAdd', (member) => {
    const payload = {
        content: `${member.user.toString()} Hoş geldin!`
    };
    fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(err => console.error('Webhook hatası:', err));
});

client.login(process.env.BOT_TOKEN);
