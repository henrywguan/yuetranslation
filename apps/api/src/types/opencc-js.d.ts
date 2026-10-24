declare module 'opencc-js' {
  export type Locale = 'cn' | 'tw' | 'twp' | 'hk' | 'hkp' | 'jp' | 't'
  export type Converter = (text: string) => string
  export function Converter(options: { from: Locale; to: Locale }): Converter
}
