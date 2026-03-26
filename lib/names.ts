// Random cute name generator for anonymous users
// Uses Indonesian animal names with fun adjectives

const animals = [
  'Kijang', 'Kerbau', 'Kucing', 'Kelinci', 'Katak',
  'Burung', 'Bebek', 'Banteng', 'Badak', 'Beruang',
  'Capung', 'Cendrawasih', 'Cicak', 'Camar',
  'Domba', 'Dugong', 'Dara',
  'Elang', 'Enggang',
  'Flamingo',
  'Garuda', 'Gajah',
  'Harimau', 'Hiu',
  'Iguana', 'Ikan',
  'Jalak', 'Jerapah',
  'Kambing', 'Koala', 'Kuda', 'Komodo',
  'Lumba', 'Lebah', 'Luwak',
  'Merak', 'Merpati', 'Musang',
  'Naga', 'Nyamuk',
  'Orangutan', 'Otter',
  'Penyu', 'Panda', 'Pipit',
  'Rusa', 'Rajawali',
  'Singa', 'Siput', 'Semut',
  'Tupai', 'Tokek',
  'Ular', 'Udang',
  'Walet', 'Wereng',
];

const adjectives = [
  'Ceria', 'Malu', 'Galak', 'Lucu', 'Kecil',
  'Besar', 'Lincah', 'Malas', 'Pintar', 'Kuat',
  'Imut', 'Santai', 'Gesit', 'Berani', 'Tenang',
  'Gagah', 'Liar', 'Jinak', 'Ramah', 'Asyik',
  'Hebat', 'Keren', 'Gokil', 'Epic', 'Mantap',
];

const avatarColors = [
  '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#6366f1', '#d946ef', '#0ea5e9', '#10b981', '#e11d48',
  '#a855f7', '#eab308', '#64748b', '#dc2626', '#2563eb',
];

export function generateRandomName(): string {
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const number = Math.floor(Math.random() * 99) + 1;
  return `${animal} ${adjective} ${number}`;
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

export function getOrCreateUser(): UserIdentity | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as UserIdentity;
    } catch {
      // Invalid stored data, generate new
    }
  }

  const user: UserIdentity = {
    user_id: generateUserId(),
    username: generateRandomName(),
    avatar_color: generateAvatarColor(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}
