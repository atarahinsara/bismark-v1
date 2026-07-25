<?php

declare(strict_types=1);

namespace App\Shared\Http\Middleware;

use App\Shared\Infrastructure\Law\EnforceLaw03;
use Closure;
use Illuminate\Http\Request;
use ReflectionClass;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnforceLaw03 — middleware-level guard.
 *
 * Inspects the controller that handled the route. The controller's namespace
 * declares its owning context. Any repository the controller injects must be
 * either in the same context OR reached via a declared Contract (the contract
 * FQCN is part of the controller's constructor signature).
 *
 * The full static analysis (verifying that the Contract interfaces are
 * declared under the consuming module's Contracts/ directory) is performed by
 * a separate pint/phpstan rule outside the runtime path.
 */
final class EnforceLaw03
{
    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route();
        $controller = $route?->getController();

        if ($controller !== null) {
            $reflection = new ReflectionClass($controller);
            $context = $this->extractContext($reflection);
            if ($context !== null) {
                // Stash for use by service-layer guards if needed.
                app()->instance('bismark.law03.context', $context);

                // Sanity check: the controller must NOT directly type-hint a
                // repository from another context. Contracts are fine.
                foreach ($reflection->getConstructor()?->getParameters() ?? [] as $param) {
                    $type = $param->getType();
                    if (!$type instanceof \ReflectionNamedType) {
                        continue;
                    }
                    $fqcn = $type->getName();
                    if (!str_ends_with($fqcn, 'Repository')) {
                        continue;
                    }
                    EnforceLaw03::checkAccess(
                        repositoryClass: $fqcn,
                        callerContext: $context,
                        viaContract: null,
                    );
                }
            }
        }

        return $next($request);
    }

    private function extractContext(ReflectionClass $reflection): ?string
    {
        $ns = $reflection->getNamespaceName() ?? '';
        if (preg_match('#App\\\\Modules\\\\(?<ctx>[A-Za-z]+)#', $ns, $m)) {
            return $m['ctx'];
        }
        return null;
    }
}
