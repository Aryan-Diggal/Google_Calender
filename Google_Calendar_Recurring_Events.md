# Google Calendar Recurring Events & Editing Recurring Instances

## Overview

Google Calendar stores a **single master event** and a **recurrence rule
(RRULE)** instead of creating separate events for every occurrence.

------------------------------------------------------------------------

# 1. Recurring Events

A recurring event automatically generates multiple occurrences based on
a recurrence rule.

Example:

``` text
Meeting
Start: June 1, 2026
Time: 10:00 AM – 11:00 AM
Repeat: Every Week
```

Instead of storing every occurrence individually, Google stores: -
Master event - RRULE (e.g. `RRULE:FREQ=WEEKLY`)

The calendar dynamically generates all occurrences.

## Daily Recurrence

-   One event repeats every day.

## Weekly Recurrence

-   One event repeats every selected week/day.

## Monthly Recurrence

-   One event repeats every month on the specified date.

## Yearly Recurrence

-   One event repeats every year.

### Why use recurrence rules?

-   Better storage efficiency
-   Faster updates
-   Easier maintenance of recurring series

------------------------------------------------------------------------

# 2. Editing Recurring Event Instances

Whenever a recurring event is moved, resized, or edited, Google Calendar
asks which occurrences should be modified.

Options: - **This Event** - **This and Following Events** - **All
Events**

## This Event

Only the selected occurrence changes.

Example: - June 1 → 10 AM - June 8 → 10 AM - June 15 → **2 PM** - June
22 → 10 AM

Google stores this as an **exception**.

------------------------------------------------------------------------

## This and Following Events

Updates the selected occurrence and every future occurrence.

Example:

Before: - June 1 → 10 AM - June 8 → 10 AM - June 15 → 10 AM - June 22 →
10 AM

After: - June 1 → 10 AM - June 8 → 10 AM - June 15 → 2 PM - June 22 → 2
PM - June 29 → 2 PM

Internally Google splits the recurring series into: - Original series
(past) - New recurring series (future)

------------------------------------------------------------------------

## All Events

Updates the recurrence rule so every occurrence in the series changes.

Example: - Every Monday 10 AM becomes - Every Monday 2 PM

------------------------------------------------------------------------

# Dragging or Resizing a Recurring Event

Whenever a recurring event is: - Dragged - Resized - Edited

Google displays:

``` text
Which events do you want to change?

○ This Event
○ This and Following Events
○ All Events
```

Only after the user selects an option is the change saved.

------------------------------------------------------------------------

# Conceptual Database Structure

Master event:

``` json
{
  "id": 1,
  "title": "Team Meeting",
  "start": "2026-06-01T10:00",
  "end": "2026-06-01T11:00",
  "recurrence": "FREQ=WEEKLY"
}
```

Exception:

``` json
{
  "parentEventId": 1,
  "occurrenceDate": "2026-06-15",
  "start": "2026-06-15T14:00",
  "end": "2026-06-15T15:00"
}
```

Rendering logic: 1. Generate occurrences from the recurrence rule. 2.
Check for exceptions. 3. Render the exception if one exists.

------------------------------------------------------------------------

# Summary

  -----------------------------------------------------------------------
  Feature                           Behavior
  --------------------------------- -------------------------------------
  Recurring Event                   One master event with a recurrence
                                    rule generates multiple occurrences.

  Daily / Weekly / Monthly / Yearly Supported recurrence frequencies.

  This Event                        Creates an exception for only the
                                    selected occurrence.

  This and Following Events         Splits the recurring series and
                                    updates future occurrences.

  All Events                        Updates the recurrence rule for the
                                    entire series.

  Drag / Resize / Edit              Prompts the user to choose the scope
                                    before saving.
  -----------------------------------------------------------------------
