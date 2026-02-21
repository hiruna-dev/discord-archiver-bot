const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('archive')
        .setDescription('Archive messages from this channel based on limit.')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('The max number of messages to fetch (default is ALL / 999999)')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.reply('Archive command registered!');
    },
};
