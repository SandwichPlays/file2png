# -*- mode: python ; coding: utf-8 -*-
import sys

hidden_imports = []
if sys.platform == 'linux':
    hidden_imports = [
        'gi', 
        'gi.repository.Gtk', 
        'gi.repository.Gdk', 
        'gi.repository.WebKit2', 
        'gi.repository.Gio',
        'webview.platforms.gtk'
    ]


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[('index.html', '.'), ('fonts', 'fonts'), ('favicon.ico', '.')],
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='File2PNG',
    icon='favicon.ico',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
