const adminCredentialKey = 'phucsen_admin_credential';
const passwordIterations = 120000;
const minimumPasswordLength = 8;

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
let currentSession = null;
let accessDialogMode = 'login';

const homestayListEl = document.getElementById('homestayList');
const hostControlListEl = document.getElementById('hostControlList');
const guestViewEl = document.getElementById('guestView');
const hostViewEl = document.getElementById('hostView');
const toggleRoleBtn = document.getElementById('toggleRoleBtn');
const addHomestayForm = document.getElementById('addHomestayForm');
const hostBannerHeading = document.getElementById('hostBannerHeading');
const hostBannerDescription = document.getElementById('hostBannerDescription');
const sessionBadge = document.getElementById('sessionBadge');
const accessDialog = document.getElementById('accessDialog');
const accessForm = document.getElementById('accessForm');
const accessTitle = document.getElementById('accessTitle');
const accessDescription = document.getElementById('accessDescription');
const accessPassword = document.getElementById('accessPassword');
const accessPasswordConfirm = document.getElementById('accessPasswordConfirm');
const confirmPasswordField = document.getElementById('confirmPasswordField');
const accessError = document.getElementById('accessError');
const accessSubmitBtn = document.getElementById('accessSubmitBtn');

function saveData() {
  localStorage.setItem('phucsen_homestays', JSON.stringify(homestays));
}

function getAdminCredential() {
  const savedCredential = localStorage.getItem(adminCredentialKey);
  return savedCredential ? JSON.parse(savedCredential) : null;
}

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function derivePasswordHash(password, salt) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Trình duyệt chưa hỗ trợ lưu mật khẩu an toàn. Hãy mở trang qua localhost hoặc HTTPS.');
  }

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(salt),
      iterations: passwordIterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

async function createCredential(password) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Trình duyệt chưa hỗ trợ lưu mật khẩu an toàn. Hãy mở trang qua localhost hoặc HTTPS.');
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bytesToHex(salt);
  return {
    salt: saltHex,
    hash: await derivePasswordHash(password, saltHex)
  };
}

async function verifyPassword(password, credential) {
  if (!credential || !credential.salt || !credential.hash) {
    return false;
  }
  return (await derivePasswordHash(password, credential.salt)) === credential.hash;
}

async function ensurePasswordIsUnique(password, excludedHomestayId) {
  const adminCredential = getAdminCredential();
  if (adminCredential && await verifyPassword(password, adminCredential)) {
    throw new Error('Mật khẩu chủ nhà phải khác mật khẩu quản trị viên.');
  }

  for (const item of homestays) {
    if (item.id === excludedHomestayId || !item.ownerCredential) {
      continue;
    }
    if (await verifyPassword(password, item.ownerCredential)) {
      throw new Error('Mỗi homestay cần một mật khẩu chủ nhà riêng.');
    }
  }
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
  if (!currentSession) {
    return;
  }

  const isAdmin = currentSession.role === 'admin';
  const visibleHomestays = isAdmin
    ? homestays
    : homestays.filter(item => item.id === currentSession.homestayId);

  addHomestayForm.classList.toggle('hidden', !isAdmin);
  hostBannerHeading.textContent = isAdmin
    ? 'Quản lý tất cả homestay'
    : 'Quản lý homestay của bạn';
  hostBannerDescription.textContent = isAdmin
    ? 'Cập nhật tình trạng phòng, thêm homestay và cấp mật khẩu riêng cho từng chủ nhà. Bản mẫu này chỉ lưu dữ liệu trên trình duyệt hiện tại.'
    : 'Bạn chỉ có thể cập nhật tình trạng phòng cho homestay được gán với mật khẩu này.';
  sessionBadge.textContent = isAdmin ? 'Quản trị viên' : 'Chủ nhà';

  if (visibleHomestays.length === 0) {
    hostControlListEl.innerHTML = '<p class="meta">Không tìm thấy homestay được gán cho tài khoản này.</p>';
    return;
  }

  hostControlListEl.innerHTML = visibleHomestays.map(item => `
    <div class="host-item">
      <div class="host-item-summary">
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
          ${isAdmin ? `<button class="delete-btn" onclick="deleteHomestay(${item.id})" title="Xóa homestay này">🗑️</button>` : ''}
        </div>
      </div>
      ${isAdmin ? `
        <form class="host-password-form" data-homestay-id="${item.id}">
          <label for="ownerPassword-${item.id}">Mật khẩu riêng của chủ nhà · ${item.ownerCredential ? 'Đã thiết lập' : 'Chưa thiết lập'}</label>
          <input id="ownerPassword-${item.id}" name="ownerPassword" type="password" minlength="${minimumPasswordLength}" autocomplete="new-password" placeholder="Ít nhất ${minimumPasswordLength} ký tự" required />
          <button type="submit">Lưu mật khẩu</button>
          <span class="password-status" aria-live="polite"></span>
        </form>
      ` : ''}
    </div>
  `).join('');
}

