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
    res.send('Bot aktif!');
});

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

// Ping komutu
client.on('messageCreate', async message => {
    if (!message.content.startsWith('-') || message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ping') {
        console.log(`Ping komutu çalıştırıldı: ${message.author.tag}`);
        const ping = client.ws.ping;
        return message.reply(`Botun pingi: ${ping}ms`);
    }
});

// Mesaj tepkisi eklendiğinde
client.on('messageReactionAdd', async (reaction, user) => {
    console.log(`Tepki alındı: ${user.tag} tarafından, emoji: ${reaction.emoji.name || reaction.emoji.id}`);

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

    // Whitelist kanalında mı kontrol et
    if (message.channel.name !== whitelistChannelName) {
        console.log(`Tepki whitelist kanalında değil: ${message.channel.name}`);
        return;
    }

    // Tepki doğru emoji mi kontrol et
    if (reaction.emoji.id !== reactionEmojiId) {
        console.log(`Yanlış emoji: ${reaction.emoji.id || reaction.emoji.name}`);
        return;
    }

    // Tepkiyi koyan kişi yetkili role sahip mi kontrol et
    if (!member.roles.cache.has(authorizedRoleId)) {
        console.log(`Kullanıcı yetkili değil: ${user.tag}`);
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
        console.log(`Kullanıcı zaten role sahip: ${targetMember.user.tag}`);
        return;
    }

    try {
        // Role ver
        await targetMember.roles.add(targetRoleId);
        console.log(`Rol verildi: ${targetMember.user.tag} -> ${targetRoleId}`);

        // Log kanalına embed mesaj gönder
        const logChannel = guild.channels.cache.find(ch => ch.name === logChannelName);
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
            console.error('Log kanalı bulunamadı veya mesaj gönderme izni yok!');
        }
    } catch (error) {
        console.error('Rol verme hatası:', error);
        const logChannel = guild.channels.cache.find(ch => ch.name === logChannelName);
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
