const PriorityQueue = require('../structures/PriorityQueue');
const fs = require('fs').promises;
const path = require('path');
const BinarySearchTree = require('../structures/BST');
const Archive = require('../database/models/Archive');

class ArchiverWorker {
    constructor() {
        this.queue = new PriorityQueue();
        this.isProcessing = false;
        this.client = null;
    }

    start(client) {
        this.client = client;
        console.log('Archiver worker loop initialized.');
    }

    enqueueJob(job) {
        console.log(`Enqueuing job for channel ${job.channelId}...`);
        this.queue.enqueue(job);
        this.processNext();
    }

    async processNext() {
        if (this.isProcessing) return;
        if (this.queue.isEmpty()) return;

        this.isProcessing = true;
        const job = this.queue.dequeue();

        try {
            console.log(`Processing job for channel ${job.channelId} (limit: ${job.limit})...`);

            // 1. Fetch messages
            const fetchedMessages = await this.fetchChannelMessages(job.channel, job.actualLimit, job.startDate, job.endDate);

            if (fetchedMessages.length === 0) {
                await job.interaction.followUp({ content: `No messages found to archive in <#${job.channelId}>.`, ephemeral: true });
                this.isProcessing = false;
                this.processNext();
                return;
            }

            // 2. Insert into BST
            const bst = new BinarySearchTree();
            for (const msg of fetchedMessages) {
                bst.insert(msg);
            }

            // 3. Extract sorted
            const sortedMessages = bst.getSortedMessages();

            // 4. Save to Database
            const mapForDb = sortedMessages.map(msg => ({
                messageId: msg.id,
                authorId: msg.author.id,
                authorTag: msg.author.tag,
                content: msg.content,
                timestamp: msg.createdAt
            }));

            const archiveRecord = new Archive({
                guildId: job.guildId,
                channelId: job.channelId,
                requestedBy: job.requestedBy,
                messages: mapForDb
            });

            await archiveRecord.save();

            // 5. Generate JSON file for export
            const exportData = JSON.stringify(mapForDb, null, 2);
            const fileName = `archive_${job.channelId}_${Date.now()}.json`;
            const filePath = path.join(__dirname, '../../', fileName);
            await fs.writeFile(filePath, exportData);

            // 6. Notify the user via DM, fallback to channel
            const attachment = { attachment: filePath, name: fileName };
            let successContent = `Successfully archived **${mapForDb.length}** messages from <#${job.channelId}>.\n\n`;

            if (mapForDb.length > 0) {
                // Ensure correct chronological order
                const t0 = new Date(mapForDb[0].timestamp).getTime();
                const tEnd = new Date(mapForDb[mapForDb.length - 1].timestamp).getTime();
                const firstMsg = t0 < tEnd ? mapForDb[0] : mapForDb[mapForDb.length - 1];
                const lastMsg = t0 < tEnd ? mapForDb[mapForDb.length - 1] : mapForDb[0];

                // Use requested parameters or auto-determine from messages
                const startMs = job.startDate ? job.startDate.getTime() : new Date(firstMsg.timestamp).getTime();
                const endMs = job.endDate ? job.endDate.getTime() : new Date(lastMsg.timestamp).getTime();

                const timeDiffDays = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
                const avgPerDay = (mapForDb.length / timeDiffDays).toFixed(2);

                const formatTime = (isoString) => new Date(isoString).toISOString().replace('T', ' ').split('.')[0] + ' UTC';

                successContent += `**📊 Archive Stats:**\n` +
                    `- **Oldest Message:** ${formatTime(firstMsg.timestamp)} | Sent by **${firstMsg.authorTag}**\n` +
                    `- **Newest Message:** ${formatTime(lastMsg.timestamp)} | Sent by **${lastMsg.authorTag}**\n` +
                    `- **Avg Message Frequency:** ~${avgPerDay} messages/day over ${timeDiffDays} day(s)\n`;
            }

            try {
                const user = await job.interaction.client.users.fetch(job.interaction.user.id);
                await user.send({ content: successContent, files: [attachment] });
                await job.interaction.followUp({ content: `Archive complete! I've sent you a DM with the exported JSON file and statistics.`, ephemeral: true });
            } catch (dmError) {
                await job.interaction.followUp({ content: `${successContent}\n*(I couldn't DM you, so here is the file directly!)*`, files: [attachment], ephemeral: true });
            }

            await fs.unlink(filePath).catch(console.error);
            await Archive.findByIdAndDelete(archiveRecord._id);

            console.log(`Job complete: Saved ${mapForDb.length} messages.`);

        } catch (error) {
            console.error('Error processing archive job:', error);
            try {
                await job.interaction.followUp({ content: `Failed to process archive job for <#${job.channelId}>.`, ephemeral: true });
            } catch (ignore) { }
        } finally {
            this.isProcessing = false;
            this.processNext();
        }
    }

    async fetchChannelMessages(channel, limit, startDate, endDate) {
        let allMessages = [];
        let lastId;
        let reachedStartDate = false;
        const totalToFetch = limit;

        while (!reachedStartDate) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;

            const messages = await channel.messages.fetch(options);
            if (messages.size === 0) break;

            for (const msg of messages.values()) {
                const msgDate = new Date(msg.createdTimestamp);

                if (startDate && msgDate < startDate) {
                    reachedStartDate = true;
                    break;
                }

                if (endDate && msgDate > endDate) continue;

                if (msg.content && !msg.author.bot) {
                    allMessages.push(msg);
                }

                if (allMessages.length >= totalToFetch) {
                    reachedStartDate = true;
                    break;
                }
            }

            if (!reachedStartDate) lastId = messages.last().id;
        }

        return allMessages;
    }
}

module.exports = new ArchiverWorker();
