const mongoose = require('mongoose');

const archiveSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    archivedAt: { type: Date, default: Date.now },
    requestedBy: { type: String, required: true },
    messages: [
        {
            messageId: String,
            authorId: String,
            authorTag: String,
            content: String,
            timestamp: Date
        }
    ]
});

module.exports = mongoose.model('Archive', archiveSchema);
