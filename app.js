// === НАЛАШТУВАННЯ SUPABASE ===
const SUPABASE_URL = "ТВІЙ_SUPABASE_URL"; 
const SUPABASE_KEY = "ТВІЙ_SUPABASE_KEY"; 

let supabase = null;

// БЕЗПЕЧНА ПЕРЕВІРКА: додаток не зламається, навіть якщо ключів немає
if (SUPABASE_URL !== "ТВІЙ_SUPABASE_URL" && SUPABASE_KEY !== "ТВІЙ_SUPABASE_KEY") {
    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("Supabase успішно підключено!");
        } else {
            console.warn("Бібліотека Supabase не завантажилась з CDN.");
        }
    } catch (e) {
        console.error("Помилка ініціалізації Supabase:", e);
    }
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
let userGlyphs = {}; 
let isDesignMode = false;
let currentLetterToEdit = null;
let currentInputLetters = [];
let currentTheme = "dark"; 

let username = "Anonymous";
let roomID = "000";

// ВИПРАВЛЕНО: Кнопка тепер точно спрацює за будь-яких умов!
document.getElementById('btn-login').onclick = () => {
    const userIn = document.getElementById('input-username').value.trim();
    const roomIn = document.getElementById('input-room').value.trim();
    
    if (!userIn || !roomIn) {
        alert("Будь ласка, введіть Нікнейм та Ключ Кімнати!");
        return;
    }
    
    username = userIn;
    roomID = roomIn;
    
    document.getElementById('meta-user').innerText = username;
    document.getElementById('meta-room').innerText = roomID;
    document.getElementById('auth-screen').classList.add('hidden');
    
    if (supabase) {
        document.getElementById('sync-status').innerText = "ONLINE // ROOM SYNC";
        loadExistingGlyphs(); 
        listenToIncomingData(); 
    } else {
        document.getElementById('sync-status').innerText = "OFFLINE // LOCAL DEMO";
    }
};

