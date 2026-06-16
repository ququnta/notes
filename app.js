let translations = {};
let notecnt = 0;
let db;
let saveTimeout;

async function loadLanguage(lang) {
    try {
        const script = document.createElement('script');
        script.src = `lang-${lang}.js`;
        
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        
        if (window.LANG_DATA) {
            translations = { ...window.LANG_DATA };
            applyTranslations();
            localStorage.setItem('lang', lang);
            delete window.LANG_DATA;
        }
        script.remove(); // Clean up script tag after execution
    } catch (e) {
        console.error('Error loading language:', e);
    }
}

function applyTranslations() {
    const titleEl = document.getElementById('main-title');
    if (titleEl) titleEl.textContent = translations.title;
    document.querySelectorAll('.deleter').forEach(el => el.textContent = translations.deleteBtn);
    document.title = translations.title;
}

function initDB() {
    let request = indexedDB.open('NotesDB', 1);

    request.onerror = function() {
        console.error('oops, db error');
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        loadNotes();
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains('notes')) {
            db.createObjectStore('notes', { keyPath: 'id' });
        }
    };
}

function saveNote(id, text) {
    if (!db) return;
    let transaction = db.transaction(['notes'], 'readwrite');
    let store = transaction.objectStore('notes');
    store.put({ id: id, text: text });
}

function debouncedSave(id, text) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveNote(id, text), 500);
}

function loadNotes() {
    if (!db) return;

    let transaction = db.transaction(['notes'], 'readonly');
    let store = transaction.objectStore('notes');
    let request = store.getAll();

    request.onsuccess = function(event) {
        let notes = event.target.result;
        notes.forEach(function(noteData) {
            notecnt = Math.max(notecnt, parseInt(noteData.id.replace('note', '')) || 0);
            createNoteElement(noteData.id, noteData.text);
        });
    };
}

function createNoteElement(id, text, isNew = false) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note';
    noteDiv.id = id;

    const tape = document.createElement('div');
    tape.className = 'tape';

    const textContainer = document.createElement('div');
    textContainer.className = 'text';
    
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.oninput = function() {
        auto_grow(this);
        debouncedSave(id, this.value);
    };
    
    textContainer.appendChild(textarea);

    const line = document.createElement('div');
    line.className = 'line';

    const bg = document.createElement('div');
    bg.className = 'bg';

    const deleteBtnSpan = document.createElement('span');
    deleteBtnSpan.className = 'button delete';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'deleter';
    deleteBtn.textContent = translations.deleteBtn || 'Delete';
    deleteBtn.onclick = () => delnote(id);
    
    deleteBtnSpan.appendChild(deleteBtn);

    noteDiv.append(tape, textContainer, line, bg, deleteBtnSpan);
    
    const notesGb = document.getElementById('notes');
    notesGb.appendChild(noteDiv);
    
    auto_grow(textarea);
}

function auto_grow(element) {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight) + "px";
}

function newnote() {
    notecnt = notecnt + 1;
    let noteid = 'note' + notecnt;
    createNoteElement(noteid, translations.defaultText || '');
    saveNote(noteid, translations.defaultText || '');
}

function delnote(noteidentifier) {
    const el = document.getElementById(noteidentifier);
    if (el) el.remove();
    
    if (db) {
        let transaction = db.transaction(['notes'], 'readwrite');
        let store = transaction.objectStore('notes');
        store.delete(noteidentifier);
    }
}

window.onload = async function() {
    let lang = localStorage.getItem('lang') || 'ru';
    await loadLanguage(lang);
    initDB();
};
