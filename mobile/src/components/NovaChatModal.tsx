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
import { Bot, X, Send, Sparkles, User } from "lucide-react-native";
import { COLORS, API_BASE_URL } from "../config/constants";

interface NovaMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface NovaChatModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NovaChatModal({ visible, onClose }: NovaChatModalProps) {
  const [messages, setMessages] = useState<NovaMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Xin chào! Tôi là Nova - Trợ lý AI của nhà sách BookVerse. Tôi có thể giúp bạn tìm sách theo sở thích, tra cứu gói hội viên hoặc giải đáp chính sách nhà sách.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: NovaMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input.trim();
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: data.answer || "Rất tiếc, tôi chưa tìm thấy câu trả lời phù hợp.",
          },
        ]);
      } else {
        throw new Error("Chat API failed");
      }
    } catch {
      // Fallback grounded answer
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content:
            "BookVerse AI hỗ trợ đọc thử 10% mọi đầu sách miễn phí. Bạn có thể đăng ký Gói Hội Viên để đọc không giới hạn toàn bộ kho Ebook và sử dụng Trợ lý đọc sách RAG.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.botIconCircle}>
                <Bot size={18} color="#818cf8" />
              </View>
              <View>
                <Text style={styles.title}>Nova · Trợ lý BookVerse</Text>
                <Text style={styles.subtitle}>Sẵn sàng hỗ trợ 24/7</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Chat Messages */}
          <ScrollView
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => {
              const isAi = msg.role === "assistant";
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubbleRow,
                    isAi ? styles.messageLeft : styles.messageRight,
                  ]}
                >
                  {isAi ? (
                    <View style={styles.msgAvatar}>
                      <Sparkles size={12} color="#c084fc" />
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.bubble,
                      isAi ? styles.bubbleAi : styles.bubbleUser,
                    ]}
                  >
                    <Text style={[styles.bubbleText, isAi ? styles.textAi : styles.textUser]}>
                      {msg.content}
                    </Text>
                  </View>
                </View>
              );
            })}
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={COLORS.primaryLight} />
                <Text style={styles.loadingText}>Nova đang suy nghĩ...</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Quick suggestions */}
          <View style={styles.suggestionRow}>
            <TouchableOpacity
              style={styles.suggestionChip}
              onPress={() => setInput("Gợi ý sách hay về tâm lý học?")}
            >
              <Text style={styles.suggestionText}>Sách tâm lý học?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.suggestionChip}
              onPress={() => setInput("Quyền lợi gói hội viên là gì?")}
            >
              <Text style={styles.suggestionText}>Gói hội viên?</Text>
            </TouchableOpacity>
          </View>

          {/* Input Footer */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nhắn tin cho Nova..."
              placeholderTextColor={COLORS.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              disabled={!input.trim() || loading}
              onPress={handleSend}
            >
              <Send size={18} color="#fff" />
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
    height: "80%",
    padding: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  botIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  messageList: {
    flex: 1,
    marginVertical: 10,
  },
  messageListContent: {
    paddingVertical: 10,
    gap: 12,
  },
  messageBubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageLeft: {
    justifyContent: "flex-start",
  },
  messageRight: {
    justifyContent: "flex-end",
  },
  msgAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(192, 132, 252, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleAi: {
    backgroundColor: COLORS.surfaceLight,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textAi: {
    color: COLORS.text,
  },
  textUser: {
    color: "#fff",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 32,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  suggestionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  suggestionChip: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  suggestionText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
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
