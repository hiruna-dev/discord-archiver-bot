const PriorityQueue = require('../structures/PriorityQueue');
const fs = require('fs').promises;
const path = require('path');

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

            // TODO: Fetch messages
            // TODO: Insert into BST
            // TODO: Save to DB

            await job.interaction.followUp(`Archive complete for <#${job.channelId}>.`);

        } catch (error) {
            console.error('Error processing archive job:', error);
            try {
                await job.interaction.followUp(`Failed to process archive job for <#${job.channelId}>.`);
            } catch (ignore) { }
        } finally {
            this.isProcessing = false;
            this.processNext();
        }
    }

    async fetchChannelMessages(channel, limit) {
        let allMessages = [];
        let lastId;
        const totalToFetch = limit;

        while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;

            const messages = await channel.messages.fetch(options);
            if (messages.size === 0) break;

            for (const msg of messages.values()) {
                if (msg.content && !msg.author.bot) {
                    allMessages.push(msg);
                }
                if (allMessages.length >= totalToFetch) break;
            }

            if (allMessages.length >= totalToFetch) break;
            lastId = messages.last().id;
        }

        return allMessages;
    }
}

module.exports = new ArchiverWorker();
