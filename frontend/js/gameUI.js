let isMyAttackTurn = false;
let isMyDefendTurn = false;
let isMyAdditionalAttackTurn = false;
let myHand = [];
let tableCards = [];
let socket = null;
let playerName = null;
let gameReady = false;
let stateRequestCount = 0;
let currentGameState = null;
let currentLobbyId = null;
let dealingInProgress = false;
let dealerIndex = null;
let animationOverlay = null;
let winTarget = 3;
let currentCardsPerPlayer = 0;

// Переменные для drag & drop
let draggedCardIndex = null;
let draggedElement = null;
let wasDragged = false;
let touchStartY = 0;
let touchStartX = 0;
let touchCardIndex = null;
let touchElement = null;
let touchClone = null;
let touchMoved = false;

// Блокировка действий
let isActionInProgress = false;
let actionTimeout = null;

// Турнирные очки
let tournamentScores = {};

// Добавляем стили для анимаций
(function addGameStyles() {
    const gameStyles = document.createElement('style');
    gameStyles.id = 'gameUIStyles';
    gameStyles.textContent = `
        @keyframes dropPulse {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes flashPulse {
            0% {
                transform: translate(-50%, -50%) scale(0.5);
                opacity: 0.8;
            }
            100% {
                transform: translate(-50%, -50%) scale(1.5);
                opacity: 0;
            }
        }
        
        @keyframes cardArrive {
            0% {
                transform: scale(0.8);
                opacity: 0;
            }
            80% {
                transform: scale(1.05);
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }
        
        .drop-active {
            box-shadow: 0 0 40px rgba(212, 175, 55, 0.8) !important;
            transition: box-shadow 0.3s ease;
        }
        
        .card[draggable="true"] {
            cursor: grab;
        }
        
        .card[draggable="true"]:active {
            cursor: grabbing;
        }
        
        .card.dragging {
            opacity: 0.5;
            transform: scale(0.95);
        }
        
        .flying-card, .flying-card-to-table {
            will-change: transform;
            filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.5));
        }
        
        .flying-card .card, .flying-card-to-table .card {
            width: 100%;
            height: 100%;
            margin: 0;
        }
        
        @keyframes cardFlip {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(180deg); }
        }
        
        .card-arrive {
            animation: cardArrive 0.25s ease-out;
        }
        
        .card-back {
            width: 100%;
            height: 100%;
            border-radius: 10px;
            overflow: hidden;
            background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%);
            border: 2px solid #d4af37;
            box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);
            position: relative;
        }
        
        .card-back-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .card-back-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            color: rgba(212, 175, 55, 0.7);
            background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%);
        }
    `;
    document.head.appendChild(gameStyles);
})();

// ================== ЗАГРУЗОЧНЫЙ ЭКРАН ==================
function showLoadingScreen() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(ellipse at 30% 20%, #2a1508 0%, #0a0502 100%);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: 'Oswald', sans-serif;
    `;
    
    loadingOverlay.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 20px; animation: cardSpin 2s ease-in-out infinite;">🎴</div>
        <div style="color: #d4af37; font-size: 28px; letter-spacing: 3px; margin-bottom: 30px; text-shadow: 0 0 20px rgba(212,175,55,0.5);">SULTAN CASINO</div>
        <div style="width: 250px; height: 4px; background: rgba(212, 175, 55, 0.2); border-radius: 2px; overflow: hidden; box-shadow: 0 0 10px rgba(212,175,55,0.3);">
            <div id="loadingBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #b8860b, #d4af37, #ffd700); border-radius: 2px; transition: width 0.5s ease;"></div>
        </div>
        <div id="loadingText" style="color: #c9af7b; margin-top: 15px; font-size: 16px; letter-spacing: 1px;">Подключение к серверу...</div>
    `;
    
    if (!document.getElementById('loadingStyles')) {
        const style = document.createElement('style');
        style.id = 'loadingStyles';
        style.textContent = `
            @keyframes cardSpin {
                0%, 100% { transform: rotateY(0deg); }
                50% { transform: rotateY(180deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(loadingOverlay);
}

function updateLoadingProgress(percent, text) {
    const loadingBar = document.getElementById('loadingBar');
    const loadingText = document.getElementById('loadingText');
    if (loadingBar) loadingBar.style.width = percent + '%';
    if (loadingText) loadingText.textContent = text;
}

function hideLoadingScreen() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.transition = 'opacity 0.5s ease';
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            if (loadingOverlay.parentNode) {
                loadingOverlay.remove();
            }
        }, 500);
    }
}

// ================== ФУНКЦИЯ ОБНОВЛЕНИЯ СТАТУС-БАРА ==================
function forceUpdateStatusBar() {
    if (!currentGameState) return;
    
    const statusBar = document.getElementById('statusBar');
    if (!statusBar) return;
    
    if (statusBar.hasAttribute('data-temp-message')) return;
    
    if (currentGameState.gameWinner) {
        if (currentGameState.gameWinner.includes(playerName)) {
            statusBar.innerHTML = `🏆 ВЫ ПОБЕДИТЕЛЬ! 🏆`;
        } else {
            statusBar.innerHTML = `🏆 ПОБЕДИТЕЛЬ: ${currentGameState.gameWinner} 🏆`;
        }
        statusBar.style.background = 'linear-gradient(135deg, #d4af37, #b8860b)';
        statusBar.style.color = '#1a0f08';
        statusBar.style.borderLeft = '6px solid #ffd700';
        statusBar.style.fontWeight = 'bold';
        return;
    }
    
    let statusHtml = '';
    
    if (currentGameState.isMyAdditionalAttackTurn) {
        const attackCount = (currentGameState.table || []).filter(t => t.type === 'attack').length;
        const defendCount = (currentGameState.table || []).filter(t => t.type === 'defend').length;
        
        if (attackCount > defendCount) {
            statusHtml = '⏳ ОЖИДАЙТЕ ОТБОЯ ⏳<br><span style="font-size:12px">Защитник должен отбить карту</span>';
            statusBar.style.background = 'rgba(255, 193, 7, 0.85)';
        } else {
            statusHtml = '➕ ВЫ ПОДКИДЫВАЕТЕ КАРТЫ ➕<br><span style="font-size:12px">Перетащите ОДНУ карту на стол или нажмите "ЗАВЕРШИТЬ ПОДКИД"</span>';
            statusBar.style.background = 'rgba(255, 193, 7, 0.92)';
        }
        statusBar.style.color = '#1a0f08';
        statusBar.style.borderLeft = '6px solid #ffc107';
        statusBar.style.fontWeight = 'bold';
    } 
    else if (currentGameState.isMyTurnAttack) {
        const attackCount = (currentGameState.table || []).filter(t => t.type === 'attack').length;
        const defendCount = (currentGameState.table || []).filter(t => t.type === 'defend').length;
        
        if (attackCount > defendCount) {
            statusHtml = '⏳ ОЖИДАЙТЕ ОТБОЯ ⏳<br><span style="font-size:12px">Противник отбивается</span>';
            statusBar.style.background = 'rgba(220, 53, 69, 0.75)';
        } else if (currentGameState.table && currentGameState.table.length === 0) {
            statusHtml = '🔥 ВЫ АТАКУЕТЕ 🔥<br><span style="font-size:12px">Перетащите ОДНУ карту на стол</span>';
            statusBar.style.background = 'rgba(220, 53, 69, 0.92)';
        } else {
            statusHtml = '🔥 ПОДКИДЫВАЙТЕ КАРТЫ 🔥<br><span style="font-size:12px">Или нажмите "ЗАВЕРШИТЬ ХОД"</span>';
            statusBar.style.background = 'rgba(220, 53, 69, 0.92)';
        }
        statusBar.style.color = '#ffffff';
        statusBar.style.borderLeft = '6px solid #dc3545';
        statusBar.style.fontWeight = 'bold';
    } 
    else if (currentGameState.isMyTurnDefend) {
        statusHtml = '🛡️ ВЫ ОТБИВАЕТЕСЬ 🛡️<br><span style="font-size:12px">Перетащите карту на стол или нажмите "ЗАБРАТЬ КАРТЫ"</span>';
        statusBar.style.background = 'rgba(40, 167, 69, 0.92)';
        statusBar.style.color = '#ffffff';
        statusBar.style.borderLeft = '6px solid #28a745';
        statusBar.style.fontWeight = 'bold';
    } 
    else {
        let additionalInfo = '';
        if (currentGameState.additionalAttacker) {
            additionalInfo = ` | ✨ Подкидывает: ${currentGameState.additionalAttacker}`;
        }
        statusHtml = `🎴 Ходит: ${currentGameState.currentAttacker || '—'} → отбивается: ${currentGameState.currentDefender || '—'}${additionalInfo}<br><span style="font-size:12px">♢ КОЗЫРЬ: БУБНЫ</span>`;
        statusBar.style.background = 'rgba(10, 6, 4, 0.92)';
        statusBar.style.color = '#f5e2b0';
        statusBar.style.borderLeft = '6px solid #d4af37';
        statusBar.style.fontWeight = 'normal';
    }
    
    statusBar.innerHTML = statusHtml;
}

// ================== АНИМАЦИЯ ВЗЯТИЯ КАРТ ==================
function animateTakeCards(tableCardsArray, targetPlayerName) {
    console.log('🎬 Запуск анимации взятия карт для', targetPlayerName);
    
    const tableZone = document.getElementById('tableZone');
    if (!tableZone) return;
    
    const cardPairs = tableZone.querySelectorAll('.card-pair');
    if (cardPairs.length === 0) return;
    
    let targetPosition = null;
    const isCurrentUser = targetPlayerName === playerName;
    
    if (isCurrentUser) {
        const myHandArea = document.getElementById('myHand');
        if (myHandArea) {
            const rect = myHandArea.getBoundingClientRect();
            targetPosition = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        } else {
            targetPosition = { x: window.innerWidth / 2, y: window.innerHeight - 100 };
        }
    } else {
        let playerElement = null;
        const players = document.querySelectorAll('.player-badge');
        for (let player of players) {
            const nameElement = player.querySelector('.player-name');
            if (nameElement && nameElement.textContent === targetPlayerName) {
                playerElement = player;
                break;
            }
        }
        
        if (playerElement) {
            const rect = playerElement.getBoundingClientRect();
            targetPosition = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        } else {
            targetPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        }
    }
    
    const allCards = [];
    cardPairs.forEach(pair => {
        const cards = pair.querySelectorAll('.card');
        cards.forEach(card => {
            allCards.push(card);
        });
    });
    
    if (allCards.length === 0) return;
    
    const takeOverlay = document.createElement('div');
    takeOverlay.id = 'takeAnimationOverlay';
    takeOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10000;
    `;
    document.body.appendChild(takeOverlay);
    
    allCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        
        const flyingCard = document.createElement('div');
        flyingCard.className = 'flying-card';
        
        const cardBackDiv = document.createElement('div');
        cardBackDiv.className = 'card-back';
        cardBackDiv.style.cssText = `
            width: 100%;
            height: 100%;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        `;
        
        const backImg = document.createElement('img');
        backImg.src = '/back.png';
        backImg.alt = 'Рубашка';
        backImg.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
        `;
        backImg.onerror = () => {
            backImg.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'card-back-fallback';
            fallback.style.cssText = `
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%);
                border-radius: 10px;
                border: 2px solid #d4af37;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                color: rgba(212, 175, 55, 0.7);
            `;
            fallback.textContent = '🂠';
            cardBackDiv.appendChild(fallback);
        };
        cardBackDiv.appendChild(backImg);
        
        flyingCard.style.cssText = `
            position: fixed;
            left: ${rect.left}px;
            top: ${rect.top}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            z-index: ${10000 + index};
            transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            transform-origin: center center;
            filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.4));
        `;
        
        flyingCard.appendChild(cardBackDiv);
        takeOverlay.appendChild(flyingCard);
        
        card.style.opacity = '0';
        card.style.visibility = 'hidden';
        
        setTimeout(() => {
            const deltaX = targetPosition.x - rect.left - rect.width / 2;
            const deltaY = targetPosition.y - rect.top - rect.height / 2;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const duration = Math.min(500, Math.max(300, distance / 2.5));
            const randomRotate = Math.random() * 60 - 30;
            
            flyingCard.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0.9, 0.4, 1.1), opacity ${duration}ms ease`;
            flyingCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${randomRotate}deg) scale(0.4)`;
            flyingCard.style.opacity = '0';
            
            createFlyParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }, index * 60);
    });
    
    const maxDelay = allCards.length * 60 + 800;
    setTimeout(() => {
        if (takeOverlay && takeOverlay.parentNode) {
            takeOverlay.remove();
        }
        cardPairs.forEach(pair => {
            const cards = pair.querySelectorAll('.card');
            cards.forEach(card => {
                card.style.opacity = '';
                card.style.visibility = '';
            });
        });
    }, maxDelay);
}

function createFlyParticles(x, y) {
    for (let i = 0; i < 10; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 5px;
            height: 5px;
            background: radial-gradient(circle, #ffd700, #d4af37);
            border-radius: 50%;
            pointer-events: none;
            z-index: 10001;
            box-shadow: 0 0 8px rgba(212, 175, 55, 0.8);
        `;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 60 + 15;
        const duration = 0.5 + Math.random() * 0.3;
        
        particle.style.transition = `transform ${duration}s ease-out, opacity ${duration}s ease-out`;
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            particle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
            particle.style.opacity = '0';
        }, 10);
        
        setTimeout(() => {
            if (particle.parentNode) particle.remove();
        }, duration * 1000);
    }
}

