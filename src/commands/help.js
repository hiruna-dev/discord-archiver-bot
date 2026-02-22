const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Learn how to use the bot and its commands.'),
    async execute(interaction) {
        const helpMessage = `
**Bot Commands & Usage**

\`/archive\`
Archives messages from the channel where the command is run. By default, it will fetch ALL messages, but you can limit this or specify a timeframe to speed up the process.

**Options:**
- \`limit\`: The maximum number of messages to fetch. (e.g., 500)
- \`start_date\`: (Optional) The earliest date to pull messages from. Format: YYYY-MM-DD.
- \`end_date\`: (Optional) The latest date to pull messages from. Format: YYYY-MM-DD. Defaults to today if not provided.

**Notes:**
- A JSON file containing the archived messages will be sent to you via DM once complete.
- If your DMs are disabled, the bot will post the file in the channel automatically.
- Your archive request is added to a Priority Queue! Smaller jobs finish faster.
        `;

        await interaction.reply({ content: helpMessage, ephemeral: true });
    },
};
