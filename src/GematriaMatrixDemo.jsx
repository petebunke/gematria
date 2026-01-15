import React, { useState, useMemo, useRef, useEffect } from 'react';

/**
 * Gematria Matrix Visualization Demo
 *
 * This demo shows how chartjs-chart-matrix could visualize gematria values
 * for phrases in a grid-paper-like X/Y matrix where:
 *
 * - X axis: Hebrew Gematria value (bucketed into ranges)
 * - Y axis: English Gematria value (bucketed into ranges)
 * - Z (color): Simple Gematria value (darker = higher)
 * - 4th dimension (Aik Bekar): Cell SIZE (larger = higher value)
 */

// Gematria calculation values (from gematrix.org)
const hebrewValues = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 600,
  k: 10, l: 20, m: 30, n: 40, o: 50, p: 60, q: 70, r: 80, s: 90, t: 100,
  u: 200, v: 700, w: 900, x: 300, y: 400, z: 500
};

const englishValues = {
  a: 6, b: 12, c: 18, d: 24, e: 30, f: 36, g: 42, h: 48, i: 54, j: 60,
  k: 66, l: 72, m: 78, n: 84, o: 90, p: 96, q: 102, r: 108, s: 114, t: 120,
  u: 126, v: 132, w: 138, x: 144, y: 150, z: 156
};

const simpleValues = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10,
  k: 11, l: 12, m: 13, n: 14, o: 15, p: 16, q: 17, r: 18, s: 19, t: 20,
  u: 21, v: 22, w: 23, x: 24, y: 25, z: 26
};

const aiqBekarValues = {
  a: 1, b: 20, c: 13, d: 6, e: 8, f: 17, g: 19, h: 3, i: 5, j: 14,
  k: 16, l: 9, m: 11, n: 22, o: 15, p: 7, q: 18, r: 21, s: 4, t: 13,
  u: 6, v: 8, w: 17, x: 19, y: 3, z: 5
};

const calculateGematria = (text, values) => {
  let total = 0;
  const cleanText = text.toLowerCase().replace(/[^a-z]/g, '');
  for (let char of cleanText) {
    total += values[char] || 0;
  }
  return total;
};

const calculateAllGematria = (phrase) => ({
  phrase,
  hebrew: calculateGematria(phrase, hebrewValues),
  english: calculateGematria(phrase, englishValues),
  simple: calculateGematria(phrase, simpleValues),
  aiqBekar: calculateGematria(phrase, aiqBekarValues)
});

// Sample phrases for demonstration
const samplePhrases = [
  "stunner",
  "gematria",
  "calculator",
  "matrix",
  "number",
  "cipher",
  "decode",
  "pattern",
  "sacred",
  "geometry",
  "wisdom",
  "truth",
  "light",
  "divine",
  "spirit",
  "energy",
  "vibration",
  "frequency",
  "harmony",
  "balance",
  "creation",
  "manifest",
  "universe",
  "cosmic",
  "eternal"
];

// Color scale based on Simple Gematria (Z axis)
const getColorForSimple = (simple, maxSimple) => {
  const normalized = Math.min(simple / maxSimple, 1);
  // Purple to yellow gradient through dark
  const r = Math.floor(30 + normalized * 180);
  const g = Math.floor(20 + normalized * 120);
  const b = Math.floor(80 + (1 - normalized) * 120);
  return `rgb(${r}, ${g}, ${b})`;
};

// Cell size based on Aik Bekar (4th dimension)
const getSizeForAiqBekar = (aiqBekar, maxAiqBekar, baseSize = 24, maxSize = 48) => {
  const normalized = Math.min(aiqBekar / maxAiqBekar, 1);
  return baseSize + normalized * (maxSize - baseSize);
};

