<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Yue_Settings
{
    public static function init(): void
    {
        add_action('admin_menu', [self::class, 'admin_menu']);
        add_action('admin_init', [self::class, 'capture_unchecked_boxes'], 1);
        add_action('admin_init', [self::class, 'register']);
    }

    public static function admin_menu(): void
    {
        add_options_page('JyutTranslate', 'JyutTranslate', 'manage_options', 'yue-translator', [self::class, 'render']);
    }

    /** Unchecked checkboxes are omitted from POST — force false. */
    public static function sanitize_checkbox($value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    public static function register(): void
    {
        $fields = [
            'yue_azure_speech_key' => 'sanitize_text_field',
            'yue_azure_speech_region' => 'sanitize_text_field',
            'yue_openai_key' => 'sanitize_text_field',
            'yue_openai_model' => 'sanitize_text_field',
            'yue_upgrade_url' => 'esc_url_raw',
            'yue_require_login' => [self::class, 'sanitize_checkbox'],
            'yue_free_live_minutes' => 'absint',
            'yue_pro_live_minutes' => 'absint',
            'yue_free_tts_chars' => 'absint',
            'yue_pro_tts_chars' => 'absint',
            'yue_free_auto_speak' => [self::class, 'sanitize_checkbox'],
            'yue_pro_auto_speak' => [self::class, 'sanitize_checkbox'],
            'yue_guest_live_minutes' => 'absint',
        ];
        foreach ($fields as $name => $cb) {
            register_setting('yue_translator', $name, [
                'sanitize_callback' => $cb,
                'default' => self::defaults()[$name] ?? null,
            ]);
        }
    }

    public static function capture_unchecked_boxes(): void
    {
        if (!isset($_POST['option_page']) || $_POST['option_page'] !== 'yue_translator') {
            return;
        }
        if (!current_user_can('manage_options')) {
            return;
        }
        foreach (['yue_require_login', 'yue_free_auto_speak', 'yue_pro_auto_speak'] as $key) {
            if (!isset($_POST[$key])) {
                $_POST[$key] = '0';
            }
        }
    }

    public static function defaults(): array
    {
        return [
            'yue_azure_speech_key' => '',
            'yue_azure_speech_region' => 'eastasia',
            'yue_openai_key' => '',
            'yue_openai_model' => 'gpt-4o-mini',
            'yue_upgrade_url' => '',
            'yue_require_login' => true,
            'yue_free_live_minutes' => 5,
            'yue_pro_live_minutes' => 20,
            'yue_free_tts_chars' => 30000,
            'yue_pro_tts_chars' => 200000,
            'yue_free_auto_speak' => false,
            'yue_pro_auto_speak' => true,
            'yue_guest_live_minutes' => 0,
        ];
    }

    public static function render(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
            <h1>JyutTranslate</h1>
            <p>Bluehost launch stack: Azure Speech (STT/TTS) + OpenAI (Cantonese MT) + freemium entitlements. Shortcodes: <code>[yue_translator]</code> (app), <code>[yue_splash]</code> (marketing).</p>
            <form method="post" action="options.php">
                <?php settings_fields('yue_translator'); ?>
                <h2>Cloud APIs</h2>
                <table class="form-table" role="presentation">
                    <tr>
                        <th>Azure Speech Key</th>
                        <td><input class="regular-text" type="password" name="yue_azure_speech_key" value="<?php echo esc_attr(get_option('yue_azure_speech_key', '')); ?>" autocomplete="off" /></td>
                    </tr>
                    <tr>
                        <th>Azure Speech Region</th>
                        <td><input class="regular-text" type="text" name="yue_azure_speech_region" value="<?php echo esc_attr(get_option('yue_azure_speech_region', 'eastasia')); ?>" placeholder="eastasia" /></td>
                    </tr>
                    <tr>
                        <th>OpenAI API Key</th>
                        <td><input class="regular-text" type="password" name="yue_openai_key" value="<?php echo esc_attr(get_option('yue_openai_key', '')); ?>" autocomplete="off" /></td>
                    </tr>
                    <tr>
                        <th>OpenAI Model</th>
                        <td><input class="regular-text" type="text" name="yue_openai_model" value="<?php echo esc_attr(get_option('yue_openai_model', 'gpt-4o-mini')); ?>" /></td>
                    </tr>
                </table>

                <h2>Plans &amp; limits</h2>
                <table class="form-table" role="presentation">
                    <tr>
                        <th>Require login for live mic</th>
                        <td><label><input type="checkbox" name="yue_require_login" value="1" <?php checked((bool) get_option('yue_require_login', true)); ?> /> Guests cannot start live speech (recommended for paid launch).</label></td>
                    </tr>
                    <tr>
                        <th>Guest live minutes / month</th>
                        <td><input type="number" min="0" name="yue_guest_live_minutes" value="<?php echo esc_attr((string) get_option('yue_guest_live_minutes', 0)); ?>" /> <span class="description">Only used if login is not required.</span></td>
                    </tr>
                    <tr>
                        <th>Free live minutes / month</th>
                        <td><input type="number" min="0" name="yue_free_live_minutes" value="<?php echo esc_attr((string) get_option('yue_free_live_minutes', 5)); ?>" /></td>
                    </tr>
                    <tr>
                        <th>Pro live minutes / month</th>
                        <td><input type="number" min="0" name="yue_pro_live_minutes" value="<?php echo esc_attr((string) get_option('yue_pro_live_minutes', 20)); ?>" /></td>
                    </tr>
                    <tr>
                        <th>Free TTS characters / month</th>
                        <td><input type="number" min="0" name="yue_free_tts_chars" value="<?php echo esc_attr((string) get_option('yue_free_tts_chars', 30000)); ?>" /> <span class="description">Hard monthly cap for Free tap-to-play. Guests can still try voice without an account (unmetered).</span></td>
                    </tr>
                    <tr>
                        <th>Pro TTS characters / month</th>
                        <td><input type="number" min="0" name="yue_pro_tts_chars" value="<?php echo esc_attr((string) get_option('yue_pro_tts_chars', 200000)); ?>" /> <span class="description">Legacy setting — Pro TTS is unlimited; usage is still tracked for the account hub.</span></td>
                    </tr>
                    <tr>
                        <th>Free auto-speak</th>
                        <td><label><input type="checkbox" name="yue_free_auto_speak" value="1" <?php checked((bool) get_option('yue_free_auto_speak', false)); ?> /></label></td>
                    </tr>
                    <tr>
                        <th>Pro auto-speak</th>
                        <td><label><input type="checkbox" name="yue_pro_auto_speak" value="1" <?php checked((bool) get_option('yue_pro_auto_speak', true)); ?> /></label></td>
                    </tr>
                    <tr>
                        <th>Upgrade URL</th>
                        <td><input class="regular-text" type="url" name="yue_upgrade_url" value="<?php echo esc_attr((string) get_option('yue_upgrade_url', '')); ?>" placeholder="https://yoursite.com/pricing" /></td>
                    </tr>
                </table>
                <?php submit_button('Save settings'); ?>
            </form>

            <hr />
            <h2>Entitlement checks (runtime)</h2>
            <ol>
                <li><code>GET /wp-json/yue/v1/health</code> — engines + entitlement snapshot</li>
                <li><code>GET /speech-token</code> — gated by <code>assert_can_live()</code></li>
                <li><code>POST /usage/heartbeat</code> — meters live seconds every ~15s; stops when exhausted</li>
                <li><code>POST /tts</code> — Free: char quota; Pro: unlimited (usage still counted); guests: allowed without login</li>
                <li><code>POST /translate</code> — text path (Jyutping stays client-side / free)</li>
            </ol>

            <h2>Membership plugin wiring</h2>
            <pre style="background:#fff;padding:12px;border:1px solid #ccd0d4;">add_filter('yue_user_plan', function ($plan, $user_id) {
    // MemberPress example:
    // if (current_user_can('mepr-active', 'membership_id_here')) return 'pro';
    return $plan;
}, 10, 2);</pre>
            <p>Or grant users the <code>yue_pro</code> capability, or set user meta <code>yue_plan</code> to <code>pro</code>.</p>
        </div>
        <?php
    }
}
