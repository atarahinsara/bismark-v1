<?php

declare(strict_types=1);

namespace App\Shared\Kernel\Domain\ValueObjects;

use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;
use RuntimeException;

/**
 * UUIDv7 value object — time-ordered, sortable, indexed efficiently by B-tree.
 *
 * BISMARK uses UUIDv7 for every primary key on aggregate-root tables. Compared
 * to UUIDv4 it dramatically reduces index fragmentation on PostgreSQL.
 */
final readonly class UuidV7
{
    private function __construct(private UuidInterface $value)
    {
    }

    /**
     * Generate a brand-new UUIDv7.
     */
    public static function generate(): self
    {
        // ramsey/uuid >=4.7 supports native UUIDv7 generation.
        return new self(Uuid::uuid7());
    }

    /**
     * Wrap an existing UUID string.
     *
     * @throws \Ramsey\Uuid\Exception\InvalidUuidStringException
     */
    public static function fromString(string $value): self
    {
        $uuid = Uuid::fromString($value);
        if ($uuid->getVersion() !== 7) {
            throw new RuntimeException(
                "Expected UUIDv7, received UUIDv{$uuid->getVersion()} ({$value})."
            );
        }

        return new self($uuid);
    }

    public function toString(): string
    {
        return $this->value->toString();
    }

    public function toUuid(): UuidInterface
    {
        return $this->value;
    }

    public function __toString(): string
    {
        return $this->value->toString();
    }
}
