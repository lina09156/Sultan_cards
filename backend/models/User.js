const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    vkId: {
        type: String,
        sparse: true,
        index: true
    },
    vkFirstName: {
        type: String,
        default: ''
    },
    vkLastName: {
        type: String,
        default: ''
    },
    vkPhoto: {
        type: String,
        default: ''
    },
    isVkUser: {
        type: Boolean,
        default: false
    },
    wins: {
        type: Number,
        default: 0
    },
    losses: {
        type: Number,
        default: 0
    },
    gamesPlayed: {
        type: Number,
        default: 0
    },
    coins: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

// ПРАВИЛЬНЫЙ pre-save middleware для Mongoose 7+
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Метод для проверки пароля
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.addCoins = async function(amount) {
    this.coins += amount;
    await this.save();
    return this.coins;
};

userSchema.methods.spendCoins = async function(amount) {
    if (this.coins < amount) {
        throw new Error('Недостаточно кранов');
    }
    this.coins -= amount;
    await this.save();
    return this.coins;
};

userSchema.methods.addWin = async function() {
    this.wins++;
    this.gamesPlayed++;
    await this.save();
};

userSchema.methods.addLoss = async function() {
    this.losses++;
    this.gamesPlayed++;
    await this.save();
};

module.exports = mongoose.model('User', userSchema);