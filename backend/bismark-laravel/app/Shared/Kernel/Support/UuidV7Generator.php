<?php

declare(strict_types=1);

namespace App\Shared\Kernel\Support;

/**
 * UUID v7 Generator (time-ordered, sortable, globally unique).
 *
 * PostgreSQL 18+ has native uuid_v7(). For PG 16-17, this class provides
 * a PHP fallback that generates UUID v7 compliant with RFC 9562.
 *
 * Why UUID v7?
 * - Time-ordered → optimal B-tree index performance
 * - Globally unique → safe for Offline-First mobile clients
 * - No coordination needed → can be generated client-side
 */
final class UuidV7Generator
{
    /**
     * Generate a new UUID v7.
     */
    public static function generate(): string
    {
        $unixTsMs = (int) (microtime(true) * 1000);

        // 48-bit timestamp (6 bytes)
        $tsBytes = pack('J', $unixTsMs);
        $tsBytes = substr($tsBytes, 2, 6); // last 6 bytes

        // 10 random bytes
        $randBytes = random_bytes(10);

        // Set version 7 (bits 48-51 of the UUID)
        $randBytes[0] = chr((ord($randBytes[0]) & 0x0F) | 0x70);

        // Set variant 10xx (bits 64-65)
        $randBytes[2] = chr((ord($randBytes[2]) & 0x3F) | 0x80);

        $bytes = $tsBytes . $randBytes;

        return self::formatUuid($bytes);
    }

    /**
     * Format 16 bytes as a standard UUID string.
     */
    private static function formatUuid(string $bytes): string
    {
        $hex = bin2hex($bytes);

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12),
        );
    }
}
