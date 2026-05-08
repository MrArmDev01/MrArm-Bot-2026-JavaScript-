const { 
    SlashCommandBuilder, 
    PermissionFlagsBits 
} = require('discord.js');

module.exports = {
    // 1. ข้อมูลคำสั่ง Slash Command
    data: new SlashCommandBuilder()
        .setName('mimic')
        .setDescription('Impersonate someone and send a message as them')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user you want to mimic')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The message you want to say as them')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // เฉพาะแอดมิน

    async execute(interaction) {
        // 1. Defer response แบบเงียบ (ephemeral)
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getMember('target');
        const message = interaction.options.getString('message');
        const channel = interaction.channel;

        try {
            // 2. Get or Create a Webhook for the channel
            const webhooks = await channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.name === 'MimicBot');

            if (!webhook) {
                webhook = await channel.createWebhook({
                    name: 'MimicBot',
                    reason: 'For Mimic Command'
                });
            }

            // 3. Send the message using the target's Name and Avatar
            await webhook.send({
                content: message,
                username: target.displayName,
                avatarURL: target.displayAvatarURL({ forceStatic: false })
            });

            // 4. Confirmation for you only
            await interaction.editReply({ 
                content: `✅ Successfully mimicked **${target.displayName}**!` 
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ 
                content: `❌ Error: Could not use webhook. Make sure I have 'Manage Webhooks' permission.` 
            });
        }
    }
};
