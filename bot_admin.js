const { 
    SlashCommandBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
const axios = require('axios'); // สำหรับโหลดไฟล์รูปภาพ

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server_set_name')
        .setDescription("Change bot's nickname in THIS server only")
        .addStringOption(option => 
            option.setName('new_name')
                .setDescription('Enter nickname for this server')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // แยกการทำงานของคำสั่งย่อยใน Execute หรือจะทำเป็น Subcommand ก็ได้ 
    // แต่เพื่อให้เหมือน Python ต้นฉบับ ผมจะทำเป็นคำสั่งแยกตามชื่อเดิมครับ
};

// --- 1. Change Nickname ---
const serverSetName = {
    data: new SlashCommandBuilder()
        .setName('server_set_name')
        .setDescription("Change bot's nickname in THIS server only")
        .addStringOption(option => option.setName('new_name').setDescription('Enter nickname for this server').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const newName = interaction.options.getString('new_name');
        try {
            await interaction.guild.members.me.setNickname(newName);
            await interaction.reply({ content: `✅ Nickname updated to **${newName}**!`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: `❌ Failed: ${error.message}`, ephemeral: true });
        }
    }
};

// --- 2. Change Server Avatar (Requires Boost Level 2) ---
const serverSetAvatar = {
    data: new SlashCommandBuilder()
        .setName('server_set_avatar')
        .setDescription("Change bot's avatar in THIS server (Needs Boost Level 2)")
        .addStringOption(option => option.setName('image_url').setDescription('Direct URL of the image').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const imageUrl = interaction.options.getString('image_url');

        try {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'utf-8');

            await interaction.guild.members.me.setAvatar(buffer);
            await interaction.editReply({ content: "✅ Server avatar updated!" });
        } catch (error) {
            if (error.code === 50013 || error.message.includes('Forbidden')) {
                await interaction.editReply({ content: "❌ Error: Needs **Boost Level 2** to change server avatar." });
            } else {
                await interaction.editReply({ content: `❌ Error: ${error.message}` });
            }
        }
    }
};

// --- 3. Change Server Banner (Requires Boost Level 3) ---
const serverSetBanner = {
    data: new SlashCommandBuilder()
        .setName('server_set_banner')
        .setDescription("Change bot's banner in THIS server (Needs Boost Level 3)")
        .addStringOption(option => option.setName('image_url').setDescription('Direct URL of the image').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const imageUrl = interaction.options.getString('image_url');

        try {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'utf-8');

            await interaction.guild.members.me.setBanner(buffer);
            await interaction.editReply({ content: "✅ Server banner updated!" });
        } catch (error) {
            if (error.code === 50013 || error.message.includes('Forbidden')) {
                await interaction.editReply({ content: "❌ Error: Needs **Boost Level 3** to change server banner." });
            } else {
                await interaction.editReply({ content: `❌ Error: ${error.message}` });
            }
        }
    }
};

// Export ทั้ง 3 คำสั่ง
module.exports = [serverSetName, serverSetAvatar, serverSetBanner];
