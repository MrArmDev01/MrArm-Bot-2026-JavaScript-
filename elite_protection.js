const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    Events 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'config_noping.json');

// ฟังก์ชันโหลดและบันทึก Config (เหมือน load_config/save_config ใน Python)
function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        } catch (e) {
            return { roles: [], users: [] };
        }
    }
    return { roles: [], users: [] };
}

function saveConfig(data) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 4));
}

module.exports = {
    // --- 1. Setup Commands (Admin Only) ---
    commands: [
        // noping_add_role
        new SlashCommandBuilder()
            .setName('noping_add_role')
            .setDescription('Add a role to the protection list')
            .addRoleOption(option => option.setName('role').setDescription('Select role to protect').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        // noping_add_user
        new SlashCommandBuilder()
            .setName('noping_add_user')
            .setDescription('Add a specific user to the protection list')
            .addUserOption(option => option.setName('member').setDescription('Select user to protect').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        // noping_list
        new SlashCommandBuilder()
            .setName('noping_list')
            .setDescription('View all protected roles and users')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    ],

    async execute(interaction) {
        const data = loadConfig();
        const { commandName } = interaction;

        if (commandName === 'noping_add_role') {
            const role = interaction.options.getRole('role');
            if (!data.roles.includes(role.id)) {
                data.roles.push(role.id);
                saveConfig(data);
                await interaction.reply({ content: `✅ Role ${role.name} is now under elite protection.`, ephemeral: true });
            } else {
                await interaction.reply({ content: "❌ This role is already protected.", ephemeral: true });
            }
        }

        if (commandName === 'noping_add_user') {
            const member = interaction.options.getMember('member');
            if (!data.users.includes(member.id)) {
                data.users.push(member.id);
                saveConfig(data);
                await interaction.reply({ content: `✅ User ${member.displayName} is now under elite protection.`, ephemeral: true });
            } else {
                await interaction.reply({ content: "❌ This user is already protected.", ephemeral: true });
            }
        }

        if (commandName === 'noping_list') {
            const rolesMentions = data.roles.map(rid => `<@&${rid}>`).join(", ") || "None";
            const usersMentions = data.users.map(uid => `<@${uid}>`).join(", ") || "None";

            const embed = new EmbedBuilder()
                .setTitle("🛡️ Elite Protection Registry")
                .setColor(0x2f3136)
                .addFields(
                    { name: "Protected Roles", value: rolesMentions, inline: false },
                    { name: "Protected Users", value: usersMentions, inline: false }
                )
                .setFooter({ text: "Confidential Information" });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    // --- 2. Anti-Ping Logic (on_message) ---
    async handleMessage(message) {
        // Ignore bots and Staff (People with Manage Messages permission)
        if (message.author.bot || message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return;
        }

        const data = loadConfig();
        let isForbidden = false;

        // Check Role Pings
        if (message.mentions.roles.some(role => data.roles.includes(role.id))) {
            isForbidden = true;
        }

        // Check User Pings
        if (!isForbidden && message.mentions.users.some(user => data.users.includes(user.id))) {
            isForbidden = true;
        }

        if (isForbidden) {
            try {
                await message.delete();

                const embed = new EmbedBuilder()
                    .setDescription(
                        `⚠️ **Security Notice**\n` +
                        `${message.author}, mentioning high-ranking officials or protected roles is restricted`
                    )
                    .setColor(0x2f3136)
                    .setAuthor({ name: "System Protocol" });

                const warning = await message.channel.send({ embeds: [embed] });
                
                // Delete warning after 5 seconds
                setTimeout(() => warning.delete().catch(() => {}), 5000);

            } catch (err) {
                // Ignore errors (like missing permissions to delete)
            }
        }
    }
};
