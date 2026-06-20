// Strip characters that enable HTML/script injection.
// React already escapes output by default, but sanitizing at write time
// is defense-in-depth — it protects any raw DB reads shown outside React.

export function sanitizeText(input: unknown, maxLen = 2000): string {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .replace(/[<>]/g, '')     // strip angle brackets — prevents tag injection
    .replace(/javascript:/gi, '') // strip JS protocol
    .slice(0, maxLen)
}

export function sanitizeEmail(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.trim().toLowerCase().replace(/[^a-z0-9._%+\-@]/g, '').slice(0, 254)
}

export function sanitizePhone(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[^0-9+\-()\s]/g, '').trim().slice(0, 20)
}

export function sanitizeForm<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[],
): T {
  const result = { ...data }
  for (const field of fields) {
    if (typeof result[field] === 'string') {
      (result as any)[field] = sanitizeText(result[field] as string)
    }
  }
  return result
}
