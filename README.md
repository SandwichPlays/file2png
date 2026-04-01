# 🖼️ File 2 PNG (f2p)

**File 2 PNG** is a minimal desktop application designed for lossless file-to-png conversion. It allows you to transform any file—be it a document, archive, or executable—into a valid PNG image and back again with absolute data integrity.

![File 2 PNG Header](https://raw.githubusercontent.com/SandwichPlays/file2png/main/favicon.ico)

## ✨ Features

- **🚀 Lossless Conversion**: 100% data integrity using byte-perfect mapping to RGBA channels.
- **📦 Smart Compression**: Integrated Zlib (level 6) compression to keep your PNG-encapsulated files as small as possible.
- **🎨 Modern minimal UI**: A clean interface built for focus and ease of use.
- **🌙 Native light/dark Mode**: Full support for both light and dark themes
- **🖱️ Drag & Drop**: Simple file handling, just drag a file into the window to get started.
- **⚡ Fast Processing**: Efficient Python backend powered by `pywebview` and `Pillow`.

## 🛠️ How it Works

1.  **Header**: The app attaches a custom binary header (`F2P`) containing the original filename and size metadata.
2.  **Compression**: The raw data is compressed using the DEFLATE algorithm (Zlib).
3.  **Pixel Mapping**: Each 4 bytes of compressed data are mapped to one RGBA pixel (Red, Green, Blue, Alpha).
4.  **PNG Container**: The resulting pixel grid is saved as a standard PNG image. Because PNG is a lossless format, your data remains perfectly preserved.

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- [Pillow](https://python-pillow.org/)
- [pywebview](https://pywebview.flowrl.com/)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/SandwichPlays/file2png.git
    cd file2png
    ```

2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

3.  Run the application:
    ```bash
    python main.py
    ```

## 📦 Building from Source

To create a standalone executable for your operating system, use [PyInstaller](https://pyinstaller.org/):

```bash
pip install pyinstaller
pyinstaller main.spec
```

The resulting executable will be found in the `dist/` folder.

## 🐧 Linux Troubleshooting

If the application fails to start on Linux, ensure you have the necessary GTK and WebKit libraries installed:

```bash
# Ubuntu/Debian
sudo apt-get install python3-gi gir1.2-gtk-3.0 gir1.2-webkit2-4.0
```

If you see a `ModuleNotFoundError: No module named 'gi'` error, it means the system's GObject Introspection bindings are missing or the bundled version is incompatible with your system's libraries.