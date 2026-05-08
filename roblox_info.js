const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    SlashCommandBuilder 
} = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roblox_info')
        .setDescription('Get detailed info, online status, and current game of a Roblox user')
        .addStringOption(option => 
            option.setName('username')
                .setDescription('The Roblox username to look up')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const username = interaction.options.getString('username');

        try {
            // 1. Fetch User ID
            const userRes = await axios.post("https://users.roblox.com/v1/usernames/users", {
                usernames: [username],
                excludeBannedUsers: false
            });

            if (!userRes.data.data || userRes.data.data.length === 0) {
                return await interaction.editReply({ content: `User \`${username}\` not found.`, ephemeral: true });
            }

            const userData = userRes.data.data[0];
            const userId = userData.id;
            const displayName = userData.displayName;
            const actualUsername = userData.name;

            // 2. Fetch User Details & Presence
            const detailRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
            const detailData = detailRes.data;
            
            const presenceRes = await axios.post("https://presence.roblox.com/v1/presence/users", {
                userIds: [userId]
            });
            const presenceData = presenceRes.data.userPresences[0];

            // 3. Process Data
            const createdAt = new Date(detailData.created);
            const formattedJoinDate = createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            const statusCode = presenceData.userPresenceType || 0;
            const lastOnline = presenceData.lastOnline;
            
            let statusText = "Offline";
            let currentActivity = "None";
            let embedColor = 0x95a5a6;

            if (statusCode === 1) {
                statusText = "Online (Website)";
                embedColor = 0x2ecc71;
            } else if (statusCode === 2) {
                statusText = "Playing a Game";
                const gameName = presenceData.lastLocation || 'Private Game';
                currentActivity = `Playing: **${gameName}**`;
                embedColor = 0x3498db;
            } else if (statusCode === 3) {
                statusText = "Developing (Studio)";
                embedColor = 0xe67e22;
            }

            let lastOnlineStr = "Hidden by Privacy";
            if (lastOnline) {
                const loDate = new Date(lastOnline);
                lastOnlineStr = loDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + 
                                " | " + loDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            }

            // 4. Fetch Avatar Headshot
            const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
            const thumbUrl = thumbRes.data.data[0].imageUrl;

            // 5. Create Embed (Clean & Professional - No Emoji)
            const embed = new EmbedBuilder()
                .setTitle(`${displayName}'s Profile`)
                .setURL(`https://www.roblox.com/users/${userId}/profile`)
                .setColor(embedColor)
                .setThumbnail(thumbUrl)
                .addFields(
                    { name: "Username", value: `\`${actualUsername}\``, inline: true },
                    { name: "User ID", value: `\`${userId}\``, inline: true },
                    { name: "Join Date", value: `${formattedJoinDate}`, inline: true },
                    { name: "Current Status", value: `**${statusText}**`, inline: true },
                    { name: "Last Online", value: `${lastOnlineStr}`, inline: true },
                    { name: "Activity", value: currentActivity, inline: true },
                    { 
                        name: "About Me", 
                        value: `\`\`\`\n${(detailData.description || "No Bio Provided.").slice(0, 300)}\n\`\`\``, 
                        inline: false 
                    }
                )
                .setFooter({ text: "Powered by Roblox API • Mr.Arm" })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Open Roblox Profile')
                    .setURL(`https://www.roblox.com/users/${userId}/profile`)
                    .setStyle(ButtonStyle.Link)
            );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error(`Error in roblox_info: ${error}`);
            await interaction.editReply({ content: "Could not fetch user data. They might be private or banned." });
        }
    }
};
