# MCA — Next.js + Supabase

Frontend đã chuyển sang Next.js App Router, TypeScript và React cho toàn bộ 9 trang. Backend tiếp tục dùng dự án Supabase hiện có (Auth, Postgres, Storage và RPC). **Giai đoạn 2 đã chuyển các màn hình nghiệp vụ sang React và bỏ lớp tương thích.** Chủ dự án đã xác nhận áp dụng SQL giai đoạn 3 trên Supabase thật ngày 06/10/2026; bản chạy trên máy đã bật yêu thích theo tài khoản và RPC giao dịch/duyệt mới, biên dịch và kiểm tra khi chưa đăng nhập thành công. Còn kiểm thử bằng tài khoản thật và chọn hosting. Xem hướng dẫn trong `docs/PHASE3.md`.

## Chạy trên máy

Yêu cầu Node.js từ 20.9 trở lên. Bản này đã kiểm tra với Node.js 22.

```powershell
npm install
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Điền URL và publishable key của Supabase trong `.env.local`. Nếu file này đã tồn tại, giữ cấu hình hiện tại. Bản chuyển đổi trên máy này đã tạo `.env.local` từ cấu hình website cũ; file không đưa vào Git. Không sử dụng secret key hoặc service role key cho hai biến `NEXT_PUBLIC_*`.

```powershell
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Khi triển khai bản đã biên dịch:

```powershell
npm run build
npm start
```

## Cấu hình xác nhận email

Trong Supabase → Authentication → URL Configuration, thêm `http://localhost:3000/auth/callback` vào Redirect URLs. Khi triển khai, thêm URL tương ứng của tên miền thật và cập nhật Site URL.

Đăng ký mới dùng PKCE và callback `/auth/callback`. Mở email xác nhận trong cùng trình duyệt đã đăng ký. Các tài khoản và hồ sơ cũ vẫn được giữ; phiên đăng nhập cũ nằm trong localStorage, còn bản mới dùng cookie nên cần đăng nhập lại. Nếu tùy chỉnh email template trong Supabase, kiểm tra template vẫn dùng liên kết xác nhận hỗ trợ `emailRedirectTo`.

## Những gì đã chuyển

| Trang | URL mới | Cách chạy hiện tại |
| --- | --- | --- |
| Trang chủ | `/` | React; hồ sơ và thống kê thật |
| Kho dữ liệu | `/kho-du-lieu` | React; tìm kiếm, bộ lọc, sắp xếp và phân trang Supabase |
| Chi tiết sinh vật | `/chi-tiet-sinh-vat?id=...` | React; hồ sơ, ảnh, kỹ năng và liên kết theo ID thật |
| Tạo hồ sơ | `/tao-ho-so` | React; bản nháp theo tài khoản, ảnh, tối đa 5 kỹ năng |
| Điều tra viên | `/dieu-tra-vien` | React; dữ liệu theo tài khoản, thống kê, sửa tên |
| Đăng nhập | `/dang-nhap` | React + Supabase SSR |
| Đăng ký | `/dang-ky` | React + Supabase SSR + xác nhận email |
| Quản trị | `/admin` | React; kiểm tra vai trò trên máy chủ, danh sách và bộ lọc |
| Duyệt hồ sơ | `/admin-chi-tiet?id=...` | React; xác nhận thao tác, gọi RPC giai đoạn 3 có kiểm tra admin |

URL `.html` cũ được chuyển hướng 308 và giữ tham số truy vấn. Điều hướng nội bộ dùng Next Link, không tải lại toàn bộ tài liệu. Thư viện Supabase được cài qua npm. Menu chỉ hiển thị các trang có thật. Những đường dẫn tới chức năng chưa xây dựng trả về màn hình 404.

Các file HTML, CSS và JavaScript ban đầu được giữ nguyên để đối chiếu, bao gồm thay đổi cục bộ ở phần chi tiết quản trị có trước khi chuyển đổi. Bản Next.js không chạy các file JavaScript cũ và không chèn HTML qua `dangerouslySetInnerHTML`.

## Cấu trúc

- `src/app/`: trang Next.js và callback xác thực.
- `src/components/`: header, footer, form tài khoản.
- `src/components/creatures/`: màn hình và hook React của các chức năng nghiệp vụ.
- `src/lib/creatures/`: kiểu dữ liệu, truy vấn, validation và thao tác lưu/duyệt.
- `src/lib/supabase/`: client trình duyệt, client máy chủ và cấu hình môi trường.
- `src/lib/auth/`: kiểm tra tài khoản/vai trò, giới hạn URL chuyển hướng.
- `src/proxy.ts`: làm mới phiên Supabase trong cookie.
- `src/app/globals.css`: giao diện nghiệp vụ dùng chung với màu và phong cách MCA.
- `public/styles/`: CSS header/footer và xác thực từ giao diện cũ.
- `docs/MIGRATION.md`: lộ trình và phần còn lại.
- `supabase/audit.sql`: truy vấn chỉ đọc, trả về một ô JSON để đối chiếu schema/quyền.
- `supabase/migrations/`: bộ cập nhật giai đoạn 3 đã đối chiếu với audit; dùng `supabase/apply-phase3.sql` để chạy một lần trong SQL Editor.
- `docs/PHASE3.md`: hướng dẫn kiểm tra Supabase và áp dụng/triển khai.
- `src/lib/supabase/features.ts`: cờ bật chức năng giai đoạn 3 sau khi cập nhật backend.

