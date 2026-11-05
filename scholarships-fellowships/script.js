/* ============================================================================
   Scholarships & Fellowships directory — frontend.
   ----------------------------------------------------------------------------
   Reads only /scholarships-fellowships/data/opportunities.json. That file is
   written by _tools/fetch-community-ai.py in the community-ai-sync workflow,
   from the same Airtable table as /community-ai/, keeping only records whose
   Publish To field includes "Scholarships & Fellowships" (Village Notes reads
   the same file for its Connecticut feature). Nothing here calls Airtable and
   no token ever reaches the browser. Edit Airtable, never the JSON.

   Facts are shown only when the record carries them. Status is worked out
   from the official dates on the record; "Open" is claimed only when the
   record shows the window was confirmed (an open date that has passed, or a
   Status that a researcher wrote as "Open").
   ========================================================================== */
(function () {
  'use strict';

  var DATA_URL = '/scholarships-fellowships/data/opportunities.json';
  var PAGE = 'Scholarships & Fellowships';
  var SOON_DAYS = 14;

  /* What a visitor filters by, and how each Airtable Opportunity Type maps to
     it. A record can sit in two groups (a grant-funded fellowship). */
  var TYPE_GROUPS = [
    'Scholarship', 'Fellowship', 'Internship', 'Grant or award',
    'Research funding', 'Professional development award'
  ];
  function typeGroups(rec) {
    var t = rec.type || '', out = [];
    if (t === 'Scholarship') out.push('Scholarship');
    if (t === 'Fellowship' || rec.fellowship) out.push('Fellowship');
    if (t === 'Internship') out.push('Internship');
    if (/grant/i.test(t)) out.push('Grant or award');
    if (t === 'Research Funding') out.push('Research funding');
    if (t === 'Professional Development Award') out.push('Professional development award');
    return out;
  }

  var STAGES = ['High school', 'Undergraduate', 'Graduate', 'Adult learner', 'Working professional'];
  var ANY_FIELD = 'Any field of study';
  var STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
    'District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas',
    'Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
    'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York',
    'North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Puerto Rico',
    'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia',
    'Washington','West Virginia','Wisconsin','Wyoming'];

  var all = [];
  var el = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- dates, in the visitor's own calendar day ---------- */
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  var TODAY = todayISO();
  function daysUntil(iso) {
    if (!iso) return null;
    var a = Date.UTC(+TODAY.slice(0, 4), +TODAY.slice(5, 7) - 1, +TODAY.slice(8, 10));
    var b = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
    return Math.round((b - a) / 86400000);
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)));
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }
  function money(n) { return typeof n === 'number' ? '$' + n.toLocaleString('en-US') : ''; }

  /* open | upcoming | closed | unconfirmed */
  function statusOf(rec) {
    var text = (rec.status || '').trim().toLowerCase();
    if (rec.deadline && daysUntil(rec.deadline) < 0) return 'closed';
    if (rec.opens && daysUntil(rec.opens) > 0) return 'upcoming';
    if (/^closed/.test(text)) return 'closed';
    if ((rec.opens && daysUntil(rec.opens) <= 0) || /^open/.test(text)) return 'open';
    return 'unconfirmed';
  }
  var STATUS_PILL = {
    open:        ['Open now', 'sf-pill-teal'],
    upcoming:    ['Opening soon', 'sf-pill-lav'],
    closed:      ['Closed', 'sf-pill-closed'],
    unconfirmed: ['Status not confirmed', 'sf-pill-cream']
  };

  function stateMatch(rec, state) {
    if (!state) return true;
    var s = rec.states || [];
    return s.indexOf('All States') !== -1 || s.indexOf(state) !== -1;
  }

  function haystack(rec) {
    return [rec.title, rec.org, rec.description, rec.eligibility, rec.whoCanApply, rec.bestFit,
      rec.fundingDetails, rec.type, (rec.fieldOfStudy || []).join(' '), (rec.applicantStage || []).join(' '),
      rec.geo, rec.cycle].join(' ').toLowerCase();
  }

  /* ---------- filter state, mirrored in the URL so a view can be shared ---------- */
  var KEYS = ['q', 'type', 'state', 'stage', 'subject', 'deadline', 'status', 'sort'];
  var DEFAULTS = { status: 'active', sort: 'deadline' };
  function readState() {
    var st = {};
    KEYS.forEach(function (k) { st[k] = el('sf-' + k).value; });
    return st;
  }
  function writeURL(st) {
    var p = new URLSearchParams();
    KEYS.forEach(function (k) { if (st[k] && st[k] !== (DEFAULTS[k] || '')) p.set(k, st[k]); });
    var qs = p.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) {}
  }
  function readURL() {
    var p = new URLSearchParams(location.search);
    KEYS.forEach(function (k) {
      var v = p.get(k), box = el('sf-' + k);
      if (v === null) return;
      if (box.tagName === 'SELECT' && !Array.prototype.some.call(box.options, function (o) { return o.value === v; })) return;
      box.value = v;
    });
  }

  function passes(rec, st) {
    if (st.q && haystack(rec).indexOf(st.q.trim().toLowerCase()) === -1) return false;
    if (st.type && typeGroups(rec).indexOf(st.type) === -1) return false;
    if (!stateMatch(rec, st.state)) return false;
    if (st.stage && (rec.applicantStage || []).indexOf(st.stage) === -1) return false;
    if (st.subject) {
      var f = rec.fieldOfStudy || [];
      if (f.indexOf(st.subject) === -1 && f.indexOf(ANY_FIELD) === -1) return false;
    }
    var s = statusOf(rec);
    if (st.deadline) {
      var d = daysUntil(rec.deadline);
      if (st.deadline === 'none') { if (rec.deadline) return false; }
      else if (d === null || d < 0) return false;
      else if (st.deadline === '30' && d > 30) return false;
      else if (st.deadline === '90' && d > 90) return false;
      else if (st.deadline === 'later' && d <= 90) return false;
    }
    if (st.status === 'active' && s === 'closed') return false;
    if (st.status === 'open' && s !== 'open') return false;
    if (st.status === 'upcoming' && s !== 'upcoming') return false;
    if (st.status === 'closed' && s !== 'closed') return false;
    return true;
  }

  function sorter(kind) {
    return function (a, b) {
      if (kind === 'az') return (a.title || '').localeCompare(b.title || '');
      if (kind === 'checked') return (b.lastChecked || '').localeCompare(a.lastChecked || '');
      if (kind === 'amount') return (b.maxFunding || b.annualAmount || 0) - (a.maxFunding || a.annualAmount || 0);
      /* deadline: still-open dates soonest first, then no date, then closed */
      var rank = function (r) {
        if (!r.deadline) return '1';
        return (daysUntil(r.deadline) < 0 ? '2' : '0') + r.deadline;
      };
      return rank(a).localeCompare(rank(b));
    };
  }

  /* ---------- rendering ---------- */
  function where(rec) {
    var s = rec.states || [];
    if (!s.length) return 'Not confirmed by the official source';
    if (s.indexOf('All States') !== -1) return 'All U.S. states';
    return s.join(', ');
  }

  function fact(label, html) {
    return html ? '<div><dt>' + esc(label) + '</dt><dd>' + html + '</dd></div>' : '';
  }

  function card(rec) {
    var groups = typeGroups(rec);
    var s = statusOf(rec);
    var pill = STATUS_PILL[s];
    var typeClass = groups[0] ? ' sf-type-' + groups[0].toLowerCase().split(' ')[0] : '';
    var badges = groups.map(function (g, i) {
      return '<span class="sf-pill ' + (['sf-pill-gold', 'sf-pill-rose', 'sf-pill-lav'][i % 3]) + '">' + esc(g) + '</span>';
    }).join('') + '<span class="sf-pill ' + pill[1] + '">' + esc(pill[0]) + '</span>';

    var alert = '';
    var dleft = daysUntil(rec.deadline);
    if (s === 'open' && dleft !== null && dleft >= 0 && dleft <= SOON_DAYS) {
      alert = '<p class="sf-alert" role="note">' + (dleft === 0 ? 'Deadline is today' : 'Deadline in ' + dleft + (dleft === 1 ? ' day' : ' days')) + ': ' + esc(fmtDate(rec.deadline)) + '</p>';
    }
    if (s === 'closed' && rec.watchNextCycle) {
      alert = '<p class="sf-alert" role="note">This cycle has closed. The program is expected to run again; check the official page for the next dates.</p>';
    }

    var amount = '';
    if (rec.annualAmount && rec.maxFunding && rec.maxFunding !== rec.annualAmount) {
      amount = 'Up to ' + money(rec.annualAmount) + ' a year, up to ' + money(rec.maxFunding) + ' total';
    } else if (rec.maxFunding) {
      amount = 'Up to ' + money(rec.maxFunding);
    } else if (rec.annualAmount) {
      amount = 'Up to ' + money(rec.annualAmount) + ' a year';
    }
    if (rec.fundingDetails) amount = (amount ? esc(amount) + '<br />' : '') + esc(rec.fundingDetails);
    else amount = esc(amount);

    var deadline = rec.deadline ? esc(fmtDate(rec.deadline)) : 'No fixed deadline listed';
    if (rec.recDeadline) deadline += '<br />Recommendations due ' + esc(fmtDate(rec.recDeadline));
    if (rec.opens && s === 'upcoming') deadline += '<br />Opens ' + esc(fmtDate(rec.opens));

    var facts = [
      fact('Eligibility', esc(rec.eligibility || rec.whoCanApply)),
      fact('Award', amount),
      fact('Deadline', deadline),
      fact('Who can apply', esc((rec.applicantStage || []).join(', '))),
      fact('Field of study', esc((rec.fieldOfStudy || []).join(', '))),
      fact('Where', esc(where(rec))),
      fact('Cycle', esc(rec.cycle))
    ].join('');

    var apply = rec.url
      ? '<a class="btn-primary sf-apply" href="' + esc(rec.url) + '" target="_blank" rel="noopener noreferrer">Official application<span class="sf-visually-hidden"> for ' + esc(rec.title) + ' (opens in new tab)</span></a>'
      : '<span class="sf-nolink">Official link not yet confirmed</span>';
    var verified = rec.lastChecked
      ? 'Last verified ' + esc(fmtDate(rec.lastChecked))
      : 'Verification date not recorded';

    return '<li class="sf-card' + typeClass + (s === 'closed' ? ' sf-is-closed' : '') + '">' +
      '<div class="sf-badges">' + badges + '</div>' +
      '<h3>' + esc(rec.title) + '</h3>' +
      (rec.org ? '<p class="sf-org">' + esc(rec.org) + '</p>' : '') +
      alert +
      (rec.description ? '<p class="sf-desc">' + esc(rec.description) + '</p>' : '') +
      '<dl class="sf-facts">' + facts + '</dl>' +
      '<div class="sf-card-foot"><span class="sf-verified">' + verified + '</span>' + apply + '</div>' +
      '</li>';
  }

  function render() {
    var st = readState();
    writeURL(st);
    var rows = all.filter(function (r) { return passes(r, st); }).sort(sorter(st.sort));
    el('sf-results').innerHTML = rows.map(card).join('');
    var empty = el('sf-empty');
    empty.hidden = rows.length > 0;
    if (!all.length) {
      el('sf-empty-title').textContent = 'Listings are on the way';
      el('sf-empty-body').textContent = 'Verified opportunities appear here as soon as they are published.';
      el('sf-empty-reset').hidden = true;
    }
    var noun = rows.length === 1 ? 'opportunity' : 'opportunities';
    el('sf-resultline').textContent = 'Showing ' + rows.length + ' ' + noun +
      (st.state ? ' open to people in ' + st.state : '') + '.';
  }

  function fillSelect(id, values) {
    var box = el(id);
    values.forEach(function (v) {
      var o = document.createElement('option'); o.value = v; o.textContent = v; box.appendChild(o);
    });
  }

  function reset() {
    KEYS.forEach(function (k) { el('sf-' + k).value = DEFAULTS[k] || ''; });
    render();
    el('sf-q').focus();
  }

  function init(data) {
    all = (data.opportunities || []).filter(function (r) {
      return (r.publishTo || []).indexOf(PAGE) !== -1 && r.title;
    });
    fillSelect('sf-type', TYPE_GROUPS);
    fillSelect('sf-state', STATES);
    fillSelect('sf-stage', STAGES);
    var fields = {};
    all.forEach(function (r) { (r.fieldOfStudy || []).forEach(function (f) { if (f !== ANY_FIELD) fields[f] = 1; }); });
    fillSelect('sf-subject', Object.keys(fields).sort());
    readURL();

    var active = all.filter(function (r) { return statusOf(r) !== 'closed'; }).length;
    el('sf-count').textContent = active + (active === 1 ? ' open or upcoming listing' : ' open or upcoming listings');
    if (data.meta && data.meta.generated) el('sf-updated').textContent = 'Directory refreshed ' + fmtDate(data.meta.generated);

    var timer;
    el('sf-q').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(render, 150); });
    KEYS.forEach(function (k) { if (k !== 'q') el('sf-' + k).addEventListener('change', render); });
    el('sf-controls').addEventListener('submit', function (e) { e.preventDefault(); render(); });
    el('sf-reset').addEventListener('click', reset);
    el('sf-empty-reset').addEventListener('click', reset);
    render();
  }

  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(init)
    .catch(function () {
      el('sf-count').textContent = 'Listings unavailable';
      el('sf-results').innerHTML = '';
      el('sf-empty').hidden = false;
      el('sf-empty-title').textContent = 'The listings did not load';
      el('sf-empty-body').textContent = 'Please refresh the page. If it keeps happening, the official sources are still the best place to check.';
      el('sf-empty-reset').hidden = true;
    });

  /* Exposed for the test harness only. */
  window.__sf = { statusOf: statusOf, typeGroups: typeGroups, stateMatch: stateMatch, passes: passes };
})();
