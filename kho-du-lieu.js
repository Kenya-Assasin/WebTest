/* ---------- creature dossier data ---------- */
const TIERS = ['F','E','D','C','B','A','S','SS','X'];
const CREATURES = {
  leviathan:{
    name:'Astral Leviathan', race:'Rồng Không Gian', code:'VX-2047',
    status:'verified', threat:'A', investigator:'Điều tra viên Kenya',
    planet:'Nebula-9', age:'Chưa xác định', size:'12 km', element:'Không Gian', rarity:'Hiếm',
    desc:'Sinh vật khổng lồ sống giữa các dòng năng lượng thiên hà.',
    likes:'4.200', tierLabel:'A', image:'https://picsum.photos/900/500?random=1',
    thumb:'https://picsum.photos/400/250?random=1',
    skills:[
      {name:'Bẻ cong Không Gian', range:'200 m', duration:'8 giây', cooldown:'24 giờ'},
      {name:'Trường hấp dẫn cục bộ', range:'50 m', duration:'12 giây', cooldown:'6 giờ'}
    ],
    weakness:'Không thể dịch chuyển khi tiếp xúc Helion.',
    log:[
      {date:'12/07', event:'Phát hiện tại rìa thiên hà Nebula.'},
      {date:'15/07', event:'Cập nhật ảnh chụp cận cảnh.'},
      {date:'20/07', event:'Hạ cấp từ S xuống A sau khi xác minh giới hạn năng lực.'}
    ]
  },
  voidwolf:{
    name:'Void Wolf', race:'Thú Hư Không', code:'VX-1183',
    status:'verified', threat:'B', investigator:'Điều tra viên Kenya',
    planet:'Chưa xác định', age:'~3 năm', size:'1.4 m', element:'Hư Không', rarity:'Không phổ biến',
    desc:'Có khả năng dịch chuyển khoảng cách ngắn trong bóng tối.',
    likes:'2.180', tierLabel:'B', image:'https://picsum.photos/900/500?random=2',
    thumb:'https://picsum.photos/400/250?random=2',
    skills:[
      {name:'Dịch chuyển bóng tối', range:'15 m', duration:'Tức thời', cooldown:'45 giây'}
    ],
    weakness:'Mất khả năng dịch chuyển dưới ánh sáng cường độ cao.',
    log:[
      {date:'02/06', event:'Ghi nhận đầu tiên gần khu vực dị thường.'},
      {date:'09/06', event:'Xác minh hồ sơ, xếp Cấp B.'}
    ]
  },
  mantis:{
    name:'Crystal Mantis', race:'Côn trùng tinh thể', code:'VX-0542',
    status:'pending', threat:'C', investigator:'Chờ phân công',
    planet:'Prax-4', age:'Không rõ', size:'40 cm', element:'Khoáng chất', rarity:'Phổ biến',
    desc:'Lớp giáp phản xạ ánh sáng giúp gần như vô hình.',
    likes:'1.620', tierLabel:'C', image:'https://picsum.photos/900/500?random=3',
    thumb:'https://picsum.photos/400/250?random=3',
    skills:[
      {name:'Ngụy trang phản xạ', range:'Bản thân', duration:'Liên tục', cooldown:'Không'}
    ],
    weakness:'Lớp giáp giòn, dễ vỡ khi va chạm mạnh.',
    log:[
      {date:'20/07', event:'Phát hiện, đang chờ điều tra viên xác minh.'}
    ]
  }
};

const viewList = document.getElementById('view-list');
const viewDetail = document.getElementById('view-detail');
const cardContainer = document.getElementById('card-container');
const searchInput = document.getElementById('search-input');
const resultTag = document.getElementById('result-tag');