Các component sử dụng state React, hủy yêu cầu khi đổi bộ lọc hoặc rời trang, và render nội dung từ Supabase như văn bản. Các file generated, runtime tương thích và script đồng bộ đã được bỏ. Sửa bản mới trực tiếp trong `src/`.

Kho dữ liệu lấy 12 hồ sơ mỗi trang, tìm kiếm theo tên/mã, lọc trạng thái/cấp đe dọa/loài/nguyên tố/thiên hà, sắp xếp theo thời gian hoặc tên và nhớ chế độ lưới/danh sách. Thống kê đếm trên Supabase thay vì dùng số mẫu. RLS quyết định tập hồ sơ mỗi người có thể đọc.

Bản nháp mới lưu trên trình duyệt theo ID tài khoản, tự lưu và khôi phục; có nút khôi phục bản nháp cũ. Ảnh không lưu trong bản nháp. Yêu thích đồng bộ tài khoản lưu trên Supabase. Máy này đã đặt `NEXT_PUBLIC_MCA_PHASE3=true` và biên dịch lại sau khi chủ dự án xác nhận áp dụng migrations. Hosting mới cũng cần đặt cờ này trước khi build. Không đổi về false để dùng luồng ghi giai đoạn 2 sau khi quyền database đã chuyển sang giai đoạn 3.

## Kiểm tra

```powershell
npm run typecheck
npm run build
npm run test:install
npm test
```

`npm test` chạy 32 kiểm thử SQL trên PostgreSQL cục bộ bằng PGlite, sau đó 22 kiểm thử frontend giai đoạn 2 và 8 kiểm thử frontend giai đoạn 3. Kiểm thử SQL dùng fixture bigint/UUID và schema public/quyền/trigger tái dựng từ audit Supabase do chủ dự án cung cấp. Auth/Storage được mô phỏng tối thiểu; chưa thay thế kiểm tra trực tuyến.

Các kiểm thử trình duyệt chạy với Next.js riêng tại `127.0.0.1:3100` và Supabase giả lập tại `127.0.0.1:54399`, dùng thư mục build `.next-test`. Chúng kiểm tra cả phiên đăng nhập qua cookie và vai trò phía máy chủ. Tạo hồ sơ, tải ảnh, hoàn tác lỗi, sửa tên và duyệt hồ sơ chỉ ghi vào bộ nhớ của backend giả lập. Không ghi Supabase thật.

## Phần còn chờ Supabase thật

- Đã nhận audit, kiểm thử bộ SQL theo cấu trúc/quyền hiện có và nhận xác nhận đã áp dụng trực tuyến. Cờ giai đoạn 3 trên máy đã bật; bản production đọc dữ liệu thật, chặn truy cập khách vào dữ liệu riêng/RPC và đạt 10 kiểm tra trình duyệt. Còn kiểm thử Auth/Storage/tài khoản thật. Không chạy lại `supabase/apply-phase3.sql`; dùng `supabase/verify-phase3.sql` nếu cần kiểm tra quyền. Client Supabase dùng kiểu TypeScript sinh từ audit MCA và hợp đồng SQL mới; đây không phải export CLI đầy đủ của dự án.
- Bộ SQL mới dùng RPC cho mọi ghi sinh vật/kỹ năng và duyệt hồ sơ. Sau khi áp dụng quyền giai đoạn 3, luồng ghi của website HTML cũ và giai đoạn 2 phải được thay bằng bản Next.js đã bật cờ; chỉ tắt cờ không khôi phục quyền trước đó.
- Ảnh tải trước RPC, không nằm cùng transaction Postgres. Yêu cầu có kết quả chưa rõ giữ nguyên mã và ảnh để thử lại an toàn; ảnh bị bỏ lại do đóng trình duyệt trước RPC có thể cần dọn sau.
- Hồ sơ cá nhân hiện sửa tên; bio, đổi avatar và quy tắc tăng cấp/danh tiếng cần thống nhất schema riêng.
- Chưa chọn hosting/tên miền hoặc triển khai. Chi tiết bước audit, kiểm thử và đưa lên mạng trong `docs/PHASE3.md`.

Tài liệu tham khảo: [Next.js App Router](https://nextjs.org/docs/app), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).

