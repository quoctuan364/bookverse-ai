import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Book as BookIcon, Star, Sparkles } from "lucide-react-native";
import { Book } from "../types";
import { COLORS } from "../config/constants";

interface BookCardProps {
  book: Book;
  onPress: () => void;
  variant?: "horizontal" | "grid";
}

export function BookCard({ book, onPress, variant = "horizontal" }: BookCardProps) {
  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(book.price);

  if (variant === "grid") {
    return (
      <TouchableOpacity style={styles.gridCard} activeOpacity={0.8} onPress={onPress}>
        <View style={styles.gridCoverPlaceholder}>
          <BookIcon size={36} color={COLORS.primaryLight} />
        </View>
        <View style={styles.gridInfo}>
          <Text numberOfLines={1} style={styles.gridTitle}>
            {book.title}
          </Text>
          <Text numberOfLines={1} style={styles.gridAuthor}>
            {book.authorName}
          </Text>
          <View style={styles.priceRatingRow}>
            <Text style={styles.price}>{formattedPrice}</Text>
            {book.rating ? (
              <View style={styles.ratingBadge}>
                <Star size={12} color="#fbbf24" fill="#fbbf24" />
                <Text style={styles.ratingText}>{book.rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.horizontalCard} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.coverPlaceholder}>
        <BookIcon size={32} color={COLORS.primaryLight} />
      </View>
      <View style={styles.infoContainer}>
        {book.evidence ? (
          <View style={styles.evidenceBadge}>
            <Sparkles size={11} color="#c084fc" />
            <Text numberOfLines={1} style={styles.evidenceText}>
              {book.evidence}
            </Text>
          </View>
        ) : book.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{book.category.name}</Text>
          </View>
        ) : null}

        <Text numberOfLines={1} style={styles.title}>
          {book.title}
        </Text>
        <Text numberOfLines={1} style={styles.author}>
          {book.authorName}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.price}>{formattedPrice}</Text>
          {book.rating ? (
            <View style={styles.ratingBadge}>
              <Star size={12} color="#fbbf24" fill="#fbbf24" />
              <Text style={styles.ratingText}>{book.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  horizontalCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  coverPlaceholder: {
    width: 68,
    height: 96,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  author: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  evidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6,
    gap: 4,
  },
  evidenceText: {
    color: "#d8b4fe",
    fontSize: 11,
    fontWeight: "600",
  },
  categoryBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  categoryText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: "700",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    color: "#fef08a",
    fontSize: 12,
    fontWeight: "600",
  },

  // Grid styles
  gridCard: {
    width: "48%",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridCoverPlaceholder: {
    width: "100%",
    height: 140,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  gridInfo: {
    flex: 1,
  },
  gridTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  gridAuthor: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  priceRatingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
