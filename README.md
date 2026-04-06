# 🖼️ File 2 PNG (f2p) - Turbo Web Edition

**File 2 PNG** is a minimal desktop application designed for lossless file-to-png conversion. It allows you to transform any file—be it a document, archive, or executable—into a valid PNG image and back again with absolute data integrity.
**Try it out!:**

> [!IMPORTANT]
> This version uses a custom, manual PNG encoding engine implemented in a **Web Worker** to handle large files (100MB+) without crashing or slowing down the UI.

## ✨ Features

- **🚀 Stable Large-File Support**: Process 100MB+ files smoothly thanks to background worker threading.
- **📦 Bit-Perfect Manual Engine**: A custom PNG construction engine (IHDR, IDAT, IEND) that bypasses the lossy HTML5 Canvas API.
- **🎨 Apple-Inspired Aesthetic**: A clean, minimalist interface using the SF Pro font family.
- **🌙 System Theme Detection**: Automatically defaults to your device's Light or Dark mode.
- **鼠标 🖱️ Drag & Drop**: Simple file handling—just drag a file into the window to get started.
- **⚡ Fully Offline & Private**: No data ever leaves your computer. Everything happens locally via `fflate`.

## 🛠️ How it Works

1.  **Header**: The app attaches a custom binary header (`F2P`) containing the original filename and original/compressed size metadata.
2.  **Compression**: Raw data is compressed using the DEFLATE algorithm (Zlib) via `fflate`.
3.  **Pixel Mapping**: Each 4 bytes of compressed data are mapped to one RGBA pixel (Red, Green, Blue, Alpha).
4.  **PNG Container**: The engine manually assembles the PNG chunks to ensure zero data corruption from browser "optimizations."

## 🚀 Getting Started

Simply open `index.html` in any modern web browser. 

### Project Structure
- `index.html`: The main entry point (structure).
- `style.css`: Modern, responsive styling.
- `script.js`: UI logic and Worker orchestration.
- `worker.js`: The high-performance conversion engine.
- `lib/fflate.js`: High-speed compression dependency.

## 📄 License
This project is open-source and free to use.

---
Built with ❤️ for data integrity.
