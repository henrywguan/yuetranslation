<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Freemium entitlements for Yue.
 *
 * Resolution order for plan:
 * 1) capability `yue_pro` (or `manage_options`) => pro
 * 2) user meta `yue_plan` (free|pro)
 * 3) filter `yue_user_plan` (last — can override)
 * 4) default free (or guest)
 */
final class Yue_Entitlements
{
    public static function current_user_id(): int
    {
        return get_current_user_id();
    }

    public static function plan_for_user(?int $user_id = null): string
    {
        $user_id = $user_id ?? self::current_user_id();
        if (!$user_id) {
            return 'guest';
        }

        $plan = 'free';
        if (user_can($user_id, 'yue_pro') || user_can($user_id, 'manage_options')) {
            $plan = 'pro';
        }

        $meta = get_user_meta($user_id, 'yue_plan', true);
        if (in_array($meta, ['free', 'pro'], true)) {
            $plan = $meta;
        }

        /** @var string $plan */
        $plan = apply_filters('yue_user_plan', $plan, $user_id);
        return in_array($plan, ['free', 'pro', 'guest'], true) ? $plan : 'free';
    }

    public static function limits_for_plan(string $plan): array
    {
        if ($plan === 'pro') {
            return [
                'plan' => 'pro',
                'live_minutes' => (int) get_option('yue_pro_live_minutes', 600),
                'tts_chars' => (int) get_option('yue_pro_tts_chars', 200000),
                'auto_speak' => (bool) get_option('yue_pro_auto_speak', true),
                'can_live' => true,
                'text_translate' => true,
            ];
        }
        if ($plan === 'guest') {
            $mins = (int) get_option('yue_guest_live_minutes', 0);
            return [
                'plan' => 'guest',
                'live_minutes' => $mins,
                'tts_chars' => 0,
                'auto_speak' => false,
                'can_live' => $mins > 0 && !get_option('yue_require_login', true),
                'text_translate' => true,
            ];
        }
        return [
            'plan' => 'free',
            'live_minutes' => (int) get_option('yue_free_live_minutes', 20),
            'tts_chars' => (int) get_option('yue_free_tts_chars', 0),
            'auto_speak' => (bool) get_option('yue_free_auto_speak', false),
            'can_live' => true,
            'text_translate' => true,
        ];
    }

    public static function snapshot(?int $user_id = null): array
    {
        $user_id = $user_id ?? self::current_user_id();
        $require_login = (bool) get_option('yue_require_login', true);
        $logged_in = (bool) $user_id;

        if ($require_login && !$logged_in) {
            $limits = self::limits_for_plan('guest');
            $limits['can_live'] = false;
            return [
                'loggedIn' => false,
                'requireLogin' => true,
                'plan' => 'guest',
                'limits' => $limits,
                'usage' => Yue_Usage::empty_usage(),
                'remaining' => [
                    'liveSeconds' => 0,
                    'ttsChars' => 0,
                ],
                'upgradeUrl' => (string) get_option('yue_upgrade_url', ''),
                'loginUrl' => wp_login_url(get_permalink() ?: home_url('/')),
                'allowed' => [
                    'live' => false,
                    'autoSpeak' => false,
                    'textTranslate' => true,
                    'tts' => false,
                ],
                'reason' => 'login_required',
            ];
        }

        $plan = $logged_in ? self::plan_for_user($user_id) : 'guest';
        $limits = self::limits_for_plan($plan);
        $usage = Yue_Usage::for_user($user_id);
        $live_limit = max(0, $limits['live_minutes']) * 60;
        $tts_limit = max(0, $limits['tts_chars']);
        $live_remaining = max(0, $live_limit - (int) $usage['liveSeconds']);
        $tts_remaining = max(0, $tts_limit - (int) $usage['ttsChars']);

        $can_live = !empty($limits['can_live']) && $live_remaining > 0;
        $can_tts = !empty($limits['auto_speak']) && $tts_remaining > 0;

        return [
            'loggedIn' => $logged_in,
            'requireLogin' => $require_login,
            'plan' => $plan,
            'limits' => $limits,
            'usage' => $usage,
            'remaining' => [
                'liveSeconds' => $live_remaining,
                'ttsChars' => $tts_remaining,
            ],
            'upgradeUrl' => (string) get_option('yue_upgrade_url', ''),
            'loginUrl' => wp_login_url(get_permalink() ?: home_url('/')),
            'allowed' => [
                'live' => $can_live,
                'autoSpeak' => $can_tts,
                'textTranslate' => !empty($limits['text_translate']),
                'tts' => $can_tts,
            ],
            'reason' => !$can_live ? ($live_limit <= 0 ? 'no_live_quota' : 'live_quota_exhausted') : null,
        ];
    }

    /** @return true|WP_Error */
    public static function assert_can_live(?int $user_id = null)
    {
        $snap = self::snapshot($user_id);
        if (empty($snap['allowed']['live'])) {
            return new WP_Error(
                'yue_entitlement',
                $snap['reason'] === 'login_required'
                    ? 'Please log in to use live translation.'
                    : 'Live minutes exhausted for this month. Upgrade for more.',
                ['status' => $snap['reason'] === 'login_required' ? 401 : 402, 'entitlement' => $snap]
            );
        }
        return true;
    }

    /** @return true|WP_Error */
    public static function assert_can_tts(?int $user_id = null)
    {
        $snap = self::snapshot($user_id);
        if (empty($snap['allowed']['tts'])) {
            return new WP_Error(
                'yue_entitlement',
                'Text-to-speech is not available on your plan or TTS quota is exhausted.',
                ['status' => 402, 'entitlement' => $snap]
            );
        }
        return true;
    }
}
