<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Yue_Translate
{
    private const SYSTEM_YUE = 'You are an expert Hong Kong Cantonese translator for live conversation. Translate TO spoken Hong Kong 粵語 with Traditional Chinese characters (係、唔、喺、咗、緊、啲、嘅). Return ONLY valid JSON: {"translation":"<Cantonese>","definition":"<short English gloss of what it means>"}. The definition helps learners — brief, clear English.';

    private const SYSTEM_EN = 'You are an expert Hong Kong Cantonese translator for live conversation. Translate TO natural conversational English. Return ONLY valid JSON: {"translation":"<English>","definition":""}.';

    public static function openai_configured(): bool
    {
        return (bool) get_option('yue_openai_key');
    }

    /** @return array{text:string,definition?:string,engine:string}|WP_Error */
    public static function translate(string $text, string $from, string $to)
    {
        $text = trim($text);
        if ($text === '') {
            return new WP_Error('yue_translate', 'text is required', ['status' => 400]);
        }
        if ($from === $to) {
            return ['text' => $text, 'definition' => '', 'engine' => 'identity'];
        }

        if (self::openai_configured()) {
            $out = self::openai($text, $from, $to);
            if (!is_wp_error($out)) {
                return $out;
            }
        }

        $demo = self::demo($text, $from, $to);
        return [
            'text' => $demo['text'],
            'definition' => $demo['definition'],
            'engine' => 'demo',
        ];
    }

    /** @return array{text:string,definition:string}|WP_Error */
    private static function openai(string $text, string $from, string $to)
    {
        $key = (string) get_option('yue_openai_key');
        $model = (string) get_option('yue_openai_model', 'gpt-4o-mini');
        $system = $to === 'yue' ? self::SYSTEM_YUE : self::SYSTEM_EN;
        $fallback_def = $from === 'en' ? $text : '';

        $response = wp_remote_post('https://api.openai.com/v1/chat/completions', [
            'headers' => [
                'Authorization' => 'Bearer ' . $key,
                'Content-Type' => 'application/json',
            ],
            'timeout' => 30,
            'body' => wp_json_encode([
                'model' => $model,
                'temperature' => 0.2,
                'messages' => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user', 'content' => $text],
                ],
            ]),
        ]);
        if (is_wp_error($response)) {
            return $response;
        }
        $data = json_decode(wp_remote_retrieve_body($response), true);
        $raw = trim((string) ($data['choices'][0]['message']['content'] ?? ''));
        if ($raw === '') {
            return new WP_Error('yue_translate', 'Empty OpenAI response', ['status' => 502]);
        }

        $parsed = self::parse_json_payload($raw, $text, $fallback_def);
        return [
            'text' => $parsed['text'],
            'definition' => $to === 'yue' ? ($parsed['definition'] ?: $fallback_def) : $parsed['definition'],
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

    /** @return array{text:string,definition:string} */
    private static function demo(string $text, string $from, string $to): array
    {
        $map = [
            'hello' => ['你好', 'hello; hi (greeting)'],
            'hi' => ['嗨', 'hi; hey'],
            'thank you' => ['唔該', 'thank you (for a service / favor)'],
            'thanks' => ['多謝', 'thanks; many thanks'],
            'good morning' => ['早晨', 'good morning'],
            'how are you' => ['你好嗎', 'how are you?'],
            'where is the mtr' => ['地鐵喺邊度', 'where is the MTR / subway?'],
            'how much is this' => ['呢個幾錢', 'how much is this?'],
            'yes' => ['係', 'yes'],
            'no' => ['唔係', 'no'],
            '你好' => ['Hello', 'hello; hi'],
            '多謝' => ['Thank you', 'thank you'],
            '唔該' => ['Thanks', 'thanks'],
            '早晨' => ['Good morning', 'good morning'],
            '你好嗎？' => ['How are you?', 'how are you?'],
            '地鐵喺邊度' => ['Where is the MTR?', 'where is the MTR?'],
            '呢個幾錢' => ['How much is this?', 'how much is this?'],
            '係' => ['Yes', 'yes'],
            '唔係' => ['No', 'no'],
        ];
        $key = strtolower(trim($text));
        $hit = $map[$key] ?? $map[trim($text)] ?? null;
        if ($hit) {
            return [
                'text' => $hit[0],
                'definition' => $to === 'yue' ? $hit[1] : ($hit[1] ?? ''),
            ];
        }
        return [
            'text' => $to === 'yue' ? "（示範）{$text}" : "(demo) {$text}",
            'definition' => $from === 'en' && $to === 'yue' ? $text : '',
        ];
    }
}
