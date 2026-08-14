<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Yue_REST
{
    public static function init(): void
    {
        add_action('rest_api_init', [self::class, 'register']);
    }

    public static function register(): void
    {
        $routes = [
            ['/health', 'GET', 'health'],
            ['/entitlement', 'GET', 'entitlement'],
            ['/speech-token', 'GET', 'speech_token'],
            ['/translate', 'POST', 'translate'],
            ['/tts', 'POST', 'tts'],
            ['/usage/heartbeat', 'POST', 'heartbeat'],
        ];
        foreach ($routes as [$path, $method, $cb]) {
            register_rest_route('yue/v1', $path, [
                'methods' => $method,
                'permission_callback' => '__return_true',
                'callback' => [self::class, $cb],
            ]);
        }
    }

    public static function health(): WP_REST_Response
    {
        return new WP_REST_Response([
            'ok' => true,
            'product' => 'yue',
            'version' => YUE_TRANSLATOR_VERSION,
            'engines' => [
                'azureSpeech' => Yue_Azure::configured(),
                'openai' => Yue_Translate::openai_configured(),
                'demo' => !Yue_Translate::openai_configured(),
            ],
            'entitlement' => Yue_Entitlements::snapshot(),
        ], 200);
    }

    public static function entitlement(): WP_REST_Response
    {
        return new WP_REST_Response(Yue_Entitlements::snapshot(), 200);
    }

    public static function speech_token()
    {
        $gate = Yue_Entitlements::assert_can_live();
        if (is_wp_error($gate)) {
            return $gate;
        }
        $token = Yue_Azure::issue_speech_token();
        if (is_wp_error($token)) {
            return $token;
        }
        return new WP_REST_Response($token, 200);
    }

    public static function translate(WP_REST_Request $request)
    {
        $snap = Yue_Entitlements::snapshot();
        if (empty($snap['allowed']['textTranslate'])) {
            return new WP_Error('yue_entitlement', 'Translation not allowed', ['status' => 402]);
        }
        $text = (string) $request->get_param('text');
        $from = $request->get_param('from') === 'yue' ? 'yue' : 'en';
        $to = $request->get_param('to') === 'yue' ? 'yue' : 'en';
        $include_alternatives = (bool) $request->get_param('includeAlternatives');
        $result = Yue_Translate::translate($text, $from, $to, $include_alternatives);
        if (is_wp_error($result)) {
            return $result;
        }
        Yue_Usage::add_translate(Yue_Entitlements::current_user_id() ?: null);
        return new WP_REST_Response($result + ['from' => $from, 'to' => $to], 200);
    }

    public static function tts(WP_REST_Request $request)
    {
        $gate = Yue_Entitlements::assert_can_tts();
        if (is_wp_error($gate)) {
            return $gate;
        }
        $text = trim((string) $request->get_param('text'));
        $lang = $request->get_param('lang') === 'yue' ? 'yue' : 'en';
        if ($text === '') {
            return new WP_Error('yue_tts', 'text is required', ['status' => 400]);
        }
        $audio = Yue_Azure::synthesize($text, $lang);
        if (is_wp_error($audio)) {
            return $audio;
        }
        $user_id = Yue_Entitlements::current_user_id() ?: null;
        Yue_Usage::add_tts_chars($user_id, strlen($text));
        return new WP_HTTP_Response($audio['body'], 200, [
            'Content-Type' => $audio['contentType'],
            'Cache-Control' => 'no-store',
        ]);
    }

    public static function heartbeat(WP_REST_Request $request)
    {
        $gate = Yue_Entitlements::assert_can_live();
        if (is_wp_error($gate)) {
            return $gate;
        }
        $seconds = (int) $request->get_param('seconds');
        if ($seconds <= 0) {
            $seconds = 15;
        }
        $user_id = Yue_Entitlements::current_user_id() ?: null;
        Yue_Usage::add_live_seconds($user_id, $seconds);
        return new WP_REST_Response(Yue_Entitlements::snapshot($user_id), 200);
    }
}
