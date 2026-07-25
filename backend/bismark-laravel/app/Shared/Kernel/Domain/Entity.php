<?php

declare(strict_types=1);

namespace App\Shared\Kernel\Domain;

/**
 * Base Entity (local to a single aggregate).
 *
 * Entities inside an aggregate share identity but are persisted through their
 * aggregate root. They expose equality by id only — never compare by property
 * values.
 */
abstract class Entity
{
    /**
     * Identity of the entity (UUIDv7 string).
     */
    protected ?string $id = null;

    public function id(): ?string
    {
        return $this->id;
    }

    public function equals(?Entity $other): bool
    {
        return $other !== null
            && $other instanceof static
            && $other->id() === $this->id();
    }
}
