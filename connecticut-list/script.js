/* ============================================================
   Darice's Connecticut List — frontend.

   Reads only /connecticut-list/data/experiences.json, which the
   connecticut-list-sync workflow regenerates from Airtable every six
   hours. Nothing here talks to Airtable, and no API token is ever
   present in anything the browser downloads.

   Deliberately built on Village Notes' components: the same controls,
   the same multi-select panels, the same cards, chips, empty state and
   Show more. A visitor who has used one directory already knows this
   one. Where a behaviour differs it is because the data differs, not
   because a second interface was invented.
   ============================================================ */
(function () {
  'use strict';

  var DATA_URL = '/connecticut-list/data/experiences.json';

  var state = { all: [], search: '', region: '', types: [], towns: [],
                categories: [], audiences: [], seasons: [], months: [], ages: [],
                sort: 'name', shown: 0, open: null };

  // Cards are built as HTML strings. Rendering a screenful and extending on
  // demand keeps the first paint quick without hiding anything -- the count
  // above always reports the full match, and Show more walks the rest. The
  // same 60 Village Notes uses, so the two pages page identically.
  var PAGE = 60;

  var el = {
    search:      document.getElementById('cl-search'),
    region:      document.getElementById('cl-region'),
    typeToggle:  document.getElementById('cl-type-toggle'),
    typePanel:   document.getElementById('cl-type-panel'),
    typeLabel:   document.getElementById('cl-type-label'),
    typeList:    document.getElementById('cl-type-list'),
    typeFind:    document.getElementById('cl-type-find'),
    typeClear:   document.getElementById('cl-type-clear'),
    townToggle:  document.getElementById('cl-town-toggle'),
    townPanel:   document.getElementById('cl-town-panel'),
    townLabel:   document.getElementById('cl-town-label'),
    townList:    document.getElementById('cl-town-list'),
    townFind:    document.getElementById('cl-town-find'),
    townClear:   document.getElementById('cl-town-clear'),
    audienceRow: document.getElementById('cl-audience-row'),
    audienceList:document.getElementById('cl-audience-list'),
    quickRow:    document.getElementById('cl-quick-row'),
    quickList:   document.getElementById('cl-quick-list'),
    seasonRow:   document.getElementById('cl-season-row'),
    seasonList:  document.getElementById('cl-season-list'),
    monthRow:    document.getElementById('cl-month-row'),
    monthList:   document.getElementById('cl-month-list'),
    ageRow:      document.getElementById('cl-age-row'),
    ageList:     document.getElementById('cl-age-list'),
    sort:        document.getElementById('cl-sort'),
    reset:       document.getElementById('cl-reset'),
    results:     document.getElementById('cl-results'),
    resultline:  document.getElementById('cl-resultline'),
    surprise:    document.getElementById('cl-surprise'),
    active:      document.getElementById('cl-activefilters'),
    activeChips: document.getElementById('cl-active-chips'),
    clearAll:    document.getElementById('cl-clear-all'),
    showMore:    document.getElementById('cl-showmore'),
    empty:       document.getElementById('cl-empty'),
    emptyHead:   document.getElementById('cl-empty-heading'),
    emptyBody:   document.getElementById('cl-empty-body'),
    emptyCta:    document.getElementById('cl-empty-cta'),
    emptyClear:  document.getElementById('cl-empty-clear'),
    countBadge:  document.getElementById('cl-count-badge'),
    updated:     document.getElementById('cl-updated'),
    canonical:   document.getElementById('cl-canonical'),
    detail:      document.getElementById('cl-detail'),
    backdrop:    document.getElementById('cl-detail-backdrop'),
    detailClose: document.getElementById('cl-detail-close'),
    detailKicker:document.getElementById('cl-detail-kicker'),
    detailName:  document.getElementById('cl-detail-name'),
    detailWhere: document.getElementById('cl-detail-where'),
    detailChips: document.getElementById('cl-detail-chips'),
    detailWhy:   document.getElementById('cl-detail-why'),
    detailFacts: document.getElementById('cl-detail-facts'),
    detailSite:  document.getElementById('cl-detail-site')
  };

  var PAGE_TITLE = document.title;
  var PAGE_URL = 'https://www.daricecorey.com/connecticut-list/';

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function has(value) {
    return value != null && String(value).trim() !== '';
  }

  // Only http(s) links are rendered, so a bad or hostile value in the Official
  // Website field can never become a javascript: or data: URL. The sync
  // already drops those; this is the second gate, on the side that renders.
  function safeUrl(value) {
    if (!has(value)) return null;
    try {
      var parsed = new URL(String(value).trim(), window.location.origin);
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : null;
    } catch (err) {
      return null;
    }
  }

  function list(value) { return Array.isArray(value) ? value : []; }

  function plural(n, one, many) { return n === 1 ? one : many; }

  /* ---------- dated events ----------

     A date is the one thing on a listing that goes wrong by sitting still.
     Hours and cost are still roughly true next month; last October's apple
     festival is a lie the moment it passes.

     So an event is checked against the visitor's clock rather than the sync's.
     The file is rebuilt every six hours, but the page must stop advertising
     yesterday's fair even if no sync has run since, and a page left open
     overnight must not still be advertising it in the morning. Same reasoning,
     and the same shape, as liveEvent() in village-notes/script.js. */

  function parseDay(value) {
    if (!has(value)) return null;
    var raw = String(value);
    var d = new Date(raw + (/^\d{4}-\d{2}-\d{2}$/.test(raw) ? 'T00:00:00' : ''));
    return isNaN(d.getTime()) ? null : d;
  }

  function today() {
    var t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  // The event's window: start, and end if it runs more than a day. A
  // multi-day fair counts as live through its last day, not from its first.
  function eventWindow(r) {
    var start = parseDay(r.eventStart);
    if (!start) return null;
    var end = parseDay(r.eventEnd) || start;
    if (end < start) end = start;      // reported by the sync; shown sanely here
    return { start: start, end: end };
  }

  function liveEvent(r) {
    var w = eventWindow(r);
    return w && w.end >= today() ? w : null;
  }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

  // Every month a live event touches, so a fair running 30 September to
  // 2 October answers to both. Expired events belong to no month, which is
  // what keeps them out of the filter as well as off the card.
  function monthsOf(r) {
    var w = liveEvent(r);
    if (!w) return [];
    var out = [];
    var cur = new Date(w.start.getFullYear(), w.start.getMonth(), 1);
    var last = new Date(w.end.getFullYear(), w.end.getMonth(), 1);
    while (cur <= last && out.length < 24) {
      out.push(MONTHS[cur.getMonth()]);
      cur.setMonth(cur.getMonth() + 1);
    }
    return out.filter(function (m, i) { return out.indexOf(m) === i; });
  }

  // "Sat 4 Oct", or "4-6 Oct" for a run of days. The year is shown only when
  // it is not this one: "Oct 4" reads as a date to act on, "Oct 4, 2027" reads
  // as an archive entry.
  function eventLabel(r) {
    var w = liveEvent(r);
    if (!w) return null;
    var sameYear = w.start.getFullYear() === new Date().getFullYear();
    var opts = { month: 'short', day: 'numeric' };
    if (!sameYear) opts.year = 'numeric';
    var start = w.start.toLocaleDateString('en-US', opts);
    if (w.end.getTime() === w.start.getTime()) return start;
    var endOpts = w.start.getMonth() === w.end.getMonth() && sameYear
      ? { day: 'numeric' } : opts;
    return start + '\u2013' + w.end.toLocaleDateString('en-US', endOpts);
  }

  // Returns '' rather than the raw value when a timestamp will not parse. The
  // only caller prefixes it with "Last refreshed", and "Last refreshed
  // nonsense" is worse than saying nothing about when the data was refreshed.
  function formatDate(value) {
    if (!has(value)) return '';
    var d = new Date(value + (/^\d{4}-\d{2}-\d{2}$/.test(value) ? 'T00:00:00' : ''));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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

  /* ---------- quick filters ----------

     Every one of these is a value that already exists in the data, matched
     literally. Nothing here classifies an activity that Airtable has not
     classified itself: a quick filter is a shortcut to a category, never a
     judgement about a place. Any that matches nothing is hidden, so a
     shortcut can never lead to an empty page. */

  var QUICK = [
    { key: 'free',      label: 'Free & low-cost',   field: 'categories',      value: 'Free / Low-Cost' },
    { key: 'outdoors',  label: 'Outdoors',          field: 'experienceTypes', value: 'Hiking & Outdoors' },
    { key: 'shoreline', label: 'Shoreline',         field: 'categories',      value: 'Beaches & Shoreline' },
    { key: 'different', label: 'Something different',field: 'categories',     value: 'Something Different' },
    { key: 'onlyct',    label: 'Only in Connecticut',field: 'categories',     value: 'Only in Connecticut' }
  ];

  function quickMatches(q, r) {
    return list(r[q.field]).indexOf(q.value) !== -1;
  }

  /* ---------- rendering ---------- */

  function fact(label, value, flag) {
    if (!has(value)) return '';
    return '<div class="vn-fact' + (flag ? ' vn-fact-flag' : '') + '">' +
             '<dt>' + esc(label) + '</dt>' +
             '<dd>' + esc(value) + '</dd>' +
           '</div>';
  }

  function whereLine(r) {
    return [r.town, r.region].filter(has).join(' · ');
  }

  // The badges a visitor scans before reading anything else: who it suits, and
  // the two or three category words that say what kind of outing it is.
  function chipsFor(r) {
    var chips = [];
    list(r.audiences).forEach(function (a) {
      chips.push('<span class="vn-badge-chip is-open">' + esc(a) + '</span>');
    });
    // Age sits with audience: both answer "is this for us". An adults-only
    // badge is the one a parent most needs to see before reading further, so
    // it is never truncated away with the categories below.
    list(r.ages).forEach(function (a) {
      chips.push('<span class="vn-badge-chip cl-age-chip">' + esc(a) + '</span>');
    });
    if (has(r.bestTime) && r.bestTime !== 'Anytime') {
      chips.push('<span class="vn-badge-chip">' + esc(r.bestTime) + '</span>');
    }
    return chips;
  }

  function card(r) {
    var kicker = list(r.experienceTypes).concat(list(r.categories))[0] || 'Things to do';
    var chips = chipsFor(r);

    // The only row on the card carrying a deadline, so it gets the only accent
    // border on the card face -- the same treatment, and the same class, that
    // Village Notes gives its event row. It disappears once the date passes.
    var when = eventLabel(r);
    var eventRow = when
      ? '<p class="vn-event">' +
          '<span class="vn-visually-hidden">Event date: </span>' +
          '<span class="vn-event-when">' + esc(when) + '</span>' +
        '</p>'
      : '';

    // Only the categories worth a glance. The full set is on the detail view,
    // where there is room for it.
    // Same de-duplication as the detail view: a category that repeats an
    // audience badge already above it earns no second chip.
    var shownAudiences = list(r.audiences);
    var cats = list(r.categories).filter(function (c) {
      return shownAudiences.indexOf(c) === -1;
    }).slice(0, 4);
    var catRow = cats.length
      ? '<div class="vn-chips">' + cats.map(function (c) {
          return '<span class="vn-badge-chip">' + esc(c) + '</span>';
        }).join('') + '</div>'
      : '';

    var why = '';
    if (has(r.whyGo)) {
      var long = String(r.whyGo).trim().length > 320;
      why = '<div class="vn-card-notes' + (long ? ' vn-clamped' : '') + '">' + esc(r.whyGo) + '</div>';
    }

    var url = safeUrl(r.officialWebsite);

    return '<article class="vn-card cl-card" data-slug="' + esc(r.slug) + '">' +
      '<p class="vn-card-track">' + esc(kicker) + '</p>' +
      '<h3 class="vn-card-name">' +
        '<a class="cl-card-link" href="/connecticut-list/?place=' + encodeURIComponent(r.slug) + '">' +
          esc(r.name) +
        '</a>' +
      '</h3>' +
      (has(whereLine(r)) ? '<p class="vn-card-town">' + esc(whereLine(r)) + '</p>' : '') +
      eventRow +
      (chips.length ? '<div class="vn-chips">' + chips.join('') + '</div>' : '') +
      catRow +
      why +
      '<div class="vn-card-foot">' +
        '<div class="vn-card-links">' +
          '<button type="button" class="cl-open">Full details</button>' +
          (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
                 'Official website &#8599;</a>' : '') +
        '</div>' +
      '</div>' +
    '</article>';
  }

  /* ---------- detail view ---------- */

  var lastFocus = null;

  function findBySlug(slug) {
    for (var i = 0; i < state.all.length; i++) {
      if (state.all[i].slug === slug) return state.all[i];
    }
    return null;
  }

  function openDetail(slug, push) {
    var r = findBySlug(slug);
    if (!r) return;
    state.open = slug;
    lastFocus = document.activeElement;

    el.detailKicker.textContent = list(r.experienceTypes).concat(list(r.categories))[0] || 'Things to do';
    el.detailName.textContent = r.name;
    el.detailWhere.textContent = whereLine(r);

    // "Date Night" is both an audience and a category in the base, so without
    // this it appears twice in the same row. The audience badge is the one that
    // stays: it answers who the outing suits, which is what the row is for.
    var shownAudiences = list(r.audiences);
    var chips = chipsFor(r).concat(list(r.categories)
      .filter(function (c) { return shownAudiences.indexOf(c) === -1; })
      .map(function (c) {
        return '<span class="vn-badge-chip">' + esc(c) + '</span>';
      }));
    el.detailChips.innerHTML = chips.join('');
    el.detailChips.hidden = !chips.length;

    el.detailWhy.innerHTML = has(r.whyGo)
      ? '<h3 class="cl-detail-sub">Why go</h3><p>' + esc(r.whyGo) + '</p>' : '';

    el.detailFacts.innerHTML =
      fact('Town', r.town) +
      fact('Region', r.region) +
      fact('Best for', list(r.audiences).join(', ') || null) +
      fact('Ages', list(r.ages).join(', ') || null, true) +
      fact('Dates', eventLabel(r), true) +
      fact('Experience', list(r.experienceTypes).join(', ') || null) +
      fact('Best time', r.bestTime) +
      fact('Address', r.address) +
      // The Airtable field behind this is named "Passport Challenge". The
      // visitor sees "Try This" and never the field name.
      fact('Try this', r.tryThis, true) +
      fact('Planning notes', r.notes);

    var url = safeUrl(r.officialWebsite);
    el.detailSite.hidden = !url;
    if (url) el.detailSite.setAttribute('href', url);

    el.backdrop.hidden = false;
    el.detail.hidden = false;
    document.body.classList.add('cl-detail-open');
    el.detail.focus();

    // A real address for the thing on screen, so the panel can be shared,
    // bookmarked, and reopened by the browser's back and forward buttons.
    var url2 = '/connecticut-list/?place=' + encodeURIComponent(slug);
    if (push) history.pushState({ place: slug }, '', url2);
    document.title = r.name + ' — ' + (has(r.town) ? r.town + ', ' : '') +
                     'Connecticut | Darice’s Connecticut List';
    if (el.canonical) el.canonical.setAttribute('href', PAGE_URL + '?place=' + encodeURIComponent(slug));
  }

  function closeDetail(push) {
    if (state.open === null) return;
    state.open = null;
    el.detail.hidden = true;
    el.backdrop.hidden = true;
    document.body.classList.remove('cl-detail-open');
    document.title = PAGE_TITLE;
    if (el.canonical) el.canonical.setAttribute('href', PAGE_URL);
    if (push) history.pushState({}, '', writeUrl(true));
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- URL state ----------

     Search and filters live in the query string, so a filtered view is a link
     somebody can send. Village Notes does not do this and is untouched by it:
     the behaviour is added here, on this page's own parameters. */

  var PARAMS = [
    ['q',        function () { return state.search ? [state.search] : []; },  function (v) { state.search = v[0] || ''; }],
    ['region',   function () { return state.region ? [state.region] : []; },  function (v) { state.region = v[0] || ''; }],
    ['town',     function () { return state.towns; },                         function (v) { state.towns = v; }],
    ['type',     function () { return state.types; },                         function (v) { state.types = v; }],
    ['category', function () { return state.categories; },                    function (v) { state.categories = v; }],
    ['audience', function () { return state.audiences; },                     function (v) { state.audiences = v; }],
    ['season',   function () { return state.seasons; },                       function (v) { state.seasons = v; }],
    ['month',    function () { return state.months; },                        function (v) { state.months = v; }],
    ['ages',     function () { return state.ages; },                          function (v) { state.ages = v; }],
    ['sort',     function () { return state.sort === 'name' ? [] : [state.sort]; }, function (v) { state.sort = v[0] || 'name'; }]
  ];

  function writeUrl(returnOnly) {
    var params = new URLSearchParams();
    PARAMS.forEach(function (p) {
      p[1]().forEach(function (v) { params.append(p[0], v); });
    });
    var query = params.toString();
    var url = '/connecticut-list/' + (query ? '?' + query : '');
    if (returnOnly) return url;
    history.replaceState({}, '', url);
    return url;
  }

  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    PARAMS.forEach(function (p) {
      var values = params.getAll(p[0]).filter(function (v) { return v !== ''; });
      if (values.length) p[2](values);
    });
    return params.get('place');
  }

  /* ---------- active filters ---------- */

  // Every active filter, each removable on its own, plus one control that
  // clears the lot. The chip carries the value it removes rather than an
  // index, so re-rendering never detaches a handler from its filter.
  function renderActive() {
    var chips = [];
    function add(kind, value, label) {
      chips.push('<button type="button" class="cl-chip" data-kind="' + esc(kind) +
                 '" data-value="' + esc(value) + '">' +
                 '<span class="cl-chip-text">' + esc(label) + '</span>' +
                 '<span class="cl-chip-x" aria-hidden="true">×</span>' +
                 '<span class="vn-visually-hidden">Remove this filter</span></button>');
    }
    if (state.search) add('search', state.search, 'Search: ' + state.search);
    if (state.region) add('region', state.region, state.region);
    state.towns.forEach(function (t) { add('town', t, t); });
    state.types.forEach(function (t) { add('type', t, t); });
    state.categories.forEach(function (c) { add('category', c, c); });
    state.audiences.forEach(function (a) { add('audience', a, a); });
    state.seasons.forEach(function (s) { add('season', s, s); });
    state.months.forEach(function (m) { add('month', m, m); });
    state.ages.forEach(function (a) { add('ages', a, a); });

    el.activeChips.innerHTML = chips.join('');
    el.active.hidden = chips.length === 0;
  }

  function removeFilter(kind, value) {
    function drop(arr) {
      var at = arr.indexOf(value);
      if (at !== -1) arr.splice(at, 1);
    }
    if (kind === 'search') { state.search = ''; el.search.value = ''; }
    if (kind === 'region') { state.region = ''; el.region.value = ''; }
    if (kind === 'town') { drop(state.towns); syncTownUI(); }
    if (kind === 'type') { drop(state.types); syncTypeUI(); }
    if (kind === 'category') { drop(state.categories); }
    if (kind === 'audience') { drop(state.audiences); }
    if (kind === 'season') { drop(state.seasons); }
    if (kind === 'month') { drop(state.months); }
    if (kind === 'ages') { drop(state.ages); }
    syncChipRows();
    apply();
  }

  function clearAll() {
    state.search = '';
    state.region = '';
    state.towns = [];
    state.types = [];
    state.categories = [];
    state.audiences = [];
    state.seasons = [];
    state.months = [];
    state.ages = [];
    state.sort = 'name';
    el.search.value = '';
    el.region.value = '';
    el.sort.value = 'name';
    syncTownUI();
    syncTypeUI();
    syncChipRows();
    apply();
  }

  /* ---------- filtering ---------- */

  function hasAnyOf(values, wanted) {
    if (!wanted.length) return true;
    var vals = list(values);
    return wanted.some(function (w) { return vals.indexOf(w) !== -1; });
  }

  // The names a record can be filtered under. The adapter splits a compound
  // Town -- "Hamden / New Haven" -- into both, so filtering New Haven finds it.
  // Falls back to the display value for the ordinary single-town record, which
  // does not carry the split list.
  function townsOf(r) {
    return Array.isArray(r.towns) ? r.towns : (has(r.town) ? [r.town] : []);
  }

  function matches(r) {
    if (state.region && r.region !== state.region) return false;
    if (state.towns.length && !state.towns.some(function (t) {
      return townsOf(r).indexOf(t) !== -1;
    })) return false;
    if (!hasAnyOf(r.experienceTypes, state.types)) return false;
    if (!hasAnyOf(r.categories, state.categories)) return false;
    if (!hasAnyOf(r.audiences, state.audiences)) return false;
    if (state.seasons.length && state.seasons.indexOf(r.bestTime) === -1) return false;
    if (!hasAnyOf(r.ages, state.ages)) return false;
    if (state.months.length && !state.months.some(function (m) {
      return monthsOf(r).indexOf(m) !== -1;
    })) return false;
    if (!state.search) return true;
    return (r._haystack || '').indexOf(state.search) !== -1;
  }

  // Search is a substring match over one prepared lowercase string per record,
  // which makes it case-insensitive and partial-match friendly without a
  // library: "wat" finds Waterfalls, "stam" finds Stamford.
  function haystack(r) {
    return [r.name, r.town, r.region, r.bestTime, r.whyGo, r.address, r.tryThis, r.notes]
      .concat(townsOf(r))
      .concat(list(r.experienceTypes))
      .concat(list(r.categories))
      .concat(list(r.audiences))
      .concat(list(r.ages))
      // Only while the event is still ahead. Indexing a field usually only
      // adds matches, but an expired event is text the card deliberately does
      // not show, and matching "october" against something invisible sends a
      // visitor to a card that never mentions it.
      .concat(monthsOf(r))
      .concat(eventLabel(r) ? [eventLabel(r)] : [])
      .filter(has).join(' ␟ ').toLowerCase();
  }

  /* ---------- sorting ---------- */

  function byName(a, b) { return String(a.name || '').localeCompare(String(b.name || '')); }

  // No recommendation score: there is no ranking field in the data, and
  // inventing one would be inventing an opinion the record does not carry.
  var SORTS = {
    name:   byName,
    town:   function (a, b) { return String(a.town || '').localeCompare(String(b.town || '')) || byName(a, b); },
    // 152 of the current records have no Region. Sorting on the raw value puts
    // every one of them at the top, so choosing "Region A-Z" shows the records
    // that have no region first -- the opposite of what was asked for. Records
    // without one sort to the end instead.
    region: function (a, b) {
      var ar = has(a.region), br = has(b.region);
      if (ar !== br) return ar ? -1 : 1;
      return String(a.region || '').localeCompare(String(b.region || '')) || byName(a, b);
    },
    added:  function (a, b) {
              return String(b.dateAdded || '').localeCompare(String(a.dateAdded || '')) || byName(a, b);
            }
  };

  /* ---------- chip rows (audience, quick filters, season) ----------

     Built from the data rather than declared, and each option carries its
     count. An option matching nothing is not offered at all, so no filter on
     this page can lead to an empty result on its own. */

  function chipRow(container, row, values, kind, counts) {
    if (!values.length) { row.hidden = true; container.innerHTML = ''; return; }
    row.hidden = false;
    container.innerHTML = values.map(function (v) {
      var n = counts[v.value !== undefined ? v.value : v] || 0;
      var value = v.value !== undefined ? v.value : v;
      var label = v.label !== undefined ? v.label : v;
      return '<label class="vn-toggle">' +
               '<input type="checkbox" data-kind="' + esc(kind) + '" value="' + esc(value) + '" />' +
               '<span>' + esc(label) + ' (' + n + ')</span>' +
             '</label>';
    }).join('');
  }

  function countBy(field, value) {
    return state.all.filter(function (r) {
      return field === 'bestTime' ? r.bestTime === value : list(r[field]).indexOf(value) !== -1;
    }).length;
  }

  // Chip rows the page keeps in sync with state. Listed once so a new row is
  // added in one place rather than in four.
  function chipContainers() {
    return [el.audienceList, el.ageList, el.seasonList, el.monthList, el.quickList];
  }

  function buildChipRows() {
    var audienceCounts = {}, seasonCounts = {}, quickCounts = {};
    var audiences = uniqueSorted(state.all.flatMap(function (r) { return list(r.audiences); }));
    audiences.forEach(function (a) { audienceCounts[a] = countBy('audiences', a); });
    var seasons = uniqueSorted(state.all.map(function (r) { return r.bestTime; }));
    seasons.forEach(function (s) { seasonCounts[s] = countBy('bestTime', s); });

    var quick = QUICK.filter(function (q) {
      quickCounts[q.value] = state.all.filter(function (r) { return quickMatches(q, r); }).length;
      return quickCounts[q.value] > 0;
    }).map(function (q) { return { value: q.value, label: q.label, field: q.field }; });

    // Months, in calendar order rather than alphabetical, and only the ones a
    // live event actually falls in. Both rows disappear entirely until records
    // carry the data, which is why neither can offer a choice that returns
    // nothing -- and why adding the fields does not put two empty rows on the
    // page in the meantime.
    var monthCounts = {};
    state.all.forEach(function (r) {
      monthsOf(r).forEach(function (m) { monthCounts[m] = (monthCounts[m] || 0) + 1; });
    });
    var months = MONTHS.filter(function (m) { return monthCounts[m]; });

    var ageCounts = {};
    var ages = uniqueSorted(state.all.flatMap(function (r) { return list(r.ages); }));
    ages.forEach(function (a) { ageCounts[a] = countBy('ages', a); });
    // Youngest first, and the adults-only options last, which is the order
    // somebody scans them in. Any option the base grows later that is not in
    // this list still appears, at the end, rather than vanishing.
    var AGE_ORDER = ['All ages', 'Little kids (0-5)', 'Kids (6-12)', 'Teens',
                     'Adults only (18+)', 'Adults only (21+)'];
    ages.sort(function (a, b) {
      var ai = AGE_ORDER.indexOf(a), bi = AGE_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    chipRow(el.audienceList, el.audienceRow, audiences, 'audience', audienceCounts);
    chipRow(el.ageList, el.ageRow, ages, 'ages', ageCounts);
    chipRow(el.seasonList, el.seasonRow, seasons, 'season', seasonCounts);
    chipRow(el.monthList, el.monthRow, months, 'month', monthCounts);
    chipRow(el.quickList, el.quickRow, quick, 'quick', quickCounts);
    syncChipRows();
  }

  // A quick filter is a shortcut to a real category value, so it is stored in
  // the same place a category filter is. That is what keeps the two in step:
  // ticking "Free & low-cost" and ticking Free / Low-Cost in the category
  // panel are the same act, and the active-filter row shows one chip either way.
  function quickFor(value) {
    for (var i = 0; i < QUICK.length; i++) if (QUICK[i].value === value) return QUICK[i];
    return null;
  }

  function syncChipRows() {
    chipContainers().forEach(function (container) {
      if (!container) return;
      Array.prototype.forEach.call(container.querySelectorAll('input'), function (box) {
        var kind = box.dataset.kind;
        if (kind === 'audience') box.checked = state.audiences.indexOf(box.value) !== -1;
        if (kind === 'season')   box.checked = state.seasons.indexOf(box.value) !== -1;
        if (kind === 'month')    box.checked = state.months.indexOf(box.value) !== -1;
        if (kind === 'ages')     box.checked = state.ages.indexOf(box.value) !== -1;
        if (kind === 'quick') {
          var q = quickFor(box.value);
          box.checked = !!q && (q.field === 'categories'
            ? state.categories.indexOf(q.value) !== -1
            : state.types.indexOf(q.value) !== -1);
        }
      });
    });
  }

  /* ---------- multi-select panels ---------- */

  function buildTownList(towns) {
    el.townList.innerHTML = towns.map(function (t) {
      return '<label class="vn-multi-opt" data-town="' + esc(t) + '">' +
               '<input type="checkbox" value="' + esc(t) + '" />' +
               '<span>' + esc(t) + '</span>' +
             '</label>';
    }).join('');
    syncTownUI();
  }

  function syncTownUI() {
    var n = state.towns.length;
    el.townLabel.textContent = n === 0 ? 'All towns'
                             : (n === 1 ? state.towns[0] : n + ' towns selected');
    el.townToggle.classList.toggle('has-selection', n > 0);
    Array.prototype.forEach.call(el.townList.querySelectorAll('input'), function (box) {
      box.checked = state.towns.indexOf(box.value) !== -1;
    });
  }

  // Experience Type and Categories share one panel, in two labelled groups.
  // They are two Airtable fields describing the same thing at two levels of
  // detail, and asking a visitor which of the two a waterfall lives in is
  // asking them to know the schema.
  function buildTypeList() {
    var typeCounts = {}, catCounts = {};
    state.all.forEach(function (r) {
      list(r.experienceTypes).forEach(function (t) { typeCounts[t] = (typeCounts[t] || 0) + 1; });
      list(r.categories).forEach(function (c) { catCounts[c] = (catCounts[c] || 0) + 1; });
    });

    function group(title, counts, kind) {
      var keys = Object.keys(counts).sort(function (a, b) { return a.localeCompare(b); });
      if (!keys.length) return '';
      var html = '<div class="vn-multi-group" data-find="' +
                 esc((title + ' ' + keys.join(' ')).toLowerCase()) + '">' +
                 '<p class="vn-multi-opt vn-multi-grouphead"><span>' + esc(title) + '</span></p>';
      keys.forEach(function (k) {
        html += '<label class="vn-multi-opt vn-multi-child">' +
                  '<input type="checkbox" data-kind="' + esc(kind) + '" value="' + esc(k) + '" />' +
                  '<span>' + esc(k) + '</span><em>' + counts[k] + '</em>' +
                '</label>';
      });
      return html + '</div>';
    }

    el.typeList.innerHTML = group('Experience type', typeCounts, 'type') +
                            group('Category', catCounts, 'category');
    syncTypeUI();
  }

  function syncTypeUI() {
    var n = state.types.length + state.categories.length;
    var only = state.types.concat(state.categories);
    el.typeLabel.textContent = n === 0 ? 'Anything'
                             : (n === 1 ? only[0] : n + ' selected');
    el.typeToggle.classList.toggle('has-selection', n > 0);
    Array.prototype.forEach.call(el.typeList.querySelectorAll('input'), function (box) {
      box.checked = (box.dataset.kind === 'type' ? state.types : state.categories)
        .indexOf(box.value) !== -1;
    });
    syncChipRows();
  }

  function openPanel(panel, toggle, find, open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && find) find.focus();
  }

  /* ---------- render ---------- */

  function render(keepShown) {
    var shown = state.all.filter(matches).sort(SORTS[state.sort] || SORTS.name);
    state._shown = shown;

    if (!keepShown) state.shown = PAGE;
    var page = shown.slice(0, state.shown);

    if (!shown.length) {
      el.results.innerHTML = '';
      el.showMore.hidden = true;
      el.empty.hidden = false;
      var filtered = state.all.length > 0;
      el.emptyHead.textContent = filtered ? 'No activities match those filters.' : 'Nothing here yet.';
      el.emptyBody.textContent = filtered
        ? 'Try removing a filter or searching another Connecticut town or activity.'
        : 'The list is still being filled in. Activities appear here once they have been checked and published.';
      el.emptyCta.hidden = !filtered;
    } else {
      el.empty.hidden = true;
      el.results.innerHTML = page.map(card).join('');
      var left = shown.length - page.length;
      el.showMore.hidden = left <= 0;
      el.showMore.textContent = 'Show ' + Math.min(left, PAGE) + ' more of ' + left;
    }

    if (!state.all.length) {
      el.resultline.textContent = '';
      el.surprise.hidden = true;
    } else {
      el.resultline.textContent = shown.length + ' ' +
        plural(shown.length, 'thing', 'things') + ' to explore' +
        (shown.length === state.all.length ? '' : ' of ' + state.all.length);
      el.surprise.hidden = shown.length < 2;
    }

    renderActive();
  }

  // One entry point for "state changed": re-render, then rewrite the URL so a
  // filtered view is always shareable exactly as it looks.
  function apply(keepShown) {
    render(keepShown);
    if (state.open === null) writeUrl();
  }

  /* ---------- events ---------- */

  function bind() {
    el.search.addEventListener('input', function () {
      state.search = this.value.trim().toLowerCase();
      apply();
    });

    el.region.addEventListener('change', function () {
      state.region = this.value;
      apply();
    });

    el.sort.addEventListener('change', function () {
      state.sort = this.value;
      apply();
    });

    el.reset.addEventListener('click', function () {
      clearAll();
      el.search.focus();
    });
    el.clearAll.addEventListener('click', clearAll);
    el.emptyClear.addEventListener('click', function () {
      clearAll();
      el.search.focus();
    });

    el.activeChips.addEventListener('click', function (event) {
      var chip = event.target.closest('.cl-chip');
      if (chip) removeFilter(chip.dataset.kind, chip.dataset.value);
    });

    // Town panel
    el.townToggle.addEventListener('click', function () {
      openPanel(el.townPanel, el.townToggle, el.townFind, el.townPanel.hidden);
    });
    el.townList.addEventListener('change', function (event) {
      var box = event.target;
      if (!box || box.type !== 'checkbox') return;
      var at = state.towns.indexOf(box.value);
      if (box.checked && at === -1) state.towns.push(box.value);
      if (!box.checked && at !== -1) state.towns.splice(at, 1);
      syncTownUI();
      apply();
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
      apply();
    });

    // Type / category panel
    el.typeToggle.addEventListener('click', function () {
      openPanel(el.typePanel, el.typeToggle, el.typeFind, el.typePanel.hidden);
    });
    el.typeList.addEventListener('change', function (event) {
      var box = event.target;
      if (!box || box.type !== 'checkbox') return;
      var bucket = box.dataset.kind === 'type' ? state.types : state.categories;
      var at = bucket.indexOf(box.value);
      if (box.checked && at === -1) bucket.push(box.value);
      if (!box.checked && at !== -1) bucket.splice(at, 1);
      syncTypeUI();
      apply();
    });
    el.typeFind.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      Array.prototype.forEach.call(el.typeList.children, function (grp) {
        grp.hidden = q !== '' && grp.dataset.find.indexOf(q) === -1;
      });
    });
    el.typeClear.addEventListener('click', function () {
      state.types = [];
      state.categories = [];
      syncTypeUI();
      apply();
    });

    // Chip rows
    chipContainers().forEach(function (container) {
      if (!container) return;
      container.addEventListener('change', function (event) {
        var box = event.target;
        if (!box || box.type !== 'checkbox') return;
        var kind = box.dataset.kind;
        var bucket = kind === 'audience' ? state.audiences
                   : kind === 'season'   ? state.seasons
                   : kind === 'month'    ? state.months
                   : kind === 'ages'     ? state.ages
                   : null;
        if (kind === 'quick') {
          var q = quickFor(box.value);
          if (!q) return;
          bucket = q.field === 'categories' ? state.categories : state.types;
        }
        if (!bucket) return;
        var at = bucket.indexOf(box.value);
        if (box.checked && at === -1) bucket.push(box.value);
        if (!box.checked && at !== -1) bucket.splice(at, 1);
        syncTypeUI();
        syncChipRows();
        apply();
      });
    });

    // Show more
    el.showMore.addEventListener('click', function () {
      state.shown += PAGE;
      render(true);
      var cards = el.results.children;
      if (cards.length) cards[Math.max(0, state.shown - PAGE)].scrollIntoView({ block: 'center' });
    });

    // Surprise me. Chooses from what is on screen, so active filters are
    // honoured rather than overridden.
    el.surprise.addEventListener('click', function () {
      var pool = state._shown || [];
      if (!pool.length) return;
      var pick = pool[Math.floor(Math.random() * pool.length)];
      openDetail(pick.slug, true);
    });

    // Cards. One delegated handler, so re-rendering the grid never leaves
    // listeners behind. A plain click on the title link opens the panel;
    // ctrl/cmd-click, middle-click and "open in new tab" are left to the
    // browser, because the link is a real address either way.
    el.results.addEventListener('click', function (event) {
      var link = event.target.closest('.cl-card-link');
      if (link) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        openDetail(link.closest('.cl-card').dataset.slug, true);
        return;
      }
      var open = event.target.closest('.cl-open');
      if (open) openDetail(open.closest('.cl-card').dataset.slug, true);
    });

    // Detail panel
    el.detailClose.addEventListener('click', function () { closeDetail(true); });
    el.backdrop.addEventListener('click', function () { closeDetail(true); });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (state.open !== null) { closeDetail(true); return; }
      if (!el.townPanel.hidden) { openPanel(el.townPanel, el.townToggle, null, false); el.townToggle.focus(); }
      if (!el.typePanel.hidden) { openPanel(el.typePanel, el.typeToggle, null, false); el.typeToggle.focus(); }
    });

    // Focus stays inside the open panel: tabbing off the last control returns
    // to the first rather than wandering into the page behind it.
    el.detail.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab') return;
      var focusable = el.detail.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      var open = Array.prototype.filter.call(focusable, function (n) { return !n.hidden && n.offsetParent !== null; });
      if (!open.length) return;
      var first = open[0], last = open[open.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    document.addEventListener('click', function (event) {
      if (!el.townPanel.hidden && !document.getElementById('cl-town-multi').contains(event.target)) {
        openPanel(el.townPanel, el.townToggle, null, false);
      }
      if (!el.typePanel.hidden && !document.getElementById('cl-type-multi').contains(event.target)) {
        openPanel(el.typePanel, el.typeToggle, null, false);
      }
    });

    // Back and forward move between the list and an open activity.
    window.addEventListener('popstate', function () {
      var params = new URLSearchParams(window.location.search);
      var place = params.get('place');
      if (place) openDetail(place, false);
      else closeDetail(false);
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
        var items = Array.isArray(data) ? data : (data && data.experiences) || [];

        // A record with no name or no slug cannot be shown or addressed, so it
        // is dropped rather than rendered as a blank card.
        state.all = items.filter(function (r) {
          return r && has(r.name) && has(r.slug);
        }).map(function (r) {
          r._haystack = haystack(r);
          return r;
        });

        fillSelect(el.region, uniqueSorted(state.all.map(function (r) { return r.region; })),
                   'All of Connecticut');
        buildTownList(uniqueSorted(state.all.reduce(function (all, r) {
          return all.concat(townsOf(r));
        }, [])));
        buildTypeList();
        buildChipRows();

        // Filters restored from the URL before the first paint, so a shared
        // link renders its filtered view rather than flashing the full list.
        var place = readUrl();
        el.search.value = state.search;
        el.region.value = state.region;
        el.sort.value = state.sort;
        syncTownUI();
        syncTypeUI();
        syncChipRows();

        el.countBadge.textContent = state.all.length
          ? state.all.length + ' ' + plural(state.all.length, 'activity', 'activities')
          : 'List in progress';

        var generated = data && data.generated;
        el.updated.textContent = generated && formatDate(generated)
          ? 'Last refreshed ' + formatDate(generated) : '';

        render();
        if (place) openDetail(place, false);
      })
      .catch(function (err) {
        console.error('Connecticut List: could not load the list.', err);
        el.countBadge.textContent = 'List unavailable';
        el.results.innerHTML = '';
        el.empty.hidden = false;
        el.emptyHead.textContent = 'The list could not be loaded.';
        el.emptyBody.textContent =
          'Please refresh the page, or try again in a few minutes.';
        el.emptyCta.hidden = true;
        el.surprise.hidden = true;
      });
  }

  bind();
  load();
})();