// ================== АНИМАЦИЯ ВЫСТАВЛЕНИЯ КАРТЫ ==================
function animateCardToTableFromData(cardRect, cardClone, onComplete) {
    const tableZone = document.getElementById('tableZone');
    let targetX, targetY;
    
    if (tableZone) {
        const tableRect = tableZone.getBoundingClientRect();
        targetX = tableRect.left + tableRect.width / 2;
        targetY = tableRect.top + tableRect.height / 2;
    } else {
        targetX = window.innerWidth / 2;
        targetY = window.innerHeight / 2;
    }
    
    const flyingCard = document.createElement('div');
    flyingCard.className = 'flying-card-to-table';
    
    cardClone.style.width = '100%';
    cardClone.style.height = '100%';
    cardClone.style.margin = '0';
    
    flyingCard.style.cssText = `
        position: fixed;
        left: ${cardRect.left}px;
        top: ${cardRect.top}px;
        width: ${cardRect.width}px;
        height: ${cardRect.height}px;
        z-index: 10060;
        transition: all 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        transform-origin: center center;
        filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.5));
        opacity: 1;
    `;
    
    flyingCard.appendChild(cardClone);
    document.body.appendChild(flyingCard);
    
    const deltaX = targetX - cardRect.left - cardRect.width / 2;
    const deltaY = targetY - cardRect.top - cardRect.height / 2;
    const randomRotate = (Math.random() - 0.5) * 20;
    
    setTimeout(() => {
        flyingCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${randomRotate}deg) scale(0.9)`;
        createEnhancedTrailEffect(cardRect.left + cardRect.width / 2, cardRect.top + cardRect.height / 2, targetX, targetY);
    }, 20);
    
    setTimeout(() => {
        if (flyingCard && flyingCard.parentNode) {
            flyingCard.remove();
        }
        if (onComplete) onComplete();
    }, 450);
}

function createEnhancedTrailEffect(startX, startY, endX, endY) {
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = startX + (endX - startX) * t;
        const y = startY + (endY - startY) * t;
        
        setTimeout(() => {
            const trail = document.createElement('div');
            const size = 6 + (1 - t) * 6;
            trail.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: ${size}px;
                height: ${size}px;
                background: radial-gradient(circle, #ffd700, #d4af37);
                border-radius: 50%;
                pointer-events: none;
                z-index: 10055;
                opacity: ${0.7 - t * 0.5};
                transform: translate(-50%, -50%);
                filter: blur(${2 - t * 1.5}px);
                box-shadow: 0 0 ${8 * (1 - t)}px rgba(212, 175, 55, 0.8);
                transition: opacity 0.2s ease;
            `;
            document.body.appendChild(trail);
            
            setTimeout(() => {
                trail.style.opacity = '0';
                setTimeout(() => trail.remove(), 200);
            }, 100);
        }, i * 25);
    }
    
    setTimeout(() => {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            left: ${endX}px;
            top: ${endY}px;
            width: 70px;
            height: 70px;
            background: radial-gradient(circle, rgba(212, 175, 55, 0.8), rgba(212, 175, 55, 0.2), transparent);
            border-radius: 50%;
            pointer-events: none;
            z-index: 10054;
            transform: translate(-50%, -50%);
            animation: flashPulse 0.3s ease-out forwards;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 300);
    }, 420);
}

