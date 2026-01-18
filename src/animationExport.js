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
    <svg id="tessellationSvg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"></svg>
  </div>

  <script>
    // GIF encoder with proper color quantization
    function encodeGif(frames, width, height, delay) {
      const buf = [];
      const write = (b) => buf.push(b);
      const writeStr = (s) => { for (let i = 0; i < s.length; i++) write(s.charCodeAt(i)); };
      const writeShort = (v) => { write(v & 0xff); write((v >> 8) & 0xff); };

      // Build global color table with better quantization
      const colorCounts = new Map();

      // Count colors across all frames
      frames.forEach(frame => {
        for (let i = 0; i < frame.data.length; i += 4) {
          // Quantize to 5 bits per channel to reduce unique colors
          const r = frame.data[i] & 0xf8;
          const g = frame.data[i+1] & 0xf8;
          const b = frame.data[i+2] & 0xf8;
          const key = (r << 16) | (g << 8) | b;
          colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
        }
      });

      // Sort by frequency and take top 256
      const sortedColors = [...colorCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 256)
        .map(([key]) => key);

      const colorMap = new Map();
      const colors = [];
      sortedColors.forEach((key, idx) => {
        colorMap.set(key, idx);
        colors.push([(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff]);
      });
      while (colors.length < 256) colors.push([0, 0, 0]);

      // Find nearest color function
      const findNearest = (r, g, b) => {
        const qr = r & 0xf8, qg = g & 0xf8, qb = b & 0xf8;
        const key = (qr << 16) | (qg << 8) | qb;
        if (colorMap.has(key)) return colorMap.get(key);

        // Find closest color
        let minDist = Infinity, closest = 0;
        for (let i = 0; i < colors.length; i++) {
          const dr = r - colors[i][0], dg = g - colors[i][1], db = b - colors[i][2];
          const dist = dr*dr + dg*dg + db*db;
          if (dist < minDist) { minDist = dist; closest = i; }
        }
        return closest;
      };

      // Header
      writeStr('GIF89a');
      writeShort(width);
      writeShort(height);
      write(0xf7); // GCT flag, 8 bits color
      write(0);    // BG color
      write(0);    // Aspect ratio

      // Global Color Table
      colors.forEach(([r, g, b]) => { write(r); write(g); write(b); });

      // Netscape extension for looping
      write(0x21); write(0xff); write(0x0b);
      writeStr('NETSCAPE2.0');
      write(0x03); write(0x01);
      writeShort(0); // Loop forever
      write(0x00);

      // Frames
      frames.forEach(frame => {
        // Graphics Control Extension
        write(0x21); write(0xf9); write(0x04);
        write(0x00); // No transparency
        writeShort(delay);
        write(0x00); write(0x00);

        // Image Descriptor
        write(0x2c);
        writeShort(0); writeShort(0);
        writeShort(width); writeShort(height);
        write(0x00); // No local color table

        // Image Data with LZW
        const minCodeSize = 8;
        write(minCodeSize);

        const pixels = [];
        for (let i = 0; i < frame.data.length; i += 4) {
          pixels.push(findNearest(frame.data[i], frame.data[i+1], frame.data[i+2]));
        }

        const lzwData = lzwEncode(pixels, minCodeSize);
        for (let i = 0; i < lzwData.length; i += 255) {
          const chunk = lzwData.slice(i, i + 255);
          write(chunk.length);
          chunk.forEach(b => write(b));
        }
        write(0x00);
      });

      write(0x3b); // Trailer
      return new Uint8Array(buf);
    }

    function lzwEncode(pixels, minCodeSize) {
      const clearCode = 1 << minCodeSize;
      const eoiCode = clearCode + 1;
      let codeSize = minCodeSize + 1;
      let nextCode = eoiCode + 1;
      const table = new Map();
      for (let i = 0; i < clearCode; i++) table.set(String(i), i);

      const output = [];
      let bits = 0, bitCount = 0;
      const emit = (code) => {
        bits |= code << bitCount;
        bitCount += codeSize;
        while (bitCount >= 8) {
          output.push(bits & 0xff);
          bits >>= 8;
          bitCount -= 8;
        }
      };

      emit(clearCode);
      if (pixels.length === 0) {
        emit(eoiCode);
        if (bitCount > 0) output.push(bits & 0xff);
        return output;
      }

      let prefix = String(pixels[0]);

      for (let i = 1; i < pixels.length; i++) {
        const suffix = String(pixels[i]);
        const combined = prefix + ',' + suffix;
        if (table.has(combined)) {
          prefix = combined;
        } else {
          emit(table.get(prefix));
          if (nextCode < 4096) {
            table.set(combined, nextCode++);
            if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
          } else {
            // Clear table when full
            emit(clearCode);
            table.clear();
            for (let j = 0; j < clearCode; j++) table.set(String(j), j);
            nextCode = eoiCode + 1;
            codeSize = minCodeSize + 1;
          }
          prefix = suffix;
        }
      }
      emit(table.get(prefix));
      emit(eoiCode);
      if (bitCount > 0) output.push(bits & 0xff);
      return output;
    }

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
          const savedScale = scale;
          const savedPanX = panX;
          const savedPanY = panY;

          displayMode = frame.mode;
          currentConfigIndex = frame.configIndex;
          currentVariation = frame.variation;
          // Reset zoom/pan for consistent GIF frames
          scale = 1;
          panX = 0;
          panY = 0;
          render();

          // Capture SVG to canvas
          const svgElement = document.getElementById('tessellationSvg');

          // Set explicit width/height on SVG for proper image rendering
          const dim = getDimensionsForMode(frame.mode);
          svgElement.setAttribute('width', dim.width);
          svgElement.setAttribute('height', dim.height);

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

              // Store full ImageData object for encodeGif
              frameDataList.push(ctx.getImageData(0, 0, canvasWidth, canvasHeight));
              resolve();
            };
            img.onerror = () => {
              ctx.fillStyle = '#f8f8f4';
              ctx.fillRect(0, 0, canvasWidth, canvasHeight);
              frameDataList.push(ctx.getImageData(0, 0, canvasWidth, canvasHeight));
              resolve();
            };
            img.src = url;
          });

          // Restore state
          displayMode = savedMode;
          currentConfigIndex = savedConfig;
          currentVariation = savedVar;
          scale = savedScale;
          panX = savedPanX;
          panY = savedPanY;

          btn.textContent = Math.round((i + 1) / frames.length * 100) + '%';
        }

        render(); // Restore original render

        // Encode GIF using custom encoder
        btn.textContent = 'ENC';
        const gifData = encodeGif(frameDataList, canvasWidth, canvasHeight, delay);

        // Download
        const blob = new Blob([gifData], { type: 'image/gif' });
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
