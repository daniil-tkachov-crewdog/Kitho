import type { Profile } from './api'

export function isProfileComplete(p: Profile | null): boolean {
  return !!p && !!p.name && !!p.age && !!p.location && p.photos.length > 0
}