// ================== АНИМАЦИЯ КАРТЫ ДРУГОГО ИГРОКА ==================
function animateCardFromPlayerToTable(data) {
    let playerRect = null;
    
    const players = document.querySelectorAll('.player-badge');
    for (let player of players) {
        const nameElement = player.querySelector('.player-name');
        if (nameElement && nameElement.textContent === data.playerUsername) {
            playerRect = player.getBoundingClientRect();
            break;
        }
    }
    
    if (!playerRect) {
        console.log('⚠️ Не найдена позиция игрока:', data.playerUsername);
        return;
    }
    
    const tableZone = document.getElementById('tableZone');
    let endX, endY;
    if (tableZone) {
        const tableRect = tableZone.getBoundingClientRect();
        endX = tableRect.left + tableRect.width / 2;
        endY = tableRect.top + tableRect.height / 2;
    } else {
        endX = window.innerWidth / 2;
        endY = window.innerHeight / 2;
    }
    
    const flyingCard = document.createElement('div');
    flyingCard.className = 'flying-card-to-table';
    
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.innerHTML = `
        <div class="card-back">
            <img src="/back.png" alt="Рубашка" class="card-back-img" onerror="this.style.display='none'; this.parentElement.classList.add('card-back-fallback');">
            <div class="card-back-fallback-content">🂠</div>
        </div>
    `;
    cardDiv.style.cssText = 'width:100%; height:100%; margin:0;';
    flyingCard.appendChild(cardDiv);
    
    const startX = playerRect.left + playerRect.width / 2 - 40;
    const startY = playerRect.top + playerRect.height / 2 - 60;
    
    flyingCard.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top: ${startY}px;
        width: 80px;
        height: 120px;
        z-index: 10060;
        transition: all 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        transform-origin: center center;
        filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.5));
        opacity: 1;
    `;
    
    document.body.appendChild(flyingCard);
    
    const deltaX = endX - startX - 40;
    const deltaY = endY - startY - 60;
    const randomRotate = (Math.random() - 0.5) * 20;
    
    setTimeout(() => {
        flyingCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${randomRotate}deg) scale(0.9)`;
        createEnhancedTrailEffect(startX + 40, startY + 60, endX, endY);
    }, 20);
    
    setTimeout(() => {
        if (flyingCard && flyingCard.parentNode) {
            flyingCard.remove();
        }
    }, 450);
}

showLoadingScreen();
updateLoadingProgress(10, 'Подключение к серверу...');

function initGameUI() {
    console.log('initGameUI started');
    
    const urlParams = new URLSearchParams(window.location.search);
    const lobbyId = urlParams.get('lobbyId');
    
    if (!lobbyId) {
        console.error('Нет lobbyId в URL!');
        const savedLobbyId = sessionStorage.getItem('currentLobbyId');
        if (savedLobbyId) {
            console.log('Найден lobbyId в sessionStorage, перенаправляем...');
            window.location.href = `/game.html?lobbyId=${savedLobbyId}`;
            return;
        }
        updateLoadingProgress(100, 'Ошибка: игра не найдена');
        setTimeout(() => {
            window.location.href = '/lobby.html';
        }, 2000);
        return;
    }
    
    playerName = sessionStorage.getItem('playerName');
    console.log('Player name from session:', playerName);
    console.log('LobbyId from URL:', lobbyId);
    
    currentLobbyId = lobbyId;
    sessionStorage.setItem('currentLobbyId', lobbyId);
    
    if (!playerName) {
        console.error('Нет имени игрока!');
        updateLoadingProgress(100, 'Ошибка: игрок не определен');
        setTimeout(() => {
            window.location.href = '/lobby.html';
        }, 2000);
        return;
    }
    
    updateLoadingProgress(20, 'Загрузка модулей...');
    
    if (typeof io === 'undefined') {
        console.error('socket.io не загружен!');
        const script = document.createElement('script');
        script.src = '/socket.io/socket.io.js';
        script.onload = () => {
            console.log('socket.io загружен динамически');
            initGameUI();
        };
        script.onerror = () => {
            updateLoadingProgress(100, 'Ошибка загрузки socket.io');
            setTimeout(() => window.location.href = '/lobby.html', 2000);
        };
        document.head.appendChild(script);
        return;
    }
    
    updateLoadingProgress(30, 'Подключение к игровому серверу...');
    
    window.addEventListener('beforeunload', () => {
        console.log('Страница закрывается');
    });
    
    if (socket && socket.connected) {
        console.log('Сокет уже подключен');
        socket.currentLobby = currentLobbyId;
        socket.currentUsername = playerName;
        updateLoadingProgress(40, 'Восстановление соединения...');
        
        socket.emit('reconnectToGame', {
            username: playerName,
            lobbyId: currentLobbyId
        });
        
        requestGameState();
        return;
    }
    
    socket = io({
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
    });
    
    socket.on('connect', () => {
        console.log('✅ Socket connected in gameUI, id:', socket.id);
        
        socket.currentLobby = currentLobbyId;
        socket.currentUsername = playerName;
        
        gameReady = true;
        updateLoadingProgress(40, 'Соединение установлено. Ожидание игры...');
        
        if (typeof window.initGameChat === 'function') {
            console.log('🎮 Инициализация игрового чата для', playerName);
            window.initGameChat(socket, playerName);
        } else {
            console.error('❌ window.initGameChat не найдена!');
        }
        
        console.log('🔄 Отправка запроса на переподключение к игре...');
        socket.emit('reconnectToGame', {
            username: playerName,
            lobbyId: currentLobbyId
        });
        
        requestGameState();
    });
    
    socket.on('gameStarted', (data) => {
        console.log('🎮 Получен сигнал gameStarted, lobbyId:', data.lobbyId);
        if (data.winTarget) winTarget = data.winTarget;
        currentLobbyId = data.lobbyId;
        sessionStorage.setItem('currentLobbyId', data.lobbyId);
        socket.currentLobby = data.lobbyId;
        
        if (data.tournamentScores) {
            tournamentScores = data.tournamentScores;
            updateTournamentDisplay();
        }
        
        updateLoadingProgress(60, 'Игра запущена! Ожидание раздачи...');
    });
    
    socket.on('dealAnimation', (data) => {
        console.log('🎴 Получена команда на анимацию раздачи:', data);
        hideLoadingScreen();
        startDealingAnimation(data);
    });
    
    socket.on('gameState', (state) => {
        console.log('📦 Game state received!', state);
        hideLoadingScreen();
        updateGameState(state);
    });
    
    socket.on('tournamentScoresUpdate', (data) => {
        if (data.winTarget) winTarget = data.winTarget;
        console.log('📊 Обновление очков:', data);
        
        tournamentScores = data.scores;
        updateTournamentDisplay();
        
        const statusBar = document.getElementById('statusBar');
        if (statusBar && data.roundWinner && !statusBar.hasAttribute('data-temp-message')) {
            if (data.roundWinner === playerName) {
                statusBar.innerHTML = `🏆 ВЫ ВЫИГРАЛИ РАУНД! 🏆<br><span style="font-size:12px">+1 очко! Ждите новый раунд...</span>`;
            } else if (data.loser === playerName) {
                statusBar.innerHTML = `💀 ВЫ ПРОИГРАЛИ РАУНД 💀<br><span style="font-size:12px">Ждите новый раунд...</span>`;
            } else {
                statusBar.innerHTML = `📊 Раунд выиграл: ${data.roundWinner}<br><span style="font-size:12px">Ждите новый раунд...</span>`;
            }
            statusBar.style.background = 'rgba(212, 175, 55, 0.9)';
            statusBar.style.color = '#1a0f08';
            statusBar.style.borderLeft = '6px solid #ffd700';
        }
    });
    
    socket.on('roundOver', (data) => {
        console.log('🏁 Раунд окончен:', data);
        
        const statusBar = document.getElementById('statusBar');
        if (statusBar && !statusBar.hasAttribute('data-temp-message')) {
            if (data.allWinners && data.allWinners.includes(playerName)) {
                if (data.roundWinner === playerName) {
                    statusBar.innerHTML = `🏆 ВЫ ПОБЕДИЛИ В РАУНДЕ! 🏆<br><span style="font-size:12px">Вы первым сбросили все карты!</span>`;
                } else {
                    statusBar.innerHTML = `✅ ВЫ СБРОСИЛИ ВСЕ КАРТЫ! ✅<br><span style="font-size:12px">Ожидание окончания раунда...</span>`;
                }
            } else {
                if (data.loser === playerName) {
                    statusBar.innerHTML = `💀 ВЫ ОСТАЛИСЬ ДУРАКОМ 💀<br><span style="font-size:12px">У вас остались карты на руках</span>`;
                } else {
                    statusBar.innerHTML = `📊 Раунд завершен. Победитель: ${data.roundWinner}<br><span style="font-size:12px">Ожидание нового раунда...</span>`;
                }
            }
            statusBar.style.background = 'linear-gradient(135deg, #d4af37, #b8860b)';
            statusBar.style.color = '#1a0f08';
            statusBar.style.borderLeft = '6px solid #ffd700';
            statusBar.style.fontWeight = 'bold';
            statusBar.style.fontSize = '16px';
            statusBar.style.padding = '15px 28px';
        }
    });
    
    socket.on('takeCardsAnimation', (data) => {
        console.log('🎬 Получена анимация взятия карт:', data);
        
        const statusBar = document.getElementById('statusBar');
        
        if (statusBar && data.takenBy !== playerName) {
            const tempMessage = `📥 ${data.takenBy} забирает ${data.cardCount} карт со стола!`;
            
            if (!statusBar.hasAttribute('data-temp-message')) {
                statusBar.setAttribute('data-original-html', statusBar.innerHTML);
                statusBar.setAttribute('data-original-bg', statusBar.style.background);
                statusBar.setAttribute('data-temp-message', 'true');
                
                statusBar.innerHTML = tempMessage;
                statusBar.style.background = 'rgba(212, 175, 55, 0.3)';
                
                setTimeout(() => {
                    if (statusBar && statusBar.hasAttribute('data-temp-message')) {
                        const originalHtml = statusBar.getAttribute('data-original-html');
                        const originalBg = statusBar.getAttribute('data-original-bg');
                        
                        if (originalHtml) statusBar.innerHTML = originalHtml;
                        if (originalBg) statusBar.style.background = originalBg;
                        else statusBar.style.background = '';
                        
                        statusBar.removeAttribute('data-temp-message');
                        statusBar.removeAttribute('data-original-html');
                        statusBar.removeAttribute('data-original-bg');
                        
                        forceUpdateStatusBar();
                    }
                }, 2000);
            }
        }
        
        if (currentGameState && currentGameState.table && currentGameState.table.length > 0) {
            animateTakeCards(currentGameState.table, data.takenBy);
        } else {
            const tableZone = document.getElementById('tableZone');
            if (tableZone) {
                const cards = tableZone.querySelectorAll('.card-pair');
                if (cards.length > 0) {
                    animateTakeCards([], data.takenBy);
                }
            }
        }
    });
    
    socket.on('cardAnimation', (data) => {
        console.log('🎬 Получена анимация карты от сервера:', data);
        
        if (data.playerUsername === playerName) {
            console.log('⏩ Пропускаем анимацию для себя (уже обработана локально)');
            return;
        }
        
        animateCardFromPlayerToTable(data);
    });
    
    socket.on('sultanDeclared', (data) => {
        console.log('👑 СУЛТАН ОБЪЯВЛЕН!', data);
        
        const statusBar = document.getElementById('statusBar');
        if (statusBar && !statusBar.hasAttribute('data-temp-message')) {
            if (data.sultan === playerName) {
                statusBar.innerHTML = `👑 ВЫ СТАЛИ СУЛТАНОМ! 👑<br><span style="font-size:14px">Поздравляем с победой!</span>`;
            } else {
                statusBar.innerHTML = `👑 ${data.sultan} СТАЛ СУЛТАНОМ! 👑<br><span style="font-size:14px">Игра окончена</span>`;
            }
            statusBar.style.background = 'linear-gradient(135deg, #ffd700, #ff8c00)';
            statusBar.style.color = '#1a0f08';
            statusBar.style.borderLeft = '6px solid #fff';
            statusBar.style.fontSize = '18px';
            statusBar.style.padding = '20px 30px';
        }
        
        updateTournamentDisplay();
        
        setTimeout(() => {
            window.location.href = '/lobby.html';
        }, 5000);
    });
    
    socket.on('gameOver', (data) => {
        console.log('🏁 Game over:', data);
        let message = '';
        const isWinner = data.isWinner || (data.winner && data.winner.includes(playerName));
        
        if (data.disconnectedPlayer) {
            message = `Игра прервана!\nИгрок ${data.disconnectedPlayer} отключился.`;
        } else if (isWinner) {
            message = `🏆 ПОБЕДА! 🏆\n${data.winner}`;
        } else if (data.winner === 'Ничья - все победители!') {
            message = `🤝 НИЧЬЯ! 🤝\n${data.winner}`;
        } else {
            message = `😢 Вы проиграли!\nПобедитель: ${data.winner}`;
        }
        
        const statusBar = document.getElementById('statusBar');
        if (statusBar) {
            statusBar.innerHTML = message.replace(/\n/g, '<br>');
            statusBar.style.background = 'linear-gradient(135deg, #d4af37, #b8860b)';
            statusBar.style.color = '#1a0f08';
        }
        
        setTimeout(() => {
            window.location.href = '/lobby.html';
        }, 3000);
    });
    
    socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
        hideLoadingScreen();
        const statusBar = document.getElementById('statusBar');
        if (statusBar) {
            statusBar.innerHTML = `⚠️ ${error}`;
            statusBar.style.background = 'rgba(139, 0, 0, 0.9)';
        }
    });
    
    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected. Reason:', reason);
        gameReady = false;
        const statusBar = document.getElementById('statusBar');
        if (statusBar && !statusBar.hasAttribute('data-temp-message')) {
            statusBar.innerHTML = '⚠️ Потеря соединения. Переподключение...';
            statusBar.style.background = 'rgba(139, 0, 0, 0.7)';
        }
    });
    
    socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Переподключение успешно (попытка ' + attemptNumber + ')');
        gameReady = true;
        
        const statusBar = document.getElementById('statusBar');
        if (statusBar && !statusBar.hasAttribute('data-temp-message')) {
            statusBar.innerHTML = '✅ Соединение восстановлено!';
            statusBar.style.background = 'rgba(10, 6, 4, 0.92)';
        }
        
        socket.currentLobby = currentLobbyId;
        socket.currentUsername = playerName;
        
        socket.emit('reconnectToGame', {
            username: playerName,
            lobbyId: currentLobbyId
        });
        
        requestGameState();
    });

    socket.on('consecutiveUpdate', (consecutiveInfo) => {
        console.log('🔥 Обновление информации о сериях побед:', consecutiveInfo);
        window.consecutiveInfo = consecutiveInfo;
        updateTournamentDisplay();
    });
    
    function requestGameState() {
        stateRequestCount = 0;
        
        const doRequest = () => {
            if (currentGameState && currentGameState.myHand && currentGameState.myHand.length > 0) {
                console.log('✅ Состояние уже получено');
                return;
            }
            
            if (socket && socket.connected) {
                socket.emit('requestGameState', { 
                    username: playerName, 
                    lobbyId: currentLobbyId 
                });
                stateRequestCount++;
                
                updateLoadingProgress(40 + stateRequestCount * 3, `Поиск игры... (попытка ${stateRequestCount})`);
                
                if (stateRequestCount < 15) {
                    setTimeout(doRequest, 1500);
                } else {
                    updateLoadingProgress(100, 'Игра не найдена. Возврат в лобби...');
                    
                    socket.emit('reconnectToLobby', {
                        username: playerName,
                        lobbyId: currentLobbyId
                    });
                    
                    setTimeout(() => {
                        window.location.href = '/lobby.html';
                    }, 2000);
                }
            }
        };
        
        setTimeout(doRequest, 1000);
    }
}

