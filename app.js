const SUPABASE_URL = ""; 
const SUPABASE_KEY = ""; 

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
let userGlyphs = {}; // Малюнки користувача: {'A': 'base64_data', ...}
let isDesignMode = false;
let currentLetterToEdit = null;
let currentInputLetters = [];

// Елементи Canvas
const canvas = document.getElementById('paint-canvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;

ctx.strokeStyle = '#ffffff'; 
ctx.lineWidth = 4;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Логіка малювання на полотні
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

// Збереження малюнку у клітинку
document.getElementById('btn-save-canvas').onclick = () => {
    const imageData = canvas.toDataURL('image/png');
    userGlyphs[currentLetterToEdit] = imageData;
    
    document.getElementById('drawing-popup').classList.remove('active');
    renderKeyboard();
};

// Створення 26 порожніх клітинок при старті
function renderKeyboard() {
    const grid = document.getElementById('keyboard-grid');
    grid.innerHTML = '';
    
    ALPHABET.forEach(letter => {
        const key = document.createElement('div');
        key.className = 'key';
        
        if (userGlyphs[letter]) {
            key.classList.add('has-drawing');
            key.innerHTML = `<img src="${userGlyphs[letter]}">`;
        } else {
            // Клітинка залишається порожньою (стилі пунктиру додаються через CSS)
            key.innerHTML = ''; 
        }
        
        // Маленька мітка літери в кутку для орієнтиру
        key.innerHTML += `<span class="key-label">${letter}</span>`;
        
        // Клік по клітинці
        key.onclick = () => {
            if (isDesignMode) {
                // Якщо режим проектування — відкриваємо полотно малювання
                currentLetterToEdit = letter;
                document.getElementById('target-letter').innerText = letter;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                document.getElementById('drawing-popup').classList.add('active');
            } else {
                // Якщо звичайний режим — вводимо символ
                currentInputLetters.push(letter);
                renderPreview();
            }
        };
        
        grid.appendChild(key);
    });
}

function renderPreview() {
    const preview = document.getElementById('input-preview');
    preview.innerHTML = '';
    currentInputLetters.forEach(letter => {
        if (userGlyphs[letter]) {
            preview.innerHTML += `<img src="${userGlyphs[letter]}" class="glyph-img">`;
        } else {
            preview.innerHTML += `<span style="font-size:12px; color:#444; margin:0 2px;">[${letter}]</span>`;
        }
    });
}

// Тумблер DESIGN ON / DESIGN OFF
document.getElementById('btn-design-toggle').onclick = () => {
    isDesignMode = !isDesignMode;
    const btn = document.getElementById('btn-design-toggle');
    const statusText = document.getElementById('status-text');
    const container = document.querySelector('.app-container');
    
    if (isDesignMode) {
        btn.classList.add('active');
        statusText.innerText = 'ON';
        container.classList.add('design-mode-on');
    } else {
        btn.classList.remove('active');
        statusText.innerText = 'OFF';
        container.classList.remove('design-mode-on');
    }
};

// Дії з введенням
document.getElementById('btn-space').onclick = () => {
    currentInputLetters.push(" ");
    renderPreview();
};

document.getElementById('btn-backspace').onclick = () => {
    currentInputLetters.pop();
    renderPreview();
};

// Надсилання повідомлення
document.getElementById('btn-send').onclick = async () => {
    if (currentInputLetters.length === 0) return;
    
    const chatScreen = document.getElementById('chat-screen');
    const rawText = currentInputLetters.join("");
    
    let msgHTML = '<div class="glyph-container">';
    currentInputLetters.forEach(letter => {
        if (letter === " ") msgHTML += '<div style="width:10px;"></div>';
        else if (userGlyphs[letter]) msgHTML += `<img src="${userGlyphs[letter]}" class="glyph-img">`;
        else msgHTML += `<span style="color:gray;">?</span>`;
    });
    msgHTML += '</div>';
    
    const msgEl = document.createElement('div');
    msgEl.className = 'message outgoing';
    msgEl.innerHTML = msgHTML;
    chatScreen.appendChild(msgEl);
    
    if (supabase) {
        await supabase.from('messages').insert([{ payload: rawText, glyphs_pack: userGlyphs }]);
    } else {
        // Ехо-відповідь для локальних тестів
        setTimeout(() => {
            const replyEl = document.createElement('div');
            replyEl.className = 'message incoming';
            replyEl.innerHTML = `<small style="display:block;color:#555;font-size:9px;margin-bottom:4px;">Вхідне повідомлення:</small>${msgHTML}`;
            chatScreen.appendChild(replyEl);
            chatScreen.scrollTop = chatScreen.scrollHeight;
        }, 1000);
    }
    
    currentInputLetters = [];
    renderPreview();
    chatScreen.scrollTop = chatScreen.scrollHeight;
};

// Зчитування онлайн повідомлень
if (supabase) {
    supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: 'INSERT', pattern: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new;
            const chatScreen = document.getElementById('chat-screen');
            const foreignGlyphs = newMsg.glyphs_pack || {};
            
            let incomingHTML = '<div class="glyph-container">';
            newMsg.payload.split("").forEach(letter => {
                if (letter === " ") incomingHTML += '<div style="width:10px;"></div>';
                else if (foreignGlyphs[letter]) incomingHTML += `<img src="${foreignGlyphs[letter]}" class="glyph-img">`;
                else incomingHTML += `<span>${letter}</span>`;
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

// Запуск порожньої клавіатури
renderKeyboard();
