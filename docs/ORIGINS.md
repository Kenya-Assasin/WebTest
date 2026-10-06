# Nguồn gốc sinh vật theo quan hệ

Chuỗi nguồn gốc là **Vũ trụ → Thiên hà → Tinh vân → Hệ sao → Hành tinh**. Ngày 06/10/2026, chủ dự án xác nhận đã chạy toàn bộ SQL trên Supabase thật. Sáu kiểm tra trực tuyến đạt: đọc danh mục đã duyệt, đọc ba cột mới, ẩn ID người đề xuất và chặn khách gọi ba RPC. Đã bật `NEXT_PUBLIC_MCA_ORIGINS=true` trong `.env.local`. Chưa kiểm thử tạo/duyệt bằng tài khoản thật; Vercel vẫn cần cấu hình cờ và triển khai code mới.

## Bật trên Supabase và Vercel

Giai đoạn 3 đã được áp dụng trên dự án này. Chỉ cần chạy bản bổ sung sau:

1. Mở `supabase/apply-origins.sql`, sao chép **toàn bộ file** vào Supabase → SQL Editor và chạy bằng vai trò quản trị database mặc định.
2. Kết quả phải có `MCA_ORIGINS_APPLIED` và `mca_origins_ready = true`. Nếu có lỗi, giữ cờ chức năng tắt và gửi nguyên thông báo lỗi để đối chiếu. File cập nhật nằm trong một transaction; lỗi trong cập nhật sẽ hoàn tác phần thay đổi.
3. Sau khi thành công, thêm `NEXT_PUBLIC_MCA_ORIGINS=true` vào `.env.local` và Vercel → Environment Variables → Production. Giữ `NEXT_PUBLIC_MCA_PHASE3=true`, URL và publishable key hiện tại. Nếu dùng Preview với cùng database, thêm cờ tương ứng cho Preview.
4. Đưa code mới lên Git và triển khai lại Vercel. Đổi biến `NEXT_PUBLIC_*` cần build/redeploy; tải lại trang không thay thế bước này. Trên máy, khởi động lại dev hoặc build lại bản production.

Không chạy lại `apply-phase3.sql`, không chạy cả bản gộp lẫn migration 004 riêng. Sau khi áp dụng, dùng `supabase/verify-origins.sql` để kiểm tra lại bằng truy vấn chỉ đọc.

## Tạo hồ sơ và đề xuất địa danh

- Khi tạo hồ sơ mới, chọn đủ năm cấp. Mỗi danh sách chỉ lấy địa danh thuộc cấp cha đã chọn. Đổi cấp cha sẽ xóa lựa chọn các cấp con.
- Nếu thiếu địa danh, bấm **+ Thêm…**, nhập tên và gửi đề xuất. Đề xuất được lưu ở trạng thái chờ duyệt và tự chọn trong form.
- Người đề xuất có thể dùng địa danh đang chờ duyệt của mình để hoàn thành hồ sơ. Trong danh mục chọn địa danh, người khác chỉ thấy địa danh đã được admin duyệt. Admin thấy toàn bộ đề xuất.
- Tên nguồn gốc lưu trong hồ sơ sinh vật là nội dung của hồ sơ và tuân theo quyền đọc hồ sơ hiện có. Duyệt danh mục địa danh và duyệt hồ sơ sinh vật là hai thao tác riêng.
- Trùng tên trong cùng cấp/cùng cha được nhận diện không phân biệt chữ hoa, khoảng trắng thừa. Cùng tên ở hai cấp cha khác nhau vẫn là hai địa danh riêng. Tên dài tối đa 100 ký tự; mỗi tài khoản được tạo tối đa 100 địa danh trong 24 giờ. Thử lại cùng đề xuất không tính thêm một địa danh.
- Các lựa chọn được lưu cùng bản nháp theo tài khoản. Nếu địa danh bị từ chối, form bỏ lựa chọn không hợp lệ và hiện ghi chú admin. Hồ sơ đã gửi nhưng chưa nhận phản hồi giữ nguyên yêu cầu để thử lại an toàn.

