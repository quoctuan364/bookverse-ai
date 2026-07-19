"""Phạm vi candidate: tách catalog synthetic khỏi metadata thư mục tuyển chọn."""


def build_synthetic_catalog_predicate(table_alias: str, has_source_metadata: bool) -> str:
    if not table_alias.replace("_", "").isalnum():
        raise ValueError("Table alias không hợp lệ.")
    if not has_source_metadata:
        return "TRUE"
    return (
        'NOT EXISTS (SELECT 1 FROM book_source_metadata bsm '
        f'WHERE bsm."bookId" = {table_alias}.id)'
    )
