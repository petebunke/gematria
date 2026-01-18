// Animation export utilities for generating standalone HTML and GIF

// Constants (must match PolyhedronAnimation.jsx)
const TRI_SIZE = 32;
const TRI_HEIGHT = TRI_SIZE * Math.sqrt(3) / 2;
const COLS = 9;
const BASE_ROWS = 3;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STROKE_WIDTH = 1;

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
    const index = applyPalette(rgba, palette, 'rgb444');

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

// Generate multi-phrase HTML with full UI matching the reference template
// Includes: controls overlay, background pattern, zoom/pan, all modes, auto oscillation
export function generateMultiPhraseHtml(phrases) {
  // Sort phrases by hebrew, then simple, then aik bekar (all low to high)
  const sortedPhrases = [...phrases].sort((a, b) => {
    if (a.hebrew !== b.hebrew) return a.hebrew - b.hebrew;
    if (a.simple !== b.simple) return a.simple - b.simple;
    const aAiq = a.aiqBekar || 0;
    const bAiq = b.aiqBekar || 0;
    return aAiq - bAiq;
  });

  // Build phrase options for dropdown
  const phraseOptions = sortedPhrases.map(p => {
    const combo = `${p.hebrew}/${p.english}/${p.simple}/${p.aiqBekar || '-'}`;
    const displayPhrase = p.phrase.length > 25 ? p.phrase.slice(0, 22) + '...' : p.phrase;
    return `<option value="${p.phrase}|${p.hebrew}/${p.english}/${p.simple}/${p.aiqBekar || 111}">${displayPhrase} (${combo})</option>`;
  }).join('\n        ');

  const firstPhrase = sortedPhrases[0] || { phrase: 'gematria', hebrew: 111, english: 666, simple: 111, aiqBekar: 99 };
  const firstCombo = [firstPhrase.hebrew, firstPhrase.english, firstPhrase.simple, firstPhrase.aiqBekar || 111];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Gematria Polyhedron Tessellation</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='7' y='4' width='18' height='24' rx='2' fill='none' stroke='%23ef4444' stroke-width='2'/%3E%3Cline x1='10' y1='9' x2='22' y2='9' stroke='%23ef4444' stroke-width='2'/%3E%3Ccircle cx='22' cy='14' r='1' fill='%23ef4444'/%3E%3Ccircle cx='16' cy='14' r='1' fill='%23ef4444'/%3E%3Ccircle cx='10' cy='14' r='1' fill='%23ef4444'/%3E%3Ccircle cx='22' cy='19' r='1' fill='%23ef4444'/%3E%3Ccircle cx='16' cy='19' r='1' fill='%23ef4444'/%3E%3Ccircle cx='10' cy='19' r='1' fill='%23ef4444'/%3E%3Ccircle cx='22' cy='24' r='1' fill='%23ef4444'/%3E%3Ccircle cx='16' cy='24' r='1' fill='%23ef4444'/%3E%3Ccircle cx='10' cy='24' r='1' fill='%23ef4444'/%3E%3C/svg%3E">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      touch-action: none;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f0;
      color: #333;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    #backgroundSvg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      opacity: 0.3;
    }

    .controls-overlay {
      background: rgba(255,255,255,0.95);
      border-bottom: 2px solid #333;
      padding: 8px 16px;
      width: 100%;
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .control-label {
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
    }

    select, button, input {
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 4px;
      color: #333;
      padding: 4px 6px;
      font-size: 11px;
      outline: none;
    }
    select:focus, input:focus {
      border-color: #6b5b95;
    }

    input[type="number"] {
      width: 60px;
    }

    button {
      background: #6b5b95;
      border-color: #6b5b95;
      color: #fff;
      cursor: pointer;
    }
    button:hover { background: #5a4a84; }
    button.secondary {
      background: #fff;
      color: #6b5b95;
      border-color: #6b5b95;
    }

    .info-display {
      font-family: monospace;
      font-size: 10px;
      background: #f0f0e8;
      padding: 2px 5px;
      border-radius: 4px;
    }

    .tessellation-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      touch-action: none;
      padding: 20px;
      cursor: grab;
    }

    #tessellationSvg {
      width: 800px;
      height: 600px;
      touch-action: none;
      border: 2px solid #333;
      background: #f8f8f4;
    }
  </style>
