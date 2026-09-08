import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, X, Filter } from "lucide-react-native";
import { COLORS } from "../config/constants";
import { Book, RootStackParamList } from "../types";
import { api } from "../services/api";
import { BookCard } from "../components/BookCard";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  { id: "all", name: "Tất cả" },
  { id: "ky-nang-song", name: "Kỹ năng sống" },
  { id: "van-hoc", name: "Văn học" },
  { id: "tam-ly-hoc", name: "Tâm lý học" },
  { id: "kinh-te", name: "Kinh tế" },
  { id: "cong-nghe", name: "Công nghệ" },
];

export function CatalogScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBooks = async (q: string, cat: string) => {
    setLoading(true);
    try {
      const data = await api.searchBooks(q, cat === "all" ? "" : cat);
      if (data.length === 0) {
        // Fallback demo data if backend search empty
        const fallback = await api.getAiRecommendations();
        setBooks(
          cat === "all"
            ? fallback
            : fallback.filter((b) => b.category?.slug === cat)
        );
      } else {
        setBooks(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks(query, selectedCategory);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, selectedCategory]);

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Kho Sách BookVerse</Text>
        <View style={styles.searchBar}>
          <Search size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Tìm theo tên sách, tác giả..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <X size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Book List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.bookList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <BookCard
              book={item}
              onPress={() => navigation.navigate("BookDetail", { bookId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Filter size={40} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Không tìm thấy sách phù hợp</Text>
              <Text style={styles.emptySubtitle}>Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  categoryContainer: {
    marginBottom: 8,
  },
  categoryList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  bookList: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
});
