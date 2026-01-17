// Animation export utilities for generating standalone HTML and GIF

// Constants (must match PolyhedronAnimation.jsx)
const TRI_SIZE = 32;
const TRI_HEIGHT = TRI_SIZE * Math.sqrt(3) / 2;
const COLS = 9;
const BASE_ROWS = 3;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STROKE_WIDTH = 2;

const ROW_COLORS = {
  0: '#c41e3a',
  1: '#2e8b57',
  2: '#1e4d8c'
};

const CONFIGS = {
  'a-*-z': {
    name: 'a-*-z',
    getSymbol: (pos) => {
      if (pos < 13) return ALPHABET[pos];
      if (pos === 13) return '*';
      return ALPHABET[pos - 1];
    }
  },
  '*-a-z': {
    name: '*-a-z',
    getSymbol: (pos) => {
      if (pos === 0) return '*';
      return ALPHABET[pos - 1];
    }
  },
  'a-z-*': {
    name: 'a-z-*',
    getSymbol: (pos) => {
      if (pos === 26) return '*';
      return ALPHABET[pos];
    }
  },
  'z-*-a': {
    name: 'z-*-a',
    getSymbol: (pos) => {
      if (pos < 13) return ALPHABET[25 - pos];
      if (pos === 13) return '*';
      return ALPHABET[25 - (pos - 1)];
    }
  },
  '*-z-a': {
    name: '*-z-a',
    getSymbol: (pos) => {
      if (pos === 0) return '*';
      return ALPHABET[26 - pos];
    }
  },
  'z-a-*': {
    name: 'z-a-*',
    getSymbol: (pos) => {
      if (pos === 26) return '*';
      return ALPHABET[25 - pos];
    }
  }
};

const CONFIG_KEYS = Object.keys(CONFIGS);

// Helper functions
function getLetterFrequency(phrase) {
  const freq = {};
  const cleanPhrase = phrase.toUpperCase().replace(/[^A-Z]/g, '');
  for (const char of cleanPhrase) {
    freq[char] = (freq[char] || 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(freq), 1);
  return { freq, maxFreq };
}

function isLetterInPhrase(symbol, letterData) {
  return symbol !== '*' && (letterData.freq[symbol] || 0) > 0;
}

function getLetterOpacity(symbol, letterData) {
  if (symbol === '*') return 0.15;
  const { freq, maxFreq } = letterData;
  const count = freq[symbol] || 0;
  if (count === 0) return 0.15;
  return 0.3 + (count / maxFreq) * 0.7;
}

function comboToCMYK(combo) {
  const toPercent = (val) => Math.round((val % 1000) / 10);
  return {
    c: toPercent(combo[0]),
    m: toPercent(combo[1]),
    y: toPercent(combo[2]),
    k: toPercent(combo[3])
  };
}

function cmykToRgb(c, m, y, k) {
  c /= 100; m /= 100; y /= 100; k /= 100;
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k))
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function getColor(combo) {
  const cmyk = comboToCMYK(combo);
  const rgb = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function aikBekarToMs(value) {
  if (value <= 0) return 666;

  // Mirror each digit (1↔9, 2↔8, 3↔7, 4↔6, 5→5, 0→0)
  const str = value.toString();
  const mirroredDigits = str.split('').map(d => {
    const digit = parseInt(d);
    if (digit === 0 || digit === 5) return digit;
    return 10 - digit;
  });
  const mirroredNum = parseInt(mirroredDigits.join(''));
  const numDigits = str.length;

  if (numDigits === 1) {
    // Single digit: mirror and multiply by 1111
    return mirroredNum * 1111;
  } else if (numDigits === 2) {
    // 2 digits: mirroredNum * 10 + lastMirroredDigit
    // 55 → 55 * 10 + 5 = 555
    // 99 → 11 * 10 + 1 = 111
    return mirroredNum * 10 + mirroredDigits[mirroredDigits.length - 1];
  } else {
    // 3+ digits: divide by 10^(numDigits-2)
    // 111 → 999 / 10 = 99.9
    // 285 → 825 / 10 = 82.5
    // 1111 → 9999 / 1000 = 9.999
    return mirroredNum / Math.pow(10, numDigits - 2);
  }
}

// Triangle building functions
function generateBasePolyhedron() {
  const triangles = [];
  for (let row = 0; row < BASE_ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      triangles.push({
        row, col,
        pointing: col % 2 === 0 ? 'up' : 'down',
        index: row * COLS + col,
        polyhedronRow: row
      });
    }
  }
  return triangles;
}