function openAccessDialog() {
  accessForm.reset();
  accessError.textContent = '';
  accessDialogMode = getAdminCredential() ? 'login' : 'setup';

  if (accessDialogMode === 'setup') {
    accessTitle.textContent = 'Tạo mật khẩu quản trị';
    accessDescription.textContent = `Tạo mật khẩu quản trị viên (ít nhất ${minimumPasswordLength} ký tự). Mật khẩu chỉ được lưu trên trình duyệt này; đây không phải đăng nhập bảo mật thật.`;
    accessSubmitBtn.textContent = 'Tạo mật khẩu';
    confirmPasswordField.classList.remove('hidden');
    accessPassword.autocomplete = 'new-password';
    accessPasswordConfirm.required = true;
  } else {
    accessTitle.textContent = 'Đăng nhập quản lý';
    accessDescription.textContent = 'Nhập mật khẩu quản trị viên hoặc mật khẩu riêng của homestay.';
    accessSubmitBtn.textContent = 'Đăng nhập';
    confirmPasswordField.classList.add('hidden');
    accessPassword.autocomplete = 'current-password';
    accessPasswordConfirm.required = false;
  }

  accessDialog.showModal();
  accessPassword.focus();
}

function startSession(session) {
  currentSession = session;
  guestViewEl.classList.add('hidden');
  hostViewEl.classList.remove('hidden');
  toggleRoleBtn.textContent = 'Đăng xuất';
  renderHostView();
}

function endSession() {
  currentSession = null;
  hostViewEl.classList.add('hidden');
  guestViewEl.classList.remove('hidden');
  toggleRoleBtn.innerHTML = 'Đăng nhập quản lý <span aria-hidden="true">↗</span>';
  renderGuestView();
}

function showAccessError(message) {
  accessError.textContent = message;
}

accessForm.addEventListener('submit', async event => {
  event.preventDefault();
  accessSubmitBtn.disabled = true;
  showAccessError('');

  try {
    const password = accessPassword.value;
    if (accessDialogMode === 'setup') {
      if (password.length < minimumPasswordLength) {
        showAccessError(`Mật khẩu cần có ít nhất ${minimumPasswordLength} ký tự.`);
        return;
      }
      if (password !== accessPasswordConfirm.value) {
        showAccessError('Hai mật khẩu chưa khớp.');
        return;
      }

      const credential = await createCredential(password);
      localStorage.setItem(adminCredentialKey, JSON.stringify(credential));
      accessDialog.close();
      startSession({ role: 'admin' });
      return;
    }

    const adminCredential = getAdminCredential();
    if (adminCredential && await verifyPassword(password, adminCredential)) {
      accessDialog.close();
      startSession({ role: 'admin' });
      return;
    }

    const matches = [];
    for (const item of homestays) {
      if (item.ownerCredential && await verifyPassword(password, item.ownerCredential)) {
        matches.push(item);
      }
    }

    if (matches.length > 1) {
      showAccessError('Mật khẩu này đang gán cho nhiều homestay. Hãy nhờ quản trị viên đặt mật khẩu riêng.');
      return;
    }
    if (matches.length === 0) {
      showAccessError('Mật khẩu không đúng hoặc chủ nhà chưa được cấp mật khẩu.');
      return;
    }

    accessDialog.close();
    startSession({ role: 'owner', homestayId: matches[0].id });
  } catch (error) {
    showAccessError(error.message || 'Không thể xác thực mật khẩu trên trình duyệt này.');
  } finally {
    accessSubmitBtn.disabled = false;
  }
});

