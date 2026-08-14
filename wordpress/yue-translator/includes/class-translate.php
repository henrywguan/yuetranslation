<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Yue_Translate
{
    private const SYSTEM = 'You are an expert Hong Kong Cantonese ↔ English translator for live conversation. When translating TO Cantonese use spoken Hong Kong 粵語 with Traditional Chinese characters (係、唔、喺、咗、緊、啲、嘅). When translating TO English use natural conversational English. Return ONLY the translation.';

    private const SYSTEM_YUE_ALTS = 'You are a Hong Kong Cantonese interpreter. Translate English into colloquial spoken Cantonese (口語粵語), not Mandarin and not formal written Chinese. Prefer characters such as 係、唔、喺、咗、緊、㗎、喇、喎. Return ONLY valid JSON: {"primary":"<best translation>","alternatives":["<other natural variant>", "..."]}. For everyday questions (e.g. what are you doing?), prefer 2–3 natural spoken variants that differ in wording or particles. Do not repeat the primary. If none, use "alternatives": []. No markdown.';

    public static function openai_configured(): bool
    {
        return (bool) get_option('yue_openai_key');
    }

    /**
     * @return array{text:string,alternatives:array<int,string>,engine:string}|WP_Error
     */
    public static function translate(string $text, string $from, string $to, bool $include_alternatives = false)
    {
        $text = trim($text);
        if ($text === '') {
            return new WP_Error('yue_translate', 'text is required', ['status' => 400]);
        }
        if ($from === $to) {
            return ['text' => $text, 'alternatives' => [], 'engine' => 'identity'];
        }

        $want_alts = $include_alternatives && $from === 'en' && $to === 'yue';

        if (self::openai_configured()) {
            $out = self::openai($text, $from, $to, $want_alts);
            if (!is_wp_error($out)) {
                return $out;
            }
        }

        $demo = self::demo($text, $to, $want_alts);
        return [
            'text' => $demo['text'],
            'alternatives' => $demo['alternatives'],
            'engine' => 'demo',
        ];
    }

    /**
     * @return array{text:string,alternatives:array<int,string>}|WP_Error
     */
    private static function openai(string $text, string $from, string $to, bool $want_alts)
    {
        $key = (string) get_option('yue_openai_key');
        $model = (string) get_option('yue_openai_model', 'gpt-4o-mini');

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
            $direction = $from === 'en'
                ? 'English → Hong Kong Cantonese (Traditional, colloquial spoken)'
                : 'Hong Kong Cantonese → English';
            $body = [
                'model' => $model,
                'temperature' => 0.2,
                'messages' => [
                    ['role' => 'system', 'content' => self::SYSTEM],
                    ['role' => 'user', 'content' => "Direction: {$direction}\nText:\n{$text}"],
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
            return self::parse_yue_payload($raw, $text);
        }

        return ['text' => $raw, 'alternatives' => []];
    }

    /**
     * @return array{text:string,alternatives:array<int,string>}
     */
    private static function parse_yue_payload(string $raw, string $fallback): array
    {
        $cleaned = trim($raw);
        $cleaned = preg_replace('/^```(?:json)?\s*/i', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\s*```$/', '', $cleaned) ?? $cleaned;
        $parsed = json_decode(trim($cleaned), true);
        if (!is_array($parsed)) {
            return ['text' => trim($raw) !== '' ? trim($raw) : $fallback, 'alternatives' => []];
        }
        $primary = isset($parsed['primary']) && is_string($parsed['primary']) && trim($parsed['primary']) !== ''
            ? trim($parsed['primary'])
            : $fallback;
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
        return ['text' => $primary, 'alternatives' => $alts];
    }

    /**
     * @return array{text:string,alternatives:array<int,string>}
     */
    private static function demo(string $text, string $to, bool $want_alts): array
    {
        $map = [
            'hello' => ['text' => '你好', 'alternatives' => ['哈囉', '嗨']],
            'thank you' => ['text' => '唔該', 'alternatives' => ['多謝']],
            'thanks' => ['text' => '多謝', 'alternatives' => ['唔該']],
            'how are you' => ['text' => '你好嗎？', 'alternatives' => ['最近點呀']],
            'what are you doing' => [
                'text' => '你做緊咩呀？',
                'alternatives' => ['你而家做緊咩？', '做緊咩呀你？', '你喺度做緊乜嘢？'],
            ],
            "what's up" => ['text' => '點呀？', 'alternatives' => ['最近點？', '有咩事？']],
            'yes' => ['text' => '係', 'alternatives' => ['係呀']],
            'no' => ['text' => '唔係', 'alternatives' => ['唔係呀']],
            '你好' => ['text' => 'Hello', 'alternatives' => []],
            '多謝' => ['text' => 'Thank you', 'alternatives' => []],
            '唔該' => ['text' => 'Thanks', 'alternatives' => []],
            '你好嗎？' => ['text' => 'How are you?', 'alternatives' => []],
            '你做緊咩呀？' => ['text' => 'What are you doing?', 'alternatives' => []],
            '係' => ['text' => 'Yes', 'alternatives' => []],
            '唔係' => ['text' => 'No', 'alternatives' => []],
        ];
        $key = strtolower(trim($text));
        $key = preg_replace('/[?!.,;:。？！，、…]+$/u', '', $key) ?? $key;
        $key = preg_replace('/\s+/u', ' ', trim($key)) ?? $key;
        $hit = $map[$key] ?? $map[trim($text)] ?? null;
        if ($hit) {
            return [
                'text' => $hit['text'],
                'alternatives' => ($want_alts && $to === 'yue') ? $hit['alternatives'] : [],
            ];
        }
        return [
            'text' => $to === 'yue' ? "（示範）{$text}" : "(demo) {$text}",
            'alternatives' => [],
        ];
    }
}
