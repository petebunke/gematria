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
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);

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

  // Load word list on mount
  useEffect(() => {
    setLoadingWords(true);
    const words = getExtensiveWordList();
    setWordList(words);
    setLoadingWords(false);
    console.log(`Loaded ${words.length} words from built-in list`);
  }, []);

  // Load words from Merriam-Webster API
  const loadFromAPI = async (key) => {
    setLoadingWords(true);
    console.log('Starting Merriam-Webster API fetch...');
    
    try {
      const allWords = new Set();
      
      // Common starting patterns to get diverse words
      const patterns = [
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
        'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
      ];
      
      let successCount = 0;
      let failCount = 0;
      
      for (const pattern of patterns) {
        try {
          const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${pattern}?key=${key}`;
          console.log(`Fetching words starting with '${pattern}'...`);
          
          const response = await fetch(url);
          const data = await response.json();
          
          if (Array.isArray(data)) {
            data.forEach(entry => {
              if (typeof entry === 'object' && entry.hwi && entry.hwi.hw) {
                // Extract the headword and clean it
                const word = entry.hwi.hw.replace(/\*/g, '').toLowerCase();
                if (word.length >= 2 && word.length <= 12 && /^[a-z]+$/.test(word)) {
                  allWords.add(word);
                }
              } else if (typeof entry === 'string') {
                // Sometimes API returns suggestions as strings
                const word = entry.toLowerCase();
                if (word.length >= 2 && word.length <= 12 && /^[a-z]+$/.test(word)) {
                  allWords.add(word);
                }
              }
            });
            successCount++;
            console.log(`✓ Got words for '${pattern}' (${allWords.size} total so far)`);
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          failCount++;
          console.error(`Failed to fetch words for '${pattern}':`, err);
        }
      }
      
      const wordArray = Array.from(allWords);
      
      if (wordArray.length > 100) {
        setWordList(wordArray);
        console.log(`✅ Successfully loaded ${wordArray.length} words from Merriam-Webster API`);
        alert(`Successfully loaded ${wordArray.length} words from Merriam-Webster Dictionary!`);
      } else {
        throw new Error('API returned too few words, likely invalid API key');
      }
      
    } catch (error) {
      console.error('❌ Failed to load from API:', error);
      alert('Failed to load from Merriam-Webster API. Please check your API key. Using built-in word list instead.');
    }
    
    setLoadingWords(false);
  };

  const generatePhrase = (targetHeb, targetEng, targetSim, maxAttempts = 500000) => {
    const words = wordList.length > 0 ? wordList : getExtensiveWordList();
    const categories = categorizeWords(words);
    
    console.log(`Attempting to find phrase matching H:${targetHeb} E:${targetEng} S:${targetSim}`);
    console.log(`Using ${words.length} words, trying up to ${maxAttempts} combinations...`);
    
    let closestMatch = null;
    let closestDistance = Infinity;
    
    // Grammar patterns: [article] [adjective] [noun] [verb] [preposition] [article] [adjective] [noun]
    const patterns = [
      ['noun', 'verb', 'noun'],
      ['article', 'noun', 'verb'],
      ['adjective', 'noun', 'verb'],
      ['article', 'adjective', 'noun'],
      ['noun', 'conjunction', 'noun'],
      ['adjective', 'noun', 'preposition', 'noun'],
      ['article', 'noun', 'verb', 'article', 'noun'],
      ['noun', 'verb', 'preposition', 'article', 'noun'],
      ['adjective', 'noun', 'verb', 'adjective', 'noun'],
    ];
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Choose a random grammar pattern
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      const phrase = [];
      
      for (const partOfSpeech of pattern) {
        let wordPool;
        switch(partOfSpeech) {
          case 'article':
            wordPool = categories.articles;
            break;
          case 'noun':
            wordPool = categories.nouns.length > 0 ? categories.nouns : words;
            break;
          case 'verb':
            wordPool = categories.verbs.length > 0 ? categories.verbs : words;
            break;
          case 'adjective':
            wordPool = categories.adjectives.length > 0 ? categories.adjectives : words;
            break;
          case 'preposition':
            wordPool = categories.prepositions;
            break;
          case 'conjunction':
            wordPool = categories.conjunctions;
            break;
          default:
            wordPool = words;
        }
        
        if (wordPool.length > 0) {
          phrase.push(wordPool[Math.floor(Math.random() * wordPool.length)]);
        }
      }
      
      const testPhrase = phrase.join(' ');
      const hebrew = calculateGematria(testPhrase, hebrewValues);
      const english = calculateGematria(testPhrase, englishValues);
      const simple = calculateGematria(testPhrase, simpleValues);
      
      // Track closest match for debugging
      const distance = Math.abs(hebrew.total - targetHeb) + 
                       Math.abs(english.total - targetEng) + 
                       Math.abs(simple.total - targetSim);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestMatch = {
          phrase: testPhrase,
          hebrew: hebrew.total,
          english: english.total,
          simple: simple.total
        };
      }
      
      // Perfect match!
      if (hebrew.total === targetHeb && 
          english.total === targetEng && 
          simple.total === targetSim) {
        console.log(`✅ Found perfect match after ${attempt + 1} attempts: "${testPhrase}"`);
        return testPhrase;
      }
      
      // Log progress every 50k attempts
      if (attempt > 0 && attempt % 50000 === 0) {
        console.log(`Progress: ${attempt} attempts. Closest: "${closestMatch.phrase}" (H:${closestMatch.hebrew} E:${closestMatch.english} S:${closestMatch.simple})`);
      }
    }
    
    console.log(`❌ No perfect match found. Closest was: "${closestMatch.phrase}"`);
    console.log(`   Target:  H:${targetHeb} E:${targetEng} S:${targetSim}`);
    console.log(`   Closest: H:${closestMatch.hebrew} E:${closestMatch.english} S:${closestMatch.simple}`);
    console.log(`   Distance: ${closestDistance}`);
    
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
        console.log('No phrase found after 100,000 attempts');
        alert(`Could not find a phrase matching Hebrew=${targetHebrew}, English=${targetEnglish}, Simple=${targetSimple} after 500,000 attempts. 

⚠️ Finding exact matches for all three systems is very difficult!

Try:
• Smaller repdigits (111-333 are easier than 7777+)
• Different combinations
• Click generate multiple times

The algorithm tried 500,000 random combinations - check the console to see how close it got!`);
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
              {/* API Key Input Section */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm md:text-base font-bold text-gray-900">
                    🔑 Merriam-Webster Dictionary API (Optional)
                  </h3>
                  <button
                    onClick={() => setShowApiInput(!showApiInput)}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold"
                  >
                    {showApiInput ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {showApiInput && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">
                      Get a free API key at <a href="https://dictionaryapi.com/" target="_blank" rel="noopener noreferrer" className="text-red-600 underline hover:text-red-700">dictionaryapi.com</a> to load thousands of words
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-sm text-gray-900 placeholder-gray-400"
                      />
                      <button
                        onClick={() => apiKey && loadFromAPI(apiKey)}
                        disabled={!apiKey || loadingWords}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Repdigit Target Selection */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3">
                  Generate Random Phrase with Target Repdigits
                  {wordList.length > 0 && <span className="text-xs text-red-600 ml-2">({wordList.length.toLocaleString()} words loaded)</span>}
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
                  {loadingWords ? 'Loading Dictionary...' : generating ? 'Generating...' : '✨ Generate Random Phrase'}
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