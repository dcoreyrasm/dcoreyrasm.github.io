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

  var state = { all: [], search: '', track: '', category: '', town: '' };

  var el = {
    search:     document.getElementById('vn-search'),
    track:      document.getElementById('vn-track'),
    category:   document.getElementById('vn-category'),
    town:       document.getElementById('vn-town'),
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

    var facts =
      fact('Serves', servesLabel) +
      fact('Hours', r.hours) +
      fact('Waitlist', r.availability, true) +
      fact('Ages', r.ages) +
      fact('Cost', r.cost) +
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
    if (state.category && r.category !== state.category) return false;
    if (state.town && !servesTown(r, state.town)) return false;
    if (!state.search) return true;
    return (r._haystack || '').indexOf(state.search) !== -1;
  }

  function haystack(r) {
    return [r.name, r.track, r.category, r.specificType, r.town, r.address,
            r.ages, r.hours, r.availability, r.cost, r.contact, r.notes,
            r.submittedBy]
      .concat(Array.isArray(r.townsServed) ? r.townsServed : [])
      .filter(has).join(' ␟ ').toLowerCase();
  }

  // Category options track the selected Track, so a family browsing Elder
  // Care is never offered "Sports Camp" as a filter that returns nothing.
  function refreshCategoryOptions() {
    var pool = state.track
      ? state.all.filter(function (r) { return r.track === state.track; })
      : state.all;
    fillSelect(el.category, uniqueSorted(pool.map(function (r) { return r.category; })), 'All categories');
    if (el.category.value !== state.category) {
      state.category = el.category.value;
    }
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

  /* ---------- events ---------- */

  function bind() {
    el.search.addEventListener('input', function () {
      state.search = this.value.trim().toLowerCase();
      render();
    });

    el.track.addEventListener('change', function () {
      state.track = this.value;
      refreshCategoryOptions();
      render();
    });

    el.category.addEventListener('change', function () {
      state.category = this.value;
      render();
    });

    el.town.addEventListener('change', function () {
      state.town = this.value;
      render();
    });

    el.reset.addEventListener('click', function () {
      state.search = state.track = state.category = state.town = '';
      el.search.value = '';
      el.track.value = '';
      el.town.value = '';
      refreshCategoryOptions();
      el.category.value = '';
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
        townValues = townValues.filter(function (t) { return t !== STATEWIDE; });
        fillSelect(el.town, uniqueSorted(townValues), 'All towns');
        refreshCategoryOptions();

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
