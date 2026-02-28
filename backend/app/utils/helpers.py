from datetime import date


def days_since(date_str: str) -> int:
    """Parse an ISO-format date string and return the number of days elapsed."""
    surgery_date = date.fromisoformat(date_str)
    return (date.today() - surgery_date).days


def format_phone_e164(phone: str, country_code: str = "+91") -> str:
    """Strip spaces/dashes and prepend country code if missing."""
    cleaned = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if cleaned.startswith("+"):
        return cleaned
    if cleaned.startswith("0"):
        cleaned = cleaned[1:]
    return f"{country_code}{cleaned}"
