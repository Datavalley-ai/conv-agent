// /app/src/models/Group.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const groupSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Group name is required.'],
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Group', groupSchema);