-- Migration: 20260923122000_remove_empty_seller_profile
-- Mục đích: Loại bỏ bảng seller_profiles trống để giữ kiến trúc tối giản và đúng nghiệp vụ: User sở hữu trực tiếp Listings và Profile mà không cần bảng phụ

DROP TABLE IF EXISTS "seller_profiles" CASCADE;
