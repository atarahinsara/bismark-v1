<?php

declare(strict_types=1);

use App\Modules\Organization\Controllers\BranchController;
use App\Modules\Organization\Controllers\DepartmentController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware(['tenant.resolve', 'auth:sanctum'])->group(function (): void {
    Route::apiResource('branches', BranchController::class)
        ->only(['index', 'show', 'store', 'update', 'destroy'])
        ->names([
            'index'   => 'branches.list',
            'show'    => 'branches.show',
            'store'   => 'branches.create',
            'update'  => 'branches.update',
            'destroy' => 'branches.delete',
        ]);

    Route::apiResource('departments', DepartmentController::class)
        ->only(['index', 'show', 'store', 'update', 'destroy'])
        ->names([
            'index'   => 'organization.list',
            'show'    => 'organization.show',
            'store'   => 'organization.create',
            'update'  => 'organization.update',
            'destroy' => 'organization.delete',
        ]);
});
