const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    Events 
} = require('discord.js');

// เก็บข้อมูล { user_id: reason }
const afkUsers = new Map();

module.exports = {
    // 1. คำสั่ง Slash Command สำหรับตั้งค่า AFK
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set an AFK status to notify others')
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Reason for being away')
                .setRequired(false)),

    async execute(interaction) {
        const reason = interaction.options.getString('reason') || "Away from keyboard";
        afkUsers.set(interaction.user.id, reason);

        const embed = new EmbedBuilder()
            .setColor(0x2f3136)
            .setAuthor({ 
                name: `Status Update: ${interaction.user.displayName}`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setDescription(
                `**Current Status:** AFK\n` +
                `**Reason:** ${reason}\n\n` +
                `Your status has been recorded. I will notify others when they mention you. ` +
                `Simply send a message to remove your AFK status.`
            )
            .setFooter({ text: "Auto-Response System Active" });

        await interaction.reply({ embeds: [embed] });
    },

    // 2. ระบบตรวจจับการพิมพ์ (Listener)
    async handleMessage(message) {
        if (message.author.bot || !message.guild) return;

        // --- ส่วนที่ 1: ยกเลิก AFK เมื่อกลับมาพิมพ์ ---
        if (afkUsers.has(message.author.id)) {
            afkUsers.delete(message.author.id);

            const welcomeEmbed = new EmbedBuilder()
                .setColor(0x2f3136)
                .setDescription(`Welcome back ${message.author}, your AFK status has been removed.`);

            const msg = await message.channel.send({ embeds: [welcomeEmbed] });
            // ลบข้อความแจ้งเตือนเองใน 5 วินาที
            setTimeout(() => msg.delete().catch(() => {}), 5000);
        }

        // --- ส่วนที่ 2: แจ้งเตือนเมื่อมีคนโดน Tag ---
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(async (mention) => {
                if (afkUsers.has(mention.id)) {
                    const reason = afkUsers.get(mention.id);

                    const afkNotifyEmbed = new EmbedBuilder()
                        .setColor(0x2f3136)
                        .setAuthor({ 
                            name: `${mention.displayName} is currently away`, 
                            iconURL: mention.displayAvatarURL() 
                        })
                        .addFields({ name: "Reason", value: `\`\`\`\n${reason}\n\`\`\`` })
                        .setFooter({ text: "This is an automated notification" });

                    const reply = await message.reply({ embeds: [afkNotifyEmbed] });
                    // ลบเองใน 10 วินาที
                    setTimeout(() => reply.delete().catch(() => {}), 10000);
                }
            });
        }
    }
};
