import type { CalendarPluginSettings } from '../../../shared/types';

export const DEFAULT_CALENDAR_SETTINGS: CalendarPluginSettings = {
  theme: 'breeze',
  colorScheme: 'auto',
  themePalette: 'default',
  secondaryCalendarLanguage: 'local',
  defaultTimezone: 'UTC',
  defaultLocale: 'auto',
  direction: 'auto',
  defaultView: 'dayGridMonth',
  firstDayOfWeek: 1,
  weekNumbers: false,
  weekNumberCalculation: 'ISO',
  timeFormat24h: true,
  startHour: '07:00:00',
  endHour: '21:00:00',
  slotDuration: '00:30:00',
  primaryColor: '#0284C7',
  showWeekends: true,
  showTodayButton: true,
  showCreateButton: true,
  monthView: true,
  weekView: true,
  dayView: true,
  agendaView: true,
  yearView: true,
  businessHours: [
    {
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '08:00',
      endTime: '18:00',
    },
  ],
  feedTitle: 'Organization Calendar',
  sources: [],
  secondaryCalendars: [],
  recurrencePresets: [
    { id: 'daily', label: 'Daily', rrule: 'FREQ=DAILY;INTERVAL=1' },
    { id: 'weekly-mon', label: 'Weekly on Mondays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO' },
    { id: 'weekly-tue', label: 'Weekly on Tuesdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TU' },
    { id: 'weekly-wed', label: 'Weekly on Wednesdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE' },
    { id: 'weekly-thu', label: 'Weekly on Thursdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TH' },
    { id: 'weekly-fri', label: 'Weekly on Fridays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=FR' },
    { id: 'weekly-sat', label: 'Weekly on Saturdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=SA' },
    { id: 'weekly-sun', label: 'Weekly on Sundays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=SU' },
    { id: 'monthly', label: 'Monthly', rrule: 'FREQ=MONTHLY;INTERVAL=1' },
    { id: 'yearly', label: 'Yearly', rrule: 'FREQ=YEARLY;INTERVAL=1' },
  ],
};

export default {
  default: DEFAULT_CALENDAR_SETTINGS,
  validator(config: Partial<CalendarPluginSettings>) {
    if (
      config.firstDayOfWeek !== undefined &&
      (config.firstDayOfWeek < 0 || config.firstDayOfWeek > 6)
    ) {
      throw new Error('calendar plugin config: firstDayOfWeek must be between 0 and 6');
    }
  },
};