function buildSquare(variation) {
  const base = generateBasePolyhedron();
  const allTriangles = [];
  const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
  const quadWidth = polyWidth * 2;
  const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
  const xFlipRows = [0, 2, 4];
  const GAP = 0;

  const octaHalves = [
    { halfRow: 0, globalXFlip: true },
    { halfRow: 1, globalXFlip: false }
  ];

  const octaQuadrants = [
    { qRow: 0, qCol: 0, xFlipAll: false, yFlipAll: false },
    { qRow: 0, qCol: 1, xFlipAll: false, yFlipAll: true },
    { qRow: 1, qCol: 0, xFlipAll: true, yFlipAll: false },
    { qRow: 1, qCol: 1, xFlipAll: true, yFlipAll: true }
  ];

  const octaHeight = quadHeight * 2 + GAP;

  octaHalves.forEach(({ halfRow, globalXFlip }) => {
    const halfYOffset = halfRow * (octaHeight + GAP);

    octaQuadrants.forEach(({ qRow, qCol, xFlipAll, yFlipAll }) => {
      const quadXOffset = qCol * quadWidth;
      const quadYOffset = halfYOffset + qRow * (quadHeight + GAP);
      const combinedXFlip = xFlipAll !== globalXFlip;

      let columns;
      if (combinedXFlip) {
        columns = yFlipAll ? [{ colIndex: 0, yMirror: true }, { colIndex: 1, yMirror: false }]
                           : [{ colIndex: 0, yMirror: false }, { colIndex: 1, yMirror: true }];
      } else {
        columns = yFlipAll ? [{ colIndex: 0, yMirror: false }, { colIndex: 1, yMirror: true }]
                           : [{ colIndex: 0, yMirror: true }, { colIndex: 1, yMirror: false }];
      }

      columns.forEach(({ colIndex, yMirror }) => {
        base.forEach(t => {
          let col = t.col, pointing = t.pointing;
          let row = variation === 0 ? t.row : BASE_ROWS - 1 - t.row;
          let polyRow = variation === 0 ? t.polyhedronRow : BASE_ROWS - 1 - t.polyhedronRow;
          if (yMirror) { col = COLS - 1 - col; pointing = pointing === 'up' ? 'down' : 'up'; }
          if (xFlipRows.includes(row)) pointing = pointing === 'up' ? 'down' : 'up';
          if (xFlipAll) pointing = pointing === 'up' ? 'down' : 'up';
          if (globalXFlip) pointing = pointing === 'up' ? 'down' : 'up';
          const x = quadXOffset + colIndex * polyWidth + col * (TRI_SIZE / 2);
          const y = quadYOffset + row * TRI_HEIGHT;
          allTriangles.push({ ...t, col, pointing, polyhedronRow: polyRow, x, y, yMirror, section: 'top' });
        });

        base.forEach(t => {
          let col = t.col, pointing = t.pointing, row, polyRow;
          if (variation === 0) {
            const mirroredRow = BASE_ROWS - 1 - t.row;
            row = BASE_ROWS + mirroredRow;
            polyRow = BASE_ROWS - 1 - t.polyhedronRow;
          } else {
            row = BASE_ROWS + t.row;
            polyRow = t.polyhedronRow;
          }
          if (yMirror) { col = COLS - 1 - col; pointing = pointing === 'up' ? 'down' : 'up'; }
          if (xFlipRows.includes(row)) pointing = pointing === 'up' ? 'down' : 'up';
          if (xFlipAll) pointing = pointing === 'up' ? 'down' : 'up';
          if (globalXFlip) pointing = pointing === 'up' ? 'down' : 'up';
          const x = quadXOffset + colIndex * polyWidth + col * (TRI_SIZE / 2);
          const y = quadYOffset + row * TRI_HEIGHT;
          allTriangles.push({ ...t, col, pointing, polyhedronRow: polyRow, x, y, yMirror, section: 'bottom' });
        });
      });
    });
  });

  return allTriangles;
}

