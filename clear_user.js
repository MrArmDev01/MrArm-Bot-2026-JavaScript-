const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear_user')
        .setDescription('Clean up messages from a specific member')
        .addUserOption(option => 
            option.setName('member')
                .setDescription('The member whose messages you want to delete')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('limit')
                .setDescription('How many messages to scan (default 50)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // 1. ส่งการตอบรับเบื้องต้น (Defer) แบบเงียบ (ephemeral)
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.options.getMember('member');
        const limit = interaction.options.getInteger('limit') || 50;
        const channel = interaction.channel;

        try {
            // 2. ดึงข้อความตามจำนวนที่กำหนด (limit) เพื่อมาสแกน
            const messages = await channel.messages.fetch({ limit: limit });

            // 3. กรองเฉพาะข้อความที่เป็นของสมาชิกคนนั้น (is_member logic)
            const memberMessages = messages.filter(m => m.author.id === member.id);

            // 4. สั่งลบข้อความ (Bulk Delete)
            const deleted = await channel.bulkDelete(memberMessages, true);

            // 5. แจ้งผลลัพธ์แบบเรียบหรู (ตามต้นฉบับ)
            const embed = new EmbedBuilder()
                .setColor(0x2f3136)
                .setDescription(`System has successfully removed **${deleted.size}** messages sent by ${member}.`)
                .setAuthor({ 
                    name: "Purge Operation Complete", 
                    iconURL: member.displayAvatarURL() 
                })
                .setFooter({ text: `Scan Limit: ${limit} messages` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            // การจัดการ Error เหมือนต้นฉบับ
            if (error.code === 50013) { // Forbidden
                await interaction.editReply({ content: "Error: I do not have permission to delete messages." });
            } else {
                await interaction.editReply({ content: `An unexpected error occurred: ${error.message}` });
            }
        }
    }
};
