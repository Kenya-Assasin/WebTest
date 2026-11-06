import { normalizeSearch, type Kind } from './catalog';

export type ItemGuide = {
  id: string; name: string; english: string; projectId: string; project: string;
  category: string; purpose: string; function: string; steps: string[]; source: string;
  translation: { category: string; purpose: string; function: string; steps: string[] };
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
    translation: {
      category: 'Rotational power',
      purpose: 'Uses flowing water to power mechanical systems.',
      function: 'Water turns the wheel, and a shaft connected at the center transfers rotation to the next component.',
      steps: [
        'Place the wheel with enough room for water to flow along its edge.',
        'Route water past the wheel and connect a Shaft to its center.',
        'Connect the shaft to the machine. If it does not run, check the shaft alignment and the load on your system.',
      ],
    },
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
    translation: {
      category: 'Processing',
      purpose: 'Presses metal ingots into sheets for crafting components.',
      function: 'A shaft supplies rotational power. The press acts on items underneath it and can work with a Basin for compacting recipes.',
      steps: [
        'Place the press above a Depot or belt, leaving room for the press head.',
        'Connect its shaft to a source of rotational power.',
        'Place a metal ingot with a pressing recipe, such as iron, underneath and collect the sheet.',
      ],
    },
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
    translation: {
      category: 'Transport',
      purpose: 'Moves items between an inventory and a belt.',
      function: 'Attaches to the face of a block with an inventory and transfers items in the direction of the funnel.',
      steps: [
        'Attach the funnel to a chest or another block with an inventory.',
        'Place a belt or Depot next to its opening to receive or feed items.',
        'Check the direction of travel. Use a Wrench on the funnel where the setup allows you to reverse it.',
      ],
    },
  },
];

export function findGuides(query: string) {
  const term = normalizeSearch(query);
  return guides.filter(item => normalizeSearch([
    item.name, item.english, item.project, item.category, item.purpose, item.translation.category, item.translation.purpose,
  ].join(' ')).includes(term));
}

export const featured: { id: string; slug: string; title: string; kind: Kind; description: string; descriptionEn: string }[] = [
  { id: 'LNytGWDc', slug: 'create', title: 'Create', kind: 'mod', description: 'Xây máy cơ khí, băng chuyền và dây chuyền tự động bằng lực quay.',
    descriptionEn: 'Build machines, conveyor belts and automated production lines with rotational power.' },
  { id: 'fabulously-optimized', slug: 'fabulously-optimized', title: 'Fabulously Optimized', kind: 'modpack', description: 'Gói mod Fabric tập trung vào hiệu năng và đồ họa cho lối chơi gần vanilla.',
    descriptionEn: 'A Fabric modpack that improves performance and visuals for a vanilla-like experience.' },
  { id: 'faithful-32x', slug: 'faithful-32x', title: 'Faithful 32x', kind: 'resourcepack', description: 'Texture 32× giữ tinh thần hình ảnh nguyên bản của Minecraft.',
    descriptionEn: '32× textures that preserve the look of original Minecraft.' },
];
