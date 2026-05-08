const { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send a professional announcement embed')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Select the channel to send the announcement')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetChannel = interaction.options.getChannel('channel');

        // --- 1. สร้างหน้าต่างกรอกข้อมูล (AnnounceModal) ---
        const modal = new ModalBuilder()
            .setCustomId(`announce_modal_${targetChannel.id}`)
            .setTitle('Create Announcement');

        const annTitle = new TextInputBuilder()
            .setCustomId('ann_title')
            .setLabel('Announcement Title')
            .setPlaceholder('Enter the headline here...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const annMessage = new TextInputBuilder()
            .setCustomId('ann_message')
            .setLabel('Message Content')
            .setPlaceholder('Enter your detailed announcement here...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        // เพิ่มฟิลด์ลงใน Modal
        modal.addComponents(
            new ActionRowBuilder().addComponents(annTitle),
            new ActionRowBuilder().addComponents(annMessage)
        );

        // เปิด Modal ให้ผู้ใช้กรอก
        await interaction.showModal(modal);
    },

    // --- 2. ส่วนจัดการเมื่อกดยืนยัน Modal (on_submit) ---
    async handleModalSubmit(interaction) {
        if (!interaction.isModalSubmit()) return;
        if (interaction.customId.startsWith('announce_modal_')) {
            const channelId = interaction.customId.split('_')[2];
            const targetChannel = interaction.guild.channels.cache.get(channelId);

            const titleValue = interaction.fields.getTextInputValue('ann_title');
            const messageValue = interaction.fields.getTextInputValue('ann_message');

            // สร้าง Embed ประกาศแบบเรียบหรู (ตามต้นฉบับ)
            const embed = new EmbedBuilder()
                .setTitle(titleValue)
                .setDescription(messageValue)
                .setColor(0x2f3136) // สีเทาเข้ม
                .setAuthor({ 
                    name: interaction.guild.name, 
                    iconURL: interaction.guild.iconURL() 
                })
                .setFooter({ 
                    text: `Announced by ${interaction.user.username}` 
                })
                .setTimestamp();

            try {
                if (targetChannel) {
                    await targetChannel.send({ embeds: [embed] });
                    await interaction.reply({ content: `✅ Announcement sent to ${targetChannel}`, ephemeral: true });
                } else {
                    await interaction.reply({ content: "❌ Target channel not found.", ephemeral: true });
                }
            } catch (error) {
                await interaction.reply({ content: `❌ Failed to send announcement: ${error.message}`, ephemeral: true });
            }
        }
    }
};
