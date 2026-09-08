import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BookOpen, Lock, Mail, ArrowRight } from "lucide-react-native";
import { COLORS } from "../config/constants";
import { useAuthStore } from "../store/authStore";

export function LoginScreen() {
  const navigation = useNavigation();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("reader@bookverse.ai");
  const [password, setPassword] = useState("Demo@123456");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      login(
        {
          id: "reader-01",
          name: "Độc giả Demo",
          email: email,
          role: "BUYER",
          dailyGoalMinutes: 30,
          streakDays: 7,
        },
        "mock-jwt-token"
      );
      setLoading(false);
      navigation.goBack();
    }, 600);
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <BookOpen size={36} color={COLORS.primaryLight} />
        </View>
        <Text style={styles.appName}>BookVerse AI</Text>
        <Text style={styles.tagline}>Nền tảng đọc sách & gợi ý thông minh</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formHeading}>Đăng nhập</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <Mail size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.inputWrapper}>
            <Lock size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.loginBtn}
          disabled={loading}
          onPress={handleLogin}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.loginBtnText}>Đăng nhập</Text>
              <ArrowRight size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
