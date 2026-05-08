const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // สำหรับดึง TOKEN จากไฟล์ .env (ถ้ามี)

// 1. ตั้งค่า Client และ Intents (เหมือน discord.Intents.all())
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// 2. สร้างที่เก็บคำสั่ง (เหมือนการเก็บ Extension ใน Python)
client.commands = new Collection();

// 3. ฟังก์ชันโหลด Extension/Commands (แทน setup_hook)
const extensions = [
    'ticket_pro', 'roblox_info', 'server_setup', 'fun_commands',
    'mimic', 'fake_payout', 'starboard', 'bot_admin', 'info_cmd',
    'staff_app', 'staff_system', 'info_commands', 'announce',
    'afk', 'purg', 'noping', 'utilities', 'ai_chat_free',
    'booster_system', 'giveaway'
];

async function loadExtensions() {
    console.log('--- Loading Extensions ---');
    for (const ext of extensions) {
        try {
            // หมายเหตุ: ใน JS คุณต้องสร้างไฟล์เหล่านี้ในโฟลเดอร์ เช่น ./commands/
            // ตัวอย่างนี้สมมติว่าไฟล์อยู่ในโฟลเดอร์เดียวกัน
            const filePath = `./${ext}.js`;
            if (fs.existsSync(filePath)) {
                const command = require(filePath);
                // ถ้าในไฟล์มีระบบให้ดึงคำสั่งไปลงทะเบียน
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                }
                console.log(`✅ Loaded: ${ext}`);
            } else {
                console.log(`⚠️ Skip: ${ext}.js not found`);
            }
        } catch (error) {
            console.error(`❌ Failed to load ${ext}: ${error.message}`);
        }
    }
}

// 4. เมื่อบอทพร้อมทำงาน (on_ready)
client.once('ready', async () => {
    // ตั้งค่าสถานะ Streaming (สีม่วง) เหมือนใน Python
    client.user.setActivity('ไอ้เด็กคนนี้ - NICK KIT 🎵', {
        type: ActivityType.Streaming,
        url: 'https://www.youtube.com/watch?v=F07G92S_vTo'
    });

    console.log(`🚀 Logged in as ${client.user.tag} (Nena)`);
    console.log(`💜 Streaming status (YouTube) set for Nena`);
    
    // โหลดไฟล์เสริม
    await loadExtensions();
});

// 5. ดึง Token จาก Environment Variables (Railway)
const TOKEN = process.env.DISCORD_TOKEN;

if (TOKEN) {
    client.login(TOKEN);
} else {
    console.error("❌ Error: DISCORD_TOKEN not found in environment variables.");
}
