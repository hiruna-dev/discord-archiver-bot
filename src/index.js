const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const connectDatabase = require('./database/mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Create Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Setup command collection
client.commands = new Collection();

// Connect to Database
connectDatabase();

const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] Missing data or execute property in ${file}`);
    }
}

// Event: When bot is ready
client.once('ready', () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
});

// Event: Handling Interaction
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Error executing command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Error executing command!', ephemeral: true });
        }
    }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);
