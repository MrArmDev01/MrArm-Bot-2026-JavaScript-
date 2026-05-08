const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ChannelType 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'starboard_config.json');

// ฟังก์ชันโหลดและบันทึก Config (เหมือน load_config/save_config ใน Python)
function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    return { guilds: {}, counter: {} };
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 4));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_starboard')
        .setDescription('Configure Forum Starboard with custom emojis')
        .addChannelOption(option => 
            option.setName('forum_channel')
                .setDescription('The source Forum channel')
                .addChannelTypes(ChannelType.GuildForum)
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('target_channel')
                .setDescription('The destination news channel')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true))
        .addStringOption(option => option.setName('emoji1').setDescription('First reaction emoji').setRequired(true))
        .addStringOption(option => option.setName('emoji2').setDescription('Second reaction emoji').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const config = loadConfig();
        const forumChannel = interaction.options.getChannel('forum_channel');
        const targetChannel = interaction.options.getChannel('target_channel');
        const emoji1 = interaction.options.getString('emoji1');
        const emoji2 = interaction.options.getString('emoji2');

        const guildId = interaction.guildId;
        if (!config.guilds[guildId]) config.guilds[guildId] = {};

        // บันทึกค่าลง Config
        config.guilds[guildId][forumChannel.id] = {
            target: targetChannel.id,
            emoji1: emoji1,
            emoji2: emoji2
        };

        if (!config.counter[forumChannel.id]) {
            config.counter[forumChannel.id] = 0;
        }

        saveConfig(config);

        await interaction.reply({
            content: `✅ Setup Complete!\n**Forum:** <#${forumChannel.id}>\n**Target:** <#${targetChannel.id}>\n**Emojis:** ${emoji1} ${emoji2}`,
            ephemeral: true
        });
    },

    // --- Listener สำหรับตอนสร้าง Thread ใหม่ (on_thread_create) ---
    async onThreadCreate(thread) {
        const config = loadConfig();
        const guildId = thread.guildId;
        const parentId = thread.parentId;

        if (config.guilds[guildId] && config.guilds[guildId][parentId]) {
            const settings = config.guilds[guildId][parentId];
            const targetChannel = await thread.guild.channels.fetch(settings.target).catch(() => null);
            if (!targetChannel) return;

            // เพิ่มตัวนับ Suggestion (Case Number)
            config.counter[parentId] = (config.counter[parentId] || 0) + 1;
            const caseNum = config.counter[parentId];
            saveConfig(config);

            // รอเนื้อหาโหลด (เหมือน asyncio.sleep(3))
            await new Promise(resolve => setTimeout(resolve, 3000));

            // ดึงข้อความแรกของ Thread
            const messages = await thread.messages.fetch({ limit: 1, oldest_first: true });
            const firstMsg = messages.first();
            if (!firstMsg) return;

            const embed = new EmbedBuilder()
                .setTitle(`📌 ${thread.name} ┇ Suggestions #${caseNum}`)
                .setDescription(firstMsg.content || "*(No description)*")
                .setColor(0x2b2d31)
                .setURL(thread.url)
                .addFields({ name: "Thread", value: `[Open Suggestion](${thread.url})`, inline: false })
                .setFooter({ 
                    text: `By ${thread.owner?.displayName || 'Unknown'}`, 
                    iconURL: thread.owner?.displayAvatarURL() || null 
                });

            // ตรวจสอบรูปภาพจาก Attachment
            if (firstMsg.attachments.size > 0) {
                embed.setImage(firstMsg.attachments.first().url);
            } else {
                // ตรวจสอบรูปภาพจาก URL ในข้อความ (RegExp เดียวกับใน Python)
                const linkRegex = /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp))/i;
                const match = firstMsg.content.match(linkRegex);
                if (match) {
                    embed.setImage(match[0]);
                }
            }

            // ส่งข้อความไปยังห้อง Target และใส่ Reaction
            try {
                const sentMsg = await targetChannel.send({ embeds: [embed] });
                await sentMsg.react(settings.emoji1);
                await sentMsg.react(settings.emoji2);
            } catch (err) {
                console.error(`Failed to send starboard or react: ${err.message}`);
            }
        }
    }
};
