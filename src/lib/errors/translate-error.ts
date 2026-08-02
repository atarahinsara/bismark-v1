/**
 * BISMARK ERP — Error Translation Utility
 *
 * Translates backend API error codes to user-friendly Persian messages.
 */

const ERROR_TRANSLATIONS: Record<string, string> = {
  // Auth errors
  INVALID_CREDENTIALS: 'نام کاربری یا رمز عبور اشتباه است',
  ACCOUNT_LOCKED: 'حساب شما قفل شده است. لطفاً بعداً تلاش کنید',
  ACCOUNT_DISABLED: 'حساب شما غیرفعال است. با مدیر تماس بگیرید',
  EMAIL_NOT_VERIFIED: 'لطفاً ابتدا ایمیل خود را تأیید کنید',
  PASSWORD_NOT_SET: 'رمز عبور تنظیم نشده است. با مدیر تماس بگیرید',
  MFA_REQUIRED: 'احراز هویت دو مرحله‌ای لازم است',
  TOKEN_INVALID: 'توکن نامعتبر است',
  TOKEN_EXPIRED: 'لینک منقضی شده است. لطفاً دوباره درخواست دهید',
  SESSION_EXPIRED: 'نشست شما منقضی شده است. دوباره وارد شوید',

  // Registration errors
  USERNAME_TAKEN: 'این نام کاربری قبلاً استفاده شده است',
  EMAIL_TAKEN: 'این ایمیل قبلاً ثبت شده است',
  WEAK_PASSWORD: 'رمز عبور ضعیف است. حداقل ۸ کاراکتر شامل حروف بزرگ، کوچک و عدد',
  PROTECTED_ACCOUNT: 'این حساب محافظت می‌شود و قابل تغییر نیست',

  // Token errors
  INVALID_TOKEN: 'لینک نامعتبر یا استفاده شده است',
  RATE_LIMITED: 'تعداد درخواست‌ها بیش از حد بوده. لطفاً بعداً تلاش کنید',

  // Validation
  VALIDATION_ERROR: 'اطلاعات وارد شده نامعتبر است',
  CAPTCHA_FAILED: 'تأیید کپچا ناموفق بود. دوباره تلاش کنید',

  // Permissions
  FORBIDDEN: 'دسترسی غیرمجاز',
  UNAUTHORIZED: 'برای این عملیات باید وارد شوید',

  // Generic
  INTERNAL_ERROR: 'خطای داخلی سرور. لطفاً بعداً تلاش کنید',
  NETWORK_ERROR: 'خطای شبکه. اتصال اینترنت را بررسی کنید',
  NOT_FOUND: 'مورد یافت نشد',
  CONFLICT: 'تداخل داده‌ای رخ داد',
}

export function translateCode(code: string): string {
  return ERROR_TRANSLATIONS[code] || code
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (data.code) return translateCode(data.code)
    if (data.title) return translateCode(data.title)
    if (data.detail) return data.detail
    if (data.error) return data.error
    return translateCode('INTERNAL_ERROR')
  } catch {
    if (response.status === 401) return translateCode('INVALID_CREDENTIALS')
    if (response.status === 403) return translateCode('FORBIDDEN')
    if (response.status === 404) return translateCode('NOT_FOUND')
    if (response.status === 409) return translateCode('CONFLICT')
    if (response.status === 429) return translateCode('RATE_LIMITED')
    if (response.status >= 500) return translateCode('INTERNAL_ERROR')
    return translateCode('NETWORK_ERROR')
  }
}
