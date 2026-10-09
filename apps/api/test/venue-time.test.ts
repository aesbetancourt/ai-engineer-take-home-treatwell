import { describe, expect, it } from 'vitest';
import { formatVenueTime, venueTimeToUtc } from '@venue/contract';

// These functions have no endpoint: the web pages use them. Each expected value was checked against the time zone
// database. The results must not depend on the time zone of the machine.
describe('venueTimeToUtc', () => {
  it.each([
    ['a winter time (UTC+1)', '2026-01-15T10:00', '2026-01-15T09:00:00.000Z'],
    ['a summer time (UTC+2)', '2026-07-15T10:00', '2026-07-15T08:00:00.000Z'],
    ['the last minute before the clocks go forward', '2026-03-29T01:59', '2026-03-29T00:59:00.000Z'],
    ['the first minute after the clocks go forward', '2026-03-29T03:00', '2026-03-29T01:00:00.000Z'],
    ['the last minute before the clocks go back', '2026-10-25T01:59', '2026-10-24T23:59:00.000Z'],
    ['the first minute after the clocks go back', '2026-10-25T03:00', '2026-10-25T02:00:00.000Z'],
    ['midnight, which belongs to the day before in UTC', '2026-10-12T00:00', '2026-10-11T22:00:00.000Z'],
  ])('converts %s', (_label, venueTime, expected) => {
    expect(venueTimeToUtc(venueTime)).toBe(expected);
  });

  it('moves an hour that does not exist to the hour after it', () => {
    // The clocks go from 02:00 to 03:00 on 29 March 2026, so 02:30 is not a real time. It becomes 03:30.
    expect(venueTimeToUtc('2026-03-29T02:30')).toBe('2026-03-29T01:30:00.000Z');
  });

  it('reads an hour that occurs twice as winter time', () => {
    // The clocks go from 03:00 back to 02:00 on 25 October 2026, so 02:30 occurs twice. The second one counts.
    expect(venueTimeToUtc('2026-10-25T02:30')).toBe('2026-10-25T01:30:00.000Z');
  });
});

describe('formatVenueTime', () => {
  it('shows a UTC start time in venue time', () => {
    expect(formatVenueTime('2026-10-05T20:00:00.000Z')).toContain('22:00');
    expect(formatVenueTime('2026-01-15T23:30:00.000Z')).toContain('16 Jan 2026');
  });
});
