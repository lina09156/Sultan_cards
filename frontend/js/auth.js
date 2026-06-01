const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const router = express.Router();

// Временное хранилище на случай если MongoDB не доступна
const tempUsers = new Map();

// ============ ОБЫЧНАЯ РЕГИСТРАЦИЯ ============
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }
    
    if (username.length < 3 || username.length > 12) {
        return res.status(400).json({ error: 'Ник должен быть от 3 до 12 символов' });
    }
    
    if (password.length < 3) {
        return res.status(400).json({ error: 'Пароль должен быть не менее 3 символов' });
    }
    
    try {
        let useMongoDB = mongoose.connection.readyState === 1;
        
        if (useMongoDB) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ error: 'Пользователь с таким ником уже существует' });
            }
            
            const user = new User({ username, password, coins: 0 });
            await user.save();
            
            console.log(`✅ Новый пользователь зарегистрирован в MongoDB: ${username}`);
            res.json({ success: true, message: 'Регистрация успешна' });
        } else {
            if (tempUsers.has(username)) {
                return res.status(400).json({ error: 'Пользователь с таким ником уже существует' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            tempUsers.set(username, { 
                password: hashedPassword,
                wins: 0,
                losses: 0,
                gamesPlayed: 0,
                coins: 0
            });
            
            console.log(`✅ Новый пользователь зарегистрирован во временном хранилище: ${username}`);
            res.json({ success: true, message: 'Регистрация успешна' });
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера при регистрации' });
    }
});

// ============ ОБЫЧНЫЙ ЛОГИН ============
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }
    
    try {
        let useMongoDB = mongoose.connection.readyState === 1;
        let user = null;
        
        if (useMongoDB) {
            user = await User.findOne({ username });
        } else {
            user = tempUsers.get(username);
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        let isValid;
        if (useMongoDB) {
            isValid = await user.comparePassword(password);
        } else {
            isValid = await bcrypt.compare(password, user.password);
        }
        
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        req.session.userId = username;
        req.session.username = username;
        
        console.log(`🔓 Вход в систему: ${username}`);
        res.json({ 
            success: true, 
            username,
            stats: { 
                wins: user.wins || 0, 
                losses: user.losses || 0,
                gamesPlayed: user.gamesPlayed || 0,
                coins: user.coins || 0
            }
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера при входе' });
    }
});

// ============ VK АВТОРИЗАЦИЯ ============
router.post('/vk-login', async (req, res) => {
    const { vk_id, first_name, last_name, photo } = req.body;
    
    if (!vk_id) {
        return res.status(400).json({ error: 'Не указан VK ID' });
    }
    
    try {
        let useMongoDB = mongoose.connection.readyState === 1;
        const username = `vk_${vk_id}`;
        
        if (useMongoDB) {
            let user = await User.findOne({ username });
            
            if (!user) {
                user = new User({
                    username: username,
                    password: await bcrypt.hash(vk_id + '_vk_secret_key_' + process.env.VK_SECRET || 'default_secret', 10),
                    coins: 500,
                    vkId: vk_id,
                    vkFirstName: first_name || '',
                    vkLastName: last_name || '',
                    vkPhoto: photo || '',
                    isVkUser: true
                });
                await user.save();
                console.log(`✅ Новый VK пользователь зарегистрирован: ${username} (${first_name} ${last_name})`);
            } else {
                // Обновляем информацию о пользователе
                if (first_name) user.vkFirstName = first_name;
                if (last_name) user.vkLastName = last_name;
                if (photo) user.vkPhoto = photo;
                user.lastLogin = new Date();
                await user.save();
                console.log(`🔄 Обновлён VK пользователь: ${username}`);
            }
            
            req.session.userId = username;
            req.session.username = username;
            
            res.json({
                success: true,
                username: username,
                stats: {
                    wins: user.wins,
                    losses: user.losses,
                    gamesPlayed: user.gamesPlayed,
                    coins: user.coins
                }
            });
        } else {
            let user = tempUsers.get(username);
            
            if (!user) {
                user = {
                    password: await bcrypt.hash(vk_id + '_vk_secret_key', 10),
                    wins: 0,
                    losses: 0,
                    gamesPlayed: 0,
                    coins: 500,
                    vkId: vk_id,
                    vkFirstName: first_name,
                    vkLastName: last_name,
                    vkPhoto: photo,
                    isVkUser: true
                };
                tempUsers.set(username, user);
                console.log(`✅ Новый VK пользователь во временном хранилище: ${username}`);
            } else {
                user.lastLogin = Date.now();
                tempUsers.set(username, user);
                console.log(`🔄 Обновлён VK пользователь во временном хранилище: ${username}`);
            }
            
            req.session.userId = username;
            req.session.username = username;
            
            res.json({
                success: true,
                username: username,
                stats: {
                    wins: user.wins,
                    losses: user.losses,
                    gamesPlayed: user.gamesPlayed,
                    coins: user.coins
                }
            });
        }
    } catch (error) {
        console.error('Ошибка VK-логина:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============ ПРОВЕРКА АВТОРИЗАЦИИ ============
router.get('/check', async (req, res) => {
    if (req.session.userId) {
        try {
            let useMongoDB = mongoose.connection.readyState === 1;
            let user = null;
            let stats = { wins: 0, losses: 0, gamesPlayed: 0, coins: 0 };
            
            if (useMongoDB) {
                user = await User.findOne({ username: req.session.userId });
                if (user) {
                    stats = { 
                        wins: user.wins, 
                        losses: user.losses, 
                        gamesPlayed: user.gamesPlayed,
                        coins: user.coins
                    };
                }
            } else {
                user = tempUsers.get(req.session.userId);
                if (user) {
                    stats = { 
                        wins: user.wins, 
                        losses: user.losses, 
                        gamesPlayed: user.gamesPlayed,
                        coins: user.coins
                    };
                }
            }
            
            if (user) {
                res.json({ 
                    authenticated: true, 
                    username: req.session.username,
                    stats
                });
            } else {
                req.session.destroy();
                res.json({ authenticated: false });
            }
        } catch (error) {
            console.error('Ошибка проверки сессии:', error);
            res.json({ authenticated: false });
        }
    } else {
        res.json({ authenticated: false });
    }
});

// ============ ВЫХОД ============
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ============ ПРОВЕРКА НАЛИЧИЯ КРАНОВ ============
router.post('/check-coins', async (req, res) => {
    const { username, amount = 500 } = req.body;
    
    try {
        let useMongoDB = mongoose.connection.readyState === 1;
        
        if (useMongoDB) {
            const user = await User.findOne({ username });
            if (!user) {
                return res.json({ hasCoins: false, error: 'Пользователь не найден' });
            }
            
            res.json({ hasCoins: user.coins >= amount, coins: user.coins });
        } else {
            const user = tempUsers.get(username);
            if (!user) {
                return res.json({ hasCoins: false, error: 'Пользователь не найден' });
            }
            
            res.json({ hasCoins: (user.coins || 0) >= amount, coins: user.coins });
        }
    } catch (error) {
        console.error('Ошибка проверки кранов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============ СПИСАНИЕ КРАНОВ ============
router.post('/spend-coins', async (req, res) => {
    const { username, amount = 500 } = req.body;
    
    try {
        let useMongoDB = mongoose.connection.readyState === 1;
        
        if (useMongoDB) {
            const user = await User.findOne({ username });
            if (!user) {
                return res.json({ success: false, error: 'Пользователь не найден' });
            }
            
            if (user.coins < amount) {
                return res.json({ success: false, error: `Недостаточно кранов. Нужно ${amount} кранов` });
            }
            
            user.coins -= amount;
            await user.save();
            
            console.log(`💰 ${username} потратил ${amount} кранов на игру. Баланс: ${user.coins}`);
            res.json({ success: true, coins: user.coins });
        } else {
            const user = tempUsers.get(username);
            if (!user) {
                return res.json({ success: false, error: 'Пользователь не найден' });
            }
            
            if ((user.coins || 0) < amount) {
                return res.json({ success: false, error: `Недостаточно кранов. Нужно ${amount} кранов` });
            }
            
            user.coins = (user.coins || 0) - amount;
            tempUsers.set(username, user);
            
            console.log(`💰 ${username} потратил ${amount} кранов на игру. Баланс: ${user.coins}`);
            res.json({ success: true, coins: user.coins });
        }
    } catch (error) {
        console.error('Ошибка списания кранов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============ ДОБАВЛЕНИЕ КРАНОВ ============
router.post('/add-coins', async (req, res) => {
    const { username, amount } = req.body;
    
    console.log(`📥 Запрос на пополнение: ${username}, сумма: ${amount}`);
    
    if (!username || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Неверные параметры' });
    }
    
    try {
        let useMongoDB = mongoose.connection.readyState === 1;
        
        if (useMongoDB) {
            const user = await User.findOne({ username });
            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            const oldCoins = user.coins;
            user.coins += amount;
            await user.save();
            
            console.log(`💰 ${username} получил +${amount} кранов. Баланс: ${oldCoins} → ${user.coins}`);
            return res.json({ success: true, coins: user.coins });
        } else {
            const user = tempUsers.get(username);
            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            const oldCoins = user.coins || 0;
            user.coins = oldCoins + amount;
            tempUsers.set(username, user);
            
            console.log(`💰 ${username} получил +${amount} кранов. Баланс: ${oldCoins} → ${user.coins}`);
            return res.json({ success: true, coins: user.coins });
        }
    } catch (error) {
        console.error('❌ Ошибка добавления кранов:', error);
        return res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
    }
});

// ============ ОБНОВЛЕНИЕ СТАТИСТИКИ ============
router.post('/update-stats', async (req, res) => {
    const { username, won } = req.body;
    
    try {
        let useMongoDB = mongoose.connection.readyState === 1;
        
        if (useMongoDB) {
            const user = await User.findOne({ username });
            if (user) {
                if (won) {
                    await user.addWin();
                } else {
                    await user.addLoss();
                }
                console.log(`📊 Статистика обновлена в MongoDB: ${username}`);
                res.json({ success: true, stats: { wins: user.wins, losses: user.losses, gamesPlayed: user.gamesPlayed, coins: user.coins } });
            } else {
                res.json({ success: false });
            }
        } else {
            const user = tempUsers.get(username);
            if (user) {
                if (won) {
                    user.wins++;
                } else {
                    user.losses++;
                }
                user.gamesPlayed++;
                tempUsers.set(username, user);
                console.log(`📊 Статистика обновлена во временном хранилище: ${username}`);
                res.json({ success: true, stats: { wins: user.wins, losses: user.losses, gamesPlayed: user.gamesPlayed, coins: user.coins } });
            } else {
                res.json({ success: false });
            }
        }
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============ СМЕНА ИМЕНИ ============
router.post('/change-username', async (req, res) => {
    const { oldUsername, newUsername } = req.body;
    
    if (!newUsername || newUsername.length < 3 || newUsername.length > 12) {
        return res.status(400).json({ error: 'Ник должен быть от 3 до 12 символов' });
    }
    
    try {
        let useMongoDB = mongoose.connection.readyState === 1;
        
        if (useMongoDB) {
            const existingUser = await User.findOne({ username: newUsername });
            if (existingUser) {
                return res.status(400).json({ error: 'Это имя уже занято' });
            }
            
            const user = await User.findOne({ username: oldUsername });
            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            user.username = newUsername;
            await user.save();
            
            req.session.username = newUsername;
            req.session.userId = newUsername;
            
            console.log(`✏️ ${oldUsername} сменил имя на ${newUsername}`);
            res.json({ success: true, username: newUsername, stats: { wins: user.wins, losses: user.losses, gamesPlayed: user.gamesPlayed, coins: user.coins } });
        } else {
            const user = tempUsers.get(oldUsername);
            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            if (tempUsers.has(newUsername)) {
                return res.status(400).json({ error: 'Это имя уже занято' });
            }
            
            tempUsers.set(newUsername, { ...user });
            tempUsers.delete(oldUsername);
            
            req.session.username = newUsername;
            req.session.userId = newUsername;
            
            console.log(`✏️ ${oldUsername} сменил имя на ${newUsername}`);
            res.json({ success: true, username: newUsername, stats: { wins: user.wins, losses: user.losses, gamesPlayed: user.gamesPlayed, coins: user.coins } });
        }
    } catch (error) {
        console.error('Ошибка смены имени:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============ ПОЛУЧЕНИЕ СТАТИСТИКИ ПО VK ID ============
router.get('/vk-stats/:vkId', async (req, res) => {
    const { vkId } = req.params;
    const username = `vk_${vkId}`;
    
    try {
        let useMongoDB = mongoose.connection.readyState === 1;
        
        if (useMongoDB) {
            const user = await User.findOne({ username });
            if (user) {
                res.json({
                    exists: true,
                    stats: {
                        wins: user.wins,
                        losses: user.losses,
                        gamesPlayed: user.gamesPlayed,
                        coins: user.coins
                    }
                });
            } else {
                res.json({ exists: false });
            }
        } else {
            const user = tempUsers.get(username);
            if (user) {
                res.json({
                    exists: true,
                    stats: {
                        wins: user.wins,
                        losses: user.losses,
                        gamesPlayed: user.gamesPlayed,
                        coins: user.coins
                    }
                });
            } else {
                res.json({ exists: false });
            }
        }
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;