export default function GematriaMatrixDemo() {
  const [phrases, setPhrases] = useState(samplePhrases);
  const [newPhrase, setNewPhrase] = useState('');
  const [hoveredCell, setHoveredCell] = useState(null);
  const [fourthDimension, setFourthDimension] = useState('size'); // 'size', 'opacity', 'border'
  const canvasRef = useRef(null);

  // Calculate gematria for all phrases
  const phraseData = useMemo(() => {
    return phrases.map(calculateAllGematria);
  }, [phrases]);

  // Find max values for normalization
  const maxValues = useMemo(() => ({
    hebrew: Math.max(...phraseData.map(p => p.hebrew)),
    english: Math.max(...phraseData.map(p => p.english)),
    simple: Math.max(...phraseData.map(p => p.simple)),
    aiqBekar: Math.max(...phraseData.map(p => p.aiqBekar))
  }), [phraseData]);

  // Create grid buckets
  const gridConfig = useMemo(() => {
    const hebrewBuckets = 10;
    const englishBuckets = 10;
    const hebrewStep = Math.ceil(maxValues.hebrew / hebrewBuckets);
    const englishStep = Math.ceil(maxValues.english / englishBuckets);

    return {
      hebrewBuckets,
      englishBuckets,
      hebrewStep,
      englishStep
    };
  }, [maxValues]);

  // Group phrases into grid cells
  const gridData = useMemo(() => {
    const grid = {};

    phraseData.forEach(data => {
      const xBucket = Math.floor(data.hebrew / gridConfig.hebrewStep);
      const yBucket = Math.floor(data.english / gridConfig.englishStep);
      const key = `${xBucket}-${yBucket}`;

      if (!grid[key]) {
        grid[key] = [];
      }
      grid[key].push(data);
    });

    return grid;
  }, [phraseData, gridConfig]);

  // Canvas-based matrix rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const cellWidth = (width - padding * 2) / gridConfig.hebrewBuckets;
    const cellHeight = (height - padding * 2) / gridConfig.englishBuckets;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines (graph paper effect)
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 1;

    for (let i = 0; i <= gridConfig.hebrewBuckets; i++) {
      const x = padding + i * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    for (let j = 0; j <= gridConfig.englishBuckets; j++) {
      const y = padding + j * cellHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw axis labels
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';

    // X-axis labels (Hebrew)
    for (let i = 0; i <= gridConfig.hebrewBuckets; i++) {
      const x = padding + i * cellWidth;
      const value = i * gridConfig.hebrewStep;
      ctx.fillText(value.toString(), x, height - padding + 20);
    }

    // Y-axis labels (English) - inverted so higher values are at top
    for (let j = 0; j <= gridConfig.englishBuckets; j++) {
      const y = height - padding - j * cellHeight;
      const value = j * gridConfig.englishStep;
      ctx.textAlign = 'right';
      ctx.fillText(value.toString(), padding - 10, y + 4);
    }

    // Axis titles
    ctx.fillStyle = '#888';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Hebrew Gematria →', width / 2, height - 15);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('English Gematria →', 0, 0);
    ctx.restore();

    // Draw data points
    Object.entries(gridData).forEach(([key, cellPhrases]) => {
      const [xBucket, yBucket] = key.split('-').map(Number);

      // Average values for the cell
      const avgSimple = cellPhrases.reduce((sum, p) => sum + p.simple, 0) / cellPhrases.length;
      const avgAiqBekar = cellPhrases.reduce((sum, p) => sum + p.aiqBekar, 0) / cellPhrases.length;

      const centerX = padding + (xBucket + 0.5) * cellWidth;
      const centerY = height - padding - (yBucket + 0.5) * cellHeight;

      // Get visual properties based on 4th dimension mode
      const baseSize = Math.min(cellWidth, cellHeight) * 0.3;
      let size = baseSize;
      let opacity = 1;
      let borderWidth = 0;

      if (fourthDimension === 'size') {
        size = getSizeForAiqBekar(avgAiqBekar, maxValues.aiqBekar, baseSize * 0.5, baseSize * 1.5);
      } else if (fourthDimension === 'opacity') {
        opacity = 0.3 + (avgAiqBekar / maxValues.aiqBekar) * 0.7;
      } else if (fourthDimension === 'border') {
        borderWidth = 1 + (avgAiqBekar / maxValues.aiqBekar) * 4;
      }

      // Color based on Simple Gematria (Z axis)
      const color = getColorForSimple(avgSimple, maxValues.simple);

      // Draw cell
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
      ctx.fill();

      if (borderWidth > 0) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = borderWidth;
        ctx.stroke();
      }

      // Show phrase count
      if (cellPhrases.length > 1) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cellPhrases.length.toString(), centerX, centerY + 4);
      }

      ctx.globalAlpha = 1;
    });

  }, [gridData, gridConfig, maxValues, fourthDimension]);

  const addPhrase = () => {
    if (newPhrase.trim() && !phrases.includes(newPhrase.trim().toLowerCase())) {
      setPhrases([...phrases, newPhrase.trim().toLowerCase()]);
      setNewPhrase('');
    }
  };

  // Get cell info for tooltip
  const getCellAtPosition = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = 60;
    const cellWidth = (canvas.width - padding * 2) / gridConfig.hebrewBuckets;
    const cellHeight = (canvas.height - padding * 2) / gridConfig.englishBuckets;

    const xBucket = Math.floor((x - padding) / cellWidth);
    const yBucket = gridConfig.englishBuckets - 1 - Math.floor((y - padding) / cellHeight);

    if (xBucket >= 0 && xBucket < gridConfig.hebrewBuckets &&
        yBucket >= 0 && yBucket < gridConfig.englishBuckets) {
      const key = `${xBucket}-${yBucket}`;
      if (gridData[key]) {
        return {
          phrases: gridData[key],
          x: e.clientX,
          y: e.clientY
        };
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Gematria Matrix Visualization</h1>
        <p className="text-zinc-400 mb-8">
          A grid-paper-like X/Y matrix where Z is color intensity
        </p>

        {/* Legend */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <div className="text-sm text-zinc-500 mb-1">X Axis</div>
            <div className="font-bold text-purple-400">Hebrew Gematria</div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <div className="text-sm text-zinc-500 mb-1">Y Axis</div>
            <div className="font-bold text-blue-400">English Gematria</div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <div className="text-sm text-zinc-500 mb-1">Color (Z)</div>
            <div className="font-bold text-green-400">Simple Gematria</div>
            <div className="text-xs text-zinc-500 mt-1">Darker purple → brighter yellow</div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <div className="text-sm text-zinc-500 mb-1">4th Dimension</div>
            <div className="font-bold text-red-400">Aik Bekar</div>
            <select
              value={fourthDimension}
              onChange={(e) => setFourthDimension(e.target.value)}
              className="mt-2 w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
            >
              <option value="size">Cell Size</option>
              <option value="opacity">Opacity</option>
              <option value="border">Border Thickness</option>
            </select>
          </div>
        </div>

        {/* Matrix Canvas */}
        <div className="relative bg-zinc-900 rounded-lg border border-zinc-800 p-4 mb-8">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full cursor-crosshair"
            onMouseMove={(e) => setHoveredCell(getCellAtPosition(e))}
            onMouseLeave={() => setHoveredCell(null)}
          />

          {/* Tooltip */}
          {hoveredCell && (
            <div
              className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl max-w-xs"
              style={{
                left: hoveredCell.x + 10,
                top: hoveredCell.y + 10,
                pointerEvents: 'none'
              }}
            >
              <div className="text-xs text-zinc-500 mb-2">
                {hoveredCell.phrases.length} phrase(s) in this cell
              </div>
              {hoveredCell.phrases.slice(0, 5).map((p, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <div className="font-bold text-white">{p.phrase}</div>
                  <div className="text-xs text-zinc-400">
                    H:{p.hebrew} E:{p.english} S:{p.simple} A:{p.aiqBekar}
                  </div>
                </div>
              ))}
              {hoveredCell.phrases.length > 5 && (
                <div className="text-xs text-zinc-500">
                  +{hoveredCell.phrases.length - 5} more...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add phrase */}
        <div className="flex gap-4 mb-8">
          <input
            type="text"
            value={newPhrase}
            onChange={(e) => setNewPhrase(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPhrase()}
            placeholder="Add a phrase to visualize..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2"
          />
          <button
            onClick={addPhrase}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium"
          >
            Add
          </button>
        </div>

        {/* Phrase Table */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800">
              <tr>
                <th className="text-left p-3">Phrase</th>
                <th className="text-right p-3 text-purple-400">Hebrew</th>
                <th className="text-right p-3 text-blue-400">English</th>
                <th className="text-right p-3 text-green-400">Simple</th>
                <th className="text-right p-3 text-red-400">Aik Bekar</th>
              </tr>
            </thead>
            <tbody>
              {phraseData.map((data, i) => (
                <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                  <td className="p-3 font-mono">{data.phrase}</td>
                  <td className="p-3 text-right text-purple-400">{data.hebrew}</td>
                  <td className="p-3 text-right text-blue-400">{data.english}</td>
                  <td className="p-3 text-right text-green-400">{data.simple}</td>
                  <td className="p-3 text-right text-red-400">{data.aiqBekar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Example: "stunner" calculation */}
        <div className="mt-8 p-6 bg-zinc-900 rounded-lg border border-zinc-800">
          <h2 className="text-xl font-bold mb-4">Example: "stunner"</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(() => {
              const data = calculateAllGematria('stunner');
              return (
                <>
                  <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                    <div className="text-3xl font-bold text-purple-400">{data.hebrew}</div>
                    <div className="text-sm text-purple-300">Hebrew</div>
                  </div>
                  <div className="text-center p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                    <div className="text-3xl font-bold text-blue-400">{data.english}</div>
                    <div className="text-sm text-blue-300">English</div>
                  </div>
                  <div className="text-center p-4 bg-green-900/20 rounded-lg border border-green-800">
                    <div className="text-3xl font-bold text-green-400">{data.simple}</div>
                    <div className="text-sm text-green-300">Simple</div>
                  </div>
                  <div className="text-center p-4 bg-red-900/20 rounded-lg border border-red-800">
                    <div className="text-3xl font-bold text-red-400">{data.aiqBekar}</div>
                    <div className="text-sm text-red-300">Aik Bekar</div>
                  </div>
                </>
              );
            })()}
          </div>
          <p className="mt-4 text-zinc-400 text-sm">
            Note: Values are calculated using the formulas from gematrix.org.
            Your reference of 555/666/111/111 may use different calculation methods.
          </p>
        </div>

        {/* Implementation Notes */}
        <div className="mt-8 p-6 bg-zinc-900 rounded-lg border border-zinc-800">
          <h2 className="text-xl font-bold mb-4">How This Works</h2>
          <div className="space-y-4 text-zinc-300 text-sm">
            <div>
              <strong className="text-white">X/Y Grid:</strong> Hebrew and English gematria values
              are bucketed into ranges, creating a 10x10 grid. Each cell represents a range of values.
            </div>
            <div>
              <strong className="text-white">Z (Color):</strong> Simple Gematria determines the color
              intensity. Lower values appear as dark purple, higher values shift toward bright yellow.
            </div>
            <div>
              <strong className="text-white">4th Dimension (Aik Bekar):</strong> You can toggle between
              three visual representations:
              <ul className="list-disc list-inside mt-2 ml-4">
                <li><strong>Cell Size:</strong> Larger circles = higher Aik Bekar values</li>
                <li><strong>Opacity:</strong> More opaque = higher values</li>
                <li><strong>Border Thickness:</strong> Thicker white border = higher values</li>
              </ul>
            </div>
            <div>
              <strong className="text-white">Hover:</strong> Mouse over any cell to see the
              phrases contained within and their exact values.
            </div>
          </div>
        </div>

        {/* Chart.js Matrix Implementation Notes */}
        <div className="mt-8 p-6 bg-zinc-900 rounded-lg border border-yellow-800/50">
          <h2 className="text-xl font-bold mb-4 text-yellow-400">chartjs-chart-matrix Implementation</h2>
          <div className="space-y-4 text-zinc-300 text-sm">
            <p>
              This demo uses raw Canvas API for flexibility. To use <code className="text-yellow-400">chartjs-chart-matrix</code>:
            </p>
            <pre className="bg-black p-4 rounded text-xs overflow-x-auto">
{`npm install chart.js chartjs-chart-matrix

// Usage:
import { Chart } from 'chart.js/auto';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';

Chart.register(MatrixController, MatrixElement);

const config = {
  type: 'matrix',
  data: {
    datasets: [{
      data: phrases.map(p => ({
        x: p.hebrew,
        y: p.english,
        v: p.simple  // value for color
      })),
      backgroundColor: (ctx) => getColor(ctx.raw.v),
      width: (ctx) => getSize(ctx.raw.aiqBekar),  // 4th dimension
      height: (ctx) => getSize(ctx.raw.aiqBekar)
    }]
  }
};`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
