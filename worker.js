// worker.js
const DEBUG = true;

function logWorker(...args) {
    if (DEBUG) console.log("[Worker]", ...args);
}

// CRC32 Table for PNG Chunks
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
}

function crc32(buf, existingCrc = -1) {
    let crc = existingCrc;
    for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    }
    return crc;
}

function finalizeCrc(crc) {
    return (crc ^ -1) >>> 0;
}

try {
    importScripts('lib/fflate.js');
    if (typeof fflate === 'undefined') throw new Error("fflate failed to load.");
    logWorker("fflate loaded successfully.");
} catch (e) {
    self.postMessage({ type: 'error', message: "Library Loading Error: " + (e.message || e) });
}

/**
 * Manual PNG Encoder (Memory Efficient)
 */
function encodePNG(rgba, w, h) {
    logWorker("Starting manual PNG encode:", w, "x", h);
    
    // 1. Prepare Filtered Pixels (Filter 0 = None)
    // Every row needs a leading 0 byte.
    const filtered = new Uint8Array((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) {
        const srcOffset = y * w * 4;
        const destOffset = y * (w * 4 + 1);
        filtered[destOffset] = 0; // Filter 0
        filtered.set(rgba.subarray(srcOffset, srcOffset + w * 4), destOffset + 1);
    }
    
    logWorker("Pixels filtered. Compressing...");
    const compressed = fflate.zlibSync(filtered, { level: 6 });
    logWorker("Compression done. Size:", compressed.length);

    // 2. Build PNG Chunks
    const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    
    // IHDR Chunk
    const ihdrData = new Uint8Array(13);
    const ihdrView = new DataView(ihdrData.buffer);
    ihdrView.setUint32(0, w, false);
    ihdrView.setUint32(4, h, false);
    ihdrData[8] = 8; // Depth
    ihdrData[9] = 6; // Color Type (RGBA)
    ihdrData[10] = 0; // Compression
    ihdrData[11] = 0; // Filter
    ihdrData[12] = 0; // Interlace
    const ihdrChunk = createChunk("IHDR", ihdrData);

    // IDAT Chunk
    const idatChunk = createChunk("IDAT", compressed);

    // IEND Chunk
    const iendChunk = createChunk("IEND", new Uint8Array(0));

    // 3. Assemble
    const totalSize = pngSignature.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
    const png = new Uint8Array(totalSize);
    let offset = 0;
    png.set(pngSignature, offset); offset += pngSignature.length;
    png.set(ihdrChunk, offset); offset += ihdrChunk.length;
    png.set(idatChunk, offset); offset += idatChunk.length;
    png.set(iendChunk, offset); offset += iendChunk.length;

    return png.buffer;
}

function createChunk(type, data) {
    const typeBytes = new TextEncoder().encode(type);
    const chunk = new Uint8Array(4 + 4 + data.length + 4);
    const view = new DataView(chunk.buffer);
    
    view.setUint32(0, data.length, false);
    chunk.set(typeBytes, 4);
    chunk.set(data, 8);
    
    let crc = crc32(typeBytes);
    crc = crc32(data, crc);
    view.setUint32(8 + data.length, finalizeCrc(crc), false);
    
    return chunk;
}

/**
 * Manual PNG Decoder (Memory Efficient)
 */
function decodePNG(buffer) {
    const data = new Uint8Array(buffer);
    const view = new DataView(buffer);
    
    // Check Signature
    if (data[0] !== 0x89 || data[1] !== 0x50) throw new Error("Not a PNG file.");

    let offset = 8;
    let width, height;
    let idatParts = [];

    while (offset < data.length) {
        const len = view.getUint32(offset, false);
        const type = new TextDecoder().decode(data.subarray(offset + 4, offset + 8));
        
        if (type === "IHDR") {
            width = view.getUint32(offset + 8, false);
            height = view.getUint32(offset + 12, false);
        } else if (type === "IDAT") {
            idatParts.push(data.subarray(offset + 8, offset + 8 + len));
        } else if (type === "IEND") {
            break;
        }
        
        offset += 12 + len;
    }

    logWorker("PNG Scanned. Width:", width, "Height:", height, "IDAT chunks:", idatParts.length);

    // Combine IDATs
    let totalCompressedSize = idatParts.reduce((acc, p) => acc + p.length, 0);
    const combinedIdat = new Uint8Array(totalCompressedSize);
    let idatOffset = 0;
    for (const p of idatParts) {
        combinedIdat.set(p, idatOffset);
        idatOffset += p.length;
    }

    logWorker("Decompressing IDAT...");
    const inflated = fflate.unzlibSync(combinedIdat);
    logWorker("Inflated size:", inflated.length);

    // Strip Filters
    const rowLen = width * 4 + 1;
    const rgba = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
        const srcOffset = y * rowLen;
        const destOffset = y * width * 4;
        // Skip index 0 (the filter byte)
        rgba.set(inflated.subarray(srcOffset + 1, srcOffset + rowLen), destOffset);
    }

    return { width, height, rgba };
}

