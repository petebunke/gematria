import React, { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';

const GematriaCalculator = () => {
  const [input, setInput] = useState('');
  const [results, setResults] = useState(null);
  const [targetHebrew, setTargetHebrew] = useState('111');
  const [targetEnglish, setTargetEnglish] = useState('222');
  const [targetSimple, setTargetSimple] = useState('333');
  const [generating, setGenerating] = useState(false);
  const [wordList, setWordList] = useState([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const repdigits = ['111', '222', '333', '444', '555', '666', '777', '888', '999',
                     '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999' ];

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
    const repdigits = [111, 222, 333, 444, 555, 666, 777, 888, 999,
                      1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999];
    return repdigits.includes(num);
  };

  const handleCalculate = () => {
    if (!input.trim()) return;

    const hebrew = calculateGematria(input, hebrewValues);
    const english = calculateGematria(input, englishValues);
    const simple = calculateGematria(input, simpleValues);

    setResults({
      input: input.trim(),
      hebrew,
      english,
      simple
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

  // Load comprehensive word list from dwyl/english-words GitHub repository
  useEffect(() => {
    const loadWordsFromGitHub = async () => {
      setLoadingWords(true);
      setLoadError(null);

      try {
        console.log('Loading comprehensive English word list from GitHub...');
        const response = await fetch('https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt');

        if (!response.ok) {
          throw new Error(`Failed to fetch word list: ${response.status}`);
        }

        const text = await response.text();
        const allWords = text
          .split('\n')
          .map(word => word.trim().toLowerCase())
          .filter(word =>
            word.length >= 3 &&
            word.length <= 10 &&
            /^[a-z]+$/.test(word) &&
            !word.includes('z') // Reduce obscure words (z is rare in common words)
          );

        // Prioritize common words (first 100k are generally more common)
        const commonWords = allWords.slice(0, 100000);
        const rareWords = allWords.slice(100000);

        // Build weighted list: 70% common, 30% rare
        const weightedList = [
          ...commonWords,
          ...commonWords, // Duplicate common words for higher probability
          ...commonWords.slice(0, 50000), // Triple weight to most common
          ...rareWords
        ];

        setWordList(weightedList);
        console.log(`✅ Loaded ${allWords.length.toLocaleString()} words (${commonWords.length.toLocaleString()} common, weighted for quality)`);
      } catch (error) {
        console.error('❌ Failed to load word list from GitHub:', error);
        setLoadError(error.message);

        // Fallback to built-in word list
        const fallbackWords = getExtensiveWordList();
        setWordList(fallbackWords);
        console.log(`Using fallback word list with ${fallbackWords.length} words`);
      } finally {
        setLoadingWords(false);
      }
    };

    loadWordsFromGitHub();
  }, []);

  const generatePhrase = (targetHeb, targetEng, targetSim, maxAttempts = 1000000) => {
    const words = wordList.length > 0 ? wordList : getExtensiveWordList();

    console.log(`🎯 Smart random search for H:${targetHeb} E:${targetEng} S:${targetSim}`);
    console.log(`📚 Pre-calculating ${words.length.toLocaleString()} words...`);

    // Pre-calculate all gematria values once
    const wordData = words.map(word => ({
      word,
      heb: calculateGematria(word, hebrewValues).total,
      eng: calculateGematria(word, englishValues).total,
      sim: calculateGematria(word, simpleValues).total
    }));

    // Build value-based indexes for smarter selection
    const byHebrew = new Map();
    const byEnglish = new Map();
    const bySimple = new Map();

    wordData.forEach(data => {
      if (!byHebrew.has(data.heb)) byHebrew.set(data.heb, []);
      if (!byEnglish.has(data.eng)) byEnglish.set(data.eng, []);
      if (!bySimple.has(data.sim)) bySimple.set(data.sim, []);

      byHebrew.get(data.heb).push(data);
      byEnglish.get(data.eng).push(data);
      bySimple.get(data.sim).push(data);
    });

    console.log(`✅ Starting smart random search (${maxAttempts.toLocaleString()} attempts)...`);

    let closestMatch = null;
    let closestDistance = Infinity;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Randomly choose phrase length (2-5 words, weighted toward shorter)
      const rand = Math.random();
      let numWords;
      if (rand < 0.4) numWords = 2;
      else if (rand < 0.7) numWords = 3;
      else if (rand < 0.9) numWords = 4;
      else numWords = 5;

      const selectedWords = [];
      let totalHeb = 0, totalEng = 0, totalSim = 0;

      // Build phrase word by word
      for (let i = 0; i < numWords; i++) {
        const isLastWord = (i === numWords - 1);

        if (isLastWord) {
          // For last word, try to match exact remaining values
          const needHeb = targetHeb - totalHeb;
          const needEng = targetEng - totalEng;
          const needSim = targetSim - totalSim;

          // Look for exact match in our indexes
          const candidates = byHebrew.get(needHeb) || [];
          const perfectMatch = candidates.find(w =>
            w.eng === needEng && w.sim === needSim
          );

          if (perfectMatch) {
            selectedWords.push(perfectMatch.word);
            const phrase = selectedWords.join(' ');
            console.log(`✅ Found match after ${attempt + 1} attempts: "${phrase}"`);
            return phrase;
          }

          // No perfect match for last word, pick random word
          const randomWord = wordData[Math.floor(Math.random() * wordData.length)];
          selectedWords.push(randomWord.word);
          totalHeb += randomWord.heb;
          totalEng += randomWord.eng;
          totalSim += randomWord.sim;
        } else {
          // For non-last words, pick randomly but avoid exceeding targets
          let attempts = 0;
          let picked = null;

          while (attempts < 100) {
            const candidate = wordData[Math.floor(Math.random() * wordData.length)];

            // Soft constraint: prefer words that don't exceed any target
            if (totalHeb + candidate.heb < targetHeb &&
                totalEng + candidate.eng < targetEng &&
                totalSim + candidate.sim < targetSim) {
              picked = candidate;
              break;
            }
            attempts++;
          }

          // If no good candidate found after 100 tries, just pick randomly
          if (!picked) {
            picked = wordData[Math.floor(Math.random() * wordData.length)];
          }

          selectedWords.push(picked.word);
          totalHeb += picked.heb;
          totalEng += picked.eng;
          totalSim += picked.sim;
        }
      }

      // Track closest match
      const distance = Math.abs(totalHeb - targetHeb) +
                       Math.abs(totalEng - targetEng) +
                       Math.abs(totalSim - targetSim);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestMatch = {
          phrase: selectedWords.join(' '),
          heb: totalHeb,
          eng: totalEng,
          sim: totalSim
        };
      }

      // Log progress
      if (attempt > 0 && attempt % 100000 === 0) {
        console.log(`   ${attempt.toLocaleString()} attempts. Closest: "${closestMatch.phrase}" (H:${closestMatch.heb} E:${closestMatch.eng} S:${closestMatch.sim}, distance:${closestDistance})`);
      }
    }

    console.log(`❌ No perfect match found after ${maxAttempts.toLocaleString()} attempts.`);
    console.log(`   Closest: "${closestMatch.phrase}" (H:${closestMatch.heb} E:${closestMatch.eng} S:${closestMatch.sim})`);
    return null;
  };

  const handleGeneratePhrase = () => {
    console.log('Generate button clicked');
    console.log(`Word list size: ${wordList.length}`);
    console.log(`Targets - Hebrew: ${targetHebrew}, English: ${targetEnglish}, Simple: ${targetSimple}`);

    if (wordList.length === 0) {
      alert('Word list is empty! Please wait for words to load or reload the page.');
      return;
    }

    setGenerating(true);

    setTimeout(() => {
      console.log('Starting phrase generation...');
      const phrase = generatePhrase(
        parseInt(targetHebrew),
        parseInt(targetEnglish),
        parseInt(targetSimple)
      );

      console.log('Generation complete. Result:', phrase);

      if (phrase) {
        setInput(phrase);
        const hebrew = calculateGematria(phrase, hebrewValues);
        const english = calculateGematria(phrase, englishValues);
        const simple = calculateGematria(phrase, simpleValues);

        console.log(`Found phrase: "${phrase}"`);
        console.log(`Hebrew: ${hebrew.total}, English: ${english.total}, Simple: ${simple.total}`);

        setResults({
          input: phrase,
          hebrew,
          english,
          simple
        });
      } else {
        console.log('No phrase found after smart random search');
        alert(`Could not find a phrase matching Hebrew=${targetHebrew}, English=${targetEnglish}, Simple=${targetSimple} after 1,000,000 attempts.

The algorithm:
• Pre-calculated all word values
• Tried 1 million random combinations
• Used intelligent last-word matching
• Avoided exceeding target values

Check the console to see the closest match found.

Try:
• Different repdigit combinations
• Click generate again (new random seed)`);
      }

      setGenerating(false);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-zinc-900 rounded-lg shadow-2xl overflow-hidden border border-zinc-800">
          {/* Header */}
          <div className="bg-black border-b border-zinc-800 p-6 md:p-8">
            <div className="flex items-center justify-center gap-3">
              <Calculator className="w-8 h-8 text-red-500" />
              <h1 className="text-2xl md:text-4xl font-bold text-white">
                Gematria Calculator
              </h1>
            </div>
            <p className="text-gray-400 text-center mt-2 text-sm md:text-base">
              Discover Hebrew, English, and Simple Gematria values
            </p>
          </div>

          {/* Input Section */}
          <div className="p-6 md:p-8">
            {/* Unified Card */}
            <div className="mb-6 p-6 bg-white rounded-lg border border-zinc-300">
              {/* Repdigit Target Selection */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3">
                  Generate Random Phrase with Target Repdigits
                  {loadingWords && <span className="text-xs text-blue-600 ml-2">(Loading words...)</span>}
                  {!loadingWords && wordList.length > 0 && <span className="text-xs text-green-600 ml-2">({wordList.length.toLocaleString()} words loaded)</span>}
                  {loadError && <span className="text-xs text-orange-600 ml-2">(Using fallback list)</span>}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Hebrew Gematria
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
                      English Gematria
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
                      Simple Gematria
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
                </div>
                <button
                  onClick={handleGeneratePhrase}
                  disabled={generating || loadingWords}
                  className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  {loadingWords ? 'Loading Word List...' : generating ? 'Generating...' : '✨ Generate Random Phrase'}
                </button>
              </div>

              {/* Manual Input Section */}
              <div>
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3">
                  Calculate Custom Phrase
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Enter a word or phrase:
                    </label>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCalculate()}
                      placeholder="e.g., muertos"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-base md:text-lg text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <button
                    onClick={handleCalculate}
                    className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition duration-300 shadow-lg text-base md:text-lg"
                  >
                    Calculate
                  </button>
                </div>
              </div>
            </div>

            {/* Results Section */}
            {results && (
              <div className="mt-8 space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-white text-center pb-4 border-b border-zinc-800">
                  Results for "{results.input}"
                </h2>

                {/* Hebrew Gematria */}
                <div className="bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-700">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      Hebrew Gematria
                    </h3>
                    <span className="text-2xl md:text-3xl font-bold text-red-500">
                      {results.hebrew.total}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 mt-2 break-words font-mono">
                    {results.input} = {formatBreakdown(results.hebrew.breakdown)} = {results.hebrew.total}
                  </p>
                </div>

                {/* English Gematria */}
                <div className="bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-700">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      English Gematria
                    </h3>
                    <span className="text-2xl md:text-3xl font-bold text-red-500">
                      {results.english.total}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 mt-2 break-words font-mono">
                    {results.input} = {formatBreakdown(results.english.breakdown)} = {results.english.total}
                  </p>
                </div>

                {/* Simple Gematria */}
                <div className="bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-700">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      Simple Gematria
                    </h3>
                    <span className="text-2xl md:text-3xl font-bold text-red-500">
                      {results.simple.total}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 mt-2 break-words font-mono">
                    {results.input} = {formatBreakdown(results.simple.breakdown)} = {results.simple.total}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-black border-t border-zinc-800 p-4 text-center text-xs md:text-sm text-gray-500">
            <p>Repdigits: 111, 222, 333, 444, 555, 666, 777, 888, 999, 1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GematriaCalculator;