// ================== ТУРНИРНЫЙ ДИСПЛЕЙ ==================
function updateTournamentDisplay() {
    const oldDisplay = document.getElementById('tournamentDisplay');
    if (oldDisplay) oldDisplay.remove();
    
    if (!tournamentScores || Object.keys(tournamentScores).length === 0) return;
    
    const display = document.createElement('div');
    display.id = 'tournamentDisplay';
    display.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(10, 6, 4, 0.95);
        backdrop-filter: blur(12px);
        border: 2px solid #d4af37;
        border-radius: 20px;
        padding: 15px 20px;
        z-index: 800;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
        min-width: 260px;
    `;
    
    const target = winTarget || 3;
    const consecutiveInfo = window.consecutiveInfo || {};
    
    let html = `
        <div style="color: #d4af37; font-size: 16px; margin-bottom: 10px; font-weight: bold; letter-spacing: 1px; text-align: center;">
            👑 ТУРНИРНАЯ ТАБЛИЦА
        </div>
    `;
    
    for (const [username, score] of Object.entries(tournamentScores)) {
        const isMe = username === playerName;
        const consecutive = consecutiveInfo[username] || 0;
        
        html += `
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                margin: 5px 0;
                background: ${isMe ? 'rgba(212, 175, 55, 0.15)' : 'rgba(30, 20, 12, 0.9)'};
                border-radius: 12px;
                border: 2px solid ${consecutive >= 2 ? '#ff6600' : (consecutive >= 1 ? '#d4af37' : 'rgba(212, 175, 55, 0.3)')};
                transition: all 0.3s ease;
            ">
                <div style="display: flex; flex-direction: column;">
                    <span style="color: ${isMe ? '#d4af37' : '#faf4e0'}; font-size: 14px; font-weight: ${isMe ? 'bold' : 'normal'};">
                        ${isMe ? '👉 ' : ''}${escapeHtml(username)}
                    </span>
                    ${consecutive > 0 ? `<span style="font-size: 10px; color: ${consecutive >= 2 ? '#ff8800' : '#ffaa44'}; margin-top: 2px;">🔥 Серия: ${consecutive} 🔥</span>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="
                        color: ${consecutive >= 2 ? '#ff6600' : '#faf4e0'};
                        font-size: 18px;
                        font-weight: bold;
                        background: ${consecutive >= 1 ? 'rgba(255, 102, 0, 0.3)' : 'transparent'};
                        padding: 2px 10px;
                        border-radius: 20px;
                    ">
                        ${'⬤'.repeat(Math.min(score, target))}${score < target ? '○'.repeat(target - score) : ''}
                    </span>
                    ${consecutive >= 2 ? '<span style="font-size: 18px;">👑</span>' : ''}
                </div>
            </div>
        `;
    }
    
    if (currentGameState && currentGameState.totalPot) {
        html += `
            <div style="
                margin-top: 12px;
                padding: 10px;
                background: linear-gradient(135deg, #2a1f12, #1a1208);
                border-radius: 12px;
                text-align: center;
                border: 1px solid #d4af37;
            ">
                <span style="color: #d4af37; font-size: 12px;">💰 ПРИЗОВОЙ БАНК</span>
                <div style="color: #ffd700; font-size: 20px; font-weight: bold;">${currentGameState.totalPot.toLocaleString()}</div>
                <span style="color: #c9af7b; font-size: 10px;">кранов</span>
            </div>
        `;
    }
    
    display.innerHTML = html;
    document.body.appendChild(display);
}

