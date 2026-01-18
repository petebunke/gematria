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

// Build Single mode (just the base polyhedron)
function buildSingle(variation) {
  const base = generateBasePolyhedron();
  const allTriangles = [];
  const xFlipRows = [0, 2];

  base.forEach(t => {
    const x = t.col * (TRI_SIZE / 2);
    const y = t.row * TRI_HEIGHT;
    let pointing = t.pointing;
    if (xFlipRows.includes(t.row)) pointing = pointing === 'up' ? 'down' : 'up';
    pointing = pointing === 'up' ? 'down' : 'up';

    let letterIndex = t.index;
    let letterRow = t.polyhedronRow;
    if (variation === 1) {
      const flippedRow = BASE_ROWS - 1 - t.row;
      letterIndex = flippedRow * COLS + t.col;
      letterRow = flippedRow;
    }

    allTriangles.push({ ...t, pointing, x, y, index: letterIndex, polyhedronRow: letterRow, yMirror: false });
  });
  return allTriangles;
}

// Get dimensions for single mode
function getSingleDimensions() {
  const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
  const polyHeight = BASE_ROWS * TRI_HEIGHT;
  return {
    width: polyWidth,
    height: polyHeight
  };
}

// Build Dual mode (stacked)
function buildDualStacked(variation) {
  const base = generateBasePolyhedron();
  const allTriangles = [];
  const xFlipRows = [1, 3, 5];

  base.forEach(t => {
    const x = t.col * (TRI_SIZE / 2);
    const y = t.row * TRI_HEIGHT;
    const finalRow = t.row;
    let pointing = t.pointing;
    if (xFlipRows.includes(finalRow)) pointing = pointing === 'up' ? 'down' : 'up';
    let letterRow = variation === 1 ? (BASE_ROWS - 1 - t.row) : t.row;
    let letterIndex = letterRow * COLS + t.col;
    allTriangles.push({ ...t, pointing, x, y, index: letterIndex, polyhedronRow: letterRow, yMirror: false });
  });

  base.forEach(t => {
    const mirroredRow = BASE_ROWS - 1 - t.row;
    const x = t.col * (TRI_SIZE / 2);
    const finalRow = BASE_ROWS + mirroredRow;
    const y = finalRow * TRI_HEIGHT;
    let pointing = t.pointing;
    if (xFlipRows.includes(finalRow)) pointing = pointing === 'up' ? 'down' : 'up';
    let letterRow = variation === 1 ? (BASE_ROWS - 1 - t.row) : t.row;
    let letterIndex = letterRow * COLS + t.col;
    allTriangles.push({ ...t, pointing, x, y, index: letterIndex, polyhedronRow: letterRow, yMirror: false });
  });

  return allTriangles;
}

// Get dimensions for dual mode
function getDualDimensions() {
  const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
  const polyHeight = BASE_ROWS * 2 * TRI_HEIGHT;
  return {
    width: polyWidth,
    height: polyHeight
  };
}

// Build Quad mode (mirrored)
function buildQuadMirrored(variation) {
  const base = generateBasePolyhedron();
  const allTriangles = [];
  const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
  const xFlipRows = [0, 2, 4];
  const columns = [{ colIndex: 0, yMirror: true }, { colIndex: 1, yMirror: false }];

  columns.forEach(({ colIndex, yMirror }) => {
    base.forEach(t => {
      let col = t.col;
      let pointing = t.pointing;
      let row = variation === 0 ? t.row : BASE_ROWS - 1 - t.row;
      let polyRow = variation === 0 ? t.polyhedronRow : BASE_ROWS - 1 - t.polyhedronRow;
      if (yMirror) { col = COLS - 1 - col; pointing = pointing === 'up' ? 'down' : 'up'; }
      if (xFlipRows.includes(row)) pointing = pointing === 'up' ? 'down' : 'up';
      const x = colIndex * polyWidth + col * (TRI_SIZE / 2);
      const y = row * TRI_HEIGHT;
      allTriangles.push({ ...t, col, pointing, polyhedronRow: polyRow, x, y, yMirror, section: 'top' });
    });

    base.forEach(t => {
      let col = t.col;
      let pointing = t.pointing;
      let row, polyRow;
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
      const x = colIndex * polyWidth + col * (TRI_SIZE / 2);
      const y = row * TRI_HEIGHT;
      allTriangles.push({ ...t, col, pointing, polyhedronRow: polyRow, x, y, yMirror, section: 'bottom' });
    });
  });

  return allTriangles;
}

// Get dimensions for quad mode
function getQuadDimensions() {
  const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
  const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
  return {
    width: polyWidth * 2,
    height: quadHeight
  };
}

