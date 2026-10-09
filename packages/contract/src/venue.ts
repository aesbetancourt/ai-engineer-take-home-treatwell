/** The time zone of the venue. Each time that a person reads is in this zone. */
export const VENUE_TIME_ZONE = 'Europe/Berlin';

const venueClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: VENUE_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

const venueTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: VENUE_TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Returns how far the venue clock is ahead of UTC at an instant, in milliseconds. */
function venueOffset(instant: number): number {
  const parts = venueClock.formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const venueClockAsUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
  // The clock has no milliseconds, so compare whole seconds.
  return venueClockAsUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * Converts a venue time without a zone, such as `2026-10-12T10:00` from a `datetime-local` input, to UTC ISO 8601.
 * An hour that the spring clock change skips moves one hour forward. An hour that occurs twice in autumn is winter time.
 */
export function venueTimeToUtc(venueTime: string): string {
  const clockAsUtc = Date.parse(venueTime + 'Z');
  // The offset at the first estimate can be the one from before a clock change, so read it a second time.
  const estimate = clockAsUtc - venueOffset(clockAsUtc);
  return new Date(clockAsUtc - venueOffset(estimate)).toISOString();
}

/** Formats a UTC ISO 8601 time as venue time for a person to read, for example `5 Oct 2026, 22:00`. */
export function formatVenueTime(utcTime: string): string {
  return venueTimeFormat.format(new Date(utcTime));
}
