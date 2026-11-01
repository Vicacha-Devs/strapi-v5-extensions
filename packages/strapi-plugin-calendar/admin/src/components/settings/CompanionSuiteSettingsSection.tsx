import {
  Badge,
  Box,
  Checkbox,
  Divider,
  Field,
  Flex,
  NumberInput,
  TextInput,
  Typography,
} from "@strapi/design-system";
import React from "react";

export interface EventsCompanionSettings {
  defaultCapacity: number;
  defaultMaxGuestsPerRegistration: number;
  waitlistEnabledByDefault: boolean;
  sendRsvpEmails: boolean;
  defaultTimezone: string;
  feedTitle?: string;
}

export interface BookingsCompanionSettings {
  defaultSlotDurationMinutes: number;
  defaultCapacityPerSlot: number;
  defaultBufferBeforeMinutes: number;
  defaultBufferAfterMinutes: number;
  defaultMinLeadTimeHours: number;
  defaultMaxAdvanceDays: number;
  defaultTimezone: string;
  defaultRequiresApproval: boolean;
  sendEmailNotifications: boolean;
}

export interface CompanionSuiteSettingsSectionProps {
  t: (id: string, defaultMessage: string) => string;
  mode: "events" | "bookings";
  eventsSettings: EventsCompanionSettings | null;
  bookingsSettings: BookingsCompanionSettings | null;
  onPatchEvents: (patch: Partial<EventsCompanionSettings>) => void;
  onPatchBookings: (patch: Partial<BookingsCompanionSettings>) => void;
}

const CARD_STYLE: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.22)",
};

const SUB_BOX_STYLE: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.18)",
};

const GRID_2_COL: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const GRID_3_COL: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
};

export const CompanionSuiteSettingsSection: React.FC<
  CompanionSuiteSettingsSectionProps
