# Giai đoạn 3 — Backend Supabase

Nguồn gốc theo năm cấp là bản bổ sung dùng **SQL riêng**, không chạy lại bộ giai đoạn 3. Hướng dẫn chạy `apply-origins.sql`, bật cờ và duyệt địa danh tại [ORIGINS.md](ORIGINS.md).

**Trạng thái ngày 06/10/2026:** chủ dự án đã xác nhận chạy SQL trên Supabase thật với `MCA_PHASE3_APPLIED` và `mca_phase3_ready = true`. Đã bật `NEXT_PUBLIC_MCA_PHASE3=true` trong `.env.local`, biên dịch thành công và khởi động lại bản chạy trên máy. Chưa triển khai lên mạng hoặc kiểm thử các thao tác bằng tài khoản thật.

## Kiểm tra sau khi bật

Đã kiểm tra trên Supabase thật bằng publishable key: kho sinh vật/kỹ năng đọc được; khách chưa đăng nhập bị từ chối đọc bảng yêu thích/yêu cầu gửi và gọi hai RPC mới với mã `42501`. Không ghi dữ liệu trong các kiểm tra này.

Bản production kết nối Supabase thật đạt 10 kiểm tra trình duyệt: trang chủ/kho dữ liệu, nút yêu thích và đường dẫn trở lại sau đăng nhập, bốn trang được bảo vệ, URL HTML cũ giữ ID, kích thước điện thoại và không có lỗi JavaScript. Đã kiểm tra thêm hai ảnh hiện có tải thành công. Kết quả cục bộ ở `test-results/live-phase3/checks.json`, ảnh ở `test-results/live-phase3/mobile.png` (không đưa vào Git).

Bước tiếp theo dùng tài khoản thật tại **http://localhost:3000**:

1. Tài khoản thường: đăng nhập, thêm yêu thích, mở trang điều tra viên, tải lại để kiểm tra danh sách được giữ; mở cùng tài khoản trong trình duyệt khác để kiểm tra đồng bộ. Tài khoản khác phải có danh sách riêng.
2. Tạo một hồ sơ thử có ảnh và kỹ năng; kiểm tra hồ sơ xuất hiện đầy đủ và không có bản trùng. Thao tác này sẽ tạo dữ liệu trên Supabase thật.
3. Tài khoản admin: duyệt hồ sơ thử, chọn cấp chính thức và kiểm tra trạng thái đã cập nhật.
4. Đăng ký/xác nhận email: kiểm tra Redirect URLs có `http://localhost:3000/auth/callback` và mở email trong cùng trình duyệt đăng ký. Không gửi mật khẩu hoặc service role key trong chat.
5. Chọn hosting/tên miền rồi kiểm tra bản preview trước khi đưa website lên mạng.

## Bộ SQL đã áp dụng

`apply-phase3.sql` bổ sung yêu thích, lưu hồ sơ bằng giao dịch và chỉnh quyền ghi. Giữ nguyên sinh vật, kỹ năng, ảnh, profile và vai trò admin hiện có; chỉ bổ sung profile nếu tài khoản nào đang thiếu. **Không chạy lại bản gộp hoặc chạy thêm 001/002/003 riêng trên dự án đã cập nhật.** Nếu cần kiểm tra lại quyền, dùng `verify-phase3.sql` chỉ đọc.

Toàn bộ cập nhật nằm trong một transaction. Nếu cấu trúc đã thay đổi, Storage không có cột cần thiết hoặc giai đoạn 3 đã tồn tại, script dừng trước khi cập nhật; nếu câu lệnh sau lỗi thì thay đổi được rollback. Khi gặp lỗi, gửi nguyên thông báo để xử lý, không xóa bảng để chạy lại.

Sau khi cập nhật quyền, luồng tạo/duyệt của website HTML cũ và giai đoạn 2 sẽ ngừng hoạt động cho tới khi chuyển sang bản Next.js đã bật giai đoạn 3. Không coi việc đổi cờ về false là phục hồi quyền cũ. Kiểm thử trên bản thử nghiệm trước khi thay website đang được sử dụng.

## Kết quả đối chiếu audit

- Ba bảng hiện có đã bật RLS, thuộc `postgres`, không FORCE RLS.
- Sinh vật và kỹ năng dùng ID bigint tự tăng; các trường nội dung là text, không có enum. Code hiện có nullable và không có trigger tự tạo code.
- Kho sinh vật và kỹ năng đang được đọc công khai. Profile hiện được đọc bởi tài khoản đã đăng nhập; bản mới giới hạn profile theo chủ sở hữu vì trang điều tra viên chỉ dùng profile cá nhân.
- Quyền cập nhật cột hiện đã loại role/reputation khỏi người dùng. Bản mới tiếp tục hạn chế tên điều tra viên và ngăn ghi sinh vật/kỹ năng trực tiếp, kể cả các quyền cột cũ.
- Trigger `on_auth_user_created` gọi `handle_new_user()`, hiện đã gán role cố định là user. Bản mới giữ trigger, giới hạn tên 40 ký tự, mặc định cấp I/danh tiếng 0, không lấy quyền từ metadata đăng ký.
- Đã đọc và đối chiếu cả ba function có quyền cao: `handle_new_user`, `is_admin`, `admin_review_creature`. Helper được cố định search_path; quyền RPC duyệt cũ bị thu hồi để dùng RPC mới có kiểm tra admin trực tiếp.
- Bucket `creature-images` đang public, chưa có giới hạn kích thước/MIME. Bản cập nhật đặt giới hạn 5MB và JPG/PNG/WEBP, thêm quyền theo chủ sở hữu. Ảnh cũ vẫn được phục vụ công khai.

