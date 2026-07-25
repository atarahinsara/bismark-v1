<?php

declare(strict_types=1);

namespace App\Shared\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * AuthorizeRequestPolicy — RBAC gate per route.
 *
 * Reads the route name (e.g. "users.create") and checks the corresponding
 * permission (e.g. "users.create") against the authenticated user's role set.
 *
 * Sprint 1: thin stub. The full policy-binding (route→permission map) is
 * materialised from the OpenAPI spec in Sprint 2.
 */
final class AuthorizeRequestPolicy
{
    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route();
        $name = $route?->getName();
        if ($name !== null && $request->user() !== null) {
            // Allow super_admin to bypass.
            if ($request->user()->hasRole('super_admin')) {
                return $next($request);
            }
            if (!$request->user()->can($name)) {
                return response()->json([
                    'type'   => 'about:blank',
                    'title'  => 'Forbidden',
                    'status' => 403,
                    'detail' => "Missing permission: {$name}",
                ], 403);
            }
        }

        return $next($request);
    }
}
