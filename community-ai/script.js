/* ============================================================================
   AI Support & Opportunities for Communities — directory frontend.
   ----------------------------------------------------------------------------
   Reads only /community-ai/data/opportunities.json, which the community-ai-sync
   workflow regenerates from Airtable every six hours. Nothing here talks to
   Airtable, and no API token is ever present in anything the browser
   downloads. To change the DATA, edit Airtable and re-run
   _tools/fetch-community-ai.py — never hand-edit the JSON.

   To change which filters appear, edit FACETS below: `key` must match a field
   name in the JSON, and options are derived from the data at load time, so a
   new Airtable choice shows up on its own with no code change here.
   ========================================================================== */
(function () {
  'use strict';

  var DATA_URL = '/community-ai/data/opportunities.json';

  /* Values that mean "we could not confirm this" — real in the record, but
     useless as a filter, so they are kept off the facet lists. */
  var NON_ANSWERS = ['Not stated', 'Not determined', 'None', 'N/A'];

  /* Five filters, each a labelled box above the results, in that order. There
     used to be seventeen of them across a sidebar, a row of boxes and a strip
     of quick-start pills -- three places to do one job, with the pills a plain
     duplicate of the first box. What is gone was chosen on what the data can
     actually answer: Languages was answered by two entries of 123 and
     Accessibility by one, so neither could narrow anything; Age group said
     "Adults" for three quarters of the list; and Community served and Who it is
     written for asked the same "who" question as the first box in slightly
     different words. Connecticut went for a different reason: its options read
     "Direct", "Regional Watch" and "Partner-Eligible", which say nothing to a
     visitor, while the first box already carries "Connecticut participant" in
     plain words on 59 entries. Every one of them is still ON the cards -- they
     stopped being ways to search, not facts.

     `empty` is what the box reads when nothing is ticked. FACETS is the whole
     filter vocabulary now, so scripts/check-community-vocabulary.js and the
     URL both follow this list. */
  var FACETS = [
    { key: 'whoCanParticipate', label: 'Who can take part',   empty: 'Anyone' },
    { key: 'door',              label: 'How you access it',   empty: 'Any way in' },
    { key: 'support',           label: 'What you get',        empty: 'Anything' },
    { key: 'cost',              label: 'Cost',                empty: 'Any cost' },
    { key: 'legalStatus',       label: 'Legal status needed', empty: 'Any status', keepNone: true }
  ];

  /* Fields searched by the text box, with their weight in the match score. */
  var SEARCH_FIELDS = [
    ['title', 12], ['org', 10], ['description', 5], ['bestFit', 4],
    ['whoCanApply', 3], ['eligibility', 3], ['support', 3], ['topics', 3],
    ['communityServed', 3], ['type', 3], ['audienceStage', 2], ['fundingDetails', 2],
    ['nextStep', 2], ['geo', 1], ['notes', 1], ['concern', 1], ['cost', 1],
    ['legalStatus', 1], ['deliveryFormat', 1], ['accountBenefit', 1], ['ageGroup', 1]
  ];

  var DETAIL_ROWS = [
    ['whoCanApply',      'Who can apply'],
    ['eligibility',      'Eligibility'],
    ['bestFit',          'Best fit for'],
    ['fundingDetails',   'Funding details'],
    ['cost',             'Cost'],
    ['costAfterCredits', 'Cost after credits end'],
    ['afterSupportEnds', 'When free support ends'],
    ['cycle',            'Cycle'],
    ['deadline',         'Deadline'],
    ['added',            'Added to this directory'],
    ['status',           'Current status'],
    ['geo',              'Geographic scope'],
    ['ctRelevance',      'Connecticut relevance'],
    ['travel',           'Travel or location'],
    ['legalStatus',      'Legal status needed'],
    ['localPartner',     'Local partner needed'],
    ['techStaff',        'Technical staff needed'],
    ['readiness',        'Readiness level'],
    ['communityInput',   'Community input'],
    ['beginnerFriendly', 'Beginner friendly'],
    ['oneOnOne',         'One-on-one help'],
    ['trainTrainer',     'Train-the-trainer'],
    ['internetDevice',   'Internet or device'],
    ['sensitiveInfo',    'Sensitive information'],
    ['lockIn',           'Platform lock-in risk'],
    ['support',          'What you get'],
    ['topics',           'Topic areas'],
    ['communityServed',  'Communities served'],
    ['audienceStage',    'Written for'],
    ['ageGroup',         'Age group'],
    ['deliveryFormat',   'Format'],
    ['languages',        'Languages'],
    ['accessibility',    'Accessibility'],
    ['accountBenefit',   'Accounts that help'],
    ['whoCanParticipate','Who can take part']
  ];

  /* How you get in: the page's spine. These three order the groups, colour the
     badges, and fill the "open to anyone" figure in the hero.
     
     DOOR_ORDER holds the values as Airtable stores them, in the Access Door
     field -- "Door 1", "Door 2", "Door 3" are the base's vocabulary and stay
     that way, so the sync and the drift check keep matching on stable strings.
     DOOR_LABEL is what a reader sees, and nothing on the page says "Door":
     numbers told a visitor nothing about which one applied to them. Change a
     label freely; changing a key means changing Airtable too.

     A value not on this list still shows -- it just sorts last and reads as
     plain text -- so scripts/check-community-vocabulary.js parses DOOR_ORDER
     and turns the sync run red when Airtable coins a fourth one. */
  var DOOR_ORDER = ['Door 1 - No Application', 'Door 2 - Competitive', 'Door 3 - Relationship Only'];
  var DOOR_LABEL = {
    'Door 1 - No Application':      'Open to anyone',
    'Door 2 - Competitive':         'By application',
    'Door 3 - Relationship Only':   'By introduction'
  };

  /* Entries whose Access Door has not been filled in yet. They sort below the
     three real categories and say why they are there, rather than heading a
     fifth of the directory with the words "Not stated". */
  var NO_DOOR = 'Access not recorded yet';

  /* Legal status is read as well as displayed: the hero counts the first list
     as "no 501(c)(3) required", and a card turns 'None' into a plain-English
     badge. Both are silent if an option gets renamed in Airtable, so the
     vocabulary check reads LEGAL_KNOWN the same way it reads DOOR_ORDER. */
  var LEGAL_OPEN  = ['None', 'Fiscal sponsor accepted'];
  var LEGAL_KNOWN = ['None', '501(c)(3) required', 'Fiscal sponsor accepted',
                     'Partner affiliation required', 'Government or school affiliation',
                     'Not stated'];

  /* Cards carry a lot of markup, and the list grows every time a program is
     added. Rendering a screenful and extending on demand keeps the first paint
     quick without hiding anything — the count above always reports the full
     match, and Show more walks the rest. */
  var PAGE = 25;

  var ALL = [];
  var META = {};
  var state = { q: '', filters: {}, only: {}, sort: 'relevance', expanded: {}, shown: 0 };

  var $ = function (id) { return document.getElementById(id); };

  /* -- helpers ------------------------------------------------------------ */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function values(rec, key) {
    var v = rec[key];
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
  }

  function isAnswer(v, keepNone) {
    if (!v) return false;
    if (keepNone && v === 'None') return true;
    return NON_ANSWERS.indexOf(v) === -1;
  }

  function tokens(q) {
    return q.toLowerCase().split(/[^a-z0-9+#]+/).filter(function (t) { return t.length > 1; });
  }

  function haystack(rec, key) {
    var v = rec[key];
    if (v == null) return '';
    return (Array.isArray(v) ? v.join(' ') : String(v)).toLowerCase();
  }

  /* Score a record against the query. Returns 0 when any token is missing, so
     multi-word searches narrow rather than widen. */
  function score(rec, toks) {
    if (!toks.length) return 1;
    var total = 0;
    for (var i = 0; i < toks.length; i++) {
      var tok = toks[i], best = 0;
      for (var f = 0; f < SEARCH_FIELDS.length; f++) {
        var key = SEARCH_FIELDS[f][0], weight = SEARCH_FIELDS[f][1];
        var hay = rec._hay[key];
        if (!hay) continue;
        var at = hay.indexOf(tok);
        if (at === -1) continue;
        /* whole-word and start-of-field hits count for more */
        var bonus = 1;
        if (at === 0) bonus = 1.6;
        else if (/[^a-z0-9]/.test(hay.charAt(at - 1))) bonus = 1.3;
        var hit = weight * bonus;
        if (hit > best) best = hit;
      }
      if (!best) return 0;
      total += best;
    }
    return total;
  }

  function highlight(text, toks) {
    var out = esc(text);
    if (!toks.length) return out;
    var pattern = toks.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|');
    return out.replace(new RegExp('(' + pattern + ')', 'gi'), '<mark>$1</mark>');
  }

  function money(n) {
    if (n == null) return null;
    return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function prettyDate(iso) {
    if (!iso) return null;
    var p = String(iso).split('-');
    if (p.length !== 3) return iso;
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }

  /* "Today" is read from the viewer's own calendar, not UTC. A deadline is a
     plain date with no timezone, so someone in Los Angeles at 9pm on the 31st
     should still be told it is open — telling them they missed it because the
     date already turned in London is the one error worth avoiding here. */
  function todayISO() {
    var d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function isClosed(deadline) {
    return !!deadline && String(deadline) < todayISO();
  }

  /* How many days from today to a plain YYYY-MM-DD, on the viewer's own
     calendar — negative for a date already gone. Built from local parts for the
     same reason todayISO() is: Date('2026-09-07') is UTC midnight, which is the
     day before for anyone west of Greenwich. */
  function daysUntil(iso) {
    if (!iso) return null;
    var parts = String(iso).split('-');
    if (parts.length !== 3) return null;
    var then = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    if (isNaN(then)) return null;
    var now = new Date();
    return Math.round((then - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  }

  function daysSince(iso) {
    var n = daysUntil(iso);
    return n === null ? null : -n;
  }

  /* A date still ahead says more as a countdown than as a date: "closes in 4
     days" is a decision, "Sep 7, 2026" is arithmetic homework. Past this
     window it goes back to being a date. */
  var SOON_DAYS = 14;

  function closingSoon(rec) {
    var n = daysUntil(rec.deadline);
    return n !== null && n >= 0 && n <= SOON_DAYS;
  }

  /* `added` is the day the row first appeared in the base, which the sync
     carries over from Airtable. An entry the directory has not had for long is
     worth pointing at — someone who came back after the last talk wants to know
     what is here now that was not before. */
  var NEW_DAYS = 7;

  function isNew(rec) {
    var n = daysSince(rec.added);
    return n !== null && n >= 0 && n <= NEW_DAYS;
  }

  /* Set at load. When a directory is first built every entry is new, and a mark
     on all of them says nothing — so it is dropped while that is true, and
     comes back on its own as the founding bulk ages out. */
  var newSaysNothing = false;

  function showsNew(rec) {
    return !newSaysNothing && isNew(rec);
  }

  /* The two switches above the results. They ask about dates rather than about
     a field, so they cut across every facet instead of being one. */
  var ONLY = {
    'new':  { test: showsNew,      said: 'added recently' },
    'soon': { test: closingSoon,   said: 'with a deadline coming up' }
  };

  /* Order for the deadline sort: what is still open, soonest first; then the
     rolling entries with no date; then what has already closed. */
  function deadlineRank(rec) {
    if (!rec.deadline) return '1';
    return (isClosed(rec.deadline) ? '2' : '0') + rec.deadline;
  }

  function doorClass(door) {
    if (!door) return '';
    if (door.indexOf('Door 1') === 0) return 'door1';
    if (door.indexOf('Door 2') === 0) return 'door2';
    if (door.indexOf('Door 3') === 0) return 'door3';
    return '';
  }

  /* The badge, the group heading and the filter option all read the same, so
     nobody has to work out that "competitive application" and "by application"
     are the same thing. */
  function shortDoor(door) {
    return door ? (DOOR_LABEL[door] || door) : null;
  }

  /* -- filtering ---------------------------------------------------------- */

  function matchesFacets(rec, skipKey) {
    for (var only in state.only) {
      if (state.only[only] && ONLY[only] && !ONLY[only].test(rec)) return false;
    }
    for (var key in state.filters) {
      if (key === skipKey) continue;
      var chosen = state.filters[key];
      if (!chosen || !chosen.length) continue;
      var have = values(rec, key);
      var hit = false;
      for (var i = 0; i < chosen.length && !hit; i++) {
        if (have.indexOf(chosen[i]) !== -1) hit = true;
      }
      if (!hit) return false;
    }
    return true;
  }

  function compute() {
    var toks = tokens(state.q);
    var rows = [];
    for (var i = 0; i < ALL.length; i++) {
      var rec = ALL[i];
      if (!matchesFacets(rec, null)) continue;
      var s = score(rec, toks);
      if (!s) continue;
      rows.push({ rec: rec, score: s });
    }

    var by = state.sort;
    rows.sort(function (a, b) {
      if (by === 'title') return a.rec.title.localeCompare(b.rec.title);
      if (by === 'funding') return (b.rec.maxFunding || -1) - (a.rec.maxFunding || -1) || a.rec.title.localeCompare(b.rec.title);
      if (by === 'checked') return String(b.rec.lastChecked || '').localeCompare(String(a.rec.lastChecked || '')) || a.rec.title.localeCompare(b.rec.title);
      /* Someone with a date to hit wants the closing ones first. Most entries
         are rolling and carry no deadline at all, and a few have already
         closed; deadlineRank keeps all three groups in the useful order. */
      if (by === 'added') {
        return String(b.rec.added || '').localeCompare(String(a.rec.added || '')) ||
               a.rec.title.localeCompare(b.rec.title);
      }
      if (by === 'deadline') {
        return deadlineRank(a.rec).localeCompare(deadlineRank(b.rec)) ||
               a.rec.title.localeCompare(b.rec.title);
      }
      return b.score - a.score || a.rec.title.localeCompare(b.rec.title);
    });
    return { rows: rows, toks: toks };
  }

  /* Counts shown next to each option: how many results you would get if you
     added that option, holding every OTHER facet fixed. */
  function facetCounts(key) {
    var toks = tokens(state.q);
    var counts = {};
    for (var i = 0; i < ALL.length; i++) {
      var rec = ALL[i];
      if (!matchesFacets(rec, key)) continue;
      if (!score(rec, toks)) continue;
      var vals = values(rec, key);
      for (var v = 0; v < vals.length; v++) counts[vals[v]] = (counts[vals[v]] || 0) + 1;
    }
    return counts;
  }

  /* -- rendering ---------------------------------------------------------- */

  /* -- the promoted filter boxes ------------------------------------------ */

  /* The same four filters the sidebar carries, in the labelled boxes the
     childcare directory uses. They read and write state.filters like every
     other control, so the sidebar, the quick starts and these stay in step
     with no syncing code of their own. */


  /* Built once. Rebuilding the markup on each change would fold up a panel the
     reader is still ticking through, and re-sorting live counts would slide
     options out from under the pointer -- so the order is fixed here and only
     the labels, ticks and counts move afterwards. */
  function buildRow() {
    var host = $('cf-fieldrow');
    if (!host) return;

    host.innerHTML = FACETS.map(function (facet) {
      var field = facet;
      var counts = facetCounts(field.key);
      var opts = Object.keys(facet._options)
        .filter(function (v) { return isAnswer(v, facet.keepNone); })
        .sort(function (a, b) {
          if (field.key === 'door') return DOOR_ORDER.indexOf(a) - DOOR_ORDER.indexOf(b);
          return (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b);
        });
      if (!opts.length) return '';

      var text = function (v) { return field.key === 'door' ? (DOOR_LABEL[v] || v) : v; };

      var list = opts.map(function (v) {
        return '<label class="cf-multi-opt" data-find-text="' + esc(text(v).toLowerCase()) + '">' +
                 '<input type="checkbox" data-facet="' + esc(field.key) + '" value="' + esc(v) + '" />' +
                 '<span>' + esc(text(v)) + '</span>' +
                 '<em data-count="' + esc(v) + '">' + (counts[v] || 0) + '</em>' +
               '</label>';
      }).join('');

      // A find box earns its place on a long list and clutters a short one.
      var head = opts.length > 8
        ? '<div class="cf-multi-head">' +
            '<input type="search" data-find="' + esc(field.key) + '" placeholder="Find&hellip;" ' +
                   'aria-label="Find within ' + esc(facet.label.toLowerCase()) + '" autocomplete="off" />' +
            '<button type="button" class="cf-multi-clear" data-clearfacet="' + esc(field.key) + '">Clear</button>' +
          '</div>'
        : '<div class="cf-multi-head cf-multi-head-bare">' +
            '<button type="button" class="cf-multi-clear" data-clearfacet="' + esc(field.key) + '">Clear</button>' +
          '</div>';

      return '<div class="cf-field">' +
        '<span class="cf-field-label" id="cf-lbl-' + esc(field.key) + '">' + esc(facet.label) + '</span>' +
        '<div class="cf-multi" data-multi="' + esc(field.key) + '">' +
          '<button type="button" class="cf-multi-toggle" data-toggle="' + esc(field.key) + '" ' +
                  'aria-expanded="false" aria-haspopup="true" aria-controls="cf-panel-' + esc(field.key) + '" ' +
                  'aria-labelledby="cf-lbl-' + esc(field.key) + ' cf-val-' + esc(field.key) + '">' +
            '<span id="cf-val-' + esc(field.key) + '" data-value="' + esc(field.key) + '">' + esc(field.empty) + '</span>' +
          '</button>' +
          '<div class="cf-multi-panel" id="cf-panel-' + esc(field.key) + '" role="group" ' +
               'aria-label="Filter by ' + esc(facet.label.toLowerCase()) + '" hidden>' +
            head +
            '<div class="cf-multi-list">' + list + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function syncRow() {
    var host = $('cf-fieldrow');
    if (!host) return;

    FACETS.forEach(function (field) {
      var box = host.querySelector('[data-multi="' + field.key + '"]');
      if (!box) return;

      var chosen = state.filters[field.key] || [];
      var label = box.querySelector('[data-value]');
      var toggle = box.querySelector('[data-toggle]');

      label.textContent = chosen.length === 0 ? field.empty
        : (chosen.length === 1
            ? (field.key === 'door' ? (DOOR_LABEL[chosen[0]] || chosen[0]) : chosen[0])
            : chosen.length + ' selected');
      toggle.classList.toggle('has-selection', chosen.length > 0);

      /* Counts hold every other filter fixed, so they answer "what would I get
         if I added this one" rather than restating what is already on screen.
         An option that would return nothing is dimmed but stays clickable when
         it is the one already ticked -- otherwise it could not be unticked. */
      var counts = facetCounts(field.key);
      Array.prototype.forEach.call(box.querySelectorAll('input[data-facet]'), function (input) {
        var on = chosen.indexOf(input.value) !== -1;
        var n = counts[input.value] || 0;
        input.checked = on;
        input.disabled = n === 0 && !on;
        var opt = input.parentNode;
        opt.classList.toggle('is-empty', n === 0 && !on);
        var em = opt.querySelector('em');
        if (em) em.textContent = n;
      });
    });
  }

  function openPanel(key, open) {
    var host = $('cf-fieldrow');
    if (!host) return;
    Array.prototype.forEach.call(host.querySelectorAll('[data-multi]'), function (box) {
      var mine = box.getAttribute('data-multi') === key;
      var panel = box.querySelector('.cf-multi-panel');
      var toggle = box.querySelector('[data-toggle]');
      var show = mine && open;
      panel.hidden = !show;
      toggle.setAttribute('aria-expanded', show ? 'true' : 'false');
      if (show) {
        var find = panel.querySelector('input[data-find]');
        if (find) find.focus();
      }
    });
  }

  function anyPanelOpen() {
    var host = $('cf-fieldrow');
    return !!(host && host.querySelector('.cf-multi-panel:not([hidden])'));
  }

  function closePanels() {
    openPanel(null, false);
  }

  /* The four promoted to the boxes above the results are not repeated here.
     Showing the same list twice on one screen invites the reader to wonder
     which of the two is the real one. */
  function renderChips() {
    var host = $('cf-chips');
    var chips = [];
    if (state.q) {
      chips.push('<span class="cf-chip">Search: &ldquo;' + esc(state.q) + '&rdquo;<button type="button" data-clear="q" aria-label="Clear search">&times;</button></span>');
    }
    FACETS.forEach(function (facet) {
      (state.filters[facet.key] || []).forEach(function (v) {
        chips.push('<span class="cf-chip">' + esc(facet.key === 'door' ? (DOOR_LABEL[v] || v) : v) +
          '<button type="button" data-off="' + esc(facet.key) + '" data-val="' + esc(v) + '" aria-label="Remove filter ' + esc(v) + '">&times;</button></span>');
      });
    });
    if (chips.length > 1) {
      chips.push('<span class="cf-chip"><button type="button" data-clear="all" style="color:var(--cream);text-decoration:underline">Clear everything</button></span>');
    }
    host.innerHTML = chips.join('');
  }

  function card(rec, toks) {
    var open = !!state.expanded[rec.id];
    var badges = [];
    if (rec.door) badges.push('<span class="cf-badge ' + doorClass(rec.door) + '">' + esc(shortDoor(rec.door)) + '</span>');
    if (rec.type) badges.push('<span class="cf-badge">' + esc(rec.type) + '</span>');
    if (rec.maxFunding != null) badges.push('<span class="cf-badge money">Up to ' + esc(money(rec.maxFunding)) + '</span>');
    if (rec.cost && rec.cost !== 'Not stated') badges.push('<span class="cf-badge">' + esc(rec.cost) + '</span>');
    if (rec.legalStatus === 'None') badges.push('<span class="cf-badge">No legal status needed</span>');
    else if (rec.legalStatus && rec.legalStatus !== 'Not stated') badges.push('<span class="cf-badge">' + esc(rec.legalStatus) + '</span>');
    if (rec.beginnerFriendly === 'Yes') badges.push('<span class="cf-badge">Beginner friendly</span>');
    if (rec.deadline) {
      var left = daysUntil(rec.deadline);
      if (isClosed(rec.deadline)) {
        badges.push('<span class="cf-badge closed">Closed ' + esc(prettyDate(rec.deadline)) + '</span>');
      } else if (left === 0) {
        badges.push('<span class="cf-badge deadline">Closes today</span>');
      } else if (left !== null && left <= SOON_DAYS) {
        badges.push('<span class="cf-badge deadline">Closes in ' + left +
                    (left === 1 ? ' day' : ' days') + '</span>');
      } else {
        /* Still open, but months out. Alert red would cry wolf next to a date
           that really is days away, so a further-off one reads calmer. */
        badges.push('<span class="cf-badge upcoming">Deadline ' + esc(prettyDate(rec.deadline)) + '</span>');
      }
    }
    if (showsNew(rec)) badges.push('<span class="cf-badge fresh">Just added</span>');

    /* A field the official source never addressed is worth saying once, at the
       end — not as eight rows of "Not stated" between the facts that matter. */
    var unstated = [];
    var rows = DETAIL_ROWS.map(function (pair) {
      var key = pair[0], label = pair[1], v = rec[key];
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '';
      var list = Array.isArray(v) ? v : [v];
      var real = list.filter(function (x) { return NON_ANSWERS.indexOf(x) === -1 || x === 'None' || x === 'N/A'; });
      if (!real.length) { unstated.push(label.toLowerCase()); return ''; }
      var body;
      if (Array.isArray(v)) {
        body = real.map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
      } else if (key === 'deadline') {
        body = esc(prettyDate(v)) + (isClosed(v) ? ' <span class="cf-closed-note">(this date has passed)</span>' : '');
      } else if (key === 'added') {
        body = esc(prettyDate(v));
      } else {
        body = esc(v);
      }
      return '<dt>' + esc(label) + '</dt><dd>' + body + '</dd>';
    }).join('');

    if (rec.maxFunding != null) {
      rows = '<dt>Maximum funding</dt><dd>' + esc(money(rec.maxFunding)) + '</dd>' + rows;
    }

    var detail = '<div class="cf-detail' + (open ? ' open' : '') + '" id="d-' + esc(rec.id) + '">' +
      '<dl class="cf-dl">' + rows + '</dl>' +
      (rec.concern ? '<div class="cf-detail-note warn"><strong>Watch out for</strong>' + esc(rec.concern) + '</div>' : '') +
      (rec.nextStep ? '<div class="cf-detail-note"><strong>Suggested next step</strong>' + esc(rec.nextStep) + '</div>' : '') +
      (rec.notes ? '<div class="cf-detail-note"><strong>Notes</strong>' + esc(rec.notes) + '</div>' : '') +
      (unstated.length ? '<p class="cf-unstated"><em>The official source does not state:</em> ' + esc(unstated.join(', ')) + '.</p>' : '') +
      (rec.lastChecked ? '<p class="cf-verified">Checked against the official source on ' + esc(prettyDate(rec.lastChecked)) + '. Confirm current terms before you apply.</p>' : '') +
      '</div>';

    return '<article class="cf-card">' +
      '<div class="cf-card-top"><div>' +
        (rec.org ? '<p class="cf-card-org">' + highlight(rec.org, toks) + '</p>' : '') +
        '<h3>' + highlight(rec.title, toks) + '</h3>' +
      '</div></div>' +
      '<div class="cf-badges">' + badges.join('') + '</div>' +
      (rec.description ? '<p class="cf-card-desc">' + highlight(rec.description, toks) + '</p>' : '') +
      '<div class="cf-card-actions">' +
        '<button type="button" class="cf-toggle" data-detail="' + esc(rec.id) + '" aria-expanded="' + open + '" aria-controls="d-' + esc(rec.id) + '">' +
          (open ? 'Hide the details' : 'See the details') + '</button>' +
        (rec.url ? '<a class="cf-visit" href="' + esc(rec.url) + '" target="_blank" rel="noopener noreferrer">Official page &nearr;</a>' : '') +
      '</div>' + detail + '</article>';
  }

  /* Results are always grouped by door. It used to be a dropdown offering
     organization and kind of opportunity too, but the door is the one grouping
     that answers a question the reader has — can I actually get this — and a
     second way to rearrange the same list is a decision to make before any
     result is read. */
  function groupKey(rec) {
    return rec.door || NO_DOOR;
  }

  /* Finding nothing is the most useful moment on the page: the visitor has just
     told us, precisely, about a gap. Saying it back to them beats "try clearing
     the search box", and it is the sentence that makes an email worth sending. */
  function currentAsk() {
    var bits = [];
    Object.keys(ONLY).forEach(function (key) {
      if (state.only[key]) bits.push(ONLY[key].said);
    });
    FACETS.forEach(function (facet) {
      var chosen = state.filters[facet.key] || [];
      if (!chosen.length) return;
      var names = chosen.map(function (v) { return facet.key === 'door' ? (DOOR_LABEL[v] || v) : v; });
      bits.push(names.length <= 2 ? names.join(' or ')
                                  : names.length + ' ' + facet.label.toLowerCase() + ' options');
    });
    if (state.q) bits.push('\u201c' + state.q + '\u201d');
    return bits.join(', ');
  }

  function renderEmpty(list) {
    var what = currentAsk();
    list.innerHTML = '<div class="cf-empty"><h3>Nothing here matches that yet</h3>' +
      '<p>' +
        (what ? 'Nothing in the directory matches ' + esc(what) +
                ' &mdash; which does not mean nothing exists. ' : '') +
        'Try fewer filters, or a plainer word &mdash; &ldquo;training&rdquo; instead of &ldquo;professional development&rdquo;.' +
      '</p>' +
      '<p>Know a program that would have answered this? That is exactly the gap worth closing, and every entry here started as somebody mentioning one.</p>' +
      '<div class="cf-empty-actions">' +
        '<button type="button" class="btn-primary" data-clear="all">Reset the search</button>' +
        '<a class="btn-ghost" href="/contact.html">Tell me what is missing</a>' +
      '</div></div>';
  }

  function render(keepShown) {
    var res = compute();
    var rows = res.rows, toks = res.toks;

    $('cf-count').innerHTML = rows.length === ALL.length
      ? 'Showing all <strong>' + ALL.length + '</strong> opportunities'
      : 'Showing <strong>' + rows.length + '</strong> of ' + ALL.length + ' opportunities';

    var list = $('cf-list');
    var more = $('cf-showmore');

    if (!rows.length) {
      renderEmpty(list);
      more.hidden = true;
      return;
    }

    /* Grouping reorders the list, so the page slice has to be taken AFTER that
       reordering — otherwise "Show more" would sprinkle new cards into groups
       further up the page instead of continuing where the reader stopped. */
    var order = [], totals = {};
    rows.forEach(function (r) {
      var k = groupKey(r.rec);
      if (totals[k] === undefined) { totals[k] = 0; order.push(k); }
      totals[k]++;
    });
    order.sort(function (a, b) {
      var ia = DOOR_ORDER.indexOf(a), ib = DOOR_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    var rank = {};
    order.forEach(function (k, i) { rank[k] = i; });
    /* Array.prototype.sort is stable in every browser this page supports, so
       each door keeps whatever order the sort dropdown just produced. */
    rows.sort(function (a, b) { return rank[groupKey(a.rec)] - rank[groupKey(b.rec)]; });

    if (!keepShown) state.shown = PAGE;
    var page = rows.slice(0, state.shown);
    var left = rows.length - page.length;
    more.hidden = left <= 0;
    more.textContent = 'Show ' + Math.min(left, PAGE) + ' more of ' + left;

    var buckets = {};
    page.forEach(function (r) {
      var k = groupKey(r.rec);
      (buckets[k] || (buckets[k] = [])).push(r);
    });

    list.innerHTML = order.filter(function (k) { return buckets[k]; }).map(function (k) {
      var label = DOOR_LABEL[k] || k;
      /* The heading counts every match in the group, not only the cards drawn
         so far, so the number never shrinks as the reader pages through. */
      return '<section class="cf-group"><h2 class="cf-group-head">' + esc(label) +
        '<span class="n">' + totals[k] + '</span></h2>' +
        buckets[k].map(function (r) { return card(r.rec, toks); }).join('') + '</section>';
    }).join('');
  }

  /* Counts on the switches, and a switch that would return nothing hides
     rather than promising an empty result. "Added recently" also disappears
     while everything is new, which is the same judgement showsNew() makes. */
  function tuneOnly() {
    var live = 0;
    Array.prototype.forEach.call(document.querySelectorAll('.cf-only input[data-only]'), function (box) {
      var key = box.getAttribute('data-only');
      var n = ALL.filter(ONLY[key].test).length;
      var label = box.parentNode.querySelector('span');
      if (!label.dataset.base) label.dataset.base = label.textContent;
      if (n === 0) {
        box.parentNode.hidden = true;
        box.checked = false;
        delete state.only[key];
      } else {
        box.parentNode.hidden = false;
        label.textContent = label.dataset.base + ' (' + n + ')';
        live++;
      }
    });
    var row = document.querySelector('.cf-onlys');
    if (row) row.hidden = live === 0;
  }

  function syncOnly() {
    Array.prototype.forEach.call(document.querySelectorAll('.cf-only input[data-only]'), function (box) {
      box.checked = !!state.only[box.getAttribute('data-only')];
    });
  }

  function renderAll() {
    syncOnly();
    syncRow();
    renderChips();
    render();
    $('cf-clearq').hidden = !state.q;
  }

  /* -- URL state ---------------------------------------------------------- */

  var syncing = false;

  function writeHash() {
    if (syncing) return;
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.sort !== 'relevance') p.set('sort', state.sort);
    var on = Object.keys(state.only).filter(function (k) { return state.only[k]; });
    if (on.length) p.set('only', on.join('~'));
    FACETS.forEach(function (f) {
      var v = state.filters[f.key];
      if (v && v.length) p.set(f.key, v.join('~'));
    });
    var hash = p.toString();
    history.replaceState(null, '', hash ? '#' + hash : location.pathname);
  }

  /* A shared or hand-edited link can name a sort or grouping this page does not
     offer — the deadline order that hides itself below, or one renamed since.
     Fall back rather than leave the dropdown blank and the list arranged by
     something nothing on screen names. Compared against the real options rather
     than matched with a selector, so a hostile hash cannot throw here. */
  function normalizeChoice(id, fallback, current) {
    var opts = $(id).options;
    for (var i = 0; i < opts.length; i++) if (opts[i].value === current) return current;
    return fallback;
  }

  function readHash() {
    var raw = location.hash.replace(/^#/, '');
    if (!raw) return;
    var p = new URLSearchParams(raw);
    state.q = p.get('q') || '';
    state.sort = p.get('sort') || 'relevance';
    state.filters = {};
    FACETS.forEach(function (f) {
      var v = p.get(f.key);
      if (v) state.filters[f.key] = v.split('~').filter(Boolean);
    });
    state.only = {};
    (p.get('only') || '').split('~').forEach(function (k) {
      if (ONLY[k]) state.only[k] = true;
    });
  }

  /* -- events ------------------------------------------------------------- */

  function toggleFilter(key, value) {
    var cur = state.filters[key] || [];
    var at = cur.indexOf(value);
    if (at === -1) cur = cur.concat([value]);
    else cur = cur.slice(0, at).concat(cur.slice(at + 1));
    if (cur.length) state.filters[key] = cur; else delete state.filters[key];
  }

  function wire() {
    var qEl = $('cf-q'), timer;
    qEl.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = qEl.value.trim(); writeHash(); renderAll(); }, 140);
    });

    $('cf-clearq').addEventListener('click', function () {
      qEl.value = ''; state.q = ''; writeHash(); renderAll(); qEl.focus();
    });

    $('cf-sort').addEventListener('change', function () { state.sort = this.value; writeHash(); render(); });

    $('cf-showmore').addEventListener('click', function () {
      var first = state.shown;
      state.shown += PAGE;
      render(true);
      /* Keep the reader where they were rather than throwing them to the top of
         a re-rendered list. Cards live inside group sections, so walk the DOM
         rather than indexing children of the list. */
      var cards = $('cf-list').querySelectorAll('.cf-card');
      if (cards[first]) cards[first].scrollIntoView({ block: 'center' });
    });

    function resetAll() {
      state.q = ''; state.filters = {}; state.only = {}; qEl.value = '';
      closePanels(); writeHash(); renderAll();
    }

    Array.prototype.forEach.call(document.querySelectorAll('.cf-only input[data-only]'), function (box) {
      box.addEventListener('change', function () {
        state.only[this.getAttribute('data-only')] = this.checked;
        writeHash(); renderAll();
      });
    });
    $('cf-reset-row').addEventListener('click', resetAll);

    var row = $('cf-fieldrow');

    row.addEventListener('click', function (e) {
      var toggle = e.target.closest('[data-toggle]');
      if (toggle) {
        var key = toggle.getAttribute('data-toggle');
        var panel = document.getElementById('cf-panel-' + key);
        openPanel(key, panel.hidden);
        return;
      }
      var clear = e.target.closest('[data-clearfacet]');
      if (clear) {
        delete state.filters[clear.getAttribute('data-clearfacet')];
        writeHash(); renderAll();
      }
    });

    row.addEventListener('change', function (e) {
      var box = e.target.closest('input[data-facet]');
      if (!box) return;
      toggleFilter(box.getAttribute('data-facet'), box.value);
      writeHash(); renderAll();
    });

    row.addEventListener('input', function (e) {
      var find = e.target.closest('input[data-find]');
      if (!find) return;
      var q = find.value.trim().toLowerCase();
      var list = find.closest('.cf-multi-panel').querySelector('.cf-multi-list');
      Array.prototype.forEach.call(list.children, function (opt) {
        opt.hidden = q !== '' && opt.getAttribute('data-find-text').indexOf(q) === -1;
      });
    });

    /* A panel is a menu: clicking away or pressing Escape should put it away,
       and Escape should hand focus back to the box it came from. */
    document.addEventListener('click', function (e) {
      if (anyPanelOpen() && !e.target.closest('#cf-fieldrow')) closePanels();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !anyPanelOpen()) return;
      var open = row.querySelector('.cf-multi-panel:not([hidden])');
      var toggle = open && open.parentNode.querySelector('[data-toggle]');
      closePanels();
      if (toggle) toggle.focus();
    });

    $('cf-chips').addEventListener('click', function (e) {
      var off = e.target.closest('[data-off]');
      if (off) { toggleFilter(off.getAttribute('data-off'), off.getAttribute('data-val')); writeHash(); renderAll(); return; }
      var clear = e.target.closest('[data-clear]');
      if (!clear) return;
      if (clear.getAttribute('data-clear') === 'q') { state.q = ''; qEl.value = ''; }
      else { state.q = ''; qEl.value = ''; state.filters = {}; }
      writeHash(); renderAll();
    });

    $('cf-list').addEventListener('click', function (e) {
      var clear = e.target.closest('[data-clear]');
      if (clear) { state.q = ''; qEl.value = ''; state.filters = {}; writeHash(); renderAll(); return; }
      var btn = e.target.closest('[data-detail]');
      if (!btn) return;
      var id = btn.getAttribute('data-detail');
      var panel = document.getElementById('d-' + id);
      var nowOpen = !state.expanded[id];
      state.expanded[id] = nowOpen;
      if (panel) panel.classList.toggle('open', nowOpen);
      btn.setAttribute('aria-expanded', String(nowOpen));
      btn.textContent = nowOpen ? 'Hide the details' : 'See the details';
    });

    window.addEventListener('hashchange', function () {
      syncing = true;
      readHash();
      state.sort = normalizeChoice('cf-sort', 'relevance', state.sort);
      qEl.value = state.q;
      $('cf-sort').value = state.sort;
      syncing = false;
      renderAll();
    });
  }

  /* -- boot --------------------------------------------------------------- */

  function boot(payload) {
    META = payload.meta || {};
    ALL = payload.opportunities || [];

    /* Pre-lowercase every searched field once, so typing stays instant. */
    ALL.forEach(function (rec) {
      rec._hay = {};
      SEARCH_FIELDS.forEach(function (pair) { rec._hay[pair[0]] = haystack(rec, pair[0]); });
    });

    /* Facet options come from the data, not a hand-kept list. */
    FACETS.forEach(function (facet) {
      facet._options = {};
      ALL.forEach(function (rec) {
        values(rec, facet.key).forEach(function (v) { facet._options[v] = true; });
      });
    });

    /* Decided before anything renders: if nearly every entry was added inside
       the window, "just added" is not news, it is the whole list. */
    var fresh = ALL.filter(isNew).length;
    newSaysNothing = ALL.length > 0 && fresh / ALL.length >= 0.8;

    var orgs = {}, door1 = 0, noStatus = 0, dated = 0;
    ALL.forEach(function (rec) {
      if (rec.org) orgs[rec.org] = true;
      if (rec.door && rec.door.indexOf('Door 1') === 0) door1++;
      if (LEGAL_OPEN.indexOf(rec.legalStatus) !== -1) noStatus++;
      if (rec.deadline) dated++;
    });
    $('cf-stat-total').textContent = ALL.length;
    $('cf-stat-open').textContent = door1;
    $('cf-stat-nostatus').textContent = noStatus;
    $('cf-stat-orgs').textContent = Object.keys(orgs).length;

    $('cf-count-badge').textContent = ALL.length
      ? ALL.length + (ALL.length === 1 ? ' opportunity' : ' opportunities')
      : 'Directory in progress';
    $('cf-updated').textContent = META.generated
      ? 'Last refreshed ' + prettyDate(META.generated) : '';

    /* Most entries are rolling and carry no deadline, which is exactly why the
       sort earns its place: it lifts the handful that do close to the top. But
       with none at all it would reorder nothing, so it hides itself instead of
       lying about what it does. */
    if (dated === 0) {
      var opt = $('cf-sort').querySelector('option[value="deadline"]');
      if (opt) opt.remove();
    }

    readHash();
    buildRow();
    tuneOnly();
    state.sort = normalizeChoice('cf-sort', 'relevance', state.sort);
    $('cf-q').value = state.q;
    $('cf-sort').value = state.sort;

    wire();
    renderAll();
  }

  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(boot)
    .catch(function (err) {
      $('cf-list').innerHTML = '<div class="cf-empty"><h3>The directory could not load</h3>' +
        '<p>Please refresh the page, or try again in a few minutes. If it keeps failing, the data file may be missing.</p></div>';
      $('cf-count').textContent = '';
      $('cf-count-badge').textContent = 'Directory unavailable';
      if (window.console) console.error('Community AI directory:', err);
    });
})();