## Admin duyệt

Mở `/admin`, chọn **Duyệt địa danh**, hoặc truy cập `/admin-nguon-goc` sau khi đăng nhập bằng tài khoản admin hiện có.

Chọn cấp địa danh và trạng thái. Mỗi đề xuất hiển thị chuỗi cha để phân biệt tên giống nhau. Có thể thêm ghi chú rồi duyệt hoặc từ chối.

**Duyệt từ cấp cha xuống cấp con.** Database không cho duyệt Hành tinh khi Hệ sao còn chờ duyệt, tương tự với các cấp khác. Người dùng thường không vào được trang quản trị và RPC vẫn kiểm tra vai trò admin ở database.

Địa danh đã duyệt hoặc từ chối không đổi tên, chuyển cha hay đổi quyết định qua giao diện này. Địa danh bị từ chối không thể dùng cho hồ sơ mới; người dùng xem ghi chú rồi chọn hoặc đề xuất tên đúng. Nếu từ chối cấp cha, các đề xuất con cũng không thể được duyệt trước khi có chuỗi cha hợp lệ.

## Dữ liệu và code

`origin_locations` lưu từng địa danh với `kind`, `parent_id`, trạng thái và người đề xuất. Khóa ngoại và trigger kiểm tra quan hệ; RLS giới hạn danh sách theo tài khoản. Trình duyệt chỉ đọc các cột cần cho giao diện, không đọc ID người đề xuất và không ghi bảng trực tiếp.

RPC gửi hồ sơ nhận ID Hành tinh, tự tìm toàn bộ chuỗi cha và lấy tên chính thức trong database. Sửa tên/chuỗi gửi từ trình duyệt không tạo được nguồn gốc giả. Sinh vật, kỹ năng, liên kết Hành tinh và mã yêu cầu lưu trong cùng transaction.

Hồ sơ cũ giữ nguyên `universe`, `galaxy`, `planet`, `world`, ảnh và kỹ năng. Migration chỉ tạo sẵn Vũ trụ/Thiên hà từ hồ sơ đã xác minh hoặc chính sử. Không tự đoán Tinh vân/Hệ sao, không tự gắn hồ sơ cũ vào một Hành tinh trong danh mục. Ba cột mới là `nebula`, `star_system`, `origin_planet_id`; các giá trị cũ còn thiếu sẽ hiện dấu “—”. Trường Thế giới còn được hiển thị nếu hồ sơ có dữ liệu cũ.

Các điểm sửa tiếp:

| Phần | File |
| --- | --- |
| Chọn/thêm năm cấp | `src/components/creatures/origin-picker.tsx` |
| Truy vấn và nhãn từng cấp | `src/lib/creatures/origins.ts` |
| Tích hợp bản nháp/gửi hồ sơ | `src/components/creatures/create-form.tsx` |
| Trang admin | `src/components/creatures/origin-admin.tsx` |
| Quan hệ, quyền và RPC | `supabase/migrations/202610060004_origins.sql` |
| Cờ bật chức năng | `src/lib/supabase/features.ts` |

## Kiểm tra

```powershell
npm run typecheck
npm run build
npm run test:db
npm run test:origins
```

Phần nguồn gốc có 12 kiểm thử PostgreSQL cục bộ trên schema tái dựng từ audit đã cung cấp và 7 kiểm thử trình duyệt. Bao gồm quyền đọc/ghi, admin duyệt theo cha, từ chối, giới hạn tạo, quan hệ chuẩn, dữ liệu cũ, bản nháp, mất phản hồi và điện thoại. Auth/Storage của kiểm thử được mô phỏng; không tạo dữ liệu trên Supabase thật.

Sau khi bật, kiểm tra bằng tài khoản thật: đề xuất một chuỗi, đăng nhập tài khoản khác để xác nhận chưa thấy trong danh mục, admin duyệt từ cha xuống con, tài khoản khác tải lại danh sách, tạo hồ sơ rồi mở chi tiết để kiểm tra đủ năm cấp.
