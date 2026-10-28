// What a person looks like in the office, picked on the character select screen.
// Server and client share these lists so a look is just three small indexes on the wire.

export const SKIN_TONES = ['#ffe3cc', '#ffd7b5', '#f1c27d', '#e0ac69', '#c68642', '#a0663a', '#8d5524', '#5c3a21'];
export const HAIR_COLORS = ['#2b2d42', '#4a3222', '#6f4e37', '#e9c46a', '#c1440e', '#d9d9d9', '#d62828', '#ff8fab', '#9d4edd', '#264653'];
export const HAIR_COLOR_NAMES = ['Siyah', 'Koyu kahve', 'Kahverengi', 'Sarı', 'Kızıl', 'Gümüş', 'Kırmızı', 'Pembe', 'Mor', 'Petrol'];
export const HAIR_STYLES = ['Kısa', 'Uzun', 'Topuz', 'Dikenli', 'Kıvırcık', 'At kuyruğu', 'Kel'];

export interface Look {
  skin: number;
  hair: number;
  style: number;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A look picked from a seed, for people who haven't chosen one. */
export function lookFromSeed(seed: string): Look {
  const h = hash(seed);
  return { skin: h % SKIN_TONES.length, hair: (h >>> 3) % HAIR_COLORS.length, style: (h >>> 7) % HAIR_STYLES.length };
}

export function randomLook(): Look {
  const pick = (n: number) => Math.floor(Math.random() * n);
  return { skin: pick(SKIN_TONES.length), hair: pick(HAIR_COLORS.length), style: pick(HAIR_STYLES.length) };
}

const NAME_ADJECTIVES = ['Güneşli', 'Kozmik', 'Sakin', 'Hızlı', 'Akıllı', 'Cesur', 'Neşeli', 'Yumuşak', 'Çevik', 'Yürekli', 'Cin', 'Esprili', 'Baharatlı', 'Rahat', 'Şanslı', 'Esintili', 'Capcanlı', 'Şık', 'Tüylü', 'Nazik', 'Havalı', 'Alçakgönüllü', 'Meraklı', 'Canlı', 'Şen', 'Becerikli', 'Enerjik', 'Atik', 'Süratli', 'Derli toplu', 'Fıldır', 'Gözüpek'];
const NAME_ANIMALS = ['Su samuru', 'Balıkçıl', 'Panda', 'Şahin', 'Porsuk', 'Koala', 'Vaşak', 'Dağ sıçanı', 'Narval', 'Ahtapot', 'Penguen', 'Kuokka', 'Rakun', 'Tembel hayvan', 'Tapir', 'Mors', 'Yak', 'Kunduz', 'Kapibara', 'Yunus', 'Gelincik', 'Gekko', 'Kirpi', 'Aynak', 'Jaguar', 'Lemur', 'Geyik', 'Semender', 'Baykuş', 'Deniz papağanı', 'Kızılgerdan', 'Fok'];

/** A made-up name like "Neşeli Penguen", for people who'd rather not think of one. */
export function randomName(): string {
  const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
  return `${pick(NAME_ADJECTIVES)} ${pick(NAME_ANIMALS)}`;
}

/** Coerces anything into a valid look, keeping each part of `fallback` that `x` gets wrong. */
export function sanitizeLook(x: unknown, fallback: Look): Look {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
  const idx = (v: unknown, n: number, d: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < n ? (v as number) : d);
  return {
    skin: idx(o.skin, SKIN_TONES.length, fallback.skin),
    hair: idx(o.hair, HAIR_COLORS.length, fallback.hair),
    style: idx(o.style, HAIR_STYLES.length, fallback.style),
  };
}

export function sameLook(a: Look, b: Look): boolean {
  return a.skin === b.skin && a.hair === b.hair && a.style === b.style;
}