function renderCards(ids){
  cardContainer.innerHTML = ids.map(id => {
    const c = CREATURES[id];
    const statusLabel = c.status === 'verified' ? 'Đã xác minh' : 'Chờ điều tra';
    return `
      <div class="card" data-id="${id}" tabindex="0" role="button">
        <div class="thumb">
          <img src="${c.thumb}" alt="${c.name}">
          <span class="tier">Cấp ${c.tierLabel}</span>
        </div>
        <div class="info">
          <h3>${c.name}</h3>
          <span class="type">${c.race}</span>
          <p>${c.desc}</p>
          <div class="bottom">
            <span class="likes">❤ ${c.likes}</span>
            <span class="status ${c.status}">${statusLabel}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  cardContainer.querySelectorAll('.card[data-id]').forEach(card => {
    card.addEventListener('click', () => showDetail(card.dataset.id));
    card.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); showDetail(card.dataset.id); }
    });
  });
}

function filterCreatures(){
  const q = searchInput.value.trim().toLowerCase();
  const ids = Object.keys(CREATURES).filter(id => {
    if(!q) return true;
    const c = CREATURES[id];
    return [c.name, c.race, c.planet, c.code].join(' ').toLowerCase().includes(q);
  });
  resultTag.textContent = q ? `${ids.length} kết quả cho "${searchInput.value.trim()}"` : 'Tất cả hồ sơ';
  renderCards(ids);
}

function renderDetail(c){
  const tierIndex = TIERS.indexOf(c.threat);
  const isExtreme = c.threat === 'SS' || c.threat === 'X';
  viewDetail.innerHTML = `
    <button class="back-btn" id="back-btn">← Quay lại kho dữ liệu</button>
    <div class="dossier-top">
      <span class="code">${c.code} — ${c.status === 'verified' ? 'Đã xác minh' : 'Chờ xác minh'}</span>
      <div class="tags">
        <span class="pill ${c.status}">${c.status === 'verified' ? 'Đã xác minh' : 'Chờ xác minh'}</span>
        <span class="pill">Cấp đe dọa: ${c.threat}</span>
        <span class="pill">${c.investigator}</span>
      </div>
    </div>
    <div class="dossier-body">
      <img class="dossier-hero-img" src="${c.image}" alt="${c.name}">
      <div class="dossier-name">
        <h2>${c.name}</h2>
        <span class="race">${c.race}</span>
      </div>
      <div class="attr-table">
        <div class="attr-row"><span class="k">Chủng tộc</span><span class="v">${c.race}</span></div>
        <div class="attr-row"><span class="k">Hành tinh</span><span class="v">${c.planet}</span></div>
        <div class="attr-row"><span class="k">Tuổi</span><span class="v">${c.age}</span></div>
        <div class="attr-row"><span class="k">Kích thước</span><span class="v">${c.size}</span></div>
        <div class="attr-row"><span class="k">Nguyên tố</span><span class="v">${c.element}</span></div>
        <div class="attr-row"><span class="k">Mức độ hiếm</span><span class="v">${c.rarity}</span></div>
      </div>
      <div class="threat-block">
        <h4>Mức đe dọa</h4>
        <div class="threat-meter">
          ${TIERS.map((t,i) => `<span class="${i===tierIndex ? 'active' + (isExtreme ? ' extreme' : '') : ''}">${t}</span>`).join('')}
        </div>
        ${isExtreme ? '<div class="threat-warning">⚠ Cảnh báo: sinh vật thuộc cấp đe dọa cực cao.</div>' : ''}
      </div>
      <div class="skills-block">
        <h4>Kỹ năng</h4>
        <div class="skill-grid">
          ${c.skills.map(s => `
            <div class="skill-card">
              <div class="sname">${s.name}</div>
              <ul>
                <li>Phạm vi: ${s.range}</li>
                <li>Thời gian: ${s.duration}</li>
                <li>Hồi chiêu: ${s.cooldown}</li>
              </ul>
            </div>`).join('')}
        </div>
      </div>
      <div class="weak-block">
        <h4>Điểm yếu</h4>
        <div class="weak-box">${c.weakness}</div>
      </div>
      <div class="log-block">
        <h4>Nhật ký điều tra</h4>
        <div class="timeline">
          ${c.log.map(l => `
            <div class="timeline-item"><span class="date">${l.date}</span><span class="event">${l.event}</span></div>`).join('')}
        </div>
      </div>
    </div>
  `;
  document.getElementById('back-btn').addEventListener('click', showList);
}

function showDetail(id){
  const c = CREATURES[id];
  if(!c) return;
  renderDetail(c);
  viewList.hidden = true;
  viewDetail.hidden = false;
  viewDetail.classList.remove('reveal');
  void viewDetail.offsetWidth;
  viewDetail.classList.add('reveal');
  window.scrollTo({top:0, behavior:'smooth'});
}

function showList(){
  viewDetail.hidden = true;
  viewList.hidden = false;
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ---------- init: render all cards, honor ?id= and ?q= from URL ---------- */
renderCards(Object.keys(CREATURES));

const params = new URLSearchParams(window.location.search);
const openId = params.get('id');
const initialQuery = params.get('q');

if(initialQuery){
  searchInput.value = initialQuery;
  filterCreatures();
}
if(openId && CREATURES[openId]){
  showDetail(openId);
}

searchInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') filterCreatures();
});