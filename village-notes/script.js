/* ============================================================
   Village Notes — directory frontend.

   Reads only /village-notes/data/resources.json, which the
   village-notes-sync workflow regenerates from Airtable every six
   hours. Nothing here talks to Airtable, and no API token is ever
   present in anything the browser downloads.
   ============================================================ */
(function () {
  'use strict';

  var DATA_URL = '/village-notes/data/resources.json';

  var state = { all: [], search: '', track: '', categories: [], towns: [], flags: {} };

  var el = {
    search:     document.getElementById('vn-search'),
    track:      document.getElementById('vn-track'),
    catToggle:  document.getElementById('vn-cat-toggle'),
    catPanel:   document.getElementById('vn-cat-panel'),
    catLabel:   document.getElementById('vn-cat-label'),
    catList:    document.getElementById('vn-cat-list'),
    catFind:    document.getElementById('vn-cat-find'),
    catClear:   document.getElementById('vn-cat-clear'),
    toggles:    document.querySelectorAll('.vn-toggle input'),
    townToggle: document.getElementById('vn-town-toggle'),
    townPanel:  document.getElementById('vn-town-panel'),
    townLabel:  document.getElementById('vn-town-label'),
    townList:   document.getElementById('vn-town-list'),
    townFind:   document.getElementById('vn-town-find'),
    townClear:  document.getElementById('vn-town-clear'),
    reset:      document.getElementById('vn-reset'),
    results:    document.getElementById('vn-results'),
    empty:      document.getElementById('vn-empty'),
    emptyBody:  document.getElementById('vn-empty-body'),
    resultline: document.getElementById('vn-resultline'),
    countBadge: document.getElementById('vn-count-badge'),
    updated:    document.getElementById('vn-updated')
  };

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function has(value) {
    return value != null && String(value).trim() !== '';
  }

  // Only http(s) links are rendered, so a bad or hostile value in the
  // Website field can never become a javascript: or data: URL.
  function safeUrl(value) {
    if (!has(value)) return null;
    var raw = String(value).trim();
    try {
      var parsed = new URL(raw, window.location.origin);
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : null;
    } catch (err) {
      return null;
    }
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch (err) { return 'Website'; }
  }

  function uniqueSorted(values) {
    var seen = Object.create(null);
    var out = [];
    values.forEach(function (v) {
      if (has(v) && !seen[v]) { seen[v] = true; out.push(String(v).trim()); }
    });
    return out.sort(function (a, b) { return a.localeCompare(b); });
  }

  function fillSelect(select, values, allLabel) {
    var current = select.value;
    select.innerHTML = '';
    var first = document.createElement('option');
    first.value = '';
    first.textContent = allLabel;
    select.appendChild(first);
    values.forEach(function (v) {
      var opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
    if (values.indexOf(current) !== -1) select.value = current;
  }

  function formatDate(value) {
    if (!has(value)) return '';
    var d = new Date(value + (/^\d{4}-\d{2}-\d{2}$/.test(value) ? 'T00:00:00' : ''));
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function plural(n, one, many) { return n === 1 ? one : many; }

  /* ---------- what-you-need groups ---------- */

  // The Category field carries 58 options and does two jobs at once: the kind
  // of need, and the specific flavour. A single flat list makes a parent guess
  // whether a robotics week is filed under STEM, Specialty or Summer Day, and
  // filtering on the wrong guess hides it. So the filter works on the group and
  // the specific category stays visible on the card and inside search.
  var GROUPS = [
    ['Child Care', ['Center-Based Daycare','Home Daycare (Licensed)','Infant Care',
      'Preschool / Pre-K','Before/After School Care','Backup/Emergency Care',
      'Nanny / Au Pair','Nanny Share','Babysitting Co-op']],
    ['Camps & School Breaks', ['Summer Day Camp','Summer Sleepaway Camp','Sports Camp',
      'STEM/Tech Camp','Arts Camp','Outdoor/Nature Camp','Academic/Enrichment Camp',
      'Faith-Based Camp','Municipal/Parks & Rec Camp','Language Immersion Camp',
      'Specialty Camp','Inclusive/Special Needs Camp','School Vacation Week Care']],
    ['Activities & Enrichment', ['Afterschool Enrichment','Tutoring / Academic Support',
      'Literacy / Reading Program','Youth Development Program','Teen Program',
      'Teen/CIT Program','Youth Employment Program']],
    ['Early Intervention & Therapy', ['Birth-to-Three / Early Intervention',
      'Pediatric Therapy (OT/PT/Speech)','Special Needs Childcare']],
    ['Parent & Family Support', ['Postpartum Support','Lactation Support',
      'Perinatal Mental Health','Doula Services','Parenting Support/Classes',
      'Barter/Skill Exchange','Household Help']],
    ['Paying for Care', ['Legal/HR Resource']],

    ['Care at Home', ['In-Home Caregiver / Home Health Aide','Companion Services',
      'Respite Care','Home Modification / Fall Prevention','Durable Medical Equipment Loan']],
    ['Residential Care', ['Assisted Living','Memory Care','Skilled Nursing / Rehab']],
    ['Day Programs & Community', ['Adult Day Program',
      'Senior Center / Congregate Meals & Social Programs','Meal Delivery','Elder Transportation']],
    ['Health & End of Life', ['Hospice / Palliative Care','Grief/Bereavement Support']],
    ['Caregiver Support', ['Caregiver Support Group','Geriatric Care Manager']],
    ['Benefits, Legal & Money', ['Elder Law / Financial Planning','Veterans Benefits Counseling']]
  ];

  var GROUP_OF = (function () {
    var map = {};
    GROUPS.forEach(function (g) { g[1].forEach(function (c) { map[c] = g[0]; }); });
    return map;
  })();

  function groupOf(r) { return GROUP_OF[r.category] || 'Other'; }

  /* ---------- quick-filter predicates ---------- */

  // "Not Confirmed" is a real answer in this data and must not read as a yes.
  function yesish(v) { return v === 'Yes' || v === 'Limited / Selected Sites'; }

  var FLAGS = {
    openNow:     function (r) { return ['Open','Rolling / Ongoing','Opening Soon'].indexOf(r.registrationStatus) !== -1; },
    care4Kids:   function (r) { return yesish(r.care4Kids); },
    financialAid:function (r) { return yesish(r.financialAid); },
    transport:   function (r) { return r.transportation && r.transportation !== 'No'
                                       && r.transportation !== 'No Transportation'
                                       && r.transportation !== 'Not Confirmed'
                                       && r.transportation !== 'Contact Program'; },
    extended:    function (r) { var e = r.extendedCare || [];
                                return e.some(function (x) { return x !== 'None' && x !== 'Not Confirmed'; }); },
    fullDay:     function (r) { return r.schoolDayCoverage === 'Full Workday'; }
  };

  /* ---------- rendering ---------- */

  function stars(rating) {
    var n = Number(rating);
    if (!n || n < 1) return '';
    n = Math.max(1, Math.min(5, Math.round(n)));
    var out = '<div class="vn-stars" aria-label="' + n + ' out of 5 stars">';
    for (var i = 1; i <= 5; i++) {
      out += '<span aria-hidden="true"' + (i > n ? ' class="vn-star-off"' : '') + '>&#9733;</span>';
    }
    return out + '</div>';
  }

  function fact(label, value, flag) {
    if (!has(value)) return '';
    return '<div class="vn-fact' + (flag ? ' vn-fact-flag' : '') + '">' +
             '<dt>' + esc(label) + '</dt>' +
             '<dd>' + esc(value) + '</dd>' +
           '</div>';
  }

  function card(r) {
    var url = safeUrl(r.website);

    var head = '<p class="vn-card-track">' + esc(r.track || 'Resource');
    if (has(r.category)) head += '<span class="vn-sep">/</span>' + esc(r.category);
    head += '</p>';

    // Only worth a row when it says something the town line does not already.
    // A 20-town list is a wall of text, so it is summarised past a handful.
    var extraTowns = served(r).filter(function (t) {
      return t !== r.town && t !== STATEWIDE;
    });
    var servesLabel = null;
    if (isStatewide(r)) {
      servesLabel = 'Statewide \u2014 all of Connecticut';
    } else if (extraTowns.length) {
      var all = [r.town].concat(extraTowns).filter(has);
      servesLabel = all.length > 6
        ? all.slice(0, 5).join(', ') + ' and ' + (all.length - 5) + ' more'
        : all.join(', ');
    }

    // Scannable badges: the four things a parent checks before reading further.
    var badges = [];
    if (r.registrationStatus) {
      var openish = FLAGS.openNow(r);
      badges.push('<span class="vn-badge-chip' + (openish ? ' is-open' : '') + '">' +
                  esc(r.registrationStatus) + '</span>');
    }
    if (yesish(r.care4Kids))    badges.push('<span class="vn-badge-chip">Care 4 Kids</span>');
    if (yesish(r.financialAid)) badges.push('<span class="vn-badge-chip">Financial help</span>');
    if (FLAGS.transport(r))     badges.push('<span class="vn-badge-chip">Transport</span>');
    if (FLAGS.extended(r))      badges.push('<span class="vn-badge-chip">Before/after care</span>');
    var badgeRow = badges.length ? '<div class="vn-chips">' + badges.join('') + '</div>' : '';

    var times = [r.startTime, r.endTime].filter(has).join(' \u2013 ');

    var facts =
      fact('Serves', servesLabel) +
      fact('Hours', r.hours) +
      fact('Waitlist', r.availability, true) +
      fact('Ages', r.ages) +
      fact('Cost', r.cost) +
      fact('Times', times || null) +
      fact('Days', (r.daysOffered || []).join(', ') || null) +
      fact('Extended', (r.extendedCare || []).filter(function (x) {
        return x !== 'None' && x !== 'Not Confirmed'; }).join(', ') || null) +
      fact('Languages', (r.languages || []).filter(function (x) {
        return x !== 'Not Confirmed'; }).join(', ') || null) +
      fact('Meals', r.meals && r.meals !== 'Not Confirmed' ? r.meals : null) +
      fact('Licensing', r.licensing && r.licensing !== 'Not Confirmed' ? r.licensing : null) +
      fact('Address', r.address);

    var links = [];
    if (url) {
      links.push('<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
                 esc(hostOf(url)) + ' &#8599;</a>');
    }
    if (has(r.contact)) links.push('<span>' + esc(r.contact) + '</span>');

    var source = [];
    if (has(r.submittedBy)) source.push('Submitted by ' + r.submittedBy);
    var when = formatDate(r.dateSubmitted);
    if (when) source.push(when);

    var notes = '';
    if (has(r.notes)) {
      var long = String(r.notes).trim().length > 320;
      notes = '<div class="vn-card-notes' + (long ? ' vn-clamped' : '') + '">' + esc(r.notes) + '</div>';
      if (long) notes += '<button type="button" class="vn-more">Read more</button>';
    }

    return '<article class="vn-card">' +
      head +
      '<h3 class="vn-card-name">' + esc(r.name || 'Untitled listing') + '</h3>' +
      (has(r.town) ? '<p class="vn-card-town">' + esc(r.town) + '</p>' : '') +
      badgeRow +
      stars(r.rating) +
      (has(r.specificType) ? '<p class="vn-card-type">' + esc(r.specificType) + '</p>' : '') +
      (facts ? '<dl class="vn-facts">' + facts + '</dl>' : '') +
      notes +
      '<div class="vn-card-foot">' +
        (links.length ? '<div class="vn-card-links">' + links.join('') + '</div>' : '') +
        (source.length ? '<p class="vn-card-source">' + esc(source.join(' &middot; ')).replace(/&amp;middot;/g, '&middot;') + '</p>' : '') +
      '</div>' +
    '</article>';
  }

  /* ---------- filtering ---------- */

  // Coverage flag rather than a place: a listing carrying it serves every town,
  // so it is matched specially below and kept out of the town dropdown.
  var STATEWIDE = 'Statewide (all of Connecticut)';

  function served(r) {
    return Array.isArray(r.townsServed) ? r.townsServed : [];
  }

  function isStatewide(r) {
    return served(r).indexOf(STATEWIDE) !== -1;
  }

  // A family filtering to their town wants everyone who serves it, not only
  // providers headquartered there -- an agency based one town over that covers
  // theirs is exactly the result they are looking for, and a statewide program
  // covers them wherever they are.
  function servesTown(r, town) {
    if (r.town === town) return true;
    if (isStatewide(r)) return true;
    return served(r).indexOf(town) !== -1;
  }

  function matches(r) {
    if (state.track && r.track !== state.track) return false;
    if (state.categories.length && state.categories.indexOf(r.category) === -1) return false;
    if (state.towns.length && !state.towns.some(function (t) { return servesTown(r, t); })) return false;
    for (var flag in state.flags) {
      if (state.flags[flag] && FLAGS[flag] && !FLAGS[flag](r)) return false;
    }
    if (!state.search) return true;
    return (r._haystack || '').indexOf(state.search) !== -1;
  }

  function haystack(r) {
    return [r.name, r.track, r.category, r.specificType, r.town, r.address,
            r.ages, r.hours, r.availability, r.cost, r.contact, r.notes,
            r.submittedBy]
      .concat(Array.isArray(r.townsServed) ? r.townsServed : [])
      .concat(r.servicesOffered || []).concat(r.languages || [])
      .concat([groupOf(r), r.registrationStatus, r.licensing])
      .filter(has).join(' ␟ ').toLowerCase();
  }

  // Category options track the selected Track, so a family browsing Elder
  // Care is never offered "Sports Camp" as a filter that returns nothing.
  // Category options follow the chosen track, so someone browsing Elder Care is
  // never offered "Sports Camp" as a filter that returns nothing.
  function buildCatList() {
    var pool = state.track
      ? state.all.filter(function (r) { return r.track === state.track; })
      : state.all;
    var live = {};
    pool.forEach(function (r) { live[r.category] = (live[r.category] || 0) + 1; });

    var html = '';
    GROUPS.forEach(function (g) {
      var cats = g[1].filter(function (c) { return live[c]; });
      if (!cats.length) return;
      var total = cats.reduce(function (n, c) { return n + live[c]; }, 0);
      html += '<div class="vn-multi-group" data-find="' + esc((g[0] + ' ' + cats.join(' ')).toLowerCase()) + '">' +
                '<label class="vn-multi-opt vn-multi-grouphead">' +
                  '<input type="checkbox" data-group="' + esc(g[0]) + '" />' +
                  '<span>' + esc(g[0]) + '</span><em>' + total + '</em>' +
                '</label>';
      cats.forEach(function (c) {
        html += '<label class="vn-multi-opt vn-multi-child">' +
                  '<input type="checkbox" value="' + esc(c) + '" />' +
                  '<span>' + esc(c) + '</span><em>' + live[c] + '</em>' +
                '</label>';
      });
      html += '</div>';
    });

    // Anything not in the map still appears, so a new Airtable category is
    // never silently unreachable.
    var mapped = {};
    GROUPS.forEach(function (g) { g[1].forEach(function (c) { mapped[c] = true; }); });
    var loose = Object.keys(live).filter(function (c) { return !mapped[c]; }).sort();
    if (loose.length) {
      html += '<div class="vn-multi-group" data-find="other ' + esc(loose.join(' ').toLowerCase()) + '">' +
              '<label class="vn-multi-opt vn-multi-grouphead"><input type="checkbox" data-group="Other" />' +
              '<span>Other</span></label>';
      loose.forEach(function (c) {
        html += '<label class="vn-multi-opt vn-multi-child"><input type="checkbox" value="' + esc(c) + '" />' +
                '<span>' + esc(c) + '</span><em>' + live[c] + '</em></label>';
      });
      html += '</div>';
    }

    el.catList.innerHTML = html;
    // Drop selections the current track cannot show.
    state.categories = state.categories.filter(function (c) { return live[c]; });
    syncCatUI();
  }

  function syncCatUI() {
    var n = state.categories.length;
    el.catLabel.textContent = n === 0 ? 'Anything'
                            : (n === 1 ? state.categories[0] : n + ' types selected');
    el.catToggle.classList.toggle('has-selection', n > 0);
    Array.prototype.forEach.call(el.catList.querySelectorAll('input[value]'), function (box) {
      box.checked = state.categories.indexOf(box.value) !== -1;
    });
    Array.prototype.forEach.call(el.catList.querySelectorAll('input[data-group]'), function (head) {
      var kids = head.closest('.vn-multi-group').querySelectorAll('input[value]');
      var on = 0;
      Array.prototype.forEach.call(kids, function (k) { if (k.checked) on++; });
      head.checked = on > 0 && on === kids.length;
      head.indeterminate = on > 0 && on < kids.length;
    });
  }

  function render() {
    var shown = state.all.filter(matches);

    if (!shown.length) {
      el.results.innerHTML = '';
      el.empty.hidden = false;
      el.emptyBody.textContent = state.all.length
        ? 'No listings match these filters. Try clearing the search box or widening the track and category.'
        : 'The directory is still being filled in. Published listings appear here automatically once they clear review.';
    } else {
      el.empty.hidden = true;
      el.results.innerHTML = shown.map(card).join('');
    }

    if (!state.all.length) {
      el.resultline.textContent = '';
    } else if (shown.length === state.all.length) {
      el.resultline.textContent = 'Showing all ' + state.all.length + ' ' +
        plural(state.all.length, 'listing', 'listings') + '.';
    } else {
      el.resultline.textContent = 'Showing ' + shown.length + ' of ' + state.all.length + ' ' +
        plural(state.all.length, 'listing', 'listings') + '.';
    }
  }

  /* ---------- town multi-select ---------- */

  // A plain <select> forces one town. Families search their own town plus the
  // ones next to it, so this is a checkbox panel with its own find box -- with
  // 90+ towns, scrolling to Woodbridge is its own small ordeal.

  function buildTownList(towns) {
    el.townList.innerHTML = towns.map(function (t) {
      var id = 'vn-town-' + t.replace(/[^A-Za-z0-9]/g, '-');
      return '<label class="vn-multi-opt" data-town="' + esc(t) + '">' +
               '<input type="checkbox" id="' + esc(id) + '" value="' + esc(t) + '" />' +
               '<span>' + esc(t) + '</span>' +
             '</label>';
    }).join('');
    syncTownUI();
  }

  function syncTownUI() {
    var n = state.towns.length;
    el.townLabel.textContent =
      n === 0 ? 'All towns'
              : (n === 1 ? state.towns[0] : n + ' towns selected');
    el.townToggle.classList.toggle('has-selection', n > 0);
    Array.prototype.forEach.call(el.townList.querySelectorAll('input'), function (box) {
      box.checked = state.towns.indexOf(box.value) !== -1;
    });
  }

  function openTownPanel(open) {
    el.townPanel.hidden = !open;
    el.townToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) el.townFind.focus();
  }

  function bindTownMulti() {
    el.townToggle.addEventListener('click', function () {
      openTownPanel(el.townPanel.hidden);
    });

    el.townList.addEventListener('change', function (event) {
      var box = event.target;
      if (!box || box.type !== 'checkbox') return;
      var at = state.towns.indexOf(box.value);
      if (box.checked && at === -1) state.towns.push(box.value);
      if (!box.checked && at !== -1) state.towns.splice(at, 1);
      syncTownUI();
      render();
    });

    el.townFind.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      Array.prototype.forEach.call(el.townList.children, function (opt) {
        opt.hidden = q !== '' && opt.dataset.town.toLowerCase().indexOf(q) === -1;
      });
    });

    el.townClear.addEventListener('click', function () {
      state.towns = [];
      syncTownUI();
      render();
    });

    // Close on outside click or Escape, so the panel never traps the page.
    document.addEventListener('click', function (event) {
      if (!el.townPanel.hidden && !document.getElementById('vn-town-multi').contains(event.target)) {
        openTownPanel(false);
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !el.townPanel.hidden) {
        openTownPanel(false);
        el.townToggle.focus();
      }
    });
  }

  /* ---------- category multi-select & quick filters ---------- */

  function bindCatMulti() {
    el.catToggle.addEventListener('click', function () {
      var open = el.catPanel.hidden;
      el.catPanel.hidden = !open;
      el.catToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) el.catFind.focus();
    });

    el.catList.addEventListener('change', function (event) {
      var box = event.target;
      if (!box || box.type !== 'checkbox') return;

      if (box.dataset.group !== undefined) {
        // Ticking a group is shorthand for ticking everything inside it.
        var kids = box.closest('.vn-multi-group').querySelectorAll('input[value]');
        Array.prototype.forEach.call(kids, function (k) {
          var at = state.categories.indexOf(k.value);
          if (box.checked && at === -1) state.categories.push(k.value);
          if (!box.checked && at !== -1) state.categories.splice(at, 1);
        });
      } else {
        var i = state.categories.indexOf(box.value);
        if (box.checked && i === -1) state.categories.push(box.value);
        if (!box.checked && i !== -1) state.categories.splice(i, 1);
      }
      syncCatUI();
      render();
    });

    el.catFind.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      Array.prototype.forEach.call(el.catList.children, function (grp) {
        grp.hidden = q !== '' && grp.dataset.find.indexOf(q) === -1;
      });
    });

    el.catClear.addEventListener('click', function () {
      state.categories = [];
      syncCatUI();
      render();
    });

    document.addEventListener('click', function (event) {
      if (!el.catPanel.hidden && !document.getElementById('vn-cat-multi').contains(event.target)) {
        el.catPanel.hidden = true;
        el.catToggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !el.catPanel.hidden) {
        el.catPanel.hidden = true;
        el.catToggle.setAttribute('aria-expanded', 'false');
        el.catToggle.focus();
      }
    });
  }

  function bindToggles() {
    Array.prototype.forEach.call(el.toggles, function (box) {
      box.addEventListener('change', function () {
        state.flags[this.dataset.flag] = this.checked;
        render();
      });
    });
  }

  // These filters read fields that only some listings carry yet -- the state
  // import brought addresses and phone numbers, not whether a place takes
  // Care 4 Kids. Absent is not "no", so a toggle that would quietly imply
  // "only one place in Connecticut accepts it" is hidden until the data can
  // support it, and the rest carry their count so the number is never a
  // surprise.
  function tuneToggles() {
    var shown = 0;
    Array.prototype.forEach.call(el.toggles, function (box) {
      var test = FLAGS[box.dataset.flag];
      var n = test ? state.all.filter(test).length : 0;
      var label = box.parentNode.querySelector('span');
      if (!label.dataset.base) label.dataset.base = label.textContent;
      if (n === 0) {
        box.parentNode.hidden = true;
        box.checked = false;
        delete state.flags[box.dataset.flag];
      } else {
        box.parentNode.hidden = false;
        label.textContent = label.dataset.base + ' (' + n + ')';
        shown++;
      }
    });
    var row = document.querySelector('.vn-toggles');
    if (row) row.hidden = shown === 0;
  }

  /* ---------- events ---------- */

  function bind() {
    bindTownMulti();
    bindCatMulti();
    bindToggles();
    el.search.addEventListener('input', function () {
      state.search = this.value.trim().toLowerCase();
      render();
    });

    el.track.addEventListener('change', function () {
      state.track = this.value;
      buildCatList();
      render();
    });

    el.reset.addEventListener('click', function () {
      state.search = state.track = '';
      state.towns = [];
      state.categories = [];
      state.flags = {};
      el.search.value = '';
      el.track.value = '';
      Array.prototype.forEach.call(el.toggles, function (t) { t.checked = false; });
      syncTownUI();
      buildCatList();
      render();
      el.search.focus();
    });

    // One delegated handler covers every card's "Read more" toggle, so
    // re-rendering the grid never leaves listeners behind.
    el.results.addEventListener('click', function (event) {
      var btn = event.target.closest('.vn-more');
      if (!btn) return;
      var notes = btn.previousElementSibling;
      if (!notes) return;
      var clamped = notes.classList.toggle('vn-clamped');
      btn.textContent = clamped ? 'Read more' : 'Show less';
    });
  }

  /* ---------- boot ---------- */

  function load() {
    fetch(DATA_URL, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : (data && data.resources) || [];

        state.all = list.map(function (r) {
          r._haystack = haystack(r);
          return r;
        }).sort(function (a, b) {
          return String(a.name || '').localeCompare(String(b.name || ''));
        });

        fillSelect(el.track, uniqueSorted(state.all.map(function (r) { return r.track; })), 'All tracks');
        var townValues = [];
        state.all.forEach(function (r) {
          townValues.push(r.town);
          townValues = townValues.concat(served(r));
        });
        // Town/Area is free text, so multi-town strings leak in -- "Bridgeport
        // and Fairfield", "Greater Hartford area". They are fine on a card but
        // useless as a filter option, and they crowd out the real town next to
        // them alphabetically. Towns Served is the structured field, so the
        // options come from clean single names only.
        townValues = townValues.filter(function (t) {
          return t && t !== STATEWIDE && !/,| and | area$/i.test(t);
        });
        buildTownList(uniqueSorted(townValues));
        buildCatList();
        tuneToggles();

        el.countBadge.textContent = state.all.length
          ? state.all.length + ' ' + plural(state.all.length, 'listing', 'listings')
          : 'Directory in progress';

        var generated = data && data.generated;
        el.updated.textContent = generated && formatDate(generated)
          ? 'Last refreshed ' + formatDate(generated)
          : '';

        render();
      })
      .catch(function (err) {
        console.error('Village Notes: could not load the directory.', err);
        el.countBadge.textContent = 'Directory unavailable';
        el.results.innerHTML = '';
        el.empty.hidden = false;
        el.emptyBody.textContent =
          'The directory could not be loaded just now. Please refresh the page, or try again in a few minutes.';
      });
  }

  bind();
  load();
})();
