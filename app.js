const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
let userGlyphs = {}; 
let isDesignMode = false;
let currentLetterToEdit = null;
let currentInputLetters = [];
let currentTheme = "dark"; 

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

// Події малювання
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

document.getElementById('btn-save-canvas').onclick = () => {
    const imageData = canvas.toDataURL('image/png');
    userGlyphs[currentLetterToEdit] = imageData;
    document.getElementById('drawing-popup').classList.remove('active');
    renderKeyboard();
    renderPreview();
};

// Генерація клавіатури
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

// НАДІЙНИЙ ПЕРЕМИКАЧ ТЕМИ
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
    renderKeyboard();  // Оновлюємо картинки під нову тему
    renderPreview();   // Оновлюємо прев'ю під нову тему
};

// Перемикач DESIGN
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

document.getElementById('btn-space').onclick = () => {
    currentInputLetters.push(" ");
    renderPreview();
};

document.getElementById('btn-backspace').onclick = () => {
    currentInputLetters.pop();
    renderPreview();
};

document.getElementById('btn-send').onclick = () => {
    if (currentInputLetters.length === 0) return;
    
    const chatScreen = document.getElementById('chat-screen');
    let msgHTML = '<div class="glyph-container">';
    currentInputLetters.forEach(letter => {
        if (letter === " ") msgHTML += '<div style="width:12px;"></div>';
        else if (userGlyphs[letter]) msgHTML += `<img src="${userGlyphs[letter]}" class="glyph-img">`;
        else msgHTML += `<span style="font-size:11px; opacity:0.5;">[${letter}]</span>`;
    });
    msgHTML += '</div>';
    
    const msgEl = document.createElement('div');
    msgEl.className = 'message outgoing';
    msgEl.innerHTML = msgHTML;
    chatScreen.appendChild(msgEl);
    
    currentInputLetters = [];
    renderPreview();
    chatScreen.scrollTop = chatScreen.scrollHeight;
};

renderKeyboard();
