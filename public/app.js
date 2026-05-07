// app.js — interactivity: signup modal, roster, packer, grab calc, countdown, sheets

(function() {
  const STORAGE_KEY = 'tripSignups2026';
  const PACK_KEY = 'tripPackerName';
  const PACK_SEL_KEY = 'tripPackerSelections';

  // ---------- Storage ----------
  function loadSignups() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveSignups(d) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  }
  let signups = loadSignups();

  // ---------- Google Sheets webhook ----------
  // The user pastes their Apps Script /exec URL into window.SHEET_URL.
  function postToSheet(payload) {
    const url = window.SHEET_URL;
    if (!url || url.indexOf('http') !== 0) return Promise.resolve();
    // no-cors avoids CORS issues with Apps Script web app
    return fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify(payload)
    }).catch(() => {});
  }

  // ---------- Roster rendering ----------
  function renderRoster(stopId) {
    const wrap = document.querySelector(`[data-roster="${stopId}"]`);
    if (!wrap) return;
    const list = signups[stopId] || [];
    if (!list.length) {
      wrap.innerHTML = '<span class="roster-empty">尚無人報名 · No sign-ups yet</span>';
      return;
    }
    wrap.innerHTML = list.map(p => {
      const name = typeof p === 'string' ? p : p.name;
      return `<span class="roster-chip" data-name="${name}">${name} <button class="chip-x" data-stop="${stopId}" data-name="${name}" title="移除" aria-label="remove">×</button></span>`;
    }).join('');
  }

  function renderAllRosters() {
    document.querySelectorAll('[data-roster]').forEach(el => {
      renderRoster(el.getAttribute('data-roster'));
    });
    renderSpaRosters();
    updatePackerSummary();
  }

  // ---------- Modal ----------
  const modal = document.getElementById('signup-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalEn = document.getElementById('modal-en');
  const modalBody = document.getElementById('modal-body');
  let activeStopId = null;

  function openModal(stopId, opts) {
    activeStopId = stopId;
    const stop = (window.TRIP.stops || []).find(s => s.id === stopId) || opts || {};
    modalTitle.textContent = stop.title || opts.title || '報名';
    modalEn.textContent = stop.titleEn || opts.titleEn || '';

    const isSpa = (opts && opts.isSpa) || stop.spa;
    if (isSpa) {
      modalBody.innerHTML = `
        <div class="field">
          <label>姓名 · Name</label>
          <input type="text" name="name" required placeholder="輸入您的名字" />
        </div>
        <div class="field">
          <label>療程類型 · Treatment</label>
          <select name="treatment">
            <option value="泰式按摩 Thai Massage">泰式按摩 · Thai Massage</option>
            <option value="精油按摩 Oil Massage">精油按摩 · Oil Massage</option>
            <option value="腳底按摩 Foot">腳底按摩 · Foot Reflexology</option>
            <option value="芳療 Aromatherapy">芳療 · Aromatherapy</option>
            <option value="混合 Mixed">混合 / 由師傅推薦</option>
          </select>
        </div>
        <button type="submit" class="btn red">送出報名 · Submit</button>
      `;
    } else {
      modalBody.innerHTML = `
        <div class="field">
          <label>參加人 · Name</label>
          <input type="text" name="name" required placeholder="輸入您的名字" autofocus />
        </div>
        <button type="submit" class="btn red">加入行程 · Join</button>
      `;
    }
    modal.classList.add('open');
    setTimeout(() => modalBody.querySelector('input,select')?.focus(), 50);
  }

  function closeModal() {
    modal.classList.remove('open');
    activeStopId = null;
  }

  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.classList.contains('modal-close')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  document.getElementById('signup-form').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = (fd.get('name') || '').toString().trim();
    if (!name) return;
    const entry = { name, ts: new Date().toISOString() };
    if (fd.get('therapist')) entry.therapist = fd.get('therapist');
    if (fd.get('treatment')) entry.treatment = fd.get('treatment');

    if (!signups[activeStopId]) signups[activeStopId] = [];
    // de-dupe by name
    signups[activeStopId] = signups[activeStopId].filter(p =>
      (typeof p === 'string' ? p : p.name) !== name
    );
    signups[activeStopId].push(entry);
    saveSignups(signups);
    postToSheet({ type:'signup', stopId: activeStopId, ...entry });
    renderRoster(activeStopId);
    renderSpaRosters();
    updatePackerSummary();
    closeModal();
  });

  // delegate click
  document.addEventListener('click', e => {
    const joinBtn = e.target.closest('[data-join]');
    if (joinBtn) {
      openModal(joinBtn.getAttribute('data-join'), {
        isSpa: joinBtn.hasAttribute('data-spa')
      });
      return;
    }
    const x = e.target.closest('.chip-x');
    if (x) {
      const stop = x.getAttribute('data-stop');
      const name = x.getAttribute('data-name');
      signups[stop] = (signups[stop] || []).filter(p =>
        (typeof p === 'string' ? p : p.name) !== name
      );
      saveSignups(signups);
      postToSheet({ type:'remove', stopId: stop, name });
      renderRoster(stop);
      renderSpaRosters();
      updatePackerSummary();
    }
    if (e.target.closest('[data-modal-close]')) closeModal();
  });

  // ---------- SPA rosters ----------
  function renderSpaRosters() {
    ['d3-sense-spa'].forEach(id => {
      const wrap = document.querySelector(`[data-spa-list="${id}"]`);
      if (!wrap) return;
      const list = signups[id] || [];
      if (!list.length) {
        wrap.innerHTML = '<div class="roster-empty">尚無人報名 · No sign-ups yet</div>';
        return;
      }
      wrap.innerHTML = list.map(p => {
        const name = typeof p === 'string' ? p : p.name;
        const treat = p.treatment || '';
        return `<div class="spa-entry">
          <div><strong>${name}</strong> <span class="treat">${treat}</span></div>
          <button class="chip-x" data-stop="${id}" data-name="${name}" aria-label="remove">×</button>
        </div>`;
      }).join('');
    });
  }

  // ---------- Countdown ----------
  function updateCountdown() {
    const target = new Date(window.TRIP.meta.departISO).getTime();
    const now = Date.now();
    const diff = Math.max(0, target - now);
    const days = Math.floor(diff / 864e5);
    const hrs  = Math.floor((diff % 864e5) / 36e5);
    const mins = Math.floor((diff % 36e5) / 6e4);
    const set = (id,v) => { const el = document.getElementById(id); if (el) el.textContent = String(v).padStart(2,'0'); };
    set('cd-days', days);
    set('cd-hrs', hrs);
    set('cd-mins', mins);
  }
  setInterval(updateCountdown, 60000);
  updateCountdown();

  // ---------- Grab calculator ----------
  function calcGrab() {
    const all = window.TRIP.stops || [];
    const cm = all.filter(s => !s.ryan).reduce((sum,s) => sum + (s.grab||0), 0);
    const bk = all.filter(s => s.ryan).reduce((sum,s) => sum + (s.grab||0), 0);
    const setText = (id,v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('grab-cm', cm.toLocaleString() + ' 銖');
    setText('grab-bk', bk.toLocaleString() + ' 銖');
    setText('grab-total', (cm+bk).toLocaleString() + ' 銖');
    setText('grab-perhead', '≈ ' + Math.round(cm / 9).toLocaleString() + ' 銖');
  }
  calcGrab();

  // ---------- Personal packer ----------
  const packName = document.getElementById('pack-name');
  if (packName) {
    packName.value = localStorage.getItem(PACK_KEY) || '';
    packName.addEventListener('input', () => {
      localStorage.setItem(PACK_KEY, packName.value);
      updatePackerSummary();
    });
  }

  function loadPackSel() {
    try { return JSON.parse(localStorage.getItem(PACK_SEL_KEY) || '[]'); }
    catch { return []; }
  }
  function savePackSel(arr) {
    localStorage.setItem(PACK_SEL_KEY, JSON.stringify(arr));
  }
  let packSel = loadPackSel();

  function updatePackerSummary() {
    const list = document.getElementById('pack-summary-list');
    if (!list) return;
    const stops = (window.TRIP.stops || []).filter(s => packSel.includes(s.id));
    if (!stops.length) {
      list.innerHTML = '<div class="cap">尚未勾選任何行程 · Nothing selected yet</div>';
      return;
    }
    const byDay = {};
    stops.forEach(s => { (byDay[s.day] = byDay[s.day] || []).push(s); });
    list.innerHTML = Object.keys(byDay).sort().map(d => {
      const dayLabels = {1:'Day 01 · 5/14',2:'Day 02 · 5/15',3:'Day 03 · 5/16',4:'Day 04 · 5/17',5:'Day 05 · 5/18',6:'Bangkok 06 · 5/18',7:'Bangkok 07 · 5/19',8:'Bangkok 08 · 5/20'};
      return `<div class="pday"><strong>${dayLabels[d]||'Day '+d}</strong>${byDay[d].map(s => `${s.time} &middot; ${s.title}`).join('<br>')}</div>`;
    }).join('');
  }

  // build pack list
  const packList = document.getElementById('pack-list');
  if (packList) {
    packList.innerHTML = (window.TRIP.stops || []).filter(s => !s.skipJoin).map(s => `
      <label class="pack-item ${packSel.includes(s.id)?'checked':''}" data-pack="${s.id}">
        <span class="check"></span>
        <span><strong>${s.title}</strong><br><span class="cap">${s.titleEn}</span></span>
        <span class="when">D${s.day} · ${s.time}</span>
      </label>
    `).join('');
    packList.addEventListener('click', e => {
      const item = e.target.closest('[data-pack]');
      if (!item) return;
      const id = item.getAttribute('data-pack');
      if (packSel.includes(id)) packSel = packSel.filter(x => x !== id);
      else packSel.push(id);
      savePackSel(packSel);
      item.classList.toggle('checked');
      updatePackerSummary();
    });
    updatePackerSummary();
  }

  // ---------- Map pin tooltips ----------
  document.querySelectorAll('.map-pin').forEach(p => {
    p.addEventListener('click', () => {
      const target = p.getAttribute('data-stop');
      if (!target) return;
      document.getElementById(target)?.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });

  // ---------- Initial render ----------
  renderAllRosters();

  // expose for debugging
  window.__trip = { signups, calcGrab };
})();
