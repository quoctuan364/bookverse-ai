import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Sparkles, Crown, ArrowRight, Flame, Bot } from "lucide-react-native";
import { COLORS } from "../config/constants";
import { Book, RootStackParamList } from "../types";
import { api } from "../services/api";
import { Header } from "../components/Header";
import { BookCard } from "../components/BookCard";
import { NovaChatModal } from "../components/NovaChatModal";
import { useAuthStore } from "../store/authStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, subscription } = useAuthStore();
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showNovaModal, setShowNovaModal] = useState(false);

  const fetchRecommendations = async () => {
    try {
      const data = await api.getAiRecommendations(user?.id);
      setRecommendations(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Header
        title="BookVerse AI"
        subtitle={`Xin chào, ${user?.name || "Độc giả"}!`}
        showAiBadge
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />
        }
      >
        {/* Membership Banner */}
        <TouchableOpacity
          style={styles.membershipCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("MainTabs", { screen: "Membership" } as never)}
        >
          <View style={styles.bannerBadge}>
            <Crown size={14} color="#f59e0b" />
            <Text style={styles.bannerBadgeText}>
              {subscription?.status === "ACTIVE" ? "HỘI VIÊN ACTIVE" : "GÓI HỘI VIÊN"}
            </Text>
          </View>
          <Text style={styles.bannerTitle}>
            {subscription?.status === "ACTIVE"
              ? "Bạn có quyền đọc toàn bộ kho Ebook không giới hạn"
              : "Mở khóa toàn bộ kho sách & Trợ lý AI"}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {subscription?.status === "ACTIVE"
              ? `Thời hạn đến ${new Date(subscription.endsAt).toLocaleDateString("vi-VN")}`
              : "Chỉ từ 59.000đ/tháng · Đọc thử 10% miễn phí mọi cuốn sách"}
          </Text>
        </TouchableOpacity>

        {/* AI Hybrid Recommendations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sparkleIcon}>
                <Sparkles size={16} color="#c084fc" />
              </View>
              <Text style={styles.sectionTitle}>Gợi ý AI Cá nhân hóa</Text>
            </View>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate("MainTabs", { screen: "Catalog" } as never)}
            >
              <Text style={styles.seeAllText}>Tất cả</Text>
              <ArrowRight size={14} color={COLORS.primaryLight} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionDescription}>
            Thuật toán Hybrid V2 kết hợp thói quen đọc sách và danh mục ưa thích của bạn.
          </Text>

          {recommendations.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onPress={() => navigation.navigate("BookDetail", { bookId: book.id })}
            />
          ))}
        </View>

        {/* Trending Shelf Section */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Flame size={18} color="#f97316" />
              <Text style={styles.sectionTitle}>Đang Thịnh Hành</Text>
            </View>
          </View>

          <View style={styles.gridContainer}>
            {recommendations.slice(0, 2).map((book) => (
              <BookCard
                key={`grid-${book.id}`}
                book={book}
                variant="grid"
                onPress={() => navigation.navigate("BookDetail", { bookId: book.id })}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Nova AI Assistant Button */}
      <TouchableOpacity
        style={styles.floatingAiBtn}
        activeOpacity={0.85}
        onPress={() => setShowNovaModal(true)}
      >
        <Bot size={22} color="#fff" />
        <Text style={styles.floatingAiText}>Nova AI</Text>
      </TouchableOpacity>

      {/* Nova AI Store Assistant Modal */}
      <NovaChatModal
        visible={showNovaModal}
        onClose={() => setShowNovaModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  membershipCard: {
    marginTop: 10,
    marginBottom: 24,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.35)",
  },
  bannerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  bannerBadgeText: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "800",
  },
  bannerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sparkleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(192, 132, 252, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionDescription: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 14,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  seeAllText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: "600",
  },
  gridContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  floatingAiBtn: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    elevation: 8,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  floatingAiText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
