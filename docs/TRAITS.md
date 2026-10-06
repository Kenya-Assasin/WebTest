# Loài, nguyên tố, kích thước và cấp sức mạnh

Code và SQL đã chuẩn bị, nhưng chưa áp dụng SQL bổ sung trên Supabase thật. `NEXT_PUBLIC_MCA_TRAITS` mặc định tắt để bản đang chạy tiếp tục dùng hợp đồng database hiện có.

## Bật chức năng

Giai đoạn 3 và phần nguồn gốc đã được chủ dự án áp dụng. Chỉ chạy **toàn bộ `supabase/apply-traits.sql`** trong Supabase SQL Editor bằng vai trò quản trị database mặc định.

Kết quả cần có `MCA_TRAITS_APPLIED` và `mca_traits_ready = true`. Nếu có lỗi, giữ chức năng tắt và gửi nguyên thông báo lỗi. Cập nhật database nằm trong một transaction; lỗi trong cập nhật sẽ hoàn tác phần thay đổi. Không chạy lại bản gộp giai đoạn 3/nguồn gốc và không chạy thêm migration 005 riêng sau bản gộp này.

Sau khi thành công:

1. Thêm `NEXT_PUBLIC_MCA_TRAITS=true` vào `.env.local` và Vercel → Environment Variables → Production; nếu Preview dùng cùng database thì thêm cho Preview.
2. Giữ `NEXT_PUBLIC_MCA_PHASE3=true`, `NEXT_PUBLIC_MCA_ORIGINS=true`, URL và publishable key hiện có.
3. Đưa code mới lên GitHub và triển khai commit mới nhất. Các cờ `NEXT_PUBLIC_*` cần có trước khi build; chỉ thay biến mà không build/redeploy sẽ không cập nhật giao diện trên Vercel.
4. Trên máy, khởi động lại dev hoặc build lại production.

Sau khi áp dụng, `supabase/verify-traits.sql` kiểm tra lại bằng truy vấn chỉ đọc.

## Loài và nguyên tố

Loài chọn một; nguyên tố chọn nhiều bằng ô đánh dấu, tối đa 20 lựa chọn. Các lựa chọn hiện có được tạo sẵn trong danh mục, không cần nhập lại.

Người dùng bấm **+ Thêm loài sinh vật** hoặc **+ Thêm nguyên tố** nếu chưa có lựa chọn phù hợp. Đề xuất được tự chọn trong form. Người đề xuất dùng được lựa chọn đang chờ duyệt trong hồ sơ của mình; trong danh mục, người khác chỉ thấy lựa chọn đã được admin duyệt.

Admin mở `/admin` → **Duyệt loài và nguyên tố**, hoặc `/admin-phan-loai`. Chọn danh mục, trạng thái, thêm ghi chú rồi duyệt hoặc từ chối. Quyền admin được kiểm tra cả trên máy chủ và database. Người đề xuất thấy ghi chú từ chối và không thể chọn đề xuất đó cho hồ sơ mới.

Tên tối đa 100 ký tự; không phân biệt hoa/thường hoặc khoảng trắng thừa khi kiểm tra trùng. Loài và nguyên tố là hai danh mục riêng nên có thể cùng tên. Mỗi tài khoản tạo tối đa 100 đề xuất trong 24 giờ, tính chung hai danh mục. Thử lại tên đã tạo không tạo trùng hoặc tăng số đề xuất.

Duyệt danh mục và duyệt sinh vật là hai thao tác riêng. Tên loài/nguyên tố xuất hiện trong nội dung hồ sơ sinh vật tuân theo quyền đọc hồ sơ hiện có; trạng thái chờ duyệt danh mục không làm toàn bộ nội dung hồ sơ trở thành riêng tư.

## Kích thước

Ba chiều **Cao, Dài, Rộng** có ô số và đơn vị riêng. Chiều chưa biết có thể để trống. Giá trị đã nhập phải lớn hơn 0, tối đa 30 chữ số trước dấu chấm và 12 chữ số thập phân. Không dùng chữ, ký hiệu khoa học như `1e9`, số âm hoặc 0.

Các đơn vị: nanomet, micromet, milimet, centimet, decimet, mét, decamet, hectomet, kilomet, megamet, gigamet, đơn vị thiên văn và năm ánh sáng.

Database giữ nguyên chuỗi số thập phân đã kiểm tra cùng đơn vị, không ép thành số thực JavaScript hoặc tự quy đổi. Ví dụ `0.125 nm` và `12 ly` không mất độ chính xác trong bản nháp/lưu hồ sơ. Bản cũ có kích thước dạng văn bản tiếp tục được hiển thị nguyên văn.

## Độ hiếm và cấp đe dọa

Độ hiếm mới chỉ có bảy lựa chọn theo đúng thứ tự, ghép tiếng Việt với tiếng Anh:

