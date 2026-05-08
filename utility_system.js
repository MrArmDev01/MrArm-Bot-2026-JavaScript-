const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

module.exports = {
    // รวมคำสั่งทั้งหมดไว้ในไฟล์เดียวตามโครงสร้าง Cog
    commands: [
        // --- 32. Social Media Link Tree ---
        new SlashCommandBuilder()
            .setName('socials')
            .setDescription('Show all our official social media links'),

        // --- 33. Search Engine ---
        new SlashCommandBuilder()
            .setName('search')
            .setDescription('Quickly find information on the web')
            .addStringOption(option => 
                option.setName('query')
                    .setDescription('What do you want to search for?')
                    .setRequired(true)),

        // --- 40. Shorten URL ---
        new SlashCommandBuilder()
            .setName('shorten')
            .setDescription('Clean up long URLs into professional format')
            .addStringOption(option => 
                option.setName('url')
                    .setDescription('Paste the long URL here')
                    .setRequired(true))
    ],

    async execute(interaction) {
        const { commandName } = interaction;

        // --- 32. SOCIALS LOGIC ---
        if (commandName === 'socials') {
            const embed = new EmbedBuilder()
                .setTitle("🔗 Connect With Us")
                .setDescription("Stay updated with our latest news, giveaways, and content!")
                .setColor(0x2b2d31)
                .addFields(
                    { name: "> TikTok", value: "Join our community for daily clips.", inline: true },
                    { name: "> YouTube", value: "Watch our full tutorials and guides.", inline: true },
                    { name: "> Discord", value: "Join for payouts and events.", inline: true }
                )
                .setFooter({ 
                    text: `Server: ${interaction.guild.name}`, 
                    iconURL: interaction.guild.iconURL() || null 
                });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('TikTok')
                    .setURL('https://www.tiktok.com/@mr.armxso?_r=1&_t=ZS-9687KlsdpET')
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setLabel('YouTube')
                    .setURL('https://youtube.com/@mrarmxso?si=TLpVkaK4Ik44lR1U')
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setLabel('Discord')
                    .setURL('https://discord.gg/CtgTaxcEkd')
                    .setStyle(ButtonStyle.Link)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- 33. SEARCH LOGIC ---
        if (commandName === 'search') {
            const query = interaction.options.getString('query');
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

            const embed = new EmbedBuilder()
                .setTitle(`🔍 Search Results: ${query}`)
                .setDescription(`I found some results for your search. Click the link below to see all results on Google.`)
                .setColor(0x4285F4)
                .addFields({ name: "Top Result", value: `Check out the latest info for **${query}**`, inline: false })
                .setFooter({ text: "Powered by Google Search Engine" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('View All Results')
                    .setURL(searchUrl)
                    .setStyle(ButtonStyle.Link)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- 40. SHORTEN (FORMAT) LOGIC ---
        if (commandName === 'shorten') {
            const url = interaction.options.getString('url');
            const displayUrl = url.length > 50 ? `${url.substring(0, 50)}...` : url;

            const embed = new EmbedBuilder()
                .setTitle("🔗 URL Formatted Successfully")
                .setDescription(`**Original Link:**\n\`${displayUrl}\``)
                .setColor(0x5865F2)
                .addFields({ name: "Safe Redirect", value: `[Click here to open the link](${url})`, inline: false })
                .setFooter({ text: "Note: Always be careful when clicking external links." });

            await interaction.reply({ embeds: [embed] });
        }
    }
};
