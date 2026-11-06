# Mod Atlas

Thư viện mod, modpack, resource pack và hướng dẫn vật phẩm cho Minecraft Java. Danh mục và bản phát hành lấy từ [Modrinth](https://docs.modrinth.com/api/). “Gói của tôi” lưu trên trình duyệt và kiểm tra bản Minecraft, bộ nạp, phụ thuộc và xung đột đã khai báo.

```powershell
npm ci
npm run dev
```

Các trang: `/`, `/thu-vien`, `/vat-pham`, `/goi-mod`. Không cần khóa API hoặc cơ sở dữ liệu.

Triển khai đúng thư mục này bằng Vercel với framework **Next.js**. Đặt tên dự án riêng, rồi xác nhận địa chỉ được gán ở **Settings → Domains**. Cách triển khai qua CLI: [Vercel CLI](https://vercel.com/docs/projects/deploy-from-cli).

Kiểm tra: `npm run typecheck`, `npm run build`, `npm run test:install` và `npm test`.

## Minh họa Thư viện trên mây

Ảnh trang chủ nằm tại `public/atlas/sky-archive.webp`. Ảnh được tạo bằng công cụ tạo ảnh tích hợp, sau đó chỉnh từ bản phác thảo ban đầu theo prompt sau.

> Replace the anime human in the input with a clearly Minecraft Java player avatar in a cinematic anime-fantasy painting. This requirement is central. The avatar has a literal cubic head with discrete square planes and pixelated black hair, a simple cuboid torso, long straight rectangular-prism upper and lower limbs like classic Minecraft player proportions, square fists and flat square-footed boots. Use an original midnight-blue adventurer skin with lavender and gold pixel trim, a flat rectangular Minecraft-style cape and a squared gold pixel lantern held in the right hand. Seen from behind at three-quarter angle like the reference, no rounded human head or curved limbs, clearly recognize the character as a Minecraft avatar instantly. Put him just right of center (around 75% of image width), large enough to read on mobile, walking toward the right-side luminous fantasy archive gateway. Rework the prominent islands into distinct square-grid grass/dirt and gray stone Minecraft blocks with block-built pink cherry tree canopies and a stepped waterfall. Include a small cube crafting table beside the stairs, all building stones and steps straight and block-built. Preserve the gorgeous cinematic indigo and violet dusk, floating islands, warm gold portal light and hand-painted anime background atmosphere, including the shadowy left quarter reserved for text. Wide edge-to-edge 16:9 website hero landscape. No UI, lettering, logo, or watermark.
