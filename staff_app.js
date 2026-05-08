const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionFlagsBits 
} = require('discord.js');

// --- No Hardcoding Configuration ---
let config = {
    log_channel: null,
    staff_role: null,
    staff_role_2: null
};

// รายการสถานการณ์สำหรับสุ่ม (Scenario Response)
const SCENARIOS = [
    {
        id: "A",
        topic: "Two members are arguing and using offensive language in General Chat.",
        placeholder: "What are your steps to calm the situation and maintain order?"
    },
    {
        id: "B",
        topic: "A member is spamming suspicious phishing links or 'Free Nitro' scams.",
        placeholder: "How would you protect the community and handle the spammer?"
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('app_setup')
        .setDescription('Setup Detailed Staff Recruitment (Admin Only)')
        .addChannelOption(option => option.setName('log_channel').setDescription('Channel where applications will be sent').setRequired(true))
        .addRoleOption(option => option.setName('staff_role').setDescription('First Role to give').setRequired(true))
        .addRoleOption(option => option.setName('staff_role_2').setDescription('Second Role to give (Optional)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        config.log_channel = interaction.options.getChannel('log_channel');
        config.staff_role = interaction.options.getRole('staff_role');
        config.staff_role_2 = interaction.options.getRole('staff_role_2');

        const guildName = interaction.guild.name;

        const embed = new EmbedBuilder()
            .setTitle(`🏛️ ${guildName.toUpperCase()} STAFF RECRUITMENT`)
            .setDescription(
                `We are looking for dedicated, mature, and active individuals to join our ` +
                `Management Team. If you have a passion for helping others and want to ` +
                `contribute to the growth of **${guildName}**, this is your chance!`
            )
            .setColor(0x2ecc71)
            .addFields(
                {
                    name: "📋 Requirements",
                    value: "• Must be at least 15 years old.\n• Must be active and helpful in text/voice channels.\n• Ability to stay calm and professional under pressure.\n• Good understanding of our server rules.",
                    inline: false
                },
                {
                    name: "🛠️ Responsibilities",
                    value: "• Monitor channels and maintain a friendly environment.\n• Assist members with questions or issues.\n• Host community events and keep the chat active.\n• Handle conflicts fairly according to guidelines.",
                    inline: false
                },
                {
                    name: "⚠️ IMPORTANT NOTE",
                    value: "Being a Staff member is a responsibility. We expect honesty and dedication.",
                    inline: false
                }
            )
            .setFooter({ text: `${guildName} Management • Click below to apply` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('apply_btn')
                .setLabel('Apply Now 📝')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ content: "✅ Professional Recruitment Post Created!", ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },

    // ส่วนจัดการปุ่ม และ Modal (เรียกใช้ใน InteractionCreate)
    async handleInteractions(interaction) {
        // --- เมื่อกดปุ่ม Apply Now ---
        if (interaction.isButton() && interaction.customId === 'apply_btn') {
            const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];

            const modal = new ModalBuilder()
                .setCustomId(`app_modal_${scenario.id}`)
                .setTitle('Staff Application Form');

            const field1 = new TextInputBuilder().setCustomId('name_age').setLabel('1. Name and Age').setPlaceholder('e.g. Nena, 20 years old').setRequired(true).setStyle(TextInputStyle.Short);
            const field2 = new TextInputBuilder().setCustomId('timezone_lang').setLabel('2. What is your TimeZone / Language?').setPlaceholder('e.g. GMT+7 / Thai, English').setRequired(true).setStyle(TextInputStyle.Short);
            const field3 = new TextInputBuilder().setCustomId('experience').setLabel('3. Past Experience').setPlaceholder('Have you been staff before? If yes, where?').setRequired(true).setStyle(TextInputStyle.Paragraph);
            const field4 = new TextInputBuilder().setCustomId('reason').setLabel('4. Why should we choose you?').setPlaceholder('Tell us about your strengths and passion for this community...').setRequired(true).setStyle(TextInputStyle.Paragraph);
            const field5 = new TextInputBuilder().setCustomId('scenario_input').setLabel(`5. Scenario Response (${scenario.id})`).setPlaceholder(`Situation: ${scenario.topic}`).setRequired(true).setStyle(TextInputStyle.Paragraph);

            modal.addComponents(
                new ActionRowBuilder().addComponents(field1),
                new ActionRowBuilder().addComponents(field2),
                new ActionRowBuilder().addComponents(field3),
                new ActionRowBuilder().addComponents(field4),
                new ActionRowBuilder().addComponents(field5)
            );

            await interaction.showModal(modal);
        }

        // --- เมื่อส่ง Modal ---
        if (interaction.isModalSubmit() && interaction.customId.startsWith('app_modal_')) {
            if (!config.log_channel) return interaction.reply({ content: "❌ Log channel not set!", ephemeral: true });
            
            await interaction.deferReply({ ephemeral: true });
            const scenarioId = interaction.customId.split('_')[2];
            const scenario = SCENARIOS.find(s => s.id === scenarioId);

            const embed = new EmbedBuilder()
                .setTitle("📩 New Staff Application Received")
                .setColor(0x5865F2)
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: "Applicant", value: `${interaction.user} (${interaction.user.username})`, inline: true },
                    { name: "Name/Age", value: interaction.fields.getTextInputValue('name_age'), inline: true },
                    { name: "TimeZone / Language", value: interaction.fields.getTextInputValue('timezone_lang'), inline: true },
                    { name: "3. Past Experience", value: interaction.fields.getTextInputValue('experience'), inline: false },
                    { name: "4. Why should we choose you?", value: interaction.fields.getTextInputValue('reason'), inline: false },
                    { name: `Scenario Response (${scenarioId})`, value: `**Situation:** ${scenario.topic}\n\n**Candidate's Answer:**\n${interaction.fields.getTextInputValue('scenario_input')}`, inline: false }
                )
                .setFooter({ text: `User ID: ${interaction.user.id}` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`admin_accept_${interaction.user.id}`).setLabel('Accept ✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`admin_reject_${interaction.user.id}`).setLabel('Reject ❌').setStyle(ButtonStyle.Danger)
            );

            await config.log_channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply("✅ Your application has been successfully submitted! Please wait for a DM response.");
        }

        // --- ระบบตอบรับ/ปฏิเสธ (Manager Decision) ---
        if (interaction.isButton() && (interaction.customId.startsWith('admin_accept_') || interaction.customId.startsWith('admin_reject_'))) {
            const [ , decision, applicantId] = interaction.customId.split('_');
            const applicant = await interaction.guild.members.fetch(applicantId).catch(() => null);

            if (!applicant) return interaction.reply({ content: "❌ User no longer in server.", ephemeral: true });

            if (decision === 'accept') {
                let roleMsg = "";
                try {
                    if (config.staff_role) await applicant.roles.add(config.staff_role);
                    if (config.staff_role_2) await applicant.roles.add(config.staff_role_2);
                    roleMsg = `\n✅ Roles assigned!`;
                } catch {
                    roleMsg = `\n❌ Failed to assign roles.`;
                }

                const dmEmbed = new EmbedBuilder()
                    .setTitle("🎊 Congratulations! Your Application is Approved")
                    .setDescription(`Hello **${applicant.user.username}**,\n\nWe are thrilled to inform you... (เนื้อหาตามต้นฉบับ)`)
                    .setColor(0x2ecc71)
                    .setFooter({ text: "Best Regards, Community Management Team" });

                try {
                    await applicant.send({ embeds: [dmEmbed] });
                    await interaction.update({ content: `**Status: Accepted by ${interaction.user}**${roleMsg}\n✅ Success DM Sent.`, components: [] });
                } catch {
                    await interaction.update({ content: `**Status: Accepted by ${interaction.user}**${roleMsg}\n❌ DM Failed.`, components: [] });
                }
            } else {
                // Reject Logic เหมือนกัน
                await interaction.update({ content: `**Status: Rejected by ${interaction.user}**`, components: [] });
            }
        }
    }
};
