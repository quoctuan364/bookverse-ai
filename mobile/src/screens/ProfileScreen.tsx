import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  User as UserIcon,
  Flame,
  Clock,
  BookOpen,
  Bookmark,
  LogOut,
  ChevronRight,
  Shield,
  HelpCircle,
} from "lucide-react-native";
import { COLORS } from "../config/constants";
import { useAuthStore } from "../store/authStore";

export function ProfileScreen() {
  const { user, subscription, logout } = useAuthStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Header */}
      <View style={styles.profileHero}>
        <View style={styles.avatarCircle}>
          <UserIcon size={36} color={COLORS.primaryLight} />
        </View>
        <Text style={styles.userName}>{user?.name || "Độc giả"}</Text>
        <Text style={styles.userEmail}>{user?.email || "reader@bookverse.ai"}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || "BUYER"}</Text>
        </View>
      </View>

      {/* Reading Insights & Streak Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Flame size={20} color="#f97316" />
          <Text style={styles.statNumber}>{user?.streakDays || 7} ngày</Text>
          <Text style={styles.statLabel}>Streak đọc</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Clock size={20} color="#38bdf8" />
          <Text style={styles.statNumber}>{user?.dailyGoalMinutes || 30} phút</Text>
          <Text style={styles.statLabel}>Mục tiêu/ngày</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <BookOpen size={20} color="#10b981" />
          <Text style={styles.statNumber}>12 cuốn</Text>
          <Text style={styles.statLabel}>Đã đọc</Text>
        </View>
      </View>

      {/* Menu Options */}
      <Text style={styles.menuSectionTitle}>Tài khoản & Dữ liệu</Text>

      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Bookmark size={18} color={COLORS.text} />
            <Text style={styles.menuItemText}>Dấu trang & Ghi chú</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Shield size={18} color={COLORS.text} />
            <Text style={styles.menuItemText}>Đồng thuận nghiên cứu (Consent v1)</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <HelpCircle size={18} color={COLORS.text} />
            <Text style={styles.menuItemText}>Trợ giúp & Hỗ trợ</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <LogOut size={18} color="#ef4444" />
        <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>BookVerse AI Mobile · Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileHero: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 8,
  },
  roleText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: "700",
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
  menuSectionTitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 46,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    marginBottom: 20,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
  },
});
