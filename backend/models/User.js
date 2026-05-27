const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 12
    },
    password: {
        type: String,
        required: true
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

// Хеширование пароля перед сохранением
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        throw error;
    }
});

// Метод для проверки пароля
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Добавление кранов
userSchema.methods.addCoins = async function(amount) {
    this.coins += amount;
    await this.save();
    return this.coins;
};

// Списание кранов
userSchema.methods.spendCoins = async function(amount) {
    if (this.coins < amount) {
        throw new Error('Недостаточно кранов');
    }
    this.coins -= amount;
    await this.save();
    return this.coins;
};

// Обновление статистики
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