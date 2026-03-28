// Generate simple SVG icon placeholders for timeline nodes
// Each creates a colored circle with a symbol

function makeSvg(emoji, bgColor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="58" fill="${bgColor}" stroke="${bgColor}" stroke-width="2" opacity="0.15"/>
    <text x="60" y="68" text-anchor="middle" font-size="48" dominant-baseline="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const eraImages = {
  'era-1200-1450': makeSvg('\u{1F30D}', '#4A90D9'),   // Globe
  'era-1450-1750': makeSvg('\u{26F5}', '#E67E22'),     // Sailboat
  'era-1750-1900': makeSvg('\u{2699}', '#9B59B6'),     // Gear
  'era-1900-present': makeSvg('\u{1F310}', '#E74C3C'), // Globe with meridians
};

export const eventImages = {
  // Era 1200-1450
  'evt-mongol-empire': makeSvg('\u{1F40E}', '#E74C3C'),       // Horse
  'evt-mali-empire': makeSvg('\u{1F451}', '#F39C12'),          // Crown
  'evt-song-dynasty': makeSvg('\u{1F3EF}', '#27AE60'),        // Japanese castle
  'evt-black-death': makeSvg('\u{2620}', '#8E44AD'),           // Skull
  'evt-delhi-sultanate': makeSvg('\u{1F54C}', '#1ABC9C'),     // Mosque
  'evt-crusades': makeSvg('\u{2694}', '#C0392B'),              // Swords
  'evt-indian-ocean-trade': makeSvg('\u{1F6A2}', '#2980B9'),  // Ship
  'evt-aztec-empire': makeSvg('\u{1F3DB}', '#D35400'),         // Temple
  'evt-inca-empire': makeSvg('\u{26F0}', '#F1C40F'),           // Mountain
  'evt-european-feudalism': makeSvg('\u{1F3F0}', '#7F8C8D'),  // Castle
  'evt-byzantine-empire': makeSvg('\u{2626}', '#6C3483'),      // Orthodox cross

  // Era 1450-1750
  'evt-columbian-exchange': makeSvg('\u{1F33D}', '#E74C3C'),  // Corn
  'evt-atlantic-slave-trade': makeSvg('\u{26D3}', '#2C3E50'),  // Chains
  'evt-ottoman-empire': makeSvg('\u{1F319}', '#C0392B'),       // Crescent
  'evt-mughal-empire': makeSvg('\u{1F54C}', '#F39C12'),        // Mosque
  'evt-protestant-reformation': makeSvg('\u{1F4DC}', '#8E44AD'), // Scroll
  'evt-silver-trade': makeSvg('\u{1FA99}', '#BDC3C7'),         // Coin
  'evt-qing-dynasty': makeSvg('\u{1F409}', '#1ABC9C'),         // Dragon

  // Era 1750-1900
  'evt-industrial-revolution': makeSvg('\u{1F3ED}', '#34495E'), // Factory
  'evt-french-revolution': makeSvg('\u{1F5FC}', '#E74C3C'),    // Tower (for Bastille)
  'evt-haitian-revolution': makeSvg('\u{270A}', '#27AE60'),     // Raised fist
  'evt-latin-american-independence': makeSvg('\u{1F5FD}', '#F39C12'), // Statue of liberty
  'evt-meiji-restoration': makeSvg('\u{1F1EF}', '#E74C3C'),    // Japan flag
  'evt-scramble-for-africa': makeSvg('\u{1F30D}', '#2C3E50'),  // Globe Africa
  'evt-opium-wars': makeSvg('\u{1F4A8}', '#8E44AD'),           // Smoke

  // Era 1900-present
  'evt-world-war-1': makeSvg('\u{1F4A3}', '#C0392B'),          // Bomb
  'evt-world-war-2': makeSvg('\u{2622}', '#2C3E50'),           // Radioactive
  'evt-cold-war': makeSvg('\u{2744}', '#3498DB'),              // Snowflake
  'evt-decolonization': makeSvg('\u{270A}', '#27AE60'),        // Raised fist
  'evt-chinese-revolution': makeSvg('\u{2B50}', '#E74C3C'),    // Star
  'evt-globalization': makeSvg('\u{1F310}', '#1ABC9C'),        // Globe
};
