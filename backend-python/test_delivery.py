from datetime import date
from delivery import get_earliest_delivery_date, _next_occurrence_of_weekday, _next_occurrence_of_day_of_month

failures = []

def check(label, actual, expected):
    status = "PASS" if actual == expected else "FAIL"
    if status == "FAIL":
        failures.append(label)
    print(f"[{status}] {label}: got {actual}, expected {expected}")


# ============================================================
# Sanity check: schema_dow -> Python weekday conversion.
# 2026-07-30 is a Thursday (verified against a real calendar).
# ============================================================
THURSDAY = date(2026, 7, 30)
print(f"Reference date: {THURSDAY} is a {THURSDAY.strftime('%A')}")
assert THURSDAY.strftime("%A") == "Thursday"

# Next Wednesday (schema_dow=3) after a Thursday should be 6 days out (Aug 5).
check(
    "next Wednesday after Thursday",
    _next_occurrence_of_weekday(THURSDAY, 3),
    date(2026, 8, 5),
)

# ============================================================
# The exact mentor scenario: Henna, weekly restock on Wednesday,
# 3-day lead time, currently OUT OF STOCK, today is Thursday.
# Expected: next Wednesday (Aug 5) + 3 days = Aug 8.
# ============================================================
check(
    "Henna: out of stock, Thursday, weekly/Wednesday, 3-day lead",
    get_earliest_delivery_date(THURSDAY, in_stock=False, restock_cycle="weekly",
                                restock_day_of_week=3, min_lead_days=3),
    date(2026, 8, 8),
)

# ============================================================
# Same product, but IN STOCK — should just be today + lead time,
# ignoring the restock cycle entirely (matches "if available, can
# deliver around 3+ days" from the mentor's description).
# ============================================================
check(
    "Henna: in stock, Thursday, 3-day lead",
    get_earliest_delivery_date(THURSDAY, in_stock=True, restock_cycle="weekly",
                                restock_day_of_week=3, min_lead_days=3),
    date(2026, 8, 2),
)

# ============================================================
# Edge case: today IS the restock day itself. Should NOT return
# today — must go to next week's occurrence (out of stock still
# means out of stock today, restock hasn't happened yet this instant).
# ============================================================
WEDNESDAY = date(2026, 8, 5)
check(
    "restock day = today, should skip to NEXT week",
    _next_occurrence_of_weekday(WEDNESDAY, 3),
    date(2026, 8, 12),
)

# ============================================================
# Monthly cycle: Turmeric, restocks 1st of month, 5-day lead,
# out of stock. From July 30, next 1st is Aug 1.
# ============================================================
check(
    "Turmeric: monthly (1st), out of stock, from Jul 30",
    get_earliest_delivery_date(THURSDAY, in_stock=False, restock_cycle="monthly",
                                restock_day_of_month=1, min_lead_days=5),
    date(2026, 8, 6),  # Aug 1 + 5 days
)

# ============================================================
# Monthly edge case: restock day already passed this month —
# should roll to NEXT month, not stay stuck in the past.
# From Aug 15, restock day = 1st -> next occurrence is Sep 1.
# ============================================================
check(
    "monthly: this month's day already passed, rolls to next month",
    _next_occurrence_of_day_of_month(date(2026, 8, 15), 1),
    date(2026, 9, 1),
)

# ============================================================
# Monthly edge case: day 31 in a month that doesn't have 31 days.
# From Sep 5 (Sep has 30 days), day_of_month=31 should clamp to
# Sep 30 (still in the future relative to Sep 5).
# ============================================================
check(
    "monthly: day 31 clamped in a 30-day month",
    _next_occurrence_of_day_of_month(date(2026, 9, 5), 31),
    date(2026, 9, 30),
)

# ============================================================
# Monthly edge case: December -> January year rollover.
# From Dec 15, restock day = 1st -> next occurrence is Jan 1 of
# the FOLLOWING year, not Dec (already passed) or invalid.
# ============================================================
check(
    "monthly: December to January year rollover",
    _next_occurrence_of_day_of_month(date(2026, 12, 15), 1),
    date(2027, 1, 1),
)

# ============================================================
# No recurring cycle, out of stock -> fully blocked (None), not a
# guessed date. This is the "admin must manually update" case.
# ============================================================
check(
    "no cycle, out of stock -> None (fully blocked)",
    get_earliest_delivery_date(THURSDAY, in_stock=False, restock_cycle="none"),
    None,
)

print()
if failures:
    print(f"{len(failures)} TEST(S) FAILED: {failures}")
    exit(1)
else:
    print("ALL TESTS PASSED")
