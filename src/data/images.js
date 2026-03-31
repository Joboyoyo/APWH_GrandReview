// Wikimedia Commons images for timeline events (public domain / CC)
// Using thumbnail URLs for fast loading

function makeSvg(emoji, bgColor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="58" fill="${bgColor}" stroke="${bgColor}" stroke-width="2" opacity="0.15"/>
    <text x="60" y="68" text-anchor="middle" font-size="48" dominant-baseline="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const eraImages = {
  'era-1200-1450': makeSvg('\u{1F30D}', '#4A90D9'),
  'era-1450-1750': makeSvg('\u{26F5}', '#E67E22'),
  'era-1750-1900': makeSvg('\u{2699}', '#9B59B6'),
  'era-1900-present': makeSvg('\u{1F310}', '#E74C3C'),
};

// Local hover images (sourced from Wikipedia, public domain / CC licensed)
const base = import.meta.env.BASE_URL;
const img = (name) => `${base}images/events/${name}`;

export const eventHoverImages = {
  // Era 1200-1450
  'evt-mongol-empire': img('mongol-empire.gif'),
  'evt-mali-empire': img('mali-empire.png'),
  'evt-song-dynasty': img('song-dynasty.png'),
  'evt-black-death': img('black-death.png'),
  'evt-delhi-sultanate': img('delhi-sultanate.png'),
  'evt-crusades': img('crusades.jpg'),
  'evt-indian-ocean-trade': img('indian-ocean-trade.jpg'),
  'evt-aztec-empire': img('aztec-empire.png'),
  'evt-inca-empire': img('inca-empire.png'),
  'evt-european-feudalism': img('european-feudalism.jpg'),
  'evt-byzantine-empire': img('byzantine-empire.png'),

  // Era 1450-1750
  'evt-columbian-exchange': img('columbian-exchange.jpg'),
  'evt-atlantic-slave-trade': img('atlantic-slave-trade.jpg'),
  'evt-ottoman-empire': img('ottoman-empire.jpg'),
  'evt-mughal-empire': img('mughal-empire.png'),
  'evt-protestant-reformation': img('protestant-reformation.jpg'),
  'evt-silver-trade': img('silver-trade.png'),
  'evt-qing-dynasty': img('qing-dynasty.png'),

  // Era 1750-1900
  'evt-industrial-revolution': img('industrial-revolution.jpg'),
  'evt-french-revolution': img('french-revolution.jpg'),
  'evt-haitian-revolution': img('haitian-revolution.jpg'),
  'evt-latin-american-independence': img('latin-american-independence.png'),
  'evt-meiji-restoration': img('meiji-restoration.jpg'),
  'evt-scramble-for-africa': img('scramble-for-africa.png'),
  'evt-opium-wars': img('opium-wars.jpg'),
  'evt-abolition-movements': img('abolition-movements.jpg'),
  'evt-nationalism-europe': img('nationalism-europe.png'),
  'evt-tanzimat-reforms': img('tanzimat-reforms.png'),
  'evt-sepoy-mutiny': img('sepoy-mutiny.jpg'),

  // Era 1900-present
  'evt-world-war-1': img('world-war-1.jpg'),
  'evt-world-war-2': img('world-war-2.jpg'),
  'evt-cold-war': img('cold-war.png'),
  'evt-decolonization': img('decolonization.jpg'),
  'evt-chinese-revolution': img('chinese-revolution.jpg'),
  'evt-globalization': img('globalization.png'),
  'evt-russian-revolution': img('russian-revolution.jpg'),
  'evt-great-depression': img('great-depression.jpg'),
  'evt-genocide-holocaust': img('genocide-holocaust.jpg'),
  'evt-green-revolution': img('green-revolution.jpg'),
};

export const eventImages = {
  // Era 1200-1450
  'evt-mongol-empire': makeSvg('\u{1F40E}', '#E74C3C'),
  'evt-mali-empire': makeSvg('\u{1F451}', '#F39C12'),
  'evt-song-dynasty': makeSvg('\u{1F3EF}', '#27AE60'),
  'evt-black-death': makeSvg('\u{2620}', '#8E44AD'),
  'evt-delhi-sultanate': makeSvg('\u{1F54C}', '#1ABC9C'),
  'evt-crusades': makeSvg('\u{2694}', '#C0392B'),
  'evt-indian-ocean-trade': makeSvg('\u{1F6A2}', '#2980B9'),
  'evt-aztec-empire': makeSvg('\u{1F3DB}', '#D35400'),
  'evt-inca-empire': makeSvg('\u{26F0}', '#F1C40F'),
  'evt-european-feudalism': makeSvg('\u{1F3F0}', '#7F8C8D'),
  'evt-byzantine-empire': makeSvg('\u{2626}', '#6C3483'),

  // Era 1450-1750
  'evt-columbian-exchange': makeSvg('\u{1F33D}', '#E74C3C'),
  'evt-atlantic-slave-trade': makeSvg('\u{26D3}', '#2C3E50'),
  'evt-ottoman-empire': makeSvg('\u{1F319}', '#C0392B'),
  'evt-mughal-empire': makeSvg('\u{1F54C}', '#F39C12'),
  'evt-protestant-reformation': makeSvg('\u{1F4DC}', '#8E44AD'),
  'evt-silver-trade': makeSvg('\u{1FA99}', '#BDC3C7'),
  'evt-qing-dynasty': makeSvg('\u{1F409}', '#1ABC9C'),

  // Era 1750-1900
  'evt-industrial-revolution': makeSvg('\u{1F3ED}', '#34495E'),
  'evt-french-revolution': makeSvg('\u{1F5FC}', '#E74C3C'),
  'evt-haitian-revolution': makeSvg('\u{270A}', '#27AE60'),
  'evt-latin-american-independence': makeSvg('\u{1F5FD}', '#F39C12'),
  'evt-meiji-restoration': makeSvg('\u{1F1EF}', '#E74C3C'),
  'evt-scramble-for-africa': makeSvg('\u{1F30D}', '#2C3E50'),
  'evt-opium-wars': makeSvg('\u{1F4A8}', '#8E44AD'),
  'evt-abolition-movements': makeSvg('\u{1F517}', '#27AE60'),
  'evt-nationalism-europe': makeSvg('\u{1F3F3}', '#D35400'),
  'evt-tanzimat-reforms': makeSvg('\u{2696}', '#C0392B'),
  'evt-sepoy-mutiny': makeSvg('\u{1F525}', '#E67E22'),

  // Era 1900-present
  'evt-world-war-1': makeSvg('\u{1F4A3}', '#C0392B'),
  'evt-world-war-2': makeSvg('\u{2622}', '#2C3E50'),
  'evt-cold-war': makeSvg('\u{2744}', '#3498DB'),
  'evt-decolonization': makeSvg('\u{270A}', '#27AE60'),
  'evt-chinese-revolution': makeSvg('\u{2B50}', '#E74C3C'),
  'evt-globalization': makeSvg('\u{1F310}', '#1ABC9C'),
  'evt-russian-revolution': makeSvg('\u{2692}', '#C0392B'),
  'evt-great-depression': makeSvg('\u{1F4C9}', '#7F8C8D'),
  'evt-genocide-holocaust': makeSvg('\u{1F56F}', '#2C3E50'),
  'evt-green-revolution': makeSvg('\u{1F33E}', '#27AE60'),
};
