import type { BusinessHours } from '@/lib/site-content'
import { upcomingHolidays } from '@/lib/site-content'

// Presentational hours + upcoming-holiday display used everywhere hours appear.
// `todayIso` is passed in (YYYY-MM-DD) so the caller controls "now".
export default function BusinessHoursDisplay({
  hours, todayIso, variant = 'list', className,
}: {
  hours: BusinessHours
  todayIso: string
  variant?: 'list' | 'plain'
  className?: string
}) {
  const holidays = upcomingHolidays(hours.holidays, todayIso)
  const holidayValue = (h: (typeof holidays)[number]) => (h.closed ? 'Closed' : h.hours || 'Special hours')

  if (variant === 'plain') {
    // Compact stacked lines (footer / about) — text color inherits from parent.
    return (
      <div className={className}>
        {hours.rows.map((r, i) => (
          <p key={i}>{r.label}: {r.hours}</p>
        ))}
        {holidays.map((h, i) => (
          <p key={`h${i}`} className="text-amber-500/90">{h.label}: {holidayValue(h)}</p>
        ))}
      </div>
    )
  }

  // Label ⟷ value rows (contact / about / pickup).
  return (
    <div className={className}>
      {hours.rows.map((r, i) => (
        <div key={i} className="flex justify-between"><span>{r.label}</span><span>{r.hours}</span></div>
      ))}
      {holidays.length > 0 && (
        <div className="mt-1 pt-1 border-t border-current/10">
          {holidays.map((h, i) => (
            <div key={i} className="flex justify-between text-amber-600">
              <span>{h.label}</span><span>{holidayValue(h)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
