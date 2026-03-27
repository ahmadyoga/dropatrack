// Random cute name generator for anonymous users
// Uses Indonesian animal names with fun adjectives
const subjects = [
  // animals
  'Kucing', 'Ayam', 'Bebek', 'Panda', 'Cicak', 'Gajah', 'Semut', 'Ular', 'Burung',
  'Kelinci', 'Harimau', 'Ikan', 'Nyamuk',

  // food
  'Nasi', 'Bakso', 'Indomie', 'Sate', 'Tahu', 'Tempe', 'Seblak', 'MieAyam',

  // random objects
  'Kulkas', 'Remote', 'Sendal', 'Kasur', 'Bantal', 'Laptop', 'HP', 'Meja'
];

const modifiers = [
  // emotions / slang
  'Galau', 'Gabut', 'Ngambek', 'Baper', 'Santuy', 'Lelah', 'Nangis',
  'Overthinking', 'Mager', 'Stress', 'Bingung',

  // funny traits
  'Lucu', 'Mini', 'Gede', 'Kocak', 'Receh', 'Absurd', 'Random',

  // meme vibes
  'Toxic', 'Sultan', 'Hardcore', 'Elegan', 'Brutal', 'Legend', 'Epic'
];

const rareModifiers = [
  'Quantum', 'Multiverse', 'Ngoding', 'Debugging',
  'Gacha', 'Speedrun', 'NoCounter', 'Sigma'
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

  // 15% chance jadi super absurd
  const isRare = Math.random() < 0.15;

  const modifier = isRare ? pick(rareModifiers) : pick(modifiers);

  return `${subject} ${modifier}`;
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