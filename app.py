from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

from src.chatbot import answer_book_query
from src.config import DATA_DIR
from src.data_loader import csv_status, load_data
from src.recommender import popular_books, recommend_for_user, search_books
from src.seller_ai import score_all_listings, score_listing


st.set_page_config(
    page_title="SmartBook AI",
    page_icon="SB",
    layout="wide",
    initial_sidebar_state="expanded",
)


st.markdown(
    """
    <style>
    .main .block-container { padding-top: 1.5rem; padding-bottom: 2rem; }
    h1, h2, h3 { letter-spacing: 0; }
    .muted { color: #64748b; font-size: 0.92rem; }
    .book-title { font-weight: 700; font-size: 1.02rem; line-height: 1.35; margin-top: 0.35rem; }
    .book-meta { color: #475569; font-size: 0.88rem; line-height: 1.45; }
    .reason { color: #14532d; background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.45rem 0.6rem; font-size: 0.86rem; }
    .score-pill { display: inline-block; background: #0f172a; color: white; border-radius: 999px; padding: 0.18rem 0.55rem; font-size: 0.78rem; }
    .warning-note { color: #7c2d12; background: #ffedd5; border: 1px solid #fed7aa; border-radius: 8px; padding: 0.55rem 0.7rem; }
    div[data-testid="stMetric"] { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data(show_spinner=False)
def get_data() -> dict[str, pd.DataFrame]:
    return load_data()


def money(value: float) -> str:
    return f"{value:,.0f}đ".replace(",", ".")


def cover_file(row: pd.Series) -> Path | None:
    rel_path = str(row.get("cover_path", "")).strip()
    if not rel_path:
        return None
    path = DATA_DIR / rel_path
    return path if path.exists() else None


def render_book_card(row: pd.Series, show_score: bool = False) -> None:
    with st.container(border=True):
        image_path = cover_file(row)
        if image_path:
            st.image(str(image_path), width="stretch")
        st.markdown(f"<div class='book-title'>{row['title']}</div>", unsafe_allow_html=True)
        st.markdown(
            f"<div class='book-meta'>{row['author']}<br>{row['genre']} · {row['level']} · {money(row['price'])}<br>"
            f"Đánh giá: {row['rating']}/5 · {row['pages']} trang</div>",
            unsafe_allow_html=True,
        )
        if show_score and "score" in row:
            st.markdown(f"<span class='score-pill'>Điểm AI: {row['score']}</span>", unsafe_allow_html=True)
        if "reason" in row:
            st.markdown(f"<div class='reason'>{row['reason']}</div>", unsafe_allow_html=True)
        with st.expander("Chi tiết"):
            st.write(row.get("description", ""))
            st.write(f"Tag: {row.get('tags', '')}")
            st.write("Có ebook" if bool(row.get("is_ebook", False)) else "Sách giấy")


def render_book_grid(rows: pd.DataFrame, show_score: bool = False, limit: int = 12) -> None:
    if rows.empty:
        st.info("Không có sách phù hợp với bộ lọc hiện tại.")
        return

    rows = rows.head(limit)
    for start in range(0, len(rows), 3):
        columns = st.columns(3)
        for column, (_, row) in zip(columns, rows.iloc[start : start + 3].iterrows()):
            with column:
                render_book_card(row, show_score=show_score)


def metric_row(data: dict[str, pd.DataFrame]) -> None:
    books = data["books"]
    users = data["users"]
    orders = data["orders"]
    interactions = data["interactions"]
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Sách", len(books))
    c2.metric("Người dùng", len(users))
    c3.metric("Đơn hàng demo", len(orders))
    c4.metric("Hành vi ghi nhận", len(interactions))


def selected_user_id(users: pd.DataFrame) -> str:
    reader_users = users.loc[users["role"] == "reader"].copy()
    options = reader_users["user_id"].tolist()
    labels = {row["user_id"]: f"{row['name']} - {row['persona']}" for _, row in reader_users.iterrows()}
    return st.sidebar.selectbox("Người dùng demo", options, format_func=lambda value: labels[value])


def overview_tab(data: dict[str, pd.DataFrame], user_id: str) -> None:
    metric_row(data)
    st.subheader("Tổng quan dữ liệu")

    left, right = st.columns([1.15, 1])
    with left:
        events = data["interactions"].copy()
        events["ngày"] = events["event_time"].dt.date
        event_by_day = events.groupby("ngày").size().reset_index(name="số_hành_vi")
        st.plotly_chart(
            px.line(event_by_day, x="ngày", y="số_hành_vi", markers=True, title="Hành vi người dùng theo ngày"),
            width="stretch",
        )

    with right:
        genre_count = data["books"]["genre"].value_counts().reset_index()
        genre_count.columns = ["thể_loại", "số_sách"]
        st.plotly_chart(
            px.bar(genre_count, x="số_sách", y="thể_loại", orientation="h", title="Kho sách theo thể loại"),
            width="stretch",
        )

    st.subheader("Gợi ý nhanh hôm nay")
    render_book_grid(recommend_for_user(user_id, data, top_k=3), show_score=True, limit=3)


def catalog_tab(data: dict[str, pd.DataFrame]) -> None:
    st.subheader("Kho sách")
    books = data["books"]

    c1, c2, c3, c4 = st.columns([1.3, 1, 1, 0.8])
    keyword = c1.text_input("Tìm kiếm", placeholder="AI, Python, marketplace, kỹ năng...")
    genres = c2.multiselect("Thể loại", sorted(books["genre"].unique()))
    levels = c3.multiselect("Trình độ", sorted(books["level"].unique()))
    only_ebook = c4.toggle("Chỉ ebook")
    max_price = st.slider("Giá tối đa", 50000, 220000, 220000, step=10000)

    result = search_books(data, keyword=keyword, genres=genres, levels=levels, max_price=max_price, only_ebook=only_ebook)
    st.caption(f"Tìm thấy {len(result)} sách")
    render_book_grid(result, limit=12)


def recommender_tab(data: dict[str, pd.DataFrame], user_id: str) -> None:
    st.subheader("Gợi ý cá nhân hóa")
    mode_label = st.segmented_control(
        "Kiểu gợi ý",
        options=["Hybrid", "Content-based", "Popular"],
        default="Hybrid",
    )
    mode = {"Hybrid": "hybrid", "Content-based": "content", "Popular": "popular"}[mode_label]
    result = recommend_for_user(user_id, data, top_k=9, mode=mode)

    render_book_grid(result, show_score=True, limit=9)

    st.subheader("Giải thích điểm gợi ý")
    selected_book = st.selectbox("Sách", result["book_id"], format_func=lambda book_id: result.loc[result["book_id"] == book_id, "title"].iloc[0])
    selected = result.loc[result["book_id"] == selected_book].iloc[0]
    components = pd.DataFrame(
        {
            "thành_phần": ["Nội dung", "Hành vi", "Mua hàng", "Cộng đồng", "Phổ biến"],
            "điểm": [
                selected["content_score"],
                selected["behavior_score"],
                selected["purchase_score"],
                selected["community_score"],
                selected["popularity_score"],
            ],
        }
    )
    st.plotly_chart(px.bar(components, x="thành_phần", y="điểm", title=selected["title"]), width="stretch")
    st.dataframe(
        result[
            [
                "title",
                "genre",
                "price",
                "score",
                "content_score",
                "behavior_score",
                "purchase_score",
                "community_score",
                "popularity_score",
                "reason",
            ]
        ],
        width="stretch",
        hide_index=True,
    )


def reader_tab(data: dict[str, pd.DataFrame], user_id: str) -> None:
    st.subheader("Đọc sách online demo")
    ebooks = data["books"].loc[data["books"]["is_ebook"]].copy()
    book_id = st.selectbox("Ebook", ebooks["book_id"], format_func=lambda value: ebooks.loc[ebooks["book_id"] == value, "title"].iloc[0])
    book = ebooks.loc[ebooks["book_id"] == book_id].iloc[0]

    left, right = st.columns([0.7, 1.3])
    with left:
        image_path = cover_file(book)
        if image_path:
            st.image(str(image_path), width="stretch")
        st.metric("Số trang", int(book["pages"]))
        st.metric("Giá", money(book["price"]))

    with right:
        progress = data["reading_progress"]
        current = progress.loc[(progress["user_id"] == user_id) & (progress["book_id"] == book_id)]
        default_page = int(current["current_page"].iloc[0]) if not current.empty else 1
        page = st.slider("Trang hiện tại", 1, int(book["pages"]), default_page)
        percent = page / int(book["pages"])
        st.progress(percent, text=f"{percent:.0%} hoàn thành")
        st.markdown(f"### {book['title']}")
        st.write(book["description"])
        st.write(
            "Nội dung ebook demo: phần này mô phỏng trình đọc online, đủ để trình bày luồng lưu tiến độ, "
            "bookmark, highlight và thời gian đọc trong báo cáo."
        )
        note = st.text_area("Highlight demo", value="Đoạn này quan trọng cho phần thiết kế hệ gợi ý.", height=90)
        if note.strip():
            st.success("Highlight được giữ trong phiên demo hiện tại.")

    st.subheader("Tiến độ đọc của người dùng")
    progress_view = progress.merge(data["books"][["book_id", "title", "genre"]], on="book_id", how="left")
    progress_view = progress_view.loc[progress_view["user_id"] == user_id]
    st.dataframe(progress_view[["title", "genre", "current_page", "progress_percent", "total_minutes", "last_read_at"]], width="stretch", hide_index=True)


def community_tab(data: dict[str, pd.DataFrame]) -> None:
    st.subheader("Cộng đồng đọc sách")
    posts = data["community_posts"].merge(data["users"][["user_id", "name"]], on="user_id", how="left")
    posts = posts.merge(data["books"][["book_id", "title", "genre"]], on="book_id", how="left", suffixes=("", "_book"))

    c1, c2, c3 = st.columns(3)
    c1.metric("Bài viết", len(posts))
    c2.metric("Bị report", int((posts["reports"] > 0).sum()))
    c3.metric("Reaction", int(posts["reactions"].sum()))

    status_count = posts["status"].value_counts().reset_index()
    status_count.columns = ["trạng_thái", "số_bài"]
    st.plotly_chart(px.bar(status_count, x="trạng_thái", y="số_bài", title="Trạng thái kiểm duyệt"), width="stretch")

    st.dataframe(
        posts[["post_id", "name", "title", "genre", "reactions", "comments", "reports", "status", "created_at"]],
        width="stretch",
        hide_index=True,
    )

    st.subheader("Review sách")
    reviews = data["reviews"].merge(data["users"][["user_id", "name"]], on="user_id", how="left")
    reviews = reviews.merge(data["books"][["book_id", "title"]], on="book_id", how="left")
    st.dataframe(reviews[["name", "title", "rating", "review_text", "created_at"]], width="stretch", hide_index=True)


def chatbot_tab(data: dict[str, pd.DataFrame], user_id: str) -> None:
    st.subheader("Book Assistant")
    query = st.text_input("Nhu cầu", value="sách học AI cho người mới dưới 150k")
    response, result = answer_book_query(query, user_id, data)
    st.info(response)
    render_book_grid(result, show_score=True, limit=6)


def seller_tab(data: dict[str, pd.DataFrame]) -> None:
    st.subheader("AI hỗ trợ người bán")
    scored = score_all_listings(data)

    c1, c2, c3 = st.columns(3)
    c1.metric("Listing", len(scored))
    c2.metric("Điểm TB", f"{scored['quality_score'].mean():.1f}/100")
    c3.metric("Cần cải thiện", int((scored["quality_score"] < 65).sum()))

    listing_options = data["listings"]["listing_id"].tolist()
    listing_id = st.selectbox("Bài đăng", listing_options)
    listing = data["listings"].loc[data["listings"]["listing_id"] == listing_id].iloc[0]
    book = data["books"].loc[data["books"]["book_id"] == listing["book_id"]].iloc[0]
    scored_one = score_listing(listing, book)

    left, right = st.columns([0.8, 1.2])
    with left:
        image_path = cover_file(book)
        if image_path:
            st.image(str(image_path), width="stretch")
        st.metric("Quality Score", f"{scored_one['quality_score']}/100")
        st.metric("Mức", scored_one["quality_level"])
    with right:
        st.write(f"**{listing['title']}**")
        st.write(listing["description"])
        st.write(f"Tag: {listing['tags']}")
        st.write(f"Giá bán: {money(listing['price'])}")
        st.write(f"Lượt xem: {listing['views']} · Thêm giỏ: {listing['cart_adds']} · Mua: {listing['purchases']}")
        for suggestion in scored_one["suggestions"]:
            st.markdown(f"<div class='warning-note'>{suggestion}</div>", unsafe_allow_html=True)

    st.subheader("Bảng chất lượng listing")
    st.dataframe(scored, width="stretch", hide_index=True)


def dashboard_tab(data: dict[str, pd.DataFrame], user_id: str) -> None:
    st.subheader("Dashboard quản trị")
    metric_row(data)

    events = data["interactions"].copy()
    event_count = events["event_type"].value_counts().reset_index()
    event_count.columns = ["hành_vi", "số_lượt"]

    orders = data["orders"].copy()
    orders["ngày"] = orders["created_at"].dt.date
    revenue = orders.groupby("ngày")["total_amount"].sum().reset_index()

    top_books = events.groupby("book_id").size().reset_index(name="tương_tác")
    top_books = top_books.merge(data["books"][["book_id", "title", "genre"]], on="book_id", how="left")
    top_books = top_books.sort_values("tương_tác", ascending=False).head(10)

    c1, c2 = st.columns(2)
    with c1:
        st.plotly_chart(px.bar(event_count, x="hành_vi", y="số_lượt", title="Phân bố hành vi"), width="stretch")
        st.plotly_chart(px.bar(top_books, x="tương_tác", y="title", color="genre", orientation="h", title="Top sách theo tương tác"), width="stretch")
    with c2:
        st.plotly_chart(px.line(revenue, x="ngày", y="total_amount", markers=True, title="Doanh thu demo theo ngày"), width="stretch")
        quality = score_all_listings(data)
        st.plotly_chart(px.histogram(quality, x="quality_score", nbins=8, title="Phân bố điểm chất lượng listing"), width="stretch")

    st.subheader("Hiệu quả gợi ý cho người đang chọn")
    recs = recommend_for_user(user_id, data, top_k=10)
    st.dataframe(recs[["title", "genre", "score", "reason"]], width="stretch", hide_index=True)


def main() -> None:
    data = get_data()
    users = data["users"]
    user_id = selected_user_id(users)
    user = users.loc[users["user_id"] == user_id].iloc[0]

    st.sidebar.title("SmartBook AI")
    st.sidebar.caption(f"Dữ liệu CSV: {DATA_DIR}")
    with st.sidebar.expander("Trạng thái CSV"):
        st.dataframe(csv_status(), width="stretch", hide_index=True)
    if st.sidebar.button("Nạp lại dữ liệu"):
        st.cache_data.clear()
        st.rerun()

    st.title("Nền tảng sách điện tử thông minh")
    st.caption(f"Người dùng: {user['name']} · {user['persona']}")

    tabs = st.tabs(
        [
            "Tổng quan",
            "Kho sách",
            "Gợi ý AI",
            "Đọc online",
            "Cộng đồng",
            "Book Assistant",
            "Người bán",
            "Dashboard",
        ]
    )

    with tabs[0]:
        overview_tab(data, user_id)
    with tabs[1]:
        catalog_tab(data)
    with tabs[2]:
        recommender_tab(data, user_id)
    with tabs[3]:
        reader_tab(data, user_id)
    with tabs[4]:
        community_tab(data)
    with tabs[5]:
        chatbot_tab(data, user_id)
    with tabs[6]:
        seller_tab(data)
    with tabs[7]:
        dashboard_tab(data, user_id)


if __name__ == "__main__":
    main()
