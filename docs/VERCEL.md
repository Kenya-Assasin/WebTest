# Triển khai MCA trên Vercel

Dự án Vercel hiện có: `web-test`, thuộc `kenya-assasins-projects`.
Tên miền chủ dự án cung cấp: https://mo-mca.vercel.app/.

## Chẩn đoán ngày 06/10/2026

- GitHub đã có commit `ce47b5a` chứa Next.js; trạng thái Vercel của commit là thành công.
- Trên tên miền thật, `/`, `/index.html`, `/dang-nhap` và `/dang-nhap.html` trả `404` với `x-vercel-error: NOT_FOUND`.
- `/styles/layout.css` trả `200` và đúng CSS mới trong `public/styles/`.

Kết quả phù hợp với việc Vercel phục vụ riêng thư mục `public` bằng cấu hình HTML cũ, không triển khai các trang Next.js. Đây là suy luận từ phản hồi trực tuyến; chưa xem được cấu hình/log trong dashboard vì trình duyệt yêu cầu đăng nhập. Với preset Other, Vercel chọn public làm đầu ra nếu thư mục này tồn tại. Bản mới có trang chủ trong `src/app/page.tsx`, không có `public/index.html`.

Đã bổ sung `vercel.json` vào mã nguồn để chỉ định Next.js, cài từ lockfile, chạy build và dùng đầu ra `.next`. Tệp này cần được commit/push lên repository nối với Vercel; thay đổi trên máy chưa cập nhật website trực tuyến. Không chuyển HTML cũ vào public để che lỗi, vì website cần Auth/SSR và RPC giai đoạn 3.

## Thiết lập dự án

Mở dự án **web-test → Settings → Build and Deployment**:

| Mục | Giá trị |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | Thư mục gốc repository; để trống, không chọn public hoặc src |
| Install Command | npm ci (đã khai báo trong vercel.json) |
| Build Command | npm run build (đã khai báo trong vercel.json) |
| Output Directory | Mặc định của Next.js là .next; không dùng public hoặc out |

Trong **Settings → Environment Variables**, thêm cho Production và Preview:

| Tên | Giá trị |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | URL dự án Supabase đang dùng, lấy từ .env.local |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable key đang dùng, lấy từ .env.local |
| NEXT_PUBLIC_MCA_PHASE3 | true |

Không đưa `.env.local` lên GitHub. Cờ giai đoạn 3 phải được đặt trước lúc build vì Next.js đưa biến NEXT_PUBLIC vào mã trình duyệt.

Sau khi mã cấu hình có trên GitHub và các thiết lập được lưu, tạo deployment mới từ commit có `vercel.json`. Nút Redeploy trên một commit cũ không lấy các file chưa push. Kiểm tra log có chạy Next.js và tạo route `/`, `/dang-nhap`, `/kho-du-lieu`; trạng thái Ready riêng nó chưa đảm bảo ứng dụng đã được build đúng.

Trong **Settings → Domains**, xác nhận `mo-mca.vercel.app` thuộc dự án này và trỏ về Production. Nếu URL trực tiếp của deployment mới hoạt động nhưng tên miền vẫn 404, kiểm tra mục này và deployment được chọn làm Production.

## Supabase và kiểm tra sau triển khai

Trong Supabase → Authentication → URL Configuration:

- Site URL: `https://mo-mca.vercel.app`.
- Redirect URLs: `https://mo-mca.vercel.app/auth/callback`; giữ `http://localhost:3000/auth/callback` nếu vẫn thử trên máy.

Kiểm tra trang chủ/kho dữ liệu, URL HTML cũ giữ ID, đăng nhập/đăng ký qua email, yêu thích, tạo hồ sơ có ảnh/kỹ năng và duyệt bằng admin. Không chạy lại SQL giai đoạn 3 đã áp dụng thành công.

Nguồn: [Cấu hình build Vercel](https://vercel.com/docs/builds/configure-a-build), [vercel.json](https://vercel.com/docs/project-configuration/vercel-json), [Auth Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
