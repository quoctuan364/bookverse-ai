import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Sparkles, X, Send, BookOpen, Quote } from "lucide-react-native";
import { COLORS } from "../config/constants";
import { api, RagResponse } from "../services/api";

interface AiReaderModalProps {
  visible: boolean;
  bookId: string;
  bookTitle: string;
  currentChapter: number;
  onClose: () => void;
}

export function AiReaderModal({
  visible,
  bookId,
  bookTitle,
  currentChapter,
  onClose,
}: AiReaderModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RagResponse | null>(null);

  const handleAsk = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    try {
      const response = await api.askReaderRag(bookId, query.trim(), currentChapter);
      setResult(response);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "Tóm tắt ý chính của chương này?",
    "Nguyên tắc ứng xử quan trọng nhất là gì?",
    "Tác giả đưa ra ví dụ thực tế nào?",
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <View style={styles.iconBadge}>
                <Sparkles size={16} color="#c084fc" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Trợ lý AI Đọc sách</Text>
                <Text numberOfLines={1} style={styles.headerSubtitle}>
                  {bookTitle} · Chương {currentChapter}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {result ? (
              <View style={styles.responseContainer}>
                <Text style={styles.answerText}>{result.answer}</Text>

                {result.citations.length > 0 ? (
                  <View style={styles.citationsSection}>
                    <View style={styles.citationHeaderRow}>
                      <Quote size={13} color="#38bdf8" />
                      <Text style={styles.citationHeading}>Nguồn trích dẫn trong sách:</Text>
                    </View>
                    {result.citations.map((item, idx) => (
                      <View key={idx} style={styles.citationBadge}>
                        <BookOpen size={12} color="#38bdf8" />
                        <Text style={styles.citationText}>
                          Chương {item.chapterNumber}
                          {item.pageNumber ? `, Trang ${item.pageNumber}` : ""}
                          {item.chapterTitle ? ` · ${item.chapterTitle}` : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.askAgainBtn}
                  onPress={() => setResult(null)}
                >
                  <Text style={styles.askAgainText}>Đặt câu hỏi khác</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.promptContainer}>
                <Text style={styles.promptTitle}>Gợi ý câu hỏi nhanh:</Text>
                {sampleQuestions.map((q, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.sampleChip}
                    onPress={() => {
                      setQuery(q);
                    }}
                  >
                    <Text style={styles.sampleText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Input Footer */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Hỏi bất kỳ điều gì về nội dung cuốn sách..."
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleAsk}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!query.trim() || loading) && styles.sendBtnDisabled]}
              disabled={!query.trim() || loading}
              onPress={handleAsk}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "75%",
    padding: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(192, 132, 252, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
    maxWidth: 240,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    flex: 1,
  },
  promptContainer: {
    paddingVertical: 10,
  },
  promptTitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 10,
  },
  sampleChip: {
    backgroundColor: COLORS.surfaceLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sampleText: {
    color: COLORS.text,
    fontSize: 14,
  },
  responseContainer: {
    paddingVertical: 10,
  },
  answerText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 24,
  },
  citationsSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  citationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  citationHeading: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "700",
  },
  citationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 2,
  },
  citationText: {
    color: "#bae6fd",
    fontSize: 12,
  },
  askAgainBtn: {
    alignSelf: "center",
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
  },
  askAgainText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
