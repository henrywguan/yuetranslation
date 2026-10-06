import type { Lang } from '../lib/types'

export type SupportedLangCard = {
  id: Lang
  /** Short Harbor mark on the marquee chip. */
  mark: string
  en: string
  native: string
  voice: boolean
  flag: string
}

/** Every Solo / Cam language — voice plus text-only. */
export const SUPPORTED_LANG_CARDS: SupportedLangCard[] = [
  { id: 'yue', mark: '粵', en: 'Cantonese', native: '粵語', voice: true, flag: '🇭🇰' },
  { id: 'en', mark: 'En', en: 'English', native: 'English', voice: true, flag: '🇺🇸' },
  { id: 'cmn', mark: '普', en: 'Mandarin', native: '普通話', voice: true, flag: '🇨🇳' },
  { id: 'wuu', mark: '沪', en: 'Shanghainese', native: '上海話', voice: true, flag: '🇨🇳' },
  { id: 'sichuan', mark: '川', en: 'Sichuanese', native: '四川話', voice: true, flag: '🇨🇳' },
  { id: 'tl', mark: 'Tl', en: 'Tagalog', native: 'Tagalog', voice: true, flag: '🇵🇭' },
  { id: 'es', mark: 'Mx', en: 'Spanish(MX)', native: 'Español (MX)', voice: true, flag: '🇲🇽' },
  { id: 'eses', mark: 'Es', en: 'Spanish(ES)', native: 'Español (ES)', voice: true, flag: '🇪🇸' },
  { id: 'vi', mark: 'Vi', en: 'Vietnamese', native: 'Tiếng Việt', voice: true, flag: '🇻🇳' },
  { id: 'th', mark: 'Th', en: 'Thai', native: 'ไทย', voice: true, flag: '🇹🇭' },
  { id: 'lo', mark: 'Lo', en: 'Lao', native: 'ລາວ', voice: true, flag: '🇱🇦' },
  { id: 'ko', mark: 'Ko', en: 'Korean', native: '한국어', voice: true, flag: '🇰🇷' },
  { id: 'ja', mark: 'Ja', en: 'Japanese', native: '日本語', voice: true, flag: '🇯🇵' },
  { id: 'id', mark: 'Id', en: 'Indonesian', native: 'Bahasa Indonesia', voice: true, flag: '🇮🇩' },
  { id: 'ms', mark: 'Ms', en: 'Malay', native: 'Bahasa Melayu', voice: true, flag: '🇲🇾' },
  { id: 'pt', mark: 'Pt', en: 'Portuguese (BR)', native: 'Português (BR)', voice: true, flag: '🇧🇷' },
  { id: 'fr', mark: 'Fr', en: 'French', native: 'Français', voice: true, flag: '🇫🇷' },
  { id: 'hi', mark: 'Hi', en: 'Hindi', native: 'हिन्दी', voice: true, flag: '🇮🇳' },
  { id: 'km', mark: 'Km', en: 'Khmer', native: 'ភាសាខ្មែរ', voice: true, flag: '🇰🇭' },
  { id: 'my', mark: 'My', en: 'Burmese', native: 'မြန်မာ', voice: true, flag: '🇲🇲' },
  { id: 'jv', mark: 'Jv', en: 'Javanese', native: 'Basa Jawa', voice: true, flag: '🇮🇩' },
  { id: 'it', mark: 'It', en: 'Italian', native: 'Italiano', voice: true, flag: '🇮🇹' },
  { id: 'de', mark: 'De', en: 'German', native: 'Deutsch', voice: true, flag: '🇩🇪' },
  { id: 'nl', mark: 'Nl', en: 'Dutch', native: 'Nederlands', voice: true, flag: '🇳🇱' },
  { id: 'ceb', mark: 'Ceb', en: 'Cebuano', native: 'Binisaya', voice: false, flag: '🇵🇭' },
  { id: 'ilo', mark: 'Ilo', en: 'Ilocano', native: 'Ilokano', voice: false, flag: '🇵🇭' },
  { id: 'bcl', mark: 'Bcl', en: 'Bikol (Central)', native: 'Bikol Sentral', voice: false, flag: '🇵🇭' },
]