function buildRectangle(variation) {
  const allTriangles = [];
  const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
  const GAP = 0;
  const squareWidth = polyWidth * 4;

  for (let gridIndex = 0; gridIndex < 4; gridIndex++) {
    const squareTriangles = buildSquare(variation);
    const xOffset = gridIndex * (squareWidth + GAP);
    const shouldXFlip = gridIndex % 2 === 1;

    squareTriangles.forEach(tri => {
      let newPointing = tri.pointing;
      if (shouldXFlip) newPointing = tri.pointing === 'up' ? 'down' : 'up';
      allTriangles.push({ ...tri, x: tri.x + xOffset, y: tri.y, pointing: newPointing, gridIndex });
    });
  }

  return allTriangles;
}

function getTrianglePath(x, y, pointing) {
  const halfWidth = TRI_SIZE / 2;
  if (pointing === 'up') {
    return `M ${x} ${y + TRI_HEIGHT} L ${x + halfWidth} ${y} L ${x + TRI_SIZE} ${y + TRI_HEIGHT} Z`;
  } else {
    return `M ${x} ${y} L ${x + TRI_SIZE} ${y} L ${x + halfWidth} ${y + TRI_HEIGHT} Z`;
  }
}

// Get dimensions for rectangle mode
function getRectangleDimensions() {
  const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
  const GAP = 0;
  const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
  const octaHeight = quadHeight * 2 + GAP;
  const squareWidth = polyWidth * 4;
  const squareHeight = octaHeight * 2 + GAP;
  return {
    width: squareWidth * 4 + GAP * 3,
    height: squareHeight
  };
}

// Generate SVG content for a specific frame
export function generateSvgFrame(phrase, combo, configIndex, variation) {
  const config = CONFIGS[CONFIG_KEYS[configIndex]];
  const colorHex = getColor(combo);
  const letterData = getLetterFrequency(phrase);
  const triangles = buildRectangle(variation);
  const { width, height } = getRectangleDimensions();

  // Add padding for stroke width to prevent clipping at edges
  const padding = STROKE_WIDTH / 2;
  const viewBox = `${-padding} ${-padding} ${width + STROKE_WIDTH} ${height + STROKE_WIDTH}`;

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width + STROKE_WIDTH}" height="${height + STROKE_WIDTH}">`;
  svgContent += `<rect x="${-padding}" y="${-padding}" width="${width + STROKE_WIDTH}" height="${height + STROKE_WIDTH}" fill="#f8f8f4"/>`;

  triangles.forEach(tri => {
    const symbol = config.getSymbol(tri.index % 27);
    const letterOpacity = getLetterOpacity(symbol, letterData);
    const isInPhrase = isLetterInPhrase(symbol, letterData);
    const fill = isInPhrase ? colorHex : '#f8f8f4';
    const fillOpacity = isInPhrase ? letterOpacity : 0.08;
    const path = getTrianglePath(tri.x, tri.y, tri.pointing);

    svgContent += `<path d="${path}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="#333" stroke-width="${STROKE_WIDTH}" stroke-linejoin="round"/>`;

    const textX = tri.x + TRI_SIZE / 2;
    const textY = tri.y + (tri.pointing === 'up' ? TRI_HEIGHT * 0.6 : TRI_HEIGHT * 0.4);
    const textColor = isInPhrase ? '#ffffff' : '#000000';

    svgContent += `<text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="9" font-weight="bold" fill="${textColor}" fill-opacity="${letterOpacity}">${symbol}</text>`;
  });

  svgContent += '</svg>';
  return svgContent;
}

