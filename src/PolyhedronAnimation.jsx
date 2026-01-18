import React, { useEffect, useRef, useState, useCallback } from 'react';

// Constants
const TRI_SIZE = 32;
const TRI_HEIGHT = TRI_SIZE * Math.sqrt(3) / 2;
const COLS = 9;
const BASE_ROWS = 3;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STROKE_WIDTH = 1; // Uses stroke-linejoin="round" to prevent points sticking out

// Row colors for polyhedron
const ROW_COLORS = {
  0: '#c41e3a',
  1: '#2e8b57',
  2: '#1e4d8c'
};

// 6 configurations
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
  return { freq, maxFreq, totalLetters: cleanPhrase.length };
}

function isLetterInPhrase(symbol, letterData) {
  return symbol !== '*' && (letterData.freq[symbol] || 0) > 0;
}

function getLetterOpacity(symbol, letterData) {
  if (symbol === '*') return 0.15;
  const { freq, maxFreq } = letterData;
  const count = freq[symbol] || 0;
  if (count === 0) return 0.15;
  const baseOpacity = 0.3;
  const normalized = count / maxFreq;
  return baseOpacity + normalized * (1 - baseOpacity);
}

function getLetterColor(polyhedronRow) {
  return ROW_COLORS[polyhedronRow % 3];
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
  return { cmyk, rgb, hex: rgbToHex(rgb.r, rgb.g, rgb.b) };
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

// Triangle generation functions
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

const PolyhedronAnimation = ({ phrase, gematriaValues }) => {
  const svgRef = useRef(null);
  const animationRef = useRef(null);
  const [configIndex, setConfigIndex] = useState(0);
  const [variation, setVariation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showIndicator, setShowIndicator] = useState(null); // 'play' or 'pause'

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const configDirection = useRef(1);

  // Parse gematria values from props (format: [hebrew, english, simple, aikbekar])
  const combo = gematriaValues || [111, 666, 111, 99];
  const frameSpeed = aikBekarToMs(combo[3] || 111);

  const renderSvg = useCallback(() => {
    if (!svgRef.current || !phrase) return;

    const config = CONFIGS[CONFIG_KEYS[configIndex]];
    const color = getColor(combo);
    const letterData = getLetterFrequency(phrase);

    // Always use rectangle mode
    const triangles = buildRectangle(variation);
    const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
    const GAP = 0;
    const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
    const octaHeight = quadHeight * 2 + GAP;
    const squareWidth = polyWidth * 4;
    const squareHeight = octaHeight * 2 + GAP;
    const totalWidth = squareWidth * 4 + GAP * 3;
    const totalHeight = squareHeight;

    // Set viewBox with padding for stroke width to prevent clipping at edges
    const padding = STROKE_WIDTH / 2;
    svgRef.current.setAttribute('viewBox', `${-padding} ${-padding} ${totalWidth + STROKE_WIDTH} ${totalHeight + STROKE_WIDTH}`);

    let svgContent = `<rect x="${-padding}" y="${-padding}" width="${totalWidth + STROKE_WIDTH}" height="${totalHeight + STROKE_WIDTH}" fill="#f8f8f4"/>`;

    triangles.forEach(tri => {
      const symbol = config.getSymbol(tri.index % 27);
      const letterOpacity = getLetterOpacity(symbol, letterData);
      const isInPhrase = isLetterInPhrase(symbol, letterData);
      const fill = isInPhrase ? color.hex : '#f8f8f4';
      const fillOpacity = isInPhrase ? letterOpacity : 0.08;
      const path = getTrianglePath(tri.x, tri.y, tri.pointing);

      svgContent += `<path d="${path}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="#333" stroke-width="${STROKE_WIDTH}" stroke-linejoin="round"/>`;

      const textX = tri.x + TRI_SIZE / 2;
      const textY = tri.y + (tri.pointing === 'up' ? TRI_HEIGHT * 0.6 : TRI_HEIGHT * 0.4);
      const textColor = isInPhrase ? '#ffffff' : '#000000';

      svgContent += `<text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="9" font-weight="bold" fill="${textColor}" fill-opacity="${letterOpacity}">${symbol}</text>`;
    });

    svgRef.current.innerHTML = svgContent;
  }, [phrase, combo, configIndex, variation]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = () => {
      setVariation(prev => {
        let newVar = prev + configDirection.current;
        if (newVar >= 2) {
          newVar = 0;
          setConfigIndex(ci => {
            let newCI = ci + configDirection.current;
            if (newCI >= CONFIG_KEYS.length || newCI < 0) {
              configDirection.current *= -1;
              newCI = ci + configDirection.current;
            }
            return newCI;
          });
        } else if (newVar < 0) {
          newVar = 1;
          setConfigIndex(ci => {
            let newCI = ci + configDirection.current;
            if (newCI >= CONFIG_KEYS.length || newCI < 0) {
              configDirection.current *= -1;
              newCI = ci + configDirection.current;
            }
            return newCI;
          });
        }
        return newVar;
      });
    };

    animationRef.current = setTimeout(animate, frameSpeed);
    return () => clearTimeout(animationRef.current);
  }, [isPlaying, configIndex, variation, frameSpeed]);

  // Render on state change
  useEffect(() => {
    renderSvg();
  }, [renderSvg]);

  if (!phrase) return null;

  const togglePlay = () => {
    setIsPlaying(prev => {
      const newState = !prev;
      // Show indicator briefly
      setShowIndicator(newState ? 'play' : 'pause');
      setTimeout(() => setShowIndicator(null), 600);
      return newState;
    });
  };

  // Handle wheel zoom within container (including pinch-to-zoom)
  const handleWheel = useCallback((e) => {
    // Prevent browser zoom (pinch-to-zoom comes as wheel + ctrlKey)
    e.preventDefault();
    e.stopPropagation();

    // Pinch-to-zoom on trackpads uses ctrlKey modifier with smaller deltas
    const isPinch = e.ctrlKey;
    const delta = isPinch
      ? (e.deltaY > 0 ? -0.05 : 0.05)  // Finer control for pinch
      : (e.deltaY > 0 ? -0.1 : 0.1);   // Regular scroll zoom

    setZoom(prevZoom => {
      const newZoom = Math.min(Math.max(prevZoom + delta, 1), 5);
      // Reset pan when zooming back to 1
      if (newZoom === 1) {
        setPan({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  // Handle pan start
  const handleMouseDown = useCallback((e) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [zoom, pan]);

  // Handle pan move
  const handleMouseMove = useCallback((e) => {
    if (isPanning && zoom > 1 && containerRef.current) {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const maxPanX = (rect.width * (zoom - 1)) / 2;
      const maxPanY = (rect.height * (zoom - 1)) / 2;

      const newX = Math.min(Math.max(e.clientX - panStart.x, -maxPanX), maxPanX);
      const newY = Math.min(Math.max(e.clientY - panStart.y, -maxPanY), maxPanY);

      setPan({ x: newX, y: newY });
    }
  }, [isPanning, zoom, panStart]);

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Add/remove global mouse listeners for panning
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, handleMouseMove, handleMouseUp]);

  // Reset zoom when phrase changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [phrase]);

  // Attach wheel listener with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wheelHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isPinch = e.ctrlKey;
      const delta = isPinch
        ? (e.deltaY > 0 ? -0.05 : 0.05)
        : (e.deltaY > 0 ? -0.1 : 0.1);

      setZoom(prevZoom => {
        const newZoom = Math.min(Math.max(prevZoom + delta, 1), 5);
        if (newZoom === 1) {
          setPan({ x: 0, y: 0 });
        }
        return newZoom;
      });
    };

    // Safari gesture events for pinch-to-zoom
    const gestureHandler = (e) => {
      e.preventDefault();
    };

    container.addEventListener('wheel', wheelHandler, { passive: false });
    container.addEventListener('gesturestart', gestureHandler, { passive: false });
    container.addEventListener('gesturechange', gestureHandler, { passive: false });
    container.addEventListener('gestureend', gestureHandler, { passive: false });

    return () => {
      container.removeEventListener('wheel', wheelHandler);
      container.removeEventListener('gesturestart', gestureHandler);
      container.removeEventListener('gesturechange', gestureHandler);
      container.removeEventListener('gestureend', gestureHandler);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={(e) => { if (!isPanning) togglePlay(); }}
      onKeyDown={(e) => e.key === ' ' && togglePlay()}
      onMouseDown={handleMouseDown}
      role="button"
      tabIndex={0}
      style={{
        cursor: isPanning ? 'grabbing' : (zoom > 1 ? 'grab' : 'pointer'),
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <svg
        ref={svgRef}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
        style={{
          background: '#f8f8f4',
          display: 'block',
          pointerEvents: 'none',
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out'
        }}
      />
      {showIndicator && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: '50%',
          width: '70px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          animation: 'fadeInOut 0.6s ease-out forwards'
        }}>
          <style>{`
            @keyframes fadeInOut {
              0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
              20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
              100% { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
            }
          `}</style>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            {showIndicator === 'play' ? (
              <polygon points="8,5 19,12 8,19" />
            ) : (
              <>
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </>
            )}
          </svg>
        </div>
      )}
    </div>
  );
};

export default PolyhedronAnimation;
