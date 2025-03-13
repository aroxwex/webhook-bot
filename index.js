const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const fetch = require('node-fetch');
const express = require('express');
const fs = require('fs'); // Dosya işlemleri için Node.js'in fs modülünü ekliyoruz

const app = express();
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const webhookUrl = process.env.WEBHOOK_URL;

const targetRoleId = '1348485469742170204'; // Hedef rolün ID'sini buraya ekle
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

const prefix = '-'; // Prefix tanımla

// Komut işleyicisi
client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Sadece sunucu sahibi kontrolü
    if (message.author.id !== message.guild.ownerId) {
        return message.reply('Bu komutu sadece sunucu sahibi kullanabilir!');
    }

    // kanallarigizle komutu
    if (command === 'kanallarigizle') {
        if (!args[0]) {
            return message.reply('Lütfen bir rol etiketleyin! Örnek: `-kanallarigizle @Kayıtsız`');
        }

        // Rolü bul
        const roleMention = args[0].match(/<@&(\d+)>/);
        if (!roleMention) {
            return message.reply('Geçerli bir rol etiketleyin!');
        }

        const roleId = roleMention[1];
        const role = message.guild.roles.cache.get(roleId);

        if (!role) {
            return message.reply('Belirtilen rol bulunamadı!');
        }

        try {
            // Tüm kanallarda izni güncelle
            const channels = message.guild.channels.cache;
            for (const channel of channels.values()) {
                await channel.permissionOverwrites.edit(role, {
                    ViewChannel: false, // Kanalları Görüntüle iznini devre dışı
                }, 'Kanal görüntüleme izni kaldırıldı');
            }

            message.reply(`\`${role.name}\` rolü için tüm kanallarda "Kanalları Görüntüle" izni devre dışı bırakıldı!`);
        } catch (error) {
            console.error(error);
            message.reply('Bir hata oluştu, lütfen bot izinlerini kontrol et!');
        }
    }

    // Yeni ping komutu
    if (command === 'ping') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız!');
        }

        const ping = client.ws.ping;
        return message.reply(`Botun pingi: ${ping}ms`);
    }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const hadRoleBefore = oldMember.roles.cache.has(targetRoleId);
    const hasRoleNow = newMember.roles.cache.has(targetRoleId);

    // Rolü ilk kez aldıysa (eskiden yoksa, şimdi varsa)
    if (!hadRoleBefore && hasRoleNow) {
        try {
            let members = JSON.parse(await fs.promises.readFile(membersFile, 'utf-8'));
            if (!members.includes(newMember.id)) {
                // İlk kez rol aldı, hoş geldin mesajı gönder
                members.push(newMember.id);
                await fs.promises.writeFile(membersFile, JSON.stringify(members, null, 2));

                if (!webhookUrl) {
                    console.error('Webhook URL tanımlı değil!');
                    return;
                }

                const payload = {
                    content: `${newMember.user.toString()} sunucuya giriş yaptı!`
                };
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).catch(err => console.error('Webhook hatası:', err));
            }
        } catch (err) {
            console.error('Hata:', err);
        }
    }
});

client.login(process.env.BOT_TOKEN);
