<?php

/*
|--------------------------------------------------------------------------
| BISMARK ERP Configuration
|--------------------------------------------------------------------------
|
| This file contains all project-specific configuration.
| Architecture Laws (ADR-015 to ADR-018) are enforced via these settings.
|
*/

return [

    /*
    |--------------------------------------------------------------------------
    | Default Tenant
    |--------------------------------------------------------------------------
    | In V1, only one tenant is active (Bismark itself).
    | Multi-tenant architecture is ready but single-tenant in V1 (ADR-003).
    */
    'default_tenant_id' => env('BISMARK_DEFAULT_TENANT_ID'),
    'default_tenant_slug' => env('BISMARK_DEFAULT_TENANT_SLUG', 'bismark'),

    /*
    |--------------------------------------------------------------------------
    | Authentication (ADR-009, ADR-010, ADR-011)
    |--------------------------------------------------------------------------
    */
    'auth' => [
        'access_token_ttl' => 15 * 60,                    // 15 minutes
        'refresh_token_ttl' => 14 * 24 * 60 * 60,         // 14 days
        'jwt_issuer' => 'BISMARK ERP',
        'jwt_algorithm' => 'HS256',

        'session' => [
            'max_concurrent' => 3,                         // ADR-009: max 3 sessions
            'idle_timeout' => 30 * 60,                     // 30 minutes
            'absolute_timeout' => 8 * 60 * 60,             // 8 hours
        ],

        // ADR-010: Strong password + 2FA + Lockout (NO expiration)
        'password' => [
            'min_length' => 12,
            'require_uppercase' => true,
            'require_lowercase' => true,
            'require_digit' => true,
            'require_symbol' => true,
            'history_count' => 5,                          // prevent reuse of last 5
            'expire_days' => 0,                            // 0 = NO forced expiration (ADR-010)
        ],

        // ADR-011: 2FA methods
        'two_factor' => [
            'methods' => ['totp', 'sms'],
            'totp_issuer' => 'Bismark ERP',
            'backup_codes_count' => 8,
        ],

        'brute_force' => [
            'max_attempts' => 5,
            'lockout_minutes' => 15,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting Tiers
    |--------------------------------------------------------------------------
    */
    'rate_limits' => [
        'auth' => ['limit' => 5, 'window' => 60],          // /auth/login, /auth/forgot-password
        'sensitive' => ['limit' => 10, 'window' => 60],    // /auth/2fa/verify, /users/*/lock
        'authenticated' => ['limit' => 300, 'window' => 60],
        'public' => ['limit' => 60, 'window' => 60],       // /health, /version
    ],

    /*
    |--------------------------------------------------------------------------
    | Audit (ADR-007: 12 months online + unlimited archive)
    |--------------------------------------------------------------------------
    */
    'audit' => [
        'retention_configurable' => true,                  // NOT hardcoded — read from DB
        'default_online_months' => 12,
        'default_archive_months' => null,                  // null = permanent archive (ADR-007)
        'partition_automation' => env('BISMARK_AUDIT_PARTITION_AUTO', true),
        'partition_cron' => '0 0 25 * *',                  // 25th of each month, create next month's partition
    ],

    /*
    |--------------------------------------------------------------------------
    | File Management (ADR-008: Interface-based backends)
    |--------------------------------------------------------------------------
    */
    'file' => [
        'default_backend' => env('FILE_BACKEND', 'local'),
        'backends' => [
            'local' => [
                'root' => storage_path('app/bismark'),
                'url' => env('FILE_LOCAL_URL'),
            ],
            's3' => [
                'key' => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
                'region' => env('AWS_DEFAULT_REGION'),
                'bucket' => env('AWS_BUCKET'),
            ],
            'minio' => [
                'endpoint' => env('MINIO_ENDPOINT'),
                'key' => env('MINIO_KEY'),
                'secret' => env('MINIO_SECRET'),
                'bucket' => env('MINIO_BUCKET'),
                'use_path_style' => true,
            ],
            'azure_blob' => [
                'connection_string' => env('AZURE_STORAGE_CONNECTION_STRING'),
                'container' => env('AZURE_STORAGE_CONTAINER'),
            ],
        ],
        'max_size_mb' => 50,
        'allowed_mimes' => ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'xlsx', 'xls', 'docx', 'doc', 'txt'],
        'virus_scan' => env('FILE_VIRUS_SCAN', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Notification (ADR-012: WebSocket + REST fallback)
    |--------------------------------------------------------------------------
    */
    'notification' => [
        'default_locale' => 'fa-IR',
        'retry_attempts' => 3,
        'retry_delay_seconds' => [60, 300, 900],
        'websocket' => [
            'enabled' => true,
            'port' => env('WEBSOCKET_PORT', 6001),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Feature Flags
    |--------------------------------------------------------------------------
    */
    'feature_flags' => [
        'cache_ttl_seconds' => 30,
        'defaults' => [
            'ai' => false,
            'qr' => true,
            'sms' => true,
            'whatsapp' => false,
            'inventory' => true,
            'crm' => true,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | i18n (ADR-014: UI + Date + Number + Currency + Timezone)
    |--------------------------------------------------------------------------
    */
    'i18n' => [
        'supported_locales' => ['fa-IR', 'en-US'],
        'default_locale' => 'fa-IR',
        'default_timezone' => 'Asia/Tehran',
        'default_currency' => 'IRR',
        'fallback_locale' => 'fa-IR',
    ],

    /*
    |--------------------------------------------------------------------------
    | Business Code Generator (LAW-02: All main tables have business codes)
    |--------------------------------------------------------------------------
    | Pattern: {PREFIX}-{YEAR}-{SEQUENCE}
    | Year is Persian (Jalali) calendar year
    */
    'business_codes' => [
        'defaults' => [
            'padding_length' => 5,
            'year_format' => 'persian',  // 'persian' or 'gregorian'
        ],
        'definitions' => [
            'sales_order'       => ['prefix' => 'SO',  'padding' => 5],
            'shipment'          => ['prefix' => 'SHP', 'padding' => 5],
            'sales_invoice'     => ['prefix' => 'INV', 'padding' => 5],
            'payment'           => ['prefix' => 'PAY', 'padding' => 5],
            'sales_return'      => ['prefix' => 'RET', 'padding' => 5],
            'price_list'        => ['prefix' => 'PL',  'padding' => 3],
            'warranty_card'     => ['prefix' => 'WAR', 'padding' => 5],
            'warranty_claim'    => ['prefix' => 'WCL', 'padding' => 5],
            'warranty_extension'=> ['prefix' => 'WEX', 'padding' => 5],
            'warranty_transfer' => ['prefix' => 'WTR', 'padding' => 5],
            'service_request'   => ['prefix' => 'SR',  'padding' => 5],
            'service_order'     => ['prefix' => 'RO',  'padding' => 5],
            'quality_check'     => ['prefix' => 'QC',  'padding' => 5],
            'service_report'    => ['prefix' => 'RPT', 'padding' => 5],
            'service_estimate'  => ['prefix' => 'EST', 'padding' => 5],
            'journal_entry'     => ['prefix' => 'JE',  'padding' => 5],
            'ap_invoice'        => ['prefix' => 'API', 'padding' => 5],
            'ar_invoice'        => ['prefix' => 'ARI', 'padding' => 5],
            'settlement'        => ['prefix' => 'STL', 'padding' => 5],
            'cost_center'       => ['prefix' => 'CC',  'padding' => 3],
            'stock_transfer'    => ['prefix' => 'TR',  'padding' => 5],
            'stock_count'       => ['prefix' => 'SC',  'padding' => 5],
            'party'             => ['prefix' => 'PRT', 'padding' => 5],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Architecture Law Enforcement (LAW-01, LAW-02, LAW-03)
    |--------------------------------------------------------------------------
    */
    'laws' => [
        'law_01_no_cross_context_join' => true,     // Database level
        'law_02_business_codes' => true,             // All aggregate roots
        'law_03_no_cross_context_repo' => true,      // Code level
        'law_03_static_analysis' => env('LAW03_STATIC_ANALYSIS', true),  // phpstan rule in CI
    ],

    /*
    |--------------------------------------------------------------------------
    | Outbox Pattern
    |--------------------------------------------------------------------------
    */
    'outbox' => [
        'batch_size' => 100,
        'poll_interval_seconds' => 5,
        'max_retry_attempts' => 8,
        'backoff_base_seconds' => 2,  // exponential: 2^attempt
    ],

    /*
    |--------------------------------------------------------------------------
    | CORS
    |--------------------------------------------------------------------------
    */
    'cors' => [
        'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')),
        'allowed_methods' => ['*'],
        'allowed_headers' => ['*'],
        'exposed_headers' => [
            'X-Request-Id',
            'X-RateLimit-Limit',
            'X-RateLimit-Remaining',
            'X-RateLimit-Reset',
            'ETag',
        ],
        'max_age' => 0,
        'supports_credentials' => true,
    ],
];
