const { 
    SlashCommandBuilder, 
    EmbedBuilder 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user_info')
        .setDescription('Detailed member profile overview')
        .addUserOption(option => 
            option.setName('member')
                .setDescription('Select the member you want to inspect')
                .setRequired(false)),

    async execute(interaction) {
        // หากไม่ได้เลือก member ให้ใช้คนกดคำสั่ง (member or interaction.user)
        const targetMember = interaction.options.getMember('member') || interaction.member;
        const { user } = targetMember;

        // 1. จัดการข้อมูลยศ (ข้าม @everyone และเรียงลำดับจากสูงไปต่ำ)
        const roles = targetMember.roles.cache
            .filter(role => role.name !== '@everyone')
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString());
        
        const rolesDisplay = roles.length > 0 ? roles.join(' ') : "None";

        // 2. แปลงวันที่เป็น Discord Timestamp (เหมือนต้นฉบับ)
        const createdTs = Math.floor(user.createdTimestamp / 1000);
        const joinedTs = Math.floor(targetMember.joinedTimestamp / 1000);

        // 3. ตรวจสอบสิทธิ์การใช้งาน (Permissions)
        const perms = [];
        const permissions = targetMember.permissions;
        if (permissions.has('Administrator')) perms.push("Administrator");
        if (permissions.has('ManageGuild')) perms.push("Manage Server");
        if (permissions.has('ManageRoles')) perms.push("Manage Roles");
        if (permissions.has('BanMembers')) perms.push("Ban Members");
        
        const permsDisplay = perms.length > 0 ? perms.join(" • ") : "General Member";

        // 4. ดีไซน์ Embed (ใช้สีตามบทบาท หรือสีพื้นฐาน 0x2f3136)
        const embedColor = targetMember.displayColor || 0x2f3136;
        
        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setAuthor({ 
                name: `User Information | ${user.username}`, 
                iconURL: user.displayAvatarURL() 
            })
            .setThumbnail(user.displayAvatarURL())
            // ส่วนที่ 1: Identification
            .addFields({
                name: "── Identification ──",
                value: `**ID:** \`${user.id}\`\n**Status:** ${user.presence?.status?.toUpperCase() || 'OFFLINE'}\n**Nickname:** ${targetMember.nickname || 'None'}`,
                inline: false
            })
            // ส่วนที่ 2: Registration (ใช้ Discord Timestamp Format)
            .addFields({
                name: "── Registration ──",
                value: `**Created:** <t:${createdTs}:D> (<t:${createdTs}:R>)\n**Joined:** <t:${joinedTs}:D> (<t:${joinedTs}:R>)`,
                inline: false
            })
            // ส่วนที่ 3: ยศและสิทธิ์
            .addFields(
                { name: `── Roles [${roles.length}] ──`, value: rolesDisplay.substring(0, 1024), inline: false },
                { name: "── Permissions ──", value: `*${permsDisplay}*`, inline: false }
            )
            .setFooter({ text: `Requested by ${interaction.user.username}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
