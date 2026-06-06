// НАЛАШТУВАННЯ SUPABASE (Залиш порожніми лапки для роботи в автономному демо-режимі)
const SUPABASE_URL = ""; 
const SUPABASE_KEY = ""; 

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
let userGlyphs = {}; 
let isDesignMode = false;
let currentLetterToEdit = null;
let currentInputLetters = [];

// Налаштування Canvas для малювання
const canvas = document.getElementById('paint-canvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;

ctx.strokeStyle = '#ffffff'; 
ctx.lineWidth = 5;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Функції відстеження малювання
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

canvas.addEventListener('touchstart', (e) => { startDrawing(e.touches[0]); e.preventDefault(); });
canvas.addEventListener('touchmove', (e) => { draw(e.touches[0]); e.preventDefault(); });
canvas.addEventListener('touchend', stopDrawing);

function startDrawing(e) {
    isDrawing = true;
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
}

function stopDrawing() { isDrawing = false; }

document.getElementById('btn-clear-canvas').onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// Збереження малюнку гліфа
document.getElementById('btn-save-canvas').onclick = () => {
    const imageData = canvas.toDataURL('image/png');
    userGlyphs[currentLetterToEdit] = imageData;
    
    document.getElementById('drawing-popup').classList.remove('active');
    document.getElementById('drawing-popup').setAttribute('aria-hidden', 'true');
    renderKeyboard();
};

// Генерація 26 клітинок матриці
function renderKeyboard() {
    const grid = document.getElementById('keyboard-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    ALPHABET.forEach(letter => {
        const key = document.createElement('div');
        key.className = 'key';
        
        if (userGlyphs[letter]) {
            key.classList.add('has-drawing');
            key.innerHTML = `<img src="${userGlyphs[letter]}" alt="${letter}">`;
        }
        
        key.innerHTML += `<span class="key-label">${letter}</span>`;
        
        key.onclick = () => {
            if (isDesignMode) {
                currentLetterToEdit = letter;
                document.getElementById('target-letter').innerText = letter;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const popup = document.getElementById('drawing-popup');
                popup.classList.add('active');
                popup.setAttribute('aria-hidden', 'false');
            } else {
                currentInputLetters.push(letter);
                renderPreview();
            }
        };
        
        grid.appendChild(key);
    });
}

function renderPreview() {
    const preview = document.getElementById('input-preview');
    if (!preview) return;
    preview.innerHTML = '';
    
    currentInputLetters.forEach(letter => {
        if (letter === " ") {
            preview.innerHTML += '<span style="width:12px; display:inline-block;"></span>';
        } else if (userGlyphs[letter]) {
            preview.innerHTML += `<img src="${userGlyphs[letter]}" class="glyph-img">`;
        } else {
            preview.innerHTML += `<span style="font-size:11px; color:#555; margin:0 2px;">[${letter}]</span>`;
        }
    });
}

// Перемикач DESIGN MODE
document.getElementById('btn-design-toggle').onclick = () => {
    isDesignMode = !isDesignMode;
    const btn = document.getElementById('btn-design-toggle');
    const statusText = document.getElementById('status-text');
    const container = document.querySelector('.app-container');
    
    if (isDesignMode) {
        btn.classList.add('active');
        statusText.innerText = 'ON';
        if (container) container.classList.add('design-mode-on');
    } else {
        btn.classList.remove('active');
        statusText.innerText = 'OFF';
        if (container) container.classList.remove('design-mode-on');
    }
};

// Пробіл та Backspace
document.getElementById('btn-space').onclick = () => {
    currentInputLetters.push(" ");
    renderPreview();
};

document.getElementById('btn-backspace').onclick = () => {
    currentInputLetters.pop();
    renderPreview();
};

// Надсилання пакету в чат
document.getElementById('btn-send').onclick = async () => {
    if (currentInputLetters.length === 0) return;
    
    const chatScreen = document.getElementById('chat-screen');
    const rawText = currentInputLetters.join("");
    
    let msgHTML = '<div class="glyph-container">';
    currentInputLetters.forEach(letter => {
        if (letter === " ") {
            msgHTML += '<div style="width:12px;"></div>';
        } else if (userGlyphs[letter]) {
            msgHTML += `<img src="${userGlyphs[letter]}" class="glyph-img">`;
        } else {
            msgHTML += `<span style="color:#444; font-size:11px;">[${letter}]</span>`;
        }
    });
    msgHTML += '</div>';
    
    const msgEl = document.createElement('div');
    msgEl.className = 'message outgoing';
    msgEl.innerHTML = msgHTML;
    chatScreen.appendChild(msgEl);
    
    if (supabase) {
        try {
            await supabase.from('messages').insert([{ payload: rawText, glyphs_pack: userGlyphs }]);
        } catch (e) {
            console.error("Помилка бази даних:", e);
        }
    } else {
        // Симуляція ехо-відповіді для автономного тестування
        setTimeout(() => {
            const replyEl = document.createElement('div');
            replyEl.className = 'message incoming';
            replyEl.innerHTML = `<small style="display:block; color:#555; font-size:9px; margin-bottom:4px;">ВХІДНИЙ ПАКЕТ:</small>${msgHTML}`;
            chatScreen.appendChild(replyEl);
            chatScreen.scrollTop = chatScreen.scrollHeight;
        }, 1000);
    }
    
    currentInputLetters = [];
    renderPreview();
    chatScreen.scrollTop = chatScreen.scrollHeight;
};

// Слухач Supabase
if (supabase) {
    supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: 'INSERT', pattern: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new;
            const chatScreen = document.getElementById('chat-screen');
            const foreignGlyphs = newMsg.glyphs_pack || {};
            
            let incomingHTML = '<div class="glyph-container">';
            newMsg.payload.split("").forEach(letter => {
                if (letter === " ") incomingHTML += '<div style="width:12px;"></div>';
                else if (foreignGlyphs[letter]) incomingHTML += `<img src="${foreignGlyphs[letter]}" class="glyph-img">`;
                else incomingHTML += `<span style="color:#555;">[${letter}]</span>`;
            });
            incomingHTML += '</div>';
            
            const msgEl = document.createElement('div');
            msgEl.className = 'message incoming';
            msgEl.innerHTML = incomingHTML;
            chatScreen.appendChild(msgEl);
            chatScreen.scrollTop = chatScreen.scrollHeight;
        })
        .subscribe();
}

// Старт
renderKeyboard();
