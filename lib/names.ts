// Random name generator for anonymous users
// 2-word combo: ridiculous Indonesian subjects + unhinged modifiers
const subjects = [
  // binatang absurd
  'Kucing', 'Cicak', 'Capybara', 'Lele', 'Ubur2', 'Bekicot', 'Cacing',
  'Lalat', 'Tokek', 'Kadal', 'Kepiting', 'Nyamuk', 'Kecoak', 'Belut',
  'Kampret', 'Tikus', 'Siput',

  // makanan / brand
  'Indomie', 'Micin', 'Bakso', 'Seblak', 'Cilok', 'Boba', 'Cireng',
  'Nasi', 'Mie', 'Tempe', 'Kerupuk', 'Cimol', 'Gorengan',

  // benda random
  'Sendal', 'Kolor', 'Ember', 'Gayung', 'Sapu', 'Panci', 'Jemuran',
  'Kasur', 'Bantal', 'HP', 'Remote', 'Kulkas', 'Galon',

  // makhluk & karakter
  'Tuyul', 'Pocong', 'Kunti', 'Genderuwo', 'Setan', 'Ojol', 'Satpam',
  'Emak2', 'Bapak2', 'Bocil', 'Wibu', 'Bucin', 'Jones',
];

const modifiers = [
  // emosi & slang
  'Galau', 'Ngambek', 'Baper', 'Mager', 'Gabut', 'Kesel', 'Nangis',
  'Ngamuk', 'Meledak', 'Kesurupan', 'Kesetrum', 'Ngesot', 'Melayang',
  'Kejang2', 'Ketiduran',

  // sifat absurd
  'Gosong', 'Bengkak', 'Gepeng', 'Nyangkut', 'Melar', 'Bocor',
  'Terbalik', 'Kelilipan', 'Kesleo', 'Kram', 'Budukan',

  // meme vibes
  'Sigma', 'Sultan', 'Toxic', 'Noob', 'AFK', 'GG', 'Halu',
  'PuraPuraCuek', 'SkipIntro', 'AutoPilot', 'Buffering', 'Loading',
  'Lagging', 'Ngefreeze',

  // tingkah laku
  'Rebahan', 'Karaokean', 'Ngoding', 'Scrolling', 'Nyasar', 'Kabur',
  'Ngumpet', 'Kejar2an', 'Gelundungan', 'Salto', 'Koprol',
];

const rareModifiers = [
  // peak absurdity (15% chance)
  'RizMaxxing', 'NPC', 'DiPHK', 'Multiverse', 'Speedrun',
  'NoCounter', 'GachaAddict', 'FinalBoss', '999IQ', 'AntiSosial',
  'DarkMode', 'OneHitKO', 'PayToWin', 'BugHunter', 'GlitchDiDunia',
];

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const avatarColors = [
  '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#6366f1', '#d946ef', '#0ea5e9', '#10b981', '#e11d48',
  '#a855f7', '#eab308', '#64748b', '#dc2626', '#2563eb',
];

export function generateRandomName(): string {
  const subject = pick(subjects);
  const modifier = pick(modifiers);
  const number = Math.random() < 0.3
    ? Math.floor(Math.random() * 999)
    : '';

  const isRare = Math.random() < 0.15;
  const isShort = Math.random() < 0.2;

  // 1️⃣ super pendek (biar unik & punchy)
  if (isShort) {
    return randomCase(subject);
  }

  // 2️⃣ normal (2 kata)
  let name = Math.random() < 0.5
    ? `${subject} ${modifier}`
    : `${modifier} ${subject}`;

  // 3️⃣ optional number (biar variasi)
  if (number) {
    name += ` ${number}`;
  }

  // 4️⃣ rare bonus (tapi tetap pendek)
  if (isRare) {
    name = `${subject} ${pick(rareModifiers)}`;
  }

  return randomCase(name.trim());
}

export function generateAvatarColor(): string {
  return avatarColors[Math.floor(Math.random() * avatarColors.length)];
}

export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export interface UserIdentity {
  user_id: string;
  username: string;
  avatar_color: string;
}

const STORAGE_KEY = 'dropatrack_user';
const EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 jam
type StoredUser = UserIdentity & {
  expiresAt: number;
};

export function getOrCreateUser(): (UserIdentity & { isNew: boolean }) | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as StoredUser;

      // cek apakah masih valid
      if (Date.now() < parsed.expiresAt) {
        const { expiresAt, ...user } = parsed;
        return { ...user, isNew: false };
      }

      // kalau expired, hapus data lama
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // generate user baru
  const user: StoredUser = {
    user_id: generateUserId(),
    username: generateRandomName(),
    avatar_color: generateAvatarColor(),
    expiresAt: Date.now() + EXPIRY_MS,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  const { expiresAt, ...plainUser } = user;
  return { ...plainUser, isNew: true };
}

export function updateLocalUsername(newUsername: string): (UserIdentity & { isNew: boolean }) | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  let parsed: StoredUser;
  try {
    parsed = JSON.parse(stored) as StoredUser;
  } catch {
    return null;
  }

  const updatedUser: StoredUser = {
    ...parsed,
    username: newUsername,
    expiresAt: Date.now() + EXPIRY_MS,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));

  const { expiresAt, ...plainUser } = updatedUser;
  return { ...plainUser, isNew: false };
}

function randomCase(subject: string): string {
  return subject
    .split('')
    .map((c) =>
      Math.random() < 0.5 ? c.toLowerCase() : c.toUpperCase()
    )
    .join('');
}
