const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    category: {
        type: String,
        enum: ['Family', 'Friend', 'Work', 'Other'], // Add allowed categories here
        default: 'Other'
    },
    isFavorite: { type: Boolean, default: false },
    notes: { type: String },
    lastContacted: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Contact', contactSchema);
