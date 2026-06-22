const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { cleanupDeadLobbies } = require('./utils/cleanup'); // ← ДОБАВЛЕНО

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

// ============ СТАТИЧЕСКИЕ ФАЙЛЫ ============
// Статика для фронтенда
app.use(express.static(path.join(__dirname, '../frontend')));
// Статика для публичных файлов (картинки, стикеры)
app.use(express.static(path.join(__dirname, '../public')));
// Отдельный маршрут для стикеров (для надёжности)
app.use('/stickers', express.static(path.join(__dirname, '../public/stickers')));

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

app.get('/lobby.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/lobby.html'));
});

app.get('/deposit', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/deposit.html'));
});

app.get('/deposit.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/deposit.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/game.html'));
});

app.get('/game.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/game.html'));
});

// Подключаем обработчик игры
const gameHandler = require('./socket/gameHandler');
gameHandler(io);

// ============ ПЕРИОДИЧЕСКАЯ ОЧИСТКА ============
// Запускаем очистку каждые 2 минуты
setInterval(async () => {
    try {
        // Импортируем lobbies из gameHandler (экспортируем через module.exports)
        // Или используем глобальную переменную
        const lobbies = global.lobbies || new Map();
        const activeGames = global.activeGames || new Map();
        const tournamentScores = global.tournamentScores || new Map();
        const readyStatus = global.readyStatus || new Map();
        
        const cleaned = await cleanupDeadLobbies(lobbies, activeGames, tournamentScores, readyStatus, io);
        if (cleaned > 0) {
            console.log(`🧹 Очищено ${cleaned} мертвых лобби`);
        }
    } catch (error) {
        console.error('Ошибка при очистке лобби:', error);
    }
}, 120000); // 2 минуты

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📱 Режим: Гибридный (VK + Автономный)`);
    console.log(`📁 Статика подключена:`);
    console.log(`   - frontend: ${path.join(__dirname, '../frontend')}`);
    console.log(`   - public: ${path.join(__dirname, '../public')}`);
    console.log(`   - stickers: ${path.join(__dirname, '../public/stickers')}`);
    if (mongoose.connection.readyState === 1) {
        console.log('📊 MongoDB статус: Подключена');
    } else {
        console.log('📊 MongoDB статус: Не подключена (используется временное хранилище)');
    }
    console.log('🎮 Откройте браузер и перейдите на http://localhost:3000');
    console.log('🃏 Проверка стикеров: http://localhost:3000/stickers/sticker%20(1).png');
    console.log('🃏 Проверка рубашки: http://localhost:3000/back.png');
});

// ============ GRACEFUL SHUTDOWN (ЕДИНЫЙ ОБРАБОТЧИК) ============
async function gracefulShutdown() {
    console.log('🛑 Завершение работы сервера...');
    
    // Закрываем все активные игры и возвращаем монеты
    console.log('💰 Возврат монет из активных игр...');
    // Здесь можно добавить логику возврата монет при остановке сервера
    
    // Закрываем Socket.IO соединения
    io.close(() => {
        console.log('🔌 Socket.IO закрыт');
    });
    
    // Отключаем MongoDB
    if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
        console.log('📊 MongoDB отключена');
    }
    
    process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports.io = io;