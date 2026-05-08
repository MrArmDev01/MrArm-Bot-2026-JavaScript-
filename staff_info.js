const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    PermissionFlagsBits,
    ComponentType
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff_info')
        .setDescription('Display all 6 staff ranks and members')
        .addRoleOption(option => option.setName('manager').setDescription('Manager Role').setRequired(true))
        .addRoleOption(option => option.setName('administrator').setDescription('Administrator Role').setRequired(true))
        .addRoleOption(option => option.setName('head_of_staff').setDescription('Head Of Staff Role').setRequired(true))
        .addRoleOption(option => option.setName('senior_mod').setDescription('Senior Moderator Role').setRequired(true))
        .addRoleOption(option => option.setName('moderator').setDescription('Moderator Role').setRequired(true))
        .addRoleOption(option => option.setName('junior_mod').setDescription('Junior Moderator Role').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guild = interaction.guild;
        
        // เก็บ ID ของยศต่างๆ ไว้ใช้งานใน Interaction
        const rolesId = {
            manager: interaction.options.getRole('manager').id,
            admin: interaction.options.getRole('administrator').id,
            hos: interaction.options.getRole('head_of_staff').id,
            srmod: interaction.options.getRole('senior_mod').id,
            mod: interaction.options.getRole('moderator').id,
            jrmod: interaction.options.getRole('junior_mod').id
        };

        const mainEmbed = new EmbedBuilder()
            .setTitle(`${guild.name.toUpperCase()} STAFF DIRECTORY`)
            .setDescription(
                "Our staff team is divided into different divisions to ensure " +
                "the best management and safety for our community.\n\n" +
                "**Select a division from the dropdown menu to see the members.**"
            )
            .setColor(0x2f3136);

        if (guild.iconURL()) {
            mainEmbed.setThumbnail(guild.iconURL());
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`staff_select_${JSON.stringify(rolesId).length > 100 ? 'check_logs' : interaction.id}`) // ตัวอย่างการส่งต่อ ID หรือใช้การเก็บ State
            .setPlaceholder('Choose a staff division to view...')
            .addOptions([
                {
                    label: 'Management Team',
                    description: 'Manager & Administrator',
                    emoji: '👑',
                    value: 'management',
                },
                {
                    label: 'High Staff',
                    description: 'Head of Staff & Senior Moderator',
                    emoji: '🛡️',
                    value: 'high_staff',
                },
                {
                    label: 'Standard Staff',
                    description: 'Moderator & Junior Moderator',
                    emoji: '⚔️',
                    value: 'standard_staff',
                },
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ content: "✅ Staff Information posted!", ephemeral: true });
        const message = await interaction.channel.send({ embeds: [mainEmbed], components: [row] });

        // --- ระบบจัดการ Dropdown (Collector) ---
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.StringSelect });

        collector.on('collect', async i => {
            const getMembers = (roleId) => {
                const role = guild.roles.cache.get(roleId);
                if (!role) return "Role not configured.";
                const members = role.members.map(m => `<@${m.id}>`);
                return members.length > 0 ? members.join(", ") : "No members assigned.";
            };

            const responseEmbed = new EmbedBuilder().setColor(0x2f3136);
            const selection = i.values[0];

            if (selection === 'management') {
                responseEmbed.setTitle("👑 Management Team")
                    .addFields(
                        { name: "Manager", value: getMembers(rolesId.manager), inline: false },
                        { name: "Administrator", value: getMembers(rolesId.admin), inline: false }
                    );
            } else if (selection === 'high_staff') {
                responseEmbed.setTitle("🛡️ High Staff Team")
                    .addFields(
                        { name: "Head Of Staff", value: getMembers(rolesId.hos), inline: false },
                        { name: "Senior Moderator", value: getMembers(rolesId.srmod), inline: false }
                    );
            } else if (selection === 'standard_staff') {
                responseEmbed.setTitle("⚔️ Standard Staff Team")
                    .addFields(
                        { name: "Moderator", value: getMembers(rolesId.mod), inline: false },
                        { name: "Junior Moderator", value: getMembers(rolesId.jrmod), inline: false }
                    );
            }

            responseEmbed.setFooter({ text: `${guild.name} Official Staff Structure` });
            await i.reply({ embeds: [responseEmbed], ephemeral: true });
        });
    }
};
