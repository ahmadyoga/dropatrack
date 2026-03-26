// Random cute name generator for anonymous users
// Uses Indonesian animal names with fun adjectives

// Random cute & EXTREMELY funny name generator for anonymous users
// Over 50 animals and 50 adjectives for 250,000+ unique combinations (including numbers)

const funnyAnimals = [
  // Serangga & Hewan Kecil
  'Kecoak', 'Undur-undur', 'Laron', 'Ulat Bulu', 'Caplak',
  'Kutu Air', 'Cacing', 'Kumbang', 'Belalang', 'Jangkrik',
  'Kelabang', 'Kaki Seribu', 'Kampret', 'Kutu Rambut', 'Tengu',

  // Reptil & Amfibi
  'Biawak', 'Kecebong', 'Tokek', 'Katak', 'Berudu',
  'Bunglon', 'Iguana', 'Penyu', 'Komodo',

  // Hewan Darat Absurd/Lokal
  'Trenggiling', 'Tapir', 'Kudanil', 'Babon', 'Monyet',
  'Celeng', 'Musang', 'Kukang', 'Anoa', 'Babi Hutan',
  'Kalkun', 'Burung Onta', 'Entok', 'Ayam Kampus', // *Ayam Kampus bisa diganti 'Ayam Cemani' kalau takut terlalu edgy
  'Ayam Cemani', 'Bebek Ngesot',

  // Hewan Air (Bayangin mereka ngelakuin hal di darat)
  'Bekicot', 'Lintah', 'Ubur-ubur', 'Gurita', 'Cumi-cumi',
  'Lele', 'Mujair', 'Ikan Teri', 'Tongkol', 'Rajungan',
  'Keong Racun', 'Anjing Laut', 'Walrus', 'Singa Laut'
];

const funnyAdjectives = [
  // Gerakan Akrobatik & Aneh
  'Kayang', 'Koprol', 'Salto', 'Ngesot', 'Kesandung',
  'Keseleo', 'Kecebur', 'Joget', 'Dangdutan', 'Cosplay',
  'Ngedrag', 'Balapan', 'Tiktokan',

  // Kondisi Fisik & Keseharian
  'Rebahan', 'Mager', 'Kesiangan', 'Ketiduran', 'Ngemil',
  'Diet', 'Mandi', 'Ngos-ngosan', 'Kesemutan', 'Masuk Angin',
  'Kerokan', 'Kehujanan', 'Kepanasan', 'Ngopi', 'Nyeblak',
  'Mancing', 'Jemur Baju', 'Nyapu',

  // Emosi & Kelakuan Gen Z/Millennial
  'Galau', 'Nyasar', 'Baperan', 'Meringis', 'Melongo',
  'Kaget', 'Ngambek', 'Patah Hati', 'Caper', 'Insecure',
  'Overthinking', 'Curhat', 'Kasmaran', 'Lupa Ingatan',
  'Ditagih Pinjol', 'Nonton Drakor', 'Sambat', 'Nugas'
];

const avatarColors = [
  '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#6366f1', '#d946ef', '#0ea5e9', '#10b981', '#e11d48',
  '#a855f7', '#eab308', '#64748b', '#dc2626', '#2563eb',
];

export function generateRandomName(): string {
  const animal = funnyAnimals[Math.floor(Math.random() * funnyAnimals.length)];
  const adjective = funnyAdjectives[Math.floor(Math.random() * funnyAdjectives.length)];
  // Angka random 1-99
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

export function getOrCreateUser(): (UserIdentity & { isNew: boolean }) | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return { ...(JSON.parse(stored) as UserIdentity), isNew: false };
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
  return { ...user, isNew: true };
}
