const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Create Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Event: When bot is ready
client.once('ready', () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
