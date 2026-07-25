<?php

declare(strict_types=1);

namespace App\Modules\Identity\Enums;

/**
 * User type — controls which profile types the user can be linked to.
 */
enum UserType: string
{
    case Customer      = 'customer';
    case Representative= 'representative';
    case Technician    = 'technician';
    case ServiceCenter = 'service_center';
    case Staff         = 'staff';
}
