// DOM Elements
const loginGate = document.getElementById('loginGate');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const employeeTableBody = document.getElementById('employeeTableBody');
const auditLogList = document.getElementById('auditLogList');
const onboardForm = document.getElementById('onboardForm');
const refreshBtn = document.getElementById('refreshBtn');

// Modal Elements
const credentialModal = document.getElementById('credentialModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTargetEmail = document.getElementById('modalTargetEmail');
const modalCompanyEmail = document.getElementById('modalCompanyEmail');
const modalTempPass = document.getElementById('modalTempPass');
const modalRole = document.getElementById('modalRole');

// Session Token Helper
function getAuthToken() {
  return sessionStorage.getItem('zt_admin_token');
}

function setAuthToken(token) {
  sessionStorage.setItem('zt_admin_token', token);
}

function clearAuthToken() {
  sessionStorage.removeItem('zt_admin_token');
}

// 1. Handle Login Admin
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    email: document.getElementById('adminEmail').value,
    password: document.getElementById('adminPassword').value,
    mfaCode: document.getElementById('adminMfa').value
  };

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.success) {
      setAuthToken(result.token);
      loginGate.classList.add('hidden');
      await loadEmployees();
      await loadAuditLogs();
    } else {
      alert(`Login Ditolak: ${result.message}`);
    }
  } catch (err) {
    console.error('Error saat login:', err);
  }
});

// 2. Handle Logout Admin
logoutBtn.addEventListener('click', async () => {
  const token = getAuthToken();
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
  clearAuthToken();
  loginGate.classList.remove('hidden');
});

// 3. Ambil & Render Daftar Karyawan
async function loadEmployees() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const res = await fetch('/api/employees', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      clearAuthToken();
      loginGate.classList.remove('hidden');
      return;
    }

    const result = await res.json();
    if (!result.success) return;

    employeeTableBody.innerHTML = '';

    result.data.forEach((emp) => {
      const isRevoked = emp.status === 'Revoked';

      const statusBadge = isRevoked
        ? `<span class="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-[10px] font-mono">REVOKED</span>`
        : `<span class="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono">ACTIVE</span>`;

      const mfaBadge = emp.mfaEnforced
        ? `<span class="text-blue-400 font-mono text-[10px] block mt-1">MFA: ENFORCED</span>`
        : `<span class="text-slate-500 font-mono text-[10px] block mt-1">MFA: NONE</span>`;

      const groupsBadges = emp.assignedGroups.length > 0
        ? emp.assignedGroups
            .map(
              (g) =>
                `<span class="inline-block bg-slate-950 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono mr-1 mb-1">${g}</span>`
            )
            .join('')
        : `<span class="text-slate-500 text-[10px] font-mono">NO ACCESS GROUPS</span>`;

      const actionBtn = isRevoked
        ? `<span class="text-slate-600 font-mono text-[10px]">ACCESS TERMINATED</span>`
        : `<button onclick="revokeEmployee('${emp.id}')" 
             class="bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 px-2.5 py-1 rounded text-[10px] font-mono tracking-wider uppercase transition">
             REVOKE ACCESS
           </button>`;

      const tr = document.createElement('tr');
      tr.className = isRevoked ? 'opacity-50 bg-slate-950/40' : 'hover:bg-slate-950/20';
      tr.innerHTML = `
        <td class="py-3 px-4">
          <div class="font-medium text-white">${emp.fullName}</div>
          <div class="font-mono text-[10px] text-slate-400">${emp.companyEmail}</div>
          <div class="font-mono text-[9px] text-slate-500">ID: ${emp.id}</div>
        </td>
        <td class="py-3 px-4">
          <div class="text-slate-200">${emp.role}</div>
          <div class="text-[10px] text-slate-500">${emp.department}</div>
        </td>
        <td class="py-3 px-4">${groupsBadges}</td>
        <td class="py-3 px-4">
          ${statusBadge}
          ${mfaBadge}
          <span class="text-[9px] text-slate-500 font-mono block mt-0.5">Sessions: ${emp.activeSessions}</span>
        </td>
        <td class="py-3 px-4 text-center">${actionBtn}</td>
      `;
      employeeTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Gagal mengambil data karyawan:', err);
  }
}

// 4. Ambil & Render Audit Log
async function loadAuditLogs() {
  try {
    const res = await fetch('/api/audit');
    const result = await res.json();
    if (!result.success) return;

    auditLogList.innerHTML = '';
    result.data.forEach((log) => {
      const isAlert = log.action.includes('ALERT') || log.action.includes('FAILED');
      const isOffboard = log.action.includes('OFFBOARD') || log.action.includes('REVOKE');
      const actionColor = isAlert ? 'text-rose-400' : isOffboard ? 'text-amber-400' : 'text-blue-400';

      const div = document.createElement('div');
      div.className = 'border-b border-slate-900 pb-1';
      div.innerHTML = `
        <span class="text-slate-500">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
        <span class="${actionColor} font-bold">[${log.action}]</span>
        <span class="text-slate-300">target: ${log.targetUser}</span>
        <span class="text-slate-500">by: ${log.actor} -</span>
        <span class="text-slate-400">${log.details}</span>
      `;
      auditLogList.appendChild(div);
    });
  } catch (err) {
    console.error('Gagal mengambil audit log:', err);
  }
}

// 5. Handle Onboarding Karyawan
onboardForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = getAuthToken();
  if (!token) return;

  const payload = {
    fullName: document.getElementById('fullName').value,
    personalEmail: document.getElementById('personalEmail').value,
    department: document.getElementById('department').value,
    role: document.getElementById('role').value
  };

  try {
    const res = await fetch('/api/employees/onboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.success) {
      onboardForm.reset();
      await loadEmployees();
      await loadAuditLogs();

      // Tampilkan Modal Notifikasi Kredensial
      modalTargetEmail.textContent = result.data.personalEmail;
      modalCompanyEmail.textContent = result.data.companyEmail;
      modalTempPass.textContent = result.data.tempPassword;
      modalRole.textContent = `${result.data.role} (${result.data.department})`;
      credentialModal.classList.remove('hidden');
    } else {
      alert(`Error: ${result.message}`);
    }
  } catch (err) {
    console.error('Gagal provisi karyawan:', err);
  }
});

closeModalBtn.addEventListener('click', () => {
  credentialModal.classList.add('hidden');
});

// 6. Handle Revoke Akses Instan
window.revokeEmployee = async function (id) {
  const token = getAuthToken();
  if (!token) return;

  const confirmed = confirm('Konfirmasi pencabutan akses instan (Offboarding)?');
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/employees/${id}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await res.json();
    if (result.success) {
      await loadEmployees();
      await loadAuditLogs();
    } else {
      alert(`Error: ${result.message}`);
    }
  } catch (err) {
    console.error('Gagal mencabut akses:', err);
  }
};

refreshBtn.addEventListener('click', () => {
  loadEmployees();
  loadAuditLogs();
});

// Inisialisasi: Periksa Token Sesi
if (getAuthToken()) {
  loginGate.classList.add('hidden');
  loadEmployees();
  loadAuditLogs();
} else {
  loginGate.classList.remove('hidden');
  loadAuditLogs(); // Audit log tetap bisa diamati di background
}