const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    OverwriteType 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_server')
        .setDescription('Automatically Make Server (Categories & Channels & Roles)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.reply({ content: "🏗️ Starting server structure setup... This may take a moment.", ephemeral: true });
        
        const { guild } = interaction;
        const everyone = guild.roles.everyone;

        // ==============================================
        // 🆕 ส่วนเพิ่มเติม: สร้างยศและเรียงลำดับตามรูป
        // ==============================================
        const roleNames = [
            "Owner", "Manager", "Lead Developer", "Developer", "Assistant Manager",
            "========== BOT ==========",
            "Administrator",
            "========== STAFF ==========",
            "HEAD OF STAFF", "Senior Moderator", "Moderator", "Junior Moderator",
            "========== OTHER ==========",
            "CC Manager", "Leader Tester", "Tester", "Verified Creator", "Content Creator", "Artist", 
            "========== Helpers ==========",
            "Trello Manager", "Helper Lead", "Trello Team", "Giveaway Host",
            "========== LEVELS ==========",
            "N/A Level 100", "N/A Level 85", "N/A Level 65", "N/A Level 45", "N/A Level 35", "N/A Level 25", "N/A Level 15", "N/A Level 5",
            "========== STATUS ==========",
            "Verified", "Unverified",
            "========== INTERNATIONAL ==========",
            "Thai Access", "Brazil Access", "Spain Access", "Vietnam Access",
            "========== PINGS ==========",
            "Announcement Ping", "SneakPeak Ping", "Update Ping", "Giveaway ping", "Community Ping",
        ];

        const createdRoles = {};
        for (const name of roleNames) {
            let role = guild.roles.cache.find(r => r.name === name);
            if (!role) {
                role = await guild.roles.create({ name: name, reason: 'Server Setup' });
            }
            createdRoles[name] = role;

            // ขยับยศขึ้น (Logic เดิม: ไม่ให้เกินยศของบอท)
            const botTopRolePos = guild.members.me.roles.highest.position;
            const newPos = Math.max(1, botTopRolePos - 1);
            try {
                await role.setPosition(newPos);
            } catch (err) {
                console.log(`❌ ไม่สามารถขยับยศ ${name} ได้: ${err.message}`);
            }
        }

        // ดึงยศสำคัญๆ มาใช้งาน
        const r_unverified = createdRoles["Unverified"];
        const r_verified = createdRoles["Verified"];
        const r_staff = createdRoles["========== STAFF =========="];
        const r_cc_manager = createdRoles["CC Manager"];
        const r_cc_creator = createdRoles["Content Creator"];
        const r_tester = createdRoles["Tester"];

        // ==============================================
        // 🆕 ส่วนเพิ่มเติม: ตั้งค่าสิทธิ์ (Permissions)
        // ==============================================
        const ov_unverified = [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: r_unverified.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ];

        const ov_standard = [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: r_verified.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages], deny: [PermissionFlagsBits.CreatePublicThreads] },
            { id: r_staff.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ];

        const ov_readonly = [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: r_verified.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads] },
            { id: r_staff.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ];

        const ov_staff = [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: r_staff.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ];

        const ov_cc = [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: r_cc_manager.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: r_cc_creator.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: r_staff.id, allow: [PermissionFlagsBits.ViewChannel] }
        ];

        const ov_tester = [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: r_tester.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: r_staff.id, allow: [PermissionFlagsBits.ViewChannel] }
        ];

        const ov_logs = [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: r_staff.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }
        ];

        // ==============================================
        // โครงสร้างช่อง (Structure)
        // ==============================================
        const structure = {
            "✅ | Verification": { perms: ov_unverified, channels: [["【🔒】verification", "text"], ["【❓】how-to-verify", "text"]] },
            "TOP": { perms: null, channels: [["【🏃】welcome", "text"], ["【🌸】boosts", "text"]] },
            "🔔 | Important": { perms: ov_readonly, channels: [["【📢】announcements", "news"], ["【📢】sub-announcements", "text"], ["【📖】rules", "text"], ["【📃】information", "text"], ["【🔗】links", "text"]] },
            "🏰 | N/A": { perms: ov_standard, channels: [["【📢】updates-log", "news"], ["【👀】sneaks", "text"], ["【📊】polls", "text"], ["【💎】codes", "text"]] },
            "📄 | Information": { perms: ov_readonly, channels: [["【🧩】trello-posts", "text"], ["【❓】faq", "text"], ["【📊】level", "text"]] },
            "🎩 | Engagement": { perms: ov_readonly, channels: [["【🎁】giveaway", "text"], ["【🎁】staff-giveaway", "text"], ["【🎪】event", "text"], ["【🎥】content", "text"], ["【🌟】staff-post", "text"], ["【🎤】Stage", "stage"]] },
            "🔴 | CC": { perms: ov_cc, channels: [["【💬】verified-cc-chat", "text"], ["【💬】cc-chat", "text"], ["【🎙️】Content Creator VC", "voice"], ["【🎙️】Verified Creator VC", "voice"]] },
            "🎨 | Artist": { perms: ov_standard, channels: [["【📢】artist-announcements", "text"], ["【💬】artist-chat", "text"], ["【💡】artist-suggestions", "forum"]] },
            "📍 | Community": { perms: ov_standard, channels: [["【🎨】artwork", "text"], ["【🌸】booster-chat", "text"], ["【💬】general", "text"], ["【❓】questions", "text"], ["【🤖】bot-commands", "text"]] },
            "🌎 | International chats": { perms: ov_standard, channels: [["【】general", "text"], ["【】geral", "text"], ["【】general", "text"], ["【】gerneral", "text"], ["【】general", "text"]] },
            "🎤 | Voice Channels": { perms: ov_standard, channels: [["【🎙️】VC", "voice"], ["【🎙️】VC", "voice"], ["【🎙️】VC", "voice"], ["【🎙️】VC", "voice"]] },
            "🧪 | Tester": { perms: ov_tester, channels: [["【📢】tester-announcements", "text"], ["【📚】tester-guidelines", "text"], ["【📊】tester-polls", "text"], ["【💬】tester-chat", "text"], ["【🎮】tester-usernames", "text"], ["【‼️】tester-loa", "text"], ["【🐛】tester-bug-report", "forum"], ["【💡】tester-suggestions", "forum"], ["【🎙️】Tester VC", "voice"]] },
            "📋 | Staff Rubric": { perms: ov_staff, channels: [["【📰】staff-announcements", "text"], ["【📚】staff-guidelines", "text"], ["【📔】staff-roster", "text"], ["【❓】staff-faq", "text"]] },
            "🔨 | Staff": { perms: ov_staff, channels: [["【💬】staff-chat", "text"], ["【🤖】staff-cmds", "text"], ["【📑】proof", "text"], ["【🔨】ban-proof", "text"], ["【⚖️】discord-ban-appeals", "text"], ["【‼️】staff-loa", "text"], ["【💡】staff-suggestions", "forum"], ["【🎙️】Staff VC", "voice"]] },
            "📁 | Logs": { perms: ov_logs, channels: [["【📑】mod-logs", "text"], ["【📑】message-logs", "text"], ["【📑】automod-logs", "text"], ["【📑】nickname-logs", "text"], ["【📑】noping-logs", "text"], ["【📑】role-logs", "text"], ["【📑】join-leave-logs", "text"], ["【📑】vc-logs", "text"], ["【📑】command-logs", "text"]] }
        };

        try {
            for (const [categoryName, data] of Object.entries(structure)) {
                if (categoryName === "TOP") {
                    for (const [name, type] of data.channels) {
                        await createChannel(guild, name, type);
                    }
                } else {
                    const category = await guild.channels.create({
                        name: categoryName,
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: data.perms
                    });
                    for (const [name, type] of data.channels) {
                        await createChannel(guild, name, type, category.id);
                    }
                }
            }
            await interaction.followup({ content: "✅ Server setup complete! All categories, channels, roles and permissions have been created." });
        } catch (error) {
            console.error(error);
            await interaction.followup({ content: `❌ An error occurred: ${error.message}` });
        }
    }
};

async function createChannel(guild, name, type, parentId = null) {
    let channelType;
    let isNews = false;

    switch (type) {
        case "text": channelType = ChannelType.GuildText; break;
        case "voice": channelType = ChannelType.GuildVoice; break;
        case "news": 
            channelType = ChannelType.GuildText; 
            isNews = true; 
            break;
        case "stage": channelType = ChannelType.GuildStageVoice; break;
        case "forum": channelType = ChannelType.GuildForum; break;
        default: channelType = ChannelType.GuildText;
    }

    try {
        await guild.channels.create({
            name: name,
            type: channelType,
            parent: parentId,
            topic: isNews ? "Announcement Channel" : ""
        });
    } catch (err) {
        // Fallback for Forum if Community is not enabled
        if (type === "forum") {
            await guild.channels.create({ name: name, type: ChannelType.GuildText, parent: parentId });
        } else {
            console.log(`Could not create channel ${name}: ${err.message}`);
        }
    }
}
