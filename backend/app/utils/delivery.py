import calendar
from datetime import date, timedelta


def _schema_dow_to_python_weekday(schema_dow):
    """Convert schema's 0=Sunday..6=Saturday to Python's 0=Monday..6=Sunday."""
    return (schema_dow - 1) % 7


def _next_occurrence_of_weekday(today, schema_dow):
    """Next date strictly AFTER today on the given schema day of week (0=Sun..6=Sat)."""
    target = _schema_dow_to_python_weekday(schema_dow)
    days_ahead = (target - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return today + timedelta(days=days_ahead)


def _next_occurrence_of_day_of_month(today, day_of_month):
    """Next date strictly AFTER today on the given day of month. Clamps to last day of month."""
    def clamp(year, month, day):
        last_day = calendar.monthrange(year, month)[1]
        return date(year, month, min(day, last_day))

    candidate = clamp(today.year, today.month, day_of_month)
    if candidate > today:
        return candidate
    if today.month == 12:
        return clamp(today.year + 1, 1, day_of_month)
    return clamp(today.year, today.month + 1, day_of_month)


def get_earliest_delivery_date(today, in_stock, restock_cycle,
                                restock_day_of_week=None,
                                restock_day_of_month=None,
                                min_lead_days=0,
                                order_type="delivery"):
    """
    Returns the earliest valid fulfillment date (date object), or None if blocked.

    order_type controls whether min_lead_days is applied:
      - "delivery": in_stock -> today + min_lead_days
                    out of stock -> next restock + min_lead_days
      - "pickup":   in_stock -> today (no lead time — ready as soon as the
                    order is placed)
                    out of stock -> next restock (no lead time added on
                    top — the customer picks up as soon as it's back)
    """
    lead_days = min_lead_days if order_type == "delivery" else 0

    if in_stock:
        return today + timedelta(days=lead_days)

    if restock_cycle == "weekly":
        if restock_day_of_week is None:
            raise ValueError("restock_day_of_week required for weekly cycle")
        next_restock = _next_occurrence_of_weekday(today, restock_day_of_week)
        return next_restock + timedelta(days=lead_days)

    if restock_cycle == "monthly":
        if restock_day_of_month is None:
            raise ValueError("restock_day_of_month required for monthly cycle")
        next_restock = _next_occurrence_of_day_of_month(today, restock_day_of_month)
        return next_restock + timedelta(days=lead_days)

    return None