// ================== АНИМАЦИЯ РАЗДАЧИ ==================
function startDealingAnimation(data) {
    if (dealingInProgress) return;
    dealingInProgress = true;
    
    const { players, dealerIndex: dealer, cardsPerPlayer = 12 } = data;
    dealerIndex = dealer;
    currentCardsPerPlayer = cardsPerPlayer;
    
    const dealerName = players[dealerIndex]?.username || 'Случайный игрок';
    
    console.log('🎴 Запуск анимации раздачи. Дилер:', dealerName);
    
    const tableZone = document.getElementById('tableZone');
    const myHandEl = document.getElementById('myHand');
    const playerTop = document.getElementById('playerTop');
    const playerRight = document.getElementById('playerRight');
    
    if (tableZone) tableZone.innerHTML = '';
    if (myHandEl) myHandEl.innerHTML = '';
    
    if (players.length === 2) {
        if (playerRight) playerRight.style.display = 'none';
        const opponent = players.find(p => p.username !== playerName);
        if (playerTop && opponent) {
            playerTop.innerHTML = `
                <div class="badge-info">
                    <div class="player-name">${escapeHtml(opponent.username)}</div>
                    <div class="player-cards">🎴 0 карт</div>
                </div>
            `;
        }
    } else {
        if (playerRight) playerRight.style.display = 'flex';
        const topPlayer = players.find((_, i) => i !== dealerIndex && i === (dealerIndex + 1) % 3);
        const rightPlayer = players.find((_, i) => i !== dealerIndex && i === (dealerIndex + 2) % 3);
        if (playerTop && topPlayer) {
            playerTop.innerHTML = `
                <div class="badge-info">
                    <div class="player-name">${escapeHtml(topPlayer.username)}</div>
                    <div class="player-cards">🎴 0 карт</div>
                </div>
            `;
        }
        if (playerRight && rightPlayer) {
            playerRight.innerHTML = `
                <div class="badge-info">
                    <div class="player-name">${escapeHtml(rightPlayer.username)}</div>
                    <div class="player-cards">🎴 0 карт</div>
                </div>
            `;
        }
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'dealAnimationOverlay';
    overlay.className = 'deal-overlay';
    overlay.innerHTML = `
        <div class="deal-container">
            <div class="dealer-info">
                <span class="dealer-label">🎩 Дилер:</span>
                <span class="dealer-name">${escapeHtml(dealerName)}</span>
            </div>
            <div class="deck-wrapper" id="deckWrapper">
                <div class="deck-stack" id="deckStack">
                    ${Array(36).fill(0).map((_, i) => `
                        <div class="deck-card-animated" style="z-index: ${36 - i}; transform: translateY(${-i * 0.3}px) translateX(${i * 0.5}px);">
                            <div class="card-back-pattern">
                                <img src="/back.png" 
                                     alt="Карта" 
                                     class="card-back-image"
                                     onerror="this.style.display='none'; this.parentElement.classList.add('card-back-fallback');" />
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="deck-glow"></div>
            </div>
            <div class="deal-instruction" id="dealInstruction">
                ${playerName === dealerName 
                    ? '👆 НАЖМИТЕ НА КОЛОДУ ДЛЯ РАЗДАЧИ' 
                    : `⏳ Ожидание раздачи от ${dealerName}...`}
            </div>
        </div>
    `;
    
    if (!document.getElementById('dealAnimStyles')) {
        const style = document.createElement('style');
        style.id = 'dealAnimStyles';
        style.textContent = `
            .deal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                z-index: 5000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.5s ease;
            }
            .deal-container { text-align: center; }
            .dealer-info {
                margin-bottom: 30px;
                color: #faf4e0;
                font-family: 'Oswald', sans-serif;
                font-size: 24px;
                letter-spacing: 2px;
                text-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
            }
            .dealer-name {
                color: #d4af37;
                font-weight: bold;
                font-size: 28px;
                text-shadow: 0 0 30px rgba(212, 175, 55, 0.8);
            }
            .deck-wrapper {
                position: relative;
                display: inline-block;
                transition: transform 0.3s ease;
            }
            .deck-wrapper.clickable {
                cursor: pointer;
                animation: glowPulse 2s ease-in-out infinite;
            }
            .deck-wrapper.clickable:hover { transform: scale(1.05); }
            .deck-wrapper.clickable:hover .deck-glow { opacity: 1; }
            .deck-stack {
                position: relative;
                width: 160px;
                height: 224px;
                margin: 0 auto;
            }
            .deck-card-animated {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 14px;
                transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            .card-back-pattern {
                width: 100%;
                height: 100%;
                border-radius: 14px;
                border: 2px solid #d4af37;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(212, 175, 55, 0.4);
                overflow: hidden;
                position: relative;
                background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%);
            }
            .card-back-pattern.card-back-fallback::after {
                content: "🂠";
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 60px;
                color: rgba(212, 175, 55, 0.6);
                text-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            }
            .card-back-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 14px;
                display: block;
            }
            .deck-glow {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 220px;
                height: 300px;
                background: radial-gradient(ellipse, rgba(212, 175, 55, 0.25) 0%, transparent 70%);
                border-radius: 50%;
                opacity: 0;
                transition: opacity 0.5s ease;
                pointer-events: none;
            }
            .deal-instruction {
                margin-top: 35px;
                color: #d4af37;
                font-family: 'Oswald', sans-serif;
                font-size: 22px;
                letter-spacing: 2px;
                text-shadow: 0 0 20px rgba(212, 175, 55, 0.6);
                animation: pulse 2s ease-in-out infinite;
            }
            @keyframes dealCardFly {
                0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                80% { opacity: 0.7; }
                100% { transform: translate(var(--fly-x), var(--fly-y)) rotate(var(--fly-rot)) scale(0.7); opacity: 0; }
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes glowPulse {
                0%, 100% { filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.3)); }
                50% { filter: drop-shadow(0 0 45px rgba(212, 175, 55, 0.7)); }
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(1.05); }
            }
            @keyframes particleBurst {
                0% { transform: translate(0, 0) scale(1); opacity: 1; }
                100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(overlay);
    animationOverlay = overlay;
    
    const deckWrapper = document.getElementById('deckWrapper');
    const isDealer = playerName === dealerName;
    
    if (isDealer) {
        deckWrapper.classList.add('clickable');
        deckWrapper.addEventListener('click', () => {
            handleDeckClick(players, dealerIndex, overlay, cardsPerPlayer);
        });
    } else {
        deckWrapper.style.opacity = '0.7';
        deckWrapper.style.pointerEvents = 'none';
    }
    
    socket.once('startDealingAnimation', () => {
        animateCardDistribution(players, dealerIndex, overlay, cardsPerPlayer);
    });
}

function handleDeckClick(players, dealerIndex, overlay, cardsPerPlayer) {
    const deckWrapper = document.getElementById('deckWrapper');
    if (deckWrapper) {
        deckWrapper.classList.remove('clickable');
        deckWrapper.style.pointerEvents = 'none';
    }
    socket.emit('startDealingAnimation', { lobbyId: currentLobbyId });
    animateCardDistribution(players, dealerIndex, overlay, cardsPerPlayer);
}

