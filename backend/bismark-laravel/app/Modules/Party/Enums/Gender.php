<?php

declare(strict_types=1);

namespace App\Modules\Party\Enums;

enum Gender: string
{
    case Male   = 'male';
    case Female = 'female';
    case Other  = 'other';
}