// === ДАЛІ ЙДЕ ТВІЙ КОД ІНІЦІАЛІЗАЦІЇ CANVAS ЯК І РАНІШЕ ===
// const canvas = document.getElementById('paint-canvas'); ...
// Ініціалізація Canvas
const canvas = document.getElementById('paint-canvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;

function updateCanvasBrushColor() {
    ctx.strokeStyle = currentTheme === "dark" ? '#ffffff' : '#000000';
}
updateCanvasBrushColor();
ctx.lineWidth = 5;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

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

document.getElementById('btn-clear-canvas').onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

// Збереження гліфа
document.getElementById('btn-save-canvas').onclick = async () => {
    const imageData = canvas.toDataURL('image/png');
    userGlyphs[currentLetterToEdit] = imageData;
    document.getElementById('drawing-popup').classList.remove('active');
    
    renderKeyboard();
    renderPreview();

    if (supabase) {
        try {
            await supabase.from('glyphs').insert([
                { room_id: roomID, user_name: username, letter: currentLetterToEdit, image_base64: imageData }
            ]);
        } catch (err) {
            console.error("Помилка відправки гліфа в базу:", err);
        }
    }
};

// Завантаження гліфів з бази
async function loadExistingGlyphs() {
    const { data, error } = await supabase
        .from('glyphs')
        .select('*')
        .eq('room_id', roomID);
        
    if (data && !error) {
        data.forEach(item => {
            userGlyphs[item.letter] = item.image_base64;
        });
        renderKeyboard();
    }
}

// Прослуховування бази в реальному часі
function listenToIncomingData() {
    // Стрім нових гліфів
    supabase
        .channel('glyphs-room-stream')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'glyphs', filter: `room_id=eq.${roomID}` }, (payload) => {
            const incoming = payload.new;
            if (incoming.user_name !== username) { 
                userGlyphs[incoming.letter] = incoming.image_base64;
                renderKeyboard();
                renderPreview();
            }
        })
        .subscribe();

    // Стрім повідомлень
    supabase
        .channel('messages-room-stream')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomID}` }, (payload) => {
            const msg = payload.new;
            if (msg.user_name !== username) {
                displayIncomingMessage(msg.user_name, msg.payload_text);
            }
        })
        .subscribe();
}

// Генерація кнопок
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
                updateCanvasBrushColor(); 
                document.getElementById('drawing-popup').classList.add('active');
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
            preview.innerHTML += `<span style="font-size:11px; opacity:0.5; margin:0 2px;">[${letter}]</span>`;
        }
    });
}

// Зміна теми
document.getElementById('btn-theme-toggle').onclick = () => {
    const container = document.querySelector('.app-container');
    const themeBtn = document.getElementById('btn-theme-toggle');
    
    if (currentTheme === "dark") {
        currentTheme = "light";
        container.setAttribute('data-theme', 'light');
        themeBtn.innerText = "🌙";
    } else {
        currentTheme = "dark";
        container.removeAttribute('data-theme');
        themeBtn.innerText = "☀️";
    }
    updateCanvasBrushColor();
    renderKeyboard();
    renderPreview();
};

// Перемикач DESIGN MODE
document.getElementById('btn-design-toggle').onclick = () => {
    isDesignMode = !isDesignMode;
    const btn = document.getElementById('btn-design-toggle');
    const statusText = document.getElementById('status-text');
    
    if (isDesignMode) {
        btn.classList.add('active');
        statusText.innerText = 'ON';
    } else {
        btn.classList.remove('active');
        statusText.innerText = 'OFF';
    }
};

document.getElementById('btn-space').onclick = () => { currentInputLetters.push(" "); renderPreview(); };
document.getElementById('btn-backspace').onclick = () => { currentInputLetters.pop(); renderPreview(); };

// Відправка
document.getElementById('btn-send').onclick = async () => {
    if (currentInputLetters.length === 0) return;
    
    const rawText = currentInputLetters.join("");
    displayOutgoingMessage(rawText);
    
    if (supabase) {
        try {
            await supabase.from('messages').insert([
                { room_id: roomID, user_name: username, payload_text: rawText }
            ]);
        } catch (e) {
            console.error("Помилка надсилання тексту:", e);
        }
    }
    
    currentInputLetters = [];
    renderPreview();
};

function displayOutgoingMessage(text) {
    const chatScreen = document.getElementById('chat-screen');
    let msgHTML = `<span class="msg-meta">${username} (ТИ):</span><div class="glyph-container">`;
    text.split("").forEach(letter => {
        if (letter === " ") msgHTML += '<div style="width:12px;"></div>';
        else if (userGlyphs[letter]) msgHTML += `<img src="${userGlyphs[letter]}" class="glyph-img">`;
        else msgHTML += `<span style="font-size:11px; opacity:0.5;">[${letter}]</span>`;
    });
    msgHTML += '</div>';
    
    const msgEl = document.createElement('div');
    msgEl.className = 'message outgoing';
    msgEl.innerHTML = msgHTML;
    chatScreen.appendChild(msgEl);
    chatScreen.scrollTop = chatScreen.scrollHeight;
}

function displayIncomingMessage(sender, text) {
    const chatScreen = document.getElementById('chat-screen');
    let msgHTML = `<span class="msg-meta">${sender}:</span><div class="glyph-container">`;
    text.split("").forEach(letter => {
        if (letter === " ") msgHTML += '<div style="width:12px;"></div>';
        else if (userGlyphs[letter]) msgHTML += `<img src="${userGlyphs[letter]}" class="glyph-img">`;
        else msgHTML += `<span style="font-size:11px; opacity:0.5;">[${letter}]</span>`;
    });
    msgHTML += '</div>';
    
    const msgEl = document.createElement('div');
    msgEl.className = 'message incoming';
    msgEl.innerHTML = msgHTML;
    chatScreen.appendChild(msgEl);
    chatScreen.scrollTop = chatScreen.scrollHeight;
}

renderKeyboard();
