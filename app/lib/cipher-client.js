// GentlyOS Cipher Client - Cryptanalysis Toolkit
// Identify, encode/decode, and analyze classical and modern ciphers

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'cip') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Cipher types
const CIPHER_TYPE = {
  // Hashes
  MD5: 'md5',
  SHA1: 'sha1',
  SHA256: 'sha256',
  SHA512: 'sha512',
  BCRYPT: 'bcrypt',

  // Encodings
  BASE64: 'base64',
  BASE32: 'base32',
  BASE58: 'base58',
  HEX: 'hex',
  BINARY: 'binary',
  ASCII85: 'ascii85',
  ROT13: 'rot13',
  ROT47: 'rot47',

  // Classical
  CAESAR: 'caesar',
  VIGENERE: 'vigenere',
  ATBASH: 'atbash',
  AFFINE: 'affine',
  PLAYFAIR: 'playfair',
  RAILFENCE: 'railfence',
  COLUMNAR: 'columnar',

  // Substitution
  MORSE: 'morse',
  BACON: 'bacon',
  POLYBIUS: 'polybius',
  PIGPEN: 'pigpen',

  // Modern
  XOR: 'xor',
  AES: 'aes',
  UNKNOWN: 'unknown',
};

// Cipher categories
const CATEGORY = {
  HASH: 'hash',
  ENCODING: 'encoding',
  SUBSTITUTION: 'substitution',
  TRANSPOSITION: 'transposition',
  POLYALPHABETIC: 'polyalphabetic',
  MODERN: 'modern',
  UNKNOWN: 'unknown',
};

// Confidence levels
const CONFIDENCE = {
  CERTAIN: 1.0,
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4,
  GUESS: 0.2,
};

// Morse code mapping
const MORSE_MAP = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
  '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.', ' ': '/',
};

const MORSE_REVERSE = Object.fromEntries(
  Object.entries(MORSE_MAP).map(([k, v]) => [v, k])
);

// Base58 alphabet (Bitcoin style)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Cipher Match result
class CipherMatch {
  constructor(cipherType, confidence, evidence = '') {
    this.cipherType = cipherType;
    this.confidence = confidence;
    this.evidence = evidence;
    this.category = this.getCategory();
  }

  getCategory() {
    if (['md5', 'sha1', 'sha256', 'sha512', 'bcrypt'].includes(this.cipherType)) {
      return CATEGORY.HASH;
    }
    if (['base64', 'base32', 'base58', 'hex', 'binary', 'ascii85', 'rot13', 'rot47'].includes(this.cipherType)) {
      return CATEGORY.ENCODING;
    }
    if (['caesar', 'atbash', 'morse', 'bacon', 'polybius', 'pigpen'].includes(this.cipherType)) {
      return CATEGORY.SUBSTITUTION;
    }
    if (['railfence', 'columnar'].includes(this.cipherType)) {
      return CATEGORY.TRANSPOSITION;
    }
    if (['vigenere', 'affine', 'playfair'].includes(this.cipherType)) {
      return CATEGORY.POLYALPHABETIC;
    }
    if (['xor', 'aes'].includes(this.cipherType)) {
      return CATEGORY.MODERN;
    }
    return CATEGORY.UNKNOWN;
  }

  toJSON() {
    return {
      cipherType: this.cipherType,
      category: this.category,
      confidence: this.confidence,
      evidence: this.evidence,
    };
  }
}

// Cipher Identifier - Auto-detect cipher/encoding/hash type
class CipherIdentifier {
  constructor() {
    this.patterns = this.initPatterns();
  }

  initPatterns() {
    return {
      // Hash patterns
      md5: /^[a-f0-9]{32}$/i,
      sha1: /^[a-f0-9]{40}$/i,
      sha256: /^[a-f0-9]{64}$/i,
      sha512: /^[a-f0-9]{128}$/i,
      bcrypt: /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/,

      // Encoding patterns
      base64: /^[A-Za-z0-9+/]+=*$/,
      base32: /^[A-Z2-7]+=*$/,
      base58: /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/,
      hex: /^[a-f0-9]+$/i,
      binary: /^[01\s]+$/,

      // Special patterns
      morse: /^[.\-\s/]+$/,
    };
  }

