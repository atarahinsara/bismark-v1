<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure\Law;

/**
 * LAW-03 Enforcement: No Cross-Context Repository Access.
 *
 * This class provides runtime + static-aided enforcement of LAW-03:
 * "No Controller or Application Service may directly access a Repository
 *  from another Bounded Context. Cross-context access is ONLY via
 *  Contract interfaces (Application Service / Published API / Domain Event / ACL)."
 *
 * The static map is also used by a phpstan custom rule for build-time detection.
 */
final class EnforceLaw03
{
    /**
     * Map of namespace prefixes to Bounded Context names.
     */
    public static array $contextMap = [
        'App\Modules\Identity'        => 'Identity',
        'App\Modules\Authentication'  => 'Authentication',
        'App\Modules\Authorization'   => 'Authorization',
        'App\Modules\Audit'           => 'Audit',
        'App\Modules\Notification'    => 'Notification',
        'App\Modules\FeatureFlag'     => 'FeatureFlag',
        'App\Modules\FileManagement'  => 'FileManagement',
        'App\Modules\Configuration'   => 'Configuration',
        'App\Modules\Workflow'        => 'Workflow',
        'App\Modules\RuleEngine'      => 'RuleEngine',
        'App\Modules\Party'           => 'Party',
        'App\Modules\Product'         => 'Product',
        'App\Modules\Inventory'       => 'Inventory',
        'App\Modules\Sales'           => 'Sales',
        'App\Modules\Warranty'        => 'Warranty',
        'App\Modules\Service'         => 'Service',
        'App\Modules\Financial'       => 'Financial',
        'App\Modules\Organization'    => 'Organization',
        'App\Modules\MasterData'      => 'MasterData',
    ];

    /**
     * Resolve which Bounded Context a class belongs to.
     */
    public static function resolveContext(string $className): ?string
    {
        foreach (self::$contextMap as $namespace => $context) {
            if (str_starts_with($className, $namespace)) {
                return $context;
            }
        }
        return null;
    }

    /**
     * Assert that a class (Repository) is not accessed from a different context.
     * Called at runtime from Repository constructors in non-production environments.
     */
    public static function assertRepositoryAccess(string $repositoryClass): void
    {
        if (app()->environment('production')) {
            return; // skip runtime check in production (static analysis covers it)
        }

        $repoContext = self::resolveContext($repositoryClass);
        if ($repoContext === null) {
            return; // not a module class
        }

        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 10);
        foreach ($trace as $frame) {
            $callerClass = $frame['class'] ?? '';
            $callerContext = self::resolveContext($callerClass);

            if ($callerContext !== null && $callerContext !== $repoContext) {
                throw new \RuntimeException(
                    "LAW-03 VIOLATION: {$callerContext} ({$callerClass}) cannot directly access " .
                    "{$repoContext} Repository ({$repositoryClass}). " .
                    "Use Application Service / Contract / Domain Event / ACL instead."
                );
            }
        }
    }
}
