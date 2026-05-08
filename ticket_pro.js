const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType, 
    AttachmentBuilder,
    SlashCommandBuilder 
} = require('discord.js');

// Global config storage (ข้อมูลเดิมเป๊ะๆ)
let ticket_config = {
    "admin_role_id": null,
    "category_id": null,
    "log_channel_id": null
};

module.exports = {
    // โครงสร้างคำสั่ง Slash Command
    data: new SlashCommandBuilder()
        .setName('ticket_setup_pro')
        .setDescription('Full pro setup for Ticket System')
        .addChannelOption(option => option.setName('panel_channel').setDescription('Where to put the button').setRequired(true))
        .addChannelOption(option => option.setName('category').setDescription('Where to create tickets').setRequired(true))
        .addRoleOption(option => option.setName('admin_role').setDescription('Staff role').setRequired(true))
        .addChannelOption(option => option.setName('log_channel').setDescription('Where to send transcripts').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const panel_channel = interaction.options.getChannel('panel_channel');
        const category = interaction.options.getChannel('category');
        const admin_role = interaction.options.getRole('admin_role');
        const log_channel = interaction.options.getChannel('log_channel');

        ticket_config["admin_role_id"] = admin_role.id;
        ticket_config["category_id"] = category.id;
        ticket_config["log_channel_id"] = log_channel.id;

        // --- ปรับปรุง Embed หน้าแรก (Panel) --- (ข้อมูลเดิม)
        const panel_embed = new EmbedBuilder()
            .setTitle("📩 Server Support Desk")
            .setDescription(
                "Need assistance or want to report an issue?\n" +
                "Click the button below to start a private conversation with our staff.\n\n" +
                "**Guidelines:**\n" +
                "• Be descriptive and patient.\n" +
                "• All transcripts are saved for security.\n" +
                "• No spamming tickets."
            )
            .setColor(0x2b2d31);

        if (interaction.guild.iconURL()) {
            panel_embed.setThumbnail(interaction.guild.iconURL());
        }
        
        panel_embed.setFooter({ 
            text: `${interaction.guild.name} | Support System`, 
            iconURL: interaction.guild.iconURL() || null 
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_ticket')
                .setLabel('Open Ticket')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎫')
        );

        await panel_channel.send({ embeds: [panel_embed], components: [row] });
        await interaction.reply({ content: "✅ Professional Ticket Panel has been deployed!", ephemeral: true });
    },

    // ส่วนจัดการ Interaction ของปุ่ม
    async handleButtons(interaction) {
        if (!interaction.isButton()) return;
        const { customId, guild, user, channel } = interaction;

        // --- TicketLauncher: open_ticket ---
        if (customId === 'open_ticket') {
            if (!ticket_config["category_id"]) {
                return await interaction.reply({ content: "❌ System not configured.", ephemeral: true });
            }

            const admin_role = guild.roles.cache.get(ticket_config["admin_role_id"]);
            
            const ticket_channel = await guild.channels.create({
                name: `🎫-${user.username}`,
                type: ChannelType.GuildText,
                parent: ticket_config["category_id"],
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    ...(admin_role ? [{ id: admin_role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : [])
                ]
            });

            await interaction.reply({ content: `✅ Ticket opened: ${ticket_channel}`, ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle("Support Request")
                .setDescription(`Welcome ${user},\nOur support team will be with you shortly. While you wait, please provide a detailed description of your issue.`)
                .setColor(0x0099FF) // discord.Color.blue()
                .setTimestamp()
                .setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
                .setFooter({ text: "Awaiting Staff Claim • Ticket ID: " + ticket_channel.id.slice(-6) });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim Ticket').setStyle(ButtonStyle.Secondary).setEmoji('🙋‍♂️'),
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            const admin_mention = admin_role ? `<@&${admin_role.id}>` : "@Staff";
            await ticket_channel.send({ content: `${user} | ${admin_mention}`, embeds: [embed], components: [row] });
        }

        // --- TicketControl: claim_ticket ---
        if (customId === 'claim_ticket') {
            const admin_role = guild.roles.cache.get(ticket_config["admin_role_id"]);
            if (!interaction.member.roles.cache.has(ticket_config["admin_role_id"]) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({ content: "❌ Only Staff can claim tickets!", ephemeral: true });
            }

            const oldEmbed = interaction.message.embeds[0];
            const embed = EmbedBuilder.from(oldEmbed)
                .setColor(0xFFD700) // discord.Color.gold()
                .setAuthor({ name: f`Claimed by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                .addFields({ name: "🛡️ Staff in Charge", value: `${interaction.user}`, inline: false })
                .setDescription("A staff member is now looking into your request. Please prepare any necessary information.");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('Ticket Claimed').setStyle(ButtonStyle.Success).setDisabled(true).setEmoji('🙋‍♂️'),
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await interaction.update({ embeds: [embed], components: [row] });
            await interaction.followup({ content: `✅ ${interaction.user} has taken responsibility for this ticket.` });
        }

        // --- TicketControl: close_ticket ---
        if (customId === 'close_ticket') {
            if (!interaction.member.roles.cache.has(ticket_config["admin_role_id"]) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({ content: "❌ Only Staff can close tickets!", ephemeral: true });
            }

            await interaction.reply("⌛ **Archiving conversation and closing ticket in 5 seconds...**");

            let transcript = `Ticket Transcript: ${channel.name}\n`;
            transcript += `Date: ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}\n`;
            transcript += "-".repeat(40) + "\n";

            const messages = await channel.messages.fetch({ limit: 100 });
            messages.reverse().forEach(msg => {
                const time = msg.createdAt.toLocaleTimeString();
                transcript += `[${time}] ${msg.author.displayName}: ${msg.content}\n`;
            });

            if (ticket_config["log_channel_id"]) {
                const log_channel = guild.channels.cache.get(ticket_config["log_channel_id"]);
                if (log_channel) {
                    const file = new AttachmentBuilder(Buffer.from(transcript), { name: `transcript-${channel.name}.txt` });
                    const log_embed = new EmbedBuilder()
                        .setTitle("📂 Ticket Log Archived")
                        .setColor(0x34363c) // Dark grey
                        .setTimestamp()
                        .addFields(
                            { name: "Channel", value: `\`${channel.name}\``, inline: true },
                            { name: "Closed By", value: `${user}`, inline: true }
                        )
                        .setFooter({ text: "System Transcript Service" });

                    await log_channel.send({ embeds: [log_embed], files: [file] });
                }
            }

            setTimeout(() => channel.delete(), 5000);
        }
    }
};
