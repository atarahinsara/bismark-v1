<?php

declare(strict_types=1);

namespace App\Shared\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * AuditRequestLog — write every mutating API request into the audit trail.
 *
 * Pure stub for Sprint 1: the real writer (with redaction, correlation-id,
 * hashing of payload fields) ships in Sprint 2 alongside the audit table.
 */
final class AuditRequestLog
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (config('bismark.audit.enabled', true) && in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            logger()->info('bismark.audit.request', [
                'tenant'    => app('bismark.tenant'),
                'method'    => $request->method(),
                'path'      => $request->path(),
                'status'    => $response->getStatusCode(),
                'ip'        => $request->ip(),
                'user_id'   => $request->user()?->getAuthIdentifier(),
            ]);
        }

        return $response;
    }
}
