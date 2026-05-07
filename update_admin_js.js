const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'index.js');
let content = fs.readFileSync(filePath, 'utf-8');

const startIndex = content.indexOf('// ── Umrah Packages panel ───────────────────────────────────────────────────');
if (startIndex !== -1) {
  content = content.slice(0, startIndex);
}

const newLogic = `// ── Umrah Packages panel ───────────────────────────────────────────────────

window.loadUmrahPackages = async function loadUmrahPackages() {
  const tbody = document.getElementById('tbody-um');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;">Loading…</td></tr>';
  
  const data = await _adminFetch('/umrah/packages');
  if (data && data.data && Array.isArray(data.data)) {
    if (data.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;">No packages found.</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.data.map(p => {
      let typeBadge = '';
      if (p.type === 'vip') typeBadge = '<span class="badge b-gold">VIP</span>';
      else if (p.type === 'premium') typeBadge = '<span class="badge b-blue">Premium</span>';
      else if (p.type === 'standard') typeBadge = '<span class="badge b-slate">Standard</span>';
      else typeBadge = '<span class="badge b-slate">Economy</span>';

      return \`
        <tr data-type="\${p.type}" data-nights="\${p.nights}" data-visa="\${p.visa_included ? 'yes' : 'no'}">
          <td class="semi">\${p.name}</td>
          <td>\${typeBadge}</td>
          <td>\${p.nights}</td>
          <td>\${p.makkah_hotel}</td>
          <td>\${p.madinah_hotel}</td>
          <td class="semi">AED \${Number(p.price_per_person).toLocaleString()}</td>
          <td>\${p.visa_included ? '<span class="badge b-green">Yes</span>' : '<span class="badge b-slate">No</span>'}</td>
          <td>\${p.bookings_count || 0}</td>
          <td class="td-actions">
            <button class="btn-icon" title="View" onclick='viewUmrahPackage(\${JSON.stringify(p).replace(/'/g, "&#39;")})'>👁️</button>
            <button class="btn-icon" title="Edit" onclick='editUmrahPackage(\${JSON.stringify(p).replace(/'/g, "&#39;")})'>✏</button>
            <button class="btn-icon" title="Delete" style="color:var(--red)" onclick="deleteUmrahPackage(\${p.id})">🗑</button>
          </td>
        </tr>
      \`;
    }).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:red">Failed to load packages</td></tr>';
  }
};

window.viewUmrahPackage = function viewUmrahPackage(p) {
  document.getElementById('vp-title').textContent = p.name;
  document.getElementById('vp-name').textContent = p.name;
  document.getElementById('vp-type-nights').textContent = \`\${p.type.charAt(0).toUpperCase() + p.type.slice(1)} • \${p.nights} Nights\`;
  document.getElementById('vp-price').textContent = \`AED \${Number(p.price_per_person).toLocaleString()}\`;
  document.getElementById('vp-country').textContent = p.country_code === 'AE' ? 'UAE' : 'Pakistan';
  document.getElementById('vp-makkah').textContent = p.makkah_hotel;
  document.getElementById('vp-madinah').textContent = p.madinah_hotel;
  document.getElementById('vp-visa').textContent = p.visa_included ? 'Yes' : 'No';
  document.getElementById('vp-flights').textContent = p.flights_included ? 'Yes' : 'No';
  document.getElementById('vp-transport').textContent = p.transport_type;
  document.getElementById('vp-capacity').textContent = p.max_capacity || 'N/A';
  document.getElementById('vp-description').textContent = p.description || 'No description provided.';

  let images = [];
  try {
    images = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []);
  } catch(e) {}

  const coverContainer = document.getElementById('vp-cover-container');
  const coverImage = document.getElementById('vp-cover-image');
  const gallerySection = document.getElementById('vp-gallery-section');
  const gallery = document.getElementById('vp-gallery');
  
  if (images.length > 0) {
    coverContainer.style.display = 'block';
    coverImage.src = _adminApiBase().replace('/v1', '') + images[0];
    
    if (images.length > 1) {
      gallerySection.style.display = 'block';
      gallery.innerHTML = images.slice(1).map(img => 
        \`<img src="\${_adminApiBase().replace('/v1', '')}\${img}" style="height:100px;border-radius:8px;object-fit:cover;cursor:pointer" onclick="document.getElementById('vp-cover-image').src=this.src" />\`
      ).join('');
    } else {
      gallerySection.style.display = 'none';
      gallery.innerHTML = '';
    }
  } else {
    coverContainer.style.display = 'none';
    gallerySection.style.display = 'none';
    gallery.innerHTML = '';
  }

  openModal('m-view-pkg');
};

window.addUmrahImageSlot = function addUmrahImageSlot() {
  const container = document.getElementById('up-image-list');
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.style.alignItems = 'center';
  
  const input = document.createElement('input');
  input.type = 'file';
  input.className = 'up-image-file';
  input.accept = 'image/*';
  input.style.flex = '1';
  
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-icon';
  removeBtn.style.color = 'var(--red)';
  removeBtn.textContent = '✖';
  removeBtn.onclick = () => div.remove();
  
  div.appendChild(input);
  div.appendChild(removeBtn);
  container.appendChild(div);
};

window.renderUmrahExistingImages = function renderUmrahExistingImages() {
  const container = document.getElementById('up-image-list');
  container.innerHTML = '';
  
  const existingImgsEl = document.getElementById('up-existing-images');
  if (!existingImgsEl) return;
  
  let images = [];
  try {
    images = JSON.parse(existingImgsEl.value);
  } catch(e) {}
  
  images.forEach((img, idx) => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.style.alignItems = 'center';
    div.style.padding = '8px';
    div.style.background = 'var(--surface2)';
    div.style.borderRadius = '6px';
    
    const preview = document.createElement('img');
    preview.src = _adminApiBase().replace('/v1', '') + img;
    preview.style.width = '40px';
    preview.style.height = '40px';
    preview.style.objectFit = 'cover';
    preview.style.borderRadius = '4px';
    
    const label = document.createElement('span');
    label.style.flex = '1';
    label.style.fontSize = '13px';
    label.style.color = 'var(--slate)';
    label.textContent = img.split('/').pop();
    if (idx === 0) {
      const badge = document.createElement('span');
      badge.className = 'badge b-gold';
      badge.style.marginLeft = '8px';
      badge.textContent = 'Cover';
      label.appendChild(badge);
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-icon';
    removeBtn.style.color = 'var(--red)';
    removeBtn.textContent = '🗑';
    removeBtn.onclick = () => {
      images.splice(idx, 1);
      existingImgsEl.value = JSON.stringify(images);
      renderUmrahExistingImages();
    };
    
    div.appendChild(preview);
    div.appendChild(label);
    div.appendChild(removeBtn);
    container.appendChild(div);
  });
};

window.editUmrahPackage = function editUmrahPackage(p) {
  document.getElementById('up-form').reset();
  document.getElementById('up-id').value = p.id;
  document.getElementById('up-modal-title').textContent = 'Edit Umrah Package';
  
  document.getElementById('up-name').value = p.name || '';
  document.getElementById('up-portal').value = p.country_code || 'AE';
  document.getElementById('up-type').value = p.type || 'economy';
  document.getElementById('up-nights').value = p.nights || 14;
  document.getElementById('up-makkah').value = p.makkah_hotel || '';
  document.getElementById('up-madinah').value = p.madinah_hotel || '';
  document.getElementById('up-price').value = p.price_per_person || '';
  document.getElementById('up-capacity').value = p.max_capacity || '';
  document.getElementById('up-visa').value = p.visa_included ? '1' : '0';
  document.getElementById('up-flights').value = p.flights_included ? '1' : '0';
  document.getElementById('up-transport').value = p.transport_type || 'shared';
  document.getElementById('up-description').value = p.description || '';
  
  let existingImgs = document.getElementById('up-existing-images');
  if (!existingImgs) {
    existingImgs = document.createElement('input');
    existingImgs.type = 'hidden';
    existingImgs.id = 'up-existing-images';
    existingImgs.name = 'existing_images';
    document.getElementById('up-form').appendChild(existingImgs);
  }
  existingImgs.value = p.images ? (typeof p.images === 'string' ? p.images : JSON.stringify(p.images)) : '[]';
  renderUmrahExistingImages();

  openModal('m-add-pkg');
};

window.submitUmrahPackage = async function submitUmrahPackage() {
  const id = document.getElementById('up-id').value;
  const formData = new FormData();
  
  formData.append('name', document.getElementById('up-name').value);
  formData.append('country_code', document.getElementById('up-portal').value);
  formData.append('type', document.getElementById('up-type').value);
  formData.append('nights', document.getElementById('up-nights').value);
  formData.append('makkah_hotel', document.getElementById('up-makkah').value);
  formData.append('madinah_hotel', document.getElementById('up-madinah').value);
  formData.append('price_per_person', document.getElementById('up-price').value);
  const maxCap = document.getElementById('up-capacity').value;
  if (maxCap) formData.append('max_capacity', maxCap);
  formData.append('visa_included', document.getElementById('up-visa').value);
  formData.append('flights_included', document.getElementById('up-flights').value);
  formData.append('transport_type', document.getElementById('up-transport').value);
  formData.append('description', document.getElementById('up-description').value);
  
  const existingImgs = document.getElementById('up-existing-images');
  if (existingImgs) {
    formData.append('existing_images', existingImgs.value);
  }

  const fileInputs = document.querySelectorAll('.up-image-file');
  fileInputs.forEach(input => {
    if (input.files && input.files.length > 0) {
      formData.append('images', input.files[0]);
    }
  });

  const url = id ? '/umrah/packages/' + id : '/umrah/packages';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(_adminApiBase() + url, {
      method,
      headers: { 'Authorization': 'Bearer ' + _adminToken() },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data) {
      if (typeof window.toast === 'function') window.toast(id ? 'Package updated' : 'Package created', 't-green');
      closeModal('m-add-pkg');
      loadUmrahPackages();
    } else {
      if (typeof window.toast === 'function') window.toast('Error: ' + (data ? data.error : 'Unknown error'), 't-red');
    }
  } catch (err) {
    if (typeof window.toast === 'function') window.toast('Request failed', 't-red');
  }
};

window.deleteUmrahPackage = async function deleteUmrahPackage(id) {
  if (!confirm('Are you sure you want to delete this package?')) return;
  const data = await _adminFetch('/umrah/packages/' + id, { method: 'DELETE' });
  if (data && data.success !== false) {
    if (typeof window.toast === 'function') window.toast('Package deleted', 't-green');
    loadUmrahPackages();
  } else {
    if (typeof window.toast === 'function') window.toast('Delete failed', 't-red');
  }
};

window.openUmrahModal = function openUmrahModal() {
  document.getElementById('up-form').reset();
  document.getElementById('up-id').value = '';
  document.getElementById('up-modal-title').textContent = 'Add Umrah Package';
  let existingImgs = document.getElementById('up-existing-images');
  if (!existingImgs) {
    existingImgs = document.createElement('input');
    existingImgs.type = 'hidden';
    existingImgs.id = 'up-existing-images';
    existingImgs.name = 'existing_images';
    document.getElementById('up-form').appendChild(existingImgs);
  }
  existingImgs.value = '[]';
  renderUmrahExistingImages();
  addUmrahImageSlot(); // add one empty slot by default
  openModal('m-add-pkg');
};
`;

fs.writeFileSync(filePath, content + newLogic);