function animateCardDistribution(players, dealerIndex, overlay, cardsPerPlayer) {
    console.log('🃏 Запуск анимации раздачи карт');
    
    const instruction = document.getElementById('dealInstruction');
    if (instruction) {
        instruction.textContent = '🃏 РАЗДАЧА КАРТ...';
        instruction.style.animation = 'none';
        instruction.style.opacity = '0.8';
    }
    
    const playersCount = players.length;
    const deckStack = document.getElementById('deckStack');
    const deckCards = deckStack.querySelectorAll('.deck-card-animated');
    const deckCenterX = window.innerWidth / 2;
    const deckCenterY = window.innerHeight / 2;
    
    let targetPositions = [];
    
    if (playersCount === 2) {
        const bottomPos = { x: window.innerWidth / 2, y: window.innerHeight - 180 };
        const topPos = { x: window.innerWidth / 2, y: 130 };
        const myIndex = players.findIndex(p => p.username === playerName);
        if (myIndex === 0) {
            targetPositions[0] = bottomPos;
            targetPositions[1] = topPos;
        } else {
            targetPositions[0] = topPos;
            targetPositions[1] = bottomPos;
        }
    } else {
        const positions = [
            { x: window.innerWidth / 2, y: window.innerHeight - 180 },
            { x: window.innerWidth / 2, y: 130 },
            { x: window.innerWidth - 180, y: window.innerHeight / 2 }
        ];
        const otherIndices = [0, 1, 2].filter(i => i !== dealerIndex);
        targetPositions[dealerIndex] = positions[0];
        if (otherIndices.length >= 1) targetPositions[otherIndices[0]] = positions[1];
        if (otherIndices.length >= 2) targetPositions[otherIndices[1]] = positions[2];
    }
    
    const totalCardsToDeal = cardsPerPlayer * playersCount;
    
    deckCards.forEach((card, index) => {
        if (index >= totalCardsToDeal) {
            card.style.display = 'none';
            return;
        }
        const playerIndex = Math.floor(index / cardsPerPlayer) % playersCount;
        const target = targetPositions[playerIndex];
        if (!target) return;
        
        setTimeout(() => {
            const spreadX = (Math.random() * 60 - 30);
            const spreadY = (Math.random() * 60 - 30);
            const flyX = target.x - deckCenterX + spreadX;
            const flyY = target.y - deckCenterY + spreadY;
            const flyRot = Math.random() * 40 - 20;
            
            card.style.setProperty('--fly-x', `${flyX}px`);
            card.style.setProperty('--fly-y', `${flyY}px`);
            card.style.setProperty('--fly-rot', `${flyRot}deg`);
            card.style.animation = `dealCardFly 0.6s ease-in forwards`;
            card.style.animationDelay = `${index * 15}ms`;
            
            if (index % 3 === 0) {
                setTimeout(() => {
                    createDealParticles(target.x, target.y);
                }, 400 + index * 5);
            }
        }, index * 20);
    });
    
    setTimeout(() => {
        finishDealingAnimation(overlay);
    }, totalCardsToDeal * 20 + 1500);
}