  identify(text) {
    const matches = [];
    const trimmed = text.trim();

    // Check hash patterns
    if (this.patterns.md5.test(trimmed)) {
      matches.push(new CipherMatch(CIPHER_TYPE.MD5, CONFIDENCE.HIGH, 'Matches MD5 pattern (32 hex)'));
    }
    if (this.patterns.sha1.test(trimmed)) {
      matches.push(new CipherMatch(CIPHER_TYPE.SHA1, CONFIDENCE.HIGH, 'Matches SHA1 pattern (40 hex)'));
    }
    if (this.patterns.sha256.test(trimmed)) {
      matches.push(new CipherMatch(CIPHER_TYPE.SHA256, CONFIDENCE.HIGH, 'Matches SHA256 pattern (64 hex)'));
    }
    if (this.patterns.sha512.test(trimmed)) {
      matches.push(new CipherMatch(CIPHER_TYPE.SHA512, CONFIDENCE.HIGH, 'Matches SHA512 pattern (128 hex)'));
    }
    if (this.patterns.bcrypt.test(trimmed)) {
      matches.push(new CipherMatch(CIPHER_TYPE.BCRYPT, CONFIDENCE.CERTAIN, 'Matches bcrypt pattern'));
    }

    // Check encoding patterns
    if (this.patterns.base64.test(trimmed) && trimmed.length % 4 === 0 && trimmed.length > 4) {
      matches.push(new CipherMatch(CIPHER_TYPE.BASE64, CONFIDENCE.MEDIUM, 'Possible Base64'));
    }
    if (this.patterns.base32.test(trimmed) && trimmed.length >= 8) {
      matches.push(new CipherMatch(CIPHER_TYPE.BASE32, CONFIDENCE.MEDIUM, 'Possible Base32'));
    }
    if (this.patterns.base58.test(trimmed) && trimmed.length >= 20) {
      matches.push(new CipherMatch(CIPHER_TYPE.BASE58, CONFIDENCE.LOW, 'Possible Base58'));
    }
    if (this.patterns.hex.test(trimmed) && trimmed.length % 2 === 0) {
      matches.push(new CipherMatch(CIPHER_TYPE.HEX, CONFIDENCE.MEDIUM, 'Hex encoded'));
    }
    if (this.patterns.binary.test(trimmed)) {
      matches.push(new CipherMatch(CIPHER_TYPE.BINARY, CONFIDENCE.HIGH, 'Binary encoded'));
    }
    if (this.patterns.morse.test(trimmed)) {
      matches.push(new CipherMatch(CIPHER_TYPE.MORSE, CONFIDENCE.HIGH, 'Morse code'));
    }

    // If only letters with unusual frequency, might be substitution cipher
    if (/^[A-Za-z\s]+$/.test(trimmed) && trimmed.length > 20) {
      const freq = this.analyzeFrequency(trimmed);
      if (freq.entropy < 4.0) {
        matches.push(new CipherMatch(CIPHER_TYPE.CAESAR, CONFIDENCE.LOW, 'Possible Caesar/substitution'));
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    if (matches.length === 0) {
      matches.push(new CipherMatch(CIPHER_TYPE.UNKNOWN, CONFIDENCE.GUESS, 'Unable to identify'));
    }

    return matches;
  }

  analyzeFrequency(text) {
    const freq = {};
    const letters = text.toUpperCase().replace(/[^A-Z]/g, '');
    for (const char of letters) {
      freq[char] = (freq[char] || 0) + 1;
    }

    const total = letters.length;
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    return { freq, entropy, total };
  }
}

// Frequency Analysis
class FrequencyAnalysis {
  constructor() {
    this.englishFreq = {
      'E': 12.7, 'T': 9.1, 'A': 8.2, 'O': 7.5, 'I': 7.0,
      'N': 6.7, 'S': 6.3, 'H': 6.1, 'R': 6.0, 'D': 4.3,
      'L': 4.0, 'C': 2.8, 'U': 2.8, 'M': 2.4, 'W': 2.4,
      'F': 2.2, 'G': 2.0, 'Y': 2.0, 'P': 1.9, 'B': 1.5,
      'V': 1.0, 'K': 0.8, 'J': 0.2, 'X': 0.2, 'Q': 0.1, 'Z': 0.1,
    };
  }

  analyze(text) {
    const freq = {};
    const letters = text.toUpperCase().replace(/[^A-Z]/g, '');

    for (const char of letters) {
      freq[char] = (freq[char] || 0) + 1;
    }

    const total = letters.length;
    const percentages = {};
    for (const [char, count] of Object.entries(freq)) {
      percentages[char] = (count / total * 100).toFixed(2);
    }

    // Calculate chi-squared against English
    let chiSquared = 0;
    for (const [char, expected] of Object.entries(this.englishFreq)) {
      const observed = parseFloat(percentages[char] || 0);
      chiSquared += Math.pow(observed - expected, 2) / expected;
    }

    // Index of Coincidence
    let ioc = 0;
    for (const count of Object.values(freq)) {
      ioc += count * (count - 1);
    }
    ioc = ioc / (total * (total - 1));

    return {
      frequency: freq,
      percentages,
      total,
      chiSquared: chiSquared.toFixed(2),
      ioc: ioc.toFixed(4),
      isLikelyEnglish: chiSquared < 50,
    };
  }
}

// Encoding operations
class Encoding {
  // Base64
  static base64Encode(text) {
    return Buffer.from(text).toString('base64');
  }

  static base64Decode(text) {
    return Buffer.from(text, 'base64').toString('utf8');
  }

  // Hex
  static hexEncode(text) {
    return Buffer.from(text).toString('hex');
  }

  static hexDecode(text) {
    return Buffer.from(text, 'hex').toString('utf8');
  }

  // Binary
  static binaryEncode(text) {
    return text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
  }

  static binaryDecode(text) {
    return text.split(/\s+/).map(b => String.fromCharCode(parseInt(b, 2))).join('');
  }

  // ROT13
  static rot13(text) {
    return text.replace(/[A-Za-z]/g, c => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
    });
  }

  // ROT47
  static rot47(text) {
    return text.replace(/[!-~]/g, c => {
      return String.fromCharCode((c.charCodeAt(0) - 33 + 47) % 94 + 33);
    });
  }

  // Morse
  static morseEncode(text) {
    return text.toUpperCase().split('').map(c => MORSE_MAP[c] || c).join(' ');
  }

  static morseDecode(text) {
    return text.split(' ').map(c => MORSE_REVERSE[c] || c).join('');
  }

  // Base58
  static base58Encode(text) {
    let num = BigInt('0x' + Buffer.from(text).toString('hex'));
    let result = '';
    while (num > 0) {
      result = BASE58_ALPHABET[Number(num % 58n)] + result;
      num = num / 58n;
    }
    return result || '1';
  }

  static base58Decode(text) {
    let num = 0n;
    for (const char of text) {
      num = num * 58n + BigInt(BASE58_ALPHABET.indexOf(char));
    }
    let hex = num.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    return Buffer.from(hex, 'hex').toString('utf8');
  }
}

// Classical cipher operations
class ClassicalCipher {
  // Caesar cipher
  static caesarEncrypt(text, shift = 3) {
    return text.replace(/[A-Za-z]/g, c => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode((c.charCodeAt(0) - base + shift) % 26 + base);
    });
  }