> = ({
  t,
  mode,
  eventsSettings,
  bookingsSettings,
  onPatchEvents,
  onPatchBookings,
}) => {
  if (mode === "events") {
    if (!eventsSettings) {
      return (
        <Box
          padding={5}
          background="neutral0"
          hasRadius
          shadow="tableShadow"
          style={CARD_STYLE}
        >
          <Typography variant="omega" textColor="neutral600">
            {t(
              "settings.eventsUnavailable",
              "Events & RSVPs plugin settings are loading or not installed."
            )}
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        padding={5}
        background="neutral0"
        hasRadius
        shadow="tableShadow"
        style={CARD_STYLE}
      >
        <Flex direction="column" alignItems="stretch" gap={5}>
          <Flex
            justifyContent="space-between"
            alignItems="center"
            wrap="wrap"
            gap={2}
          >
            <Box>
              <Typography variant="delta" fontWeight="bold" tag="h2">
                {t(
                  "settings.eventsHeading",
                  "Events, RSVP Capacity & Waitlist Automation"
                )}
              </Typography>
              <Box paddingTop={1}>
                <Typography variant="pi" textColor="neutral600">
                  {t(
                    "settings.eventsHint",
                    "Configure default RSVP seat capacity, guest limits per registration, automatic FIFO waitlist promotion, and public Events iCal (.ics) feed."
                  )}
                </Typography>
              </Box>
            </Box>
            <Badge active>
              {t("settings.badge.timezone", "Timezone")}:{" "}
              {eventsSettings.defaultTimezone || "America/Bogota"}
            </Badge>
          </Flex>

          <div style={GRID_2_COL}>
            <Field.Root
              hint={t(
                "settings.eventsDefaultCapacityHint",
                "Default seat capacity for newly created RSVP events."
              )}
            >
              <Field.Label>
                {t("settings.eventsDefaultCapacity", "Default Event Capacity")}
              </Field.Label>
              <NumberInput
                value={eventsSettings.defaultCapacity || 100}
                onValueChange={(val: number | undefined) =>
                  onPatchEvents({
                    defaultCapacity: val && val >= 1 ? val : 100,
                  })
                }
              />
              <Field.Hint />
            </Field.Root>

            <Field.Root
              hint={t(
                "settings.eventsMaxGuestsHint",
                "Maximum seats a single RSVP submission may reserve."
              )}
            >
              <Field.Label>
                {t("settings.eventsMaxGuests", "Max Guests per Registration")}
              </Field.Label>
              <NumberInput
                value={eventsSettings.defaultMaxGuestsPerRegistration || 5}
                onValueChange={(val: number | undefined) =>
                  onPatchEvents({
                    defaultMaxGuestsPerRegistration: val && val >= 1 ? val : 5,
                  })
                }
              />
              <Field.Hint />
            </Field.Root>
          </div>

          <div style={GRID_2_COL}>
            <Box
              padding={4}
              background="neutral100"
              hasRadius
              style={SUB_BOX_STYLE}
            >
              <Checkbox
                checked={eventsSettings.waitlistEnabledByDefault}
                onCheckedChange={(checked: boolean) =>
                  onPatchEvents({ waitlistEnabledByDefault: Boolean(checked) })
                }
              >
                {t(
                  "settings.eventsWaitlist",
                  "Enable Waitlist & Automatic Promotion"
                )}
              </Checkbox>
              <Box paddingTop={2}>
                <Typography variant="pi" textColor="neutral600">
                  {t(
                    "settings.eventsWaitlistHint",
                    "Automatically promotes waitlisted attendees in FIFO order when a confirmed attendee cancels."
                  )}
                </Typography>
              </Box>
            </Box>

            <Box
              padding={4}
              background="neutral100"
              hasRadius
              style={SUB_BOX_STYLE}
            >
              <Checkbox
                checked={eventsSettings.sendRsvpEmails}
                onCheckedChange={(checked: boolean) =>
                  onPatchEvents({ sendRsvpEmails: Boolean(checked) })
                }
              >
                {t(
                  "settings.eventsSendEmails",
                  "Send Confirmation & Waitlist Promotion Emails"
                )}
              </Checkbox>
              <Box paddingTop={2}>
                <Typography variant="pi" textColor="neutral600">
                  {t(
                    "settings.eventsSendEmailsHint",
                    "Dispatches confirmation and waitlist promotion emails via the Strapi Email plugin."
                  )}
                </Typography>
              </Box>
            </Box>
          </div>

          <Divider />

          <div style={GRID_2_COL}>
            <Field.Root
              hint={t(
                "settings.defaultTimezoneHint",
                "IANA timezone identifier used for event recurrence and iCal exports."
              )}
            >
              <Field.Label>
                {t("settings.defaultTimezone", "Events Timezone (IANA)")}
              </Field.Label>
              <TextInput
                value={eventsSettings.defaultTimezone || "America/Bogota"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onPatchEvents({ defaultTimezone: e.target.value })
                }
              />
              <Field.Hint />
            </Field.Root>

            <Field.Root
              hint={t(
                "settings.eventsFeedTitleHint",
                "Calendar name shown when users subscribe in Google, Apple, or Outlook Calendar."
              )}
            >
              <Field.Label>
                {t("settings.eventsFeedTitle", "Events iCal (.ics) Feed Title")}
              </Field.Label>
              <TextInput
                value={
                  eventsSettings.feedTitle ||
                  "Abu Bakr As-Siddiq Central Mosque — Events Calendar"
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onPatchEvents({ feedTitle: e.target.value })
                }
              />
              <Field.Hint />
            </Field.Root>
          </div>
        </Flex>
      </Box>
    );
  }

  if (!bookingsSettings) {
    return (
      <Box
        padding={5}
        background="neutral0"
        hasRadius
        shadow="tableShadow"
        style={CARD_STYLE}
      >
        <Typography variant="omega" textColor="neutral600">
          {t(
            "settings.bookingsUnavailable",
            "Bookings & Availability plugin settings are loading or not installed."
          )}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      padding={5}
      background="neutral0"
      hasRadius
      shadow="tableShadow"
      style={CARD_STYLE}
    >
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Box>
          <Typography variant="delta" fontWeight="bold" tag="h2">
            {t(
              "settings.bookingsHeading",
              "Bookings, Slot Duration & Approval Workflow"
            )}
          </Typography>
          <Box paddingTop={1}>
            <Typography variant="pi" textColor="neutral600">
              {t(
                "settings.bookingsHint",
                "Configure default appointment slot durations, capacity limits, preparation buffers, lead times, and manual approval rules."
              )}
            </Typography>
          </Box>
        </Box>

        <div style={GRID_3_COL}>
          <Field.Root
            hint={t(
              "settings.bookingsSlotDurationHint",
              "Standard length of each bookable appointment slot."
            )}
          >
            <Field.Label>
              {t("settings.bookingsSlotDuration", "Slot Duration (Minutes)")}
            </Field.Label>
            <NumberInput
              value={bookingsSettings.defaultSlotDurationMinutes}
              onValueChange={(v: number | undefined) =>
                onPatchBookings({
                  defaultSlotDurationMinutes: Math.max(5, Number(v ?? 60)),
                })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            hint={t(
              "settings.bookingsCapacityPerSlotHint",
              "Concurrent reservations allowed per time slot."
            )}
          >
            <Field.Label>
              {t(
                "settings.bookingsCapacityPerSlot",
                "Default Capacity Per Slot"
              )}
            </Field.Label>
            <NumberInput
              value={bookingsSettings.defaultCapacityPerSlot}
              onValueChange={(v: number | undefined) =>
                onPatchBookings({
                  defaultCapacityPerSlot: Math.max(1, Number(v ?? 1)),
                })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            hint={t(
              "settings.bookingsBufferBeforeHint",
              "Preparation gap blocked before each booking starts."
            )}
          >
            <Field.Label>
              {t("settings.bookingsBufferBefore", "Buffer Before (Minutes)")}
            </Field.Label>
            <NumberInput
              value={bookingsSettings.defaultBufferBeforeMinutes}
              onValueChange={(v: number | undefined) =>
                onPatchBookings({
                  defaultBufferBeforeMinutes: Math.max(0, Number(v ?? 0)),
                })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            hint={t(
              "settings.bookingsBufferAfterHint",
              "Cooldown gap blocked after each booking ends."
            )}
          >
            <Field.Label>
              {t("settings.bookingsBufferAfter", "Buffer After (Minutes)")}
            </Field.Label>
            <NumberInput
              value={bookingsSettings.defaultBufferAfterMinutes}
              onValueChange={(v: number | undefined) =>
                onPatchBookings({
                  defaultBufferAfterMinutes: Math.max(0, Number(v ?? 0)),
                })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            hint={t(
              "settings.bookingsMinLeadHoursHint",
              "Minimum notice required before a slot can be booked."
            )}
          >
            <Field.Label>
              {t("settings.bookingsMinLeadHours", "Minimum Lead Time (Hours)")}
            </Field.Label>
            <NumberInput
              value={bookingsSettings.defaultMinLeadTimeHours}
              onValueChange={(v: number | undefined) =>
                onPatchBookings({
                  defaultMinLeadTimeHours: Math.max(0, Number(v ?? 2)),
                })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            hint={t(
              "settings.bookingsMaxAdvanceDaysHint",
              "How far in advance visitors may schedule bookings."
            )}
          >
            <Field.Label>
              {t(
                "settings.bookingsMaxAdvanceDays",
                "Max Advance Horizon (Days)"
              )}
            </Field.Label>
            <NumberInput
              value={bookingsSettings.defaultMaxAdvanceDays}
              onValueChange={(v: number | undefined) =>
                onPatchBookings({
                  defaultMaxAdvanceDays: Math.max(1, Number(v ?? 90)),
                })
              }
            />
            <Field.Hint />
          </Field.Root>
        </div>

        <Divider />

        <div style={GRID_2_COL}>
          <Box
            padding={4}
            background="neutral100"
            hasRadius
            style={SUB_BOX_STYLE}
          >
            <Checkbox
              checked={bookingsSettings.defaultRequiresApproval}
              onCheckedChange={(checked: boolean) =>
                onPatchBookings({ defaultRequiresApproval: Boolean(checked) })
              }
            >
              {t(
                "settings.bookingsRequiresApproval",
                "Require Manual Admin Approval"
              )}
            </Checkbox>
            <Box paddingTop={2}>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  "settings.bookingsRequiresApprovalHint",
                  "Places new visitor reservations in pending status until confirmed by staff."
                )}
              </Typography>
            </Box>
          </Box>

          <Box
            padding={4}
            background="neutral100"
            hasRadius
            style={SUB_BOX_STYLE}
          >
            <Checkbox
              checked={bookingsSettings.sendEmailNotifications}
              onCheckedChange={(checked: boolean) =>
                onPatchBookings({ sendEmailNotifications: Boolean(checked) })
              }
            >
              {t(
                "settings.bookingsSendEmails",
                "Send Confirmation & Status Update Emails"
              )}
            </Checkbox>
            <Box paddingTop={2}>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  "settings.bookingsSendEmailsHint",
                  "Automatically notifies visitors when their booking is created, approved, or rescheduled."
                )}
              </Typography>
            </Box>
          </Box>
        </div>
      </Flex>
    </Box>
  );
};