function createDealParticles(x, y) {
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 6px;
            height: 6px;
            background: radial-gradient(circle, #ffd700, #d4af37);
            border-radius: 50%;
            pointer-events: none;
            z-index: 6000;
            box-shadow: 0 0 10px rgba(212, 175, 55, 0.8);
        `;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 60 + 20;
        particle.style.setProperty('--px', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--py', `${Math.sin(angle) * distance}px`);
        particle.style.animation = 'particleBurst 0.5s ease-out forwards';
        
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 500);
    }
}

function finishDealingAnimation(overlay) {
    console.log('✨ Анимация раздачи завершена');
    overlay.style.transition = 'opacity 0.5s ease';
    overlay.style.opacity = '0';
    setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
        dealingInProgress = false;
        animationOverlay = null;
        if (currentGameState && currentGameState.myHand && currentGameState.myHand.length > 0) {
            updateGameStateDisplay(currentGameState);
        }
    }, 500);
}

// ================== ОТОБРАЖЕНИЕ ИГРЫ ==================
function updateGameState(state) {
    if (!state) return;
    
    hideLoadingScreen();
    currentGameState = state;
    
    if (dealingInProgress) {
        console.log('Анимация раздачи еще идет, карты скрыты');
        if (state.players) {
            renderPlayersInfo(state.players, state.currentAttacker, state.currentDefender);
        }
        forceUpdateStatusBar();
        return;
    }
    
    updateGameStateDisplay(state);
}

function updateGameStateDisplay(state) {
    console.log('🎴 Отображение карт игрока');
    
    isActionInProgress = false;
    if (actionTimeout) {
        clearTimeout(actionTimeout);
        actionTimeout = null;
    }
    
    isMyAttackTurn = state.isMyTurnAttack;
    isMyDefendTurn = state.isMyTurnDefend;
    isMyAdditionalAttackTurn = state.isMyAdditionalAttackTurn || false;
    myHand = state.myHand || [];
    tableCards = state.table || [];
    
    window.gameWinner = state.gameWinner;
    
    currentGameState = state;
    forceUpdateStatusBar();
    
    renderTable(state.table);
    renderMyHand(state.myHand, state);
    renderPlayersInfo(state.players, state.currentAttacker, state.currentDefender);
    renderActionButtons(state);
}

function renderPlayersInfo(players, attacker, defender) {
    const playerTop = document.getElementById('playerTop');
    const playerRight = document.getElementById('playerRight');
    
    if (!playerTop || !playerRight) return;
    
    const reordered = reorderPlayersForMe(players, playerName);
    
    if (players.length === 2) {
        playerRight.style.display = 'none';
    } else {
        playerRight.style.display = 'flex';
    }
    
    const playerOnTop = reordered.find(p => p.visualPosition === 1);
    const playerOnRight = reordered.find(p => p.visualPosition === 2);
    
    if (playerOnTop) {
        let roleHtml = '';
        let winnerClass = '';
        if (playerOnTop.username === attacker) roleHtml = '<div class="role-badge attacker">⚔️ АТАКУЕТ</div>';
        if (playerOnTop.username === defender) roleHtml = '<div class="role-badge defender">🛡️ ОТБИВАЕТСЯ</div>';
        if (playerOnTop.cardCount === 0) winnerClass = 'player-winner';
        
        playerTop.innerHTML = `
            <div class="badge-info">
                <div class="player-name ${winnerClass}">${escapeHtml(playerOnTop.username)}</div>
                <div class="player-cards">🎴 ${playerOnTop.cardCount} карт</div>
                ${roleHtml}
            </div>
        `;
    }
    
    if (playerOnRight && players.length === 3) {
        let roleHtml = '';
        let winnerClass = '';
        if (playerOnRight.username === attacker) roleHtml = '<div class="role-badge attacker">⚔️ АТАКУЕТ</div>';
        if (playerOnRight.username === defender) roleHtml = '<div class="role-badge defender">🛡️ ОТБИВАЕТСЯ</div>';
        if (playerOnRight.cardCount === 0) winnerClass = 'player-winner';
        
        playerRight.innerHTML = `
            <div class="badge-info">
                <div class="player-name ${winnerClass}">${escapeHtml(playerOnRight.username)}</div>
                <div class="player-cards">🎴 ${playerOnRight.cardCount} карт</div>
                ${roleHtml}
            </div>
        `;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ================== ФУНКЦИЯ ОТРИСОВКИ КАРТ ==================
function createCardImage(card, className, onClickHandler = null, cardIndex = null) {
    const div = document.createElement('div');
    
    const suitMap = {
        'hearts': '♥',
        'diamonds': '♦',
        'clubs': '♣',
        'spades': '♠'
    };
    
    const rankMap = {
        '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
        'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
    };
    
    const suitSymbol = suitMap[card.suit] || '♦';
    const rankValue = rankMap[card.rank] || card.rank;
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const valueColor = isRed ? '#ff0000' : '#000000';
    
    div.className = `card ${className} ${card.suit}`;
    div.innerHTML = `
        <div class="card-value" style="color: ${valueColor};">${rankValue}</div>
        <div class="card-suit" style="color: ${valueColor};">${suitSymbol}</div>
        <div class="card-value" style="color: ${valueColor};">${rankValue}</div>
        <div class="card-suit" style="color: ${valueColor};">${suitSymbol}</div>
    `;
    
    if (className === 'my-card') {
        div.draggable = true;
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragend', handleDragEnd);
        
        div.style.cursor = 'pointer';
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            if (wasDragged) {
                console.log('🚫 Клик проигнорирован (было перетаскивание)');
                return;
            }
            
            if (isActionInProgress) {
                console.log('🚫 Клик проигнорирован (действие выполняется)');
                return;
            }
            
            if (!isMyAttackTurn && !isMyDefendTurn && !isMyAdditionalAttackTurn) {
                showActionError('Сейчас не ваш ход');
                return;
            }
            
            console.log('👆 Клик по карте:', cardIndex);
            handleCardAction(cardIndex);
        });
    }
    
    return div;
}

function renderTable(table) {
    const zone = document.getElementById('tableZone');
    if (!zone) return;
    
    zone.innerHTML = '';
    
    if (!table || table.length === 0) {
        zone.innerHTML = `<div class="empty-text" style="text-align:center; background:rgba(0,0,0,0.5); padding:15px 25px; border-radius:60px;">❖ СТОЛ ПУСТ ❖<br>Перетащите карту сюда</div>`;
        return;
    }
    
    const attackCards = table.filter(item => item.type === 'attack');
    const defendCards = table.filter(item => item.type === 'defend');
    
    const container = document.createElement('div');
    container.className = 'table-pairs';
    
    for (let i = 0; i < attackCards.length; i++) {
        const pairDiv = document.createElement('div');
        pairDiv.className = 'card-pair';
        
        const attackDiv = createCardImage(attackCards[i].card, 'attack-card');
        attackDiv.classList.add('card');
        pairDiv.appendChild(attackDiv);
        
        if (defendCards[i]) {
            const defendDiv = createCardImage(defendCards[i].card, 'defend-card');
            defendDiv.classList.add('card');
            pairDiv.appendChild(defendDiv);
        } else {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'card-placeholder';
            emptyDiv.textContent = '?';
            emptyDiv.style.cssText = `
                width: 80px;
                height: 120px;
                background: rgba(0,0,0,0.65);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #d4af37;
                font-size: 32px;
                font-weight: bold;
                position: absolute;
                top: 15px;
                left: 15px;
                border: 1px dashed #d4af37;
                backdrop-filter: blur(4px);
            `;
            pairDiv.appendChild(emptyDiv);
        }
        container.appendChild(pairDiv);
    }
    zone.appendChild(container);
}

// ================== РЕНДЕР РУКИ ==================
function renderMyHand(hand, state) {
    const handEl = document.getElementById('myHand');
    if (!handEl) return;
    handEl.innerHTML = '';
    
    if (hand.length === 0) {
        const playersWithCards = state.players.filter(p => p.cardCount > 0).length;
        const playersWithoutCards = state.players.filter(p => p.cardCount === 0).length;
        
        if (state.isSubRound && playersWithCards === 2 && playersWithoutCards === 1) {
            handEl.innerHTML = '<div style="background:rgba(0,0,0,0.6); padding:15px 30px; border-radius:60px; text-align:center; color:#ff8844; font-size:22px; font-weight:bold;">👀 ВЫ НАБЛЮДАЕТЕ 👀<br><span style="font-size:14px; color:#c9af7b;">Идёт дополнительный раунд между соперниками</span></div>';
        }
        else if (state.isSubRound && playersWithCards === 1 && playersWithoutCards === 2) {
            if (state.gameFrozen) {
                if (state.gameWinner && state.gameWinner.includes(playerName)) {
                    handEl.innerHTML = '<div class="win-message" style="background:rgba(0,0,0,0.6); padding:15px 30px; border-radius:60px; text-align:center; color:#ffd700;">🏆 ВЫ ПОБЕДИТЕЛЬ ДОП.РАУНДА! 🏆<br><span style="font-size:14px; color:#c9af7b;">+1 очко</span></div>';
                } else {
                    handEl.innerHTML = '<div style="background:rgba(0,0,0,0.6); padding:15px 30px; border-radius:60px; text-align:center; color:#ff8844; font-size:22px; font-weight:bold;">👀 ВЫ НАБЛЮДАЕТЕ 👀<br><span style="font-size:14px; color:#c9af7b;">Дополнительный раунд завершён</span></div>';
                }
            } else {
                handEl.innerHTML = '<div style="background:rgba(0,0,0,0.6); padding:15px 30px; border-radius:60px; text-align:center; color:#ff8844; font-size:22px; font-weight:bold;">👀 ВЫ НАБЛЮДАЕТЕ 👀<br><span style="font-size:14px; color:#c9af7b;">Идёт дополнительный раунд</span></div>';
            }
        }
        else if (!state.isSubRound && playersWithCards > 0) {
            handEl.innerHTML = '<div class="win-message" style="background:rgba(0,0,0,0.6); padding:15px 30px; border-radius:60px; text-align:center; color:#ffd700;">🏆 ВЫ ПОБЕДИТЕЛЬ! 🏆<br><span style="font-size:14px; color:#c9af7b;">Наблюдайте за игрой</span></div>';
        }
        else if (playersWithCards === 0) {
            handEl.innerHTML = '<div style="background:rgba(0,0,0,0.6); padding:15px 30px; border-radius:60px; text-align:center; color:#ffd700; font-size:22px; font-weight:bold;">🤝 НИЧЬЯ! 🤝<br><span style="font-size:14px; color:#c9af7b;">Все сбросили карты</span></div>';
        }
        else {
            handEl.innerHTML = '<div style="background:rgba(0,0,0,0.6); padding:15px 30px; border-radius:60px; text-align:center; color:#ff4444; font-size:22px; font-weight:bold;">💀 ВЫ ПРОИГРАЛИ 💀<br><span style="font-size:14px; color:#c9af7b;">Ожидайте следующий раунд</span></div>';
        }
        return;
    }
    
    hand.forEach((card, index) => {
        const cardDiv = createCardImage(card, 'my-card', null, index);
        cardDiv.setAttribute('data-card-index', index);
        
        cardDiv.addEventListener('touchstart', handleTouchStart, { passive: true });
        cardDiv.addEventListener('touchmove', handleTouchMove, { passive: false });
        cardDiv.addEventListener('touchend', handleTouchEnd);
        
        handEl.appendChild(cardDiv);
    });
    
    setupTableDropZone();
}

// ================== DRAG & DROP ==================
function handleDragStart(e) {
    if (isActionInProgress) {
        e.preventDefault();
        return;
    }
    
    const cardElement = e.target.closest('.card');
    if (!cardElement) return;
    
    draggedCardIndex = parseInt(cardElement.getAttribute('data-card-index'));
    draggedElement = cardElement;
    wasDragged = false;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedCardIndex.toString());
    
    setTimeout(() => {
        if (draggedElement) {
            draggedElement.style.opacity = '0.5';
        }
    }, 0);
}

function handleDragEnd(e) {
    if (draggedElement) {
        draggedElement.style.opacity = '1';
    }
    
    if (e.dataTransfer.dropEffect === 'move' && draggedCardIndex !== null) {
        wasDragged = true;
        handleCardAction(draggedCardIndex);
    }
    
    setTimeout(() => {
        draggedCardIndex = null;
        draggedElement = null;
        wasDragged = false;
    }, 200);
}

function setupTableDropZone() {
    const tableZone = document.getElementById('tableZone');
    if (!tableZone) return;
    
    const newTableZone = tableZone.cloneNode(true);
    tableZone.parentNode.replaceChild(newTableZone, tableZone);
    
    newTableZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        newTableZone.classList.add('drop-active');
    });
    
    newTableZone.addEventListener('dragleave', (e) => {
        newTableZone.classList.remove('drop-active');
    });
    
    newTableZone.addEventListener('drop', (e) => {
        e.preventDefault();
        newTableZone.classList.remove('drop-active');
        
        if (draggedCardIndex !== null && !isActionInProgress) {
            wasDragged = true;
            handleCardAction(draggedCardIndex);
        }
        
        setTimeout(() => {
            draggedCardIndex = null;
            wasDragged = false;
        }, 200);
    });
}

// ================== TOUCH ДЛЯ МОБИЛЬНЫХ ==================
function handleTouchStart(e) {
    if (isActionInProgress || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const cardElement = e.target.closest('.card');
    if (!cardElement) return;
    
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchCardIndex = parseInt(cardElement.getAttribute('data-card-index'));
    touchElement = cardElement;
    touchMoved = false;
    wasDragged = false;
}

function handleTouchMove(e) {
    if (touchElement === null || isActionInProgress) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    
    if (!touchMoved && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        touchMoved = true;
        
        touchClone = touchElement.cloneNode(true);
        touchClone.style.position = 'fixed';
        touchClone.style.zIndex = '9999';
        touchClone.style.opacity = '0.9';
        touchClone.style.transform = 'rotate(-5deg) scale(1.1)';
        touchClone.style.pointerEvents = 'none';
        touchClone.style.transition = 'none';
        document.body.appendChild(touchClone);
        
        touchElement.style.opacity = '0.4';
        
        const tableZone = document.getElementById('tableZone');
        if (tableZone) {
            tableZone.classList.add('drop-active');
        }
    }
    
    if (touchMoved && touchClone) {
        touchClone.style.left = (touch.clientX - 44) + 'px';
        touchClone.style.top = (touch.clientY - 61) + 'px';
    }
    
    if (touchMoved) {
        e.preventDefault();
    }
}

function handleTouchEnd(e) {
    if (touchClone) {
        touchClone.remove();
        touchClone = null;
    }
    
    if (touchElement) {
        touchElement.style.opacity = '1';
    }
    
    const tableZone = document.getElementById('tableZone');
    if (tableZone) {
        tableZone.classList.remove('drop-active');
    }
    
    if (touchMoved && touchCardIndex !== null && !isActionInProgress) {
        const touch = e.changedTouches[0];
        const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (dropTarget && (dropTarget.closest('#tableZone') || dropTarget.closest('.main-table'))) {
            wasDragged = true;
            createDropEffect(touch.clientX, touch.clientY);
            handleCardAction(touchCardIndex);
        }
    }
    
    setTimeout(() => {
        touchCardIndex = null;
        touchElement = null;
        touchMoved = false;
        wasDragged = false;
    }, 300);
}

// ================== ЭФФЕКТЫ ==================
function createDropEffect(x, y) {
    const effect = document.createElement('div');
    effect.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 80px;
        height: 80px;
        background: radial-gradient(circle, rgba(212, 175, 55, 0.8), transparent);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 10000;
        animation: dropPulse 0.5s ease-out forwards;
    `;
    
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
}

// ================== ОБРАБОТЧИК ДЕЙСТВИЯ ==================
function handleCardAction(cardIndex) {
    if (isActionInProgress) {
        console.log('⏳ Действие уже выполняется, ожидайте...');
        showActionError('Подождите, действие выполняется...');
        return;
    }
    
    if (cardIndex === null || cardIndex === undefined || cardIndex < 0) {
        console.log('❌ Невалидный индекс карты:', cardIndex);
        return;
    }
    
    const handEl = document.getElementById('myHand');
    const cardElements = handEl ? handEl.querySelectorAll('.my-card') : [];
    const cardElement = cardElements[cardIndex];
    
    if (!cardElement) {
        console.log('❌ Элемент карты не найден');
        return;
    }
    
    if (isMyAttackTurn && !isMyAdditionalAttackTurn) {
        const attackCards = tableCards.filter(t => t.type === 'attack').length;
        const defendCards = tableCards.filter(t => t.type === 'defend').length;
        
        if (attackCards > defendCards) {
            showActionError('Дождитесь отбоя текущей карты');
            return;
        }
    }
    
    const cardRect = cardElement.getBoundingClientRect();
    const cardClone = cardElement.cloneNode(true);
    const cardData = {
        rect: cardRect,
        clone: cardClone,
        element: cardElement,
        index: cardIndex
    };
    
    isActionInProgress = true;
    
    if (actionTimeout) clearTimeout(actionTimeout);
    actionTimeout = setTimeout(() => {
        isActionInProgress = false;
        actionTimeout = null;
        console.log('🔓 Блокировка действий снята по таймауту');
    }, 5000);
    
    let actionType = '';
    let emitData = {};
    
    if (isMyAdditionalAttackTurn) {
        actionType = 'additionalAttack';
        emitData = { cardIndex: cardIndex };
    } else if (isMyAttackTurn) {
        actionType = 'attack';
        emitData = { cardIndex: cardIndex };
    } else if (isMyDefendTurn) {
        actionType = 'defend';
        emitData = { cardIndex: cardIndex };
    } else {
        isActionInProgress = false;
        showActionError('Сейчас не ваш ход');
        return;
    }
    
    console.log(`🎯 Отправка ${actionType}, карта:`, cardIndex);
    
    // Сразу скрываем карту и запускаем анимацию
    cardData.element.style.opacity = '0';
    cardData.element.style.visibility = 'hidden';
    cardData.element.style.pointerEvents = 'none';
    
    // Запускаем анимацию
    animateCardToTableFromData(cardData.rect, cardData.clone, () => {
        // Анимация завершена, теперь отправляем подтверждение на сервер
        console.log('✨ Анимация завершена, отправляем подтверждение на сервер');
        
        socket.emit(actionType, emitData, (result) => {
            console.log(`📡 Результат ${actionType}:`, result);
            
            if (result && !result.success) {
                // Если ошибка - возвращаем карту обратно
                console.log('❌ Ошибка, возвращаем карту');
                showActionError(result?.error || 'Ошибка при выполнении действия');
                cardData.element.style.opacity = '';
                cardData.element.style.visibility = '';
                cardData.element.style.pointerEvents = '';
            }
            
            isActionInProgress = false;
            if (actionTimeout) clearTimeout(actionTimeout);
            if (handEl) handEl.style.pointerEvents = '';
        });
    });
}

function showActionError(message) {
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
        const originalText = statusBar.innerHTML;
        const originalBg = statusBar.style.background;
        
        statusBar.innerHTML = `⚠️ ${message}`;
        statusBar.style.background = 'rgba(139, 0, 0, 0.9)';
        statusBar.style.animation = 'shake 0.5s ease';
        
        setTimeout(() => {
            statusBar.innerHTML = originalText;
            statusBar.style.background = originalBg;
            statusBar.style.animation = '';
        }, 2000);
    }
}

