const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    lobbyId: {
        type: String,
        required: true,
        unique: true
    },
    playersData: {
        type: Map,
        of: {
            totalWins: { type: Number, default: 0 },
            consecutiveWins: { type: Number, default: 0 }
        },
        default: new Map()
    },
    lastRoundWinner: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'draw'],
        default: 'active'
    },
    totalPot: {
        type: Number,
        default: 0
    },
    consecutiveWinsNeeded: {
        type: Number,
        default: 3
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Tournament', tournamentSchema);