self.onmessage = async function(e) {
    const { type, file } = e.data;
    
    if (type === 'ping') {
        self.postMessage({ type: 'pong' });
        return;
    }

    try {
        const fileName = file.name;
        logWorker("Reading file into buffer...", fileName);
        postMessage({ type: 'progress', percent: 5, status: 'Reading file...' });
        const arrayBuffer = await file.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);

        if (type === 'Encode') {
            logWorker("Encoding started for:", fileName);
            postMessage({ type: 'progress', percent: 10, status: 'Compressing...' });
            
            const compressed = fflate.zlibSync(fileData, { level: 6 });
            logWorker("Zlib compression done. Compressed size:", compressed.length);

            postMessage({ type: 'progress', percent: 40, status: 'Building Header...' });
            const nameBytes = new TextEncoder().encode(fileName);
            // Header: MAG(3) + NL(1) + Name(NL) + OrigSize(4) + CompSize(4)
            const header = new Uint8Array(3 + 1 + nameBytes.length + 4 + 4); 
            header.set([70, 50, 80]); // "F2P"
            header[3] = nameBytes.length;
            header.set(nameBytes, 4);

            const v = new DataView(header.buffer);
            const sizeOffset = 4 + nameBytes.length;
            v.setUint32(sizeOffset, fileData.length, false);      // Original Size
            v.setUint32(sizeOffset + 4, compressed.length, false); // Compressed Size

            const combined = new Uint8Array(header.length + compressed.length);
            combined.set(header);
            combined.set(compressed, header.length);

            postMessage({ type: 'progress', percent: 60, status: 'Generating Image...' });
            const totalPixels = Math.ceil(combined.length / 4);
            const side = Math.ceil(Math.sqrt(totalPixels));
            logWorker("Image dimensions:", side, "x", side);

            const rgba = new Uint8Array(side * side * 4);
            rgba.set(combined);

            postMessage({ type: 'progress', percent: 80, status: 'Finalizing PNG...' });
            const pngBuffer = encodePNG(rgba, side, side);
            logWorker("PNG Encode finished. Buffer size:", pngBuffer.byteLength);
            
            postMessage({ type: 'progress', percent: 100, status: 'Done!' });
            self.postMessage({ type: 'result', pngBuffer, fileName: fileName + ".f2p.png" }, [pngBuffer]);
        } 
        else if (type === 'Decode') {
            logWorker("Decoding started for:", fileName);
            postMessage({ type: 'progress', percent: 10, status: 'Reading PNG...' });
            
            let decoded;
            try {
                decoded = decodePNG(arrayBuffer);
                logWorker("PNG Decoded metadata:", decoded.width, "x", decoded.height);
            } catch (de) {
                throw new Error("PNG Decode failed: " + (de.message || de));
            }

            postMessage({ type: 'progress', percent: 30, status: 'Converting to RGBA...' });
            const bytes = decoded.rgba;
            logWorker("RGBA Pixel extraction done. Byte length:", bytes.length);

            if (bytes[0] !== 70 || bytes[1] !== 50 || bytes[2] !== 80) {
                throw new Error("Invalid file content: MAGIC header 'F2P' missing.");
            }

            postMessage({ type: 'progress', percent: 50, status: 'Extracting Data...' });
            const nameLen = bytes[3];
            const name = new TextDecoder().decode(bytes.slice(4, 4 + nameLen));
            
            const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            const sizeOffset = 4 + nameLen;
            const originalSize = v.getUint32(sizeOffset, false);
            const compressedSize = v.getUint32(sizeOffset + 4, false);
            logWorker("Header: Name =", name, "Original =", originalSize, "Compressed =", compressedSize);

            const compressedData = bytes.subarray(sizeOffset + 8, sizeOffset + 8 + compressedSize);

            postMessage({ type: 'progress', percent: 80, status: 'Decompressing extracted data...' });
            try {
                const decompressed = fflate.unzlibSync(compressedData);
                const finalData = decompressed.slice(0, originalSize); 

                postMessage({ type: 'progress', percent: 100, status: 'Completed!' });
                self.postMessage({ type: 'result', data: finalData, fileName: name }, [finalData.buffer]);
            } catch (ze) {
                throw new Error("Zlib decompression failed: " + (ze.message || ze));
            }
        }
    } catch (err) {
        logWorker("CRITICAL ERROR:", err);
        self.postMessage({ type: 'error', message: String(err.message || err) });
    }
};
