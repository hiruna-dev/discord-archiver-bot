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
}

module.exports = new ArchiverWorker();
