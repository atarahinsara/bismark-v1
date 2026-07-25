<?php

declare(strict_types=1);

namespace App\Shared\Kernel\Domain;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Base class for all Aggregate Roots in BISMARK ERP.
 *
 * An Aggregate Root is the entry point to a cluster of domain objects
 * that are treated as a single unit for data changes.
 *
 * Architecture Laws enforced:
 * - LAW-01: References to other Aggregates are by ID only (no object references)
 * - LAW-02: Aggregate roots with business_code use BusinessCodeGenerator
 * - LAW-03: Cross-context access is via Contract interfaces only
 */
abstract class AggregateRoot extends Model
{
    /**
     * The primary key type.
     */
    protected $keyType = 'string';

    /**
     * Indicates if the IDs are auto-incrementing.
     */
    public $incrementing = false;

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = Str::uuid()->toString();
            }
        });
    }

    /**
     * Get the columns that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return array_merge(parent::casts(), [
            'id' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ]);
    }
}
