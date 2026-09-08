import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Sparkles, Bell } from "lucide-react-native";
import { COLORS } from "../config/constants";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showAiBadge?: boolean;
}

export function Header({ title = "BookVerse AI", subtitle, showAiBadge = true }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {showAiBadge ? (
            <View style={styles.aiBadge}>
              <Sparkles size={12} color="#a855f7" />
              <Text style={styles.aiText}>AI</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
        <Bell size={20} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.4)",
  },
  aiText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#d8b4fe",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
