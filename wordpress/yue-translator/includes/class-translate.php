<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Yue_Translate
{
    private const SYSTEM = 'You are an expert Hong Kong Cantonese ↔ English translator for live conversation. When translating TO Cantonese use spoken Hong Kong 粵語 with Traditional Chinese characters (係、唔、喺、咗、緊、啲、嘅). When translating TO English use natural conversational English. Return ONLY the translation.';

    public static function openai_configured(): bool
    {
        return (bool) get_option('yue_openai_key');
    }

    /** @return array{text:string,engine:string}|WP_Error */
    public static function translate(string $text, string $from, string $to)
    {
        $text = trim($text);
        if ($text === '') {
            return new WP_Error('yue_translate', 'text is required', ['status' => 400]);
        }
        if ($from === $to) {
            return ['text' => $text, 'engine' => 'identity'];
        }

        if (self::openai_configured()) {
            $out = self::openai($text, $from, $to);
            if (!is_wp_error($out)) {
                return ['text' => $out, 'engine' => 'openai'];
            }
        }

        return ['text' => self::demo($text, $to), 'engine' => 'demo'];
    }

    /** @return string|WP_Error */
    private static function openai(string $text, string $from, string $to)
    {
        $key = (string) get_option('yue_openai_key');
        $model = (string) get_option('yue_openai_model', 'gpt-4o-mini');
        $direction = $from === 'en'
            ? 'English → Hong Kong Cantonese (Traditional, colloquial spoken)'
            : 'Hong Kong Cantonese → English';

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
                    ['role' => 'system', 'content' => self::SYSTEM],
                    ['role' => 'user', 'content' => "Direction: {$direction}\nText:\n{$text}"],
                ],
            ]),
        ]);
        if (is_wp_error($response)) {
            return $response;
        }
        $data = json_decode(wp_remote_retrieve_body($response), true);
        $out = trim((string) ($data['choices'][0]['message']['content'] ?? ''));
        if ($out === '') {
            return new WP_Error('yue_translate', 'Empty OpenAI response', ['status' => 502]);
        }
        return $out;
    }

    private static function demo(string $text, string $to): string
    {
        $map = [
            'hello' => '你好',
            'thank you' => '多謝',
            'thanks' => '唔該',
            'how are you' => '你好嗎？',
            'yes' => '係',
            'no' => '唔係',
            '你好' => 'Hello',
            '多謝' => 'Thank you',
            '唔該' => 'Thanks',
            '你好嗎？' => 'How are you?',
            '係' => 'Yes',
            '唔係' => 'No',
        ];
        $key = strtolower(trim($text));
        if (isset($map[$key])) {
            return $map[$key];
        }
        if (isset($map[trim($text)])) {
            return $map[trim($text)];
        }
        return $to === 'yue' ? "（示範）{$text}" : "(demo) {$text}";
    }
}