// Generate standalone HTML with embedded animation
export function generateStandaloneHtml(phrase, combo) {
  const { width, height } = getRectangleDimensions();
  const frameSpeed = aikBekarToMs(combo[3] || 111);

  // Generate all frames (6 configs × 2 variations = 12 frames per cycle)
  const frames = [];
  for (let ci = 0; ci < CONFIG_KEYS.length; ci++) {
    for (let v = 0; v < 2; v++) {
      frames.push(generateSvgFrame(phrase, combo, ci, v));
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gematria Animation - ${phrase}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }
    h1 {
      color: #dc2626;
      margin-bottom: 10px;
      font-size: 24px;
    }
    .combo {
      color: #000;
      margin-bottom: 20px;
      font-size: 18px;
      font-weight: 700;
    }
    .container {
      border: none;
      border-radius: 8px;
      overflow: hidden;
      background: #f8f8f4;
      line-height: 0;
    }
    #animation {
      display: block;
      line-height: 0;
    }
    #animation svg {
      display: block;
    }
    .controls {
      margin-top: 20px;
      display: flex;
      gap: 10px;
    }
    button {
      padding: 10px 20px;
      font-size: 14px;
      cursor: pointer;
      border: none;
      border-radius: 4px;
      background: #dc2626;
      color: white;
      font-weight: 600;
    }
    button:hover {
      background: #b91c1c;
    }
  </style>
</head>
<body>
  <h1>${phrase}</h1>
  <div class="combo">${combo[0]}/${combo[1]}/${combo[2]}/${combo[3]}</div>
  <div class="container">
    <div id="animation"></div>
  </div>
  <div class="controls">
    <button id="playPause">Pause</button>
  </div>

  <script>
    const frames = ${JSON.stringify(frames)};
    const frameSpeed = ${frameSpeed};
    let currentFrame = 0;
    let direction = 1;
    let isPlaying = true;
    let timer = null;

    const animationDiv = document.getElementById('animation');
    const playPauseBtn = document.getElementById('playPause');

    function render() {
      animationDiv.innerHTML = frames[currentFrame];
    }

    function animate() {
      currentFrame += direction;
      if (currentFrame >= frames.length) {
        direction = -1;
        currentFrame = frames.length - 2;
      } else if (currentFrame < 0) {
        direction = 1;
        currentFrame = 1;
      }
      render();
      if (isPlaying) {
        timer = setTimeout(animate, frameSpeed);
      }
    }

    playPauseBtn.addEventListener('click', () => {
      isPlaying = !isPlaying;
      playPauseBtn.textContent = isPlaying ? 'Pause' : 'Play';
      if (isPlaying) animate();
      else clearTimeout(timer);
    });

    render();
    animate();
  </script>
