const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    Events 
} = require('discord.js');
const { G4F } = require('g4f');
const g4f = new G4F();

module.exports = {
    // 1. คำสั่ง Slash Command: /ask
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask AI anything')
        .addStringOption(option => 
            option.setName('prompt')
                .setDescription('Type the question you want to ask')
                .setRequired(true)),

    async execute(interaction) {
        // แจ้งบอทกำลังคิด (defer)
        await interaction.deferReply();
        
        const prompt = interaction.options.getString('prompt');

        try {
            // ใช้ระบบ g4f ในการหา Provider อัตโนมัติ (เหมือน create_async ใน Python)
            const messages = [{ role: "user", content: prompt }];
            let response = await g4f.chatCompletion(messages);
            
            if (!response || String(response).trim().length === 0) {
                response = "Sorry, the AI server is currently overloaded. Please try again in 1-2 minutes";
            }

            // ตรวจสอบความยาวข้อความ (จำกัด 2000 ตัวอักษรตาม Discord)
            let responseText = String(response);
            if (responseText.length > 2000) {
                responseText = responseText.substring(0, 1990) + "...";
            }

            const embed = new EmbedBuilder()
                .setTitle("🤖 Nena AI Assistant")
                .setDescription(responseText)
                .setColor(0x2ecc71)
                .setFooter({ 
                    text: `Asked by ${interaction.user.displayName} | AI Mode: Auto-Select` 
                });
            
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`AI Error Detail: ${error}`);
            await interaction.editReply({ 
                content: "❌ The AI system is experiencing a connection congestion issue. Please try a different question or try again later" 
            });
        }
    },

    // 2. ระบบตอบกลับเมื่อมีการ Tag บอท (on_message)
    async handleMention(message) {
        // ตรวจสอบว่าบอทโดน Tag และคนพิมพ์ไม่ใช่บอท
        if (message.mentions.has(message.client.user) && !message.author.bot) {
            
            // แสดงสถานะว่าบอทกำลังพิมพ์ (typing)
            await message.channel.sendTyping();

            const cleanContent = message.content.replace(`<@${message.client.user.id}>`, '').trim();
            if (!cleanContent) return;

            try {
                const messages = [{ role: "user", content: cleanContent }];
                const response = await g4f.chatCompletion(messages);
                
                if (response) {
                    // จำกัดความยาวก่อนส่งเพื่อกัน Error
                    const finalResponse = response.length > 2000 ? response.substring(0, 1995) : response;
                    await message.reply(finalResponse);
                }
            } catch (err) {
                // ข้ามการตอบกลับหากเกิด Error เหมือนต้นฉบับ
            }
        }
    }
};
