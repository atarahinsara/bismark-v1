<?php

declare(strict_types=1);

namespace App\Shared\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * BusinessCodeGenerator — LAW-02 compliant generator.
 *
 * Format:  {PREFIX}-{YEAR(YY)}-{MONTH(MM)}-{PaddedSequence}
 *   e.g.   PRT-1405-000125
 *
 * The sequence is drawn from a per-tenant, per-prefix counter stored in the
 * `business_code_sequences` table; updates are atomic and lock the row to
 * prevent races under concurrent inserts.
 *
 * Calendar dates use the Jalali year/month by default (BISMARK operates from
 * Tehran). The calendar is overridable per-tenant in later sprints.
 */
final class BusinessCodeGenerator
{
    public function generate(string $aggregateType, ?string $tenantId = null): string
    {
        $config = config("bismark.business_codes.{$aggregateType}");
        if (!is_array($config)) {
            throw new RuntimeException(
                "BusinessCodeGenerator: no config for aggregate '{$aggregateType}'."
            );
        }

        $prefix = (string) $config['prefix'];
        $pad    = (int) ($config['pad'] ?? 6);

        // Use Jalali 2-digit year/month (1405/01 → "1405-01"). Falls back to
        // Gregorian in non-FA locale via IntlCalendar when available.
        [$year, $month] = $this->currentPeriod();

        $seq = DB::transaction(function () use ($prefix, $year, $month, $tenantId): int {
            // Upsert the counter row, locking it for the duration of the txn.
            $row = DB::table('business_code_sequences')
                ->where('tenant_id', $tenantId ?? '')
                ->where('prefix', $prefix)
                ->where('year', $year)
                ->where('month', $month)
                ->lockForUpdate()
                ->first();

            if ($row === null) {
                DB::table('business_code_sequences')->insert([
                    'tenant_id' => $tenantId ?? '',
                    'prefix'    => $prefix,
                    'year'      => $year,
                    'month'     => $month,
                    'next_seq'  => 2,
                    'created_at'=> now(),
                    'updated_at'=> now(),
                ]);
                return 1;
            }

            $seq = (int) $row->next_seq;
            DB::table('business_code_sequences')
                ->where('id', $row->id)
                ->update(['next_seq' => $seq + 1, 'updated_at' => now()]);

            return $seq;
        });

        return sprintf('%s-%s-%s-%s', $prefix, $year, $month, str_pad((string) $seq, $pad, '0', STR_PAD_LEFT));
    }

    /**
     * @return array{0:string,1:string}  [year, zero-padded month]
     */
    private function currentPeriod(): array
    {
        // Lazy Jalali conversion. Avoids hard dependency on jdate package;
        // production replaces with IntlCalendar-based conversion.
        $gregorian = now();
        try {
            if (class_exists(\IntlCalendar::class)) {
                $cal = \IntlCalendar::createInstance($gregorian->getTimezone(), 'fa_IR@calendar=persian');
                $cal->setTime($gregorian->getTimestampMs());
                $year = (string) $cal->get(\IntlCalendar::FIELD_YEAR);
                $month = str_pad((string) ($cal->get(\IntlCalendar::FIELD_MONTH) + 1), 2, '0', STR_PAD_LEFT);
                return [$year, $month];
            }
        } catch (\Throwable) {
            // fall through to gregorian
        }

        return [(string) $gregorian->format('y'), $gregorian->format('m')];
    }
}