// ================== ФУНКЦИЯ RENDERACTIONBUTTONS ==================
function renderActionButtons(state) {
    let buttonsDiv = document.getElementById('actionButtons');
    
    const table = state.table || [];
    const attackCount = table.filter(t => t.type === 'attack').length;
    const defendCount = table.filter(t => t.type === 'defend').length;
    const allDefended = attackCount === defendCount && attackCount > 0;
    const hasUndefended = attackCount > defendCount;
    
    let showEndTurn = false;
    let showEndAdditional = false;
    let showTakeCards = false;
    
    // Кнопка "Завершить ход" - когда атакует И ВСЕ КАРТЫ ОТБИТЫ
    if (state.isMyTurnAttack && !state.isMyAdditionalAttackTurn && table.length > 0 && allDefended) {
        showEndTurn = true;
    }
    
    // Кнопка "Завершить подкид" - когда подкидывает И ВСЕ КАРТЫ ОТБИТЫ
    if (state.isMyAdditionalAttackTurn && allDefended) {
        showEndAdditional = true;
    }
    
    // Кнопка "Забрать карты" - когда защищается и есть неотбитые карты
    if (state.isMyTurnDefend && hasUndefended) {
        showTakeCards = true;
    }
    
    if (!showEndTurn && !showEndAdditional && !showTakeCards) {
        if (buttonsDiv) {
            buttonsDiv.style.display = 'none';
        }
        return;
    }
    
    if (!buttonsDiv) {
        buttonsDiv = document.createElement('div');
        buttonsDiv.id = 'actionButtons';
        buttonsDiv.className = 'action-buttons';
        document.body.appendChild(buttonsDiv);
    }
    
    buttonsDiv.style.display = 'flex';
    buttonsDiv.innerHTML = '';
    
    if (showEndTurn) {
        const endBtn = document.createElement('button');
        endBtn.className = 'action-btn';
        endBtn.textContent = '✅ ЗАВЕРШИТЬ ХОД';
        endBtn.style.background = 'linear-gradient(135deg, #ff1313, #800000)';
        endBtn.onclick = () => {
            console.log('Нажата кнопка Завершить ход');
            if (socket && socket.connected) {
                endBtn.disabled = true;
                endBtn.style.opacity = '0.5';
                socket.emit('endTurn', {}, (result) => {
                    console.log('Результат endTurn:', result);
                    if (result && !result.success) {
                        showActionError(result.error || 'Ошибка');
                        endBtn.disabled = false;
                        endBtn.style.opacity = '1';
                    } else {
                        endBtn.style.display = 'none';
                    }
                });
            }
        };
        buttonsDiv.appendChild(endBtn);
    }
    
    if (showEndAdditional) {
        const endAddBtn = document.createElement('button');
        endAddBtn.className = 'action-btn';
        endAddBtn.textContent = '✅ ЗАВЕРШИТЬ ПОДКИД';
        endAddBtn.style.background = 'linear-gradient(135deg, #b56a1a, #7a3e0a)';
        endAddBtn.onclick = () => {
            console.log('Нажата кнопка Завершить подкид');
            if (socket && socket.connected) {
                endAddBtn.disabled = true;
                endAddBtn.style.opacity = '0.5';
                socket.emit('endAdditionalAttack', {}, (result) => {
                    console.log('Результат endAdditionalAttack:', result);
                    if (result && !result.success) {
                        showActionError(result.error || 'Ошибка');
                        endAddBtn.disabled = false;
                        endAddBtn.style.opacity = '1';
                    } else {
                        endAddBtn.style.display = 'none';
                    }
                });
            }
        };
        buttonsDiv.appendChild(endAddBtn);
    }
    
    if (showTakeCards) {
        const takeBtn = document.createElement('button');
        takeBtn.className = 'action-btn-take';
        takeBtn.textContent = '📥 ЗАБРАТЬ КАРТЫ';
        takeBtn.onclick = () => {
            console.log('Нажата кнопка Забрать карты');
            if (socket && socket.connected) {
                takeBtn.disabled = true;
                takeBtn.style.opacity = '0.5';
                socket.emit('takeCards', {}, (result) => {
                    if (result && !result.success) {
                        showActionError(result.error || 'Ошибка');
                        takeBtn.disabled = false;
                        takeBtn.style.opacity = '1';
                    } else {
                        takeBtn.style.display = 'none';
                    }
                });
            }
        };
        buttonsDiv.appendChild(takeBtn);
    }
}

function reorderPlayersForMe(players, myUsername) {
    const myIndex = players.findIndex(p => p.username === myUsername);
    if (myIndex === -1) return players;
    
    const totalPlayers = players.length;
    const reordered = [];
       
    for (let i = 0; i < totalPlayers; i++) {
        const idx = (myIndex + i) % totalPlayers;
        reordered.push({
            ...players[idx],
            visualPosition: i
        });
    }
    
    return reordered;
}

function exitGame() {
    if (confirm('Выйти из игры? Вы вернетесь в лобби.')) {
        window.location.href = '/lobby.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализация GameUI (Luxury Casino)');
    initGameUI();
});