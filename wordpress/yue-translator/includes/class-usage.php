<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Yue_Usage
{
    public static function month_key(): string
    {
        return gmdate('Y_m');
    }

    public static function meta_key(?string $month = null): string
    {
        return 'yue_usage_' . ($month ?: self::month_key());
    }

    public static function empty_usage(): array
    {
        return [
            'month' => self::month_key(),
            'liveSeconds' => 0,
            'ttsChars' => 0,
            'translateCount' => 0,
            'cameraSeconds' => 0,
            'cameraTranslateCount' => 0,
        ];
    }

    public static function for_user(?int $user_id): array
    {
        if (!$user_id) {
            // Guest usage tracked by transient IP hash when allowed
            return self::for_guest();
        }
        $raw = get_user_meta($user_id, self::meta_key(), true);
        if (!is_array($raw)) {
            return self::empty_usage();
        }
        return [
            'month' => self::month_key(),
            'liveSeconds' => (int) ($raw['liveSeconds'] ?? 0),
            'ttsChars' => (int) ($raw['ttsChars'] ?? 0),
            'translateCount' => (int) ($raw['translateCount'] ?? 0),
            'cameraSeconds' => (int) ($raw['cameraSeconds'] ?? 0),
            'cameraTranslateCount' => (int) ($raw['cameraTranslateCount'] ?? 0),
        ];
    }

    private static function guest_key(): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        return 'yue_guest_' . md5($ip . '|' . self::month_key());
    }

    public static function for_guest(): array
    {
        $raw = get_transient(self::guest_key());
        if (!is_array($raw)) {
            return self::empty_usage();
        }
        return [
            'month' => self::month_key(),
            'liveSeconds' => (int) ($raw['liveSeconds'] ?? 0),
            'ttsChars' => (int) ($raw['ttsChars'] ?? 0),
            'translateCount' => (int) ($raw['translateCount'] ?? 0),
            'cameraSeconds' => (int) ($raw['cameraSeconds'] ?? 0),
            'cameraTranslateCount' => (int) ($raw['cameraTranslateCount'] ?? 0),
        ];
    }

    public static function add_live_seconds(?int $user_id, int $seconds): array
    {
        $seconds = max(0, min(300, $seconds)); // clamp heartbeat chunk
        if ($seconds <= 0) {
            return self::for_user($user_id);
        }
        if (!$user_id) {
            $usage = self::for_guest();
            $usage['liveSeconds'] += $seconds;
            set_transient(self::guest_key(), $usage, MONTH_IN_SECONDS);
            return $usage;
        }
        $usage = self::for_user($user_id);
        $usage['liveSeconds'] += $seconds;
        update_user_meta($user_id, self::meta_key(), $usage);
        return $usage;
    }

    public static function add_tts_chars(?int $user_id, int $chars): array
    {
        $chars = max(0, $chars);
        if (!$user_id) {
            $usage = self::for_guest();
            $usage['ttsChars'] += $chars;
            set_transient(self::guest_key(), $usage, MONTH_IN_SECONDS);
            return $usage;
        }
        $usage = self::for_user($user_id);
        $usage['ttsChars'] += $chars;
        update_user_meta($user_id, self::meta_key(), $usage);
        return $usage;
    }

    public static function add_translate(?int $user_id): void
    {
        if (!$user_id) {
            $usage = self::for_guest();
            $usage['translateCount'] += 1;
            set_transient(self::guest_key(), $usage, MONTH_IN_SECONDS);
            return;
        }
        $usage = self::for_user($user_id);
        $usage['translateCount'] += 1;
        update_user_meta($user_id, self::meta_key(), $usage);
    }
}
