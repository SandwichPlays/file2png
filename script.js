const dropZone = document.getElementById('drop-zone');
const hint = document.getElementById('drop-hint');
const fileNameLabel = document.getElementById('file-name');
const btnAuto = document.getElementById('btn-auto');
const btnEncode = document.getElementById('btn-encode');
const btnDecode = document.getElementById('btn-decode');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressInfo = document.getElementById('progress-info');
const resultsContainer = document.getElementById('results-container');
const btnDownload = document.getElementById('btn-download');
const downloadNameLabel = document.getElementById('download-name');
const fileInput = document.getElementById('file-input');

let currentFile = null;
let lastResult = null;

// Initialize Web Worker
const worker = new Worker('worker.js');

worker.onerror = function (err) {
    console.error("Worker Error:", err);
    setLoading(false);
    showToast("Worker Crashed: " + err.message);
};

worker.onmessage = function (e) {
    const msg = e.data;
    if (msg.type === 'progress') {
        updateProgress(msg.percent, msg.status);
    }
    else if (msg.type === 'result') {
        setLoading(false);
        lastResult = {
            blob: new Blob([msg.pngBuffer || msg.data]),
            name: msg.fileName
        };

        // Show download button
        downloadNameLabel.textContent = msg.fileName;
        resultsContainer.style.display = 'block';
        showToast("Process successful");
    }
    else if (msg.type === 'error') {
        setLoading(false);
        showToast("Error: " + msg.message);
    }
    else if (msg.type === 'pong') {
        console.log("Worker is alive!");
    }
};

btnDownload.onclick = () => {
    if (lastResult) {
        download(lastResult.blob, lastResult.name);
    }
};

// Ping the worker
worker.postMessage({ type: 'ping' });

function updateProgress(percent, status) {
    progressBar.style.width = percent + '%';
    progressInfo.textContent = `${status} ${percent}%`;
}

async function execute(mode) {
    if (!currentFile) return;

    let t_mode = mode;
    if (mode === 'Auto') {
        t_mode = currentFile.name.toLowerCase().endsWith('.f2p.png') ? 'Decode' : 'Encode';
    }

    setLoading(true);
    updateProgress(0, 'Reading file...');

    worker.postMessage({
        type: t_mode,
        file: currentFile
    });
}

// Theme Logic
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');
    if (theme === 'dark') {
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    } else {
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
    }
}

function selectFile() {
    fileInput.click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) setFile(file);
}

function setFile(file) {
    currentFile = file;
    fileNameLabel.textContent = file.name;
    hint.textContent = "Ready to process";
    hint.style.color = "var(--accent)";
    btnAuto.disabled = false;
    btnEncode.disabled = false;
    btnDecode.disabled = false;
    btnAuto.classList.add('active');
}

function resetUI() {
    currentFile = null;
    lastResult = null;
    fileNameLabel.textContent = "None selected";
    fileNameLabel.style.color = "var(--text-muted)";
    hint.textContent = "Click or drop a file";
    hint.style.color = "var(--text-main)";

    btnAuto.disabled = true;
    btnEncode.disabled = true;
    btnDecode.disabled = true;
    btnAuto.classList.remove('active');
    fileInput.value = '';
    resultsContainer.style.display = 'none';
}

function setLoading(loading) {
    btnAuto.disabled = loading;
    btnEncode.disabled = loading;
    btnDecode.disabled = loading;
    if (loading) {
        progressContainer.style.display = 'block';
        resultsContainer.style.display = 'none';
    } else {
        progressContainer.style.display = 'none';
    }
}

async function download(blob, name) {
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: name,
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Save Picker failed:', err);
        }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
}

let toastTimeout;
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) setFile(e.dataTransfer.files[0]);
});

// Init Theme
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.body.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);
