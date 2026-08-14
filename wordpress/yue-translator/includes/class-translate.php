<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Yue_Translate
{
    private const SYSTEM_YUE = 'You are an expert Hong Kong Cantonese translator for live conversation. Translate TO spoken Hong Kong 粵語 with Traditional Chinese characters (係、唔、喺、咗、緊、啲、嘅). Return ONLY valid JSON: {"translation":"<Cantonese>","definition":"<short English gloss of what it means>"}. The definition helps learners — brief, clear English.';

    private const SYSTEM_EN = 'You are an expert Hong Kong Cantonese translator for live conversation. Translate TO natural conversational English. Return ONLY valid JSON: {"translation":"<English>","definition":""}.';

    private const SYSTEM_YUE_ALTS = 'You are a Hong Kong Cantonese interpreter. Translate English into colloquial spoken Cantonese (口語粵語), not Mandarin and not formal written Chinese. Prefer characters such as 係、唔、喺、咗、緊、㗎、喇、喎. Return ONLY valid JSON: {"primary":"<best translation>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}. Include 0–3 alternatives that meaningfully differ (wording, particles, politeness). Do not repeat the primary. If none, use "alternatives": []. Definition should help a learner. No markdown.';

    public static function openai_configured(): bool
    {
        return (bool) get_option('yue_openai_key');
    }

    /**
     * @return array{text:string,definition?:string,alternatives?:array<int,string>,engine:string}|WP_Error
     */
    public static function translate(string $text, string $from, string $to, bool $include_alternatives = false)
    {
        $text = trim($text);
        if ($text === '') {
            return new WP_Error('yue_translate', 'text is required', ['status' => 400]);
        }
        if ($from === $to) {
            return ['text' => $text, 'definition' => '', 'alternatives' => [], 'engine' => 'identity'];
        }

        $want_alts = $include_alternatives && $from === 'en' && $to === 'yue';

        if (self::openai_configured()) {
            $out = self::openai($text, $from, $to, $want_alts);
            if (!is_wp_error($out)) {
                return $out;
            }
        }

        $demo = self::demo($text, $from, $to, $want_alts);
        return [
            'text' => $demo['text'],
            'definition' => $demo['definition'],
            'alternatives' => $demo['alternatives'],
            'engine' => 'demo',
        ];
    }

    /**
     * @return array{text:string,definition:string,alternatives:array<int,string>}|WP_Error
     */
    private static function openai(string $text, string $from, string $to, bool $want_alts)
    {
        $key = (string) get_option('yue_openai_key');
        $model = (string) get_option('yue_openai_model', 'gpt-4o-mini');
        $fallback_def = $from === 'en' ? $text : '';

        if ($want_alts) {
            $body = [
                'model' => $model,
                'temperature' => 0.35,
                'response_format' => ['type' => 'json_object'],
                'messages' => [
                    ['role' => 'system', 'content' => self::SYSTEM_YUE_ALTS],
                    ['role' => 'user', 'content' => $text],
                ],
            ];
        } else {
            $system = $to === 'yue' ? self::SYSTEM_YUE : self::SYSTEM_EN;
            $body = [
                'model' => $model,
                'temperature' => 0.2,
                'messages' => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user', 'content' => $text],
                ],
            ];
        }

        $response = wp_remote_post('https://api.openai.com/v1/chat/completions', [
            'headers' => [
                'Authorization' => 'Bearer ' . $key,
                'Content-Type' => 'application/json',
            ],
            'timeout' => 30,
            'body' => wp_json_encode($body),
        ]);
        if (is_wp_error($response)) {
            return $response;
        }
        $data = json_decode(wp_remote_retrieve_body($response), true);
        $raw = trim((string) ($data['choices'][0]['message']['content'] ?? ''));
        if ($raw === '') {
            return new WP_Error('yue_translate', 'Empty OpenAI response', ['status' => 502]);
        }

        if ($want_alts) {
            $parsed = self::parse_yue_payload($raw, $text, $fallback_def);
            return [
                'text' => $parsed['text'],
                'definition' => $parsed['definition'],
                'alternatives' => $parsed['alternatives'],
                'engine' => 'openai',
            ];
        }

        $parsed = self::parse_json_payload($raw, $text, $fallback_def);
        return [
            'text' => $parsed['text'],
            'definition' => $to === 'yue' ? ($parsed['definition'] ?: $fallback_def) : $parsed['definition'],
            'alternatives' => [],
            'engine' => 'openai',
        ];
    }

    /** @return array{text:string,definition:string} */
    private static function parse_json_payload(string $raw, string $fallback_text, string $fallback_def): array
    {
        $cleaned = preg_replace('/^```(?:json)?\s*/i', '', trim($raw));
        $cleaned = preg_replace('/\s*```$/', '', (string) $cleaned);
        $cleaned = trim((string) $cleaned);
        $json = json_decode($cleaned, true);
        if (is_array($json)) {
            $translation = '';
            if (!empty($json['translation']) && is_string($json['translation'])) {
                $translation = trim($json['translation']);
            } elseif (!empty($json['text']) && is_string($json['text'])) {
                $translation = trim($json['text']);
            }
            $definition = (!empty($json['definition']) && is_string($json['definition']))
                ? trim($json['definition'])
                : '';
            return [
                'text' => $translation !== '' ? $translation : $fallback_text,
                'definition' => $definition !== '' ? $definition : $fallback_def,
            ];
        }
        return ['text' => $cleaned !== '' ? $cleaned : $fallback_text, 'definition' => $fallback_def];
    }

    /**
     * @return array{text:string,definition:string,alternatives:array<int,string>}
     */
    private static function parse_yue_payload(string $raw, string $fallback, string $fallback_def): array
    {
        $cleaned = trim($raw);
        $cleaned = preg_replace('/^```(?:json)?\s*/i', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\s*```$/', '', $cleaned) ?? $cleaned;
        $parsed = json_decode(trim($cleaned), true);
        if (!is_array($parsed)) {
            return [
                'text' => trim($raw) !== '' ? trim($raw) : $fallback,
                'definition' => $fallback_def,
                'alternatives' => [],
            ];
        }
        $primary = isset($parsed['primary']) && is_string($parsed['primary']) && trim($parsed['primary']) !== ''
            ? trim($parsed['primary'])
            : $fallback;
        $definition = (!empty($parsed['definition']) && is_string($parsed['definition']))
            ? trim($parsed['definition'])
            : $fallback_def;
        $alts = [];
        if (isset($parsed['alternatives']) && is_array($parsed['alternatives'])) {
            foreach ($parsed['alternatives'] as $alt) {
                if (!is_string($alt)) {
                    continue;
                }
                $v = trim($alt);
                if ($v === '' || $v === $primary || in_array($v, $alts, true)) {
                    continue;
                }
                $alts[] = $v;
                if (count($alts) >= 3) {
                    break;
                }
            }
        }
        return ['text' => $primary, 'definition' => $definition, 'alternatives' => $alts];
    }

    /**
     * @return array{text:string,definition:string,alternatives:array<int,string>}
     */
    private static function demo(string $text, string $from, string $to, bool $want_alts): array
    {
        $map = [
            'hello' => ['你好', 'hello; hi (greeting)', ['哈囉', '嗨']],
            'hi' => ['嗨', 'hi; hey', ['你好', '哈囉']],
            'thank you' => ['唔該', 'thank you (for a service / favor)', ['多謝']],
            'thanks' => ['多謝', 'thanks; many thanks', ['唔該']],
            'good morning' => ['早晨', 'good morning', ['早安']],
            'how are you' => ['你好嗎', 'how are you?', ['最近點呀', '你幾好嗎']],
            'where is the mtr' => ['地鐵喺邊度', 'where is the MTR / subway?', ['港鐵喺邊呀', '地鐵站喺邊']],
            'how much is this' => ['呢個幾錢', 'how much is this?', ['呢樣幾多錢', '請問賣幾錢']],
            'yes' => ['係', 'yes', []],
            'no' => ['唔係', 'no', []],
            '你好' => ['Hello', 'hello; hi', []],
            '唔該' => ['Thank you', 'thank you', []],
            '多謝' => ['Thanks', 'thanks', []],
            '早晨' => ['Good morning', 'good morning', []],
            '你好嗎' => ['How are you?', 'how are you?', []],
            '地鐵喺邊度' => ['Where is the MTR?', 'where is the MTR?', []],
            '呢個幾錢' => ['How much is this?', 'how much is this?', []],
            '係' => ['Yes', 'yes', []],
            '唔係' => ['No', 'no', []],
        ];
        $key = self::demo_lookup_key($text);
        $hit = $map[$key] ?? null;
        if ($hit) {
            return [
                'text' => $hit[0],
                'definition' => $to === 'yue' ? $hit[1] : ($hit[1] ?? ''),
                'alternatives' => ($want_alts && $to === 'yue') ? $hit[2] : [],
            ];
        }
        return [
            'text' => $to === 'yue' ? "（示範）{$text}" : "(demo) {$text}",
            'definition' => $from === 'en' && $to === 'yue' ? $text : '',
            'alternatives' => [],
        ];
    }

    private static function demo_lookup_key(string $text): string
    {
        $key = mb_strtolower(trim($text), 'UTF-8');
        $key = preg_replace('/[?!.,;:。？！，、…]+$/u', '', $key) ?? $key;
        $key = preg_replace('/\s+/u', ' ', $key) ?? $key;
        return trim($key);
    }
}
