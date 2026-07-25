<?php

declare(strict_types=1);

namespace App\Shared\Kernel\Domain;

/**
 * Abstract base for repository implementations.
 *
 * Concrete repositories live in `app/Modules/{Context}/Repositories/` and
 * extend this class. The base provides:
 *   - hold of the underlying Eloquent model
 *   - common find / create / save / delete primitives
 *
 * Repositories MUST NOT expose cross-context models directly (LAW-03).
 */
abstract class Repository
{
    /**
     * The fully-qualified Eloquent model class managed by this repository.
     *
     * @return class-string<\Illuminate\Database\Eloquent\Model>
     */
    abstract protected function modelClass(): string;

    /**
     * Find a single record by primary key.
     */
    public function find(string $id): ?object
    {
        return $this->newQuery()->find($id);
    }

    /**
     * Find or throw a ModelNotFoundException.
     */
    public function findOrFail(string $id): object
    {
        return $this->newQuery()->findOrFail($id);
    }

    /**
     * Persist a model (handles both create and update).
     */
    public function save(object $model): bool
    {
        /** @var \Illuminate\Database\Eloquent\Model $model */
        return $model->save();
    }

    /**
     * Delete a model.
     */
    public function delete(object $model): bool
    {
        /** @var \Illuminate\Database\Eloquent\Model $model */
        return $model->delete();
    }

    protected function newQuery()
    {
        return $this->modelClass()::query();
    }
}
