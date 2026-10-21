import bootstrap from './bootstrap';
import config from './config';
import contentTypes from './content-types';
import controllers from './controllers';
import destroy from './destroy';
import middlewares from './middlewares';
import policies from './policies';
import register from './register';
import routes from './routes';
import services from './services';

export default {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
  middlewares,
} as const;

export type {
  CalendarLinkSet,
  EventLifecycleStatus,
  EventLocationType,
  EventSourceMapping,
  EventsPluginSettings,
  ExpandedOccurrence,
  OccurrenceOverride,
  ParsedRRule,
  RRuleFieldValue,
  RRuleFrequency,
  RRuleWeekday,
  RsvpRegistrationInput,
  RsvpRegistrationRecord,
  RsvpStats,
  RsvpStatus,
  TimeSlotWindow,
} from '../../shared/types';

export {
  buildRRule,
  describeRRule,
  expandRuleSlots,
  parseRRule,
  parseRRuleFieldValue,
} from '../../shared/rruleEngine';

export {
  buildCalendarLinks,
  generateIcsCalendar,
  generateRegistrationsCsv,
  sanitizeCsvCell,
} from '../../shared/icalGenerator';
