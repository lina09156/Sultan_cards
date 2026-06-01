const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const connectDB = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" },
    allowEIO3: true,
    transports: ['websocket', 'polling']
});

// Подключаем MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/stickers', express.static(path.join(__dirname, '../public')));

// Сессии для авторизации
app.use(session({
    secret: 'durak-game-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));

// Определение платформы (VK или нет)
app.use((req, res, next) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
    const isVkFromUrl = urlParams.has('vk_user_id') || 
                        urlParams.has('vk_access_token_settings');
    const isVkFromAgent = req.headers['user-agent']?.includes('VK') || false;
    const isVkFromReferer = req.headers.referer?.includes('vk.com') || false;
    
    res.locals.isVkPlatform = isVkFromUrl || isVkFromAgent || isVkFromReferer;
    next();
});

// Подключаем маршруты авторизации
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Маршруты для страниц
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/lobby', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/lobby.html'));
});

app.get('/deposit', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/deposit.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/game.html'));
});

// Подключаем обработчик игры
require('./socket/gameHandler')(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📱 Режим: Гибридный (VK + Автономный)`);
    if (mongoose.connection.readyState === 1) {
        console.log('📊 MongoDB статус: Подключена');
    } else {
        console.log('📊 MongoDB статус: Не подключена (используется временное хранилище)');
    }
    console.log('🎮 Откройте браузер и перейдите на http://localhost:3000');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Завершение работы сервера...');
    if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
        console.log('📊 MongoDB отключена');
    }
    process.exit(0);
});

module.exports.io = io;