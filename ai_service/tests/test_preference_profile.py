from ai_service.preference_profile import build_declared_category_scores


def test_technology_profile_expands_to_real_catalog_keys() -> None:
    scores = build_declared_category_scores(["Lập trình", "Công nghệ"])

    assert scores["technology"] > 0
    assert scores["artificial-intelligence"] > 0
    assert scores["data-science"] > 0


def test_business_profile_includes_personal_finance() -> None:
    scores = build_declared_category_scores(["Kinh doanh", "Khởi nghiệp"])

    assert scores["business"] > 0
    assert scores["personal-finance"] > 0
    assert "literature" not in scores


def test_literature_profile_includes_mystery() -> None:
    scores = build_declared_category_scores(["Tiểu thuyết", "Văn học"])

    assert scores["literature"] > 0
    assert scores["mystery"] > 0
