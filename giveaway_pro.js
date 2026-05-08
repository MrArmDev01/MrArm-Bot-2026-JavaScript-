const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    Events,
    PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'giveaways_pro.json');
const INVITE_FILE = path.join(__dirname, 'invites.json');

// --- Helper Functions สำหรับจัดการไฟล์ JSON ---
function loadJson(file) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}, null, 4));
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function saveJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 4));
}

// เก็บ Cache ลิงก์เชิญเพื่อใช้ตรวจจับคนชวน
const guildInvites = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Advanced giveaway with invite check')
        .addStringOption(opt => opt.setName('prize').setDescription('What is the prize?').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration_mins').setDescription('Duration in minutes').setRequired(true))
        .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(false))
        .addRoleOption(opt => opt.setName('role_required').setDescription('Role needed to join (Optional)').setRequired(false))
        .addIntegerOption(opt => opt.setName('invite_required').setDescription('Number of invites needed (Optional)').setRequired(false))
        .addStringOption(opt => opt.setName('image_url').setDescription('Link to prize image (Optional)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const prize = interaction.options.getString('prize');
        const durationMins = interaction.options.getInteger('duration_mins');
        const winnersCount = interaction.options.getInteger('winners') || 1;
        const roleRequired = interaction.options.getRole('role_required');
        const inviteRequired = interaction.options.getInteger('invite_required') || 0;
        const imageUrl = interaction.options.getString('image_url');

        const endTime = Math.floor((Date.now() + durationMins * 60000) / 1000);

        const embed = new EmbedBuilder()
            .setTitle("🎊 GIVEAWAY 🎊")
            .setDescription(`Participate to win a **${prize}**`)
            .setColor(0x5865F2)
            .addFields(
                { name: "Prize", value: `**${prize}**`, inline: true },
                { name: "Winners", value: `\`${winnersCount}\``, inline: true },
                { name: "Host", value: `${interaction.user}`, inline: true }
            );

        const reqs = [];
        if (roleRequired) reqs.push(`• Role: ${roleRequired}`);
        if (inviteRequired > 0) reqs.push(`• Invites: \`${inviteRequired}\``);
        if (reqs.length > 0) embed.addFields({ name: "Required", value: reqs.join("\n"), inline: false });

        embed.addFields({ name: "End In", value: `<t:${endTime}:R> (<t:${endTime}:f>)`, inline: false });
        if (imageUrl && imageUrl.startsWith("http")) embed.setImage(imageUrl);
        if (interaction.guild.iconURL()) embed.setThumbnail(interaction.guild.iconURL());
        embed.setFooter({ text: `Giveaway ID: ${interaction.id}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('join_pro_giveaway')
                .setLabel('Join Giveaway 🎉')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ content: "Giveaway started!", ephemeral: true });
        const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

        // บันทึกข้อมูล
        const data = loadJson(DATA_FILE);
        data[msg.id] = {
            prize, winnersCount, participants: [],
            role_id: roleRequired ? roleRequired.id : null,
            invite_count: inviteRequired,
            channel_id: interaction.channelId,
            host_id: interaction.user.id
        };
        saveJson(DATA_FILE, data);

        // ตั้งเวลาจบ
        setTimeout(() => this.processWinner(interaction.client, msg.id), durationMins * 60000);
    },

    async processWinner(client, msgId) {
        const data = loadJson(DATA_FILE);
        if (!data[msgId]) return;
        const gv = data[msgId];

        const channel = client.channels.cache.get(gv.channel_id);
        if (!channel) return;
        const msg = await channel.messages.fetch(msgId).catch(() => null);
        if (!msg) return;

        let winnerText = "";
        if (gv.participants.length < gv.winnersCount) {
            winnerText = "Not enough participants.";
        } else {
            const shuffled = gv.participants.sort(() => 0.5 - Math.random());
            const winners = shuffled.slice(0, gv.winnersCount);
            winnerText = winners.map(id => `<@${id}>`).join(", ");
        }

        const endEmbed = new EmbedBuilder()
            .setTitle("🎊 GIVEAWAY ENDED 🎊")
            .setDescription(`Prize: **${gv.prize}**\nWinners: ${winnerText}\nHost: <@${gv.host_id}>`)
            .setColor(0x2b2d31);
        
        if (msg.embeds[0].image) endEmbed.setImage(msg.embeds[0].image.url);
        await msg.edit({ embeds: [endEmbed], components: [] });

        if (winnerText !== "Not enough participants.") {
            await channel.send(`Congratulations ${winnerText}! You won the **${gv.prize}**! 🎉`);
        }
        delete data[msgId];
        saveJson(DATA_FILE, data);
    },

    // --- ส่วนของระบบ Interaction และ Invite Tracker ---
    async handleInteraction(interaction) {
        if (!interaction.isButton() || interaction.customId !== 'join_pro_giveaway') return;

        const data = loadJson(DATA_FILE);
        const gv = data[interaction.message.id];
        if (!gv) return interaction.reply({ content: "❌ This giveaway is no longer active.", ephemeral: true });

        const userId = interaction.user.id;
        if (gv.participants.includes(userId)) return interaction.reply({ content: "⚠️ You have already joined!", ephemeral: true });

        // เช็กยศ
        if (gv.role_id && !interaction.member.roles.cache.has(gv.role_id)) {
            return interaction.reply({ content: `🚫 You need the <@&${gv.role_id}> role to join!`, ephemeral: true });
        }

        // เช็กยอดเชิญ
        if (gv.invite_count > 0) {
            const invitesData = loadJson(INVITE_FILE);
            const userInvites = invitesData[userId] || 0;
            if (userInvites < gv.invite_count) {
                return interaction.reply({ content: `🚫 You need at least \`${gv.invite_count}\` invites! (Current: \`${userInvites}\`)`, ephemeral: true });
            }
        }

        gv.participants.push(userId);
        saveJson(DATA_FILE, data);
        await interaction.reply({ content: `✅ Registered for **${gv.prize}**!`, ephemeral: true });
    },

    // Invite Tracker Logic
    async cacheInvites(client) {
        for (const [id, guild] of client.guilds.cache) {
            try {
                const invites = await guild.invites.fetch();
                guildInvites.set(id, new Map(invites.map(i => [i.code, i.uses])));
            } catch (e) { /* console.log('No permission to fetch invites'); */ }
        }
    },

    async handleMemberJoin(member) {
        const beforeInvites = guildInvites.get(member.guild.id);
        const afterInvites = await member.guild.invites.fetch();
        guildInvites.set(member.guild.id, new Map(afterInvites.map(i => [i.code, i.uses])));

        for (const [code, uses] of afterInvites) {
            const beforeUses = beforeInvites ? beforeInvites.get(code) : 0;
            if (uses > beforeUses) {
                const inviter = afterInvites.get(code).inviter;
                if (!inviter) return;
                const invitesData = loadJson(INVITE_FILE);
                invitesData[inviter.id] = (invitesData[inviter.id] || 0) + 1;
                saveJson(INVITE_FILE, invitesData);
                return;
            }
        }
    }
};
