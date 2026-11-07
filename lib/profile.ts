/** Profile shape as normalised by the existing CampusDrop client (copied field-for-field). */
export interface Profile {
  id: string;
  name: string;
  age: number;
  college: string;
  program: string;
  year: number;
  avatar: string;
  photos: string[];
  photoIds?: string[];
  bio: string;
  interests: string[];
  hometown: string;
  mbti: string;
  zodiac: string;
  verified: boolean;
  completionPct: number;
  insightsReviewed: boolean;
  gender?: string;
  lookingFor?: string;
  connectionPreferenceGenders: string[];
  classRoom?: string;
  favoritePlaces: string[];
}

export type ProfilePatch = Partial<
  Pick<
    Profile,
    "name" | "age" | "program" | "year" | "bio" | "interests" | "hometown" | "mbti" | "zodiac" | "gender" | "lookingFor" | "connectionPreferenceGenders" | "favoritePlaces" | "avatar"
  >
>;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown) => (Array.isArray(v) ? (v.filter(Boolean) as string[]) : []);

export function normalizeProfile(e: Record<string, any>): Profile {
  const photos = arr(e.photos);
  const pct = Number(e.completionPct);
  return {
    id: e.id ?? e.email ?? "campus-drop-user",
    name: str(e.name),
    age: Number(e.age) > 0 ? Number(e.age) : 0,
    college: str(e.college),
    program: str(e.program),
    year: Number(e.year) > 0 ? Number(e.year) : 0,
    avatar: str(e.avatar) || photos[0] || "",
    photos,
    photoIds: Array.isArray(e.photoIds) ? e.photoIds : undefined,
    bio: str(e.bio),
    interests: arr(e.interests),
    hometown: str(e.hometown),
    mbti: str(e.mbti),
    zodiac: str(e.zodiac),
    verified: !!e.verified,
    completionPct: Number.isFinite(pct) ? Math.max(0, Math.min(100, Math.round(pct))) : 0,
    insightsReviewed: !!e.insightsReviewed,
    gender: str(e.gender) || undefined,
    lookingFor: str(e.lookingFor) || undefined,
    connectionPreferenceGenders: arr(e.connectionPreferenceGenders),
    classRoom: str(e.classRoom) || undefined,
    favoritePlaces: arr(e.favoritePlaces),
  };
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "C").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export const YEAR_LABELS = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Postgrad"];

export const INTEREST_SUGGESTIONS = [
  "Indie music", "Football", "Badminton", "Late-night chai", "Coding", "Film photography", "Anime", "Startups",
  "Poetry", "Gym", "Board games", "Cooking", "Debate", "Dance", "K-dramas", "Hiking", "Sketching", "Volunteering",
  "Stand-up comedy", "Chess", "Gaming", "Books", "Thrifting", "Cricket", "Robotics", "Theatre", "Travel", "Podcasts",
];
