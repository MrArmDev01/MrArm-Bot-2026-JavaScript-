const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('payout')
        .setDescription('Send Robux payout with Admin-close & DM system')
        .addUserOption(option => option.setName('target').setDescription('The user to payout').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Amount of Robux').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const amount = interaction.options.getInteger('amount');

        const embed = new EmbedBuilder()
            .setTitle("💰 Robux Payout Successful")
            .setDescription(
                `has initiated a payout to **${target.displayName}**.\n\n` +
                `**Details:**\n` +
                `• Amount: \`${amount.toLocaleString()} Robux\`\n` +
                `• Status: \`Pending Claim\``
            )
            .setColor(0x00b06f)
            .setThumbnail("https://images.rbxcdn.com/f7528a4be46b1464c185bb5e30b135c3.png");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`claim_payout_${target.id}_${amount}`)
                .setLabel('Claim Robux & Open Receipt')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🧧')
        );

        await interaction.reply({ content: "✅ Payout sent.", ephemeral: true });
        await interaction.channel.send({
            content: `${target}`,
            embeds: [embed],
            components: [row]
        });
    },

    // ส่วนจัดการ Interaction สำหรับปุ่มต่างๆ
    async handleInteractions(interaction) {
        if (!interaction.isButton()) return;

        const [action, type, targetId, amount] = interaction.customId.split('_');
        if (action !== 'claim' && action !== 'close') {
            // เช็คว่าเป็นปุ่มของระบบ payout หรือไม่
            if (!interaction.customId.startsWith('claim_payout_') && !interaction.customId.startsWith('close_payout_')) return;
        }

        // --- 🟢 ปุ่ม Claim Robux ---
        if (interaction.customId.startsWith('claim_payout_')) {
            const [, , targetId, amount] = interaction.customId.split('_');

            if (interaction.user.id !== targetId) {
                return await interaction.reply({ content: `❌ This is only for <@${targetId}>.`, ephemeral: true });
            }

            const channel = await interaction.guild.channels.create({
                name: `claim-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: interaction.channel.parentId,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            await interaction.reply({ content: `✅ Private room created: ${channel}`, ephemeral: true });

            const receiptEmbed = new EmbedBuilder()
                .setTitle("💳 Official Payout Receipt")
                .setDescription(
                    `Hello ${interaction.user},\n` +
                    `Staff will now process your **${Number(amount).toLocaleString()} Robux**.\n` +
                    "Please wait for an administrator to finalize this session."
                )
                .setColor(0x00b06f);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`close_payout_${targetId}_${amount}`)
                    .setLabel('Close & Complete Payout')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            await channel.send({ embeds: [receiptEmbed], components: [row] });
        }

        // --- 🔴 ปุ่ม Close & Complete (Admin Only) ---
        if (interaction.customId.startsWith('close_payout_')) {
            const [, , targetId, amount] = interaction.customId.split('_');

            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({ content: "❌ Only Administrators can close this payout session.", ephemeral: true });
            }

            await interaction.deferUpdate();

            const targetUser = await interaction.client.users.fetch(targetId);
            const dmContent = (
                `✅ **Robux Payout Completed Successfully!**\n\n` +
                `Dear **${targetUser.username}**,\n` +
                `The administration has finalized your payout of **${Number(amount).toLocaleString()} Robux**. ` +
                `**Transaction Summary:**\n\n` +
                `• Amount: \`${Number(amount).toLocaleString()} Robux\`\n` +
                `• Status: \`Distributed\`\n` +
                `• Server: \`${interaction.guild.name}\`\n\n` +
                `Thank you for being a part of our community! If you have any further questions, feel free to open a new support ticket.`
            );

            let dmStatus = "✅ Successfully sent confirmation DM.";
            try {
                await targetUser.send(dmContent);
            } catch (err) {
                dmStatus = "⚠️ Could not DM the user (DMs are closed).";
            }

            await interaction.followup({ content: `Closing room... ${dmStatus}\nThis channel will be deleted in 5 seconds.` });

            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 5000);
        }
    }
};
