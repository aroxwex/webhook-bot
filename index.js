const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const express = require('express');

const app = express();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Sabit değerler
const whitelistChannelName = '🏳️・whitelist'; // Whitelist kanalının adı
const logChannelName = '🗒️・whitelist-log'; // Log kanalının adı
const authorizedRoleId = '1387885041115463830'; // Yetkili rolün ID'si
const targetRoleId = '1387797050065682462'; // Verilecek rolün ID'si
const reactionEmojiId = '1387809434675183668'; // Özel emoji ID'si (mc_onay)

// Express sunucusu (uyku modunu önlemek için)
app.get('/ping', (req, res) => {
    console.log('Express: /ping rotası çağrıldı');
    res.send('Bot aktif!');
});

app.get('/', (req, res) => {
    console.log('Express: / rotası çağrıldı');
    res.send('Ana sayfa! Bot çalışıyor.');
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`Web sunucusu ${port} portunda çalışıyor`);
});

client.once('ready', () => {
    console.log(`${client.user.tag} olarak giriş yapıldı!`);
    console.log('Botun bağlı olduğu sunucular:', client.guilds.cache.map(g => `${g.name} (${g.id})`).join(', '));
    // Botun izinlerini kontrol et
    client.guilds.cache.forEach(guild => {
        const botMember = guild.members.me;
        console.log(`Sunucu: ${guild.name}`);
        console.log(`Botun izinleri: ${botMember.permissions.toArray().join(', ')}`);
        console.log(`Kanal listesi: ${guild.channels.cache.map(ch => `${ch.name} (${ch.id})`).join(', ')}`);
    });
});

// Mesaj olayını debug etmek için
client.on('messageCreate', async message => {
    console.log(`Mesaj alındı: ${message.author.tag} - ${message.content} (Kanal: ${message.channel.name}, Sunucu: ${message.guild?.name})`);
    if (!message.content.startsWith('-') || message.author.bot) {
        console.log(`Mesaj filtrelendi: Bot mesajı=${message.author.bot}, Prefix uyuşuyor mu=${message.content.startsWith('-')}`);
        return;
    }

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    console.log(`Komut çalıştırıldı: ${command} (Kullanıcı: ${message.author.tag})`);

    if (command === 'ping') {
        console.log(`Ping komutu çalıştırıldı: ${message.author.tag}`);
        const ping = client.ws.ping;
        return message.reply(`Botun pingi: ${ping}ms`);
    }
});

// Mesaj tepkisi eklendiğinde
client.on('messageReactionAdd', async (reaction, user) => {
    console.log(`Tepki alındı: ${user.tag} tarafından, emoji: ${reaction.emoji.name || reaction.emoji.id} (Kanal: ${reaction.message.channel.name}, Sunucu: ${reaction.message.guild?.name})`);

    // Mesajın tamamını al (kısmi tepki kontrolü)
    if (reaction.partial) {
        try {
            await reaction.fetch();
            console.log('Kısmi tepki alındı ve fetch edildi');
        } catch (error) {
            console.error('Tepki alınamadı:', error);
            return;
        }
    }

    const message = reaction.message;
    const guild = message.guild;
    if (!guild) {
        console.error('Sunucu bulunamadı');
        return;
    }

    const member = await guild.members.fetch(user.id).catch(err => {
        console.error('Kullanıcı alınamadı:', err);
        return null;
    });

    if (!member) {
        console.error('Kullanıcı fetch edilemedi');
        return;
    }

    // Whitelist kanalında mı kontrol et (büyük-küçük harf duyarlılığını kaldır)
    if (message.channel.name.toLowerCase() !== whitelistChannelName.toLowerCase()) {
        console.log(`Tepki whitelist kanalında değil: ${message.channel.name}`);
        return;
    }

    // Tepki doğru emoji mi kontrol et
    if (reaction.emoji.id !== reactionEmojiId) {
        console.log(`Yanlış emoji: ${reaction.emoji.id || reaction.emoji.name} (Beklenen: ${reactionEmojiId})`);
        return;
    }

    // Tepkiyi koyan kişi yetkili role sahip mi kontrol et
    if (!member.roles.cache.has(authorizedRoleId)) {
        console.log(`Kullanıcı yetkili değil: ${user.tag} (Rol ID: ${authorizedRoleId})`);
        return;
    }

    // Mesajın sahibini al
    const targetMember = await guild.members.fetch(message.author.id).catch(err => {
        console.error('Mesaj sahibi alınamadı:', err);
        return null;
    });

    if (!targetMember) {
        console.error('Mesaj sahibi fetch edilemedi');
        return;
    }

    // Hedef role zaten sahip mi kontrol et
    if (targetMember.roles.cache.has(targetRoleId)) {
        console.log(`Kullanıcı zaten role sahip: ${targetMember.user.tag} (Rol ID: ${targetRoleId})`);
        return;
    }

    try {
        // Role ver
        await targetMember.roles.add(targetRoleId);
        console.log(`Rol verildi: ${targetMember.user.tag} -> ${targetRoleId}`);

        // Log kanalına embed mesaj gönder
        const logChannel = guild.channels.cache.find(ch => ch.name.toLowerCase() === logChannelName.toLowerCase());
        if (logChannel && logChannel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Whitelist Rol Atama')
                .addFields(
                    { name: 'Üye', value: `${targetMember.user.tag}`, inline: true },
                    { name: 'Mesaj', value: message.content || '*Boş mesaj*', inline: true },
                    { name: 'Yetkili', value: `${user.tag}`, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            console.log('Log mesajı gönderildi');
        } else {
            console.error(`Log kanalı bulunamadı veya izin eksik: ${logChannelName}`);
        }
    } catch (error) {
        console.error('Rol verme hatası:', error);
        const logChannel = guild.channels.cache.find(ch => ch.name.toLowerCase() === logChannelName.toLowerCase());
        if (logChannel && logChannel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Hata')
                .setDescription(`Rol verme işlemi sırasında bir hata oluştu: ${error.message}`)
                .setTimestamp();
            await logChannel.send({ embeds: [errorEmbed] });
        }
    }
});

client.login(process.env.BOT_TOKEN);
