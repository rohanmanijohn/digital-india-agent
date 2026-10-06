"""Detect Groq's daily free-tier limit so batch jobs stop cleanly instead of retrying all day."""

MAX_CONSECUTIVE_ERRORS = 5


def is_daily_limit(err: Exception) -> bool:
    msg = str(err).lower()
    return "per day" in msg or "(rpd)" in msg or "(tpd)" in msg


class QuotaGuard:
    """Call .failed(e) on each error and .ok() on each success; .stop tells the loop to end."""

    def __init__(self):
        self.consecutive = 0
        self.stop = False

    def ok(self):
        self.consecutive = 0

    def failed(self, err: Exception):
        self.consecutive += 1
        if is_daily_limit(err):
            print("[quota] Groq daily limit reached - stopping. Re-run tomorrow; finished rows are kept.", flush=True)
            self.stop = True
        elif self.consecutive >= MAX_CONSECUTIVE_ERRORS:
            print(f"[quota] {self.consecutive} errors in a row - stopping to avoid wasting quota.", flush=True)
            self.stop = True
