"""
Delivery date availability logic.

Kept as pure functions (no Flask, no DB) so this can be fully unit
tested in isolation before anything is wired into an API or UI — this
is deliberately the highest-risk part of the feature (date math is
easy to get subtly wrong), so it gets tested hardest.

Schema convention: restock_day_of_week uses 0=Sunday..6=Saturday
(matches the SQL CHECK constraint in add_delivery_rules.sql). Python's
built-in date.weekday() uses 0=Monday..6=Sunday — different convention,
converted explicitly below. Getting this conversion wrong was the
single most likely bug in this whole feature, so it's isolated into
one clearly-named function rather than inlined.
"""

import calendar
from datetime import date, timedelta


def _schema_dow_to_python_weekday(schema_dow):
    """Convert our schema's 0=Sunday..6=Saturday to Python's
    date.weekday() convention of 0=Monday..6=Sunday."""
    return (schema_dow - 1) % 7


def _next_occurrence_of_weekday(today, schema_dow):
    """Next date strictly AFTER today that falls on the given
    schema-convention day of week (0=Sunday..6=Saturday)."""
    target = _schema_dow_to_python_weekday(schema_dow)
    days_ahead = (target - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7  # strictly after today, not today itself
    return today + timedelta(days=days_ahead)


def _next_occurrence_of_day_of_month(today, day_of_month):
    """Next date strictly AFTER today that falls on the given day of
    the month. Clamps to the last day of a month if that day doesn't
    exist (e.g. day_of_month=31 in a 30-day month)."""
    def clamp(year, month, day):
        last_day = calendar.monthrange(year, month)[1]
        return date(year, month, min(day, last_day))

    candidate = clamp(today.year, today.month, day_of_month)
    if candidate > today:
        return candidate

    # This month's occurrence has passed (or is today) — go to next month.
    if today.month == 12:
        return clamp(today.year + 1, 1, day_of_month)
    return clamp(today.year, today.month + 1, day_of_month)


def get_earliest_delivery_date(today, in_stock, restock_cycle,
                                restock_day_of_week=None,
                                restock_day_of_month=None,
                                min_lead_days=3):
    """
    Returns the earliest valid delivery date (a date object), or None
    if there is currently no valid date at all (out of stock, no
    recurring restock cycle — fully blocked until admin intervenes).

    in_stock:            bool
    restock_cycle:        'weekly' | 'monthly' | 'none'
    restock_day_of_week:  0=Sunday..6=Saturday (used if 'weekly')
    restock_day_of_month: 1-31 (used if 'monthly')
    min_lead_days:        minimum days out, applied on top of
                           whichever base date applies
    """
    if in_stock:
        return today + timedelta(days=min_lead_days)

    if restock_cycle == "weekly":
        if restock_day_of_week is None:
            raise ValueError("restock_day_of_week is required when restock_cycle='weekly'")
        next_restock = _next_occurrence_of_weekday(today, restock_day_of_week)
        return next_restock + timedelta(days=min_lead_days)

    if restock_cycle == "monthly":
        if restock_day_of_month is None:
            raise ValueError("restock_day_of_month is required when restock_cycle='monthly'")
        next_restock = _next_occurrence_of_day_of_month(today, restock_day_of_month)
        return next_restock + timedelta(days=min_lead_days)

    # restock_cycle == 'none' and out of stock: fully blocked, no
    # recurring pattern to compute from — admin has to manually
    # update stock before any date becomes valid.
    return None
