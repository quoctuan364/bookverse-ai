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


def build_recommendation_catalog_predicate(
    table_alias: str,
    has_source_metadata: bool,
) -> str:
    """Chọn đúng catalog mà giao diện đang phục vụ để tạo gợi ý.

    Khi bảng metadata đã tồn tại, các sách có metadata là catalog thật (mã RB)
    đã được import. Nếu vẫn loại nhóm này như pipeline synthetic cũ thì mọi hành
    vi đọc trên website sẽ biến mất khỏi mô hình và ba người dùng nhận cùng một
    danh sách popularity. Database cũ chưa có bảng metadata vẫn giữ tương thích.
    """
    if not table_alias.replace("_", "").isalnum():
        raise ValueError("Table alias không hợp lệ.")
    if not has_source_metadata:
        return "TRUE"
    return (
        'EXISTS (SELECT 1 FROM book_source_metadata bsm '
        f'WHERE bsm."bookId" = {table_alias}.id)'
    )