Bản audit gốc được lưu tại `supabase/audits/20261006-before-phase3.json` để đối chiếu quyền/function trước chuyển đổi. Đây là ảnh chụp schema/quyền, không phải bản sao lưu toàn bộ dữ liệu hoặc toàn bộ dự án. Auth và Storage trong kiểm thử cục bộ là các cấu trúc tối thiểu; phần kiểm tra trước cập nhật xác nhận cột Storage cần thiết trên dự án thật.

## Các chức năng mới

| Chức năng | Cách hoạt động |
| --- | --- |
| Yêu thích | Supabase giữ danh sách riêng theo tài khoản, khóa duy nhất tài khoản + hồ sơ; nút trên thẻ và chi tiết |
| Hồ sơ đã lưu | Phân trang trong trang điều tra viên; cập nhật khi tải lại trang hoặc quay lại cửa sổ |
| Tạo hồ sơ | RPC lưu sinh vật, code, 1–5 kỹ năng và mã yêu cầu trong cùng giao dịch |
| Mất phản hồi | Giữ UUID/nội dung/đường dẫn ảnh theo tài khoản; kiểm tra lại cùng yêu cầu không tạo trùng hoặc tải lại ảnh |
| Quản trị | RPC duyệt tự kiểm tra tài khoản/admin, yêu cầu cấp chính thức hợp lệ |
| Ảnh | Kiểm tra chủ sở hữu, đường dẫn, MIME và kích thước; ngăn xóa ảnh đã gắn vào hồ sơ |

Không lưu yêu thích trên trình duyệt. LocalStorage chỉ giữ bản nháp và yêu cầu đang chờ. Chưa dùng Realtime; danh sách từ thiết bị khác cập nhật khi tải lại/quay lại cửa sổ.

Ảnh tải trước RPC, không nằm cùng transaction Postgres. Khi chưa rõ kết quả, giữ ảnh và mã yêu cầu để kiểm tra lại. Với lỗi validation xác định, thử dọn ảnh chưa được sử dụng. Ảnh bỏ lại do đóng trình duyệt trước RPC có thể cần tác vụ quản trị dọn sau. Bio, đổi avatar và quy tắc tăng cấp/danh tiếng chưa bổ sung vào lần chuyển này.

## File và kiểm thử

- `apply-phase3.sql`: bản gộp có kiểm tra trước khi cập nhật, dùng cho SQL Editor.
- `verify-phase3.sql`: kiểm tra chỉ đọc sau khi cập nhật.
- `migrations/202610060001_phase3.sql`: bảng yêu thích/yêu cầu và RPC giao dịch/duyệt.
- `migrations/202610060002_permissions.sql`: RLS, quyền theo cột, Storage và RPC cũ.
- `migrations/202610060003_profile_functions.sql`: Auth/profile/helper đã đối chiếu.
- `src/lib/supabase/database.types.ts`: kiểu TypeScript sinh từ audit MCA cộng cấu trúc giai đoạn 3; được dùng trong client trình duyệt, client máy chủ và Proxy. Không phải export đầy đủ của Supabase CLI.

```powershell
npm run typecheck
npm run build
npm run test:install
npm test
```

Bộ kiểm thử gồm 32 kiểm thử SQL và 30 kiểm thử trình duyệt. SQL kiểm tra cả fixture bigint/UUID và schema public/quyền/trigger tái dựng từ audit, giữ dữ liệu/admin cũ, backfill profile, đăng ký qua vai trò Auth, chặn metadata quyền cao, gửi trùng, rollback và trường hợp chạy lại/sai schema. Frontend kiểm tra giai đoạn 2/3, hai phiên tài khoản, >1000 yêu thích, lỗi ghi/mất mạng, yêu cầu khôi phục và điện thoại. Không ghi dữ liệu trực tuyến. PGlite dùng một kết nối, chưa thay thế kiểm thử đồng thời/Auth/Storage trên Supabase thật.

## Bật ứng dụng và triển khai

Máy này đã bật `NEXT_PUBLIC_MCA_PHASE3=true` và biên dịch lại. Khi chuyển sang hosting, đặt cùng cờ trong cấu hình Next.js trước khi build. Biến này được đưa vào bản build nên cần rebuild/redeploy khi đổi. `.env.example` vẫn để cờ mặc định false cho môi trường chưa áp dụng SQL; không sao chép đè `.env.local` hiện có.

Chủ dự án đã chọn Vercel với tên miền `mo-mca.vercel.app`. Deployment của commit mới được Vercel báo thành công nhưng tên miền chỉ phục vụ CSS và trả 404 cho các trang. Đã chuẩn bị cấu hình Next.js trong `vercel.json`; chưa push hoặc triển khai bản sửa. Hướng dẫn thiết lập dự án, biến môi trường và Auth URLs trong [VERCEL.md](VERCEL.md). Bản này cần Next.js có hỗ trợ máy chủ, không dùng chế độ chỉ phục vụ HTML trong public.

Trong Supabase → Authentication → URL Configuration, đặt Site URL và Redirect URLs `/auth/callback` cho đúng địa chỉ dùng kiểm thử/triển khai. Kiểm tra preview trước khi chuyển tên miền.

Tham khảo: [Supabase functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage ownership](https://supabase.com/docs/guides/storage/security/ownership), [Next.js deployment](https://nextjs.org/docs/app/getting-started/deploying).
