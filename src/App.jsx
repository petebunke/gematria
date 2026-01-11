import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calculator, Copy, Check, Download, Loader2, Trash2, Volume2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';

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
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
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

  const speakPhrase = (text) => {
    if (!text || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const allVoices = window.speechSynthesis.getVoices();
    if (allVoices.length === 0) {
      // Voices not loaded yet, try again after a short delay
      window.speechSynthesis.onvoiceschanged = () => speakPhrase(text);
      return;
    }

    // Filter to only US/UK English voices, no novelty or spell-out voices
    const voices = allVoices.filter(v =>
      (v.lang === 'en-US' || v.lang === 'en-GB') &&
      !v.name.toLowerCase().includes('novelty') &&
      !v.name.toLowerCase().includes('spell')
    );

    if (voices.length === 0) {
      // Fallback: any voice starting with en
      const fallback = allVoices.filter(v => v.lang.startsWith('en'));
      if (fallback.length > 0) voices.push(...fallback);
      else return; // No English voices available
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    // Cycle through available English voices
    const currentVoice = voices[voiceIndex % voices.length];
    utterance.voice = currentVoice;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Advance to next voice for next time
      setVoiceIndex(prev => (prev + 1) % voices.length);
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const downloadPhraseTable = () => {
    if (generatedPhrases.length === 0) {
      alert('No phrases generated yet!');
      return;
    }

    // Sort by combination (Hebrew, English, Simple, Aik Bekar)
    const sorted = [...generatedPhrases].sort((a, b) => {
      if (a.hebrew !== b.hebrew) return a.hebrew - b.hebrew;
      if (a.english !== b.english) return a.english - b.english;
      if (a.simple !== b.simple) return a.simple - b.simple;
      return (a.aiqBekar || 0) - (b.aiqBekar || 0);
    });

    // Create HTML content for PDF
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 1100px; margin: 0 auto;">
        <h1 style="color: #dc2626; border-bottom: 3px solid #dc2626; padding-bottom: 10px; margin-bottom: 20px; font-size: 24px;">
          Gematria Generated Phrases
        </h1>
        <div style="color: #666; margin-bottom: 20px; font-size: 12px;">
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Phrases:</strong> ${sorted.length}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr>
              <th style="background-color: #dc2626; color: white; padding: 8px; text-align: left; font-weight: bold;">Phrase</th>
              <th style="background-color: #dc2626; color: white; padding: 8px; text-align: center; font-weight: bold;">Hebrew</th>
              <th style="background-color: #dc2626; color: white; padding: 8px; text-align: center; font-weight: bold;">English</th>
              <th style="background-color: #dc2626; color: white; padding: 8px; text-align: center; font-weight: bold;">Simple</th>
              <th style="background-color: #dc2626; color: white; padding: 8px; text-align: center; font-weight: bold; white-space: nowrap;">Aik Bekar⁹</th>
              <th style="background-color: #dc2626; color: white; padding: 8px; text-align: center; font-weight: bold;">Combination</th>
              <th style="background-color: #dc2626; color: white; padding: 8px; text-align: center; font-weight: bold;">Source</th>
              <th style="background-color: #dc2626; color: white; padding: 8px; text-align: center; font-weight: bold;">Gen Time</th>
              <th style="background-color: #dc2626; color: white; padding: 8px; text-align: center; font-weight: bold;">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((p, i) => `
              <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; font-weight: 600; color: #1f2937;">${p.phrase}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center; font-family: monospace; color: #dc2626;">${p.hebrew}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center; font-family: monospace; color: #dc2626;">${p.english}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center; font-family: monospace; color: #dc2626;">${p.simple}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center; font-family: monospace; color: #dc2626;">${p.aiqBekar || '-'}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center; font-family: monospace; color: #dc2626;">${p.hebrew}/${p.english}/${p.simple}/${p.aiqBekar || '-'}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center; text-transform: capitalize; color: #4b5563;">${p.source}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center; font-family: monospace; color: #dc2626;">${p.generationTime ? (p.generationTime / 1000).toFixed(2) + 's' : '-'}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center; vertical-align: middle; font-size: 9px; color: #4b5563;">${new Date(p.timestamp).toLocaleDateString()},<br>${new Date(p.timestamp).toLocaleTimeString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // PDF options
    const opt = {
      margin: 10,
      filename: `gematria-generator-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    // Generate and download PDF
    html2pdf().set(opt).from(container).save().then(() => {
      document.body.removeChild(container);
    });
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
                      Simple
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
                      <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 md:gap-1">
                        Aik Bekar⁹
                        <span className="relative inline-block mr-2 md:mr-0">
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
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 gap-1">
                  <h3 className="text-base md:text-lg font-bold text-gray-900">
                    Calculate Phrase Value and Generate Anagrams
                  </h3>
                  {results && (
                    <div className="text-sm font-mono text-red-600 font-bold">
                      {results.hebrew.total}/{results.english.total}/{results.simple.total}{results.aiqBekar ? `/${results.aiqBekar.total}` : ''}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Enter a word or phrase:
                      </label>
                      <button
                        onClick={() => speakPhrase(input)}
                        disabled={!input.trim() || isSpeaking}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Speak phrase (cycles through voices)"
                      >
                        <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-red-500 animate-pulse' : ''}`} />
                      </button>
                    </div>
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
                    <><Trash2 className="w-5 h-5 hidden md:block" /> Clear Phrases</>
                  )}
                </button>
              </div>
            </div>

            {/* Results Section */}
            {results && (
              <div className="mt-8 mb-8 space-y-6">
                <div className="flex items-center justify-center gap-1 pb-4 border-b border-zinc-800">
                  <h2 className="text-xl md:text-2xl font-bold text-white text-center">
                    Results for "{results.input}"
                  </h2>
                  <button
                    onClick={() => speakPhrase(results.input)}
                    disabled={isSpeaking}
                    className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors rounded-full hover:bg-zinc-700"
                    title="Speak phrase (cycles through voices)"
                  >
                    <Volume2 className={`w-6 h-6 ${isSpeaking ? 'text-red-500 animate-pulse' : ''}`} />
                  </button>
                </div>

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

                {/* Simple */}
                <div className="bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-700">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      Simple
                    </h3>
                    <span className="text-2xl md:text-3xl font-bold text-red-500">
                      {results.simple.total}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 mt-2 break-words font-mono">
                    {results.input} = {formatBreakdown(results.simple.breakdown)} = {results.simple.total}
                  </p>
                </div>

                {/* Aik Bekar⁹ */}
                {results.aiqBekar && (
                  <div className="bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-700">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-lg md:text-xl font-bold text-white">
                        Aik Bekar⁹
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
          <div className="bg-black border-t border-zinc-800 pt-8 pb-3 px-4 md:px-0 text-center text-xs md:text-sm text-gray-500">
            <p className="flex flex-col items-center leading-relaxed md:leading-normal md:inline">
              <span>Based on <a href="https://gematrix.org" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline">gematrix.org</a>.</span>
              <span className="md:before:content-['_']">Vibe coded by <a href="https://petebunke.com" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline">Pete Bunke</a>.</span>
              <span className="md:before:content-['_']">All rights reserved.</span>
            </p>
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
