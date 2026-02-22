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
        )
        .addStringOption(option =>
            option.setName('start_date')
                .setDescription('Start date in YYYY-MM-DD format (Optional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('end_date')
                .setDescription('End date in YYYY-MM-DD format (Optional, defaults to now)')
                .setRequired(false)
        ),
    async execute(interaction) {
        // Defer reply
        await interaction.deferReply();

        let limit = interaction.options.getInteger('limit') || 999999;

        const startDateArg = interaction.options.getString('start_date');
        const endDateArg = interaction.options.getString('end_date');

        let startDate = null;
        let endDate = null;
        let priorityWeight = limit;

        if (startDateArg) {
            startDate = new Date(startDateArg);
            if (isNaN(startDate.getTime())) return interaction.editReply('Invalid `start_date` format. Use YYYY-MM-DD.');

            endDate = endDateArg ? new Date(endDateArg) : new Date();
            if (isNaN(endDate.getTime())) return interaction.editReply('Invalid `end_date` format. Use YYYY-MM-DD.');

            if (endDate <= startDate) return interaction.editReply('`end_date` must be after `start_date`.');

            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            priorityWeight = Math.min(daysDiff, limit);
        }

        const job = {
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            limit: priorityWeight,
            actualLimit: limit,
            startDate: startDate,
            endDate: endDate,
            requestedBy: interaction.user.tag,
            channel: interaction.channel,
            interaction: interaction
        };

        archiverWorker.enqueueJob(job);

        let replyMsg = `Added to Priority Queue with weight: ${priorityWeight}.`;
        if (startDate) replyMsg += `\nTimeframe: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`;

        await interaction.editReply(replyMsg);
    },
};
