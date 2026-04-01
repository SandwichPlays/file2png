import base64
import math
import os
import tempfile
import zlib
import ctypes
import sys

# Linux-specific initialization for multi-threaded GUI and version locking
if sys.platform == 'linux':
    try:
        # Prevent threading deadlocks by initializing X11 threads
        ctypes.CDLL('libX11.so.6').XInitThreads()
        
        # Explicitly lock versions to prevent WebKit/GTK version mismatch hangs
        import gi
        gi.require_version('Gtk', '3.0')
        gi.require_version('Gdk', '3.0')
        gi.require_version('WebKit2', '4.1')
    except Exception as e:
        print(f"[ERROR] Linux Initialization failed: {e}")

import webview
from PIL import Image

class Api:
    def __init__(self):
        self.window = None

    def set_window(self, window):
        self.window = window


    def select_file(self):
        result = self.window.create_file_dialog(webview.FileDialog.OPEN, allow_multiple=False)
        if result and len(result) > 0:
            path = result[0]
            name = os.path.basename(path)
            # In Windows, we need to escape backslashes for JS strings if we evaluate later
            return {'path': path, 'name': name}
        return None

    def set_file_content(self, name, base64_data):
        # Fallback for HTML5 drag and drop
        # base64_data is like 'data:image/png;base64,.....'
        try:
            header, encoded = base64_data.split(",", 1)
            data = base64.b64decode(encoded)
            file_path = os.path.join(tempfile.gettempdir(), name)
            with open(file_path, "wb") as f:
                f.write(data)
            return {'path': file_path, 'name': name}
        except Exception as e:
            return None

    def execute(self, mode, file_path):
        if not file_path or not os.path.exists(file_path):
            return {'success': False, 'message': 'File not found.'}
        
        t_mode = mode
        if mode == 'Auto':
            t_mode = 'Decode' if file_path.lower().endswith('.f2p.png') else 'Encode'
            
        try:
            if t_mode == 'Encode':
                return self.run_encode(file_path)
            else:
                return self.run_decode(file_path)
        except Exception as e:
            return {'success': False, 'message': "Error: " + str(e)}

    def run_encode(self, path):
        filename = os.path.basename(path)
        with open(path, 'rb') as f:
            data = f.read()
            
        compressed = zlib.compress(data, level=6)
        name_bytes = filename.encode('utf-8')
        header = bytearray(b'F2P') + len(name_bytes).to_bytes(1, 'big') + name_bytes + len(data).to_bytes(4, 'big')
        combined = header + compressed
        
        side = math.ceil(math.sqrt(math.ceil(len(combined) / 4)))
        img = Image.new('RGBA', (side, side), (0,0,0,0))
        img.frombytes(combined + bytes((side * side * 4) - len(combined)))
        
        suggested_name = f"{filename}.f2p.png"
        
        # On Linux, use simpler filters to avoid toolkit hangs
        f_types = ('PNG files (*.png)', 'All files (*.*)')
        if sys.platform != 'linux':
             f_types = ('Image Files (*.f2p.png;*.png)', 'All Files (*.*)')
             
        save_result = self.window.create_file_dialog(
            webview.FileDialog.SAVE, 
            save_filename=suggested_name,
            file_types=f_types
        )
        
        if save_result and len(save_result) > 0:
            # save_result could be a string or tuple/list based on OS and version
            save_path = save_result if isinstance(save_result, str) else save_result[0]
            if not save_path.lower().endswith('.f2p.png') and not save_path.lower().endswith('.png'):
                save_path += '.f2p.png'
            img.save(save_path, 'PNG')
            return {'success': True, 'message': 'Encoded successfully.'}
        return {'success': False, 'message': 'Action cancelled.'}

    def run_decode(self, path):
        try:
            img = Image.open(path).convert('RGBA')
            bytes_data = img.tobytes()
            if bytes_data[:3] != b'F2P': 
                return {'success': False, 'message': 'Invalid File 2 PNG file.'}
                
            n_len = bytes_data[3]
            fname = bytes_data[4:4+n_len].decode('utf-8')
            comp = bytes_data[4+n_len+4:]
            dec = zlib.decompress(comp)
            
            save_result = self.window.create_file_dialog(
                webview.FileDialog.SAVE, 
                save_filename=fname
            )
            
            if save_result and len(save_result) > 0:
                save_path = save_result if isinstance(save_result, str) else save_result[0]
                with open(save_path, 'wb') as f:
                    f.write(dec)
                return {'success': True, 'message': 'Decoded successfully.'}
            return {'success': False, 'message': 'Action cancelled.'}
        except Exception as e:
            return {'success': False, 'message': f"Validation Error: {str(e)}"}

if __name__ == '__main__':
    api = Api()
    
    import sys
    if hasattr(sys, '_MEIPASS'):
        current_dir = sys._MEIPASS
    else:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
    html_file = os.path.join(current_dir, 'index.html')
    
    # Launch pywebview window pointing to our new modern UI
    window = webview.create_window(
        'File 2 PNG',
        url=f'file:///{html_file}'.replace('\\', '/'),
        js_api=api,
        width=590,
        height=450,
        resizable=False,
        background_color='#FFFFFF',
        text_select=False
    )
    api.set_window(window)
    
    webview.start()
