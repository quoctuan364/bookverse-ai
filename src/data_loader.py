import pandas as pd

from .config import DATA_DIR, REQUIRED_CSV
from .sample_data import generate_demo_data


DATE_COLUMNS = {
    "interactions": ["event_time"],
    "orders": ["created_at"],
    "reviews": ["created_at"],
    "listings": ["created_at"],
    "community_posts": ["created_at"],
    "reading_progress": ["last_read_at"],
}


def ensure_demo_data() -> list[str]:
    """Tự sinh CSV demo nếu thiếu file, không ghi đè file đã tồn tại."""
    missing = [filename for filename in REQUIRED_CSV.values() if not (DATA_DIR / filename).exists()]
    if missing:
        generate_demo_data(overwrite=False)
    return missing


def load_data() -> dict[str, pd.DataFrame]:
    ensure_demo_data()
    data: dict[str, pd.DataFrame] = {}

    for key, filename in REQUIRED_CSV.items():
        path = DATA_DIR / filename
        data[key] = pd.read_csv(path, encoding="utf-8-sig")

    for key, columns in DATE_COLUMNS.items():
        for column in columns:
            if column in data[key].columns:
                data[key][column] = pd.to_datetime(data[key][column], errors="coerce")

    if "is_ebook" in data["books"].columns:
        data["books"]["is_ebook"] = data["books"]["is_ebook"].astype(bool)
    if "has_cover" in data["listings"].columns:
        data["listings"]["has_cover"] = data["listings"]["has_cover"].astype(bool)

    return data


def csv_status() -> pd.DataFrame:
    rows = []
    for key, filename in REQUIRED_CSV.items():
        path = DATA_DIR / filename
        rows.append(
            {
                "nhóm_dữ_liệu": key,
                "file": filename,
                "đường_dẫn": str(path),
                "trạng_thái": "có" if path.exists() else "thiếu",
            }
        )
    return pd.DataFrame(rows)

