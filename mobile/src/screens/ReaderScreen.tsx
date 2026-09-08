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
  ArrowLeft,
  Bookmark,
  Sparkles,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Sun,
  Moon,
  Coffee,
} from "lucide-react-native";
import { COLORS, READER_THEMES } from "../config/constants";
import { RootStackParamList, ReaderBookContent } from "../types";
import { api } from "../services/api";
import { useReaderStore } from "../store/readerStore";
import { useAuthStore } from "../store/authStore";
import { AiReaderModal } from "../components/AiReaderModal";

type RouteProps = RouteProp<RootStackParamList, "Reader">;
type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

export function ReaderScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { bookId } = route.params;
  const { token, subscription } = useAuthStore();
  const {
    theme,
    fontSize,
    setTheme,
    setFontSize,
    toggleBookmark,
    isBookmarked,
  } = useReaderStore();

  const [content, setContent] = useState<ReaderBookContent | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      const data = await api.getReaderContent(bookId, token || undefined);
      setContent(data);
      setLoading(false);
    };
    fetchContent();
  }, [bookId, token]);

  const activeTheme = READER_THEMES[theme];
  const currentPage = content?.pages[currentPageIndex];
  const totalPages = content?.pages.length || 0;
  const currentChapterNumber = currentPage?.chapterNumber || 1;
  const bookmarked = isBookmarked(bookId, currentPageIndex + 1);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      {/* Reader Top Bar */}
      <View style={[styles.topBar, { backgroundColor: activeTheme.uiBackground, borderColor: activeTheme.border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={activeTheme.text} />
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text numberOfLines={1} style={[styles.bookTitle, { color: activeTheme.text }]}>
            {currentPage?.chapterTitle || "Trình đọc Ebook"}
          </Text>
          <Text style={[styles.pageIndicator, { color: activeTheme.text }]}>
            Trang {currentPageIndex + 1} / {totalPages}
            {content?.access === "PREVIEW" ? " (Đọc thử 10%)" : ""}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => toggleBookmark(bookId, currentPageIndex + 1)}
          >
            <Bookmark
              size={20}
              color={bookmarked ? "#f59e0b" : activeTheme.text}
              fill={bookmarked ? "#f59e0b" : "transparent"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, styles.aiFloatingBtn]}
            onPress={() => setShowAiModal(true)}
          >
            <Sparkles size={18} color="#c084fc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowSettings(!showSettings)}
          >
            <Settings2 size={20} color={activeTheme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Reader Settings Drawer */}
      {showSettings ? (
        <View style={[styles.settingsPanel, { backgroundColor: activeTheme.uiBackground, borderColor: activeTheme.border }]}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: activeTheme.text }]}>Giao diện đọc:</Text>
            <View style={styles.themeToggleRow}>
              <TouchableOpacity
                style={[styles.themeBtn, theme === "sepia" && styles.themeBtnActive]}
                onPress={() => setTheme("sepia")}
              >
                <Coffee size={16} color="#d97706" />
                <Text style={styles.themeBtnText}>Sepia</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeBtn, theme === "dark" && styles.themeBtnActive]}
                onPress={() => setTheme("dark")}
              >
                <Moon size={16} color="#818cf8" />
                <Text style={styles.themeBtnText}>Dark</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeBtn, theme === "light" && styles.themeBtnActive]}
                onPress={() => setTheme("light")}
              >
                <Sun size={16} color="#eab308" />
                <Text style={styles.themeBtnText}>Light</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: activeTheme.text }]}>Cỡ chữ: {fontSize}px</Text>
            <View style={styles.fontSizeControls}>
              <TouchableOpacity
                style={styles.fontAdjustBtn}
                onPress={() => setFontSize(fontSize - 2)}
              >
                <Text style={styles.fontAdjustText}>A-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fontAdjustBtn}
                onPress={() => setFontSize(fontSize + 2)}
              >
                <Text style={styles.fontAdjustText}>A+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {/* Page Content ScrollView */}
      <ScrollView
        style={styles.contentScrollView}
        contentContainerStyle={styles.textContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Paywall Notice Banner for 10% preview */}
        {content?.access === "PREVIEW" && currentPageIndex === 0 ? (
          <View style={styles.previewNotice}>
            <Text style={styles.previewNoticeText}>
              📖 {content.sourceLabel} · Mua gói hội viên để đọc trọn vẹn toàn bộ sách.
            </Text>
          </View>
        ) : null}

        <Text
          style={[
            styles.bookContentText,
            {
              color: activeTheme.text,
              fontSize: fontSize,
              lineHeight: fontSize * 1.65,
            },
          ]}
        >
          {currentPage?.content || "Không có nội dung cho trang này."}
        </Text>

        {/* End of Preview Paywall Notice */}
        {content?.access === "PREVIEW" && currentPageIndex === totalPages - 1 ? (
          <View style={styles.paywallBlock}>
            <Lock size={28} color="#f59e0b" />
            <Text style={styles.paywallTitle}>Bạn đã đọc hết 10% bản đọc thử</Text>
            <Text style={styles.paywallSubtitle}>
              Các chương tiếp theo đã bị khóa. Hãy đăng ký gói hội viên để tiếp tục đọc không giới hạn.
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => navigation.navigate("MainTabs", { screen: "Membership" } as never)}
            >
              <Text style={styles.upgradeBtnText}>Nâng cấp Hội Viên (Từ 59.000đ)</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Page Navigation Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: activeTheme.uiBackground, borderColor: activeTheme.border }]}>
        <TouchableOpacity
          style={[styles.navBtn, currentPageIndex === 0 && styles.navBtnDisabled]}
          disabled={currentPageIndex === 0}
          onPress={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
        >
          <ChevronLeft size={20} color={currentPageIndex === 0 ? "#71717a" : activeTheme.text} />
          <Text style={[styles.navBtnText, { color: currentPageIndex === 0 ? "#71717a" : activeTheme.text }]}>
            Trang trước
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.aiAskPromptBtn}
          onPress={() => setShowAiModal(true)}
        >
          <Sparkles size={14} color="#c084fc" />
          <Text style={styles.aiAskPromptText}>Hỏi AI đoạn này</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, currentPageIndex >= totalPages - 1 && styles.navBtnDisabled]}
          disabled={currentPageIndex >= totalPages - 1}
          onPress={() => setCurrentPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
        >
          <Text style={[styles.navBtnText, { color: currentPageIndex >= totalPages - 1 ? "#71717a" : activeTheme.text }]}>
            Trang sau
          </Text>
          <ChevronRight size={20} color={currentPageIndex >= totalPages - 1 ? "#71717a" : activeTheme.text} />
        </TouchableOpacity>
      </View>

      {/* AI Reader Assistant Modal */}
      <AiReaderModal
        visible={showAiModal}
        bookId={bookId}
        bookTitle={content?.chapters[0]?.chapterTitle || "Sách BookVerse"}
        currentChapter={currentChapterNumber}
        onClose={() => setShowAiModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  titleWrapper: {
    flex: 1,
    paddingHorizontal: 10,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  pageIndicator: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  aiFloatingBtn: {
    backgroundColor: "rgba(192, 132, 252, 0.15)",
  },
  settingsPanel: {
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  themeToggleRow: {
    flexDirection: "row",
    gap: 6,
  },
  themeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  themeBtnActive: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  fontSizeControls: {
    flexDirection: "row",
    gap: 8,
  },
  fontAdjustBtn: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  fontAdjustText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  contentScrollView: {
    flex: 1,
  },
  textContainer: {
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  previewNotice: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  previewNoticeText: {
    color: "#d97706",
    fontSize: 12,
    fontWeight: "600",
  },
  bookContentText: {
    textAlign: "justify",
    letterSpacing: 0.2,
  },
  paywallBlock: {
    marginTop: 32,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paywallTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
  },
  paywallSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  upgradeBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  aiAskPromptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(192, 132, 252, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aiAskPromptText: {
    color: "#d8b4fe",
    fontSize: 12,
    fontWeight: "700",
  },
});