| Tiếng Việt | Tiếng Anh | Mã lưu |
| --- | --- | --- |
| Phổ Thông | Normal | normal |
| Dị Biệt | Special | special |
| Hiếm | Rare | rare |
| Độc Nhất | Unique | unique |
| Huyền Thoại | Legend | legend |
| Thần Tính | God | god |
| Sáng Thế | Genesis | genesis |

Cấp đe dọa chính gồm:

1. Phá Tinh — nhánh F → E → D → C → B → A → S. F–A là các mức trong hành tinh, **S tương đương đạt Phá Tinh**.
2. Trầm Hệ
3. Vẫn Hà
4. Loạn Kỷ
5. Tịch Thế
6. Hỗn Giới
7. Quy Bản

Mã lưu là F/E/D/C/B/A/S và T2–T7; giao diện hiển thị tên tiếng Việt. Admin chọn cùng hệ cấp khi xác minh. Bộ lọc ưu tiên cấp đã xác minh, nếu chưa có thì dùng cấp đề xuất. Lọc nguyên tố tìm cả nguyên tố trong danh sách nhiều lựa chọn và nguyên tố đơn của hồ sơ cũ.

Mã SS/X cũ được giữ nguyên và có bộ lọc riêng; chưa suy đoán chúng tương đương cấp mới nào. Admin có thể giữ SS/X khi duyệt hồ sơ cũ, nhưng hồ sơ tạo qua form mới chỉ nhận hệ mới. Độ hiếm cũ không bị đổi trong database; nhãn common/uncommon/legendary hiển thị theo tên tương ứng Normal/Special/Legend, còn epic và unknown giữ nhãn cũ.

Bản nháp cũ có độ hiếm hoặc kích thước dạng văn bản cần được người dùng kiểm tra lại khi tạo qua form mới. **Yêu cầu đã gửi nhưng chưa rõ kết quả giữ nguyên nội dung và RPC cũ**, không tự chuyển sang hợp đồng mới khi bật cờ.

## Database và điểm sửa code

- `creature_terms`: danh mục loài/nguyên tố, người đề xuất và trạng thái; RLS ẩn đề xuất của người khác, không cho trình duyệt ghi trực tiếp hoặc đọc ID người đề xuất.
- `creature_elements`: quan hệ nhiều nguyên tố với mỗi sinh vật, khóa ngoại và thứ tự lựa chọn. Quyền đọc theo hồ sơ sinh vật, ghi qua RPC.
- Sáu cột bổ sung của `creatures`: `traits_version`, `species_term_id`, `species_name`, `element_codes`, `element_names`, `dimensions`. Dữ liệu hiện có không bị chuyển đổi hoặc xóa.
- `mca_submit_creature_v2`: lấy loài/nguyên tố chuẩn từ danh mục, kiểm tra đơn vị và số đo, lưu cùng hồ sơ/kỹ năng/nguồn gốc/mã yêu cầu trong một giao dịch. Thử lại UUID cũ sau mất phản hồi vẫn trả cùng hồ sơ, kể cả danh mục đã đổi trạng thái.
- `mca_review_creature`: mở rộng cấp chính thức, giữ kiểm tra admin và tương thích hồ sơ cũ.

| Phần | File |
| --- | --- |
| Nhãn, đơn vị, validation | `src/lib/creatures/traits.ts` |
| Chọn/thêm loài và nguyên tố | `src/components/creatures/term-picker.tsx` |
| Ba số đo và cấp đe dọa | `src/components/creatures/trait-fields.tsx` |
| Form/bản nháp/gửi hồ sơ | `src/components/creatures/create-form.tsx`, `src/lib/creatures/atomic.ts` |
| Duyệt danh mục | `src/components/creatures/term-admin.tsx` |
| Quan hệ, quyền, RPC | `supabase/migrations/202610060005_traits.sql` |

## Kiểm tra

`npm test` chạy 54 kiểm thử SQL và 46 kiểm thử trình duyệt, gồm 10 kiểm thử SQL và 9 kiểm thử giao diện cho phần mở rộng này. Kiểm thử mới kiểm tra cấp/đơn vị/số đo, đề xuất/duyệt/quyền đọc, nhiều nguyên tố, bộ lọc, bản nháp, mất phản hồi, yêu cầu cũ và điện thoại. Auth/Storage được mô phỏng, không ghi Supabase thật. Chạy thêm `npm run typecheck` và `npm run build` trước triển khai.

Sau khi bật trên database thật, kiểm tra bằng tài khoản thường và admin: đề xuất loài/nguyên tố, tài khoản khác không thấy trong danh mục trước duyệt, admin duyệt, tạo hồ sơ nhiều nguyên tố với đơn vị khác nhau, xem chi tiết, lọc nguyên tố và xác minh cấp mới. Không gửi mật khẩu hoặc khóa quản trị trong chat.