// Build Octa mode
function buildOcta(variation) {
  const base = generateBasePolyhedron();
  const allTriangles = [];
  const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
  const quadWidth = polyWidth * 2;
  const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
  const xFlipRows = [0, 2, 4];
  const GAP = 0;

  const quadrants = [
    { qRow: 0, qCol: 0, xFlipAll: false, yFlipAll: false },
    { qRow: 0, qCol: 1, xFlipAll: false, yFlipAll: true },
    { qRow: 1, qCol: 0, xFlipAll: true, yFlipAll: false },
    { qRow: 1, qCol: 1, xFlipAll: true, yFlipAll: true }
  ];

  quadrants.forEach(({ qRow, qCol, xFlipAll, yFlipAll }) => {
    const quadXOffset = qCol * quadWidth;
    const quadYOffset = qRow * (quadHeight + GAP);

    let columns;
    if (xFlipAll) {
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
        const x = quadXOffset + colIndex * polyWidth + col * (TRI_SIZE / 2);
        const y = quadYOffset + row * TRI_HEIGHT;
        allTriangles.push({ ...t, col, pointing, polyhedronRow: polyRow, x, y, yMirror, section: 'bottom' });
      });
    });
  });

  return allTriangles;
}

// Get dimensions for octa mode
function getOctaDimensions() {
  const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
  const quadWidth = polyWidth * 2;
  const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
  return {
    width: quadWidth * 2,
    height: quadHeight * 2
  };
}

