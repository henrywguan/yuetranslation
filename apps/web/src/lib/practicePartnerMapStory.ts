/**
 * Story cards for Ink Road stops.
 * Hover previews a place. A tap pins the lesson brief before the drill starts.
 */
import {
  PATH_LESSONS_PER_UNIT,
  PATH_UNIT_LABELS,
  PRACTICE_PARTNER_PATH_SECTIONS,
  type PathCategory,
  type PracticePartnerPathState,
} from './practicePartnerPath'
import {
  WUXIA_CHAPTERS,
  practicePartnerChapterTale,
  type PartnerMapRegion,
  type PartnerMapScroll,
} from './practicePartnerMapLayout'

const HOW = [
  '港灣 says the line. You repeat it with them.',
  'You hear it, then answer without the script in front of you.',
  'The last words are missing. You close the line yourself.',
] as const

export const MAP_STORY_BEFORE =
  'The drill has not started. Read the stop, then practice this place when you are ready.'

/** Twelve beats per region, in road order: With me, From memory, then Finish. */
export const LESSON_TALES: Record<PathCategory, readonly string[]> = {
  common: [
    'A stone at the threshold asks your name. The first lantern stays dark until you greet it.',
    'The gatekeeper waits on the step. A short hello is enough to wake the oil.',
    'Someone on the stair asks how you are. Answer, and a second flame takes.',
    'The lintel wants a farewell that knows it will see you again.',
    'The words leave the page. You greet the gate from memory, the way a traveler does.',
    'The keeper speaks. You answer who you are without looking down.',
    'A question hangs in the arch. You give it back from what you heard.',
    'Thanks, without the scroll in your hands. The stair remembers.',
    'The gate offers half a sentence. You finish the greeting.',
    'A farewell is started for you. The last word is yours.',
    'The keeper begins. You close it, and the arch finds its color.',
    'The final lantern on the lintel stays dark until you complete the line.',
  ],
  foods: [
    'A stall keeper calls you over. The first order is said together.',
    'Steam hides the sign. You name what you want to eat.',
    'A bowl is set down. You say whether it is good.',
    'The bill is a short line. You ask for it side by side.',
    'The awning speaks. You order from memory, the way a regular would.',
    'Taste, without the characters in front of you.',
    'You hear the special. You answer what you will have.',
    'Thanks for the meal, from what you remember.',
    'The keeper starts your order. You finish the dish.',
    'A question about the taste is left open. You close it.',
    'The last bowl. You complete the line, and the steam turns gold.',
    'The night market writes half a farewell. The rest is yours.',
  ],
  animals: [
    'Something moves in the culms. You name it with 港灣.',
    'A crane stands in the stream. You say what it is.',
    'Tracks in the mud. You describe the animal that left them.',
    'The shrine bell waits. You tell what keeps the grove.',
    'The grove speaks a name. You give it back from memory.',
    'You hear a cry. You say what made it, without the script.',
    'A description starts in the leaves. You continue it from what you heard.',
    'The crane waits. You answer what you see.',
    'Half a name hangs in the mist. You finish it.',
    'The shrine begins a line about the wilds. You end it.',
    'Tracks, then silence. The last word is the animal.',
    'The grove offers the start. You close it, and the bamboo remembers green.',
  ],
  expert: [
    'The pavilion asks for a longer courtesy. You say it together.',
    'A guest on the cloud stair. You greet them properly.',
    'The view wants a full sentence, not a fragment.',
    'Someone offers tea in the formal way. You answer with them.',
    'The terrace speaks. You reply from memory, as a guest who belongs.',
    'A compliment about the view. You return it without looking down.',
    'You hear a careful question. You answer in kind.',
    'Thanks, the long way, from what you kept.',
    'The host begins a farewell. You complete the courtesy.',
    'Half a wish for the road ahead. You finish it.',
    'The gold stair starts a line. The ending is yours.',
    'The pavilion leaves the last words unpainted. Speak them, and the terrace is yours.',
  ],
}

export type MapStoryCardModel = {
  id: string
  category: PathCategory
  placeEn: string
  placeZh: string
  kicker: string
  line: string
  tale: string
  how: string
  before: string
}

export function practicePartnerLessonCard(scroll: PartnerMapScroll): MapStoryCardModel {
  const lesson = scroll.unit * PATH_LESSONS_PER_UNIT + scroll.index
  const tales = LESSON_TALES[scroll.category]
  const chapter = WUXIA_CHAPTERS.find((row) => row.id === scroll.category) ?? WUXIA_CHAPTERS[0]
  const section = PRACTICE_PARTNER_PATH_SECTIONS.find((row) => row.id === scroll.category)
  const status = scroll.colored ? 'Lit' : 'Still ink'
  return {
    id: scroll.id,
    category: scroll.category,
    placeEn: chapter.placeEn,
    placeZh: chapter.placeZh,
    kicker: `${scroll.cefr} · ${status}`,
    line: `${PATH_UNIT_LABELS[scroll.unit]} · ${scroll.index + 1} of ${PATH_LESSONS_PER_UNIT} · ${section?.labelEn ?? ''}`,
    tale: tales[lesson] ?? tales[0]!,
    how: HOW[scroll.unit],
    before: MAP_STORY_BEFORE,
  }
}

export function practicePartnerRegionCard(
  region: PartnerMapRegion,
  state: PracticePartnerPathState,
): MapStoryCardModel {
  const section = PRACTICE_PARTNER_PATH_SECTIONS.find((row) => row.id === region.id)
  return {
    id: `region:${region.id}`,
    category: region.id,
    placeEn: region.placeEn,
    placeZh: region.placeZh,
    kicker: `${region.cefr} · ${region.placeEn}`,
    line: section?.labelEn ?? region.labelEn,
    tale: practicePartnerChapterTale(state, region.id),
    how: section?.blurb ?? '',
    before: MAP_STORY_BEFORE,
  }
}
