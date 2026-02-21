const { SlashCommandBuilder } = require('discord.js');
const archiverWorker = require('../utils/archiverWorker');

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
        // Defer reply
        await interaction.deferReply();

        let limit = interaction.options.getInteger('limit') || 999999;

        const job = {
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            limit: limit,
            requestedBy: interaction.user.tag,
            channel: interaction.channel,
            interaction: interaction
        };

        archiverWorker.enqueueJob(job);

        await interaction.editReply(`Added to Priority Queue with weight: ${limit}.`);
    },
};
