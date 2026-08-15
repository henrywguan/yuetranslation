/** Character glosses for demo phrases and common spoken particles. */
const CHAR_SENSE: Record<string, string> = {
  你: 'you',
  好: 'good; well',
  嗎: 'question particle',
  嗨: 'hi; hey',
  唔: 'not (spoken Cantonese)',
  該: 'ought; in 唔該, thanks for a favor',
  多: 'many; much',
  謝: 'thanks',
  早: 'early; morning',
  晨: 'dawn; morning',
  地: 'ground; in 地鐵, underground / MTR',
  鐵: 'iron; rail',
  喺: 'at; in (spoken)',
  邊: 'which; where',
  度: 'place; location',
  呢: 'this',
  個: 'this one (classifier)',
  幾: 'how many; how much',
  錢: 'money',
  係: 'to be; yes',
  哋: 'plural (we / they)',
}

export function charSense(char: string) {
  return CHAR_SENSE[char]?.trim() || ''
}
