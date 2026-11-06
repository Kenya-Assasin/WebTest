import { normalizeSearch, type Kind } from './catalog';

export type ItemGuide = {
  id: string; name: string; english: string; projectId: string; project: string;
  category: string; purpose: string; function: string; steps: string[]; source: string;
};

export const guides: ItemGuide[] = [
  {
    id: 'water-wheel', name: 'Bánh xe nước', english: 'Water Wheel', projectId: 'LNytGWDc', project: 'Create',
    category: 'Tạo lực quay', purpose: 'Tạo lực quay cho hệ thống máy cơ khí từ dòng nước.',
    function: 'Nước chảy tác động lên bánh xe; trục ở tâm truyền chuyển động sang bộ phận kế tiếp.',
    steps: [
      'Đặt bánh xe sao cho còn chỗ cho nước chảy dọc theo mép bánh.',
      'Dẫn nước chảy qua bánh xe, rồi nối một Shaft (trục) vào tâm.',
      'Nối trục với máy cần cấp lực. Nếu máy không chạy, kiểm tra hướng trục và tải của hệ thống.',
    ],
    source: 'https://github.com/Creators-of-Create/Create/wiki/Generate-and-Convey',
  },
  {
    id: 'mechanical-press', name: 'Máy ép cơ khí', english: 'Mechanical Press', projectId: 'LNytGWDc', project: 'Create',
    category: 'Chế biến', purpose: 'Ép phôi kim loại thành tấm để chế tạo linh kiện.',
    function: 'Nhận lực quay qua trục. Đầu ép xử lý vật phẩm ở dưới; có thể kết hợp với Basin cho công thức nén.',
    steps: [
      'Đặt máy ép phía trên Depot hoặc băng chuyền, chừa khoảng trống cho đầu ép.',
      'Nối trục của máy với nguồn lực quay.',
      'Đặt phôi kim loại có công thức ép bên dưới, chẳng hạn phôi sắt, rồi lấy tấm đã ép.',
    ],
    source: 'https://github.com/Creators-of-Create/Create/wiki/Mechanical-Press',
  },
  {
    id: 'andesite-funnel', name: 'Phễu andesite', english: 'Andesite Funnel', projectId: 'LNytGWDc', project: 'Create',
    category: 'Vận chuyển', purpose: 'Chuyển vật phẩm giữa kho chứa và băng chuyền.',
    function: 'Gắn lên mặt của khối có kho chứa để chuyển vật phẩm theo hướng của phễu.',
    steps: [
      'Gắn phễu vào mặt rương hoặc khối có kho chứa.',
      'Đặt băng chuyền hoặc Depot cạnh miệng phễu để nhận hay đưa vật phẩm vào.',
      'Kiểm tra hướng chuyển. Với cách lắp cho phép đổi chiều, dùng Wrench (cờ lê) lên phễu.',
    ],
    source: 'https://github.com/Creators-of-Create/Create/wiki/Funnel',
  },
];

export function findGuides(query: string) {
  const term = normalizeSearch(query);
  return guides.filter(item => normalizeSearch([item.name, item.english, item.project, item.category, item.purpose].join(' ')).includes(term));
}

export const featured: { id: string; slug: string; title: string; kind: Kind; description: string }[] = [
  { id: 'LNytGWDc', slug: 'create', title: 'Create', kind: 'mod', description: 'Xây máy cơ khí, băng chuyền và dây chuyền tự động bằng lực quay.' },
  { id: 'fabulously-optimized', slug: 'fabulously-optimized', title: 'Fabulously Optimized', kind: 'modpack', description: 'Gói mod Fabric tập trung vào hiệu năng và đồ họa cho lối chơi gần vanilla.' },
  { id: 'faithful-32x', slug: 'faithful-32x', title: 'Faithful 32x', kind: 'resourcepack', description: 'Texture 32× giữ tinh thần hình ảnh nguyên bản của Minecraft.' },
];
