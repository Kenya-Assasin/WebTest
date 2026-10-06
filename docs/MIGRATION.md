# Lộ trình chuyển MCA

## Giai đoạn 1 — Nền Next.js và xác thực

Đã thực hiện:

- Chạy tất cả 9 trang trong Next.js App Router với URL mới.
- Giữ giao diện CSS và các thay đổi cục bộ có trước khi chuyển.
- Đưa cấu hình Supabase vào biến môi trường, dùng client từ npm.
- Viết header, footer, đăng nhập và đăng ký bằng React.
- Dùng cookie cho Supabase Auth, làm mới phiên trong Proxy, xử lý callback email.
- Kiểm tra đăng nhập trên máy chủ cho tạo hồ sơ/điều tra viên; kiểm tra `profiles.role` cho quản trị.
- Giữ hành vi các màn hình nghiệp vụ bằng lớp tương thích có quản lý sự kiện và bộ hẹn giờ.
- Thêm kiểm tra kiểu dữ liệu, bản production và kiểm thử trình duyệt cho các luồng nền.

Chưa thay đổi schema, quyền hoặc dữ liệu trực tuyến; chưa triển khai lên tên miền.

## Giai đoạn 2 — Màn hình nghiệp vụ React đã chuyển

Đã thực hiện:

1. **Kho dữ liệu và chi tiết:** tách truy vấn khỏi render; React quản lý bộ lọc, tìm kiếm, sắp xếp, chế độ lưới/danh sách và phân trang 12 hồ sơ. Hủy yêu cầu cũ khi đổi tìm kiếm/rời trang. Render mô tả/kỹ năng bằng văn bản; liên kết dùng ID thật.
2. **Tạo hồ sơ:** form có state React, validation, 1–5 kỹ năng, bản nháp theo tài khoản, khôi phục bản nháp cũ, xem trước ảnh JPG/PNG/WEBP ≤5MB, đường dẫn ảnh theo người dùng, chống gửi trùng. Khi lỗi lưu kỹ năng, thử hoàn tác hồ sơ và dọn ảnh khi an toàn. Nếu hoàn tác thất bại, hiển thị liên kết hồ sơ dở dang và chặn gửi lại.
3. **Trang chủ và điều tra viên:** bỏ tài khoản Kenya, số thống kê và thẻ mẫu. Dùng `profiles`/`creatures` thật, danh sách cá nhân theo `creator_id`, cập nhật tên điều tra viên và cập nhật header. Chia sẻ trang cá nhân nói rõ cần đăng nhập.
4. **Quản trị:** React quản lý danh sách, trạng thái, tìm kiếm và phân trang. Trang duyệt có xác nhận thao tác, yêu cầu chọn cấp chính thức trước xác minh, gọi đúng `admin_review_creature` hiện có và hiển thị trạng thái mới. Kiểm tra vai trò phía máy chủ vẫn được giữ.
5. Bỏ lớp tương thích, HTML snapshot, các module generated và script đồng bộ. Liên kết nội bộ dùng Next Link. Giữ các file nguồn cũ để đối chiếu.

Theo lựa chọn của chủ dự án, **yêu thích đồng bộ tài khoản sẽ làm ở giai đoạn 3**, không lưu yêu thích cục bộ trong giai đoạn này. Bio, đổi avatar và các tính năng mới cần schema cũng để giai đoạn 3.

Ở cuối giai đoạn 2, chủ dự án chưa chạy audit SQL; kết quả đã được cung cấp ở giai đoạn 3. Vì chưa có schema/triggers/RLS, chưa tạo một RPC giao dịch mới và chưa thay đổi database trực tuyến. Việc tạo hồ sơ đang dùng các thao tác bảng hiện có với cơ chế hoàn tác; chuyển sang giao dịch thực sự được giữ trong giai đoạn 3.

Kiểm thử gồm dữ liệu, phiên tài khoản và vai trò trên Supabase giả lập riêng; không tạo/sửa/xóa dữ liệu thật. Chưa xác minh quyền thực tế của Postgres hoặc Storage.

## Giai đoạn 3 — Backend và triển khai (đang thực hiện)

Đã chuẩn bị và kiểm thử cục bộ:

- Yêu thích lưu trên Supabase theo tài khoản, thêm/bỏ ở kho dữ liệu và chi tiết; danh sách cá nhân có phân trang, xử lý lỗi và đổi tài khoản.
- RPC nguyên tử cho hồ sơ + kỹ năng + mã hồ sơ + mã yêu cầu. Khôi phục yêu cầu sau reload; gửi lại cùng UUID sau lỗi mạng không tạo trùng và không tải lại ảnh.
- RPC duyệt mới kiểm tra admin trong database; quyền theo cột cho profile và RLS hạn chế ghi trực tiếp sinh vật/kỹ năng. Chính sách ảnh theo chủ sở hữu và bảo vệ ảnh đã được tham chiếu.
- Migrations trong `supabase/migrations/` kiểm chứng trên PostgreSQL cục bộ bằng PGlite cho bigint và UUID. Chủ dự án đã xác nhận áp dụng bản gộp trên Supabase thật ngày 06/10/2026 với `MCA_PHASE3_APPLIED` và `mca_phase3_ready=true`.
- Audit SQL gộp kết quả vào một ô JSON, gồm cột/default/enum/constraints, policy/quyền cột, trigger, các function SECURITY DEFINER và bucket.
- 32 kiểm thử SQL (gồm schema/quyền/trigger tái dựng từ audit), 22 kiểm thử frontend giai đoạn 2 và 8 kiểm thử frontend giai đoạn 3. Không ghi dữ liệu trực tuyến.
- Đã bật `NEXT_PUBLIC_MCA_PHASE3=true` trên máy này và biên dịch/khởi động lại bản production. Kiểm tra Supabase thật xác nhận đọc kho công khai và chặn khách truy cập dữ liệu riêng/RPC mới; 10 kiểm tra trình duyệt trên bản thật đạt, hai ảnh cũ tải thành công. Chưa kiểm thử thao tác ghi bằng tài khoản thật.

Còn phải làm trước khi hoàn tất giai đoạn 3:

1. Kiểm thử tài khoản thường/admin, đăng ký/xác nhận email và Storage thật: yêu thích riêng theo tài khoản, hồ sơ có ảnh/kỹ năng, duyệt và cập nhật tên.
2. Chọn hosting/tên miền, bật cờ giai đoạn 3 tại hosting, cấu hình Auth URLs, kiểm tra bản preview rồi triển khai.

Hướng dẫn thao tác và giới hạn cụ thể: [PHASE3.md](PHASE3.md). Backend đã áp dụng và ứng dụng trên máy đã bật; giai đoạn 3 còn kiểm thử tài khoản thật và triển khai.

## Lựa chọn công nghệ

Giữ **Next.js + Supabase** là hợp lý vì backend đã dùng Supabase và website cần xác thực, nội dung công khai và quản trị. Chưa cần thêm Express/NestJS riêng: Postgres, Storage và RPC đáp ứng chức năng hiện có; Next.js có thể xử lý tác vụ phía máy chủ khi cần. Nếu về sau chỉ cần một ứng dụng trên trình duyệt và không cần SSR/SEO, Vite + React là phương án ít cấu hình hơn, nhưng không có lợi rõ ràng để đổi hướng trong lần chuyển này.

