"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, background: "#FAF8F2", color: "#17202A", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ maxWidth: 560, background: "white", border: "1px solid #D8D0C2", borderRadius: 16, padding: 32, textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 30 }}>Không thể khởi động BookVerse</h1>
            <p style={{ color: "#536071", lineHeight: 1.7 }}>Đã xảy ra lỗi ở lớp giao diện chính. Hãy thử tải lại ứng dụng.</p>
            <button onClick={reset} style={{ minHeight: 44, cursor: "pointer", border: 0, borderRadius: 8, padding: "10px 20px", background: "#176B62", color: "white", fontWeight: 800 }} type="button">Tải lại ứng dụng</button>
          </section>
        </main>
      </body>
    </html>
  );
}
