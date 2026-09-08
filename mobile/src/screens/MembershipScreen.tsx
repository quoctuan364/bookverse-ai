import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
} from "react-native";
import { Crown, Check, Sparkles, ShieldCheck, Zap } from "lucide-react-native";
import { COLORS } from "../config/constants";
import { MembershipPlan } from "../types";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";

export function MembershipScreen() {
  const { subscription, setSubscription } = useAuthStore();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("plan-monthly");
  const [processing, setProcessing] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<MembershipPlan | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      const data = await api.getMembershipPlans();
      setPlans(data);
      if (data[0]) setSelectedPlanId(data[0].id);
    };
    fetchPlans();
  }, []);

  const handleSubscribeDemo = async (plan: MembershipPlan) => {
    setPendingPlan(plan);
  };

  const confirmSandboxPayment = () => {
    const plan = pendingPlan;
    if (!plan) return;
    setProcessing(true);
    setTimeout(() => {
      const startsAt = new Date();
      const endsAt = new Date(Date.now() + plan.durationDays * 86400000);
      setSubscription({
        id: `sub-demo-${Date.now()}`,
        status: "ACTIVE",
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        plan: { name: plan.name },
      });
      setProcessing(false);
      setPendingPlan(null);
      Alert.alert(
        "🎉 Đăng ký thành công!",
        `Bạn đã kích hoạt thành công ${plan.name} (Sandbox Demo). Quyền đọc toàn bộ kho Ebook có hiệu lực đến ${endsAt.toLocaleDateString("vi-VN")}.`
      );
    }, 800);
  };

  const hasActiveSub = subscription?.status === "ACTIVE";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Badge */}
      <View style={styles.headerHero}>
        <View style={styles.crownCircle}>
          <Crown size={32} color="#f59e0b" />
        </View>
        <Text style={styles.heroTitle}>Gói Hội Viên BookVerse</Text>
        <Text style={styles.heroSubtitle}>
          Đọc toàn bộ kho sách điện tử & sử dụng Trợ lý AI không giới hạn
        </Text>
      </View>

      {/* Current Subscription Status */}
      {hasActiveSub ? (
        <View style={styles.currentSubCard}>
          <View style={styles.activeTag}>
            <Zap size={12} color="#10b981" />
            <Text style={styles.activeTagText}>ĐANG HOẠT ĐỘNG</Text>
          </View>
          <Text style={styles.subPlanName}>{subscription?.plan.name}</Text>
          <Text style={styles.subDates}>
            Hiệu lực đến: {new Date(subscription?.endsAt || "").toLocaleDateString("vi-VN")}
          </Text>
        </View>
      ) : null}

      {/* Plan Selection Cards */}
      <Text style={styles.sectionHeading}>Chọn gói phù hợp với bạn:</Text>

      {plans.map((plan) => {
        const isSelected = selectedPlanId === plan.id;
        const formattedPrice = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(plan.price);

        return (
          <TouchableOpacity
            key={plan.id}
            activeOpacity={0.9}
            style={[styles.planCard, isSelected && styles.planCardSelected]}
            onPress={() => setSelectedPlanId(plan.id)}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planTitle}>{plan.name}</Text>
                <Text style={styles.planDuration}>{plan.durationDays} ngày sử dụng</Text>
              </View>
              <Text style={styles.planPrice}>{formattedPrice}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.featureList}>
              {plan.features.map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Check size={16} color={COLORS.secondary} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.subscribeBtn, isSelected && styles.subscribeBtnSelected]}
              disabled={processing}
              onPress={() => handleSubscribeDemo(plan)}
            >
              <Text style={styles.subscribeBtnText}>
                {processing ? "Đang xử lý Sandbox..." : "Đăng ký gói Sandbox (Demo)"}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}

      {/* Trust & Guarantee */}
      <View style={styles.guaranteeBox}>
        <ShieldCheck size={20} color={COLORS.textMuted} />
        <Text style={styles.guaranteeText}>
          Môi trường thanh toán Sandbox an toàn phục vụ nghiệm thu đồ án tốt nghiệp.
        </Text>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setPendingPlan(null)}
        transparent
        visible={Boolean(pendingPlan)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.paymentSheet}>
            <Text style={styles.paymentTitle}>Thanh toán chuyển khoản Sandbox</Text>
            <Text style={styles.paymentSubtitle}>
              Quét đúng mã Sacombank bên dưới. Đây là bước trình diễn; ứng dụng không tự đối soát tiền thật.
            </Text>
            <Image
              accessibilityLabel="Mã VietQR Sacombank của Lương Nguyễn Quốc Tuấn"
              source={require("../../assets/sacombank-qr-only.png")}
              style={styles.paymentQr}
            />
            <View style={styles.bankInfo}>
              <Text style={styles.bankLine}>SACOMBANK · 0868792717</Text>
              <Text style={styles.bankLine}>LƯƠNG NGUYỄN QUỐC TUẤN</Text>
              <Text style={styles.paymentAmount}>
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                  pendingPlan?.price ?? 0,
                )}
              </Text>
            </View>
            <TouchableOpacity
              disabled={processing}
              onPress={confirmSandboxPayment}
              style={styles.confirmPaymentBtn}
            >
              <Text style={styles.subscribeBtnText}>
                {processing ? "Đang xác nhận..." : "Xác nhận thanh toán Demo"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={processing}
              onPress={() => setPendingPlan(null)}
              style={styles.cancelPaymentBtn}
            >
              <Text style={styles.cancelPaymentText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerHero: {
    alignItems: "center",
    marginBottom: 24,
  },
  crownCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  currentSubCard: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    marginBottom: 20,
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  activeTagText: {
    color: "#34d399",
    fontSize: 11,
    fontWeight: "800",
  },
  subPlanName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  subDates: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeading: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  planDuration: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  planPrice: {
    color: COLORS.secondary,
    fontSize: 18,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  featureList: {
    gap: 8,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    color: COLORS.text,
    fontSize: 13,
    flex: 1,
  },
  subscribeBtn: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  subscribeBtnSelected: {
    backgroundColor: COLORS.primary,
  },
  subscribeBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  guaranteeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    marginTop: 10,
    paddingHorizontal: 10,
  },
  guaranteeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  paymentSheet: {
    alignItems: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 22,
  },
  paymentTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "800",
  },
  paymentSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    textAlign: "center",
  },
  paymentQr: {
    width: 230,
    height: 230,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  bankInfo: {
    alignItems: "center",
    marginTop: 12,
  },
  bankLine: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  paymentAmount: {
    color: COLORS.secondary,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
  },
  confirmPaymentBtn: {
    width: "100%",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginTop: 16,
    paddingVertical: 13,
  },
  cancelPaymentBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelPaymentText: {
    color: COLORS.textMuted,
    fontWeight: "700",
  },
});