  static caesarDecrypt(text, shift = 3) {
    return this.caesarEncrypt(text, 26 - (shift % 26));
  }

  static caesarBruteForce(text) {
    const results = [];
    for (let shift = 0; shift < 26; shift++) {
      results.push({
        shift,
        text: this.caesarDecrypt(text, shift),
      });
    }
    return results;
  }

  // Atbash cipher
  static atbash(text) {
    return text.replace(/[A-Za-z]/g, c => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(base + 25 - (c.charCodeAt(0) - base));
    });
  }

  // Vigenere cipher
  static vigenereEncrypt(text, key) {
    const keyUpper = key.toUpperCase();
    let keyIndex = 0;
    return text.replace(/[A-Za-z]/g, c => {
      const base = c <= 'Z' ? 65 : 97;
      const shift = keyUpper.charCodeAt(keyIndex % keyUpper.length) - 65;
      keyIndex++;
      return String.fromCharCode((c.charCodeAt(0) - base + shift) % 26 + base);
    });
  }

  static vigenereDecrypt(text, key) {
    const keyUpper = key.toUpperCase();
    let keyIndex = 0;
    return text.replace(/[A-Za-z]/g, c => {
      const base = c <= 'Z' ? 65 : 97;
      const shift = keyUpper.charCodeAt(keyIndex % keyUpper.length) - 65;
      keyIndex++;
      return String.fromCharCode((c.charCodeAt(0) - base - shift + 26) % 26 + base);
    });
  }

  // Rail Fence cipher
  static railFenceEncrypt(text, rails) {
    const fence = Array(rails).fill('').map(() => []);
    let rail = 0;
    let direction = 1;

    for (const char of text) {
      fence[rail].push(char);
      rail += direction;
      if (rail === 0 || rail === rails - 1) direction *= -1;
    }

    return fence.map(r => r.join('')).join('');
  }

  static railFenceDecrypt(text, rails) {
    const len = text.length;
    const fence = Array(rails).fill('').map(() => Array(len).fill(''));
    let rail = 0;
    let direction = 1;

    // Mark positions
    for (let i = 0; i < len; i++) {
      fence[rail][i] = '*';
      rail += direction;
      if (rail === 0 || rail === rails - 1) direction *= -1;
    }

    // Fill in characters
    let index = 0;
    for (let r = 0; r < rails; r++) {
      for (let c = 0; c < len; c++) {
        if (fence[r][c] === '*') {
          fence[r][c] = text[index++];
        }
      }
    }

    // Read off
    let result = '';
    rail = 0;
    direction = 1;
    for (let i = 0; i < len; i++) {
      result += fence[rail][i];
      rail += direction;
      if (rail === 0 || rail === rails - 1) direction *= -1;
    }

    return result;
  }
}

