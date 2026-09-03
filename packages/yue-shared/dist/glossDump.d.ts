/**
 * Dictionary-dump detector shared by API lexicon MT and the web translation guard.
 * Rejects strings that still look like glossary / meta notes, not conversational copy.
 */
/** True when a string still looks like a dictionary dump, not a conversational translation. */
export declare function looksLikeGlossDump(text: string): boolean;
//# sourceMappingURL=glossDump.d.ts.map