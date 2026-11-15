'use strict';
(() => {
  const el = id => document.getElementById(id);
  const date = value => value ? new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo'
  }).format(new Date(value)) : 'Not recorded';
  const node = (tag, text) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    return element;
  };
  let token = '', staff = null, epoch = 0, listVersion = 0;
  let lastActivity = 0;
  let controller = new AbortController(), idleTimer, nextCursor = null, currentCursor = null, selected = null;
  const stale = () => new DOMException('Request cancelled', 'AbortError');
  const notify = message => { el('notice').textContent = message; };
  function busy(value) {
    for (const element of el('workspace').querySelectorAll('button,select')) element.disabled = value;
    if (!value) el('older').disabled = !nextCursor;
  }
  function clearSession(message = '') {
    epoch++; listVersion++; controller.abort(); controller = new AbortController();
    clearTimeout(idleTimer); lastActivity = 0; token = ''; staff = null; selected = null;
    nextCursor = null; currentCursor = null;
    el('rows').replaceChildren(); el('detail').replaceChildren(); el('identity').textContent = '';
    el('workspace').hidden = true; el('logout').hidden = true; el('login').hidden = false;
    el('login-form').reset(); el('status-filter').value = ''; el('signin').disabled = false;
    notify(message); el('token').focus({ preventScroll: true });
  }
  function expired() { return token && lastActivity && Date.now() - lastActivity >= 15 * 60 * 1000; }
  function touch() {
    if (expired()) { clearSession('Session ended after inactivity. Please sign in again.'); return; }
    clearTimeout(idleTimer);
    if (token) { lastActivity = Date.now(); idleTimer = setTimeout(() => clearSession('Session ended after inactivity. Please sign in again.'), 15 * 60 * 1000); }
  }
  async function request(path, options = {}) {
    if (expired()) { clearSession('Session ended after inactivity. Please sign in again.'); throw stale(); }
    if (!token) throw stale();
    const version = epoch;
    const response = await fetch('/api/staff' + path, {
      ...options, credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { Authorization: 'Bearer ' + token, ...(options.body ? { 'Content-Type': 'application/json' } : {}) }
    });
    let body;
    try { body = await response.json(); } catch (_) { body = {}; }
    if (version !== epoch) throw stale();
    if ([401, 403, 503].includes(response.status)) {
      clearSession(response.status === 503 ? 'Staff access is unavailable. Contact your administrator.' : 'Access ended. Please sign in again.');
      throw stale();
    }
    if (!response.ok) {
      const error = new Error(body.message || 'The request could not be completed. Please retry.');
      error.status = response.status;
      throw error;
    }
    return body;
  }
  function showError(error) { if (error.name !== 'AbortError') notify(error.status ? error.message : 'Connection failed. Please retry.'); }
  function renderRows(rows) {
    el('rows').replaceChildren(); el('empty').hidden = rows.length !== 0;
    for (const record of rows) {
      const row = node('tr');
      for (const text of [record.name, record.product, record.status]) row.append(node('td', text || 'Not recorded'));
      const cell = node('td'), open = node('button', 'Open');
      open.setAttribute('aria-label', 'Open enquiry for ' + record.name);
      open.addEventListener('click', () => openRecord(record.id));
      cell.append(open); row.append(cell); el('rows').append(row);
    }
  }
  function renderDetail(record) {
    selected = record;
    const fragment = document.createDocumentFragment();
    fragment.append(node('h3', record.name));
    const details = node('dl');
    for (const [label, value] of [
      ['Reference', record.id], ['Status', record.status], ['Telephone', record.telephone],
      ['Email', record.email], ['Scheme', record.product], ['Branch', record.branch],
      ['Enquiry', record.inquiry], ['Received', date(record.createdAt)], ['Consent', date(record.consentedAt)]
    ]) details.append(node('dt', label), node('dd', value || 'Not provided'));
    fragment.append(details);
    if (staff.role === 'caseworker') {
      const actions = node('div'); actions.className = 'actions';
      const targets = { received: [['contacted', 'Mark contacted'], ['closed', 'Close enquiry']], contacted: [['closed', 'Close enquiry']], closed: [] };
      for (const [status, label] of targets[record.status] || []) {
        const button = node('button', label);
        button.addEventListener('click', () => updateStatus(status)); actions.append(button);
      }
      fragment.append(actions);
    } else fragment.append(node('p', 'Read-only access.'));
    fragment.append(node('h3', 'Status history'));
    const history = node('ol');
    for (const entry of record.statusHistory || []) history.append(node('li', `${entry.fromStatus} → ${entry.toStatus} · ${entry.actorId} · ${date(entry.at)}`));
    fragment.append(history.childElementCount ? history : node('p', 'No status changes recorded.'));
    el('detail').replaceChildren(fragment);
  }
  async function loadInbox(cursor = null) {
    const version = ++listVersion, session = epoch;
    busy(true); selected = null; el('rows').replaceChildren(); el('empty').hidden = true;
    el('detail').replaceChildren(node('p', 'Select an enquiry to view its details.')); notify('Loading enquiries…');
    const params = new URLSearchParams({ limit: '20' });
    if (el('status-filter').value) params.set('status', el('status-filter').value);
    if (cursor) params.set('before', cursor);
    try {
      const body = await request('/enquiries?' + params);
      if (version !== listVersion || session !== epoch) return;
      currentCursor = cursor; nextCursor = body.nextCursor; renderRows(body.enquiries);
      notify('');
    } catch (error) { showError(error); }
    finally { if (version === listVersion && session === epoch) busy(false); }
  }
  async function openRecord(id) {
    const session = epoch;
    busy(true); selected = null; el('detail').replaceChildren(node('p', 'Loading details…')); notify('');
    try { renderDetail((await request('/enquiries/' + encodeURIComponent(id))).enquiry); }
    catch (error) {
      if (session !== epoch) return;
      el('detail').replaceChildren();
      if (error.status === 404) {
        await loadInbox(currentCursor);
        if (session === epoch && staff) notify('This enquiry is no longer available. The inbox has been refreshed.');
      } else showError(error);
    }
    finally { if (session === epoch) busy(false); }
  }
  async function updateStatus(status) {
    if (!selected || staff.role !== 'caseworker') return;
    const record = selected, session = epoch;
    busy(true); notify('Updating status…');
    try {
      const body = await request('/enquiries/' + encodeURIComponent(record.id) + '/status', {
        method: 'PATCH', body: JSON.stringify({ status, expectedStatus: record.status })
      });
      await loadInbox(currentCursor);
      if (session === epoch && staff) await openRecord(body.enquiry.id);
      if (session === epoch && staff) notify('Status updated. No message was sent.');
    } catch (error) {
      if (session !== epoch) return;
      if (error.status === 409) {
        await openRecord(record.id);
        if (session === epoch && selected) notify('This enquiry changed. Review its latest status before updating again.');
      } else showError(error);
    } finally { if (session === epoch) busy(false); }
  }
  el('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (location.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
      el('token').value = ''; notify('Use HTTPS to sign in. Plain HTTP is allowed only for local development.'); return;
    }
    const candidate = el('token').value.trim(); el('token').value = '';
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(candidate)) { notify('Enter the access token supplied by your administrator.'); return; }
    clearSession(); token = candidate; touch(); el('signin').disabled = true;
    const session = epoch;
    try {
      staff = (await request('/session')).staff;
      el('identity').textContent = `${staff.institutionName} · ${staff.staffId} · ${staff.role}`;
      el('login').hidden = true; el('workspace').hidden = false; el('logout').hidden = false;
      await loadInbox();
    } catch (error) { if (error.name !== 'AbortError') clearSession(error.status ? error.message : 'Sign-in failed. Please retry.'); }
    finally { if (session === epoch) el('signin').disabled = false; }
  });
  el('logout').addEventListener('click', () => clearSession('Signed out.'));
  el('refresh').addEventListener('click', () => loadInbox());
  el('newest').addEventListener('click', () => loadInbox());
  el('older').addEventListener('click', () => { if (nextCursor) loadInbox(nextCursor); });
  el('status-filter').addEventListener('change', () => loadInbox());
  document.addEventListener('pointerdown', touch); document.addEventListener('keydown', touch);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && expired()) clearSession('Session ended after inactivity. Please sign in again.');
  });
  window.addEventListener('pagehide', () => clearSession());
})();
