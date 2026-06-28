# Google Calendar Drag & Drop and Resize Logic

## Overview

Google Calendar uses two primary interaction models:

1.  **Time Grid Views** (Day, Week)
2.  **Date Grid Views** (Month and All-day section)

------------------------------------------------------------------------

# 1. Day View & Week View (Time Grid)

These views share the same interaction model.

## Moving an Event

-   Click and drag the body of an event to move it.
-   The event can be moved:
    -   Vertically to change its time.
    -   Horizontally to change its day.
    -   Diagonally to change both day and time simultaneously.
-   The event duration remains unchanged while moving.
-   The event snaps to the configured calendar time interval (e.g., 15
    or 30 minutes).
-   The displayed start and end times update live while dragging.

### Collision Handling

When the dragged event overlaps with another event:

-   **Do not immediately save the change.**
-   Before persisting the updated event, check for collisions.
-   If a collision is detected, display the existing collision
    notification/confirmation dialog that is already implemented in the
    application.
-   Only save the updated event if the user confirms the action.
-   If the user cancels, revert the event to its original position and
    duration.

------------------------------------------------------------------------

## Resizing an Event

Only the top and bottom edges are resizable.

### Top Edge

-   Adjusts the event's **start time**.
-   End time remains unchanged.

### Bottom Edge

-   Adjusts the event's **end time**.
-   Start time remains unchanged.

### Resize Behavior

-   Resize updates occur in real time while dragging.
-   Resize snaps to the calendar interval.
-   The event cannot become smaller than the minimum allowed duration.
-   The event remains within the same day while resizing.

### Collision Handling During Resize

After resizing:

-   Perform collision detection.
-   If the resized event overlaps another event:
    -   Show the existing collision notification/confirmation.
    -   Save only after user confirmation.
    -   Otherwise restore the previous duration.

------------------------------------------------------------------------

# 2. Month View (Date Grid)

Month view works differently because it represents dates rather than
hours.

## Moving Events

-   Dragging an event moves it to another date.
-   The original start and end times (for timed events) remain
    unchanged.
-   Multi-day events retain the same duration while shifting to the new
    dates.

### Collision Handling

After dropping the event:

-   Run the existing collision detection logic.
-   If a conflict exists:
    -   Notify the user using the existing confirmation flow.
    -   Save only after confirmation.
    -   Otherwise revert the move.

------------------------------------------------------------------------

## Resizing Multi-day Events

Month view supports **horizontal resizing only**.

### Left Edge

-   Changes the start date.

### Right Edge

-   Changes the end date.

### Behavior

-   No vertical resizing.
-   Event duration changes by modifying its start or end date.

### Collision Handling

After resizing:

-   Check for collisions.
-   If a collision occurs:
    -   Notify the user using the already implemented collision dialog.
    -   Save only after confirmation.
    -   Otherwise restore the previous dates.

------------------------------------------------------------------------

# 3. All-day Events

All-day events use the same interaction model as Month View.

-   Drag body → Move event to another day.
-   Drag left edge → Change start date.
-   Drag right edge → Change end date.
-   Apply the same collision confirmation workflow before saving.

------------------------------------------------------------------------

# Summary

  View      Move   Resize         Direction
  --------- ------ -------------- ------------
  Day       Yes    Top & Bottom   Vertical
  Week      Yes    Top & Bottom   Vertical
  Month     Yes    Left & Right   Horizontal
  All-day   Yes    Left & Right   Horizontal

------------------------------------------------------------------------

# Final Interaction Flow

1.  User drags or resizes an event.
2.  Update the UI in real time.
3.  On drop or resize completion, perform collision detection.
4.  If no collision exists:
    -   Save the updated event.
5.  If a collision exists:
    -   Display the application's existing collision
        notification/confirmation.
    -   If the user confirms:
        -   Save the event.
    -   If the user cancels:
        -   Restore the event to its previous state.
