import QRCode from "qrcode";

/** Tạo mã QR chứa thông tin trình diễn, không phải lệnh chuyển khoản. */
export async function createDemoPaymentQr(reference: string, amount: number) {
  const content = [
    "BOOKVERSE - THANH TOAN MO PHONG",
    `Ma giao dich: ${reference}`,
    `So tien hien thi: ${new Intl.NumberFormat("vi-VN").format(amount)} VND`,
    "Khong phai ma thanh toan ngan hang. Khong chuyen tien.",
  ].join("\n");

  return QRCode.toDataURL(content, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    color: { dark: "#103f3b", light: "#ffffff" },
  });
}
