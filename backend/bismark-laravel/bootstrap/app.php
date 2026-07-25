<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // API middleware stack (order matters)
        $middleware->api(prepend: [
            \App\Http\Middleware\SetLocale::class,
            \App\Http\Middleware\SetTenantContext::class,
            \App\Http\Middleware\RateLimitByTier::class,
        ]);

        // Aliases for route middleware
        $middleware->alias([
            'auth'       => \App\Http\Middleware\Authenticate::class,
            'permission' => \App\Http\Middleware\CheckPermission::class,
            'feature'    => \App\Http\Middleware\CheckFeatureFlag::class,
            'audit'      => \App\Http\Middleware\AuditRequest::class,
            'role'       => \App\Http\Middleware\CheckRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->renderable([\App\Exceptions\Handler::class, 'render']);
    })
    ->create();