// Hash operations
class Hashes {
  static md5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  static sha1(text) {
    return crypto.createHash('sha1').update(text).digest('hex');
  }

  static sha256(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  static sha512(text) {
    return crypto.createHash('sha512').update(text).digest('hex');
  }

  static identify(hash) {
    const len = hash.length;
    if (/^[a-f0-9]+$/i.test(hash)) {
      if (len === 32) return CIPHER_TYPE.MD5;
      if (len === 40) return CIPHER_TYPE.SHA1;
      if (len === 64) return CIPHER_TYPE.SHA256;
      if (len === 128) return CIPHER_TYPE.SHA512;
    }
    if (/^\$2[aby]?\$/.test(hash)) return CIPHER_TYPE.BCRYPT;
    return CIPHER_TYPE.UNKNOWN;
  }
}

// XOR operations
class XorCipher {
  static encrypt(text, key) {
    const textBuf = Buffer.from(text);
    const keyBuf = Buffer.from(key);
    const result = Buffer.alloc(textBuf.length);
    for (let i = 0; i < textBuf.length; i++) {
      result[i] = textBuf[i] ^ keyBuf[i % keyBuf.length];
    }
    return result.toString('hex');
  }

  static decrypt(hex, key) {
    const textBuf = Buffer.from(hex, 'hex');
    const keyBuf = Buffer.from(key);
    const result = Buffer.alloc(textBuf.length);
    for (let i = 0; i < textBuf.length; i++) {
      result[i] = textBuf[i] ^ keyBuf[i % keyBuf.length];
    }
    return result.toString('utf8');
  }

  // Single-byte XOR brute force
  static singleByteBruteForce(hex) {
    const results = [];
    const textBuf = Buffer.from(hex, 'hex');

    for (let key = 0; key < 256; key++) {
      const result = Buffer.alloc(textBuf.length);
      for (let i = 0; i < textBuf.length; i++) {
        result[i] = textBuf[i] ^ key;
      }
      const decoded = result.toString('utf8');
      // Check if mostly printable
      const printable = decoded.replace(/[^\x20-\x7E]/g, '').length / decoded.length;
      if (printable > 0.9) {
        results.push({ key, keyHex: key.toString(16).padStart(2, '0'), text: decoded });
      }
    }

    return results;
  }
}

// Main Cipher Client
class CipherClient {
  constructor() {
    this.identifier = new CipherIdentifier();
    this.frequencyAnalysis = new FrequencyAnalysis();
  }

  // === IDENTIFICATION ===

  identify(text) {
    const matches = this.identifier.identify(text);
    return { success: true, matches: matches.map(m => m.toJSON()) };
  }

