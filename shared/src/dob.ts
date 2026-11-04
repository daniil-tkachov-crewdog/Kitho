export type Dob = { day: number; month: number; year: number } // month 1–12

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const daysIn = (month: number, year: number) => new Date(year, month, 0).getDate()
const pad = (n: number) => String(n).padStart(2, '0')

export const dobToIso = (d: Dob) => `${d.year}-${pad(d.month)}-${pad(d.day)}`

/** Full years between the date of birth and today. */
export function ageFrom(d: Dob, today = new Date()): number {
  let age = today.getFullYear() - d.year
  if (today.getMonth() + 1 < d.month || (today.getMonth() + 1 === d.month && today.getDate() < d.day)) age--
  return age
}

export function defaultDob(): Dob {
  return { day: 1, month: 1, year: new Date().getFullYear() - 25 }
}
