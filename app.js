let homestays = JSON.parse(localStorage.getItem('phucsen_homestays')) || [
  {
    id: 1,
    name: "Nhà Sàn Làng Rèn Pác Rằng",
    host: "Gia đình anh Nông Văn Hùng",
    location: "Xóm Pác Rằng, xã Phúc Sen, Quảng Uyên",
    price: "150.000đ / người / đêm",
    services: "🔨 Trải nghiệm rèn dao thủ công • 🍲 Cơm gia đình Nùng An",
    phone: "0912345678",
    available: true
  },
  {
    id: 2,
    name: "Homestay Nhà Sàn Đá Khuổi Ky - Phúc Sen",
    host: "Chị Hoàng Thị Lan",
    location: "Trục đường đi Thác Bản Giốc, Quảng Uyên",
    price: "350.000đ / phòng riêng",
    services: "🛵 Cho thuê xe máy • 🌿 Ngâm chân thảo dược dân tộc",
    phone: "0987654321",
    available: true
  },
  {
    id: 3,
    name: "Nhà Sàn Truyền Thống Bản Giốc Xanh",
    host: "Bác Lục Văn Minh",
    location: "Thôn Đầu Cầu, Phúc Sen, Quảng Uyên",
    price: "120.000đ / người / đêm",
    services: "🔥 Đốt lửa trại buổi tối • 🍵 Trà giảo cổ lam miễn phí",
    phone: "0901122334",
    available: false
  }
];

let currentFilter = 'all';
let isHostMode = false;

const homestayListEl = document.getElementById('homestayList');
const hostControlListEl = document.getElementById('hostControlList');
const guestViewEl = document.getElementById('guestView');
const hostViewEl = document.getElementById('hostView');
const toggleRoleBtn = document.getElementById('toggleRoleBtn');
const addHomestayForm = document.getElementById('addHomestayForm');

function saveData() {
  localStorage.setItem('phucsen_homestays', JSON.stringify(homestays));
}

function renderGuestView() {
  const filtered = currentFilter === 'available'
    ? homestays.filter(item => item.available)
    : homestays;

  homestayListEl.innerHTML = filtered.map(item => {
    const cleanPhone = item.phone.replace(/\s+/g, '');
    const mapQuery = encodeURIComponent(`${item.name} ${item.location} Cao Bằng`);

    return `
      <div class="card">
        <div>
          <span class="badge ${item.available ? 'badge-available' : 'badge-full'}">
            ${item.available ? '🟢 Đang còn phòng' : '🔴 Hết phòng hôm nay'}
          </span>
          <h3>${item.name}</h3>
          <p class="meta">👤 Chủ nhà: <strong>${item.host}</strong></p>
          <p class="meta">📍 ${item.location}</p>
          <p class="price">💰 ${item.price}</p>
          <div class="services">${item.services}</div>
        </div>
        <div class="action-group">
          <a href="tel:${cleanPhone}" class="call-btn ${item.available ? '' : 'disabled'}">
            ${item.available ? `📞 Gọi đặt phòng (${item.phone})` : 'Tạm hết phòng'}
          </a>
          <div class="action-row">
            <a href="https://zalo.me/${cleanPhone}" target="_blank" class="zalo-btn ${item.available ? '' : 'disabled'}">
              💬 Nhắn Zalo
            </a>
            <a href="https://www.google.com/maps/search/?api=1&query=${mapQuery}" target="_blank" class="map-btn">
              🗺️ Xem Bản đồ
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderHostView() {
  hostControlListEl.innerHTML = homestays.map(item => `
    <div class="host-item">
      <div>
        <h3>${item.name}</h3>
        <p class="meta">Chủ nhà: ${item.host} • SĐT: ${item.phone}</p>
      </div>
      <div class="host-actions">
        <button 
          class="toggle-status-btn ${item.available ? 'btn-make-full' : 'btn-make-avail'}"
          onclick="toggleRoomStatus(${item.id})">
          ${item.available ? '🟢 Đang CÒN PHÒNG' : '🔴 Đang HẾT PHÒNG'}
        </button>
        <button class="delete-btn" onclick="deleteHomestay(${item.id})" title="Xóa nhà sàn này">🗑️</button>
      </div>
    </div>
  `).join('');
}

window.toggleRoomStatus = function(id) {
  homestays = homestays.map(item => 
    item.id === id ? { ...item, available: !item.available } : item
  );
  saveData();
  renderGuestView();
  renderHostView();
};

window.deleteHomestay = function(id) {
  if (confirm('Anh chắc chắn muốn xóa nhà sàn này khỏi danh sách chứ?')) {
    homestays = homestays.filter(item => item.id !== id);
    saveData();
    renderGuestView();
    renderHostView();
  }
};

addHomestayForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const newItem = {
    id: Date.now(),
    name: document.getElementById('newName').value.trim(),
    host: document.getElementById('newHost').value.trim(),
    location: document.getElementById('newLocation').value.trim(),
    price: document.getElementById('newPrice').value.trim(),
    phone: document.getElementById('newPhone').value.trim(),
    services: document.getElementById('newServices').value.trim(),
    available: true
  };

  homestays.unshift(newItem);
  saveData();
  addHomestayForm.reset();
  renderHostView();
  renderGuestView();
  alert('Đã thêm nhà sàn mới vào danh sách thành công!');
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderGuestView();
  });
});

toggleRoleBtn.addEventListener('click', () => {
  isHostMode = !isHostMode;
  if (isHostMode) {
    guestViewEl.classList.add('hidden');
    hostViewEl.classList.remove('hidden');
    toggleRoleBtn.textContent = '🎒 Quay lại xem như Khách du lịch';
    renderHostView();
  } else {
    hostViewEl.classList.add('hidden');
    guestViewEl.classList.remove('hidden');
    toggleRoleBtn.textContent = '👩‍🌾 Chế độ Chủ nhà';
    renderGuestView();
  }
});

renderGuestView();

