const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    Events,
    ChannelType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'booster_settings.json');

// ฟังก์ชันโหลดและบันทึกข้อมูล (เหมือน load_settings/save_settings)
function loadSettings() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

function saveSettings(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4), 'utf-8');
}

module.exports = {
    // --- 1. Commands to Set Up ---
    data: new SlashCommandBuilder()
        .setName('set_booster_msg')
        .setDescription('Set up the welcome message for Server Boosters')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to send the message in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option => 
            option.setName('title')
                .setDescription('Title of the Embed')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The message content (Use {user} to mention the booster)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const settings = loadSettings();
        const guildId = interaction.guild.id;
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const message = interaction.options.getString('message');

        settings[guildId] = {
            channel_id: channel.id,
            title: title,
            message: message
        };

        saveSettings(settings);
        await interaction.reply({ content: `✅ Booster message set to ${channel} successfully!`, ephemeral: true });
    },

    // --- 2. Event Listener (on_member_update) ---
    async handleMemberUpdate(oldMember, newMember) {
        // ตรวจสอบว่าสมาชิกคนนี้เพิ่งเริ่ม Boost (PremiumSince เปลี่ยนจาก null เป็นมีค่า)
        if (!oldMember.premiumSince && newMember.premiumSince) {
            const settings = loadSettings();
            const guildId = newMember.guild.id;

            if (settings[guildId]) {
                const config = settings[guildId];
                const channel = newMember.guild.channels.cache.get(config.channel_id);

                if (channel) {
                    // แทนที่ {user} ด้วยการ Mention สมาชิก
                    const finalMsg = config.message.replace(/{user}/g, `<@${newMember.id}>`);

                    const embed = new EmbedBuilder()
                        .setTitle(config.title)
                        .setDescription(finalMsg)
                        .setColor(0xff73fa) // Pink Booster Color
                        .setThumbnail(newMember.user.displayAvatarURL())
                        .setAuthor({ 
                            name: "New Server Booster!", 
                            iconURL: "https://cdn.discordapp.com/emojis/825414364171010078.png" 
                        })
                        .setFooter({ text: `Thank you for boosting ${newMember.guild.name}!` });

                    await channel.send({ content: `<@${newMember.id}>`, embeds: [embed] });
                }
            }
        }
    }
};
