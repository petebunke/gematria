import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calculator, Copy, Check, Download, Loader2, Trash2 } from 'lucide-react';
import JSZip from 'jszip';

const GematriaCalculator = () => {
  const [input, setInput] = useState('');
  const [results, setResults] = useState(null);
  const [targetHebrew, setTargetHebrew] = useState('111');
  const [targetEnglish, setTargetEnglish] = useState('666');
  const [targetSimple, setTargetSimple] = useState('111');
  const [targetAiqBekar, setTargetAiqBekar] = useState('111');
  const [aiqBekarEnabled, setAiqBekarEnabled] = useState(false);
  const [generatingTargeted, setGeneratingTargeted] = useState(false);
  const [generatingRandom, setGeneratingRandom] = useState(false);
  const [wordList, setWordList] = useState([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showAiqTooltip, setShowAiqTooltip] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });
  const [copied, setCopied] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [generatedPhrases, setGeneratedPhrases] = useState(() => {
    // Load from localStorage on initial render
    try {
      const saved = localStorage.getItem('gematriaGeneratedPhrases');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load phrases from localStorage:', e);
      return [];
    }
  });

  const repdigits = ['11', '22', '33', '44', '55', '66', '77', '88', '99',
                     '111', '222', '333', '444', '555', '666', '777', '888', '999',
                     '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];

  // Hebrew Gematria values (based on gematrix.org)
  const hebrewValues = {
    a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
    j: 600, k: 10, l: 20, m: 30, n: 40, o: 50, p: 60, q: 70,
    r: 80, s: 90, t: 100, u: 200, v: 700, w: 900, x: 300,
    y: 400, z: 500
  };

  // English Gematria values (based on gematrix.org)
  const englishValues = {
    a: 6, b: 12, c: 18, d: 24, e: 30, f: 36, g: 42, h: 48,
    i: 54, j: 60, k: 66, l: 72, m: 78, n: 84, o: 90, p: 96,
    q: 102, r: 108, s: 114, t: 120, u: 126, v: 132, w: 138,
    x: 144, y: 150, z: 156
  };

  // Simple Gematria values (based on gematrix.org)
  const simpleValues = {
    a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
    j: 10, k: 11, l: 12, m: 13, n: 14, o: 15, p: 16, q: 17,
    r: 18, s: 19, t: 20, u: 21, v: 22, w: 23, x: 24, y: 25,
    z: 26
  };

  // English (Aik Bekar⁹) Gematria values
  const aiqBekarValues = {
    a: 1, b: 20, c: 13, d: 6, e: 25, f: 18, g: 11, h: 4, i: 23,
    j: 16, k: 9, l: 2, m: 21, n: 14, o: 7, p: 26, q: 19, r: 12,
    s: 5, t: 24, u: 17, v: 10, w: 3, x: 22, y: 15, z: 8
  };

  const calculateGematria = (text, values) => {
    const breakdown = [];
    let total = 0;

    const cleanText = text.toLowerCase().replace(/[^a-z]/g, '');

    for (let char of cleanText) {
      const value = values[char] || 0;
      breakdown.push({ char, value });
      total += value;
    }

    return { total, breakdown };
  };

  const isRepdigit = (num) => {
    const repdigits = [11, 22, 33, 44, 55, 66, 77, 88, 99,
                      111, 222, 333, 444, 555, 666, 777, 888, 999,
                      1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999];
    return repdigits.includes(num);
  };

  const handleCalculate = () => {
    if (!input.trim()) return;

    const phrase = input.trim();
    const hebrew = calculateGematria(phrase, hebrewValues);
    const english = calculateGematria(phrase, englishValues);
    const simple = calculateGematria(phrase, simpleValues);
    const aiqBekar = calculateGematria(phrase, aiqBekarValues);

    setResults({
      input: phrase,
      hebrew,
      english,
      simple,
      aiqBekar
    });

    // Track calculated phrase
    trackGeneratedPhrase(phrase, hebrew.total, english.total, simple.total, aiqBekar.total, 'calculated');
  };

  const handleCopy = async () => {
    if (!input.trim()) return;

    try {
      await navigator.clipboard.writeText(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const trackGeneratedPhrase = (phrase, hebrew, english, simple, aiqBekar, source, generationTimeMs = null) => {
    const newEntry = {
      phrase,
      hebrew,
      english,
      simple,
      aiqBekar,
      source, // 'specified', 'random', or 'anagram'
      timestamp: new Date().toISOString(),
      generationTime: generationTimeMs // Time in milliseconds
    };

    setGeneratedPhrases(prev => [...prev, newEntry]);
  };

  const handleClearPhrases = async () => {
    setClearing(true);
    try {
      // Small delay to show the spinner
      await new Promise(resolve => setTimeout(resolve, 300));
      setGeneratedPhrases([]);
      setInput('');
      setResults(null);
    } finally {
      setClearing(false);
    }
  };

  const generateHtmlContent = (sorted) => {
    // Generate phrase options for the tessellation dropdown
    const phraseOptions = sorted.map(p => {
      const combo = `${p.hebrew}/${p.english}/${p.simple}/${p.aiqBekar || 0}`;
      const displayPhrase = p.phrase.length > 20 ? p.phrase.substring(0, 17) + '...' : p.phrase;
      return `<option value="${p.phrase}|${combo}">${displayPhrase} (${combo})</option>`;
    }).join('\n        ');

    // Get the first phrase for initial state
    const firstPhrase = sorted[0];
    const initialPhrase = firstPhrase.phrase;
    const initialCombo = [firstPhrase.hebrew, firstPhrase.english, firstPhrase.simple, firstPhrase.aiqBekar || 0];

    // Create the tessellation HTML content
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Gematria Polyhedron Tessellation</title>
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
      transition: transform 0.3s ease;
    }

    .controls-overlay.hidden {
      transform: translateY(-100%);
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

    .color-swatch {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      border: 1px solid #333;
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

    body.fullscreen .tessellation-container {
      padding: 0;
    }

    #tessellationSvg {
      width: 800px;
      height: 600px;
      touch-action: none;
      border: 2px solid #333;
      background: #f8f8f4;
    }

    body.fullscreen #tessellationSvg {
      border: none;
    }

    #fullscreenBtn {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 100;
      background: rgba(107, 91, 149, 0.9);
      border: none;
      padding: 8px 12px;
      font-size: 14px;
    }

    body.fullscreen #fullscreenBtn {
      top: 10px;
    }
  </style>
</head>
<body>
  <svg id="backgroundSvg" preserveAspectRatio="xMidYMid slice"></svg>
  <button id="fullscreenBtn">⛶</button>
  <div class="controls-overlay" id="controlsOverlay">
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
      <input type="number" id="frameSpeed" value="666" min="1" max="999" step="1">
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
      <button id="oscToggle">ON</button>
    </div>

    <div class="control-group">
      <span class="control-label">Zoom</span>
      <span class="info-display" id="zoomLevel">100%</span>
    </div>

    <div class="control-group">
      <button id="exportGif" class="secondary">GIF</button>
    </div>
  </div>

  <div class="tessellation-container" id="container">
    <svg id="tessellationSvg" preserveAspectRatio="xMidYMid meet"></svg>
  </div>

  <script>
    // Constants
    const TRI_SIZE = 32;
    const TRI_HEIGHT = TRI_SIZE * Math.sqrt(3) / 2;
    const COLS = 9;
    const BASE_ROWS = 3;

    // Alphabet
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Row colors for polyhedron (by row position)
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

    // State - Default to Single mode with Auto ON
    let currentPhrase = ${JSON.stringify(initialPhrase)};
    let currentCombo = ${JSON.stringify(initialCombo)};
    let currentConfigIndex = 0;
    let currentVariation = 0;
    let isPlaying = true;
    let animationTimer = null;
    let frameSpeed = 666;
    let displayMode = 'single';
    let configDirection = 1;
    let loopMode = 0;

    // Self-oscillator (Auto) state - DEFAULT ON
    let oscActive = true;

    // Zoom and pan state
    let scale = 1.0;
    let panX = 0;
    let panY = 0;
    let initialDistance = 0;
    let initialScale = 1;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartPanX = 0;
    let dragStartPanY = 0;

    // Fullscreen state
    let isFullscreen = false;

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
            row,
            col,
            pointing: col % 2 === 0 ? 'up' : 'down',
            index: row * COLS + col,
            polyhedronRow: row
          });
        }
      }
      return triangles;
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
        if (xFlipRows.includes(finalRow)) {
          pointing = pointing === 'up' ? 'down' : 'up';
        }
        let letterRow = variation === 1 ? (BASE_ROWS - 1 - t.row) : t.row;
        let letterIndex = letterRow * COLS + t.col;
        allTriangles.push({
          ...t,
          pointing,
          x,
          y,
          index: letterIndex,
          polyhedronRow: letterRow,
          yMirror: false
        });
      });

      base.forEach(t => {
        const mirroredRow = BASE_ROWS - 1 - t.row;
        const x = t.col * (TRI_SIZE / 2);
        const finalRow = BASE_ROWS + mirroredRow;
        const y = finalRow * TRI_HEIGHT;
        let pointing = t.pointing;
        if (xFlipRows.includes(finalRow)) {
          pointing = pointing === 'up' ? 'down' : 'up';
        }
        let letterRow = variation === 1 ? (BASE_ROWS - 1 - t.row) : t.row;
        let letterIndex = letterRow * COLS + t.col;
        allTriangles.push({
          ...t,
          pointing,
          x,
          y,
          index: letterIndex,
          polyhedronRow: letterRow,
          yMirror: false
        });
      });

      return allTriangles;
    }

    function buildSingle(variation) {
      const base = generateBasePolyhedron();
      const allTriangles = [];
      const xFlipRows = [0, 2];

      base.forEach(t => {
        const x = t.col * (TRI_SIZE / 2);
        const y = t.row * TRI_HEIGHT;
        let pointing = t.pointing;
        if (xFlipRows.includes(t.row)) {
          pointing = pointing === 'up' ? 'down' : 'up';
        }
        pointing = pointing === 'up' ? 'down' : 'up';
        let letterIndex = t.index;
        let letterRow = t.polyhedronRow;
        if (variation === 1) {
          const flippedRow = BASE_ROWS - 1 - t.row;
          letterIndex = flippedRow * COLS + t.col;
          letterRow = flippedRow;
        }
        allTriangles.push({
          ...t,
          pointing,
          x,
          y,
          index: letterIndex,
          polyhedronRow: letterRow,
          yMirror: false
        });
      });

      return allTriangles;
    }

    function buildQuadMirrored(variation) {
      const base = generateBasePolyhedron();
      const allTriangles = [];
      const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
      const xFlipRows = [0, 2, 4];
      const columns = [
        { colIndex: 0, yMirror: true },
        { colIndex: 1, yMirror: false }
      ];

      columns.forEach(({ colIndex, yMirror }) => {
        base.forEach(t => {
          let col = t.col;
          let pointing = t.pointing;
          let row, polyRow;
          if (variation === 0) {
            row = t.row;
            polyRow = t.polyhedronRow;
          } else {
            row = BASE_ROWS - 1 - t.row;
            polyRow = BASE_ROWS - 1 - t.polyhedronRow;
          }
          if (yMirror) {
            col = COLS - 1 - col;
            pointing = pointing === 'up' ? 'down' : 'up';
          }
          if (xFlipRows.includes(row)) {
            pointing = pointing === 'up' ? 'down' : 'up';
          }
          const x = colIndex * polyWidth + col * (TRI_SIZE / 2);
          const y = row * TRI_HEIGHT;
          allTriangles.push({
            ...t,
            col,
            pointing,
            polyhedronRow: polyRow,
            x,
            y,
            yMirror,
            section: 'top'
          });
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
          if (yMirror) {
            col = COLS - 1 - col;
            pointing = pointing === 'up' ? 'down' : 'up';
          }
          if (xFlipRows.includes(row)) {
            pointing = pointing === 'up' ? 'down' : 'up';
          }
          const x = colIndex * polyWidth + col * (TRI_SIZE / 2);
          const y = row * TRI_HEIGHT;
          allTriangles.push({
            ...t,
            col,
            pointing,
            polyhedronRow: polyRow,
            x,
            y,
            yMirror,
            section: 'bottom'
          });
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
          columns = yFlipAll
            ? [{ colIndex: 0, yMirror: true }, { colIndex: 1, yMirror: false }]
            : [{ colIndex: 0, yMirror: false }, { colIndex: 1, yMirror: true }];
        } else {
          columns = yFlipAll
            ? [{ colIndex: 0, yMirror: false }, { colIndex: 1, yMirror: true }]
            : [{ colIndex: 0, yMirror: true }, { colIndex: 1, yMirror: false }];
        }

        columns.forEach(({ colIndex, yMirror }) => {
          base.forEach(t => {
            let col = t.col;
            let pointing = t.pointing;
            let row, polyRow;
            if (variation === 0) {
              row = t.row;
              polyRow = t.polyhedronRow;
            } else {
              row = BASE_ROWS - 1 - t.row;
              polyRow = BASE_ROWS - 1 - t.polyhedronRow;
            }
            if (yMirror) {
              col = COLS - 1 - col;
              pointing = pointing === 'up' ? 'down' : 'up';
            }
            if (xFlipRows.includes(row)) {
              pointing = pointing === 'up' ? 'down' : 'up';
            }
            if (xFlipAll) {
              pointing = pointing === 'up' ? 'down' : 'up';
            }
            const x = quadXOffset + colIndex * polyWidth + col * (TRI_SIZE / 2);
            const y = quadYOffset + row * TRI_HEIGHT;
            allTriangles.push({
              ...t,
              col,
              pointing,
              polyhedronRow: polyRow,
              x,
              y,
              yMirror,
              section: 'top'
            });
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
            if (yMirror) {
              col = COLS - 1 - col;
              pointing = pointing === 'up' ? 'down' : 'up';
            }
            if (xFlipRows.includes(row)) {
              pointing = pointing === 'up' ? 'down' : 'up';
            }
            if (xFlipAll) {
              pointing = pointing === 'up' ? 'down' : 'up';
            }
            const x = quadXOffset + colIndex * polyWidth + col * (TRI_SIZE / 2);
            const y = quadYOffset + row * TRI_HEIGHT;
            allTriangles.push({
              ...t,
              col,
              pointing,
              polyhedronRow: polyRow,
              x,
              y,
              yMirror,
              section: 'bottom'
            });
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
            columns = yFlipAll
              ? [{ colIndex: 0, yMirror: true }, { colIndex: 1, yMirror: false }]
              : [{ colIndex: 0, yMirror: false }, { colIndex: 1, yMirror: true }];
          } else {
            columns = yFlipAll
              ? [{ colIndex: 0, yMirror: false }, { colIndex: 1, yMirror: true }]
              : [{ colIndex: 0, yMirror: true }, { colIndex: 1, yMirror: false }];
          }

          columns.forEach(({ colIndex, yMirror }) => {
            base.forEach(t => {
              let col = t.col;
              let pointing = t.pointing;
              let row, polyRow;
              if (variation === 0) {
                row = t.row;
                polyRow = t.polyhedronRow;
              } else {
                row = BASE_ROWS - 1 - t.row;
                polyRow = BASE_ROWS - 1 - t.polyhedronRow;
              }
              if (yMirror) {
                col = COLS - 1 - col;
                pointing = pointing === 'up' ? 'down' : 'up';
              }
              if (xFlipRows.includes(row)) {
                pointing = pointing === 'up' ? 'down' : 'up';
              }
              if (xFlipAll) {
                pointing = pointing === 'up' ? 'down' : 'up';
              }
              if (globalXFlip) {
                pointing = pointing === 'up' ? 'down' : 'up';
              }
              const x = quadXOffset + colIndex * polyWidth + col * (TRI_SIZE / 2);
              const y = quadYOffset + row * TRI_HEIGHT;
              allTriangles.push({
                ...t,
                col,
                pointing,
                polyhedronRow: polyRow,
                x,
                y,
                yMirror,
                section: 'top'
              });
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
              if (yMirror) {
                col = COLS - 1 - col;
                pointing = pointing === 'up' ? 'down' : 'up';
              }
              if (xFlipRows.includes(row)) {
                pointing = pointing === 'up' ? 'down' : 'up';
              }
              if (xFlipAll) {
                pointing = pointing === 'up' ? 'down' : 'up';
              }
              if (globalXFlip) {
                pointing = pointing === 'up' ? 'down' : 'up';
              }
              const x = quadXOffset + colIndex * polyWidth + col * (TRI_SIZE / 2);
              const y = quadYOffset + row * TRI_HEIGHT;
              allTriangles.push({
                ...t,
                col,
                pointing,
                polyhedronRow: polyRow,
                x,
                y,
                yMirror,
                section: 'bottom'
              });
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
          if (shouldXFlip) {
            newPointing = tri.pointing === 'up' ? 'down' : 'up';
          }
          allTriangles.push({
            ...tri,
            x: tri.x + xOffset,
            y: tri.y,
            pointing: newPointing,
            gridIndex: gridIndex
          });
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
          if (shouldXFlip) {
            newPointing = tri.pointing === 'up' ? 'down' : 'up';
          }
          allTriangles.push({
            ...tri,
            x: tri.x,
            y: tri.y + yOffset,
            pointing: newPointing,
            rowIndex: rowIndex
          });
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

    // Calculate scale to fit content in viewport
    function calculateFitScale(totalWidth, totalHeight) {
      const container = document.getElementById('container');
      const containerWidth = container.clientWidth - 40;
      const containerHeight = container.clientHeight - 40;
      const scaleX = containerWidth / totalWidth;
      const scaleY = containerHeight / totalHeight;
      return Math.min(scaleX, scaleY, 2.0);
    }

    function render() {
      const svg = document.getElementById('tessellationSvg');
      const config = CONFIGS[CONFIG_KEYS[currentConfigIndex]];
      const color = getColor();
      const letterData = getLetterFrequency(currentPhrase);

      document.getElementById('configName').textContent = config.name;
      const varName = currentVariation === 0 ? 'Normal' : 'Inverted';
      document.getElementById('variationName').textContent = varName;
      document.getElementById('zoomLevel').textContent = \`\${Math.round(scale * 100)}%\`;

      let triangles;
      let totalWidth, totalHeight;
      const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;

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
        const GAP = 0;
        const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
        const octaHeight = quadHeight * 2 + GAP;
        const squareWidth = polyWidth * 4;
        const squareHeight = octaHeight * 2 + GAP;
        const rectangleWidth = squareWidth * 4 + GAP * 3;
        const rectangleHeight = squareHeight;
        totalWidth = rectangleWidth;
        totalHeight = rectangleHeight * 4 + GAP * 3;
      } else if (displayMode === 'rectangle') {
        triangles = buildRectangle(currentVariation);
        const GAP = 0;
        const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
        const octaHeight = quadHeight * 2 + GAP;
        const squareWidth = polyWidth * 4;
        const squareHeight = octaHeight * 2 + GAP;
        totalWidth = squareWidth * 4 + GAP * 3;
        totalHeight = squareHeight;
      } else if (displayMode === 'square') {
        triangles = buildSquare(currentVariation);
        const GAP = 0;
        const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
        const octaHeight = quadHeight * 2 + GAP;
        totalWidth = polyWidth * 4;
        totalHeight = octaHeight * 2 + GAP;
      } else if (displayMode === 'octa') {
        triangles = buildOcta(currentVariation);
        const GAP = 0;
        totalWidth = polyWidth * 4;
        totalHeight = BASE_ROWS * 4 * TRI_HEIGHT + GAP;
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
        const letterColor = getLetterColor(tri.polyhedronRow);
        const isInPhrase = isLetterInPhrase(symbol, letterData);
        const fill = isInPhrase ? color.hex : '#f8f8f4';
        const fillOpacity = isInPhrase ? letterOpacity : 0.08;
        const path = getTrianglePath(tri.x, tri.y, tri.pointing);
        svgContent += \`<path d="\${path}" fill="\${fill}" fill-opacity="\${fillOpacity}" stroke="#333" stroke-width="1"/>\`;
        const textX = tri.x + TRI_SIZE / 2;
        const textY = tri.y + (tri.pointing === 'up' ? TRI_HEIGHT * 0.6 : TRI_HEIGHT * 0.4);
        const textColor = isInPhrase ? '#ffffff' : '#000000';
        svgContent += \`<text x="\${textX}" y="\${textY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="9" font-weight="bold" fill="\${textColor}" fill-opacity="\${letterOpacity}">\${symbol}</text>\`;
      });

      svg.innerHTML = svgContent;
    }

    function getVariationCount() {
      return 2;
    }

    const MODE_ORDER = ['single', 'dual', 'quad', 'octa', 'square', 'rectangle', 'cube'];
    let oscModeDirection = 1;

    function animate() {
      if (!isPlaying) return;

      const varCount = getVariationCount();
      let configChanged = false;
      let newConfigIndex = currentConfigIndex;

      if (varCount > 1) {
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
      } else {
        newConfigIndex = currentConfigIndex + configDirection;
        configChanged = true;
      }

      if (configChanged) {
        if (newConfigIndex >= CONFIG_KEYS.length || newConfigIndex < 0) {
          if (loopMode === 0) {
            const wasGoingBackward = configDirection === -1;
            configDirection *= -1;
            newConfigIndex = currentConfigIndex + configDirection;
            if (varCount > 1) {
              currentVariation += configDirection * 2;
              if (currentVariation < 0) currentVariation = varCount - 1;
              if (currentVariation >= varCount) currentVariation = 0;
            }

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
              // Auto-fit zoom when mode changes
              updateScaleForMode();
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

    function updateScaleForMode() {
      const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
      const GAP = 0;
      const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
      const octaHeight = quadHeight * 2 + GAP;
      let totalWidth, totalHeight;

      if (displayMode === 'single') {
        totalWidth = polyWidth;
        totalHeight = BASE_ROWS * TRI_HEIGHT;
      } else if (displayMode === 'dual') {
        totalWidth = polyWidth;
        totalHeight = BASE_ROWS * 2 * TRI_HEIGHT;
      } else if (displayMode === 'cube') {
        const squareWidth = polyWidth * 4;
        const squareHeight = octaHeight * 2 + GAP;
        totalWidth = squareWidth * 4 + GAP * 3;
        totalHeight = squareHeight * 4 + GAP * 3;
      } else if (displayMode === 'rectangle') {
        const squareWidth = polyWidth * 4;
        const squareHeight = octaHeight * 2 + GAP;
        totalWidth = squareWidth * 4 + GAP * 3;
        totalHeight = squareHeight;
      } else if (displayMode === 'square') {
        totalWidth = polyWidth * 4;
        totalHeight = octaHeight * 2 + GAP;
      } else if (displayMode === 'octa') {
        totalWidth = polyWidth * 4;
        totalHeight = BASE_ROWS * 4 * TRI_HEIGHT + GAP;
      } else {
        totalWidth = polyWidth * 2;
        totalHeight = BASE_ROWS * 2 * TRI_HEIGHT;
      }

      scale = calculateFitScale(totalWidth, totalHeight);
    }

    function getTotalVariationIndex() {
      const varCount = getVariationCount();
      return currentConfigIndex * varCount + currentVariation;
    }

    function setFromTotalVariationIndex(idx) {
      const varCount = getVariationCount();
      const total = CONFIG_KEYS.length * varCount;
      idx = ((idx % total) + total) % total;
      currentConfigIndex = Math.floor(idx / varCount);
      currentVariation = idx % varCount;
    }

    function getDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    const container = document.getElementById('container');

    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = getDistance(e.touches);
        initialScale = scale;
      }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        const newScale = initialScale * (currentDistance / initialDistance);
        const minZoom = 0.1;
        scale = Math.max(minZoom, Math.min(5, newScale));
        render();
      }
    }, { passive: false });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const minZoom = 0.1;
      scale = Math.max(minZoom, Math.min(5, scale * zoomFactor));
      render();
    }, { passive: false });

    container.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartPanX = panX;
        dragStartPanY = panY;
        container.style.cursor = 'grabbing';
      }
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

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        container.style.cursor = '';
      }
    });

    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
        dragStartPanX = panX;
        dragStartPanY = panY;
      }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        const svg = document.getElementById('tessellationSvg');
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.getAttribute('viewBox').split(' ').map(Number);
        const scaleX = viewBox[2] / rect.width;
        const scaleY = viewBox[3] / rect.height;
        panX = dragStartPanX - (e.touches[0].clientX - dragStartX) * scaleX;
        panY = dragStartPanY - (e.touches[0].clientY - dragStartY) * scaleY;
        render();
      }
    }, { passive: true });

    container.addEventListener('touchend', () => {
      isDragging = false;
    }, { passive: true });

    document.getElementById('playPause').addEventListener('click', () => {
      isPlaying = !isPlaying;
      document.getElementById('playPause').textContent = isPlaying ? '⏸' : '▶';
      if (isPlaying) animate();
      else if (animationTimer) clearTimeout(animationTimer);
    });

    document.getElementById('prevVar').addEventListener('click', () => {
      const varCount = getVariationCount();
      if (varCount > 1) {
        setFromTotalVariationIndex(getTotalVariationIndex() - 1);
      } else {
        currentConfigIndex = (currentConfigIndex - 1 + CONFIG_KEYS.length) % CONFIG_KEYS.length;
      }
      render();
    });

    document.getElementById('nextVar').addEventListener('click', () => {
      const varCount = getVariationCount();
      if (varCount > 1) {
        setFromTotalVariationIndex(getTotalVariationIndex() + 1);
      } else {
        currentConfigIndex = (currentConfigIndex + 1) % CONFIG_KEYS.length;
      }
      render();
    });

    document.getElementById('loopBtn').addEventListener('click', () => {
      loopMode = (loopMode + 1) % 3;
      const btn = document.getElementById('loopBtn');
      if (loopMode === 0) {
        btn.textContent = 'LOOP';
        btn.style.background = '';
        btn.style.color = '';
        configDirection = 1;
      } else if (loopMode === 1) {
        btn.textContent = 'LOOP 1';
        btn.style.background = '#6b5b95';
        btn.style.color = '#ffffff';
        configDirection = 1;
        if (oscActive) stopOsc();
      } else {
        btn.textContent = 'LOOP 2';
        btn.style.background = '#6b5b95';
        btn.style.color = '#ffffff';
        configDirection = -1;
        if (oscActive) stopOsc();
      }
    });

    function aikBekarToMs(value) {
      if (value <= 0) return 666;
      const numDigits = Math.floor(Math.log10(value)) + 1;
      const digit = Math.floor(value / Math.pow(10, numDigits - 1));
      const mirroredDigit = 10 - digit;
      const mirroredValue = mirroredDigit * value / digit;
      if (numDigits >= 4) {
        return mirroredValue / Math.pow(10, numDigits - 1);
      } else if (numDigits === 3) {
        return mirroredValue / 10;
      } else if (numDigits === 2) {
        return mirroredValue * 10 + mirroredDigit;
      } else {
        return mirroredValue * 1111;
      }
    }

    function startOsc() {
      oscModeDirection = 1;
      oscActive = true;
      const btn = document.getElementById('oscToggle');
      btn.textContent = 'ON';
      btn.style.background = '#6b5b95';
      btn.style.color = '#ffffff';

      loopMode = 0;
      configDirection = 1;
      const loopBtn = document.getElementById('loopBtn');
      loopBtn.textContent = 'LOOP';
      loopBtn.style.background = '';
      loopBtn.style.color = '';

      if (!isPlaying) {
        isPlaying = true;
        document.getElementById('playPause').textContent = '⏸';
        animate();
      }
    }

    function stopOsc() {
      oscActive = false;
      const btn = document.getElementById('oscToggle');
      btn.textContent = 'OFF';
      btn.style.background = '';
      btn.style.color = '';
    }

    document.getElementById('oscToggle').addEventListener('click', () => {
      if (oscActive) {
        stopOsc();
      } else {
        startOsc();
      }
    });

    document.getElementById('phraseSelect').addEventListener('change', (e) => {
      const [phrase, combo] = e.target.value.split('|');
      currentPhrase = phrase;
      currentCombo = combo.split('/').map(Number);

      const aikBekarValue = currentCombo[currentCombo.length - 1];
      frameSpeed = aikBekarToMs(aikBekarValue);
      document.getElementById('frameSpeed').value = parseFloat(frameSpeed.toPrecision(4));

      render();
      renderBackground();
      updateBackgroundSpeed();
    });

    document.getElementById('displayMode').addEventListener('change', (e) => {
      displayMode = e.target.value;
      currentVariation = 0;
      panX = 0;
      panY = 0;
      updateScaleForMode();
      render();
      if (isPlaying && animationTimer) {
        clearTimeout(animationTimer);
        animationTimer = setTimeout(animate, frameSpeed);
      }
    });

    document.getElementById('frameSpeed').addEventListener('input', (e) => {
      frameSpeed = Math.min(999, Math.max(1, parseFloat(e.target.value) || 666));
      if (isPlaying && animationTimer) {
        clearTimeout(animationTimer);
        animationTimer = setTimeout(animate, frameSpeed);
      }
      updateBackgroundSpeed();
    });

    // Fullscreen toggle
    document.getElementById('fullscreenBtn').addEventListener('click', () => {
      isFullscreen = !isFullscreen;
      document.body.classList.toggle('fullscreen', isFullscreen);
      document.getElementById('controlsOverlay').classList.toggle('hidden', isFullscreen);
      document.getElementById('fullscreenBtn').textContent = isFullscreen ? '⛶' : '⛶';
      updateScaleForMode();
      render();
    });

    function generateFrameSvg(configIdx, variation, width, height) {
      const config = CONFIGS[CONFIG_KEYS[configIdx]];
      const color = getColor();
      const letterData = getLetterFrequency(currentPhrase);

      let triangles;
      if (displayMode === 'single') {
        triangles = buildSingle(variation);
      } else if (displayMode === 'dual') {
        triangles = buildDualStacked(variation);
      } else if (displayMode === 'cube') {
        triangles = buildCube(variation);
      } else if (displayMode === 'rectangle') {
        triangles = buildRectangle(variation);
      } else if (displayMode === 'square') {
        triangles = buildSquare(variation);
      } else if (displayMode === 'octa') {
        triangles = buildOcta(variation);
      } else {
        triangles = buildQuadMirrored(variation);
      }

      let svgContent = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \${width} \${height}" width="\${width}" height="\${height}">\`;
      svgContent += \`<rect x="0" y="0" width="\${width}" height="\${height}" fill="#f8f8f4"/>\`;

      triangles.forEach(tri => {
        const symbol = config.getSymbol(tri.index % 27);
        const letterOpacity = getLetterOpacity(symbol, letterData);
        const isInPhrase = isLetterInPhrase(symbol, letterData);
        const fill = isInPhrase ? color.hex : '#f8f8f4';
        const fillOpacity = isInPhrase ? letterOpacity : 0.08;
        const path = getTrianglePath(tri.x, tri.y, tri.pointing);
        svgContent += \`<path d="\${path}" fill="\${fill}" fill-opacity="\${fillOpacity}" stroke="#333" stroke-width="1"/>\`;
        const textX = tri.x + TRI_SIZE / 2;
        const textY = tri.y + (tri.pointing === 'up' ? TRI_HEIGHT * 0.6 : TRI_HEIGHT * 0.4);
        const textColor = isInPhrase ? '#ffffff' : '#000000';
        svgContent += \`<text x="\${textX}" y="\${textY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="9" font-weight="bold" fill="\${textColor}" fill-opacity="\${letterOpacity}">\${symbol}</text>\`;
      });

      svgContent += '</svg>';
      return svgContent;
    }

    function getModeDimensions(mode) {
      const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
      const GAP = 0;
      const quadHeight = BASE_ROWS * 2 * TRI_HEIGHT;
      const octaHeight = quadHeight * 2 + GAP;

      if (mode === 'single') return { width: polyWidth, height: BASE_ROWS * TRI_HEIGHT };
      if (mode === 'dual') return { width: polyWidth, height: BASE_ROWS * 2 * TRI_HEIGHT };
      if (mode === 'quad') return { width: polyWidth * 2, height: BASE_ROWS * 2 * TRI_HEIGHT };
      if (mode === 'octa') return { width: polyWidth * 4, height: quadHeight * 2 + GAP };
      if (mode === 'square') return { width: polyWidth * 4, height: octaHeight * 2 + GAP };
      if (mode === 'rectangle') {
        const squareWidth = polyWidth * 4;
        const squareHeight = octaHeight * 2 + GAP;
        return { width: squareWidth * 4 + GAP * 3, height: squareHeight };
      }
      const squareWidth = polyWidth * 4;
      const squareHeight = octaHeight * 2 + GAP;
      const rectangleWidth = squareWidth * 4 + GAP * 3;
      const rectangleHeight = squareHeight;
      return { width: rectangleWidth, height: rectangleHeight * 4 + GAP * 3 };
    }

    document.getElementById('exportGif').addEventListener('click', async () => {
      const btn = document.getElementById('exportGif');
      const originalText = btn.textContent;
      btn.textContent = '...';
      btn.disabled = true;

      try {
        const varCount = 2;
        const framesPerMode = CONFIG_KEYS.length * varCount;

        let frameSequence = [];
        let modeSequence = [];

        if (oscActive) {
          const forwardModes = [...MODE_ORDER];
          const backwardModes = [...MODE_ORDER].reverse().slice(1, -1);
          const allModes = [...forwardModes, ...backwardModes];

          allModes.forEach(mode => {
            for (let i = 0; i < framesPerMode; i++) {
              frameSequence.push(i);
              modeSequence.push(mode);
            }
            for (let i = framesPerMode - 2; i > 0; i--) {
              frameSequence.push(i);
              modeSequence.push(mode);
            }
          });
        } else {
          if (loopMode === 2) {
            for (let i = framesPerMode - 1; i >= 0; i--) {
              frameSequence.push(i);
              modeSequence.push(displayMode);
            }
          } else if (loopMode === 1) {
            for (let i = 0; i < framesPerMode; i++) {
              frameSequence.push(i);
              modeSequence.push(displayMode);
            }
          } else {
            for (let i = 0; i < framesPerMode; i++) {
              frameSequence.push(i);
              modeSequence.push(displayMode);
            }
            for (let i = framesPerMode - 2; i > 0; i--) {
              frameSequence.push(i);
              modeSequence.push(displayMode);
            }
          }
        }

        const canvasMode = oscActive ? 'cube' : displayMode;
        const dims = getModeDimensions(canvasMode);
        const width = Math.round(dims.width);
        const height = Math.round(dims.height);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const savedDisplayMode = displayMode;

        const frames = [];
        for (let i = 0; i < frameSequence.length; i++) {
          const frameIdx = frameSequence[i];
          const mode = modeSequence[i];
          const configIdx = Math.floor(frameIdx / varCount);
          const variation = frameIdx % varCount;

          displayMode = mode;
          const modeDims = getModeDimensions(mode);

          const svgData = generateFrameSvg(configIdx, variation, modeDims.width, modeDims.height);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);

          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              ctx.fillStyle = '#f8f8f4';
              ctx.fillRect(0, 0, width, height);
              const offsetX = (width - modeDims.width) / 2;
              const offsetY = (height - modeDims.height) / 2;
              ctx.drawImage(img, offsetX, offsetY, modeDims.width, modeDims.height);
              frames.push(ctx.getImageData(0, 0, width, height));
              URL.revokeObjectURL(url);
              resolve();
            };
            img.onerror = reject;
            img.src = url;
          });
        }

        displayMode = savedDisplayMode;

        const gif = encodeGif(frames, width, height, Math.round(frameSpeed / 10));

        const blob = new Blob([gif], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const modeLabel = oscActive ? 'auto' : savedDisplayMode;
        a.download = \`gematria-\${currentPhrase.split(' ')[0]}-\${modeLabel}.gif\`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('GIF export error:', err);
        alert('Error creating GIF: ' + err.message);
      }

      btn.textContent = originalText;
      btn.disabled = false;
    });

    function encodeGif(frames, width, height, delay) {
      const buf = [];
      const write = (b) => buf.push(b);
      const writeStr = (s) => { for (let i = 0; i < s.length; i++) write(s.charCodeAt(i)); };
      const writeShort = (v) => { write(v & 0xff); write((v >> 8) & 0xff); };

      const colorCounts = new Map();

      frames.forEach(frame => {
        for (let i = 0; i < frame.data.length; i += 4) {
          const r = frame.data[i] & 0xf8;
          const g = frame.data[i+1] & 0xf8;
          const b = frame.data[i+2] & 0xf8;
          const key = (r << 16) | (g << 8) | b;
          colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
        }
      });

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

      const findNearest = (r, g, b) => {
        const qr = r & 0xf8, qg = g & 0xf8, qb = b & 0xf8;
        const key = (qr << 16) | (qg << 8) | qb;
        if (colorMap.has(key)) return colorMap.get(key);

        let minDist = Infinity, closest = 0;
        for (let i = 0; i < colors.length; i++) {
          const dr = r - colors[i][0], dg = g - colors[i][1], db = b - colors[i][2];
          const dist = dr*dr + dg*dg + db*db;
          if (dist < minDist) { minDist = dist; closest = i; }
        }
        return closest;
      };

      writeStr('GIF89a');
      writeShort(width);
      writeShort(height);
      write(0xf7);
      write(0);
      write(0);

      colors.forEach(([r, g, b]) => { write(r); write(g); write(b); });

      write(0x21); write(0xff); write(0x0b);
      writeStr('NETSCAPE2.0');
      write(0x03); write(0x01);
      writeShort(0);
      write(0x00);

      frames.forEach(frame => {
        write(0x21); write(0xf9); write(0x04);
        write(0x00);
        writeShort(delay);
        write(0x00); write(0x00);

        write(0x2c);
        writeShort(0); writeShort(0);
        writeShort(width); writeShort(height);
        write(0x00);

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

      write(0x3b);
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
          bgColumns.push({
            direction: goingUp ? -1 : 1,
            offset: baseOffset - stagger,
            yFlip: yFlip,
            xPos: col * tileWidth,
            tileWidth: tileWidth
          });
        }
      }

      for (let col = 0; col < tilesX; col++) {
        const xPos = col * tileWidth;
        const yFlip = col % 2 === 1;
        const flipTransform = yFlip ? \`translate(\${2 * xPos + tileWidth}, 0) scale(-1, 1)\` : '';
        svgContent += \`<g id="bgCol\${col}" \${yFlip ? \`transform="\${flipTransform}"\` : ''}>\`;
        for (let row = -1; row < tilesY; row++) {
          const yPos = row * bgTileHeight;
          svgContent += \`<use href="#tile" x="\${xPos}" y="\${yPos}"/>\`;
        }
        svgContent += \`</g>\`;
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

        const colEl = document.getElementById(\`bgCol\${i}\`);
        if (colEl) {
          if (col.yFlip) {
            colEl.setAttribute('transform', \`translate(\${2 * col.xPos + col.tileWidth}, \${col.offset}) scale(-1, 1)\`);
          } else {
            colEl.setAttribute('transform', \`translate(0, \${col.offset})\`);
          }
        }
      });

      bgAnimationId = requestAnimationFrame(animateBackground);
    }

    function updateBackgroundSpeed() {}

    window.addEventListener('resize', () => {
      updateScaleForMode();
      render();
      renderBackground();
    });

    // Initialize with aik bekar speed and Auto ON
    const initialAikBekar = currentCombo[currentCombo.length - 1];
    frameSpeed = aikBekarToMs(initialAikBekar);
    document.getElementById('frameSpeed').value = parseFloat(frameSpeed.toPrecision(4));

    // Set Auto button to ON state visually
    const oscBtn = document.getElementById('oscToggle');
    oscBtn.style.background = '#6b5b95';
    oscBtn.style.color = '#ffffff';

    // Initialize with fit-to-frame zoom
    setTimeout(() => {
      updateScaleForMode();
      render();
      renderBackground();
      animate();
    }, 100);
  <\/script>
</body>
</html>`;

    return htmlContent;
  };

  // Tessellation rendering constants (for GIF generation)
  const TRI_SIZE = 32;
  const TRI_HEIGHT = TRI_SIZE * Math.sqrt(3) / 2;
  const COLS = 9;
  const BASE_ROWS = 3;
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const ROW_COLORS = { 0: '#c41e3a', 1: '#2e8b57', 2: '#1e4d8c' };

  const CONFIGS = {
    'a-*-z': { name: 'a-*-z', getSymbol: (pos) => pos < 13 ? ALPHABET[pos] : pos === 13 ? '*' : ALPHABET[pos - 1] },
    '*-a-z': { name: '*-a-z', getSymbol: (pos) => pos === 0 ? '*' : ALPHABET[pos - 1] },
    'a-z-*': { name: 'a-z-*', getSymbol: (pos) => pos === 26 ? '*' : ALPHABET[pos] },
    'z-*-a': { name: 'z-*-a', getSymbol: (pos) => pos < 13 ? ALPHABET[25 - pos] : pos === 13 ? '*' : ALPHABET[25 - (pos - 1)] },
    '*-z-a': { name: '*-z-a', getSymbol: (pos) => pos === 0 ? '*' : ALPHABET[26 - pos] },
    'z-a-*': { name: 'z-a-*', getSymbol: (pos) => pos === 26 ? '*' : ALPHABET[25 - pos] }
  };
  const CONFIG_KEYS = Object.keys(CONFIGS);

  const comboToCMYK = (combo) => {
    const toPercent = (val) => Math.round((val % 1000) / 10);
    return { c: toPercent(combo[0]), m: toPercent(combo[1]), y: toPercent(combo[2]), k: toPercent(combo[3]) };
  };

  const cmykToRgb = (c, m, y, k) => {
    c /= 100; m /= 100; y /= 100; k /= 100;
    return { r: Math.round(255 * (1 - c) * (1 - k)), g: Math.round(255 * (1 - m) * (1 - k)), b: Math.round(255 * (1 - y) * (1 - k)) };
  };

  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

  const getLetterFrequency = (phrase) => {
    const freq = {};
    const cleanPhrase = phrase.toUpperCase().replace(/[^A-Z]/g, '');
    for (const char of cleanPhrase) freq[char] = (freq[char] || 0) + 1;
    const maxFreq = Math.max(...Object.values(freq), 1);
    return { freq, maxFreq, totalLetters: cleanPhrase.length };
  };

  const getLetterOpacity = (symbol, letterData) => {
    if (symbol === '*') return 0.15;
    const count = letterData.freq[symbol] || 0;
    if (count === 0) return 0.15;
    return 0.3 + (count / letterData.maxFreq) * 0.7;
  };

  const generateBasePolyhedron = () => {
    const triangles = [];
    for (let row = 0; row < BASE_ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        triangles.push({ row, col, pointing: col % 2 === 0 ? 'up' : 'down', index: row * COLS + col, polyhedronRow: row });
      }
    }
    return triangles;
  };

  const buildSingle = (variation) => {
    const base = generateBasePolyhedron();
    const allTriangles = [];
    const xFlipRows = [0, 2];
    base.forEach(t => {
      const x = t.col * (TRI_SIZE / 2);
      const y = t.row * TRI_HEIGHT;
      let pointing = t.pointing;
      if (xFlipRows.includes(t.row)) pointing = pointing === 'up' ? 'down' : 'up';
      pointing = pointing === 'up' ? 'down' : 'up';
      let letterIndex = t.index, letterRow = t.polyhedronRow;
      if (variation === 1) {
        const flippedRow = BASE_ROWS - 1 - t.row;
        letterIndex = flippedRow * COLS + t.col;
        letterRow = flippedRow;
      }
      allTriangles.push({ ...t, pointing, x, y, index: letterIndex, polyhedronRow: letterRow, yMirror: false });
    });
    return allTriangles;
  };

  const getTrianglePath = (x, y, pointing) => {
    const halfWidth = TRI_SIZE / 2;
    return pointing === 'up'
      ? `M ${x} ${y + TRI_HEIGHT} L ${x + halfWidth} ${y} L ${x + TRI_SIZE} ${y + TRI_HEIGHT} Z`
      : `M ${x} ${y} L ${x + TRI_SIZE} ${y} L ${x + halfWidth} ${y + TRI_HEIGHT} Z`;
  };

  const generateFrameSvg = (phrase, combo, configIndex, variation) => {
    const config = CONFIGS[CONFIG_KEYS[configIndex]];
    const cmyk = comboToCMYK(combo);
    const rgb = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
    const color = rgbToHex(rgb.r, rgb.g, rgb.b);
    const letterData = getLetterFrequency(phrase);

    const triangles = buildSingle(variation);
    const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
    const totalWidth = polyWidth;
    const totalHeight = BASE_ROWS * TRI_HEIGHT;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">`;
    svgContent += `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#f8f8f4"/>`;

    triangles.forEach(tri => {
      const symbol = config.getSymbol(tri.index % 27);
      const letterOpacity = getLetterOpacity(symbol, letterData);
      const isInPhrase = symbol !== '*' && (letterData.freq[symbol] || 0) > 0;
      const fill = isInPhrase ? color : '#f8f8f4';
      const fillOpacity = isInPhrase ? letterOpacity : 0.08;
      const path = getTrianglePath(tri.x, tri.y, tri.pointing);
      svgContent += `<path d="${path}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="#333" stroke-width="1"/>`;
      const textX = tri.x + TRI_SIZE / 2;
      const textY = tri.y + (tri.pointing === 'up' ? TRI_HEIGHT * 0.6 : TRI_HEIGHT * 0.4);
      const textColor = isInPhrase ? '#ffffff' : '#000000';
      svgContent += `<text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="9" font-weight="bold" fill="${textColor}" fill-opacity="${letterOpacity}">${symbol}</text>`;
    });

    svgContent += '</svg>';
    return { svg: svgContent, width: totalWidth, height: totalHeight };
  };

  const encodeGif = (frames, width, height, delay) => {
    const buf = [];
    const write = (b) => buf.push(b);
    const writeStr = (s) => { for (let i = 0; i < s.length; i++) write(s.charCodeAt(i)); };
    const writeShort = (v) => { write(v & 0xff); write((v >> 8) & 0xff); };

    const colorCounts = new Map();
    frames.forEach(frame => {
      for (let i = 0; i < frame.data.length; i += 4) {
        const r = frame.data[i] & 0xf8, g = frame.data[i+1] & 0xf8, b = frame.data[i+2] & 0xf8;
        const key = (r << 16) | (g << 8) | b;
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
      }
    });

    const sortedColors = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256).map(([key]) => key);
    const colorMap = new Map();
    const colors = [];
    sortedColors.forEach((key, idx) => {
      colorMap.set(key, idx);
      colors.push([(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff]);
    });
    while (colors.length < 256) colors.push([0, 0, 0]);

    const findNearest = (r, g, b) => {
      const qr = r & 0xf8, qg = g & 0xf8, qb = b & 0xf8;
      const key = (qr << 16) | (qg << 8) | qb;
      if (colorMap.has(key)) return colorMap.get(key);
      let minDist = Infinity, closest = 0;
      for (let i = 0; i < colors.length; i++) {
        const dr = r - colors[i][0], dg = g - colors[i][1], db = b - colors[i][2];
        const dist = dr*dr + dg*dg + db*db;
        if (dist < minDist) { minDist = dist; closest = i; }
      }
      return closest;
    };

    const lzwEncode = (pixels, minCodeSize) => {
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
        while (bitCount >= 8) { output.push(bits & 0xff); bits >>= 8; bitCount -= 8; }
      };
      emit(clearCode);
      if (pixels.length === 0) { emit(eoiCode); if (bitCount > 0) output.push(bits & 0xff); return output; }
      let prefix = String(pixels[0]);
      for (let i = 1; i < pixels.length; i++) {
        const suffix = String(pixels[i]);
        const combined = prefix + ',' + suffix;
        if (table.has(combined)) { prefix = combined; }
        else {
          emit(table.get(prefix));
          if (nextCode < 4096) { table.set(combined, nextCode++); if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++; }
          prefix = suffix;
        }
      }
      emit(table.get(prefix));
      emit(eoiCode);
      if (bitCount > 0) output.push(bits & 0xff);
      return output;
    };

    writeStr('GIF89a');
    writeShort(width);
    writeShort(height);
    write(0xf7); write(0); write(0);
    colors.forEach(([r, g, b]) => { write(r); write(g); write(b); });
    write(0x21); write(0xff); write(0x0b);
    writeStr('NETSCAPE2.0');
    write(0x03); write(0x01);
    writeShort(0);
    write(0x00);

    frames.forEach(frame => {
      write(0x21); write(0xf9); write(0x04);
      write(0x00);
      writeShort(delay);
      write(0x00); write(0x00);
      write(0x2c);
      writeShort(0); writeShort(0);
      writeShort(width); writeShort(height);
      write(0x00);
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

    write(0x3b);
    return new Uint8Array(buf);
  };

  const generateGifForPhrase = async (phrase, combo, frameSpeedMs) => {
    const varCount = 2;
    const framesPerConfig = varCount;
    const totalFrames = CONFIG_KEYS.length * framesPerConfig;

    const polyWidth = (COLS - 1) * (TRI_SIZE / 2) + TRI_SIZE;
    const width = Math.round(polyWidth);
    const height = Math.round(BASE_ROWS * TRI_HEIGHT);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const frames = [];

    // Forward through all configs and variations
    for (let configIdx = 0; configIdx < CONFIG_KEYS.length; configIdx++) {
      for (let variation = 0; variation < varCount; variation++) {
        const { svg } = generateFrameSvg(phrase, combo, configIdx, variation);
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            ctx.fillStyle = '#f8f8f4';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            frames.push(ctx.getImageData(0, 0, width, height));
            URL.revokeObjectURL(url);
            resolve();
          };
          img.onerror = reject;
          img.src = url;
        });
      }
    }

    // Reverse back through all configs and variations
    for (let configIdx = CONFIG_KEYS.length - 2; configIdx > 0; configIdx--) {
      for (let variation = varCount - 1; variation >= 0; variation--) {
        const { svg } = generateFrameSvg(phrase, combo, configIdx, variation);
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            ctx.fillStyle = '#f8f8f4';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            frames.push(ctx.getImageData(0, 0, width, height));
            URL.revokeObjectURL(url);
            resolve();
          };
          img.onerror = reject;
          img.src = url;
        });
      }
    }

    const delay = Math.round(frameSpeedMs / 10);
    const gifData = encodeGif(frames, width, height, delay);
    return gifData;
  };

  const aikBekarToMs = (aikBekar) => Math.max(50, Math.min(999, Math.round(aikBekar * 6)));

  const downloadPhraseTable = async () => {
    if (generatedPhrases.length === 0) {
      alert('No phrases generated yet!');
      return;
    }

    setDownloading(true);
    setDownloadProgress('Preparing download...');

    try {
      const sorted = [...generatedPhrases].sort((a, b) => {
        if ((a.aiqBekar || 0) !== (b.aiqBekar || 0)) return (a.aiqBekar || 0) - (b.aiqBekar || 0);
        return a.hebrew - b.hebrew;
      });

      const zip = new JSZip();

      // Generate HTML content
      setDownloadProgress('Generating HTML...');
      const htmlContent = generateHtmlContent(sorted);
      zip.file('gematria-tessellation.html', htmlContent);

      // Generate GIFs for each phrase
      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        setDownloadProgress(`Generating GIF ${i + 1}/${sorted.length}: ${p.phrase.substring(0, 20)}...`);

        const combo = [p.hebrew, p.english, p.simple, p.aiqBekar || 0];
        const frameSpeedMs = aikBekarToMs(p.aiqBekar || 111);

        const gifData = await generateGifForPhrase(p.phrase, combo, frameSpeedMs);
        const safeName = p.phrase.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
        zip.file(`${safeName}.gif`, gifData);

        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      setDownloadProgress('Creating ZIP file...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = `gematria-tessellation-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);

      setDownloadProgress('');
    } catch (err) {
      console.error('Download error:', err);
      alert('Error creating download: ' + err.message);
    } finally {
      setDownloading(false);
      setDownloadProgress('');
    }
  };

  const formatBreakdown = (breakdown) => {
    return breakdown.map(({ char, value }) => `${char}${value}`).join(' + ');
  };



  // Comprehensive word list
  const getExtensiveWordList = () => {
    return [
      // Common words
      'the', 'be', 'to', 'of', 'and', 'in', 'that', 'have', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would',
      'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can',
      'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
      'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use',
      'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
      'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did', 'having', 'may', 'should', 'could',

      // Nouns
      'man', 'woman', 'child', 'baby', 'boy', 'girl', 'person', 'people', 'family', 'friend', 'father', 'mother', 'brother',
      'sister', 'son', 'daughter', 'husband', 'wife', 'king', 'queen', 'prince', 'lord', 'lady', 'angel', 'god', 'devil',
      'house', 'home', 'room', 'door', 'window', 'wall', 'floor', 'roof', 'building', 'castle', 'palace', 'temple', 'church',
      'school', 'hospital', 'hotel', 'store', 'shop', 'market', 'office', 'bank', 'library', 'museum', 'theater', 'park',
      'garden', 'farm', 'field', 'forest', 'wood', 'tree', 'flower', 'grass', 'plant', 'seed', 'root', 'leaf', 'branch',
      'mountain', 'hill', 'valley', 'river', 'lake', 'ocean', 'sea', 'water', 'island', 'beach', 'shore', 'wave', 'storm',
      'cloud', 'rain', 'snow', 'ice', 'wind', 'fire', 'smoke', 'earth', 'stone', 'rock', 'sand', 'dust', 'mud', 'clay',
      'sun', 'moon', 'star', 'planet', 'sky', 'heaven', 'space', 'world', 'land', 'ground', 'soil', 'path', 'road', 'street',
      'city', 'town', 'village', 'country', 'nation', 'state', 'place', 'area', 'region', 'zone', 'border', 'edge', 'corner',
      'hand', 'finger', 'arm', 'leg', 'foot', 'toe', 'head', 'face', 'eye', 'ear', 'nose', 'mouth', 'tooth', 'tongue', 'lip',
      'neck', 'shoulder', 'chest', 'back', 'heart', 'blood', 'bone', 'skin', 'hair', 'brain', 'mind', 'body', 'soul', 'spirit',
      'life', 'death', 'birth', 'age', 'youth', 'health', 'disease', 'pain', 'love', 'hate', 'fear', 'hope', 'faith', 'trust',
      'joy', 'sorrow', 'anger', 'peace', 'war', 'battle', 'fight', 'victory', 'defeat', 'power', 'force', 'strength', 'weakness',
      'book', 'page', 'word', 'letter', 'name', 'number', 'line', 'text', 'story', 'tale', 'poem', 'song', 'music', 'art',
      'picture', 'image', 'color', 'sound', 'voice', 'noise', 'silence', 'light', 'dark', 'shadow', 'bright', 'clear', 'dim',
      'car', 'truck', 'bus', 'train', 'plane', 'ship', 'boat', 'bike', 'horse', 'dog', 'cat', 'bird', 'fish', 'animal', 'beast',
      'lion', 'tiger', 'bear', 'wolf', 'fox', 'deer', 'rabbit', 'mouse', 'rat', 'snake', 'dragon', 'eagle', 'hawk', 'dove',
      'crow', 'owl', 'swan', 'duck', 'goose', 'chicken', 'rooster', 'pig', 'cow', 'sheep', 'goat', 'elephant', 'monkey',
      'food', 'bread', 'meat', 'fish', 'fruit', 'apple', 'orange', 'grape', 'lemon', 'berry', 'nut', 'rice', 'wheat', 'corn',
      'milk', 'water', 'wine', 'beer', 'coffee', 'tea', 'juice', 'oil', 'salt', 'sugar', 'honey', 'butter', 'cheese', 'egg',
      'gold', 'silver', 'copper', 'iron', 'steel', 'metal', 'wood', 'paper', 'glass', 'plastic', 'cloth', 'silk', 'wool',
      'diamond', 'pearl', 'ruby', 'crystal', 'jewel', 'crown', 'ring', 'chain', 'sword', 'knife', 'gun', 'weapon', 'shield',
      'armor', 'helmet', 'flag', 'banner', 'sign', 'symbol', 'mark', 'cross', 'circle', 'square', 'triangle', 'star', 'shape',

      // Verbs
      'run', 'walk', 'stand', 'sit', 'lie', 'sleep', 'wake', 'eat', 'drink', 'talk', 'speak', 'tell', 'ask', 'answer', 'call',
      'cry', 'laugh', 'smile', 'sing', 'dance', 'play', 'work', 'rest', 'wait', 'stay', 'leave', 'arrive', 'enter', 'exit',
      'open', 'close', 'start', 'stop', 'begin', 'end', 'finish', 'continue', 'break', 'fix', 'build', 'destroy', 'create',
      'make', 'do', 'act', 'move', 'turn', 'push', 'pull', 'lift', 'carry', 'hold', 'drop', 'throw', 'catch', 'hit', 'kick',
      'cut', 'burn', 'freeze', 'melt', 'boil', 'cook', 'wash', 'clean', 'dirty', 'hide', 'show', 'see', 'look', 'watch',
      'hear', 'listen', 'touch', 'feel', 'smell', 'taste', 'think', 'know', 'understand', 'remember', 'forget', 'learn',
      'teach', 'read', 'write', 'draw', 'paint', 'believe', 'doubt', 'want', 'need', 'like', 'love', 'hate', 'prefer',
      'choose', 'decide', 'try', 'attempt', 'succeed', 'fail', 'win', 'lose', 'fight', 'defend', 'attack', 'protect', 'save',
      'help', 'hurt', 'heal', 'kill', 'die', 'live', 'exist', 'happen', 'occur', 'appear', 'disappear', 'vanish', 'remain',
      'change', 'grow', 'shrink', 'increase', 'decrease', 'rise', 'fall', 'climb', 'descend', 'fly', 'swim', 'dive', 'jump',

      // Adjectives
      'good', 'bad', 'great', 'small', 'big', 'large', 'little', 'tiny', 'huge', 'giant', 'long', 'short', 'tall', 'high',
      'low', 'deep', 'shallow', 'wide', 'narrow', 'thick', 'thin', 'fat', 'heavy', 'light', 'hard', 'soft', 'smooth', 'rough',
      'hot', 'cold', 'warm', 'cool', 'wet', 'dry', 'clean', 'dirty', 'new', 'old', 'young', 'ancient', 'modern', 'fresh',
      'stale', 'raw', 'ripe', 'rotten', 'sweet', 'sour', 'bitter', 'salty', 'spicy', 'mild', 'strong', 'weak', 'powerful',
      'fast', 'slow', 'quick', 'swift', 'rapid', 'gradual', 'sudden', 'sharp', 'dull', 'bright', 'dark', 'light', 'pale',
      'vivid', 'clear', 'cloudy', 'foggy', 'sunny', 'rainy', 'snowy', 'windy', 'stormy', 'calm', 'quiet', 'loud', 'noisy',
      'silent', 'beautiful', 'ugly', 'pretty', 'handsome', 'plain', 'elegant', 'simple', 'complex', 'easy', 'difficult',
      'hard', 'soft', 'gentle', 'rough', 'smooth', 'safe', 'dangerous', 'risky', 'secure', 'stable', 'steady', 'shaky',
      'true', 'false', 'real', 'fake', 'genuine', 'artificial', 'natural', 'wild', 'tame', 'free', 'bound', 'open', 'closed',
      'full', 'empty', 'complete', 'incomplete', 'whole', 'broken', 'perfect', 'imperfect', 'right', 'wrong', 'correct',
      'happy', 'sad', 'joyful', 'sorrowful', 'glad', 'angry', 'mad', 'furious', 'calm', 'peaceful', 'nervous', 'anxious',
      'scared', 'afraid', 'brave', 'bold', 'shy', 'proud', 'humble', 'kind', 'cruel', 'mean', 'nice', 'friendly', 'hostile',
      'rich', 'poor', 'wealthy', 'noble', 'common', 'rare', 'usual', 'strange', 'odd', 'normal', 'weird', 'crazy', 'sane',
      'wise', 'foolish', 'smart', 'stupid', 'clever', 'dumb', 'bright', 'dull', 'sharp', 'blunt', 'alive', 'dead', 'living',

      // Abstract & Spiritual
      'truth', 'lie', 'fact', 'fiction', 'reality', 'dream', 'vision', 'thought', 'idea', 'concept', 'theory', 'law', 'rule',
      'order', 'chaos', 'harmony', 'discord', 'balance', 'unity', 'division', 'whole', 'part', 'piece', 'fragment', 'unity',
      'justice', 'mercy', 'grace', 'blessing', 'curse', 'luck', 'fate', 'destiny', 'chance', 'fortune', 'miracle', 'magic',
      'mystery', 'secret', 'wisdom', 'knowledge', 'ignorance', 'truth', 'prophecy', 'vision', 'revelation', 'sacred', 'holy',
      'divine', 'mortal', 'eternal', 'infinite', 'finite', 'alpha', 'omega', 'beginning', 'end', 'origin', 'source', 'root',
      'essence', 'nature', 'being', 'existence', 'void', 'nothing', 'something', 'everything', 'universe', 'cosmos', 'realm',
      'dimension', 'plane', 'sphere', 'circle', 'cycle', 'wheel', 'spiral', 'path', 'way', 'road', 'journey', 'quest',
      'mission', 'purpose', 'meaning', 'sense', 'reason', 'cause', 'effect', 'result', 'consequence', 'outcome', 'end',
      'goal', 'aim', 'target', 'object', 'subject', 'matter', 'substance', 'form', 'structure', 'pattern', 'design', 'plan',
      'scheme', 'system', 'method', 'process', 'procedure', 'ritual', 'ceremony', 'rite', 'custom', 'tradition', 'culture'
    ];
  };

  // Categorize words by part of speech for better grammar
  const categorizeWords = (words) => {
    const articles = ['the', 'a', 'an'];
    const conjunctions = ['and', 'or', 'but', 'if', 'when', 'because', 'while', 'though'];
    const prepositions = ['in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'of', 'about', 'into', 'through', 'after', 'before', 'over', 'under'];
    const pronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];

    const nouns = words.filter(w =>
      !articles.includes(w) && !conjunctions.includes(w) &&
      !prepositions.includes(w) && !pronouns.includes(w) &&
      ['man', 'woman', 'child', 'person', 'people', 'house', 'home', 'tree', 'water', 'fire', 'sun', 'moon', 'star', 'heart', 'soul', 'life', 'death', 'love', 'time', 'world', 'king', 'queen', 'angel', 'god', 'heaven', 'earth', 'light', 'dark', 'power', 'peace', 'war', 'hope', 'faith', 'truth', 'wisdom', 'book', 'word', 'voice', 'hand', 'eye', 'mind', 'body', 'spirit'].includes(w)
    );

    const verbs = words.filter(w =>
      ['is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'run', 'walk', 'see', 'look', 'think', 'know', 'make', 'come', 'go', 'say', 'speak', 'live', 'die', 'love', 'hate', 'want', 'need', 'give', 'take', 'find', 'lose', 'open', 'close', 'rise', 'fall', 'grow', 'change'].includes(w)
    );

    const adjectives = words.filter(w =>
      ['good', 'bad', 'great', 'small', 'big', 'old', 'new', 'young', 'long', 'short', 'high', 'low', 'hot', 'cold', 'dark', 'bright', 'happy', 'sad', 'strong', 'weak', 'true', 'false', 'holy', 'sacred', 'divine', 'eternal', 'ancient', 'modern', 'beautiful', 'perfect', 'pure', 'wise', 'brave', 'kind', 'free', 'wild'].includes(w)
    );

    return { articles, conjunctions, prepositions, pronouns, nouns, verbs, adjectives };
  };

  // Load word list with quality filtering
  useEffect(() => {
    const loadWords = async () => {
      setLoadingWords(true);
      setLoadError(null);

      try {
        console.log('Loading word frequency list...');
        // Use word frequency list - most common words first
        const response = await fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears.txt');

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const text = await response.text();
        const frequencyWords = text
          .split('\n')
          .map(word => word.trim().toLowerCase())
          .filter(word =>
            word.length >= 2 &&
            word.length <= 12 &&
            /^[a-z]+$/.test(word)
          );

        console.log(`📚 Loaded ${frequencyWords.length.toLocaleString()} common words (frequency-sorted)`);

        // Also load comprehensive alphabetical list for variety
        console.log('Loading comprehensive dictionary for variety...');
        const alphaResponse = await fetch('https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt');

        if (alphaResponse.ok) {
          const alphaText = await alphaResponse.text();
          const allWords = alphaText
            .split('\n')
            .map(word => word.trim().toLowerCase())
            .filter(word =>
              word.length >= 2 &&
              word.length <= 12 &&
              /^[a-z]+$/.test(word)
            );

          // Shuffle and take 30,000 from comprehensive list
          const shuffled = allWords.sort(() => Math.random() - 0.5);
          const varietyWords = shuffled.slice(0, 30000);

          // Combine: all frequency words + 30k variety words, removing duplicates
          const combinedWords = [...new Set([...frequencyWords, ...varietyWords])];

          // Thoroughly shuffle the combined list using Fisher-Yates algorithm to avoid bias
          const finalShuffled = [...combinedWords];
          for (let i = finalShuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [finalShuffled[i], finalShuffled[j]] = [finalShuffled[j], finalShuffled[i]];
          }

          setWordList(finalShuffled);
          console.log(`✅ Loaded ${finalShuffled.length.toLocaleString()} total words (${frequencyWords.length} common + ${varietyWords.length} variety), thoroughly shuffled`);
        } else {
          // If comprehensive list fails, shuffle frequency words to avoid bias
          const shuffledFreq = [...frequencyWords];
          for (let i = shuffledFreq.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledFreq[i], shuffledFreq[j]] = [shuffledFreq[j], shuffledFreq[i]];
          }
          setWordList(shuffledFreq);
          console.log(`✅ Using ${shuffledFreq.length.toLocaleString()} frequency words, shuffled`);
        }
      } catch (error) {
        console.error('Failed to load external dictionary:', error);
        setLoadError(error.message);

        // Fallback to built-in curated list and shuffle it
        const fallback = getExtensiveWordList();
        const shuffledFallback = [...fallback];
        for (let i = shuffledFallback.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledFallback[i], shuffledFallback[j]] = [shuffledFallback[j], shuffledFallback[i]];
        }
        setWordList(shuffledFallback);
        console.log(`Using fallback: ${shuffledFallback.length} curated words, shuffled`);
      } finally {
        setLoadingWords(false);
      }
    };

    loadWords();
  }, []);

  // Save generatedPhrases to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('gematriaGeneratedPhrases', JSON.stringify(generatedPhrases));
    } catch (e) {
      console.error('Failed to save phrases to localStorage:', e);
    }
  }, [generatedPhrases]);

  // Pre-calculate word data and indexes ONCE when wordList changes
  // This dramatically speeds up phrase generation by avoiding repeated calculations
  const wordCache = useMemo(() => {
    if (wordList.length === 0) return null;

    console.log(`📊 Pre-calculating gematria for ${wordList.length.toLocaleString()} words...`);
    const startTime = Date.now();

    // Calculate all gematria values once
    const wordData = wordList.map(word => ({
      word,
      heb: calculateGematria(word, hebrewValues).total,
      eng: calculateGematria(word, englishValues).total,
      sim: calculateGematria(word, simpleValues).total,
      aiq: calculateGematria(word, aiqBekarValues).total
    }));

    // Build value-based indexes
    const byHebrew = new Map();
    const byEnglish = new Map();
    const bySimple = new Map();
    const byAiqBekar = new Map();

    wordData.forEach(data => {
      if (!byHebrew.has(data.heb)) byHebrew.set(data.heb, []);
      if (!byEnglish.has(data.eng)) byEnglish.set(data.eng, []);
      if (!bySimple.has(data.sim)) bySimple.set(data.sim, []);
      if (!byAiqBekar.has(data.aiq)) byAiqBekar.set(data.aiq, []);

      byHebrew.get(data.heb).push(data);
      byEnglish.get(data.eng).push(data);
      bySimple.get(data.sim).push(data);
      byAiqBekar.get(data.aiq).push(data);
    });

    console.log(`✅ Word cache built in ${Date.now() - startTime}ms`);
    console.log(`   Index sizes - H:${byHebrew.size} E:${byEnglish.size} S:${bySimple.size} A:${byAiqBekar.size}`);

    return { wordData, byHebrew, byEnglish, bySimple, byAiqBekar };
  }, [wordList]);

  const generatePhrase = async (targetHeb, targetEng, targetSim, targetAiq, enabledFlags = { heb: true, eng: true, sim: true, aiq: true }, maxAttempts = 1000000, timeoutMs = 10000) => {
    const startTime = Date.now();

    // Use pre-calculated cache if available, otherwise fall back to calculation
    if (!wordCache) {
      console.log('⚠️ Word cache not ready, skipping generation');
      return null;
    }

    const { wordData, byHebrew, byEnglish, bySimple, byAiqBekar } = wordCache;

    const enabledStr = `H:${enabledFlags.heb ? '✓' : '✗'} E:${enabledFlags.eng ? '✓' : '✗'} S:${enabledFlags.sim ? '✓' : '✗'} A:${enabledFlags.aiq ? '✓' : '✗'}`;
    console.log(`🎯 Smart random search for H:${targetHeb} E:${targetEng} S:${targetSim} A:${targetAiq} (${enabledStr})`);
    console.log(`⏱️ Timeout set to ${timeoutMs / 1000} seconds (using cached word data)`);

    // Dynamically adjust phrase length based on enabled target values
    const enabledTargets = [];
    if (enabledFlags.heb) enabledTargets.push(targetHeb);
    if (enabledFlags.eng) enabledTargets.push(targetEng);
    if (enabledFlags.sim) enabledTargets.push(targetSim);
    if (enabledFlags.aiq) enabledTargets.push(targetAiq);
    const avgTarget = enabledTargets.length > 0 ? enabledTargets.reduce((a, b) => a + b, 0) / enabledTargets.length : 500;
    let minWords, maxWords;
    if (avgTarget < 500) {
      minWords = 2; maxWords = 5;
    } else if (avgTarget < 1500) {
      minWords = 3; maxWords = 7;
    } else if (avgTarget < 3000) {
      minWords = 4; maxWords = 10;
    } else if (avgTarget < 5000) {
      minWords = 5; maxWords = 12;
    } else {
      minWords = 6; maxWords = 15;
    }

    console.log(`✅ Starting smart random search (${maxAttempts.toLocaleString()} attempts, ${minWords}-${maxWords} words)...`);

    let closestMatch = null;
    let closestDistance = Infinity;
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check timeout every 10,000 attempts and yield to browser to prevent UI blocking
      if (attempt % 10000 === 0) {
        const elapsed = Date.now() - startTime;
        if (elapsed > timeoutMs) {
          console.log(`⏱️ Timeout after ${(elapsed / 1000).toFixed(1)}s and ${attempt.toLocaleString()} attempts`);
          console.log(`   Best match: "${closestMatch?.phrase}" (H:${closestMatch?.heb} E:${closestMatch?.eng} S:${closestMatch?.sim} A:${closestMatch?.aiq})`);
          return null; // Return null to indicate timeout
        }
        // Yield to browser to allow UI interactions (links, hovers, etc.)
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Randomly select a starting letter to ensure distribution across alphabet
      const startingLetter = alphabet[Math.floor(Math.random() * alphabet.length)];

      // Debug logging for first few attempts
      if (attempt < 5) {
        console.log(`Attempt ${attempt}: selected starting letter '${startingLetter}'`);
      }

      // Randomly choose phrase length based on dynamic range
      const range = maxWords - minWords;
      const numWords = minWords + Math.floor(Math.random() * (range + 1));

      const selectedWords = [];
      let totalHeb = 0, totalEng = 0, totalSim = 0, totalAiq = 0;

      // Build phrase word by word
      for (let i = 0; i < numWords; i++) {
        const isLastWord = (i === numWords - 1);

        if (isLastWord) {
          // For last word, try to match exact remaining values for enabled systems
          const needHeb = targetHeb - totalHeb;
          const needEng = targetEng - totalEng;
          const needSim = targetSim - totalSim;
          const needAiq = targetAiq - totalAiq;

          // Look for exact match using the most selective index (smallest bucket)
          // This dramatically improves 4-way match success rate
          const candidateSets = [];
          if (enabledFlags.heb) candidateSets.push({ candidates: byHebrew.get(needHeb) || [], name: 'heb' });
          if (enabledFlags.eng) candidateSets.push({ candidates: byEnglish.get(needEng) || [], name: 'eng' });
          if (enabledFlags.sim) candidateSets.push({ candidates: bySimple.get(needSim) || [], name: 'sim' });
          if (enabledFlags.aiq) candidateSets.push({ candidates: byAiqBekar.get(needAiq) || [], name: 'aiq' });

          // Use the smallest non-empty bucket for efficiency
          const nonEmptySets = candidateSets.filter(s => s.candidates.length > 0);
          nonEmptySets.sort((a, b) => a.candidates.length - b.candidates.length);
          const candidates = nonEmptySets.length > 0 ? nonEmptySets[0].candidates : [];

          // Search for exact match - check all candidates in small buckets, sample in large ones
          let perfectMatch = null;
          if (candidates.length > 0) {
            if (candidates.length <= 500) {
              // Small bucket - search ALL candidates to guarantee finding match if exists
              for (const w of candidates) {
                if ((!enabledFlags.heb || w.heb === needHeb) &&
                    (!enabledFlags.eng || w.eng === needEng) &&
                    (!enabledFlags.sim || w.sim === needSim) &&
                    (!enabledFlags.aiq || w.aiq === needAiq)) {
                  perfectMatch = w;
                  break;
                }
              }
            } else {
              // Large bucket - check 500 from random position for speed
              const startIdx = Math.floor(Math.random() * candidates.length);
              for (let c = 0; c < 500; c++) {
                const w = candidates[(startIdx + c) % candidates.length];
                if ((!enabledFlags.heb || w.heb === needHeb) &&
                    (!enabledFlags.eng || w.eng === needEng) &&
                    (!enabledFlags.sim || w.sim === needSim) &&
                    (!enabledFlags.aiq || w.aiq === needAiq)) {
                  perfectMatch = w;
                  break;
                }
              }
            }
          }

          if (perfectMatch) {
            selectedWords.push(perfectMatch.word);
            const phrase = selectedWords.join(' ');
            console.log(`✅ Found match after ${attempt + 1} attempts: "${phrase}"`);
            return phrase;
          }

          // No single-word match - try TWO-WORD ending
          if (!perfectMatch && nonEmptySets.length > 0) {
            const word1Pool = nonEmptySets[0].candidates;

            // Search all word1 candidates (they're already from smallest bucket)
            for (let w1 = 0; w1 < word1Pool.length; w1++) {
              const word1 = word1Pool[w1];

              // Calculate what word2 needs to hit
              const need2Heb = needHeb - word1.heb;
              const need2Eng = needEng - word1.eng;
              const need2Sim = needSim - word1.sim;
              const need2Aiq = needAiq - word1.aiq;

              // Skip if enabled needs are negative (only check enabled systems)
              if ((enabledFlags.heb && need2Heb < 1) ||
                  (enabledFlags.eng && need2Eng < 1) ||
                  (enabledFlags.sim && need2Sim < 1) ||
                  (enabledFlags.aiq && need2Aiq < 1)) continue;

              // Look for word2 in smallest available bucket
              const word2Sets = [];
              if (enabledFlags.heb && byHebrew.has(need2Heb)) word2Sets.push({ candidates: byHebrew.get(need2Heb), name: 'heb' });
              if (enabledFlags.eng && byEnglish.has(need2Eng)) word2Sets.push({ candidates: byEnglish.get(need2Eng), name: 'eng' });
              if (enabledFlags.sim && bySimple.has(need2Sim)) word2Sets.push({ candidates: bySimple.get(need2Sim), name: 'sim' });
              if (enabledFlags.aiq && byAiqBekar.has(need2Aiq)) word2Sets.push({ candidates: byAiqBekar.get(need2Aiq), name: 'aiq' });

              if (word2Sets.length === 0) continue;
              word2Sets.sort((a, b) => a.candidates.length - b.candidates.length);
              const word2Pool = word2Sets[0].candidates;

              // Search all word2 candidates
              for (const word2 of word2Pool) {
                if ((!enabledFlags.heb || word2.heb === need2Heb) &&
                    (!enabledFlags.eng || word2.eng === need2Eng) &&
                    (!enabledFlags.sim || word2.sim === need2Sim) &&
                    (!enabledFlags.aiq || word2.aiq === need2Aiq)) {
                  selectedWords.push(word1.word);
                  selectedWords.push(word2.word);
                  const phrase = selectedWords.join(' ');
                  console.log(`✅ Found 2-word ending after ${attempt + 1} attempts: "${phrase}"`);
                  return phrase;
                }
              }
            }
          }

          // No perfect match for last word, pick random word
          // For first word, prefer words starting with the selected letter
          let pool = wordData;
          if (i === 0) {
            const letterWords = wordData.filter(w => w.word.startsWith(startingLetter));
            if (attempt < 5) {
              console.log(`  Found ${letterWords.length} words starting with '${startingLetter}'`);
            }
            if (letterWords.length > 0 && Math.random() < 0.7) {
              pool = letterWords;
              if (attempt < 5) {
                console.log(`  Using filtered pool of ${pool.length} words`);
              }
            }
          }

          const randomWord = pool[Math.floor(Math.random() * pool.length)];
          selectedWords.push(randomWord.word);
          if (attempt < 5 && i === 0) {
            console.log(`  Selected first word (last): '${randomWord.word}'`);
          }
          totalHeb += randomWord.heb;
          totalEng += randomWord.eng;
          totalSim += randomWord.sim;
          totalAiq += randomWord.aiq;
        } else {
          // For non-last words, pick words that keep us on track for targets
          let attempts = 0;
          let picked = null;

          // Calculate ideal progress - what fraction of target should we have after this word?
          const progressFraction = (i + 1) / numWords;
          const idealHeb = targetHeb * progressFraction;
          const idealEng = targetEng * progressFraction;
          const idealSim = targetSim * progressFraction;
          const idealAiq = targetAiq * progressFraction;

          // For first word, prefer words starting with the selected letter
          let pool = wordData;
          if (i === 0) {
            const letterWords = wordData.filter(w => w.word.startsWith(startingLetter));
            if (letterWords.length > 0 && Math.random() < 0.7) {
              pool = letterWords;
            }
          }

          // Try to find a word that keeps us close to ideal progress
          while (attempts < 100) {
            const candidate = pool[Math.floor(Math.random() * pool.length)];

            const newHeb = totalHeb + candidate.heb;
            const newEng = totalEng + candidate.eng;
            const newSim = totalSim + candidate.sim;
            const newAiq = totalAiq + candidate.aiq;

            // Check if this word keeps us reasonably on track
            const hebOk = !enabledFlags.heb || (newHeb <= targetHeb && newHeb >= idealHeb * 0.5);
            const engOk = !enabledFlags.eng || (newEng <= targetEng && newEng >= idealEng * 0.5);
            const simOk = !enabledFlags.sim || (newSim <= targetSim && newSim >= idealSim * 0.5);
            const aiqOk = !enabledFlags.aiq || (newAiq <= targetAiq && newAiq >= idealAiq * 0.3);

            if (hebOk && engOk && simOk && aiqOk) {
              picked = candidate;
              break;
            }
            attempts++;
          }

          // If no good candidate found, pick one that at least doesn't exceed targets
          if (!picked) {
            for (let t = 0; t < 50; t++) {
              const candidate = pool[Math.floor(Math.random() * pool.length)];
              if (totalHeb + candidate.heb <= targetHeb &&
                  totalEng + candidate.eng <= targetEng &&
                  totalSim + candidate.sim <= targetSim &&
                  totalAiq + candidate.aiq <= targetAiq) {
                picked = candidate;
                break;
              }
            }
          }

          // Last resort: just pick randomly
          if (!picked) {
            picked = pool[Math.floor(Math.random() * pool.length)];
          }

          selectedWords.push(picked.word);
          if (attempt < 5 && i === 0) {
            console.log(`  Selected first word: '${picked.word}'`);
          }
          totalHeb += picked.heb;
          totalEng += picked.eng;
          totalSim += picked.sim;
          totalAiq += picked.aiq;
        }
      }

      // Track closest match (only count enabled systems)
      const distance =
        (enabledFlags.heb ? Math.abs(totalHeb - targetHeb) : 0) +
        (enabledFlags.eng ? Math.abs(totalEng - targetEng) : 0) +
        (enabledFlags.sim ? Math.abs(totalSim - targetSim) : 0) +
        (enabledFlags.aiq ? Math.abs(totalAiq - targetAiq) : 0);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestMatch = {
          phrase: selectedWords.join(' '),
          heb: totalHeb,
          eng: totalEng,
          sim: totalSim,
          aiq: totalAiq
        };
      }

      // Log progress
      if (attempt > 0 && attempt % 100000 === 0) {
        console.log(`   ${attempt.toLocaleString()} attempts. Closest: "${closestMatch.phrase}" (H:${closestMatch.heb} E:${closestMatch.eng} S:${closestMatch.sim} A:${closestMatch.aiq}, distance:${closestDistance})`);
      }
    }

    console.log(`❌ No perfect match found after ${maxAttempts.toLocaleString()} attempts.`);
    console.log(`   Closest: "${closestMatch.phrase}" (H:${closestMatch.heb} E:${closestMatch.eng} S:${closestMatch.sim} A:${closestMatch.aiq})`);
    return null;
  };

  const handleGeneratePhrase = async () => {
    console.log('Generate button clicked');
    console.log(`Word list size: ${wordList.length}`);
    console.log(`Targets - Hebrew: ${targetHebrew}, English: ${targetEnglish}, Simple: ${targetSimple}, Aik Bekar⁹: ${targetAiqBekar}`);

    if (wordList.length === 0) {
      alert('Word list is empty! Please wait for words to load or reload the page.');
      return;
    }

    setGeneratingTargeted(true);
    const generationStartTime = Date.now();

    // Small delay to let UI update
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('Starting phrase generation...');

    const repdigitSet = new Set([11, 22, 33, 44, 55, 66, 77, 88, 99,
                                  111, 222, 333, 444, 555, 666, 777, 888, 999,
                                  1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999]);

    let phrase = null;
    const enabledFlags3 = { heb: true, eng: true, sim: true, aiq: false };

    if (aiqBekarEnabled) {
      // When Aik Bekar is enabled, search for the specific target value
      console.log(`Searching for 4-way match: H=${targetHebrew} E=${targetEnglish} S=${targetSimple} A=${targetAiqBekar}...`);

      const enabledFlags4 = { heb: true, eng: true, sim: true, aiq: true };
      const enabledFlags3 = { heb: true, eng: true, sim: true, aiq: false };
      const targetAiq = parseInt(targetAiqBekar);
      const startTime = Date.now();

      // First try exact 4-way match
      phrase = await generatePhrase(
        parseInt(targetHebrew),
        parseInt(targetEnglish),
        parseInt(targetSimple),
        targetAiq,
        enabledFlags4,
        2000000,
        20000  // 20 second timeout
      );

      if (phrase) {
        const aVal = calculateGematria(phrase, aiqBekarValues).total;
        if (aVal === targetAiq) {
          console.log(`✅ Found exact 4-way match!`);
        } else {
          console.log(`❌ Aik Bekar mismatch (got ${aVal}, wanted ${targetAiq}), trying generate-and-check...`);
          phrase = null;
        }
      }

      // FALLBACK: Generate 3-way matches and find one where A matches target
      if (!phrase) {
        console.log('🔄 Trying generate-and-check for Aik Bekar...');
        const maxTimeMs = 40000; // 40 more seconds

        for (let attempt = 0; attempt < 100; attempt++) {
          if (Date.now() - startTime > maxTimeMs) {
            console.log(`⏱️ Timeout after ${attempt} attempts`);
            break;
          }

          const candidate = await generatePhrase(
            parseInt(targetHebrew),
            parseInt(targetEnglish),
            parseInt(targetSimple),
            0,
            enabledFlags3,
            500000,
            800
          );

          if (candidate) {
            const aVal = calculateGematria(candidate, aiqBekarValues).total;
            console.log(`   [${attempt + 1}] A=${aVal} (want ${targetAiq})`);

            if (aVal === targetAiq) {
              console.log(`✅ Found matching Aik Bekar after ${attempt + 1} attempts!`);
              phrase = candidate;
              break;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    } else {
      // Aik Bekar disabled - just do 3-way search
      phrase = await generatePhrase(
        parseInt(targetHebrew),
        parseInt(targetEnglish),
        parseInt(targetSimple),
        0,
        enabledFlags3
      );
    }

    console.log('Generation complete. Result:', phrase);

    // Check for duplicate - if same as last phrase, try again (up to 3 retries)
    const lastPhrase = generatedPhrases.length > 0 ? generatedPhrases[generatedPhrases.length - 1].phrase : null;
    let retries = 0;
    while (phrase && phrase === lastPhrase && retries < 3) {
      console.log(`⚠️ Duplicate phrase, retrying... (attempt ${retries + 1})`);
      retries++;
      phrase = await generatePhrase(
        parseInt(targetHebrew),
        parseInt(targetEnglish),
        parseInt(targetSimple),
        aiqBekarEnabled ? parseInt(targetAiqBekar) : 0,
        aiqBekarEnabled ? { heb: true, eng: true, sim: true, aiq: true } : enabledFlags3,
        1000000,
        10000
      );
    }

    if (phrase) {
      setInput(phrase);
      const hebrew = calculateGematria(phrase, hebrewValues);
      const english = calculateGematria(phrase, englishValues);
      const simple = calculateGematria(phrase, simpleValues);
      const aiqBekar = calculateGematria(phrase, aiqBekarValues);

      console.log(`Found phrase: "${phrase}"`);
      console.log(`Hebrew: ${hebrew.total}, English: ${english.total}, Simple: ${simple.total}, Aik Bekar⁹: ${aiqBekar.total}`);

      setResults({
        input: phrase,
        hebrew,
        english,
        simple,
        aiqBekar
      });

      // Track generated phrase with generation time
      const generationTimeMs = Date.now() - generationStartTime;
      trackGeneratedPhrase(phrase, hebrew.total, english.total, simple.total, aiqBekar.total, 'specified', generationTimeMs);

      setGeneratingTargeted(false);
    } else {
      console.log('No phrase found (timeout or max attempts reached)');
      setGeneratingTargeted(false); // Enable button immediately
      const baseMessage = `Couldn't find a phrase matching Hebrew = ${targetHebrew}, English = ${targetEnglish}, Simple = ${targetSimple}`;
      const aiqMessage = aiqBekarEnabled ? `, Aik Bekar⁹ = ${targetAiqBekar}` : '';
      setErrorModal({
        show: true,
        message: `${baseMessage}${aiqMessage}. Please try a different combination!`
      });
    }
  };

  const handleGenerateRandomRepdigits = async () => {
    console.log('Random repdigit generation button clicked');
    console.log(`Word list size: ${wordList.length}`);

    if (wordList.length === 0) {
      alert('Word list is empty! Please wait for words to load or reload the page.');
      return;
    }

    setGeneratingRandom(true);
    const generationStartTime = Date.now();

    // Small delay to let UI update
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('Starting random repdigit phrase generation...');

    const enabledFlags3 = { heb: true, eng: true, sim: true, aiq: false };
    const enabledFlags4 = { heb: true, eng: true, sim: true, aiq: true };

    // Known working H/E/S combinations (E ≈ 6*S relationship)
    const workingCombos = [
      // 2-digit combos
      { heb: 22, eng: 66, sim: 11 }, { heb: 33, eng: 66, sim: 11 },
      { heb: 44, eng: 66, sim: 11 }, { heb: 55, eng: 66, sim: 11 },
      { heb: 66, eng: 66, sim: 11 }, { heb: 77, eng: 66, sim: 11 },
      { heb: 88, eng: 66, sim: 11 }, { heb: 99, eng: 66, sim: 11 },
      // 3-digit combos
      { heb: 111, eng: 666, sim: 111 }, { heb: 222, eng: 666, sim: 111 },
      { heb: 333, eng: 666, sim: 111 }, { heb: 444, eng: 666, sim: 111 },
      { heb: 555, eng: 666, sim: 111 }, { heb: 666, eng: 666, sim: 111 },
      { heb: 777, eng: 666, sim: 111 }, { heb: 888, eng: 666, sim: 111 },
      { heb: 999, eng: 666, sim: 111 }, { heb: 1111, eng: 666, sim: 111 },
      // More 3-digit variations
      { heb: 111, eng: 444, sim: 77 }, { heb: 222, eng: 444, sim: 77 },
      { heb: 333, eng: 444, sim: 77 }, { heb: 444, eng: 444, sim: 77 },
      { heb: 111, eng: 888, sim: 111 }, { heb: 222, eng: 888, sim: 111 },
      // 4-digit combos
      { heb: 2222, eng: 6666, sim: 1111 }, { heb: 3333, eng: 6666, sim: 1111 },
      { heb: 4444, eng: 6666, sim: 1111 }, { heb: 5555, eng: 6666, sim: 1111 },
      { heb: 6666, eng: 6666, sim: 1111 }, { heb: 7777, eng: 6666, sim: 1111 },
      { heb: 8888, eng: 6666, sim: 1111 }, { heb: 9999, eng: 6666, sim: 1111 },
    ];

    // Aik Bekar repdigits (include larger values for longer phrases)
    const aiqRepdigits = [11, 22, 33, 44, 55, 66, 77, 88, 99, 111, 222, 333, 444, 555, 666, 777, 888, 999, 1111];

    // Shuffle combos
    const shuffledCombos = [...workingCombos].sort(() => Math.random() - 0.5);

    let phrase = null;
    let finalHebrew, finalEnglish, finalSimple;

    if (aiqBekarEnabled) {
      console.log('🎲 Searching for 4-way random repdigit match...');

      const startTime = Date.now();
      const maxTime = 60000; // 60 second total timeout

      // Pair combos with compatible A values (smaller combos need smaller A)
      const comboWithAiq = [];
      for (const combo of workingCombos) {
        // Small combos (2-digit) pair with small A values
        if (combo.sim === 11) {
          for (const a of [11, 22, 33, 44, 55]) {
            comboWithAiq.push({ ...combo, aiq: a });
          }
        }
        // Medium combos (3-digit) pair with medium A values
        else if (combo.sim === 77 || combo.sim === 111) {
          for (const a of [55, 66, 77, 88, 99, 111, 222]) {
            comboWithAiq.push({ ...combo, aiq: a });
          }
        }
        // Large combos (4-digit) pair with larger A values
        else if (combo.sim === 1111) {
          for (const a of [333, 444, 555, 666, 777, 888, 999, 1111]) {
            comboWithAiq.push({ ...combo, aiq: a });
          }
        }
      }

      // Shuffle all combo+A pairs
      const shuffledPairs = comboWithAiq.sort(() => Math.random() - 0.5);

      console.log(`  Testing ${shuffledPairs.length} combo+A pairs...`);

      // Try each pair with TRUE 4-way search
      for (const pair of shuffledPairs) {
        if (Date.now() - startTime > maxTime) break;

        console.log(`  Trying H:${pair.heb} E:${pair.eng} S:${pair.sim} A:${pair.aiq}...`);

        const candidate = await generatePhrase(
          pair.heb, pair.eng, pair.sim, pair.aiq,
          enabledFlags4, 500000, 3000  // TRUE 4-way, 3s per pair
        );

        if (candidate) {
          const aVal = calculateGematria(candidate, aiqBekarValues).total;
          if (aVal === pair.aiq) {
            console.log(`✅ Found 4-way match! H:${pair.heb} E:${pair.eng} S:${pair.sim} A:${pair.aiq}`);
            phrase = candidate;
            finalHebrew = pair.heb;
            finalEnglish = pair.eng;
            finalSimple = pair.sim;
            break;
          }
        }
      }
    } else {
      console.log('🎲 Searching for 3-way random repdigit match...');

      for (const combo of shuffledCombos) {
        const candidate = await generatePhrase(
          combo.heb, combo.eng, combo.sim, 0,
          enabledFlags3, 1000000, 4000
        );

        if (candidate) {
          console.log(`✅ Found 3-way match! H:${combo.heb} E:${combo.eng} S:${combo.sim}`);
          phrase = candidate;
          finalHebrew = combo.heb;
          finalEnglish = combo.eng;
          finalSimple = combo.sim;
          break;
        }
      }
    }

    console.log('Generation complete. Result:', phrase);

    // Check for duplicate - if same as last phrase, try again
    const lastPhrase = generatedPhrases.length > 0 ? generatedPhrases[generatedPhrases.length - 1].phrase : null;
    const repdigitSet = new Set(aiqRepdigits);
    let retries = 0;
    while (phrase && phrase === lastPhrase && retries < 3) {
      console.log(`⚠️ Duplicate phrase, retrying...`);
      retries++;
      const retryCombo = workingCombos[Math.floor(Math.random() * workingCombos.length)];
      const candidate = await generatePhrase(
        retryCombo.heb, retryCombo.eng, retryCombo.sim, 0,
        enabledFlags3, 300000, 1500
      );
      if (candidate) {
        const aVal = calculateGematria(candidate, aiqBekarValues).total;
        if (!aiqBekarEnabled || repdigitSet.has(aVal)) {
          phrase = candidate;
        }
      }
    }

    if (phrase) {
      setInput(phrase);
      const hebrew = calculateGematria(phrase, hebrewValues);
      const english = calculateGematria(phrase, englishValues);
      const simple = calculateGematria(phrase, simpleValues);
      const aiqBekar = calculateGematria(phrase, aiqBekarValues);

      console.log(`Found phrase: "${phrase}"`);
      console.log(`Hebrew: ${hebrew.total}, English: ${english.total}, Simple: ${simple.total}, Aik Bekar⁹: ${aiqBekar.total}`);

      // Update the dropdowns (H, E, S always update to actual values)
      setTargetHebrew(hebrew.total.toString());
      setTargetEnglish(english.total.toString());
      setTargetSimple(simple.total.toString());
      // Only update Aik Bekar dropdown if the value is a valid repdigit
      const aiqStr = aiqBekar.total.toString();
      if (repdigits.includes(aiqStr)) {
        setTargetAiqBekar(aiqStr);
      }

      setResults({
        input: phrase,
        hebrew,
        english,
        simple,
        aiqBekar
      });

      // Track generated phrase with generation time
      const generationTimeMs = Date.now() - generationStartTime;
      trackGeneratedPhrase(phrase, hebrew.total, english.total, simple.total, aiqBekar.total, 'random', generationTimeMs);

      setGeneratingRandom(false);
    } else {
      console.log('No phrase found after all attempts');
      setGeneratingRandom(false); // Enable button immediately
      setErrorModal({
        show: true,
        message: `Couldn't find a phrase matching any random repdigit combination. Please try again!`
      });
    }
  };

  const handleGenerateAnagram = () => {
    if (!input.trim()) {
      alert('Please enter a phrase first!');
      return;
    }

    if (wordList.length === 0) {
      alert('Word list is still loading. Please wait a moment and try again.');
      return;
    }

    // Get all letters from the input
    const inputLetters = input.toLowerCase().replace(/[^a-z]/g, '').split('').sort();

    if (inputLetters.length === 0) {
      alert('Please enter a phrase with at least one letter!');
      return;
    }

    console.log(`Finding anagram for: "${input}" (${inputLetters.length} letters)`);

    // Helper function to check if a word can be made from available letters
    const canMakeWord = (word, availableLetters) => {
      const letterCopy = [...availableLetters];
      for (const char of word) {
        const index = letterCopy.indexOf(char);
        if (index === -1) return false;
        letterCopy.splice(index, 1);
      }
      return letterCopy;
    };

    // Try to find an anagram using actual words
    const maxAttempts = 1000;
    let bestAnagram = null;
    let bestRemainingCount = inputLetters.length;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let remainingLetters = [...inputLetters];
      const selectedWords = [];

      // Keep trying to find words until we use all letters or can't find any more
      while (remainingLetters.length > 0) {
        // Find all words that can be made from remaining letters
        const possibleWords = wordList.filter(word => {
          const result = canMakeWord(word, remainingLetters);
          return result !== false;
        });

        if (possibleWords.length === 0) break;

        // Randomly select a word, preferring longer words to use up letters faster
        const weights = possibleWords.map(w => Math.pow(w.length, 1.5));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        let selectedWord = possibleWords[0];

        for (let i = 0; i < possibleWords.length; i++) {
          random -= weights[i];
          if (random <= 0) {
            selectedWord = possibleWords[i];
            break;
          }
        }

        // Use this word
        selectedWords.push(selectedWord);
        remainingLetters = canMakeWord(selectedWord, remainingLetters);
      }

      // Check if this is the best solution so far
      if (remainingLetters.length < bestRemainingCount) {
        bestRemainingCount = remainingLetters.length;
        bestAnagram = selectedWords.join(' ');
      }

      // Perfect match!
      if (remainingLetters.length === 0) {
        break;
      }
    }

    if (bestAnagram) {
      if (bestRemainingCount === 0) {
        console.log(`✅ Found perfect anagram: "${bestAnagram}"`);
      } else {
        console.log(`⚠️ Found partial anagram: "${bestAnagram}" (${bestRemainingCount} letters unused)`);
        alert(`Found close anagram using most letters!\n\nOriginal: ${input}\nAnagram: ${bestAnagram}\n\n${bestRemainingCount} letter(s) couldn't be used. Try a different phrase or click again for another variation.`);
      }

      setInput(bestAnagram);

      // Auto-calculate the new anagram
      const hebrew = calculateGematria(bestAnagram, hebrewValues);
      const english = calculateGematria(bestAnagram, englishValues);
      const simple = calculateGematria(bestAnagram, simpleValues);
      const aiqBekar = calculateGematria(bestAnagram, aiqBekarValues);

      setResults({
        input: bestAnagram,
        hebrew,
        english,
        simple,
        aiqBekar
      });

      // Track generated phrase
      trackGeneratedPhrase(bestAnagram, hebrew.total, english.total, simple.total, aiqBekar.total, 'anagram');
    } else {
      alert('Could not find any valid word combinations for this phrase. Try a different phrase with more common letters.');
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto mb-4">
        <div className="bg-zinc-900 rounded-lg shadow-2xl overflow-hidden border border-zinc-800">
          {/* Header */}
          <div className="bg-black border-b border-zinc-800 p-4 md:p-6">
            <div className="flex items-center justify-center gap-3">
              <Calculator className="w-8 h-8 text-red-500" />
              <h1 className="text-2xl md:text-4xl font-bold text-white">
                Gematria Generator
              </h1>
            </div>
            <p className="text-gray-400 text-center mt-1 text-sm md:text-base">
              Generate phrases that add up to <a href="https://en.wikipedia.org/wiki/Repdigit" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 underline">repdigits</a> in Hebrew and English Gematria.
            </p>
          </div>

          {/* Input Section */}
          <div className="p-6 md:p-8">
            {/* Unified Card */}
            <div className="mb-6 p-6 bg-white rounded-lg border border-zinc-300">
              {/* Repdigit Target Selection */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3">
                  Generate Phrase With Repdigits{' '}
                  <span className="relative inline-block">
                    <span
                      className="inline-block cursor-pointer text-gray-400 hover:text-red-600 transition-colors"
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                    >
                      ⓘ
                    </span>
                    <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 px-4 py-3 bg-zinc-700 text-white text-sm font-normal rounded-lg shadow-lg before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-zinc-700 transition-opacity duration-200 ${showTooltip ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      Try combinations like XXX/666/111/XX, XXX/666/111/XXX, XXXX/666/111/XXX, and XXXX/6666/1111/XXXX!
                    </div>
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Hebrew
                    </label>
                    <select
                      value={targetHebrew}
                      onChange={(e) => setTargetHebrew(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-sm text-gray-900"
                    >
                      {repdigits.map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      English
                    </label>
                    <select
                      value={targetEnglish}
                      onChange={(e) => setTargetEnglish(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-sm text-gray-900"
                    >
                      {repdigits.map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      English (Simple)
                    </label>
                    <select
                      value={targetSimple}
                      onChange={(e) => setTargetSimple(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-sm text-gray-900"
                    >
                      {repdigits.map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                        English (Aik Bekar⁹)
                        <span className="relative inline-block">
                          <span
                            className="inline-block cursor-pointer text-gray-400 hover:text-red-600 transition-colors"
                            onMouseEnter={() => setShowAiqTooltip(true)}
                            onMouseLeave={() => setShowAiqTooltip(false)}
                          >
                            ⓘ
                          </span>
                          <div className={`absolute right-0 top-full mt-2 z-50 w-64 px-4 py-3 bg-zinc-700 text-white text-sm font-normal rounded-lg shadow-lg transition-opacity duration-200 ${showAiqTooltip ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            Phrases including this system can take several minutes to generate, so consider it a lucky wildcard when you get one!
                          </div>
                        </span>
                      </label>
                      <input
                        type="checkbox"
                        checked={aiqBekarEnabled}
                        onChange={(e) => setAiqBekarEnabled(e.target.checked)}
                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                      />
                    </div>
                    <select
                      value={targetAiqBekar}
                      onChange={(e) => setTargetAiqBekar(e.target.value)}
                      disabled={!aiqBekarEnabled}
                      className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-sm text-gray-900 ${!aiqBekarEnabled ? 'opacity-50' : ''}`}
                    >
                      {repdigits.map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={handleGeneratePhrase}
                    disabled={generatingTargeted || loadingWords}
                    className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg flex items-center justify-center gap-2"
                  >
                    {loadingWords ? 'Loading Word List...' : generatingTargeted ? (<>Generating... <Loader2 className="w-5 h-5 animate-spin" style={{ animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', animationDuration: '0.8s' }} /></>) : 'Generate Phrase'}
                  </button>
                  <button
                    onClick={handleGenerateRandomRepdigits}
                    disabled={generatingRandom || loadingWords}
                    className="w-full bg-zinc-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-zinc-600 transition duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg flex items-center justify-center gap-2"
                  >
                    {loadingWords ? 'Loading Word List...' : generatingRandom ? (<>Generating... <Loader2 className="w-5 h-5 animate-spin" style={{ animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', animationDuration: '0.8s' }} /></>) : 'Generate Random Phrase'}
                  </button>
                </div>
              </div>

              {/* Manual Input Section */}
              <div>
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3">
                  Calculate Phrase Value and Generate Anagrams
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Enter a word or phrase:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCalculate()}
                        placeholder=""
                        className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-base md:text-lg text-gray-900 placeholder-gray-400"
                      />
                      <button
                        onClick={handleCopy}
                        disabled={!input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={handleCalculate}
                      className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition duration-300 shadow-lg text-base md:text-lg"
                    >
                      Calculate Value
                    </button>
                    <button
                      onClick={handleGenerateAnagram}
                      className="w-full bg-zinc-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-zinc-600 transition duration-300 shadow-lg text-base md:text-lg"
                    >
                      Generate Anagram
                    </button>
                  </div>
                </div>
              </div>

              {/* Download and Clear Buttons */}
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-3">
                <button
                  onClick={downloadPhraseTable}
                  disabled={clearing || downloading || generatedPhrases.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                  title={generatedPhrases.length > 0 ? `Download tessellation with ${generatedPhrases.length} phrase${generatedPhrases.length !== 1 ? 's' : ''}` : 'Generate phrases first'}
                >
                  {downloading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" style={{ animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', animationDuration: '0.8s' }} /> {downloadProgress || 'Downloading...'}</>
                  ) : (
                    <><Download className="w-5 h-5" /> Download Tessellation {generatedPhrases.length > 0 && `(${generatedPhrases.length})`}</>
                  )}
                </button>
                <button
                  onClick={handleClearPhrases}
                  disabled={clearing}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                  title={generatedPhrases.length > 0 ? 'Clear all generated phrases' : 'No phrases to clear'}
                >
                  {clearing ? (
                    <>Clearing... <Loader2 className="w-5 h-5 animate-spin" style={{ animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', animationDuration: '0.8s' }} /></>
                  ) : (
                    <><Trash2 className="w-5 h-5" /> Clear Phrases</>
                  )}
                </button>
              </div>
            </div>

            {/* Results Section */}
            {results && (
              <div className="mt-8 mb-8 space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-white text-center pb-4 border-b border-zinc-800">
                  Results for "{results.input}"
                </h2>

                {/* Hebrew */}
                <div className="bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-700">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      Hebrew
                    </h3>
                    <span className="text-2xl md:text-3xl font-bold text-red-500">
                      {results.hebrew.total}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 mt-2 break-words font-mono">
                    {results.input} = {formatBreakdown(results.hebrew.breakdown)} = {results.hebrew.total}
                  </p>
                </div>

                {/* English */}
                <div className="bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-700">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      English
                    </h3>
                    <span className="text-2xl md:text-3xl font-bold text-red-500">
                      {results.english.total}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 mt-2 break-words font-mono">
                    {results.input} = {formatBreakdown(results.english.breakdown)} = {results.english.total}
                  </p>
                </div>

                {/* English (Simple) */}
                <div className="bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-700">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      English (Simple)
                    </h3>
                    <span className="text-2xl md:text-3xl font-bold text-red-500">
                      {results.simple.total}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 mt-2 break-words font-mono">
                    {results.input} = {formatBreakdown(results.simple.breakdown)} = {results.simple.total}
                  </p>
                </div>

                {/* English (Aik Bekar⁹) */}
                {results.aiqBekar && (
                  <div className="bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-700">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-lg md:text-xl font-bold text-white">
                        English (Aik Bekar⁹)
                      </h3>
                      <span className="text-2xl md:text-3xl font-bold text-red-500">
                        {results.aiqBekar.total}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-gray-400 mt-2 break-words font-mono">
                      {results.input} = {formatBreakdown(results.aiqBekar.breakdown)} = {results.aiqBekar.total}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-black border-t border-zinc-800 pt-8 pb-3 text-center text-xs md:text-sm text-gray-500">
            <p>Based on <a href="https://gematrix.org" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline">gematrix.org</a>. Vibe coded by <a href="https://petebunke.com" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline">Pete Bunke</a>. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      {errorModal.show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity duration-300"
          onClick={() => {
            setErrorModal({ show: false, message: '' });
            setGeneratingTargeted(false);
            setGeneratingRandom(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              setErrorModal({ show: false, message: '' });
              setGeneratingTargeted(false);
              setGeneratingRandom(false);
            }
          }}
          tabIndex={0}
          ref={(el) => el && el.focus()}
        >
          <div
            className="relative max-w-md w-full bg-red-600 text-white rounded-lg shadow-2xl p-6 transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setErrorModal({ show: false, message: '' });
                setGeneratingTargeted(false);
                setGeneratingRandom(false);
              }}
              className="absolute top-3 right-3 text-white hover:text-gray-200 text-2xl font-bold leading-none transition-colors"
              aria-label="Close"
            >
              ×
            </button>
            <p className="text-base md:text-lg mb-4">
              {errorModal.message}
            </p>
            <button
              onClick={() => {
                setErrorModal({ show: false, message: '' });
                setGeneratingTargeted(false);
                setGeneratingRandom(false);
              }}
              className="w-full bg-white text-red-600 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GematriaCalculator;
