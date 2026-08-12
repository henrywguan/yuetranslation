<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Yue_Azure
{
    public static function configured(): bool
    {
        return (bool) get_option('yue_azure_speech_key') && (bool) get_option('yue_azure_speech_region');
    }

    /** @return array|WP_Error */
    public static function issue_speech_token()
    {
        if (!self::configured()) {
            return new WP_Error('yue_azure', 'Azure Speech is not configured', ['status' => 503]);
        }
        $key = (string) get_option('yue_azure_speech_key');
        $region = (string) get_option('yue_azure_speech_region', 'eastasia');
        $response = wp_remote_post("https://{$region}.api.cognitive.microsoft.com/sts/v1.0/issueToken", [
            'headers' => [
                'Ocp-Apim-Subscription-Key' => $key,
                'Content-Length' => '0',
            ],
            'timeout' => 15,
        ]);
        if (is_wp_error($response)) {
            return $response;
        }
        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        if ($code < 200 || $code >= 300) {
            return new WP_Error('yue_azure', 'Failed to issue speech token', ['status' => 502, 'detail' => $body]);
        }
        return [
            'token' => $body,
            'region' => $region,
            'expiresIn' => 540,
        ];
    }

    /** @return array|WP_Error binary body + content-type via WP_HTTP_Response later */
    public static function synthesize(string $text, string $lang)
    {
        if (!self::configured()) {
            return new WP_Error('yue_azure', 'Azure Speech is not configured', ['status' => 503]);
        }
        $key = (string) get_option('yue_azure_speech_key');
        $region = (string) get_option('yue_azure_speech_region', 'eastasia');
        $voice = $lang === 'yue' ? 'zh-HK-HiuMaanNeural' : 'en-US-JennyNeural';
        $xml_lang = $lang === 'yue' ? 'zh-HK' : 'en-US';
        $ssml = '<speak version="1.0" xml:lang="' . esc_attr($xml_lang) . '">'
            . '<voice name="' . esc_attr($voice) . '">' . htmlspecialchars($text, ENT_XML1) . '</voice></speak>';

        $response = wp_remote_post("https://{$region}.tts.speech.microsoft.com/cognitiveservices/v1", [
            'headers' => [
                'Ocp-Apim-Subscription-Key' => $key,
                'Content-Type' => 'application/ssml+xml',
                'X-Microsoft-OutputFormat' => 'audio-16khz-128kbitrate-mono-mp3',
            ],
            'body' => $ssml,
            'timeout' => 30,
        ]);
        if (is_wp_error($response)) {
            return $response;
        }
        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        if ($code < 200 || $code >= 300) {
            return new WP_Error('yue_azure', 'TTS failed', ['status' => 502, 'detail' => $body]);
        }
        return [
            'body' => $body,
            'contentType' => 'audio/mpeg',
        ];
    }
}
