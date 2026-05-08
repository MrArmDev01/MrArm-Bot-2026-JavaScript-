const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info_cmd')
        .setDescription('Shows a paginated manual for all bot commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // 1. ดึงคำสั่ง Slash Commands ทั้งหมดที่ลงทะเบียนไว้
        const allCommands = Array.from(interaction.client.application.commands.cache.values());

        if (allCommands.length === 0) {
            return await interaction.reply({ content: "No commands found in the system.", ephemeral: true });
        }

        // 2. แบ่งคำสั่งออกเป็นหน้าๆ (8 คำสั่งต่อหน้า ตามต้นฉบับ)
        const commandsPerPage = 8;
        const pages = [];
        const botUser = interaction.client.user;

        for (let i = 0; i < allCommands.length; i += commandsPerPage) {
            const chunk = allCommands.slice(i, i + commandsPerPage);
            const pageNum = Math.floor(i / commandsPerPage) + 1;
            
            const embed = new EmbedBuilder()
                .setTitle("📖 Bot Command Manual")
                .setDescription(`Listing all available commands (Page ${pageNum})`)
                .setColor(0x2b2d31);

            if (botUser.avatarURL()) {
                embed.setThumbnail(botUser.displayAvatarURL());
            }

            chunk.forEach(cmd => {
                // สร้าง Parameter display (ดึงจาก options ของคำสั่ง)
                let params = [];
                if (cmd.options) {
                    params = cmd.options.map(opt => {
                        const star = opt.required ? "*" : "";
                        return `[${opt.name}${star}]`;
                    });
                }

                const paramStr = params.join(" ");
                const cmdUsage = `**\`/${cmd.name} ${paramStr}\`**`;
                const cmdDesc = cmd.description || "No description provided.";

                embed.addFields({
                    name: `🔹 ${cmd.name.toUpperCase()}`,
                    value: `${cmdUsage}\n${cmdDesc}`,
                    inline: false
                });
            });

            embed.setFooter({ 
                text: `Page ${pageNum} | Total Commands: ${allCommands.length} | * = Required` 
            });
            
            pages.push(embed);
        }

        // 3. สร้างปุ่ม (Buttons)
        let currentPage = 0;
        const getRow = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('⬅️ Previous')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Next ➡️')
                    .setStyle(ButtonStyle.Secondary)
            );
        };

        // 4. ส่งข้อความหน้าแรก
        const response = await interaction.reply({ 
            embeds: [pages[currentPage]], 
            components: [getRow(currentPage)],
            fetchReply: true 
        });

        // 5. ระบบจัดการการกดปุ่ม (Collector) - หมดอายุใน 60 วินาทีตามต้นฉบับ
        const collector = response.createMessageComponentCollector({ 
            filter: i => i.user.id === interaction.user.id, 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'prev_page') {
                if (currentPage > 0) {
                    currentPage--;
                    await i.update({ embeds: [pages[currentPage]], components: [getRow(currentPage)] });
                } else {
                    await i.reply({ content: "You are already on the first page.", ephemeral: true });
                }
            } else if (i.customId === 'next_page') {
                if (currentPage < pages.length - 1) {
                    currentPage++;
                    await i.update({ embeds: [pages[currentPage]], components: [getRow(currentPage)] });
                } else {
                    await i.reply({ content: "You are already on the last page.", ephemeral: true });
                }
            }
        });

        // เมื่อหมดเวลา (Timeout) ปิดปุ่ม
        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};
