const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');
const express = require('express');
const fs = require('fs'); // Dosya işlemleri için Node.js'in fs modülünü ekliyoruz

const app = express();
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const webhookUrl = process.env.WEBHOOK_URL;

// Önceki üyeleri saklamak için bir JSON dosyası kullanacağız
const membersFile = 'members.json';

// JSON dosyasını kontrol et ve yoksa oluştur
if (!fs.existsSync(membersFile)) {
    fs.writeFileSync(membersFile, JSON.stringify([]));
}

// Basit bir web sunucusu (uyku modunu önlemek için)
app.get('/ping', (req, res) => {
    res.send('Bot aktif!');
});

// Ana dizin için rota ekleyelim (Cannot GET / hatasını çözmek için)
app.get('/', (req, res) => {
    res.send('Ana sayfa! Bot çalışıyor.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Web sunucusu ${port} portunda çalışıyor`);
});

client.once('ready', () => {
    console.log(`${client.user.tag} olarak giriş yapıldı!`);
});

client.on('guildMemberAdd', async (member) => {
    // JSON dosyasını oku
    let members = JSON.parse(fs.readFileSync(membersFile, 'utf-8'));

    // Üye daha önce kaydedilmiş mi kontrol et
    if (members.includes(member.id)) {
        console.log(`${member.user.tag} daha önce sunucuya katılmış, mesaj gönderilmedi.`);
        return; // Eğer üye daha önce katıldıysa, mesaj gönderme
    }

    // Üye ilk kez katıldı, ID'sini kaydet
    members.push(member.id);
    fs.writeFileSync(membersFile, JSON.stringify(members, null, 2));

    // Webhook mesajını gönder
    const payload = {
        content: `${member.user.toString()} sunucuya giriş yaptı!`
    };
    fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(err => console.error('Webhook hatası:', err));
});

client.login(process.env.BOT_TOKEN);
