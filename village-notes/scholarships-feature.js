/* ============================================================================
   Village Notes: "Scholarships for Connecticut students" feature.
   ----------------------------------------------------------------------------
   Kept apart from village-notes/script.js on purpose, so the main directory
   never depends on it. It reads the Scholarships & Fellowships snapshot
   (/scholarships-fellowships/data/opportunities.json), which comes from the
   Community AI Airtable table, and shows only records whose Publish To field
   includes "Village Notes" and that Connecticut residents can use (All States
   or Connecticut). Nothing is copied into the Village Notes base, so each
   opportunity is maintained once. If the file fails to load, the section
   stays hidden and the rest of the page is unaffected.
   ========================================================================== */
(function () {
  'use strict';
  var box = document.getElementById('vn-scholarships');
  if (!box) return;
  var list = document.getElementById('vn-scholarships-list');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmt(iso) {
    var d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)));
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }

  fetch('/scholarships-fellowships/data/opportunities.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var t = today();
      var rows = (data.opportunities || []).filter(function (r) {
        var states = r.states || [];
        return (r.publishTo || []).indexOf('Village Notes') !== -1 &&
          (states.indexOf('All States') !== -1 || states.indexOf('Connecticut') !== -1) &&
          r.url && (!r.deadline || r.deadline >= t);
      });
      /* Connecticut-only programs first, then nationwide, soonest deadline first. */
      rows.sort(function (a, b) {
        var ca = (a.states || []).indexOf('Connecticut') !== -1 ? 0 : 1;
        var cb = (b.states || []).indexOf('Connecticut') !== -1 ? 0 : 1;
        return ca - cb || (a.deadline || '9999').localeCompare(b.deadline || '9999');
      });
      if (!rows.length) return;
      list.innerHTML = rows.slice(0, 6).map(function (r) {
        var scope = (r.states || []).indexOf('Connecticut') !== -1 ? 'Connecticut' : 'Open nationwide, including Connecticut';
        return '<li class="vn-sch-item">' +
          '<a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.title) +
          '<span class="vn-visually-hidden"> (opens in new tab)</span></a>' +
          '<span class="vn-sch-meta">' + esc(r.org || '') +
          (r.deadline ? ' &middot; Due ' + esc(fmt(r.deadline)) : '') +
          ' &middot; ' + esc(scope) +
          (r.lastChecked ? ' &middot; Verified ' + esc(fmt(r.lastChecked)) : '') + '</span></li>';
      }).join('');
      box.hidden = false;
    })
    .catch(function () { /* stay hidden */ });
})();