</body>
</html>`;

  return html;
}

// Generate GIF blob using canvas
export async function generateGifBlob(phrase, combo, progressCallback) {
  const { width, height } = getRectangleDimensions();
  const frameSpeed = Math.max(aikBekarToMs(combo[3] || 111), 50); // Min 50ms for GIF

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Generate frames
  const frames = [];
  const totalFrames = CONFIG_KEYS.length * 2; // 6 configs × 2 variations

  for (let ci = 0; ci < CONFIG_KEYS.length; ci++) {
    for (let v = 0; v < 2; v++) {
      const svgContent = generateSvgFrame(phrase, combo, ci, v);
      frames.push(svgContent);
    }
  }

  // Convert SVG frames to canvas images
  const images = [];
  for (let i = 0; i < frames.length; i++) {
    if (progressCallback) progressCallback(i / frames.length * 0.5);

    const img = new Image();
    const svgBlob = new Blob([frames[i]], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    await new Promise((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });

    images.push(img);
  }

  // Use gif.js to create GIF
  return new Promise((resolve, reject) => {
    // Dynamically import gif.js
    import('gif.js').then(({ default: GIF }) => {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: width,
        height: height,
        workerScript: '/gif.worker.js' // This needs to be available
      });

      // Add frames (forward and backward for ping-pong)
      const allFrames = [...images, ...images.slice(1, -1).reverse()];
      allFrames.forEach((img, i) => {
        ctx.fillStyle = '#f8f8f4';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);
        gif.addFrame(ctx, { copy: true, delay: frameSpeed });
        if (progressCallback) progressCallback(0.5 + (i / allFrames.length) * 0.5);
      });

      gif.on('finished', (blob) => {
        resolve(blob);
      });

      gif.on('error', reject);
      gif.render();
    }).catch(() => {
      // Fallback: return a simple single-frame "GIF" (actually PNG)
      ctx.fillStyle = '#f8f8f4';
      ctx.fillRect(0, 0, width, height);
      const img = images[0];
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(resolve, 'image/png');
    });
  });
}

// Generate animated GIF using gifenc
export async function generateSimpleGif(phrase, combo, progressCallback) {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');

  const { width, height } = getRectangleDimensions();
  const frameSpeed = Math.max(aikBekarToMs(combo[3] || 111), 20); // Min 20ms for GIF
  const delay = Math.round(frameSpeed / 10); // GIF delay is in centiseconds

  // Use 2x scale for highest resolution GIF
  const scale = 2;
  const baseWidth = width + STROKE_WIDTH;
  const baseHeight = height + STROKE_WIDTH;
  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;

  const canvas = document.createElement('canvas');
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Generate frames (6 configs × 2 variations = 12 frames, then reverse for ping-pong)
  const svgFrames = [];
  for (let ci = 0; ci < CONFIG_KEYS.length; ci++) {
    for (let v = 0; v < 2; v++) {
      svgFrames.push(generateSvgFrame(phrase, combo, ci, v));
    }
  }
  // Add reverse frames for ping-pong (excluding first and last to avoid duplicates)
  const allSvgFrames = [...svgFrames, ...svgFrames.slice(1, -1).reverse()];

  if (progressCallback) progressCallback(0.1);

  // Convert SVG frames to image data
  const frameDataList = [];
  for (let i = 0; i < allSvgFrames.length; i++) {
    const img = new Image();
    const svgBlob = new Blob([allSvgFrames[i]], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    await new Promise((resolve) => {
      img.onload = () => {
        ctx.fillStyle = '#f8f8f4';
        ctx.fillRect(0, 0, scaledWidth, scaledHeight);
        ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        ctx.fillStyle = '#f8f8f4';
        ctx.fillRect(0, 0, scaledWidth, scaledHeight);
        resolve();
      };
      img.src = url;
    });

    const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
    frameDataList.push(imageData.data);

    if (progressCallback) progressCallback(0.1 + (i / allSvgFrames.length) * 0.6);
  }

  // Create GIF encoder
  const gif = GIFEncoder();

  // Add each frame
  for (let i = 0; i < frameDataList.length; i++) {
    const rgba = frameDataList[i];

    // Quantize to 256 color palette with high quality settings
    const palette = quantize(rgba, 256, { format: 'rgb444' });
    const index = applyPalette(rgba, palette, { format: 'rgb444' });

    gif.writeFrame(index, scaledWidth, scaledHeight, {
      palette,
      delay,
      dispose: 1 // Clear frame before drawing next
    });

    if (progressCallback) progressCallback(0.7 + (i / frameDataList.length) * 0.3);
  }

  gif.finish();

  const bytes = gif.bytes();
  const blob = new Blob([bytes], { type: 'image/gif' });

  if (progressCallback) progressCallback(1);

  return blob;
}

export { CONFIG_KEYS, getRectangleDimensions, aikBekarToMs };
