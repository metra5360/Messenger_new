// 24 Геометричні фігури / лінії (SVG шляхи) для створення стилю кіберпанк-шифру
const SVG_PATHS = [
    "M 6,12 C 6,8 10,6 12,12 C 14,18 18,16 18,12 C 18,8 14,6 12,12 C 10,18 6,16 6,12 Z", // Вісімка/Петля з фото
    "M 4,4 L 20,20 M 4,20 L 20,4", // Хрест
    "M 12,2 L 22,12 L 12,22 L 2,12 Z", // Ромб
    "M 12,2 A 10,10 0 1,0 12,22 A 10,10 0 1,0 12,2", // Коло
    "M 4,4 H 20 V 20 H 4 Z", // Квадрат
    "M 12,2 L 22,22 H 2 Z", // Трикутник
    "M 3,12 H 21 M 12,3 V 21", // Плюс
    "M 5,5 Q 12,12 19,5 Q 12,19 5,5", // Подвійна дуга
    "M 6,18 V 6 L 18,18 V 6", // Літера N-подібна
    "M 12,2 L 12,22 M 2,12 L 22,12 M 5,5 L 19,19 M 5,19 L 19,5", // Сніжинка
    "M 4,12 Q 12,2 20,12 Q 12,22 4,12", // Око / Лінза
    "M 6,6 H 18 V 12 H 6 V 18 H 18", // Зигзаг Е
    "M 12,3 L 21,9 V 15 L 12,21 L 3,15 V 9 Z", // Гексагон
    "M 4,4 Q 20,4 12,12 Q 20,20 4,20", // Хвиля ліва
    "M 20,4 Q 4,4 12,12 Q 4,20 20,20", // Хвиля права
    "M 6,6 V 18 H 18", // Куточок L
    "M 12,2 C 6,2 6,10 12,12 C 18,14 18,22 12,22", // S-подібна лінія
    "M 4,4 L 12,20 L 20,4", // Стрілка вниз
    "M 4,20 L 12,4 L 20,20", // Стрілка вгору
    "M 6,6 A 6,6 0 0,1 18,6 A 6,6 0 0,1 18,18", // Серп / Підкова
    "M 12,2 V 14 M 8,10 H 16 M 12,14 L 6,20 M 12,14 L 18,20", // Руна / Стріла
    "M 4,4 H 14 L 20,12 L 14,20 H 4 Z", // Тег / Прапорець
    "M 12,6 A 4,4 0 1,1 12,14 A 4,4 0 1,1 12,6 M 12,2 V 6 M 12,14 V 22", // Ключ
    "M 4,8 Q 12,16 20,8" // Дуга посмішки
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ".split(""); // Англійський алфавіт + пробіл

let seedMapping = {}; 
let reverseMapping = {};
let currentInputLetters = []; 

// Псевдовипадковий генератор на основі Seed
function seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Перемішування елементів на основі Seed
function shuffleWithSeed(array, seed) {
    let m = array.length, t, i;
    while (m) {
        i = Math.floor(seededRandom(seed) * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
        seed++;
    }
    return array;
}

// Створення мапінгу "Літера <-> Номер SVG шляху"
function initializeCipher(seedValue) {
    const seed = parseInt(seedValue) || 12345;
    
    // Створюємо індекси для шляхів та перемішуємо їх
    let indices = Array.from({length: SVG_PATHS.length}, (_, i) => i);
    let shuffledIndices = shuffleWithSeed(indices, seed);
    
    seedMapping = {};
    reverseMapping = {};
    
    // Призначаємо кожній літері свій унікальний індекс SVG-графіки
    ALPHABET.forEach((letter, index) => {
        if (letter === " ") {
            seedMapping[letter] = "SPACE"; // Пробіл обробляється окремо
        } else {
            let pathIndex = shuffledIndices[index % shuffledIndices.length];
            seedMapping[letter] = pathIndex;
            reverseMapping[pathIndex] = letter;
        }
    });

    renderKeyboard();
    updateChatViewWithNewCipher();
}

// Рендеринг сітки клавіатури за аналогією до фото (4 рядки по 6 клавіш = 24 клавіші)
function renderKeyboard() {
    const gridEl = document.getElementById('keyboard-grid');
    gridEl.innerHTML = '';
    
    // Відобразимо перші 23 літери на клавіатурі, решта порожні пунктирні
    for (let i = 0; i < 24; i++) {
        const keyEl = document.createElement('div');
        
        if (i < 23) {
            const letter = ALPHABET[i];
            const pathIndex = seedMapping[letter];
            keyEl.className = 'key';
            keyEl.setAttribute('data-letter', letter);
            
            // Вставляємо векторну іконку в клавішу
            keyEl.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path d="${SVG_PATHS[pathIndex]}"></path>
                </svg>
            `;
            
            keyEl.onclick = () => {
                currentInputLetters.push(letter);
                renderPreview();
            };
        } else {
            // Останні клавіші робимо порожніми з пунктиром як на дизайні
            keyEl.className = 'key empty';
            keyEl.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="#222" stroke-width="1.5" stroke-dasharray="3,3"/>
                </svg>
            `;
        }
        
        gridEl.appendChild(keyEl);
    }
}

// Малювання введених символів у полі попереднього перегляду
function renderPreview() {
    const previewEl = document.getElementById('input-preview');
    previewEl.innerHTML = '';
    
    currentInputLetters.forEach(letter => {
        if (letter === " ") {
            const spaceSpan = document.createElement('span');
            spaceSpan.style.width = '14px';
            spaceSpan.style.display = 'inline-block';
            previewEl.appendChild(spaceSpan);
        } else {
            const pathIndex = seedMapping[letter];
            const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svgNode.setAttribute("viewBox", "0 0 24 24");
            svgNode.style.width = "24px";
            svgNode.style.height = "24px";
            svgNode.style.marginRight = "4px";
            
            const pathNode = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathNode.setAttribute("d", SVG_PATHS[pathIndex]);
            pathNode.setAttribute("stroke", "#ffffff");
            pathNode.setAttribute("stroke-width", "1.5");
            pathNode.setAttribute("fill", "none");
            
            svgNode.appendChild(pathNode);
            previewEl.appendChild(svgNode);
        }
    });
}

// Генерація HTML-коду повідомлення для відображення в стрічці чату
function createVisualMessageHTML(rawText) {
    let htmlResult = '<div class="glyph-row" style="display:flex; flex-wrap:wrap; gap:4px;">';
    
    rawText.split("").forEach(letter => {
        let upperL = letter.toUpperCase();
        if (upperL === " ") {
            htmlResult += '<div style="width:12px;"></div>';
        } else if (seedMapping[upperL] !== undefined) {
            let pathIndex = seedMapping[upperL];
            htmlResult += `
                <svg viewBox="0 0 24 24" style="width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:1.8;">
                    <path d="${SVG_PATHS[pathIndex]}"></path>
                </svg>
            `;
        } else {
            htmlResult += `<span style="font-size:14px;">${letter}</span>`;
        }
    });
    
    htmlResult += '</div>';
    return htmlResult;
}

// Оновлення відображення повідомлень при зміні ключа шифрування
function updateChatViewWithNewCipher() {
    const messages = document.querySelectorAll('.message:not(.system)');
    messages.forEach(msg => {
        const rawPayload = msg.getAttribute('data-raw');
        if (rawPayload) {
            const glyphContainer = msg.querySelector('.glyph-text');
            glyphContainer.innerHTML = createVisualMessageHTML(rawPayload);
        }
    });
}

// Обробка системних подій інтерфейсу
document.getElementById('btn-sync').onclick = () => {
    const val = document.getElementById('secret-seed').value;
    if(!val.trim()) return;
    initializeCipher(val);
    
    const chatScreen = document.getElementById('chat-screen');
    const sysMsg = document.createElement('div');
    sysMsg.className = 'message system';
    sysMsg.innerText = `Матриця успішно перебудована під ключ: ${val}`;
    chatScreen.appendChild(sysMsg);
    chatScreen.scrollTop = chatScreen.scrollHeight;
};

document.getElementById('btn-backspace').onclick = () => {
    currentInputLetters.pop();
    renderPreview();
};

document.getElementById('btn-space').onclick = () => {
    currentInputLetters.push(" ");
    renderPreview();
};

// Відправка та симуляція відповідей чату
document.getElementById('btn-send').onclick = () => {
    if (currentInputLetters.length === 0) return;
    
    const rawText = currentInputLetters.join("");
    const chatScreen = document.getElementById('chat-screen');
    
    // Створюємо власне вихідне повідомлення
    const msgEl = document.createElement('div');
    msgEl.className = 'message outgoing';
    msgEl.setAttribute('data-raw', rawText);
    msgEl.innerHTML = `
        <div class="glyph-text">${createVisualMessageHTML(rawText)}</div>
        <div class="debug-raw">RAW DATA: ${rawText}</div>
    `;
    
    chatScreen.appendChild(msgEl);
    
    // Очищення полів
    currentInputLetters = [];
    renderPreview();
    chatScreen.scrollTop = chatScreen.scrollHeight;
    
    // Автоматична симуляція відповіді від другого пристрою через 2 секунди
    setTimeout(() => {
        simulateIncomingMessage();
    }, 2000);
};

function simulateIncomingMessage() {
    const mockResponses = ["OK", "HELLO", "CIPHER DONE", "MEET ME AT NIGHT", "SAFE CHANNEL"];
    const randomRaw = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    const chatScreen = document.getElementById('chat-screen');
    
    const msgEl = document.createElement('div');
    msgEl.className = 'message incoming';
    msgEl.setAttribute('data-raw', randomRaw);
    msgEl.innerHTML = `
        <div class="glyph-text">${createVisualMessageHTML(randomRaw)}</div>
        <div class="debug-raw">RAW DATA: ${randomRaw}</div>
    `;
    
    chatScreen.appendChild(msgEl);
    chatScreen.scrollTop = chatScreen.scrollHeight;
}

// Модалка "Поділитися"
document.getElementById('btn-share').onclick = () => {
    const currentSeed = document.getElementById('secret-seed').value || "12345";
    document.getElementById('share-seed-value').innerText = currentSeed;
    document.getElementById('share-modal').classList.add('active');
};

document.getElementById('btn-close-modal').onclick = () => {
    document.getElementById('share-modal').classList.remove('active');
};

// Початкова генерація при завантаженні сторінки
initializeCipher(12345);
