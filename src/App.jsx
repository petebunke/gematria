import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calculator, Copy, Check, Download, Loader2, Trash2 } from 'lucide-react';

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
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });
  const [copied, setCopied] = useState(false);
  const [clearing, setClearing] = useState(false);
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

  const downloadPhraseTable = () => {
    if (generatedPhrases.length === 0) {
      alert('No phrases generated yet!');
      return;
    }

    // Sort by combination (Hebrew, English, Simple, Aik Bekar⁹)
    const sorted = [...generatedPhrases].sort((a, b) => {
      if (a.hebrew !== b.hebrew) return a.hebrew - b.hebrew;
      if (a.english !== b.english) return a.english - b.english;
      if (a.simple !== b.simple) return a.simple - b.simple;
      return (a.aiqBekar || 0) - (b.aiqBekar || 0);
    });

    // Create HTML content for PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Gematria Generated Phrases - ${new Date().toLocaleDateString()}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #dc2626;
      border-bottom: 3px solid #dc2626;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .meta {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #dc2626;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: bold;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .phrase {
      font-weight: 600;
      color: #1f2937;
    }
    .numbers {
      font-family: monospace;
      color: #dc2626;
    }
    .source {
      text-transform: capitalize;
      color: #4b5563;
    }
    @media print {
      body { padding: 10px; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Gematria Generated Phrases</h1>
  <div class="meta">
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Total Phrases:</strong> ${sorted.length}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Phrase</th>
        <th>Hebrew</th>
        <th>English</th>
        <th>Simple</th>
        <th>Aik Bekar⁹</th>
        <th>Combination</th>
        <th>Source</th>
        <th>Gen Time</th>
        <th>Timestamp</th>
      </tr>
    </thead>
    <tbody>
      ${sorted.map(p => `
        <tr>
          <td class="phrase">${p.phrase}</td>
          <td class="numbers">${p.hebrew}</td>
          <td class="numbers">${p.english}</td>
          <td class="numbers">${p.simple}</td>
          <td class="numbers">${p.aiqBekar || '-'}</td>
          <td class="numbers">${p.hebrew}/${p.english}/${p.simple}/${p.aiqBekar || '-'}</td>
          <td class="source">${p.source}</td>
          <td class="numbers">${p.generationTime ? (p.generationTime / 1000).toFixed(2) + 's' : '-'}</td>
          <td>${new Date(p.timestamp).toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
    `;

    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Trigger print dialog after content loads
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
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

  // Helper to check if a phrase has duplicate words
  const hasDuplicateWords = (phrase) => {
    if (!phrase) return false;
    const words = phrase.toLowerCase().split(' ');
    return words.length !== new Set(words).size;
  };

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

    // DETERMINISTIC SEARCH for constrained 3-way targets (no Aik Bekar)
    // This guarantees finding a match if one exists
    if (!enabledFlags.aiq && enabledFlags.heb && enabledFlags.eng && enabledFlags.sim) {
      console.log('🔍 Using deterministic search for 3-way match...');

      // Try 2-word phrases first (most reliable)
      console.log('  Trying 2-word combinations...');
      const simWords = [];
      // Get all words with simple values that could be part of a 2-word phrase
      for (let s = 1; s < targetSim; s++) {
        const words = bySimple.get(s);
        if (words) simWords.push(...words);
      }
      // Shuffle for variety
      for (let i = simWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [simWords[i], simWords[j]] = [simWords[j], simWords[i]];
      }

      for (const w1 of simWords) {
        if (Date.now() - startTime > timeoutMs) break;

        const needHeb = targetHeb - w1.heb;
        const needEng = targetEng - w1.eng;
        const needSim = targetSim - w1.sim;

        if (needHeb < 1 || needEng < 1 || needSim < 1) continue;

        // Look for exact match using smallest bucket
        const candidates = bySimple.get(needSim) || [];
        for (const w2 of candidates) {
          if (w2.heb === needHeb && w2.eng === needEng && w2.word !== w1.word) {
            const phrase = `${w1.word} ${w2.word}`;
            console.log(`✅ Found 2-word match: "${phrase}"`);
            return phrase;
          }
        }
      }

      // Try 3-word phrases
      console.log('  Trying 3-word combinations...');
      let attempts3 = 0;
      for (const w1 of simWords) {
        if (Date.now() - startTime > timeoutMs) break;
        if (attempts3++ > 5000) break; // Limit first word iterations

        for (const w2 of simWords) {
          if (Date.now() - startTime > timeoutMs) break;
          if (w2.word === w1.word) continue;

          const needHeb = targetHeb - w1.heb - w2.heb;
          const needEng = targetEng - w1.eng - w2.eng;
          const needSim = targetSim - w1.sim - w2.sim;

          if (needHeb < 1 || needEng < 1 || needSim < 1) continue;

          const candidates = bySimple.get(needSim) || [];
          for (const w3 of candidates) {
            if (w3.heb === needHeb && w3.eng === needEng &&
                w3.word !== w1.word && w3.word !== w2.word) {
              const phrase = `${w1.word} ${w2.word} ${w3.word}`;
              console.log(`✅ Found 3-word match: "${phrase}"`);
              return phrase;
            }
          }
        }
      }

      // Try 4-word phrases for larger targets
      if (targetSim > 80) {
        console.log('  Trying 4-word combinations...');
        let attempts4 = 0;
        for (const w1 of simWords.slice(0, 200)) {
          if (Date.now() - startTime > timeoutMs) break;

          for (const w2 of simWords.slice(0, 200)) {
            if (Date.now() - startTime > timeoutMs) break;
            if (w2.word === w1.word) continue;
            attempts4++;
            if (attempts4 > 10000) break;

            for (const w3 of simWords) {
              if (Date.now() - startTime > timeoutMs) break;
              if (w3.word === w1.word || w3.word === w2.word) continue;

              const needHeb = targetHeb - w1.heb - w2.heb - w3.heb;
              const needEng = targetEng - w1.eng - w2.eng - w3.eng;
              const needSim = targetSim - w1.sim - w2.sim - w3.sim;

              if (needHeb < 1 || needEng < 1 || needSim < 1) continue;

              const candidates = bySimple.get(needSim) || [];
              for (const w4 of candidates) {
                if (w4.heb === needHeb && w4.eng === needEng &&
                    w4.word !== w1.word && w4.word !== w2.word && w4.word !== w3.word) {
                  const phrase = `${w1.word} ${w2.word} ${w3.word} ${w4.word}`;
                  console.log(`✅ Found 4-word match: "${phrase}"`);
                  return phrase;
                }
              }
            }
          }
        }
      }

      console.log('  Deterministic search exhausted, falling back to random...');
    }

    // DETERMINISTIC SEARCH for 4-way targets (with Aik Bekar)
    if (enabledFlags.aiq && enabledFlags.heb && enabledFlags.eng && enabledFlags.sim && targetAiq > 0) {
      console.log('🔍 Using deterministic search for 4-way match...');

      // Get all words that could be part of the phrase (based on smallest target)
      const minVal = Math.min(targetSim, targetAiq);
      const allWords = [];

      // For XXXX targets (>= 1111), prioritize HIGH-VALUE words
      // Otherwise we waste time on tiny words that can never sum to 1111
      const isXXXXTarget = targetSim >= 1111 || targetHeb >= 5000;
      const minWordValue = isXXXXTarget ? 50 : 1; // Only use words with simple >= 50 for XXXX

      for (let s = minWordValue; s < minVal; s++) {
        const words = bySimple.get(s);
        if (words) allWords.push(...words);
      }
      // Also add words matching exactly the targets (for single-word edge cases)
      const exactSim = bySimple.get(targetSim) || [];
      allWords.push(...exactSim);

      // For XXXX targets, sort by simple value DESCENDING so we try high-value words first
      if (isXXXXTarget) {
        allWords.sort((a, b) => b.sim - a.sim);
        console.log(`  XXXX target: using ${allWords.length} high-value words (simple >= ${minWordValue})`);
      }

      // Shuffle for variety (but keep high-value bias for XXXX)
      // For XXXX, only shuffle within value bands to maintain high-value priority
      if (!isXXXXTarget) {
        for (let i = allWords.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
        }
      } else {
        // Shuffle in chunks of 100 to add variety while keeping high values first
        for (let chunk = 0; chunk < allWords.length; chunk += 100) {
          const end = Math.min(chunk + 100, allWords.length);
          for (let i = end - 1; i > chunk; i--) {
            const j = chunk + Math.floor(Math.random() * (i - chunk + 1));
            [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
          }
        }
      }

      // Try 2-word phrases
      console.log('  Trying 2-word 4-way combinations...');
      for (const w1 of allWords) {
        if (Date.now() - startTime > timeoutMs) break;

        const needHeb = targetHeb - w1.heb;
        const needEng = targetEng - w1.eng;
        const needSim = targetSim - w1.sim;
        const needAiq = targetAiq - w1.aiq;

        if (needHeb < 1 || needEng < 1 || needSim < 1 || needAiq < 1) continue;

        // Use smallest bucket for lookup
        const candidates = bySimple.get(needSim) || [];
        for (const w2 of candidates) {
          if (w2.heb === needHeb && w2.eng === needEng && w2.aiq === needAiq && w2.word !== w1.word) {
            const phrase = `${w1.word} ${w2.word}`;
            console.log(`✅ Found 2-word 4-way match: "${phrase}"`);
            return phrase;
          }
        }
      }

      // Try 3-word phrases
      console.log('  Trying 3-word 4-way combinations...');
      let attempts3 = 0;
      for (const w1 of allWords) {
        if (Date.now() - startTime > timeoutMs) break;
        if (attempts3++ > 10000) break;

        for (const w2 of allWords) {
          if (Date.now() - startTime > timeoutMs) break;
          if (w2.word === w1.word) continue;

          const needHeb = targetHeb - w1.heb - w2.heb;
          const needEng = targetEng - w1.eng - w2.eng;
          const needSim = targetSim - w1.sim - w2.sim;
          const needAiq = targetAiq - w1.aiq - w2.aiq;

          if (needHeb < 1 || needEng < 1 || needSim < 1 || needAiq < 1) continue;

          const candidates = bySimple.get(needSim) || [];
          for (const w3 of candidates) {
            if (w3.heb === needHeb && w3.eng === needEng && w3.aiq === needAiq &&
                w3.word !== w1.word && w3.word !== w2.word) {
              const phrase = `${w1.word} ${w2.word} ${w3.word}`;
              console.log(`✅ Found 3-word 4-way match: "${phrase}"`);
              return phrase;
            }
          }
        }
      }

      // Try 4-word phrases
      console.log('  Trying 4-word 4-way combinations...');
      let attempts4 = 0;
      for (const w1 of allWords.slice(0, 300)) {
        if (Date.now() - startTime > timeoutMs) break;

        for (const w2 of allWords.slice(0, 300)) {
          if (Date.now() - startTime > timeoutMs) break;
          if (w2.word === w1.word) continue;
          attempts4++;
          if (attempts4 > 20000) break;

          for (const w3 of allWords) {
            if (Date.now() - startTime > timeoutMs) break;
            if (w3.word === w1.word || w3.word === w2.word) continue;

            const needHeb = targetHeb - w1.heb - w2.heb - w3.heb;
            const needEng = targetEng - w1.eng - w2.eng - w3.eng;
            const needSim = targetSim - w1.sim - w2.sim - w3.sim;
            const needAiq = targetAiq - w1.aiq - w2.aiq - w3.aiq;

            if (needHeb < 1 || needEng < 1 || needSim < 1 || needAiq < 1) continue;

            const candidates = bySimple.get(needSim) || [];
            for (const w4 of candidates) {
              if (w4.heb === needHeb && w4.eng === needEng && w4.aiq === needAiq &&
                  w4.word !== w1.word && w4.word !== w2.word && w4.word !== w3.word) {
                const phrase = `${w1.word} ${w2.word} ${w3.word} ${w4.word}`;
                console.log(`✅ Found 4-word 4-way match: "${phrase}"`);
                return phrase;
              }
            }
          }
        }
      }

      // Try 5-word phrases for very large targets
      if (targetSim >= 1111 || targetHeb >= 5000) {
        console.log('  Trying 5-word 4-way combinations...');
        // Use larger search space for 5-word phrases
        const searchLimit = 300;
        for (const w1 of allWords.slice(0, searchLimit)) {
          if (Date.now() - startTime > timeoutMs) break;

          for (const w2 of allWords.slice(0, searchLimit)) {
            if (w2.word === w1.word) continue;
            if (Date.now() - startTime > timeoutMs) break;

            for (const w3 of allWords.slice(0, searchLimit)) {
              if (w3.word === w1.word || w3.word === w2.word) continue;
              if (Date.now() - startTime > timeoutMs) break;

              for (const w4 of allWords) {
                if (w4.word === w1.word || w4.word === w2.word || w4.word === w3.word) continue;
                if (Date.now() - startTime > timeoutMs) break;

                const needHeb = targetHeb - w1.heb - w2.heb - w3.heb - w4.heb;
                const needEng = targetEng - w1.eng - w2.eng - w3.eng - w4.eng;
                const needSim = targetSim - w1.sim - w2.sim - w3.sim - w4.sim;
                const needAiq = targetAiq - w1.aiq - w2.aiq - w3.aiq - w4.aiq;

                if (needHeb < 1 || needEng < 1 || needSim < 1 || needAiq < 1) continue;

                const candidates = bySimple.get(needSim) || [];
                for (const w5 of candidates) {
                  if (w5.heb === needHeb && w5.eng === needEng && w5.aiq === needAiq &&
                      w5.word !== w1.word && w5.word !== w2.word && w5.word !== w3.word && w5.word !== w4.word) {
                    const phrase = `${w1.word} ${w2.word} ${w3.word} ${w4.word} ${w5.word}`;
                    console.log(`✅ Found 5-word 4-way match: "${phrase}"`);
                    return phrase;
                  }
                }
              }
            }
          }
        }
      }

      // Try 6-word phrases for extremely large targets
      if (targetSim >= 1111 || targetHeb >= 5000) {
        console.log('  Trying 6-word 4-way combinations...');
        const searchLimit6 = 150;
        for (const w1 of allWords.slice(0, searchLimit6)) {
          if (Date.now() - startTime > timeoutMs) break;

          for (const w2 of allWords.slice(0, searchLimit6)) {
            if (w2.word === w1.word) continue;
            if (Date.now() - startTime > timeoutMs) break;

            for (const w3 of allWords.slice(0, searchLimit6)) {
              if (w3.word === w1.word || w3.word === w2.word) continue;
              if (Date.now() - startTime > timeoutMs) break;

              for (const w4 of allWords.slice(0, searchLimit6)) {
                if (w4.word === w1.word || w4.word === w2.word || w4.word === w3.word) continue;
                if (Date.now() - startTime > timeoutMs) break;

                for (const w5 of allWords) {
                  if (w5.word === w1.word || w5.word === w2.word || w5.word === w3.word || w5.word === w4.word) continue;
                  if (Date.now() - startTime > timeoutMs) break;

                  const needHeb = targetHeb - w1.heb - w2.heb - w3.heb - w4.heb - w5.heb;
                  const needEng = targetEng - w1.eng - w2.eng - w3.eng - w4.eng - w5.eng;
                  const needSim = targetSim - w1.sim - w2.sim - w3.sim - w4.sim - w5.sim;
                  const needAiq = targetAiq - w1.aiq - w2.aiq - w3.aiq - w4.aiq - w5.aiq;

                  if (needHeb < 1 || needEng < 1 || needSim < 1 || needAiq < 1) continue;

                  const candidates = bySimple.get(needSim) || [];
                  for (const w6 of candidates) {
                    if (w6.heb === needHeb && w6.eng === needEng && w6.aiq === needAiq &&
                        w6.word !== w1.word && w6.word !== w2.word && w6.word !== w3.word &&
                        w6.word !== w4.word && w6.word !== w5.word) {
                      const phrase = `${w1.word} ${w2.word} ${w3.word} ${w4.word} ${w5.word} ${w6.word}`;
                      console.log(`✅ Found 6-word 4-way match: "${phrase}"`);
                      return phrase;
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Try 7-word phrases for XXXX targets
      if (targetSim >= 1111 || targetHeb >= 5000) {
        console.log('  Trying 7-word 4-way combinations...');
        const searchLimit7 = 80;
        for (const w1 of allWords.slice(0, searchLimit7)) {
          if (Date.now() - startTime > timeoutMs) break;

          for (const w2 of allWords.slice(0, searchLimit7)) {
            if (w2.word === w1.word) continue;
            if (Date.now() - startTime > timeoutMs) break;

            for (const w3 of allWords.slice(0, searchLimit7)) {
              if (w3.word === w1.word || w3.word === w2.word) continue;
              if (Date.now() - startTime > timeoutMs) break;

              for (const w4 of allWords.slice(0, searchLimit7)) {
                if (w4.word === w1.word || w4.word === w2.word || w4.word === w3.word) continue;
                if (Date.now() - startTime > timeoutMs) break;

                for (const w5 of allWords.slice(0, searchLimit7)) {
                  if (w5.word === w1.word || w5.word === w2.word || w5.word === w3.word || w5.word === w4.word) continue;
                  if (Date.now() - startTime > timeoutMs) break;

                  for (const w6 of allWords) {
                    if (w6.word === w1.word || w6.word === w2.word || w6.word === w3.word ||
                        w6.word === w4.word || w6.word === w5.word) continue;
                    if (Date.now() - startTime > timeoutMs) break;

                    const needHeb = targetHeb - w1.heb - w2.heb - w3.heb - w4.heb - w5.heb - w6.heb;
                    const needEng = targetEng - w1.eng - w2.eng - w3.eng - w4.eng - w5.eng - w6.eng;
                    const needSim = targetSim - w1.sim - w2.sim - w3.sim - w4.sim - w5.sim - w6.sim;
                    const needAiq = targetAiq - w1.aiq - w2.aiq - w3.aiq - w4.aiq - w5.aiq - w6.aiq;

                    if (needHeb < 1 || needEng < 1 || needSim < 1 || needAiq < 1) continue;

                    const candidates = bySimple.get(needSim) || [];
                    for (const w7 of candidates) {
                      if (w7.heb === needHeb && w7.eng === needEng && w7.aiq === needAiq &&
                          w7.word !== w1.word && w7.word !== w2.word && w7.word !== w3.word &&
                          w7.word !== w4.word && w7.word !== w5.word && w7.word !== w6.word) {
                        const phrase = `${w1.word} ${w2.word} ${w3.word} ${w4.word} ${w5.word} ${w6.word} ${w7.word}`;
                        console.log(`✅ Found 7-word 4-way match: "${phrase}"`);
                        return phrase;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      console.log('  4-way deterministic search exhausted, falling back to random...');
    }

    // Dynamically adjust phrase length based on enabled target values
    // Use MINIMUM target to constrain maxWords (prevents wasted attempts)
    const enabledTargets = [];
    if (enabledFlags.heb) enabledTargets.push(targetHeb);
    if (enabledFlags.eng) enabledTargets.push(targetEng);
    if (enabledFlags.sim) enabledTargets.push(targetSim);
    if (enabledFlags.aiq) enabledTargets.push(targetAiq);
    const minTarget = enabledTargets.length > 0 ? Math.min(...enabledTargets) : 500;
    const maxTarget = enabledTargets.length > 0 ? Math.max(...enabledTargets) : 500;

    // Set minWords based on max target (need enough words to reach high values)
    // Set maxWords based on min target (can't have too many words for small values)
    let minWords, maxWords;
    if (maxTarget < 200) {
      minWords = 2; maxWords = 3;
    } else if (maxTarget < 500) {
      minWords = 2; maxWords = 4;
    } else if (maxTarget < 1000) {
      minWords = 2; maxWords = 5;
    } else if (maxTarget < 2000) {
      minWords = 2; maxWords = 7;
    } else if (maxTarget < 5000) {
      minWords = 3; maxWords = 10;
    } else {
      minWords = 4; maxWords = 15;
    }
    // Further constrain maxWords based on minimum target
    if (minTarget < 150) {
      maxWords = Math.min(maxWords, 4);
    } else if (minTarget < 300) {
      maxWords = Math.min(maxWords, 5);
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
      // Use longer timeout for large targets (5+ word phrases needed)
      const isLargeTarget = parseInt(targetSimple) >= 1111 || parseInt(targetHebrew) >= 5000;
      const timeout4way = isLargeTarget ? 25000 : 15000; // 25s for large, 15s for normal

      phrase = await generatePhrase(
        parseInt(targetHebrew),
        parseInt(targetEnglish),
        parseInt(targetSimple),
        targetAiq,
        enabledFlags4,
        2000000,
        timeout4way
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
        const maxTimeMs = 20000; // 20 more seconds

        for (let attempt = 0; attempt < 50; attempt++) {
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
      // Aik Bekar disabled - just do 3-way search with generous timeout
      phrase = await generatePhrase(
        parseInt(targetHebrew),
        parseInt(targetEnglish),
        parseInt(targetSimple),
        0,
        enabledFlags3,
        2000000,  // 2M attempts
        20000     // 20 second timeout
      );
    }

    console.log('Generation complete. Result:', phrase);

    // Check for duplicate phrase (against ALL session phrases) or duplicate words - retry if needed
    const existingPhrases = new Set(generatedPhrases.map(p => p.phrase.toLowerCase()));
    let retries = 0;
    while (phrase && (existingPhrases.has(phrase.toLowerCase()) || hasDuplicateWords(phrase)) && retries < 5) {
      const reason = existingPhrases.has(phrase.toLowerCase()) ? 'already generated' : 'has duplicate words';
      console.log(`⚠️ Phrase ${reason}, retrying... (attempt ${retries + 1})`);
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
      console.log('🎲 Collecting diverse 4-way repdigit phrases...');

      const startTime = Date.now();

      // All repdigits we care about
      const repdigitList = [11, 22, 33, 44, 55, 66, 77, 88, 99,
                           111, 222, 333, 444, 555, 666, 777, 888, 999,
                           1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999];
      const repSet = new Set(repdigitList);

      // PREFERRED combos - any XXXX/XXXX/XXXX/XXXX pattern (all 4-digit repdigits)
      const fourDigitRepdigits = new Set([1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999]);
      const isPreferredCombo = (h, e, s, a) => {
        return fourDigitRepdigits.has(h) && fourDigitRepdigits.has(e) &&
               fourDigitRepdigits.has(s) && fourDigitRepdigits.has(a);
      };

      // OVERUSED combos - use as last resort (includes all /99 and /111 patterns)
      const overusedCombos = new Set([
        '555/666/111/111',
        '555/666/111/99',
        '1111/666/111/111',
        '1111/666/111/99',
        '11/33/11/99',
        '222/666/111/99',
        '333/666/111/99',
        '444/666/111/99',
        '777/666/111/99',
        '777/666/111/111',
        '888/666/111/99',
        '888/666/111/111',
        '999/666/111/99',
      ]);

      // Get word data from cache
      const { wordData, bySimple } = wordCache;

      // Shuffle words for variety in what we find
      const shuffledWords = [...wordData];
      for (let i = shuffledWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
      }

      // Shuffle repdigit targets too
      const shuffledRepdigits = [...repdigitList];
      for (let i = shuffledRepdigits.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledRepdigits[i], shuffledRepdigits[j]] = [shuffledRepdigits[j], shuffledRepdigits[i]];
      }

      // Collect matches - prioritize XXXX/XXXX/XXXX/XXXX combos
      const goodMatches = new Map();
      const fallbackMatches = new Map();
      let totalMatches = 0;

      // 4-digit repdigits for Hebrew/English/Simple/Aiq
      const fourDigitReps = [1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999];
      const fourDigitSet = new Set(fourDigitReps);

      // PHASE 1: Search for XXXX/XXXX/XXXX/XXXX combos (20 seconds, with UI yields)
      console.log(`  Phase 1: Searching for XXXX/XXXX/XXXX/XXXX combos (20s)...`);
      const phase1End = 20000;

      // Generate diverse XXXX combos dynamically
      // All 4-digit repdigits for each position
      const xxxx = [1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999];
      const knownXXXXCombos = [];

      // Generate combos with variety in all positions
      for (const h of xxxx) {
        for (const e of xxxx) {
          for (const s of xxxx) {
            for (const a of xxxx) {
              // Only include feasible combos (not too extreme)
              if (h <= 9999 && e <= 9999 && s <= 2222 && a <= 2222) {
                knownXXXXCombos.push([h, e, s, a]);
              }
            }
          }
        }
      }
      console.log(`  Generated ${knownXXXXCombos.length} XXXX combo targets`);

      // Shuffle for variety
      const shuffledXXXX = [...knownXXXXCombos].sort(() => Math.random() - 0.5);
      let attempts = 0;

      for (const [targetH, targetE, targetS, targetA] of shuffledXXXX) {
        if (Date.now() - startTime > phase1End) break;
        if (goodMatches.size >= 2) break;

        // Yield to UI every attempt
        await new Promise(resolve => setTimeout(resolve, 0));

        // 5 second timeout per attempt - smarter search with high-value words should find faster
        const phrase = await generatePhrase(targetH, targetE, targetS, targetA,
          { heb: true, eng: true, sim: true, aiq: true }, 100000, 5000);

        attempts++;
        if (phrase) {
          const comboKey = `${targetH}/${targetE}/${targetS}/${targetA}`;
          if (!goodMatches.has(comboKey)) {
            goodMatches.set(comboKey, []);
          }
          goodMatches.get(comboKey).push({
            phrase, h: targetH, e: targetE, s: targetS, a: targetA
          });
          totalMatches++;
          console.log(`  Found XXXX combo: ${comboKey}`);
        }
      }

      console.log(`  After phase 1: ${goodMatches.size} XXXX combos (${attempts} attempts)`);

      // PHASE 2: If no XXXX combos, search for 2-word combos (10 seconds)
      if (goodMatches.size === 0) {
        console.log(`  Phase 2: Searching for 2-word combos (10s)...`);
        const phase2End = 25000;
        let wordCount = 0;

        for (const w1 of shuffledWords) {
          if (Date.now() - startTime > phase2End) break;

          // Yield to UI periodically
          wordCount++;
          if (wordCount % 500 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }

          for (const targetS of shuffledRepdigits) {
            const needSim = targetS - w1.sim;
            if (needSim < 1 || needSim > targetS) continue;

            const candidates = bySimple.get(needSim);
            if (!candidates) continue;

            for (const w2 of candidates) {
              if (w2.word === w1.word) continue;

              const sumH = w1.heb + w2.heb;
              const sumE = w1.eng + w2.eng;
              const sumA = w1.aiq + w2.aiq;

              if (!repSet.has(sumH) || !repSet.has(sumE) || !repSet.has(sumA)) continue;
              if (sumA === 33) continue;

              const comboKey = `${sumH}/${sumE}/${targetS}/${sumA}`;

              if (overusedCombos.has(comboKey)) {
                if (!fallbackMatches.has(comboKey)) fallbackMatches.set(comboKey, []);
                if (fallbackMatches.get(comboKey).length < 3) {
                  fallbackMatches.get(comboKey).push({
                    phrase: `${w1.word} ${w2.word}`, h: sumH, e: sumE, s: targetS, a: sumA
                  });
                }
                continue;
              }

              if (!goodMatches.has(comboKey)) goodMatches.set(comboKey, []);
              if (goodMatches.get(comboKey).length < 5) {
                goodMatches.get(comboKey).push({
                  phrase: `${w1.word} ${w2.word}`, h: sumH, e: sumE, s: targetS, a: sumA
                });
                totalMatches++;
              }
            }
          }
        }
      }

      console.log(`  Total: Good=${goodMatches.size}, Fallback=${fallbackMatches.size}`);

      // Helper to get Aik Bekar digit count from combo key
      const getAiqDigits = (k) => {
        const aiqValue = parseInt(k.split('/')[3]);
        if (aiqValue >= 1111) return 4;
        if (aiqValue >= 111) return 3;
        return 2;
      };

      // Convert maps to arrays for selection, sorted by digit count (4 > 3 > 2)
      const goodCombos = [];
      const fallbackArr = [];

      for (const [key, phrases] of goodMatches) {
        goodCombos.push({ key, phrases, digits: getAiqDigits(key) });
      }
      for (const [key, phrases] of fallbackMatches) {
        fallbackArr.push({ key, phrases, digits: getAiqDigits(key) });
      }

      // Filter out any /33 combos that might have slipped through
      const filterNo33 = (arr) => arr.filter(c => {
        const aiqVal = parseInt(c.key.split('/')[3]);
        return aiqVal !== 33;
      });
      const filteredGood = filterNo33(goodCombos);
      const filteredFallback = filterNo33(fallbackArr);

      // Sort by digits DESC (4 > 3 > 2)
      filteredGood.sort((a, b) => b.digits - a.digits);
      filteredFallback.sort((a, b) => b.digits - a.digits);

      console.log(`  Sorted good: ${filteredGood.length} (4d=${filteredGood.filter(c=>c.digits===4).length}, 3d=${filteredGood.filter(c=>c.digits===3).length}, 2d=${filteredGood.filter(c=>c.digits===2).length})`);

      // Use good combos if any exist, otherwise fallback
      let combosToUse = filteredGood.length > 0 ? filteredGood : filteredFallback;

      if (combosToUse.length > 0) {
        // Select from highest digit count available
        const bestDigits = combosToUse[0].digits;
        const topCombos = combosToUse.filter(c => c.digits === bestDigits);

        console.log(`  Selecting from ${topCombos.length} ${bestDigits}-digit combos`);

        // Pick a random combo
        const chosen = topCombos[Math.floor(Math.random() * topCombos.length)];
        const selected = chosen.phrases[Math.floor(Math.random() * chosen.phrases.length)];

        phrase = selected.phrase;
        finalHebrew = selected.h;
        finalEnglish = selected.e;
        finalSimple = selected.s;
        console.log(`✅ Selected: "${phrase}" (H:${selected.h} E:${selected.e} S:${selected.s} A:${selected.a})`);
      }

      // FALLBACK: If no diverse combos found, allow any combo including overused ones
      if (!phrase) {
        console.log('  No diverse combos found, allowing all combos...');

        for (const w1 of shuffledWords) {
          if (phrase) break;

          for (const targetS of repdigitList) {
            const needSim = targetS - w1.sim;
            if (needSim < 1 || needSim > 500) continue;

            const candidates = bySimple.get(needSim);
            if (!candidates) continue;

            for (const w2 of candidates) {
              if (w2.word === w1.word) continue;

              const sumH = w1.heb + w2.heb;
              const sumE = w1.eng + w2.eng;
              const sumA = w1.aiq + w2.aiq;

              if (repSet.has(sumH) && repSet.has(sumE) && repSet.has(sumA) && sumA !== 33) {
                phrase = `${w1.word} ${w2.word}`;
                finalHebrew = sumH;
                finalEnglish = sumE;
                finalSimple = targetS;
                console.log(`✅ Found fallback: "${phrase}" (H:${sumH} E:${sumE} S:${targetS} A:${sumA})`);
                break;
              }
            }
            if (phrase) break;
          }
        }
      }

      if (!phrase) {
        console.log('❌ No 4-way repdigit match found');
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

    // Check for duplicate phrase (against ALL session phrases) or duplicate words - retry if needed
    const existingPhrases = new Set(generatedPhrases.map(p => p.phrase.toLowerCase()));
    const repdigitList = [11, 22, 33, 44, 55, 66, 77, 88, 99,
                         111, 222, 333, 444, 555, 666, 777, 888, 999,
                         1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999];
    const repSet = new Set(repdigitList);

    if (phrase && (existingPhrases.has(phrase.toLowerCase()) || hasDuplicateWords(phrase))) {
      const reason = existingPhrases.has(phrase.toLowerCase()) ? 'already generated' : 'has duplicate words';
      console.log(`⚠️ Phrase ${reason}, searching for alternative...`);

      // Re-shuffle and search again, skipping existing phrases
      const { wordData, bySimple } = wordCache;
      const reshuffled = [...wordData];
      for (let i = reshuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [reshuffled[i], reshuffled[j]] = [reshuffled[j], reshuffled[i]];
      }

      phrase = null; // Reset to search again

      if (aiqBekarEnabled) {
        // Exhaustive 2-word search for 4-way repdigits, excluding existing
        for (const w1 of reshuffled) {
          for (const targetS of repdigitList) {
            const needSim = targetS - w1.sim;
            if (needSim < 1 || needSim > 500) continue;

            const candidates = bySimple.get(needSim);
            if (!candidates) continue;

            for (const w2 of candidates) {
              if (w2.word === w1.word) continue;

              const candidatePhrase = `${w1.word} ${w2.word}`;
              if (existingPhrases.has(candidatePhrase.toLowerCase())) continue;
              if (hasDuplicateWords(candidatePhrase)) continue;

              const sumH = w1.heb + w2.heb;
              const sumE = w1.eng + w2.eng;
              const sumA = w1.aiq + w2.aiq;

              if (repSet.has(sumH) && repSet.has(sumE) && repSet.has(sumA)) {
                phrase = candidatePhrase;
                finalHebrew = sumH;
                finalEnglish = sumE;
                finalSimple = targetS;
                console.log(`✅ Found alternative: "${phrase}"`);
                break;
              }
            }
            if (phrase) break;
          }
          if (phrase) break;
        }
      } else {
        // For 3-way, search through combos
        for (const combo of shuffledCombos) {
          const candidate = await generatePhrase(
            combo.heb, combo.eng, combo.sim, 0,
            enabledFlags3, 500000, 2000
          );
          if (candidate && !existingPhrases.has(candidate.toLowerCase()) && !hasDuplicateWords(candidate)) {
            phrase = candidate;
            finalHebrew = combo.heb;
            finalEnglish = combo.eng;
            finalSimple = combo.sim;
            break;
          }
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
              Generate phrases that add up to <a href="https://en.wikipedia.org/wiki/Repdigit" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 underline">repdigits</a> in <a href="https://en.wikipedia.org/wiki/Gematria" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 underline">Hebrew and English Gematria</a>.
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
                    <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 px-4 py-3 bg-zinc-600 text-white text-sm font-normal rounded-lg shadow-lg before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-zinc-600 transition-opacity duration-200 ${showTooltip ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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
                      <label className="text-xs font-semibold text-gray-700">
                        English (Aik Bekar⁹)
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
                  disabled={clearing}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                  title={generatedPhrases.length > 0 ? `Download ${generatedPhrases.length} generated phrase${generatedPhrases.length !== 1 ? 's' : ''}` : 'No phrases to download'}
                >
                  <Download className="w-5 h-5" />
                  Download Phrases {generatedPhrases.length > 0 && `(${generatedPhrases.length})`}
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
