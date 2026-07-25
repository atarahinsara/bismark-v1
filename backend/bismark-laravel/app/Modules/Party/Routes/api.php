<?php

declare(strict_types=1);

use App\Modules\Party\Controllers\PartyController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware(['tenant.resolve', 'auth:sanctum'])->group(function (): void {
    Route::apiResource('parties', PartyController::class)
        ->only(['index', 'show', 'store', 'update', 'destroy'])
        ->names([
            'index'   => 'parties.list',
            'show'    => 'parties.show',
            'store'   => 'parties.create',
            'update'  => 'parties.update',
            'destroy' => 'parties.delete',
        ]);
});