</head>
<body>
  <svg id="backgroundSvg" preserveAspectRatio="xMidYMid slice"></svg>
  <div class="controls-overlay">
    <div class="control-group">
      <span class="control-label">Phrase</span>
      <select id="phraseSelect">
        ${phraseOptions}
      </select>
    </div>

    <div class="control-group">
      <span class="control-label">Mode</span>
      <select id="displayMode">
        <option value="single" selected>Single</option>
        <option value="dual">Duo</option>
        <option value="quad">Quad</option>
        <option value="octa">Octa</option>
        <option value="square">Square</option>
        <option value="rectangle">Rectangle</option>
        <option value="cube">Cube</option>
      </select>
    </div>

    <div class="control-group">
      <span class="control-label">Config</span>
      <span class="info-display" id="configName">a-*-z</span>
    </div>

    <div class="control-group">
      <span class="control-label">Var</span>
      <span class="info-display" id="variationName" style="width: 52px; text-align: center;">Normal</span>
    </div>

    <div class="control-group">
      <span class="control-label">Speed</span>
      <input type="number" id="frameSpeed" value="666" min="1" max="9999" step="1">
      <span class="control-label">ms</span>
    </div>

    <div class="control-group">
      <button id="playPause" style="width: 32px;">⏸</button>
      <button id="prevVar" class="secondary">◀</button>
      <button id="nextVar" class="secondary">▶</button>
      <button id="loopBtn" class="secondary">LOOP</button>
    </div>

    <div class="control-group">
      <span class="control-label">Auto</span>
      <button id="oscToggle" class="secondary" style="background:#6b5b95;color:#fff">ON</button>
    </div>

    <div class="control-group">
      <span class="control-label">Zoom</span>
      <span class="info-display" id="zoomLevel">100%</span>
    </div>

    <div class="control-group">
      <button id="gifBtn" class="secondary" style="font-weight:bold;">GIF</button>
    </div>
  </div>

  <div class="tessellation-container" id="container">
    <svg id="tessellationSvg" preserveAspectRatio="xMidYMid meet"></svg>
  </div>

  <script>
    // Embedded gifenc library (https://github.com/mattdesl/gifenc)
    var X={signature:"GIF",version:"89a",trailer:59,extensionIntroducer:33,applicationExtensionLabel:255,graphicControlExtensionLabel:249,imageSeparator:44,signatureSize:3,versionSize:3,globalColorTableFlagMask:128,colorResolutionMask:112,sortFlagMask:8,globalColorTableSizeMask:7,applicationIdentifierSize:8,applicationAuthCodeSize:3,disposalMethodMask:28,userInputFlagMask:2,transparentColorFlagMask:1,localColorTableFlagMask:128,interlaceFlagMask:64,idSortFlagMask:32,localColorTableSizeMask:7};function F(t=256){let e=0,s=new Uint8Array(t);return{get buffer(){return s.buffer},reset(){e=0},bytesView(){return s.subarray(0,e)},bytes(){return s.slice(0,e)},writeByte(r){n(e+1),s[e]=r,e++},writeBytes(r,o=0,i=r.length){n(e+i);for(let c=0;c<i;c++)s[e++]=r[c+o]},writeBytesView(r,o=0,i=r.byteLength){n(e+i),s.set(r.subarray(o,o+i),e),e+=i}};function n(r){var o=s.length;if(o>=r)return;var i=1024*1024;r=Math.max(r,o*(o<i?2:1.125)>>>0),o!=0&&(r=Math.max(r,256));let c=s;s=new Uint8Array(r),e>0&&s.set(c.subarray(0,e),0)}}var O=12,J=5003,lt=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function at(t,e,s,n,r=F(512),o=new Uint8Array(256),i=new Int32Array(J),c=new Int32Array(J)){let x=i.length,a=Math.max(2,n);o.fill(0),c.fill(0),i.fill(-1);let l=0,f=0,g=a+1,h=g,b=!1,w=h,_=(1<<w)-1,u=1<<g-1,k=u+1,B=u+2,p=0,A=s[0],z=0;for(let y=x;y<65536;y*=2)++z;z=8-z,r.writeByte(a),I(u);let d=s.length;for(let y=1;y<d;y++){t:{let m=s[y],v=(m<<O)+A,M=m<<z^A;if(i[M]===v){A=c[M];break t}let V=M===0?1:x-M;for(;i[M]>=0;)if(M-=V,M<0&&(M+=x),i[M]===v){A=c[M];break t}I(A),A=m,B<1<<O?(c[M]=B++,i[M]=v):(i.fill(-1),B=u+2,b=!0,I(u))}}return I(A),I(k),r.writeByte(0),r.bytesView();function I(y){for(l&=lt[f],f>0?l|=y<<f:l=y,f+=w;f>=8;)o[p++]=l&255,p>=254&&(r.writeByte(p),r.writeBytesView(o,0,p),p=0),l>>=8,f-=8;if((B>_||b)&&(b?(w=h,_=(1<<w)-1,b=!1):(++w,_=w===O?1<<w:(1<<w)-1)),y==k){for(;f>0;)o[p++]=l&255,p>=254&&(r.writeByte(p),r.writeBytesView(o,0,p),p=0),l>>=8,f-=8;p>0&&(r.writeByte(p),r.writeBytesView(o,0,p),p=0)}}}var $=at;function D(t,e,s){return t<<8&63488|e<<2&992|s>>3}function G(t,e,s,n){return t>>4|e&240|(s&240)<<4|(n&240)<<8}function j(t,e,s){return t>>4<<8|e&240|s>>4}function R(t,e,s){return t<e?e:t>s?s:t}function T(t){return t*t}function tt(t,e,s){var n=0,r=1e100;let o=t[e],i=o.cnt,c=o.ac,x=o.rc,a=o.gc,l=o.bc;for(var f=o.fw;f!=0;f=t[f].fw){let h=t[f],b=h.cnt,w=i*b/(i+b);if(!(w>=r)){var g=0;s&&(g+=w*T(h.ac-c),g>=r)||(g+=w*T(h.rc-x),!(g>=r)&&(g+=w*T(h.gc-a),!(g>=r)&&(g+=w*T(h.bc-l),!(g>=r)&&(r=g,n=f))))}}o.err=r,o.nn=n}function Q(){return{ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0}}function ut(t,e){let s=e==="rgb444"?4096:65536,n=new Array(s),r=t.length;if(e==="rgba4444")for(let o=0;o<r;++o){let i=t[o],c=i>>24&255,x=i>>16&255,a=i>>8&255,l=i&255,f=G(l,a,x,c),g=f in n?n[f]:n[f]=Q();g.rc+=l,g.gc+=a,g.bc+=x,g.ac+=c,g.cnt++}else if(e==="rgb444")for(let o=0;o<r;++o){let i=t[o],c=i>>16&255,x=i>>8&255,a=i&255,l=j(a,x,c),f=l in n?n[l]:n[l]=Q();f.rc+=a,f.gc+=x,f.bc+=c,f.cnt++}else for(let o=0;o<r;++o){let i=t[o],c=i>>16&255,x=i>>8&255,a=i&255,l=D(a,x,c),f=l in n?n[l]:n[l]=Q();f.rc+=a,f.gc+=x,f.bc+=c,f.cnt++}return n}function quantize(t,e,s={}){let{format:n="rgb565",clearAlpha:r=!0,clearAlphaColor:o=0,clearAlphaThreshold:i=0,oneBitAlpha:c=!1}=s;if(!t||!t.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(t instanceof Uint8Array)&&!(t instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");let x=new Uint32Array(t.buffer),a=s.useSqrt!==!1,l=n==="rgba4444",f=ut(x,n),g=f.length,h=g-1,b=new Uint32Array(g+1);for(var w=0,u=0;u<g;++u){let C=f[u];if(C!=null){var _=1/C.cnt;l&&(C.ac*=_),C.rc*=_,C.gc*=_,C.bc*=_,f[w++]=C}}T(e)/w<.022&&(a=!1);for(var u=0;u<w-1;++u)f[u].fw=u+1,f[u+1].bk=u,a&&(f[u].cnt=Math.sqrt(f[u].cnt));a&&(f[u].cnt=Math.sqrt(f[u].cnt));var k,B,p;for(u=0;u<w;++u){tt(f,u,!1);var A=f[u].err;for(B=++b[0];B>1&&(p=B>>1,!(f[k=b[p]].err<=A));B=p)b[B]=k;b[B]=u}var z=w-e;for(u=0;u<z;){for(var d;;){var I=b[1];if(d=f[I],d.tm>=d.mtm&&f[d.nn].mtm<=d.tm)break;d.mtm==h?I=b[1]=b[b[0]--]:(tt(f,I,!1),d.tm=u);var A=f[I].err;for(B=1;(p=B+B)<=b[0]&&(p<b[0]&&f[b[p]].err>f[b[p+1]].err&&p++,!(A<=f[k=b[p]].err));B=p)b[B]=k;b[B]=I}var y=f[d.nn],m=d.cnt,v=y.cnt,_=1/(m+v);l&&(d.ac=_*(m*d.ac+v*y.ac)),d.rc=_*(m*d.rc+v*y.rc),d.gc=_*(m*d.gc+v*y.gc),d.bc=_*(m*d.bc+v*y.bc),d.cnt+=y.cnt,d.mtm=++u,f[y.bk].fw=y.fw,f[y.fw].bk=y.bk,y.mtm=h}let M=[];var V=0;for(u=0;;++V){let L=R(Math.round(f[u].rc),0,255),C=R(Math.round(f[u].gc),0,255),Y=R(Math.round(f[u].bc),0,255),E=255;if(l){if(E=R(Math.round(f[u].ac),0,255),c){let st=typeof c=="number"?c:127;E=E<=st?0:255}r&&E<=i&&(L=C=Y=o,E=0)}let K=l?[L,C,Y,E]:[L,C,Y];if(xt(M,K)||M.push(K),(u=f[u].fw)==0)break}return M}function xt(t,e){for(let s=0;s<t.length;s++){let n=t[s],r=n[0]===e[0]&&n[1]===e[1]&&n[2]===e[2],o=n.length>=4&&e.length>=4?n[3]===e[3]:!0;if(r&&o)return!0}return!1}function applyPalette(t,e,s="rgb565"){if(!t||!t.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(t instanceof Uint8Array)&&!(t instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");if(e.length>256)throw new Error("applyPalette() only works with 256 colors or less");let n=new Uint32Array(t.buffer),r=n.length,o=s==="rgb444"?4096:65536,i=new Uint8Array(r),c=new Array(o),x=s==="rgba4444";if(s==="rgba4444")for(let a=0;a<r;a++){let l=n[a],f=l>>24&255,g=l>>16&255,h=l>>8&255,b=l&255,w=G(b,h,g,f),_=w in c?c[w]:c[w]=gt(b,h,g,f,e);i[a]=_}else{let a=s==="rgb444"?j:D;for(let l=0;l<r;l++){let f=n[l],g=f>>16&255,h=f>>8&255,b=f&255,w=a(b,h,g),_=w in c?c[w]:c[w]=bt(b,h,g,e);i[l]=_}}return i}function gt(t,e,s,n,r){let o=0,i=1e100;for(let c=0;c<r.length;c++){let x=r[c],a=x[3],l=q(a-n);if(l>i)continue;let f=x[0];if(l+=q(f-t),l>i)continue;let g=x[1];if(l+=q(g-e),l>i)continue;let h=x[2];l+=q(h-s),!(l>i)&&(i=l,o=c)}return o}function bt(t,e,s,n){let r=0,o=1e100;for(let i=0;i<n.length;i++){let c=n[i],x=c[0],a=q(x-t);if(a>o)continue;let l=c[1];if(a+=q(l-e),a>o)continue;let f=c[2];a+=q(f-s),!(a>o)&&(o=a,r=i)}return r}function q(t){return t*t}function Z(t){return Math.max(Math.ceil(Math.log2(t)),1)}function S(t,e){t.writeByte(e&255),t.writeByte(e>>8&255)}function ft(t,e){for(var s=0;s<e.length;s++)t.writeByte(e.charCodeAt(s))}function wt(t,e,s,n,r){t.writeByte(33),t.writeByte(249),t.writeByte(4),r<0&&(r=0,n=!1);var o,i;n?(o=1,i=2):(o=0,i=0),e>=0&&(i=e&7),i<<=2;let c=0;t.writeByte(0|i|c|o),S(t,s),t.writeByte(r||0),t.writeByte(0)}function pt(t,e,s,n,r=8){let o=1,i=0,c=Z(n.length)-1,x=o<<7|r-1<<4|i<<3|c,a=0,l=0;S(t,e),S(t,s),t.writeBytes([x,a,l])}function dt(t,e){t.writeByte(33),t.writeByte(255),t.writeByte(11),ft(t,"NETSCAPE2.0"),t.writeByte(3),t.writeByte(1),S(t,e),t.writeByte(0)}function it(t,e){let s=1<<Z(e.length);for(let n=0;n<s;n++){let r=[0,0,0];n<e.length&&(r=e[n]),t.writeByte(r[0]),t.writeByte(r[1]),t.writeByte(r[2])}}function ht(t,e,s,n){if(t.writeByte(44),S(t,0),S(t,0),S(t,e),S(t,s),n){let r=0,o=0,i=Z(n.length)-1;t.writeByte(128|r|o|0|i)}else t.writeByte(0)}function yt(t,e,s,n,r=8,o,i,c){$(s,n,e,r,t,o,i,c)}function GIFEncoder(t={}){let{initialCapacity:e=4096}=t,n=F(e),r=5003,o=new Uint8Array(256),i=new Int32Array(r),c=new Int32Array(r),x=!1;return{reset(){n.reset(),x=!1},finish(){n.writeByte(X.trailer)},bytes(){return n.bytes()},bytesView(){return n.bytesView()},get buffer(){return n.buffer},get stream(){return n},writeFrame(l,f,g,h={}){let{transparent:b=!1,transparentIndex:w=0,delay:_=0,palette:u=null,repeat:k=0,colorDepth:B=8,dispose:p=-1}=h,A=!1;x||(A=!0,x=!0);if(f=Math.max(0,Math.floor(f)),g=Math.max(0,Math.floor(g)),A){if(!u)throw new Error("First frame must include a { palette } option");pt(n,f,g,u,B),it(n,u),k>=0&&dt(n,k)}let z=Math.round(_/10);wt(n,p,z,b,w);let d=Boolean(u)&&!A;ht(n,f,g,d?u:null),d&&it(n,u),yt(n,l,f,g,B,o,i,c)}}}

    // Constants
    const TRI_SIZE = 32;
    const TRI_HEIGHT = TRI_SIZE * Math.sqrt(3) / 2;
    const COLS = 9;
    const BASE_ROWS = 3;
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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

    // State
    let currentPhrase = ${JSON.stringify(firstPhrase.phrase)};
    let currentCombo = ${JSON.stringify(firstCombo)};
    let currentConfigIndex = 0;
    let currentVariation = 0;
    let isPlaying = true;
    let animationTimer = null;
    let frameSpeed = 666;
    let displayMode = 'single';
    let configDirection = 1;
    let loopMode = 0;
    let oscActive = true;

    // Zoom and pan state
    let scale = 0.5;
    let panX = 0;
    let panY = 0;
    let initialDistance = 0;
    let initialScale = 1;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartPanX = 0;
    let dragStartPanY = 0;

    const MODE_ORDER = ['single', 'dual', 'quad', 'octa', 'square', 'rectangle', 'cube'];
    let oscModeDirection = 1;

    function isLetterInPhrase(symbol, letterData) {
      return symbol !== '*' && (letterData.freq[symbol] || 0) > 0;
    }

    function getLetterFrequency(phrase) {
      const freq = {};
      const cleanPhrase = phrase.toUpperCase().replace(/[^A-Z]/g, '');
      for (const char of cleanPhrase) {
        freq[char] = (freq[char] || 0) + 1;
      }
      const maxFreq = Math.max(...Object.values(freq), 1);
      return { freq, maxFreq, totalLetters: cleanPhrase.length };
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

    function getColor() {
      const cmyk = comboToCMYK(currentCombo);
      const rgb = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
      return { cmyk, rgb, hex: rgbToHex(rgb.r, rgb.g, rgb.b) };
    }

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

    function buildDualStacked(variation) {
      const base = generateBasePolyhedron();
      const allTriangles = [];
      const xFlipRows = [1, 3, 5];
      base.forEach(t => {
        const x = t.col * (TRI_SIZE / 2);
        const y = t.row * TRI_HEIGHT;
        let pointing = t.pointing;
        if (xFlipRows.includes(t.row)) pointing = pointing === 'up' ? 'down' : 'up';
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

    function buildQuadMirrored(variation) {
      const base = generateBasePolyhedron();
      const allTriangles = [];
      const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
      const xFlipRows = [0, 2, 4];
      const columns = [{ colIndex: 0, yMirror: true }, { colIndex: 1, yMirror: false }];
      columns.forEach(({ colIndex, yMirror }) => {
        base.forEach(t => {
          let col = t.col, pointing = t.pointing;
          let row = variation === 0 ? t.row : BASE_ROWS - 1 - t.row;
          let polyRow = variation === 0 ? t.polyhedronRow : BASE_ROWS - 1 - t.polyhedronRow;
          if (yMirror) { col = COLS - 1 - col; pointing = pointing === 'up' ? 'down' : 'up'; }
          if (xFlipRows.includes(row)) pointing = pointing === 'up' ? 'down' : 'up';
          const x = colIndex * polyWidth + col * (TRI_SIZE / 2);
          const y = row * TRI_HEIGHT;
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
          const x = colIndex * polyWidth + col * (TRI_SIZE / 2);
          const y = row * TRI_HEIGHT;
          allTriangles.push({ ...t, col, pointing, polyhedronRow: polyRow, x, y, yMirror, section: 'bottom' });
        });
      });
      return allTriangles;
    }

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

    function buildSquare(variation) {
      const base = generateBasePolyhedron();
      const allTriangles = [];
      const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
      const quadWidth = polyWidth * 2;
      const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
      const xFlipRows = [0, 2, 4];
      const GAP = 0;
      const octaHalves = [{ halfRow: 0, globalXFlip: true }, { halfRow: 1, globalXFlip: false }];
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

    function buildCube(variation) {
      const allTriangles = [];
      const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
      const GAP = 0;
      const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
      const octaHeight = quadHeight * 2 + GAP;
      const squareHeight = octaHeight * 2 + GAP;
      const rectangleHeight = squareHeight;
      for (let rowIndex = 0; rowIndex < 4; rowIndex++) {
        const rectangleTriangles = buildRectangle(variation);
        const yOffset = rowIndex * (rectangleHeight + GAP);
        const shouldXFlip = rowIndex % 2 === 0;
        rectangleTriangles.forEach(tri => {
          let newPointing = tri.pointing;
          if (shouldXFlip) newPointing = tri.pointing === 'up' ? 'down' : 'up';
          allTriangles.push({ ...tri, x: tri.x, y: tri.y + yOffset, pointing: newPointing, rowIndex });
        });
      }
      return allTriangles;
    }

    function getTrianglePath(x, y, pointing) {
      const halfWidth = TRI_SIZE / 2;
      if (pointing === 'up') {
        return \`M \${x} \${y + TRI_HEIGHT} L \${x + halfWidth} \${y} L \${x + TRI_SIZE} \${y + TRI_HEIGHT} Z\`;
      } else {
        return \`M \${x} \${y} L \${x + TRI_SIZE} \${y} L \${x + halfWidth} \${y + TRI_HEIGHT} Z\`;
      }
    }

    function aikBekarToMs(value) {
      if (value <= 0) return 666;
      const str = value.toString();
      const mirroredDigits = str.split('').map(d => {
        const digit = parseInt(d);
        if (digit === 0 || digit === 5) return digit;
        return 10 - digit;
      });
      const mirroredNum = parseInt(mirroredDigits.join(''));
      const numDigits = str.length;
      if (numDigits === 1) return mirroredNum * 1111;
      else if (numDigits === 2) return mirroredNum * 10 + mirroredDigits[mirroredDigits.length - 1];
      else return mirroredNum / Math.pow(10, numDigits - 2);
    }

    function render() {
      const svg = document.getElementById('tessellationSvg');
      const config = CONFIGS[CONFIG_KEYS[currentConfigIndex]];
      const color = getColor();
      const letterData = getLetterFrequency(currentPhrase);

      document.getElementById('configName').textContent = config.name;
      document.getElementById('variationName').textContent = currentVariation === 0 ? 'Normal' : 'Inverted';
      document.getElementById('zoomLevel').textContent = Math.round(scale * 100) + '%';

      let triangles, totalWidth, totalHeight;
      const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
      const GAP = 0;
      const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
      const octaHeight = quadHeight * 2 + GAP;

      if (displayMode === 'single') {
        triangles = buildSingle(currentVariation);
        totalWidth = polyWidth;
        totalHeight = BASE_ROWS * TRI_HEIGHT;
      } else if (displayMode === 'dual') {
        triangles = buildDualStacked(currentVariation);
        totalWidth = polyWidth;
        totalHeight = BASE_ROWS * 2 * TRI_HEIGHT;
      } else if (displayMode === 'cube') {
        triangles = buildCube(currentVariation);
        const squareWidth = polyWidth * 4;
        const squareHeight = octaHeight * 2 + GAP;
        totalWidth = squareWidth * 4 + GAP * 3;
        totalHeight = squareHeight * 4 + GAP * 3;
      } else if (displayMode === 'rectangle') {
        triangles = buildRectangle(currentVariation);
        const squareWidth = polyWidth * 4;
        const squareHeight = octaHeight * 2 + GAP;
        totalWidth = squareWidth * 4 + GAP * 3;
        totalHeight = squareHeight;
      } else if (displayMode === 'square') {
        triangles = buildSquare(currentVariation);
        totalWidth = polyWidth * 4;
        totalHeight = octaHeight * 2 + GAP;
      } else if (displayMode === 'octa') {
        triangles = buildOcta(currentVariation);
        totalWidth = polyWidth * 4;
        totalHeight = quadHeight * 2 + GAP;
      } else {
        triangles = buildQuadMirrored(currentVariation);
        totalWidth = polyWidth * 2;
        totalHeight = BASE_ROWS * 2 * TRI_HEIGHT;
      }

      const viewWidth = totalWidth / scale;
      const viewHeight = totalHeight / scale;
      const viewX = (totalWidth - viewWidth) / 2 + panX;
      const viewY = (totalHeight - viewHeight) / 2 + panY;
      svg.setAttribute('viewBox', \`\${viewX} \${viewY} \${viewWidth} \${viewHeight}\`);

      let svgContent = \`<rect x="0" y="0" width="\${totalWidth}" height="\${totalHeight}" fill="#f8f8f4"/>\`;

      triangles.forEach(tri => {
        const symbol = config.getSymbol(tri.index % 27);
        const letterOpacity = getLetterOpacity(symbol, letterData);
        const isInPhrase = isLetterInPhrase(symbol, letterData);
        const fill = isInPhrase ? color.hex : '#f8f8f4';
        const fillOpacity = isInPhrase ? letterOpacity : 0.08;
        const path = getTrianglePath(tri.x, tri.y, tri.pointing);
        svgContent += \`<path d="\${path}" fill="\${fill}" fill-opacity="\${fillOpacity}" stroke="#333" stroke-width="1" stroke-linejoin="round"/>\`;
        const textX = tri.x + TRI_SIZE / 2;
        const textY = tri.y + (tri.pointing === 'up' ? TRI_HEIGHT * 0.6 : TRI_HEIGHT * 0.4);
        const textColor = isInPhrase ? '#ffffff' : '#000000';
        svgContent += \`<text x="\${textX}" y="\${textY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="9" font-weight="bold" fill="\${textColor}" fill-opacity="\${letterOpacity}">\${symbol}</text>\`;
      });

      svg.innerHTML = svgContent;
    }

    function animate() {
      if (!isPlaying) return;
      const varCount = 2;
      let configChanged = false;
      let newConfigIndex = currentConfigIndex;

      currentVariation += configDirection;
      if (currentVariation >= varCount) {
        currentVariation = 0;
        newConfigIndex = currentConfigIndex + configDirection;
        configChanged = true;
      } else if (currentVariation < 0) {
        currentVariation = varCount - 1;
        newConfigIndex = currentConfigIndex + configDirection;
        configChanged = true;
      }

      if (configChanged) {
        if (newConfigIndex >= CONFIG_KEYS.length || newConfigIndex < 0) {
          if (loopMode === 0) {
            const wasGoingBackward = configDirection === -1;
            configDirection *= -1;
            newConfigIndex = currentConfigIndex + configDirection;
            currentVariation += configDirection * 2;
            if (currentVariation < 0) currentVariation = varCount - 1;
            if (currentVariation >= varCount) currentVariation = 0;

            if (oscActive && wasGoingBackward) {
              const currentModeIndex = MODE_ORDER.indexOf(displayMode);
              let nextModeIndex = currentModeIndex + oscModeDirection;
              if (nextModeIndex >= MODE_ORDER.length || nextModeIndex < 0) {
                oscModeDirection *= -1;
                nextModeIndex = currentModeIndex + oscModeDirection;
              }
              displayMode = MODE_ORDER[nextModeIndex];
              document.getElementById('displayMode').value = displayMode;
              currentVariation = 0;
              panX = 0;
              panY = 0;
              if (displayMode === 'rectangle' || displayMode === 'cube') scale = 0.75;
            }
          } else {
            newConfigIndex = (newConfigIndex + CONFIG_KEYS.length) % CONFIG_KEYS.length;
          }
        }
        currentConfigIndex = newConfigIndex;
      }

      render();
      animationTimer = setTimeout(animate, frameSpeed);
    }

    // Background
    let bgColumns = [];
    let bgTileHeight = 0;
    let bgAnimationId = null;
    let bgLastTime = 0;

    function renderBackground() {
      const bgSvg = document.getElementById('backgroundSvg');
      const config = CONFIGS[CONFIG_KEYS[0]];
      const color = getColor();
      const letterData = getLetterFrequency(currentPhrase);
      const triangles = buildQuadMirrored(0);
      const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
      const tileWidth = polyWidth * 2;
      bgTileHeight = BASE_ROWS * 2 * TRI_HEIGHT;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const tilesX = Math.ceil(screenWidth / tileWidth) + 2;
      const tilesY = Math.ceil(screenHeight / bgTileHeight) + 3;
      const totalWidth = tilesX * tileWidth;
      bgSvg.setAttribute('viewBox', \`0 0 \${totalWidth} \${screenHeight}\`);

      let tileContent = '';
      triangles.forEach(tri => {
        const symbol = config.getSymbol(tri.index % 27);
        const letterOpacity = getLetterOpacity(symbol, letterData);
        const isInPhrase = isLetterInPhrase(symbol, letterData);
        const fill = isInPhrase ? color.hex : '#f8f8f4';
        const fillOpacity = isInPhrase ? letterOpacity : 0.08;
        const path = getTrianglePath(tri.x, tri.y, tri.pointing);
        tileContent += \`<path d="\${path}" fill="\${fill}" fill-opacity="\${fillOpacity}" stroke="#999" stroke-width="0.5"/>\`;
        const textX = tri.x + TRI_SIZE / 2;
        const textY = tri.y + (tri.pointing === 'up' ? TRI_HEIGHT * 0.6 : TRI_HEIGHT * 0.4);
        const textColor = isInPhrase ? '#ffffff' : '#000000';
        tileContent += \`<text x="\${textX}" y="\${textY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="9" font-weight="bold" fill="\${textColor}" fill-opacity="\${letterOpacity * 0.7}">\${symbol}</text>\`;
      });

      let svgContent = \`<rect x="0" y="0" width="\${totalWidth}" height="\${screenHeight}" fill="#f5f5f0"/>\`;
      svgContent += \`<defs><g id="tile">\${tileContent}</g></defs>\`;

      const totalColumnHeight = tilesY * bgTileHeight;
      if (bgColumns.length !== tilesX) {
        bgColumns = [];
        const staggerOffset = totalColumnHeight / 3;
        for (let col = 0; col < tilesX; col++) {
          const goingUp = col % 2 === 0;
          const yFlip = col % 2 === 1;
          const baseOffset = goingUp ? 0 : -bgTileHeight;
          const stagger = (col % 2) * staggerOffset;
          bgColumns.push({ direction: goingUp ? -1 : 1, offset: baseOffset - stagger, yFlip, xPos: col * tileWidth, tileWidth });
        }
      }

      for (let col = 0; col < tilesX; col++) {
        const xPos = col * tileWidth;
        const yFlip = col % 2 === 1;
        const flipTransform = yFlip ? \`translate(\${2 * xPos + tileWidth}, 0) scale(-1, 1)\` : '';
        svgContent += \`<g id="bgCol\${col}" \${yFlip ? \`transform="\${flipTransform}"\` : ''}>\`;
        for (let row = -1; row < tilesY; row++) {
          svgContent += \`<use href="#tile" x="\${xPos}" y="\${row * bgTileHeight}"/>\`;
        }
        svgContent += '</g>';
      }
      bgSvg.innerHTML = svgContent;

      if (!bgAnimationId) {
        bgLastTime = performance.now();
        bgAnimationId = requestAnimationFrame(animateBackground);
      }
    }

    function animateBackground(currentTime) {
      const deltaTime = currentTime - bgLastTime;
      bgLastTime = currentTime;
      const scrollSpeed = bgTileHeight / (Math.max(3, frameSpeed / 20) * 8000);
      bgColumns.forEach((col, i) => {
        col.offset += col.direction * scrollSpeed * deltaTime;
        if (col.offset <= -bgTileHeight) col.offset += bgTileHeight;
        if (col.offset >= 0) col.offset -= bgTileHeight;
        const colEl = document.getElementById('bgCol' + i);
        if (colEl) {
          if (col.yFlip) colEl.setAttribute('transform', \`translate(\${2 * col.xPos + col.tileWidth}, \${col.offset}) scale(-1, 1)\`);
          else colEl.setAttribute('transform', \`translate(0, \${col.offset})\`);
        }
      });
      bgAnimationId = requestAnimationFrame(animateBackground);
    }

    // Event handlers
    document.getElementById('playPause').addEventListener('click', () => {
      isPlaying = !isPlaying;
      document.getElementById('playPause').textContent = isPlaying ? '⏸' : '▶';
      if (isPlaying) animate();
      else if (animationTimer) clearTimeout(animationTimer);
    });

    document.getElementById('prevVar').addEventListener('click', () => {
      const total = CONFIG_KEYS.length * 2;
      let idx = currentConfigIndex * 2 + currentVariation - 1;
      idx = ((idx % total) + total) % total;
      currentConfigIndex = Math.floor(idx / 2);
      currentVariation = idx % 2;
      render();
    });

    document.getElementById('nextVar').addEventListener('click', () => {
      const total = CONFIG_KEYS.length * 2;
      let idx = currentConfigIndex * 2 + currentVariation + 1;
      idx = idx % total;
      currentConfigIndex = Math.floor(idx / 2);
      currentVariation = idx % 2;
      render();
    });

    document.getElementById('loopBtn').addEventListener('click', () => {
      loopMode = (loopMode + 1) % 3;
      const btn = document.getElementById('loopBtn');
      if (loopMode === 0) { btn.textContent = 'LOOP'; btn.style.background = ''; btn.style.color = ''; configDirection = 1; }
      else if (loopMode === 1) { btn.textContent = 'LOOP 1'; btn.style.background = '#6b5b95'; btn.style.color = '#fff'; configDirection = 1; if (oscActive) stopOsc(); }
      else { btn.textContent = 'LOOP 2'; btn.style.background = '#6b5b95'; btn.style.color = '#fff'; configDirection = -1; if (oscActive) stopOsc(); }
    });

    function startOsc() {
      oscModeDirection = 1;
      oscActive = true;
      const btn = document.getElementById('oscToggle');
      btn.textContent = 'ON';
      btn.style.background = '#6b5b95';
      btn.style.color = '#fff';
      loopMode = 0;
      configDirection = 1;
      document.getElementById('loopBtn').textContent = 'LOOP';
      document.getElementById('loopBtn').style.background = '';
      document.getElementById('loopBtn').style.color = '';
      if (!isPlaying) { isPlaying = true; document.getElementById('playPause').textContent = '⏸'; animate(); }
    }

    function stopOsc() {
      oscActive = false;
      const btn = document.getElementById('oscToggle');
      btn.textContent = 'OFF';
      btn.style.background = '';
      btn.style.color = '';
    }

    document.getElementById('oscToggle').addEventListener('click', () => { if (oscActive) stopOsc(); else startOsc(); });

    document.getElementById('phraseSelect').addEventListener('change', (e) => {
      const [phrase, combo] = e.target.value.split('|');
      currentPhrase = phrase;
      currentCombo = combo.split('/').map(Number);
      const aikBekarValue = currentCombo[currentCombo.length - 1];
      frameSpeed = aikBekarToMs(aikBekarValue);
      document.getElementById('frameSpeed').value = parseFloat(frameSpeed.toPrecision(4));
      render();
      renderBackground();
    });

    document.getElementById('displayMode').addEventListener('change', (e) => {
      displayMode = e.target.value;
      currentVariation = 0;
      panX = 0; panY = 0;
      if (displayMode === 'rectangle' || displayMode === 'cube') scale = 0.75;
      render();
    });

    document.getElementById('frameSpeed').addEventListener('input', (e) => {
      frameSpeed = Math.min(9999, Math.max(1, parseFloat(e.target.value) || 666));
      if (isPlaying && animationTimer) { clearTimeout(animationTimer); animationTimer = setTimeout(animate, frameSpeed); }
    });

    // Zoom and pan
    const container = document.getElementById('container');
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const minZoom = (displayMode === 'rectangle' || displayMode === 'cube') ? 0.75 : 0.25;
      scale = Math.max(minZoom, Math.min(5, scale * zoomFactor));
      render();
    }, { passive: false });

    container.addEventListener('mousedown', (e) => {
      if (e.button === 0) { isDragging = true; dragStartX = e.clientX; dragStartY = e.clientY; dragStartPanX = panX; dragStartPanY = panY; container.style.cursor = 'grabbing'; }
    });
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const svg = document.getElementById('tessellationSvg');
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.getAttribute('viewBox').split(' ').map(Number);
        const scaleX = viewBox[2] / rect.width;
        const scaleY = viewBox[3] / rect.height;
        panX = dragStartPanX - (e.clientX - dragStartX) * scaleX;
        panY = dragStartPanY - (e.clientY - dragStartY) * scaleY;
        render();
      }
    });
    document.addEventListener('mouseup', () => { if (isDragging) { isDragging = false; container.style.cursor = ''; } });

    window.addEventListener('resize', () => { render(); renderBackground(); });

    // GIF Export functionality
    async function exportGif() {
      const btn = document.getElementById('gifBtn');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '...';

      try {
        // GIFEncoder, quantize, applyPalette are embedded at top of script

        // Determine frame sequence based on current settings
        const frames = [];
        const varCount = 2;
        const configKeys = Object.keys(CONFIGS);
        const delay = Math.max(Math.round(frameSpeed / 10), 2); // GIF delay in centiseconds, min 20ms

        if (oscActive) {
          // Auto mode: cycle through all modes
          const modeList = ['single', 'dual', 'quad', 'octa', 'square', 'rectangle', 'cube'];
          // Forward through modes
          for (const mode of modeList) {
            for (let ci = 0; ci < configKeys.length; ci++) {
              for (let v = 0; v < varCount; v++) {
                frames.push({ mode, configIndex: ci, variation: v });
              }
            }
          }
          // Backward through modes (excluding first and last)
          for (let mi = modeList.length - 2; mi > 0; mi--) {
            const mode = modeList[mi];
            for (let ci = configKeys.length - 1; ci >= 0; ci--) {
              for (let v = varCount - 1; v >= 0; v--) {
                frames.push({ mode, configIndex: ci, variation: v });
              }
            }
          }
        } else if (loopMode === 1) {
          // Loop forward: cycle through configs/variations in current mode
          for (let ci = 0; ci < configKeys.length; ci++) {
            for (let v = 0; v < varCount; v++) {
              frames.push({ mode: displayMode, configIndex: ci, variation: v });
            }
          }
          // Ping-pong back
          for (let ci = configKeys.length - 2; ci > 0; ci--) {
            for (let v = varCount - 1; v >= 0; v--) {
              frames.push({ mode: displayMode, configIndex: ci, variation: v });
            }
          }
        } else if (loopMode === 2) {
          // Loop backward: cycle through configs/variations in reverse
          for (let ci = configKeys.length - 1; ci >= 0; ci--) {
            for (let v = varCount - 1; v >= 0; v--) {
              frames.push({ mode: displayMode, configIndex: ci, variation: v });
            }
          }
          // Ping-pong forward
          for (let ci = 1; ci < configKeys.length - 1; ci++) {
            for (let v = 0; v < varCount; v++) {
              frames.push({ mode: displayMode, configIndex: ci, variation: v });
            }
          }
        } else {
          // No loop: just current mode, all configs/variations once with ping-pong
          for (let ci = 0; ci < configKeys.length; ci++) {
            for (let v = 0; v < varCount; v++) {
              frames.push({ mode: displayMode, configIndex: ci, variation: v });
            }
          }
          for (let ci = configKeys.length - 2; ci > 0; ci--) {
            for (let v = varCount - 1; v >= 0; v--) {
              frames.push({ mode: displayMode, configIndex: ci, variation: v });
            }
          }
        }

        // Get dimensions for current mode
        function getDimensionsForMode(mode) {
          const polyWidth = COLS * (TRI_SIZE / 2) + TRI_SIZE / 2;
          const polyHeight = BASE_ROWS * TRI_HEIGHT;
          const quadHeight = polyHeight * 2;
          const octaHeight = quadHeight * 2;
          const GAP = 4;

          if (mode === 'single') return { width: polyWidth, height: polyHeight };
          if (mode === 'dual') return { width: polyWidth, height: polyHeight * 2 };
          if (mode === 'quad') return { width: polyWidth * 2, height: BASE_ROWS * 2 * TRI_HEIGHT };
          if (mode === 'octa') return { width: polyWidth * 4, height: quadHeight * 2 + GAP };
          if (mode === 'square') return { width: polyWidth * 4, height: octaHeight * 2 + GAP };
          if (mode === 'rectangle') {
            const squareWidth = polyWidth * 4;
            const squareHeight = octaHeight * 2 + GAP;
            return { width: squareWidth * 4 + GAP * 3, height: squareHeight };
          }
          if (mode === 'cube') {
            const squareWidth = polyWidth * 4;
            const squareHeight = octaHeight * 2 + GAP;
            return { width: squareWidth * 4 + GAP * 3, height: squareHeight * 4 + GAP * 3 };
          }
          return { width: polyWidth, height: polyHeight };
        }

        // Find max dimensions across all frames
        let maxWidth = 0, maxHeight = 0;
        const uniqueModes = [...new Set(frames.map(f => f.mode))];
        for (const mode of uniqueModes) {
          const dim = getDimensionsForMode(mode);
          maxWidth = Math.max(maxWidth, dim.width);
          maxHeight = Math.max(maxHeight, dim.height);
        }

        const scaleFactor = 2;
        const canvasWidth = Math.round(maxWidth * scaleFactor);
        const canvasHeight = Math.round(maxHeight * scaleFactor);

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        btn.textContent = '0%';

        // Generate each frame
        const frameDataList = [];
        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i];

          // Temporarily change mode and render
          const savedMode = displayMode;
          const savedConfig = currentConfigIndex;
          const savedVar = currentVariation;

          displayMode = frame.mode;
          currentConfigIndex = frame.configIndex;
          currentVariation = frame.variation;
          render();

          // Capture SVG to canvas
          const svgElement = document.getElementById('tessellationSvg');
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);

          await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              ctx.fillStyle = '#f8f8f4';
              ctx.fillRect(0, 0, canvasWidth, canvasHeight);

              // Center the image
              const dim = getDimensionsForMode(frame.mode);
              const scaledW = dim.width * scaleFactor;
              const scaledH = dim.height * scaleFactor;
              const offsetX = (canvasWidth - scaledW) / 2;
              const offsetY = (canvasHeight - scaledH) / 2;

              ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);
              URL.revokeObjectURL(url);

              const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
              // Must copy the data - imageData.data buffer can be reused
              frameDataList.push(new Uint8Array(imageData.data));
              resolve();
            };
            img.onerror = () => {
              ctx.fillStyle = '#f8f8f4';
              ctx.fillRect(0, 0, canvasWidth, canvasHeight);
              const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
              frameDataList.push(new Uint8Array(imageData.data));
              resolve();
            };
            img.src = url;
          });

          // Restore state
          displayMode = savedMode;
          currentConfigIndex = savedConfig;
          currentVariation = savedVar;

          btn.textContent = Math.round((i + 1) / frames.length * 100) + '%';
        }

        render(); // Restore original render

        // Encode GIF
        btn.textContent = 'ENC';
        const gif = GIFEncoder();

        for (let i = 0; i < frameDataList.length; i++) {
          const rgba = frameDataList[i];
          const palette = quantize(rgba, 256, { format: 'rgb444' });
          const index = applyPalette(rgba, palette, 'rgb444');
          gif.writeFrame(index, canvasWidth, canvasHeight, { palette, delay, dispose: 1 });

          // Yield to browser every 10 frames to prevent timeout
          if (i % 10 === 0) {
            btn.textContent = 'ENC ' + Math.round((i / frameDataList.length) * 100) + '%';
            await new Promise(r => setTimeout(r, 0));
          }
        }
        gif.finish();

        // Download
        const blob = new Blob([gif.bytes()], { type: 'image/gif' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = currentPhrase.replace(/[^a-z0-9]/gi, '_') + '_' + displayMode + '.gif';
        a.click();
        URL.revokeObjectURL(a.href);

        btn.textContent = originalText;
        btn.disabled = false;
      } catch (err) {
        console.error('GIF export error:', err);
        alert('GIF export failed: ' + err.message);
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }

    document.getElementById('gifBtn').addEventListener('click', exportGif);

    // Init
    const initialAikBekar = currentCombo[currentCombo.length - 1];
    frameSpeed = aikBekarToMs(initialAikBekar);
    document.getElementById('frameSpeed').value = parseFloat(frameSpeed.toPrecision(4));
    render();
    renderBackground();
    animate();
  <\/script>
</body>
</html>`;

  return html;
}

export { CONFIG_KEYS, getRectangleDimensions, getSingleDimensions, aikBekarToMs };
