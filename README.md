# Mod Atlas

Thư viện mod, modpack, resource pack và hướng dẫn vật phẩm cho Minecraft Java. Danh mục và bản phát hành lấy từ [Modrinth](https://docs.modrinth.com/api/). “Gói của tôi” lưu trên trình duyệt và kiểm tra bản Minecraft, bộ nạp, phụ thuộc và xung đột đã khai báo.

```powershell
npm ci
npm run dev
```

Các trang: `/`, `/thu-vien`, `/vat-pham`, `/goi-mod`. Không cần khóa API hoặc cơ sở dữ liệu.

Triển khai đúng thư mục này bằng Vercel với framework **Next.js**. Đặt tên dự án riêng, rồi xác nhận địa chỉ được gán ở **Settings → Domains**. Cách triển khai qua CLI: [Vercel CLI](https://vercel.com/docs/projects/deploy-from-cli).

Kiểm tra: `npm run typecheck`, `npm run build`, `npm run test:install` và `npm test`.
