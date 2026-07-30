# Chính sách bảo mật BookVerse AI

Cập nhật: 16/07/2026. Đây là snapshot hardening trước regression cuối; trạng thái triển khai hiện hành xem [`docs/CURRENT_STATUS.md`](docs/CURRENT_STATUS.md).

## Trạng thái đã xác minh

| Kết luận | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| Không bake credential vào candidate đã build | VERIFIED | Dockerfile không có secret `ARG/ENV`; image `bookverse-web:current-source` và `bookverse-ai:current-source` đã scan history/config/filesystem với FindingCount 0 | Image local, chưa deploy/rotate secret |
| Production fail-fast | VERIFIED | `scripts/validate-production-env.mjs` từ chối secret thiếu/ngắn/placeholder, DB password yếu và mock flag | Không chứng minh secret đang chạy đã được rotate |
| Mock production | VERIFIED | `BOOKVERSE_CHAT_MOCK_ENABLED=true` bị policy startup và code guard từ chối | Development mock vẫn còn có chủ đích và có nhãn |
| Tách Compose | VERIFIED | `docker-compose.local.yml`, `docker-compose.test.yml`, `docker-compose.production.yml` đều qua `config --quiet` | Chưa chạy production deployment |
| Credential provider thật | BLOCKED | Không dùng OpenAI/Gemini key trong Checkpoint G1 | `BLOCKED_MISSING_CREDENTIAL` |

## Quy tắc vận hành

- Không commit `.env`, dump, token, password hoặc URL database có credential.
- `.env.example` chỉ chứa placeholder. Giá trị thật phải đi qua secret manager hoặc environment của máy triển khai.
- Không truyền secret bằng Docker build arg; chỉ inject lúc runtime.
- Production phải dùng `npm run start:production` để chạy validation trước Next.js.
- Password reset production phải cấu hình `NEXT_PUBLIC_APP_URL` HTTPS và webhook gửi email HTTPS có Bearer token mạnh; không log hoặc trả reset token về UI.
- Rate limit password reset trong source hiện là best-effort theo từng tiến trình. Deployment nhiều replica phải dùng Redis/rate limiter dùng chung.
- FastAPI recommendation production yêu cầu `BOOKVERSE_AI_SERVICE_TOKEN`; CORS chỉ nhận `BOOKVERSE_AI_ALLOWED_ORIGINS`. Không expose token trong biến `NEXT_PUBLIC_*` hoặc log.
- Không bật development mock trên production. Nếu provider ngoài không có credential, hệ thống dùng local fallback có nhãn, không gọi là provider thật.
- Database test phải tách database/project/volume và chỉ test ghi khi có cleanup chính xác.

## Chạy Compose đúng môi trường

```powershell
# Local
docker compose -f docker-compose.yml -f docker-compose.local.yml config --quiet

# Test
docker compose -f docker-compose.yml -f docker-compose.test.yml config --quiet

# Production: chỉ config sau khi đã inject secret thật ngoài repository
docker compose -f docker-compose.yml -f docker-compose.production.yml config --quiet
```

Không dùng chung project name hoặc volume giữa local, test và production.

## Runbook rotation/deployment

Checkpoint G1 **không thực hiện rotation hoặc deployment**. Khi được phê duyệt, thực hiện theo thứ tự:

1. Chụp backup database có kiểm tra restore; ghi checksum và nơi lưu an toàn.
2. Tạo database password và `AUTH_SECRET` mới bằng trình sinh mật mã; không đưa giá trị vào terminal log, tài liệu hoặc Git.
3. Cập nhật secret manager/runtime environment; giữ secret cũ trong thời gian rollback ngắn đã định trước.
4. Chạy `docker compose ... config --quiet`; không in bản config đã resolve ra báo cáo vì có thể chứa secret.
5. Build image từ commit đã duyệt; scan config/history/filesystem.
6. Chạy migration preflight và backup gate. Không dùng `db push` hoặc reset production.
7. Triển khai canary hoặc maintenance window; kiểm tra health, login mới, DB read-only smoke, recommendation degraded state và log không lộ secret.
8. Thu hồi secret cũ sau khi health gate đạt; ghi thời điểm, người thực hiện và phạm vi rotation.
9. Nếu gate thất bại, rollback image và secret theo runbook; không tự ý sửa dữ liệu.

## Điều không được tuyên bố

- Không nói secret production đã rotate khi mới chỉ harden source/image candidate.
- Không nói provider OpenAI/Gemini VERIFIED khi chưa dùng credential thật.
- Không nói deployment PASS khi chưa triển khai và smoke trên môi trường đích.
