// Random name generator for anonymous users

const animals = [
  'Kucing', 'Cicak', 'Capybara', 'Lele', 'Ubur2', 'Bekicot',
  'Cacing', 'Lalat', 'Tokek', 'Kadal', 'Kepiting', 'Nyamuk',
  'Kecoak', 'Belut', 'Kampret', 'Tikus', 'Siput',

  // tambahan absurd
  'AyamGeprek', 'BebekNgegas', 'KucingOren', 'KadalWifi',
  'LeleNgoding', 'Tuyul', 'Pocong', 'Kunti', 'Genderuwo',
  'Bocil', 'Bapak2', 'Emak2', 'Ojol', 'Satpam',

  // benda nyasar (biar chaos)
  'Sendal', 'Kolor', 'Ember', 'Gayung', 'Remote',
  'Kulkas', 'Galon', 'RiceCooker'
];

const adjectives = [
  'Ngamuk', 'Ngambek', 'Baper', 'Mager', 'Gabut',
  'Kesel', 'Nangis', 'Kesurupan', 'Kesetrum',
  'Ngesot', 'Melayang', 'Kejang2', 'Ketiduran',

  'Gosong', 'Bengkak', 'Gepeng', 'Nyangkut',
  'Bocor', 'Terbalik', 'Kelilipan', 'Kesleo',

  // meme vibes
  'Sigma', 'Sultan', 'Toxic', 'Noob', 'AFK',
  'GG', 'Halu', 'AutoPilot', 'Loading', 'Lagging',

  // absurd modern
  'Ngoding', 'Scrolling', 'Nyasar', 'Kabur',
  'Rebahan', 'Overthinking', 'Burnout'
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

function randomCase(subject: string): string {
  return subject
    ;
}
