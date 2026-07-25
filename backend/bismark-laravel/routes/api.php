<?php

declare(strict_types=1);

/**
 * BISMARK ERP — API route loader.
 *
 * This file is the single entry-point referenced by bootstrap/app.php. It loads
 * each module's route file in dependency order. Modules MUST register their own
 * routes; the Shared kernel only provides cross-cutting middleware.
 */

use Illuminate\Support\Facades\Route;

// Health-check JSON alias (Laravel '/up' is registered by bootstrap).
Route::prefix('v1/health')->group(function (): void {
    Route::get('/', fn () => response()->json([
        'status'  => 'ok',
        'service' => 'bismark-laravel',
        'edition' => config('bismark.edition'),
        'time'    => now()->toIso8601String(),
    ]));
});

// Per-module route files. Order is significant only if a module depends on
// another's auth routes (Identity registers login/logout, which other modules
// rely on for bearer-token resolution).
$modules = ['Identity', 'Organization', 'Party', 'MasterData'];

foreach ($modules as $context) {
    $file = __DIR__."/../app/Modules/{$context}/Routes/api.php";
    if (file_exists($file)) {
        require $file;
    }
}
