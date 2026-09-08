import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Book as BookIcon,
  Star,
  BookOpen,
  ArrowLeft,
  Crown,
  Share2,
  CheckCircle,
} from "lucide-react-native";
import { COLORS } from "../config/constants";
import { Book, RootStackParamList } from "../types";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";

type RouteProps = RouteProp<RootStackParamList, "BookDetail">;
type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

export function BookDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { bookId } = route.params;
  const { subscription } = useAuthStore();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      const data = await api.getBookDetail(bookId);
      setBook(data);
      setLoading(false);
    };
    fetchDetail();
  }, [bookId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Không tìm thấy thông tin sách.</Text>
      </View>
    );
  }

  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(book.price);

  const hasActiveMembership = subscription?.status === "ACTIVE";

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <Share2 size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Book Cover Hero */}
        <View style={styles.coverHero}>
          <View style={styles.coverCard}>
            <BookIcon size={64} color={COLORS.primaryLight} />
          </View>
        </View>

        {/* Book Details */}
        <View style={styles.detailsContainer}>
          {book.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{book.category.name}</Text>
            </View>
          ) : null}

          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>Tác giả: {book.authorName}</Text>

          <View style={styles.statsRow}>
            {book.rating ? (
              <View style={styles.statItem}>
                <Star size={16} color="#fbbf24" fill="#fbbf24" />
                <Text style={styles.statValue}>{book.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Đánh giá</Text>
              </View>
            ) : null}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Tiếng Việt</Text>
              <Text style={styles.statLabel}>Ngôn ngữ</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Ebook</Text>
              <Text style={styles.statLabel}>Định dạng</Text>
            </View>
          </View>

          {/* Access Status Banner */}
          <View style={styles.accessBanner}>
            <CheckCircle size={18} color={hasActiveMembership ? COLORS.secondary : COLORS.accent} />
            <Text style={styles.accessBannerText}>
              {hasActiveMembership
                ? "Quyền Hội Viên: Bạn được đọc trọn vẹn toàn bộ cuốn sách"
                : "Bản Đọc Thử: Xem miễn phí 10% dung lượng sách"}
            </Text>
          </View>

          {/* Description */}
          <Text style={styles.sectionHeading}>Giới thiệu nội dung</Text>
          <Text style={styles.description}>
            {book.description || "Nội dung cuốn sách đang được cập nhật..."}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Giá Ebook:</Text>
          <Text style={styles.priceValue}>{formattedPrice}</Text>
        </View>

        <TouchableOpacity
          style={styles.readNowBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Reader", { bookId: book.id })}
        >
          <BookOpen size={18} color="#fff" />
          <Text style={styles.readNowText}>
            {hasActiveMembership ? "Đọc Ngay (Hội viên)" : "Đọc Thử (10%)"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollContent: {
    flex: 1,
  },
  coverHero: {
    alignItems: "center",
    paddingVertical: 20,
  },
  coverCard: {
    width: 140,
    height: 200,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  categoryText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
    lineHeight: 28,
  },
  author: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  accessBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surfaceLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accessBannerText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  sectionHeading: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceContainer: {
    justifyContent: "center",
  },
  priceLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  priceValue: {
    color: COLORS.secondary,
    fontSize: 18,
    fontWeight: "800",
  },
  readNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  readNowText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