// Get dimensions for square (cube) mode
function getSquareDimensions() {
  const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
  const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
  const octaHeight = quadHeight * 2;
  return {
    width: polyWidth * 4,
    height: octaHeight * 2
  };
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

// Mode definitions with build functions and dimension getters
const MODES = {
  single: { build: buildSingle, getDimensions: getSingleDimensions, label: 'Single' },
  dual: { build: buildDualStacked, getDimensions: getDualDimensions, label: 'Dual' },
  quad: { build: buildQuadMirrored, getDimensions: getQuadDimensions, label: 'Quad' },
  octa: { build: buildOcta, getDimensions: getOctaDimensions, label: 'Octa' },
  cube: { build: buildSquare, getDimensions: getSquareDimensions, label: 'Cube' },
  rectangle: { build: buildRectangle, getDimensions: getRectangleDimensions, label: 'Rectangle' }
};

const MODE_ORDER = ['single', 'dual', 'quad', 'octa', 'cube', 'rectangle'];

// Generate SVG content for any mode
export function generateModeSvgFrame(phrase, combo, configIndex, variation, mode) {
  const config = CONFIGS[CONFIG_KEYS[configIndex]];
  const colorHex = getColor(combo);
  const letterData = getLetterFrequency(phrase);
  const modeConfig = MODES[mode] || MODES.single;
  const triangles = modeConfig.build(variation);
  const { width, height } = modeConfig.getDimensions();

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

// Backwards compatible - generate Single mode SVG frame
export function generateSingleSvgFrame(phrase, combo, configIndex, variation) {
  return generateModeSvgFrame(phrase, combo, configIndex, variation, 'single');
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

// Generate multi-phrase HTML with all modes, Auto cycling, dropdown selector
// Full app-style UI with dark theme, white navbar, scrolling pattern backgrounds
export function generateMultiPhraseHtml(phrases) {
  // phrases is an array of { phrase, hebrew, english, simple, aiqBekar, source }
  const modes = ['single', 'dual', 'quad', 'octa', 'cube'];
  const modeLabels = { single: 'Single', dual: 'Dual', quad: 'Quad', octa: 'Octa', cube: 'Cube' };

  // Pre-generate all frames for all phrases and all modes
  const phrasesData = phrases.map(p => {
    const combo = [p.hebrew, p.english, p.simple, p.aiqBekar || 111];
    const frameSpeed = aikBekarToMs(combo[3] || 111);

    // Generate frames for each mode
    const modeFrames = {};
    modes.forEach(mode => {
      const frames = [];
      for (let ci = 0; ci < CONFIG_KEYS.length; ci++) {
        for (let v = 0; v < 2; v++) {
          frames.push(generateModeSvgFrame(p.phrase, combo, ci, v, mode));
        }
      }
      modeFrames[mode] = frames;
    });

    return {
      phrase: p.phrase,
      combo,
      frameSpeed,
      modeFrames
    };
  });

  // Generate a simple single-mode background pattern SVG for the scrolling columns
  const bgPatternSvg = generateModeSvgFrame(phrases[0]?.phrase || 'GEMATRIA', [111, 666, 111, 111], 0, 0, 'single');
  const bgPatternBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(bgPatternSvg)));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gematria Phrases</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #000;
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Scrolling pattern background */
    .bg-pattern {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 0;
      display: flex;
      gap: 20px;
      padding: 0 20px;
      overflow: hidden;
      opacity: 0.08;
      pointer-events: none;
    }

    .pattern-column {
      flex: 1;
      background-image: url('${bgPatternBase64}');
      background-size: 160px auto;
      background-repeat: repeat-y;
      animation: scrollPattern 30s linear infinite;
    }

    .pattern-column:nth-child(even) {
      animation-direction: reverse;
      animation-duration: 25s;
    }

    .pattern-column:nth-child(3n) {
      animation-duration: 35s;
    }

    @keyframes scrollPattern {
      0% { background-position-y: 0; }
      100% { background-position-y: 1000px; }
    }

    /* Main container */
    .main-container {
      position: relative;
      z-index: 1;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* White control card */
    .control-card {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e5e7eb;
    }

    .card-header h1 {
      color: #dc2626;
      font-size: 20px;
      font-weight: 700;
    }

    .card-header .phrase-count {
      color: #6b7280;
      font-size: 12px;
      margin-left: auto;
    }

    /* Phrase selector */
    .phrase-selector {
      margin-bottom: 16px;
    }

    .phrase-selector label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }

    .phrase-selector select {
      width: 100%;
      padding: 10px 12px;
      font-size: 14px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      color: #111827;
      transition: border-color 0.2s;
    }

    .phrase-selector select:focus {
      outline: none;
      border-color: #dc2626;
    }

    /* Combo display */
    .combo-display {
      background: #f9fafb;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .combo-display .phrase-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
    }

    .combo-display .combo-values {
      font-size: 14px;
      font-weight: 600;
      color: #dc2626;
      font-family: monospace;
    }

    /* Mode buttons */
    .mode-section {
      margin-bottom: 16px;
    }

    .mode-section label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .mode-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .mode-btn {
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 2px solid #dc2626;
      border-radius: 6px;
      background: #fff;
      color: #dc2626;
      transition: all 0.2s;
    }

    .mode-btn:hover {
      background: #fef2f2;
    }

    .mode-btn.active {
      background: #dc2626;
      color: #fff;
    }

    /* Auto button */
    .controls-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .auto-btn {
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      border-radius: 6px;
      background: #dc2626;
      color: #fff;
      transition: all 0.2s;
    }

    .auto-btn:hover {
      background: #b91c1c;
    }

    .auto-btn.active {
      background: #059669;
    }

    .mode-label {
      font-size: 13px;
      color: #6b7280;
    }

    /* Animation container */
    .animation-wrapper {
      flex: 1;
      background: #18181b;
      border-radius: 12px;
      border: 1px solid #27272a;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 300px;
    }

    #animation {
      width: 100%;
      max-width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    #animation svg {
      display: block;
      max-width: 100%;
      height: auto;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 16px;
      color: #6b7280;
      font-size: 12px;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .main-container {
        padding: 12px;
      }
      .control-card {
        padding: 16px;
      }
      .mode-btn {
        padding: 6px 12px;
        font-size: 12px;
      }
    }
  </style>
</head>
<body>
  <!-- Scrolling pattern background columns -->
  <div class="bg-pattern">
    <div class="pattern-column"></div>
    <div class="pattern-column"></div>
    <div class="pattern-column"></div>
    <div class="pattern-column"></div>
    <div class="pattern-column"></div>
  </div>

  <div class="main-container">
    <!-- Control Card -->
    <div class="control-card">
      <div class="card-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
          <line x1="8" y1="6" x2="16" y2="6"></line>
          <line x1="8" y1="10" x2="16" y2="10"></line>
          <line x1="8" y1="14" x2="12" y2="14"></line>
        </svg>
        <h1>Gematria Phrases</h1>
        <span class="phrase-count">${phrases.length} phrases</span>
      </div>

      <div class="phrase-selector">
        <label>Select Phrase</label>
        <select id="phraseSelect">
          ${phrases.map((p, i) => `<option value="${i}">${p.phrase} (${p.hebrew}/${p.english}/${p.simple}/${p.aiqBekar || '-'})</option>`).join('')}
        </select>
      </div>

      <div class="combo-display">
        <span class="phrase-title" id="phraseTitle">${phrases[0]?.phrase || 'No phrases'}</span>
        <span class="combo-values" id="comboDisplay">${phrases[0]?.hebrew || 111}/${phrases[0]?.english || 666}/${phrases[0]?.simple || 111}/${phrases[0]?.aiqBekar || '-'}</span>
      </div>

      <div class="mode-section">
        <label>Display Mode</label>
        <div class="mode-buttons">
          <button class="mode-btn active" data-mode="single">Single</button>
          <button class="mode-btn" data-mode="dual">Dual</button>
          <button class="mode-btn" data-mode="quad">Quad</button>
          <button class="mode-btn" data-mode="octa">Octa</button>
          <button class="mode-btn" data-mode="cube">Cube</button>
        </div>
      </div>

      <div class="controls-row">
        <button id="autoBtn" class="auto-btn active">Auto: On</button>
        <span class="mode-label" id="modeLabel">Mode: Single</span>
      </div>
    </div>

    <!-- Animation Display -->
    <div class="animation-wrapper">
      <div id="animation"></div>
    </div>

    <div class="footer">
      Generated by Gematria Generator
    </div>
  </div>

  <script>
    const phrasesData = ${JSON.stringify(phrasesData)};
    const modes = ['single', 'dual', 'quad', 'octa', 'cube'];
    const modeLabels = { single: 'Single', dual: 'Dual', quad: 'Quad', octa: 'Octa', cube: 'Cube' };

    let currentPhraseIndex = 0;
    let currentModeIndex = 0;
    let currentFrame = 0;
    let frameDirection = 1;
    let modeDirection = 1;
    let isAutoMode = true;
    let timer = null;

    const animationDiv = document.getElementById('animation');
    const autoBtn = document.getElementById('autoBtn');
    const phraseSelect = document.getElementById('phraseSelect');
    const phraseTitle = document.getElementById('phraseTitle');
    const comboDisplay = document.getElementById('comboDisplay');
    const modeLabel = document.getElementById('modeLabel');
    const modeButtons = document.querySelectorAll('.mode-btn');

    function getCurrentMode() {
      return modes[currentModeIndex];
    }

    function getCurrentPhraseData() {
      return phrasesData[currentPhraseIndex];
    }

    function getCurrentFrames() {
      const data = getCurrentPhraseData();
      return data.modeFrames[getCurrentMode()];
    }

    function render() {
      const frames = getCurrentFrames();
      if (frames && frames[currentFrame]) {
        animationDiv.innerHTML = frames[currentFrame];
      }
    }

    function updateModeButtons() {
      modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === getCurrentMode());
      });
      modeLabel.textContent = 'Mode: ' + modeLabels[getCurrentMode()];
    }

    function updateDisplay() {
      const data = getCurrentPhraseData();
      if (data) {
        phraseTitle.textContent = data.phrase;
        const combo = data.combo;
        comboDisplay.textContent = combo[0] + '/' + combo[1] + '/' + combo[2] + '/' + (combo[3] || '-');
      }
      currentFrame = 0;
      frameDirection = 1;
      updateModeButtons();
      render();
    }

    function animate() {
      const data = getCurrentPhraseData();
      const frames = getCurrentFrames();
      if (!data || !frames) return;

      currentFrame += frameDirection;

      if (currentFrame >= frames.length) {
        frameDirection = -1;
        currentFrame = frames.length - 2;

        // Auto mode: advance to next mode when animation cycle completes
        if (isAutoMode) {
          currentModeIndex += modeDirection;
          if (currentModeIndex >= modes.length) {
            modeDirection = -1;
            currentModeIndex = modes.length - 2;
          } else if (currentModeIndex < 0) {
            modeDirection = 1;
            currentModeIndex = 1;
          }
          updateModeButtons();
        }
      } else if (currentFrame < 0) {
        frameDirection = 1;
        currentFrame = 1;
      }

      render();
      timer = setTimeout(animate, data.frameSpeed);
    }

    function stopAnimation() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function startAnimation() {
      stopAnimation();
      animate();
    }

    autoBtn.addEventListener('click', () => {
      isAutoMode = !isAutoMode;
      autoBtn.textContent = isAutoMode ? 'Auto: On' : 'Auto: Off';
      autoBtn.classList.toggle('active', isAutoMode);
    });

    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const newMode = btn.dataset.mode;
        currentModeIndex = modes.indexOf(newMode);
        currentFrame = 0;
        frameDirection = 1;
        updateModeButtons();
        render();
      });
    });

    phraseSelect.addEventListener('change', (e) => {
      currentPhraseIndex = parseInt(e.target.value);
      updateDisplay();
    });

    // Initial render and start animation
    updateDisplay();
    startAnimation();
  </script>
</body>
</html>`;

  return html;
}

export { CONFIG_KEYS, getRectangleDimensions, getSingleDimensions, aikBekarToMs };
