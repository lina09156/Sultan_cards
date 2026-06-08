const mongoose = require('mongoose');

async function clearUsers() {
    try {
        console.log('🔄 Подключение к MongoDB...');
        await mongoose.connect('mongodb://localhost:27017/durak_game');
        
        const db = mongoose.connection.db;
        
        // Получаем все коллекции
        const collections = await db.listCollections().toArray();
        console.log('📊 Существующие коллекции:', collections.map(c => c.name));
        
        // Удаляем коллекцию users если она существует
        if (collections.some(c => c.name === 'users')) {
            const users = db.collection('users');
            const result = await users.deleteMany({});
            console.log(`✅ Удалено ${result.deletedCount} пользователей`);
        } else {
            console.log('⚠️ Коллекция users не найдена');
        }
        
        // Также удаляем другие коллекции если нужно
        const collectionsToDrop = ['lobbies', 'tournaments'];
        for (const colName of collectionsToDrop) {
            if (collections.some(c => c.name === colName)) {
                await db.collection(colName).deleteMany({});
                console.log(`✅ Очищена коллекция ${colName}`);
            }
        }
        
        console.log('\n📋 База данных очищена');
        
        await mongoose.disconnect();
        console.log('✅ Готово');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

clearUsers();