  analyzeFrequency(text) {
    return { success: true, analysis: this.frequencyAnalysis.analyze(text) };
  }

  // === ENCODING ===

  encode(text, type) {
    try {
      let result;
      switch (type) {
        case CIPHER_TYPE.BASE64: result = Encoding.base64Encode(text); break;
        case CIPHER_TYPE.HEX: result = Encoding.hexEncode(text); break;
        case CIPHER_TYPE.BINARY: result = Encoding.binaryEncode(text); break;
        case CIPHER_TYPE.ROT13: result = Encoding.rot13(text); break;
        case CIPHER_TYPE.ROT47: result = Encoding.rot47(text); break;
        case CIPHER_TYPE.MORSE: result = Encoding.morseEncode(text); break;
        case CIPHER_TYPE.BASE58: result = Encoding.base58Encode(text); break;
        default: return { success: false, error: 'Unknown encoding type' };
      }
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  decode(text, type) {
    try {
      let result;
      switch (type) {
        case CIPHER_TYPE.BASE64: result = Encoding.base64Decode(text); break;
        case CIPHER_TYPE.HEX: result = Encoding.hexDecode(text); break;
        case CIPHER_TYPE.BINARY: result = Encoding.binaryDecode(text); break;
        case CIPHER_TYPE.ROT13: result = Encoding.rot13(text); break;
        case CIPHER_TYPE.ROT47: result = Encoding.rot47(text); break;
        case CIPHER_TYPE.MORSE: result = Encoding.morseDecode(text); break;
        case CIPHER_TYPE.BASE58: result = Encoding.base58Decode(text); break;
        default: return { success: false, error: 'Unknown encoding type' };
      }
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // === CLASSICAL CIPHERS ===

  caesarEncrypt(text, shift = 3) {
    return { success: true, result: ClassicalCipher.caesarEncrypt(text, shift) };
  }

  caesarDecrypt(text, shift = 3) {
    return { success: true, result: ClassicalCipher.caesarDecrypt(text, shift) };
  }

  caesarBruteForce(text) {
    return { success: true, results: ClassicalCipher.caesarBruteForce(text) };
  }

  atbash(text) {
    return { success: true, result: ClassicalCipher.atbash(text) };
  }

  vigenereEncrypt(text, key) {
    return { success: true, result: ClassicalCipher.vigenereEncrypt(text, key) };
  }

  vigenereDecrypt(text, key) {
    return { success: true, result: ClassicalCipher.vigenereDecrypt(text, key) };
  }

  railFenceEncrypt(text, rails) {
    return { success: true, result: ClassicalCipher.railFenceEncrypt(text, rails) };
  }

  railFenceDecrypt(text, rails) {
    return { success: true, result: ClassicalCipher.railFenceDecrypt(text, rails) };
  }

  // === HASHES ===

  hash(text, type) {
    let result;
    switch (type) {
      case CIPHER_TYPE.MD5: result = Hashes.md5(text); break;
      case CIPHER_TYPE.SHA1: result = Hashes.sha1(text); break;
      case CIPHER_TYPE.SHA256: result = Hashes.sha256(text); break;
      case CIPHER_TYPE.SHA512: result = Hashes.sha512(text); break;
      default: return { success: false, error: 'Unknown hash type' };
    }
    return { success: true, hash: result };
  }

  identifyHash(hash) {
    return { success: true, type: Hashes.identify(hash) };
  }

  // === XOR ===

  xorEncrypt(text, key) {
    return { success: true, result: XorCipher.encrypt(text, key) };
  }

  xorDecrypt(hex, key) {
    return { success: true, result: XorCipher.decrypt(hex, key) };
  }

  xorBruteForce(hex) {
    return { success: true, results: XorCipher.singleByteBruteForce(hex) };
  }

  // === CONSTANTS ===

  getCipherTypes() {
    return { success: true, types: CIPHER_TYPE };
  }

  getCategories() {
    return { success: true, categories: CATEGORY };
  }
}

module.exports = {
  CipherClient,
  CipherIdentifier,
  CipherMatch,
  FrequencyAnalysis,
  Encoding,
  ClassicalCipher,
  Hashes,
  XorCipher,
  CIPHER_TYPE,
  CATEGORY,
  CONFIDENCE,
};
