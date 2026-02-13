// trainer-management.js - New list-based trainer management for admin dashboard
// Production-ready modular implementation
(function(){
  const API_BASE = window.location.origin.replace(/:\d+$/, ':5000');
  const state = {
    currentSection: 'pending',
    trainers: [],
    all: { pending: [], approved: [], rejected: [], all: [] },
    filters: { search: '', specialty: '', experience: '', rateType: '' },
    selected: new Set(),
    pollingInterval: null,
    lastFetchHash: '',
    cert: { items: [], index: 0 }
  };

  // --- Utilities ----------------------------------------------------------
  // Lightweight debounce helper (ensures function isn't called too frequently)
  function debounce(fn, delay){
    let timer; return function(...args){
      clearTimeout(timer);
      timer = setTimeout(()=>fn.apply(this,args), delay);
    };
  }

  // Unified token acquisition (mirrors logic patterns in gymadmin.js without tight coupling)
  async function getAdminToken({ retries=10, delay=120 }={}){
    const primaryKeys = ['gymAdminToken','token','authToken','gymAuthToken','adminToken'];
    function readOnce(){
      for(const k of primaryKeys){
        const v = localStorage.getItem(k) || sessionStorage.getItem(k);
        if(v) return v;
      }
      return null;
    }
    // If global waitForToken exists (defined in gymadmin.js) leverage it for primary key
    if(typeof window.waitForToken === 'function'){
      try {
        const t = await window.waitForToken('gymAdminToken', retries, delay);
        if(t) return t;
      } catch(_e){}
    }
    for(let i=0;i<retries;i++){
      const token = readOnce();
      if(token) return token;
      await new Promise(r=>setTimeout(r, delay));
    }
    return readOnce();
  }

  // Notification helpers (graceful fallbacks)
  function notify(message, type='info'){
    try {
      if(window.addNotificationUnified){
        window.addNotificationUnified({ title: message, message, type });
      } else if(window.addNotification){
        window.addNotification(message, type);
      } else {
        console.log(`[${type}] ${message}`);
      }
    } catch(err){ console.log('Notify fallback:', message); }
  }
  function pushLocalNotification(title, message, type='system', metadata={}){
    try {
      if(window.addNotificationUnified){
        window.addNotificationUnified({ title, message, type, metadata });
      } else {
        console.log('LocalNotification:', title, message, metadata);
      }
    } catch(err){ console.log('Notification fallback error', err); }
  }

  // DOM refs
  const refs = {};
  function cacheRefs(){
    [
      'trainerTabPendingBtn','trainerTabApprovedBtn','trainerTabRejectedBtn','trainerTabAllBtn',
      'pendingTrainersCount','approvedTrainersCount','rejectedTrainersCount','allTrainersCount',
      'trainerPendingBadge','trainerSearchInput','trainerSpecialtyFilter','trainerExperienceFilter','trainerRateTypeFilter','clearTrainerFiltersBtn',
      'bulkApproveTrainersBtn','bulkRejectTrainersBtn','selectAllTrainers','trainerList','trainerListEmptyState','refreshTrainersBtn',
      'trainerDetailDrawer','closeTrainerDetailDrawer','trainerDetailContent','trainerDetailFooter','trainerDetailApproveBtn','trainerDetailRejectBtn'
    ].forEach(id=>{ refs[id] = document.getElementById(id); });
  }

  function init(){
    if (!document.getElementById('trainerTab')) return; // not on this page
    cacheRefs();
    bindEvents();
    initialLoad();
    startPolling();
    // Backward compatibility: old code may call fetchPendingTrainers()
    if(!window.fetchPendingTrainers){
      window.fetchPendingTrainers = () => fullRefresh(true);
    }
    // Legacy renderPendingTrainers (old grid) expected by gymadmin.js; provide no-op if missing
    if(!window.renderPendingTrainers){
      window.renderPendingTrainers = function(){ /* intentionally blank: legacy grid removed */ };
    }
  }

  function bindEvents(){
    // Section tabs
    ['Pending','Approved','Rejected','All'].forEach(name => {
      const btn = refs['trainerTab'+name+'Btn'];
      if(btn){
        btn.addEventListener('click',()=>switchSection(name.toLowerCase()));
      }
    });
    // Filters
    if(refs.trainerSearchInput){
      refs.trainerSearchInput.addEventListener('input', debounce(e=>{ state.filters.search = e.target.value.trim().toLowerCase(); renderList(); },250));
    }
    if(refs.trainerSpecialtyFilter){
      refs.trainerSpecialtyFilter.addEventListener('change', e=>{ state.filters.specialty = e.target.value; renderList(); });
    }
    if(refs.trainerExperienceFilter){
      refs.trainerExperienceFilter.addEventListener('change', e=>{ state.filters.experience = e.target.value; renderList(); });
    }
    if(refs.trainerRateTypeFilter){
      refs.trainerRateTypeFilter.addEventListener('change', e=>{ state.filters.rateType = e.target.value; renderList(); });
    }
    if(refs.clearTrainerFiltersBtn){
      refs.clearTrainerFiltersBtn.addEventListener('click', ()=>{
        state.filters = { search:'', specialty:'', experience:'', rateType:'' };
        if(refs.trainerSearchInput) refs.trainerSearchInput.value='';
        ['trainerSpecialtyFilter','trainerExperienceFilter','trainerRateTypeFilter'].forEach(id=>refs[id] && (refs[id].value=''));
        renderList();
      });
    }
    if(refs.refreshTrainersBtn){ refs.refreshTrainersBtn.addEventListener('click', ()=>fullRefresh(true)); }
    if(refs.selectAllTrainers){ refs.selectAllTrainers.addEventListener('change', e=>toggleSelectAll(e.target.checked)); }
    if(refs.bulkApproveTrainersBtn){ refs.bulkApproveTrainersBtn.addEventListener('click', ()=>bulkAction('approve')); }
    if(refs.bulkRejectTrainersBtn){ refs.bulkRejectTrainersBtn.addEventListener('click', ()=>bulkAction('reject')); }
    if(refs.closeTrainerDetailDrawer){ refs.closeTrainerDetailDrawer.addEventListener('click', closeDetailDrawer); }
    if(refs.trainerDetailApproveBtn){ refs.trainerDetailApproveBtn.addEventListener('click', ()=>detailAction('approve')); }
    if(refs.trainerDetailRejectBtn){ refs.trainerDetailRejectBtn.addEventListener('click', ()=>detailAction('reject')); }

    // Row level actions via delegation
    if(refs.trainerList){
      refs.trainerList.addEventListener('click', e=>{
        const btn = e.target.closest('button[data-action]');
        if(!btn) return;
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        if(action==='view') openDetailDrawer(id);
        else if(action==='approve') approveTrainer(id);
        else if(action==='reject') rejectTrainerPrompt(id);
      });
      refs.trainerList.addEventListener('change', e=>{
        if(e.target.classList.contains('trainer-row-select')){
          const id = e.target.getAttribute('data-id');
            if(e.target.checked) state.selected.add(id); else state.selected.delete(id);
          updateBulkButtons();
        }
      });
    }
  }

  function initialLoad(){
    // Ensure we have gym profile before attempting to load trainers
    if(!window.currentGymProfile){
      fetchGymProfile().then(()=>fullRefresh()).catch(()=>fullRefresh());
    } else {
      fullRefresh();
    }
  }

  async function fetchGymProfile(){
    try {
      const token = await getAdminToken();
      if(!token) return;
      
      const res = await fetch(`${API_BASE}/api/gyms/profile/me`, { headers:{ 'Authorization':`Bearer ${token}` }});
      if(res.ok){
        const profile = await res.json();
        window.currentGymProfile = profile;
      }
    } catch(err){
      console.warn('[TrainerManagement] Failed to prefetch gym profile:', err.message);
    }
  }

  function startPolling(){
    if(state.pollingInterval) clearInterval(state.pollingInterval);
    state.pollingInterval = setInterval(()=>fullRefresh(), 60000); // 60s
  }

  async function fullRefresh(force=false){
    const token = await getAdminToken();
    let gymId = window.currentGymProfile?._id || window.currentGymProfile?.id || null;
    if(!token){
      console.warn('[TrainerManagement] No gymAdminToken found; aborting trainer load.');
      return;
    }
    if(!gymId){
      // Attempt a one-time profile fetch then retry
      await fetchGymProfile();
      gymId = window.currentGymProfile?._id || window.currentGymProfile?.id || null;
      if(!gymId){
        console.warn('[TrainerManagement] No gym ID available after profile fetch; trainers cannot be loaded.');
        return;
      }
    }
    try {
      const sections = ['pending','approved','rejected'];
      const fetches = await Promise.all(sections.map(s=>fetch(`${API_BASE}/api/trainers?status=${s}&gym=${gymId}`,{ headers:{ 'Authorization':`Bearer ${token}`}}).then(r=>r.ok?r.json():[]).catch(()=>[])));
      state.all.pending = fetches[0];
      state.all.approved = fetches[1];
      state.all.rejected = fetches[2];
      
      state.all.all = [...state.all.pending, ...state.all.approved, ...state.all.rejected];
      updateCounts();
      populateSpecialtyFilter();
      switchSection(state.currentSection,true); // re-render
      badgePending();
    } catch(e){
      console.error('Trainer refresh error', e);
    }
  }

  function updateCounts(){
    if(refs.pendingTrainersCount) refs.pendingTrainersCount.textContent = state.all.pending.length;
    if(refs.approvedTrainersCount) refs.approvedTrainersCount.textContent = state.all.approved.length;
    if(refs.rejectedTrainersCount) refs.rejectedTrainersCount.textContent = state.all.rejected.length;
    if(refs.allTrainersCount) refs.allTrainersCount.textContent = state.all.all.length;
  }

  function badgePending(){
    if(refs.trainerPendingBadge){
      const n = state.all.pending.length;
      refs.trainerPendingBadge.style.display = n>0? 'inline-flex':'none';
      refs.trainerPendingBadge.textContent = n+ (n===1? ' Pending':' Pending');
    }
  }

  function populateSpecialtyFilter(){
    const sel = refs.trainerSpecialtyFilter; if(!sel) return;
    const specialties = new Set();
    state.all.all.forEach(t=> t.specialty && specialties.add(t.specialty));
    const current = sel.value;
    sel.innerHTML = '<option value="">All Specialties</option>' + Array.from(specialties).sort().map(s=>`<option value="${s}">${s}</option>`).join('');
    if(current && [...specialties].includes(current)) sel.value = current; else if(current) state.filters.specialty='';
  }

  function switchSection(section, skipActiveClass){
    state.currentSection = section;
    state.trainers = state.all[section] || [];
    if(!skipActiveClass){
      ['trainerTabPendingBtn','trainerTabApprovedBtn','trainerTabRejectedBtn','trainerTabAllBtn'].forEach(id=>{ const b=refs[id]; if(b) b.classList.remove('active'); });
      const map = { pending:'trainerTabPendingBtn', approved:'trainerTabApprovedBtn', rejected:'trainerTabRejectedBtn', all:'trainerTabAllBtn' };
      if(refs[map[section]]) refs[map[section]].classList.add('active');
    }
    // Clear selection if not pending
    if(section!=='pending'){ state.selected.clear(); if(refs.selectAllTrainers) refs.selectAllTrainers.checked=false; }
    renderList();
  }

  function renderList(){
    if(!refs.trainerList) return;
    const list = refs.trainerList;
    const rows = applyFilters(state.trainers).map(t=> trainerRow(t)).join('');
    list.innerHTML = rows || '';
    if(refs.trainerListEmptyState){ refs.trainerListEmptyState.style.display = rows? 'none':'block'; }
    updateBulkButtons();
  }

  function applyFilters(arr){
    return arr.filter(t=>{
      if(state.filters.search){
        const hay = `${t.firstName||''} ${t.lastName||''} ${t.email||''} ${t.specialty||''}`.toLowerCase();
        if(!hay.includes(state.filters.search)) return false;
      }
      if(state.filters.specialty && t.specialty !== state.filters.specialty) return false;
      if(state.filters.experience){
        const exp = Number(t.experience)||0;
        const r = state.filters.experience;
        if(r==='0-1' && exp>1) return false;
        if(r==='1-3' && (exp<1 || exp>3)) return false;
        if(r==='3-5' && (exp<3 || exp>5)) return false;
        if(r==='5-10' && (exp<5 || exp>10)) return false;
        if(r==='>10' && exp<=10) return false;
      }
      if(state.filters.rateType){
        const types = (t.rateTypes && t.rateTypes.length)? t.rateTypes : ['hourly'];
        if(state.filters.rateType==='both'){ if(!(types.includes('hourly') && types.includes('monthly'))) return false; }
        else if(!types.includes(state.filters.rateType)) return false;
      }
      return true;
    });
  }

  function trainerRow(t){
    const img = resolveImage(t);
    const rateChips = buildRateChips(t);
    const statusBadge = buildStatusBadge(t.status);
    const selectable = t.status && t.status.toLowerCase()==='pending';
    return `<div class="trainer-list-item" data-id="${t._id}">
      <div>${selectable? `<input type="checkbox" class="trainer-row-select" data-id="${t._id}" ${state.selected.has(t._id)?'checked':''} />`: ''}</div>
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${img}" class="trainer-avatar" alt="trainer" onerror="this.src='https://via.placeholder.com/40?text=T'" />
        <div class="trainer-name">${(t.firstName||'')+' '+(t.lastName||'')}<span class="meta">${t.email||''}</span></div>
      </div>
      <div>${t.specialty||'<span style="color:#90a4ae;">—</span>'}</div>
      <div>${(t.experience||0)} yrs</div>
      <div class="rate-multi">${rateChips || '<span style="color:#90a4ae;font-size:0.65rem;">N/A</span>'}</div>
      <div>${statusBadge}</div>
      <div class="trainer-actions">${actionButtons(t)}</div>
    </div>`;
  }

  function resolveImage(t){
    if(t.photo && /^https?:/.test(t.photo)) return t.photo;
    if(t.image && /^https?:/.test(t.image)) return t.image;
    const raw = t.photo || t.image;
    if(raw) return API_BASE + (raw.startsWith('/')? raw : '/'+raw.replace(/^\//,''));
    return 'https://via.placeholder.com/40?text=T';
  }

  function buildRateChips(t){
    const chips = [];
    if(t.hourlyRate) chips.push(`<span class="trainer-rate-chip"><i class='fas fa-clock'></i> ₹${t.hourlyRate}/hr</span>`);
    if(t.monthlyRate) chips.push(`<span class="trainer-rate-chip"><i class='fas fa-calendar'></i> ₹${t.monthlyRate}/mo</span>`);
    if(!chips.length && t.rate) chips.push(`<span class="trainer-rate-chip"><i class='fas fa-rupee-sign'></i> ₹${t.rate}</span>`);
    return chips.join('');
  }

  function buildStatusBadge(status){
    const s = (status||'').toLowerCase();
    if(s==='approved') return `<span class="status-badge status-approved"><i class='fas fa-check-circle'></i> Approved</span>`;
    if(s==='rejected') return `<span class="status-badge status-rejected"><i class='fas fa-times-circle'></i> Rejected</span>`;
    return `<span class="status-badge status-pending"><i class='fas fa-hourglass-half'></i> Pending</span>`;
  }

  function actionButtons(t){
    const s = (t.status||'').toLowerCase();
    const view = `<button data-action="view" data-id="${t._id}" class="view-btn" title="View"><i class='fas fa-eye'></i></button>`;
    const approve = s==='pending'? `<button data-action="approve" data-id="${t._id}" class="approve-btn" title="Approve"><i class='fas fa-check'></i></button>`:'';
    const reject = s==='pending'? `<button data-action="reject" data-id="${t._id}" class="reject-btn" title="Reject"><i class='fas fa-times'></i></button>`:'';
    return view+approve+reject;
  }

  function toggleSelectAll(on){
    if(state.currentSection!=='pending') return;
    applyFilters(state.trainers).forEach(t=>{ if(on) state.selected.add(t._id); else state.selected.delete(t._id); });
    renderList();
  }

  function updateBulkButtons(){
    const enable = state.selected.size>0 && state.currentSection==='pending';
    if(refs.bulkApproveTrainersBtn) refs.bulkApproveTrainersBtn.disabled = !enable;
    if(refs.bulkRejectTrainersBtn) refs.bulkRejectTrainersBtn.disabled = !enable;
  }

  async function bulkAction(type){
    if(!confirm(`Are you sure you want to ${type} ${state.selected.size} trainer(s)?`)) return;
    const ids = Array.from(state.selected);
    for(const id of ids){
      if(type==='approve') await approveTrainer(id, true); else await rejectTrainer(id, 'Bulk reject', true);
    }
    notify(`Bulk ${type==='approve'?'approval':'rejection'} completed`, 'success');
    state.selected.clear();
    fullRefresh(true);
  }

  function openDetailDrawer(id){
    const trainer = state.all.all.find(t=>t._id===id);
    if(!trainer || !refs.trainerDetailDrawer) return;
    const img = resolveImage(trainer);
    const certHtml = buildCertThumbnails(trainer);
    refs.trainerDetailContent.innerHTML = `
      <div style="display:flex;gap:16px;align-items:center;margin-bottom:20px;">
        <img src="${img}" style="width:72px;height:72px;border-radius:14px;object-fit:cover;border:3px solid #e3e9ed;" onerror="this.src='https://via.placeholder.com/72?text=T'" />
        <div style="flex:1;">
          <h2 style="margin:0 0 4px 0;font-size:1.1rem;">${(trainer.firstName||'')+' '+(trainer.lastName||'')} </h2>
          <div style="font-size:0.75rem;color:#607d8b;">${trainer.email||''} • ${trainer.phone||''}</div>
          <div style="margin-top:8px;">${buildStatusBadge(trainer.status)}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <h4 class="tm-sub-head">Specialty</h4>
          <div class="tm-field-val">${trainer.specialty||'—'}</div>
        </div>
        <div>
          <h4 class="tm-sub-head">Experience</h4>
          <div class="tm-field-val">${trainer.experience||0} years</div>
        </div>
        <div>
          <h4 class="tm-sub-head">Rates</h4>
          <div>${buildRateChips(trainer) || '—'}</div>
        </div>
        <div>
          <h4 class="tm-sub-head">Bio</h4>
          <div class="tm-bio">${trainer.bio ? escapeHtml(trainer.bio) : '<span style=\'color:#90a4ae;\'>No bio provided.</span>'}</div>
        </div>
        <div>
          <h4 class="tm-sub-head">Availability</h4>
          <div class="tm-availability">${formatAvailability(trainer.availability)}</div>
        </div>
        <div>
          <h4 class="tm-sub-head" style="display:flex;align-items:center;gap:6px;">Certifications ${trainer.certifications && trainer.certifications.length? `<span style='background:#e0f2fe;color:#0369a1;font-size:0.55rem;padding:2px 8px;border-radius:16px;font-weight:600;'>${trainer.certifications.length}</span>`:''}</h4>
          ${certHtml}
        </div>
      </div>`;
    attachCertEvents();
    if(refs.trainerDetailDrawer){ refs.trainerDetailDrawer.style.display='flex'; requestAnimationFrame(()=>{ refs.trainerDetailDrawer.style.transform='translateX(0)'; }); }
    const isPending = (trainer.status||'').toLowerCase()==='pending';
    if(refs.trainerDetailApproveBtn) refs.trainerDetailApproveBtn.style.display = isPending? 'inline-flex':'none';
    if(refs.trainerDetailRejectBtn) refs.trainerDetailRejectBtn.style.display = isPending? 'inline-flex':'none';
    refs.trainerDetailApproveBtn && refs.trainerDetailApproveBtn.setAttribute('data-id', id);
    refs.trainerDetailRejectBtn && refs.trainerDetailRejectBtn.setAttribute('data-id', id);
  }

  function closeDetailDrawer(){
    if(!refs.trainerDetailDrawer) return;
    refs.trainerDetailDrawer.style.transform='translateX(100%)';
    setTimeout(()=>{ if(refs.trainerDetailDrawer) refs.trainerDetailDrawer.style.display='none'; }, 320);
  }

  // Detail drawer action handler
  function detailAction(type){
    const id = type === 'approve' 
      ? refs.trainerDetailApproveBtn?.getAttribute('data-id')
      : refs.trainerDetailRejectBtn?.getAttribute('data-id');
    
    if(!id) {
      notify('Unable to identify trainer', 'error');
      return;
    }
    
    if(type === 'approve') {
      approveTrainer(id);
    } else if(type === 'reject') {
      rejectTrainerPrompt(id);
    }
  }

  function formatAvailability(av){
    if(!av) return '<span style="color:#90a4ae;">Not specified</span>';
    if(typeof av==='string') return av;
    if(typeof av==='object'){ return Object.entries(av).map(([d,v])=>`<div><strong>${capitalize(d)}:</strong> <span>${Array.isArray(v)? v.join(', '): v}</span></div>`).join(''); }
    return '<span style="color:#90a4ae;">Not specified</span>';
  }
  function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

  // Approve / Reject
  async function approveTrainer(id, silent){
    if(!silent){
      openActionDialog({ type:'approve', id, onConfirm: () => doApprove(id,silent) });
      return;
    }
    return doApprove(id,true);
  }
  async function doApprove(id,silent){
    const token = await getAdminToken(); 
    if(!token){ 
      if(!silent) notify('Missing auth token – please re-login.','error'); 
      return; 
    }
    try {
      const res = await fetch(`${API_BASE}/api/trainers/${id}/approve`,{ method:'PATCH', headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({}) });
      if(!res.ok){
        if(res.status===422){
          try { const data = await res.json(); const firstErr = Object.values(data.errors||{})[0]; if(!silent) notify('Validation: '+ (firstErr?.message || data.message),'error'); } catch(_) { if(!silent) notify('Validation error approving trainer','error'); }
        } else if(res.status===401 || res.status===403){
          if(!silent) notify('Not authorized to approve trainer. Check your session/role.','error');
        } else {
          if(!silent) notify('Approve failed','error');
        }
        return;
      }
      if(!silent){ notify('Trainer approved','success'); }
      fullRefresh(true); closeDetailDrawer();
      pushLocalNotification('Trainer Approved', 'A trainer application has been approved.', 'trainer-approved', { trainerId:id });
    } catch(e){ if(!silent) notify('Failed to approve trainer','error'); }
  }
  function rejectTrainerPrompt(id){
    openActionDialog({ type:'reject', id, onConfirm: ({reason}) => doReject(id, reason, false) });
  }
  async function rejectTrainer(id, reason='', silent){
    if(!silent){
      openActionDialog({ type:'reject', id, onConfirm: ({reason:r}) => doReject(id, r, false) });
      return;
    }
    return doReject(id, reason, true);
  }
  async function doReject(id, reason='', silent){
    const token = await getAdminToken(); 
    if(!token){ 
      if(!silent) notify('Missing auth token – please re-login.','error'); 
      return; 
    }
    try {
      const res = await fetch(`${API_BASE}/api/trainers/${id}/reject`,{ method:'PATCH', headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ reason }) });
      if(!res.ok){
        if(res.status===422){
          try { const data = await res.json(); const firstErr = Object.values(data.errors||{})[0]; if(!silent) notify('Validation: '+ (firstErr?.message || data.message),'error'); } catch(_) { if(!silent) notify('Validation error rejecting trainer','error'); }
        } else if(res.status===401 || res.status===403){
          if(!silent) notify('Not authorized to reject trainer. Check your session/role.','error');
        } else {
          if(!silent) notify('Reject failed','error');
        }
        return;
      }
      if(!silent){ notify('Trainer rejected','info'); }
      fullRefresh(true); closeDetailDrawer();
      pushLocalNotification('Trainer Rejected', 'A trainer application has been rejected.', 'trainer-rejected', { trainerId:id, reason });
    } catch(e){ if(!silent) notify('Failed to reject trainer','error'); }
  }

  // Bulk action override
  async function bulkAction(type){
    if(state.selected.size===0) return;
    openActionDialog({
      type: type==='approve' ? 'approve':'reject',
      id: 'bulk',
      onConfirm: async ({reason}) => {
        const ids = Array.from(state.selected);
        for(const id of ids){
          if(type==='approve') await doApprove(id,true); else await doReject(id, reason, true);
        }
        notify(`Bulk ${type==='approve'?'approval':'rejection'} completed`,'success');
        state.selected.clear();
        fullRefresh(true);
      }
    });
  }

  function buildCertThumbnails(trainer){
    const list = Array.isArray(trainer.certifications)? trainer.certifications.filter(Boolean): [];
    if(!list.length) return `<div style='font-size:0.7rem;color:#90a4ae;'>No certifications uploaded.</div>`;
    state.cert.items = list.map(src=> normalizeCertPath(src));
    const thumbs = state.cert.items.map((c,i)=>`<div class='tm-cert-thumb' data-index='${i}' title='View certificate ${i+1}'><img src='${c}' alt='Cert ${i+1}' onerror="this.src='https://via.placeholder.com/60?text=PDF';" /></div>`).join('');
    return `<div class='tm-cert-thumb-row'>${thumbs}</div>`;
  }
  function normalizeCertPath(p){
    if(/^https?:/i.test(p)) return p; // already absolute
    let clean = p.replace(/\\/g,'/');
    if(!clean.startsWith('/')) clean = '/' + clean;
    if(!/\/uploads\//.test(clean)){
      if(/trainers\//.test(clean)) clean = '/uploads/' + clean.replace(/^\//,'');
    }
    return API_BASE + clean;
  }
  function attachCertEvents(){
    const row = refs.trainerDetailContent && refs.trainerDetailContent.querySelector('.tm-cert-thumb-row');
    if(!row) return;
    row.addEventListener('click', e=>{
      const thumb = e.target.closest('.tm-cert-thumb');
      if(!thumb) return;
      const idx = Number(thumb.getAttribute('data-index'))||0;
      openCertModal(idx);
    });
  }
  // Lightbox
  function openCertModal(index){
    const modal = document.getElementById('trainerCertModal');
    if(!modal) return;
    state.cert.index = index;
    modal.style.display='flex';
    document.body.style.overflow='hidden';
    loadCertImage();
  }
  function closeCertModal(){
    const modal = document.getElementById('trainerCertModal');
    if(modal){ modal.style.display='none'; document.body.style.overflow='auto'; }
  }
  function loadCertImage(){
    const imgEl = document.getElementById('trainerCertImage');
    const loading = document.getElementById('trainerCertLoading');
    const counter = document.getElementById('trainerCertCounter');
    const dl = document.getElementById('trainerCertDownload');
    const openRaw = document.getElementById('trainerCertOpenRaw');
    if(!imgEl) return;
    const src = state.cert.items[state.cert.index];
    imgEl.style.opacity=0;
    loading.style.display='flex';
    imgEl.onload = ()=>{ loading.style.display='none'; imgEl.style.opacity=1; };
    imgEl.onerror = ()=>{ loading.innerHTML='<span style="color:#ef4444">Failed to load</span>'; };
    imgEl.src = src;
    if(counter) counter.textContent = `${state.cert.index+1} / ${state.cert.items.length}`;
    if(dl) dl.href = src;
    if(openRaw) openRaw.href = src;
    highlightCurrentThumb();
  }
  function highlightCurrentThumb(){
    const strip = document.getElementById('trainerCertThumbStrip');
    if(!strip) return;
    strip.innerHTML = state.cert.items.map((c,i)=>`<div class='tm-cert-mini ${i===state.cert.index?'active':''}' data-index='${i}'><img src='${c}' /></div>`).join('');
    strip.querySelectorAll('.tm-cert-mini').forEach(el=>{
      el.addEventListener('click', ()=>{ state.cert.index = Number(el.getAttribute('data-index')); loadCertImage(); });
    });
  }
  document.addEventListener('click', e=>{
    if(e.target.id==='closeTrainerCertModal') closeCertModal();
    if(e.target.id==='trainerCertPrev'){ state.cert.index = (state.cert.index-1+state.cert.items.length)%state.cert.items.length; loadCertImage(); }
    if(e.target.id==='trainerCertNext'){ state.cert.index = (state.cert.index+1)%state.cert.items.length; loadCertImage(); }
    if(e.target.id==='trainerCertModal' && e.target===e.currentTarget) closeCertModal();
  });
  document.addEventListener('keydown', e=>{
    const modal = document.getElementById('trainerCertModal');
    if(modal && modal.style.display==='flex'){
      if(e.key==='Escape') closeCertModal();
      if(e.key==='ArrowLeft') { state.cert.index = (state.cert.index-1+state.cert.items.length)%state.cert.items.length; loadCertImage(); }
      if(e.key==='ArrowRight'){ state.cert.index = (state.cert.index+1)%state.cert.items.length; loadCertImage(); }
    }
  });
  // Styles for cert thumbs injected once
  if(!document.getElementById('trainerCertStyles')){
    const style = document.createElement('style');
    style.id='trainerCertStyles';
    style.textContent = `.tm-cert-thumb-row{display:flex;flex-wrap:wrap;gap:10px;} .tm-cert-thumb{width:64px;height:64px;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;cursor:pointer;position:relative;background:#f8fafc;display:flex;align-items:center;justify-content:center;} .tm-cert-thumb img{width:100%;height:100%;object-fit:cover;transition:transform .3s ease;} .tm-cert-thumb:hover img{transform:scale(1.08);} .tm-cert-mini{width:54px;height:54px;border:2px solid transparent;border-radius:12px;overflow:hidden;cursor:pointer;flex:0 0 auto;opacity:.6;transition:all .25s ease;} .tm-cert-mini.active{border-color:#38bdf8;opacity:1;} .tm-cert-mini img{width:100%;height:100%;object-fit:cover;}`;
    document.head.appendChild(style);
  }
  function escapeHtml(str){ return (str||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  // Themed action dialog
  function openActionDialog({type,id,onConfirm}){
    const dialog = document.getElementById('trainerActionDialog'); if(!dialog) return;
    dialog.style.display='flex'; document.body.style.overflow='hidden';
    dialog.dataset.actionType = type; dialog.dataset.trainerId = id;
    const titleEl = document.getElementById('trainerActionTitle');
    const msgEl = document.getElementById('trainerActionMessage');
    const iconBox = document.getElementById('trainerActionIcon');
    const extra = document.getElementById('trainerActionExtraFields');
    const rej = document.getElementById('trainerRejectionReason');
    if(type==='approve'){
      titleEl.textContent='Approve Trainer';
      msgEl.textContent='This trainer will become available on the platform and visible in public listings. Continue?';
      iconBox.style.background='#e0f7ec'; iconBox.style.color='#15803d'; iconBox.innerHTML='<i class="fas fa-check-circle"></i>';
      extra.style.display='none'; if(rej) rej.value='';
    } else if(type==='reject'){
      titleEl.textContent='Reject Trainer';
      msgEl.textContent='Rejected trainers will be notified. Provide an optional reason below.';
      iconBox.style.background='#fee2e2'; iconBox.style.color='#b91c1c'; iconBox.innerHTML='<i class="fas fa-times-circle"></i>';
      extra.style.display='block'; if(rej) rej.value='';
    }
    const confirmBtn = document.getElementById('trainerActionConfirmBtn');
    confirmBtn.onclick = async ()=>{
      const reason = (type==='reject' && rej)? rej.value.trim():'';
      dialog.style.display='none'; document.body.style.overflow='auto';
      await onConfirm({ reason });
    };
    const cancel = ()=>{ dialog.style.display='none'; document.body.style.overflow='auto'; };
    document.getElementById('trainerActionCancelBtn').onclick = cancel;
    document.getElementById('closeTrainerActionDialog').onclick = cancel;
  }
  // Expose refresh for external triggers (like after new registration elsewhere in admin)
  window.refreshTrainerManagement = fullRefresh;

  document.addEventListener('DOMContentLoaded', init);
})();
