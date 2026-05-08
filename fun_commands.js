const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionFlagsBits,
    Events
} = require('discord.js');

module.exports = {
    // 1. คำสั่ง Slash Command สำหรับส่ง DM
    data: new SlashCommandBuilder()
        .setName('dm_user')
        .setDescription('Send a DM with a reply button')
        .addUserOption(option => option.setName('user').setDescription('Who to send to?').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('What to say?').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // เฉพาะแอดมิน

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const messageText = interaction.options.getString('message');

        await interaction.reply({ content: `📤 Sending message to ${targetUser.username}...`, ephemeral: true });

        try {
            // สร้าง Embed สำหรับคนรับ (ข้อมูลเดิม)
            const embed = new EmbedBuilder()
                .setTitle("📩 You've got a message!")
                .setDescription(messageText)
                .setColor(0x3498db) // discord.Color.blue()
                .setFooter({ text: "You can reply using the button below." });

            // สร้างปุ่ม Reply Back (ข้อมูลเดิม)
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`reply_back_${interaction.user.id}`) // เก็บ ID คนส่งไว้ใน customId
                    .setLabel('Reply Back')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✍️')
            );

            await targetUser.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: `✅ Sent! ${targetUser.username} can now reply back to you.` });

        } catch (error) {
            if (error.code === 50007) {
                await interaction.editReply({ content: "❌ Failed: This user has their DMs closed." });
            } else {
                await interaction.editReply({ content: `⚠️ Error: ${error.message}` });
            }
        }
    },

    // 2. ส่วนจัดการ Modal และ Button (ต้องเรียกใช้ใน index.js)
    async handleInteractions(interaction) {
        // --- เมื่อกดปุ่ม Reply Back ---
        if (interaction.isButton() && interaction.customId.startsWith('reply_back_')) {
            const originalSenderId = interaction.customId.split('_')[2];

            // สร้าง Modal สำหรับพิมพ์ตอบกลับ (ReplyModal เดิม)
            const modal = new ModalBuilder()
                .setCustomId(`reply_modal_${originalSenderId}`)
                .setTitle('Reply to Message');

            const answerInput = new TextInputBuilder()
                .setCustomId('answer')
                .setLabel('Your Message')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Type your reply here...')
                .setMaxLength(500)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(answerInput));
            await interaction.showModal(modal);
        }

        // --- เมื่อส่ง Modal (on_submit เดิม) ---
        if (interaction.isModalSubmit() && interaction.customId.startsWith('reply_modal_')) {
            const originalSenderId = interaction.customId.split('_')[2];
            const answerValue = interaction.fields.getTextInputValue('answer');

            try {
                const originalSender = await interaction.client.users.fetch(originalSenderId);
                
                const embed = new EmbedBuilder()
                    .setTitle("📨 New Reply Received!")
                    .setDescription(answerValue)
                    .setColor(0x2ecc71) // discord.Color.green()
                    .setFooter({ text: `Reply from: ${interaction.user.username}` });

                await originalSender.send({ embeds: [embed] });
                await interaction.reply({ content: "✅ Your reply has been sent!", ephemeral: true });
            } catch (error) {
                await interaction.reply({ content: `❌ Could not send reply: ${error.message}`, ephemeral: true });
            }
        }
    }
};
