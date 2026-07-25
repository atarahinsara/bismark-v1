<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

// Minimal web routes file — BISMARK is API-only.
Route::get('/', fn () => redirect()->away('/up'));
