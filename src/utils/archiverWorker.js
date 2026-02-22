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
            const successMsg = `Successfully archived ${mapForDb.length} messages from <#${job.channelId}> into the database.`;

            try {
                const user = await job.interaction.client.users.fetch(job.interaction.user.id);
                await user.send({ content: successMsg, files: [attachment] });
                await job.interaction.followUp({ content: `Archive complete! I have sent you a DM with the exported JSON file.`, ephemeral: true });
            } catch (dmError) {
                await job.interaction.followUp({ content: `${successMsg}\n(I couldn't DM you, so here is the export file!)`, files: [attachment], ephemeral: true });
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
