// Port of web/src/components/Icons.tsx (stroke icons, 24x24 viewBox).
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { colors } from '../lib/theme'

type P = { size?: number; color?: string; fill?: string }
const stroke = (color = colors.text) => ({ fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }) as const

export const HeartIcon = ({ size = 18, color, fill }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)} fill={fill ?? 'none'}><Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></Svg>
)
export const PinIcon = ({ size = 16, color = colors.muted }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}><Path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z" /><Circle cx="12" cy="10" r="2" /></Svg>
)
export const LockIcon = ({ size = 16, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}><Rect x="5" y="11" width="14" height="10" rx="2" /><Path d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>
)
export const CompassIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}><Circle cx="12" cy="12" r="9" /><Path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" /></Svg>
)
export const InboxIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}><Path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z" /><Path d="M4 13h4.5l1 2h5l1-2H20" /></Svg>
)
export const UserIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}><Circle cx="12" cy="8" r="4" /><Path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></Svg>
)
export const GoogleIcon = ({ size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1z" />
    <Path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
    <Path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8z" />
    <Path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
  </Svg>
)
export const AppleIcon = ({ size = 18, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8a4.6 4.6 0 0 0-3.6-2c-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9a4.9 4.9 0 0 0-4.1 2.5c-1.8 3.1-.5 7.6 1.3 10.1.8 1.2 1.8 2.6 3.1 2.5 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.5a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.5-4zM14 5.1A4.3 4.3 0 0 0 15 2a4.4 4.4 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 3c1.1.1 2.2-.6 2.9-1.4z" /></Svg>
)
export const GearIcon = ({ size = 20, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}><Circle cx="12" cy="12" r="3" /><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>
)
export const ChevronLeftIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}><Path d="M15 6l-6 6 6 6" /></Svg>
)
export const AlertIcon = ({ size = 20, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}><Circle cx="12" cy="12" r="9" /><Path d="M12 7.5v5.5" /><Path d="M12 16.5h.01" /></Svg>
)
export const BanIcon = ({ size = 20, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}><Circle cx="12" cy="12" r="9" /><Path d="M5.6 5.6l12.8 12.8" /></Svg>
)

/** Logo mark: white heart in an accent circle (web .logo-mark). */
export const LogoMark = ({ size = 32 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Circle cx="16" cy="16" r="16" fill={colors.accent} />
    <Path transform="translate(4 4)" fill="#fff" d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </Svg>
)