document.getElementById('cancelAccessBtn').addEventListener('click', () => {
  accessDialog.close();
});

window.toggleRoomStatus = function(id) {
  const canManage = currentSession && (
    currentSession.role === 'admin' || currentSession.homestayId === id
  );
  if (!canManage) {
    alert('Bạn không có quyền cập nhật homestay này.');
    return;
  }

  homestays = homestays.map(item =>
    item.id === id ? { ...item, available: !item.available } : item
  );
  saveData();
  renderGuestView();
  renderHostView();
};

window.deleteHomestay = function(id) {
  if (!currentSession || currentSession.role !== 'admin') {
    alert('Chỉ quản trị viên mới có thể xóa homestay.');
    return;
  }

  if (confirm('Anh chắc chắn muốn xóa homestay này khỏi danh sách chứ?')) {
    homestays = homestays.filter(item => item.id !== id);
    saveData();
    renderGuestView();
    renderHostView();
  }
};

addHomestayForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!currentSession || currentSession.role !== 'admin') {
    alert('Chỉ quản trị viên mới có thể thêm homestay.');
    return;
  }

  const password = document.getElementById('newHostPassword').value;
  try {
    if (password.length < minimumPasswordLength) {
      alert(`Mật khẩu chủ nhà cần có ít nhất ${minimumPasswordLength} ký tự.`);
      return;
    }
    await ensurePasswordIsUnique(password);

    const newItem = {
      id: Date.now(),
      name: document.getElementById('newName').value.trim(),
      host: document.getElementById('newHost').value.trim(),
      location: document.getElementById('newLocation').value.trim(),
      price: document.getElementById('newPrice').value.trim(),
      phone: document.getElementById('newPhone').value.trim(),
      services: document.getElementById('newServices').value.trim(),
      ownerCredential: await createCredential(password),
      available: true
    };

    homestays.unshift(newItem);
    saveData();
    addHomestayForm.reset();
    renderHostView();
    renderGuestView();
    alert('Đã thêm homestay và tạo mật khẩu riêng cho chủ nhà.');
  } catch (error) {
    alert(error.message || 'Không thể lưu homestay.');
  }
});

hostControlListEl.addEventListener('submit', async event => {
  const form = event.target.closest('.host-password-form');
  if (!form) {
    return;
  }
  event.preventDefault();

  if (!currentSession || currentSession.role !== 'admin') {
    alert('Chỉ quản trị viên mới có thể cấp mật khẩu chủ nhà.');
    return;
  }

  const homestayId = Number(form.dataset.homestayId);
  const homestay = homestays.find(item => item.id === homestayId);
  const password = form.elements.ownerPassword.value;
  const status = form.querySelector('.password-status');

  try {
    if (!homestay) {
      throw new Error('Không tìm thấy homestay cần cập nhật.');
    }
    if (password.length < minimumPasswordLength) {
      throw new Error(`Mật khẩu cần có ít nhất ${minimumPasswordLength} ký tự.`);
    }

    await ensurePasswordIsUnique(password, homestayId);
    homestay.ownerCredential = await createCredential(password);
    saveData();
    form.reset();
    status.textContent = 'Đã lưu mật khẩu riêng cho homestay này.';
  } catch (error) {
    status.textContent = error.message || 'Không thể lưu mật khẩu chủ nhà.';
  }
});

document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(filterButton => filterButton.classList.remove('active'));
    button.classList.add('active');
    currentFilter = button.dataset.filter;
    renderGuestView();
  });
});

toggleRoleBtn.addEventListener('click', () => {
  if (currentSession) {
    endSession();
  } else {
    openAccessDialog();
  }
});

renderGuestView();
