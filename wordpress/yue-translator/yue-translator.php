<?php
/**
 * Plugin Name: Yue Translator
 * Description: English ↔ Cantonese live translator PWA with freemium entitlements, Azure Speech, and OpenAI translation for Bluehost/WordPress launch.
 * Version: 2.0.0
 * Author: Yue
 * Text Domain: yue-translator
 */

if (!defined('ABSPATH')) {
    exit;
}

define('YUE_TRANSLATOR_VERSION', '2.0.0');
define('YUE_TRANSLATOR_PATH', plugin_dir_path(__FILE__));
define('YUE_TRANSLATOR_URL', plugin_dir_url(__FILE__));

require_once YUE_TRANSLATOR_PATH . 'includes/class-settings.php';
require_once YUE_TRANSLATOR_PATH . 'includes/class-entitlements.php';
require_once YUE_TRANSLATOR_PATH . 'includes/class-usage.php';
require_once YUE_TRANSLATOR_PATH . 'includes/class-azure.php';
require_once YUE_TRANSLATOR_PATH . 'includes/class-translate.php';
require_once YUE_TRANSLATOR_PATH . 'includes/class-rest.php';

final class Yue_Translator_Plugin
{
    public static function init(): void
    {
        Yue_Settings::init();
        Yue_REST::init();
        add_shortcode('yue_translator', [self::class, 'render_translator_shortcode']);
        add_shortcode('yue_splash', [self::class, 'render_splash_shortcode']);
        add_action('show_user_profile', [self::class, 'user_plan_field']);
        add_action('edit_user_profile', [self::class, 'user_plan_field']);
        add_action('personal_options_update', [self::class, 'save_user_plan_field']);
        add_action('edit_user_profile_update', [self::class, 'save_user_plan_field']);
    }

    /** Phone-sized translator embed. Forces view=app so marketing routes stay out of this shell. */
    public static function render_translator_shortcode(): string
    {
        $src = self::app_iframe_src(['view' => 'app']);
        if ($src === '') {
            return self::missing_app_notice();
        }

        return '<div class="yue-translator-embed" style="position:relative;width:100%;max-width:480px;margin:0 auto;height:min(86vh,820px);border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25)">'
            . '<iframe title="Yue Translator" src="' . esc_url($src) . '" style="border:0;width:100%;height:100%;" allow="microphone; autoplay" loading="lazy"></iframe>'
            . '</div>';
    }

    /** Full-bleed marketing landing (and in-iframe #/pricing / #/app navigation). */
    public static function render_splash_shortcode(): string
    {
        $src = self::app_iframe_src(['view' => 'home']);
        if ($src === '') {
            return self::missing_app_notice();
        }

        return '<div class="yue-splash-embed" style="position:relative;width:100%;min-height:100vh;margin:0;overflow:hidden">'
            . '<iframe title="Yue" src="' . esc_url($src) . '" style="border:0;width:100%;min-height:100vh;height:100vh;" allow="microphone; autoplay" loading="lazy"></iframe>'
            . '</div>';
    }

    /** @param array<string, string> $extra_query */
    private static function app_iframe_src(array $extra_query = []): string
    {
        $app_index = YUE_TRANSLATOR_PATH . 'app/index.html';
        if (!file_exists($app_index)) {
            return '';
        }

        $api_base = esc_url_raw(rest_url('yue/v1'));
        $upgrade = esc_url((string) get_option('yue_upgrade_url', ''));
        $nonce = wp_create_nonce('wp_rest');

        $query = array_merge(
            [
                'api' => $api_base,
                'nonce' => $nonce,
            ],
            $extra_query
        );
        if ($upgrade) {
            $query['upgrade'] = $upgrade;
        }

        return YUE_TRANSLATOR_URL . 'app/index.html?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }

    private static function missing_app_notice(): string
    {
        return '<div class="yue-translator-missing"><p>Yue app build missing. Run <code>npm run build:web:wp</code> and keep files in <code>app/</code>.</p></div>';
    }

    public static function user_plan_field(WP_User $user): void
    {
        if (!current_user_can('edit_users')) {
            return;
        }
        $plan = get_user_meta($user->ID, 'yue_plan', true) ?: 'free';
        ?>
        <h2>Yue Translator</h2>
        <table class="form-table" role="presentation">
            <tr>
                <th><label for="yue_plan">Plan</label></th>
                <td>
                    <select name="yue_plan" id="yue_plan">
                        <option value="free" <?php selected($plan, 'free'); ?>>Free</option>
                        <option value="pro" <?php selected($plan, 'pro'); ?>>Pro</option>
                    </select>
                    <p class="description">Membership plugins can also set this via the <code>yue_user_plan</code> filter or <code>yue_pro</code> capability.</p>
                </td>
            </tr>
        </table>
        <?php
    }

    public static function save_user_plan_field(int $user_id): void
    {
        if (!current_user_can('edit_users')) {
            return;
        }
        if (!isset($_POST['yue_plan'])) {
            return;
        }
        $plan = sanitize_text_field(wp_unslash($_POST['yue_plan']));
        if (!in_array($plan, ['free', 'pro'], true)) {
            $plan = 'free';
        }
        update_user_meta($user_id, 'yue_plan', $plan);
    }
}

Yue_Translator_Plugin::init();
