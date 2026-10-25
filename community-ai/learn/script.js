/* ============================================================================
   Free AI Learning — the learning area of Community AI.
   ----------------------------------------------------------------------------
   Reads the SAME /community-ai/data/opportunities.json the directory reads.
   There is no second data source and no second sync: the community-ai-sync
   workflow regenerates that file from Airtable, nothing here talks to
   Airtable, and no token is present in anything the browser downloads.

   Everything this page claims comes from a field. Where the base has no field
   for something -- course length, whether an account is needed, certificate
   type and cost -- no card says anything about it, rather than guessing from
   the description text.
   ========================================================================== */
(function () {
  'use strict';

  var DATA_URL = '/community-ai/data/opportunities.json';
  var PAGE = 24;

  /* Which records count as a course. 'Free Training' is the type that means
     "someone can learn from this"; the blended grant types are funding with
     training attached and belong to the directory, not here. */
  function isCourse(rec) { return rec.type === 'Free Training'; }
  function isEvent(rec)  { return rec.type === 'Event'; }

  /* Values that mean "nobody has confirmed this". Real in the record, useless
     as a claim, so they never become a label or a filter option. */
  var UNCONFIRMED = ['Not stated', 'Not determined', 'N/A'];
  function told(v) { return !!v && UNCONFIRMED.indexOf(v) === -1; }

  /* ---- cost -------------------------------------------------------------
     The five classifications the page promises, mapped onto the Cost
     Structure options the base actually uses. Anything unmapped or blank
     falls to "not confirmed" -- never to "free". */
  var COST = {
    'Free':                     { label: 'Free',                      tone: 'gold',  group: 'free',
                                  say: 'Free to take, with no cost stated for completing it.' },
    'Free training, paid exam': { label: 'Free course, paid exam',    tone: 'rose',  group: 'freepaid',
                                  say: 'The training is free. The exam or certificate costs extra.' },
    'Limited free plan':        { label: 'Free tier',                 tone: 'teal',  group: 'tier',
                                  say: 'A free tier of a paid product. Heavier use may need a paid plan.' },
    'Free trial':               { label: 'Free trial',                tone: 'teal',  group: 'tier',
                                  say: 'Free for a trial period, then paid.' },
    'Mixed or varies':          { label: 'Some free, some paid',      tone: 'teal',  group: 'mixed',
                                  say: 'Some of what this provider offers is free and some is not.' },
    'Discounted':               { label: 'Discounted, not free',      tone: 'quiet', group: 'paid',
                                  say: 'Reduced price rather than free.' },
    'Paid':                     { label: 'Paid',                      tone: 'quiet', group: 'paid',
                                  say: 'This one costs money.' }
  };
  function costOf(rec) {
    return COST[rec.cost] || { label: 'Cost not confirmed', tone: 'quiet', group: 'unknown',
                               say: 'The provider has not stated the cost, so this is not described as free.' };
  }

  /* ---- skill level ------------------------------------------------------
     Beginner Friendly carries three answers, which is a real ladder. The base
     has no Intermediate/Advanced field beyond this, so these three are all the
     page offers. */
  var LEVEL = {
    'Yes':                          { label: 'Beginner friendly',   tone: 'gold', key: 'beginner' },
    'Some prior knowledge helpful': { label: 'Some prior knowledge', tone: 'teal', key: 'some' },
    'No, advanced':                 { label: 'Advanced',             tone: 'rose', key: 'advanced' }
  };

  /* ---- format ----------------------------------------------------------- */
  var FORMAT = {
    'Online self-paced':      { label: 'Self-paced',  tone: 'teal' },
    'Online live':            { label: 'Live online', tone: 'rose' },
    'In person':              { label: 'In person',   tone: 'rose' },
    'Hybrid':                 { label: 'Hybrid',      tone: 'teal' },
    'Downloadable resource':  { label: 'Downloadable', tone: 'teal' },
    'Software or online tool':{ label: 'Hands-on tool', tone: 'teal' }
  };

  /* ---- the finder -------------------------------------------------------
     Each path names the rule that selects for it, so the recommendation can
     explain itself in the reader's words rather than asserting a match. Rules
     read fields only; nothing is inferred from description text.

     `extra` is the honest fallback: when a path has very little of its own,
     the page says so and widens to beginner-friendly free courses instead of
     returning a thin list that looks like the whole answer. */
  var GOALS = [
    { id: 'new', label: "I'm completely new to AI",
      why: 'These are the courses the provider marks as suitable for someone with no AI experience.',
      test: function (r) { return r.beginnerFriendly === 'Yes'; } },

    { id: 'everyday', label: 'I want to use AI in everyday life',
      why: 'Courses written for a general learner rather than for a job role or a technical audience.',
      test: function (r) { return has(r.audienceStage, 'Lifelong learner') && r.beginnerFriendly !== 'No, advanced'; } },

    { id: 'work', label: 'I want to use AI at work',
      why: 'Courses about applying AI to everyday working tasks such as writing, admin, and routine office work.',
      test: function (r) { return hasAny(r.topics, ['Administrative work', 'Employment and career preparation']); } },

    { id: 'jobs', label: "I'm looking for job skills",
      why: 'Courses tied to employment and career preparation, or written for people changing careers.',
      test: function (r) { return has(r.topics, 'Employment and career preparation') || has(r.audienceStage, 'Career changer'); } },

    { id: 'student', label: "I'm a student",
      why: 'Courses whose stated audience includes students, from high school through graduate level.',
      test: function (r) { return hasAny(r.audienceStage, ['College student', 'K-12 student', 'Graduate or professional student']); } },

    { id: 'educator', label: "I'm an educator",
      why: 'Courses written for teachers and instructors, including classroom materials and lesson plans.',
      test: function (r) { return hasAny(r.audienceStage, ['K-12 educator', 'College educator', 'Community educator']); } },

    /* Only one course on file names older adults, so this path leans on the
       widening below rather than saying so twice in its own words. */
    { id: 'older', label: "I'm an older adult",
      why: 'Courses that name older adults as their audience.',
      test: function (r) { return has(r.ageGroup, 'Older adults'); } },

    { id: 'nonprofit', label: 'I work with a nonprofit or community organization',
      why: 'Courses whose stated audience is nonprofit staff or community leaders.',
      test: function (r) { return hasAny(r.audienceStage, ['Nonprofit staff', 'Community leader']) ||
                                  hasAny(r.whoCanParticipate, ['Nonprofit organization', 'Informal community group']); } },

    { id: 'safety', label: 'I want to understand AI safety and ethics',
      why: 'Courses filed under responsible AI and privacy, which is how this directory tags safety, ethics, and privacy together.',
      test: function (r) { return has(r.topics, 'Responsible AI and privacy'); } },

    { id: 'governance', label: 'I want to learn about AI governance',
      why: 'Courses on responsible AI that also offer policy guidance, templates, or legal and privacy help.',
      test: function (r) { return has(r.topics, 'Responsible AI and privacy') &&
                                  hasAny(r.support, ['AI policy templates', 'Legal or privacy guidance']); } },

    { id: 'build', label: 'I want to build AI tools or agents',
      why: 'Courses for a technical learner, covering coding and hands-on development.',
      test: function (r) { return has(r.audienceStage, 'Technical learner') || has(r.topics, 'Technology and coding'); } }
  ];

  /* The widening used when a path has fewer than this many of its own. */
  var THIN = 3;
  function fallback(r) { return r.beginnerFriendly === 'Yes' && costOf(r).group === 'free'; }

  /* ---- library filters --------------------------------------------------
     Only fields the data can actually answer. Course length, account
     requirement and certificate details have no field, so they are not here;
     Accessibility Features (7 of 276 answered) and Languages (Spanish on 3)
     are too thin to narrow anything and would read as broken. */
  var FACETS = [
    { key: 'audienceStage',  label: 'Who it is for',  empty: 'Anyone' },
    { key: '_level',         label: 'Experience needed', empty: 'Any level' },
    { key: '_format',        label: 'How it runs',    empty: 'Any format' },
    { key: '_cost',          label: 'Cost',           empty: 'Any cost' },
    { key: 'topics',         label: 'Topic',          empty: 'Any topic' }
  ];

  var ONLY = {
    beginner:  function (r) { return r.beginnerFriendly === 'Yes'; },
    selfpaced: function (r) { return has(r.deliveryFormat, 'Online self-paced'); },
    live:      function (r) { return hasAny(r.deliveryFormat, ['Online live', 'In person', 'Hybrid']); },
    allfree:   function (r) { return costOf(r).group === 'free'; },
    /* The one certificate signal the base carries. It records that a
       certificate or voucher is offered -- not its cost, name or standing. */
    certificate: function (r) { return has(r.support, 'Certification or exam voucher'); }
  };

  var SEARCH_FIELDS = [['title', 12], ['org', 10], ['description', 5], ['bestFit', 3],
                       ['topics', 3], ['audienceStage', 2], ['whoCanApply', 2], ['eligibility', 1]];

  /* ---- state ------------------------------------------------------------ */
  var ALL = [], COURSES = [], EVENTS = [], META = {};
  var state = { goal: null, q: '', filters: {}, only: {}, sort: 'relevance', shown: PAGE };

  var $ = function (id) { return document.getElementById(id); };

  /* ---- helpers ---------------------------------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function list(v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); }
  function clip(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function has(v, x) { return list(v).indexOf(x) !== -1; }
  function hasAny(v, xs) { var a = list(v); return xs.some(function (x) { return a.indexOf(x) !== -1; }); }

  /* Only http(s) links are rendered, so a bad value in the URL field can
     never become a javascript: or data: link. */
  function safeUrl(v) {
    if (!v) return null;
    try {
      var u = new URL(String(v).trim(), window.location.origin);
      return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
    } catch (e) { return null; }
  }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'Official page'; } }

  function prettyDate(iso) {
    if (!iso) return null;
    var p = String(iso).split('-');
    if (p.length !== 3) return iso;
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }
  /* Local calendar, so an event does not disappear a day early for anyone
     west of Greenwich. */
  function todayISO() {
    var d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  /* Derived values the filters need. Computed once at load so a facet can
     work on them exactly as it works on a real field. */
  function derive(rec) {
    rec._level  = LEVEL[rec.beginnerFriendly] ? LEVEL[rec.beginnerFriendly].label : null;
    rec._format = list(rec.deliveryFormat).filter(function (f) { return FORMAT[f]; })
                                          .map(function (f) { return FORMAT[f].label; });
    rec._cost   = costOf(rec).label;
    rec._hay = {};
    SEARCH_FIELDS.forEach(function (p) {
      var v = rec[p[0]];
      rec._hay[p[0]] = (Array.isArray(v) ? v.join(' ') : String(v == null ? '' : v)).toLowerCase();
    });
    return rec;
  }

  /* ---- scoring ---------------------------------------------------------- */
  function tokens(q) { return q.toLowerCase().split(/[^a-z0-9+#]+/).filter(function (t) { return t.length > 1; }); }
  function score(rec, toks) {
    if (!toks.length) return 1;
    var total = 0;
    for (var i = 0; i < toks.length; i++) {
      var best = 0;
      for (var f = 0; f < SEARCH_FIELDS.length; f++) {
        var hay = rec._hay[SEARCH_FIELDS[f][0]];
        if (hay && hay.indexOf(toks[i]) !== -1) best = Math.max(best, SEARCH_FIELDS[f][1]);
      }
      if (!best) return 0;
      total += best;
    }
    return total;
  }
  /* Highlight after escaping, but never inside an entity: without the split a
     search for "amp" would mark the middle of every &amp; and break it. */
  function highlight(text, toks) {
    var out = esc(text);
    if (!toks.length) return out;
    var pat = toks.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|');
    var mark = new RegExp('(' + pat + ')', 'gi');
    return out.split(/(&(?:[a-zA-Z]+|#\d+);)/).map(function (part, i) {
      return i % 2 ? part : part.replace(mark, '<mark>$1</mark>');
    }).join('');
  }

  /* ---- the card --------------------------------------------------------- */
  function tags(rec) {
    var out = [];
    var lvl = LEVEL[rec.beginnerFriendly];
    if (lvl) out.push([lvl.label, lvl.tone]);
    list(rec.deliveryFormat).forEach(function (f) {
      if (FORMAT[f]) out.push([FORMAT[f].label, FORMAT[f].tone]);
    });
    var c = costOf(rec);
    out.push([c.label, c.tone]);
    if (has(rec.languages, 'Spanish')) out.push(['Spanish available', 'teal']);
    if (has(rec.accessibility, 'Accessibility support available') ||
        has(rec.accessibility, 'Accessible for blind or low-vision users')) out.push(['Accessibility support', 'teal']);
    return out;
  }

  function fact(label, value) {
    if (!value || (Array.isArray(value) && !value.length)) return '';
    var text = Array.isArray(value) ? value.join(', ') : value;
    return '<div><dt>' + esc(label) + '</dt><dd>' + esc(text) + '</dd></div>';
  }

  function card(rec, toks) {
    var url = safeUrl(rec.url);
    var c = costOf(rec);

    var audience = list(rec.audienceStage).slice(0, 4).join(', ');
    var facts = fact('For', audience) +
                fact('Topics', list(rec.topics).slice(0, 3)) +
                fact('Cost', c.say);

    return '<article class="lrn-card">' +
      (rec.org ? '<p class="lrn-card-org">' + highlight(rec.org, toks) + '</p>' : '') +
      '<h3>' + highlight(rec.title, toks) + '</h3>' +
      '<ul class="lrn-tags">' + tags(rec).map(function (t) {
        return '<li class="lrn-tag' + (t[1] === 'gold' ? '' : ' ' + t[1]) + '">' + esc(t[0]) + '</li>';
      }).join('') + '</ul>' +
      (rec.description ? '<p class="lrn-card-desc">' + highlight(String(rec.description).slice(0, 260) +
         (String(rec.description).length > 260 ? '…' : ''), toks) + '</p>' : '') +
      (facts ? '<dl class="lrn-facts">' + facts + '</dl>' : '') +
      '<div class="lrn-card-foot">' +
        (url ? '<a class="lrn-visit" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
               'Open ' + esc(clip(rec.title, 44)) + ' at ' + esc(hostOf(url)) + ' &nearr;</a>' : '') +
        (rec.lastChecked ? '<p class="lrn-checked">Checked ' + esc(prettyDate(rec.lastChecked)) + '</p>' : '') +
      '</div>' +
    '</article>';
  }

  /* ---- the finder ------------------------------------------------------- */
  function renderGoals() {
    $('lrn-goals').insertAdjacentHTML('beforeend', GOALS.map(function (g) {
      return '<button type="button" class="lrn-goal" data-goal="' + esc(g.id) + '" aria-pressed="false">' +
             esc(g.label) + '</button>';
    }).join(''));
  }

  function runFinder() {
    var box = $('lrn-result');
    if (!state.goal) { box.hidden = true; return; }
    var goal = GOALS.filter(function (g) { return g.id === state.goal; })[0];
    if (!goal) { box.hidden = true; return; }

    var hits = COURSES.filter(goal.test);
    var widened = [];
    if (hits.length < THIN) {
      widened = COURSES.filter(function (r) { return fallback(r) && hits.indexOf(r) === -1; });
    }

    /* Beginner-friendly and free first: the recommendation should open with
       the lowest-barrier option, not with whatever sorted first. */
    var rank = function (r) {
      return (r.beginnerFriendly === 'Yes' ? 0 : 1) + (costOf(r).group === 'free' ? 0 : 2);
    };
    hits.sort(function (a, b) { return rank(a) - rank(b) || a.title.localeCompare(b.title); });
    widened.sort(function (a, b) { return rank(a) - rank(b) || a.title.localeCompare(b.title); });

    var shown = hits.slice(0, 6);
    var filling = widened.slice(0, Math.max(0, 3 - shown.length));

    box.hidden = false;
    $('lrn-result-heading').textContent = shown.length || filling.length
      ? goal.label
      : goal.label + ' — nothing on file yet';

    var why = goal.why;
    if (!hits.length) {
      why = 'No course on file states this audience. Rather than stretch the match, here are ' +
            'beginner-friendly courses that are free the whole way through.';
    } else if (filling.length) {
      why = goal.why + ' Only ' + hits.length + (hits.length === 1 ? ' course states' : ' courses state') +
            ' this, so beginner-friendly free courses follow it.';
    }
    $('lrn-result-why').textContent = why;

    /* The widened suggestions are marked, not blended in. The sentence above
       explains the widening, but someone scanning the cards should still be
       able to see where the real matches stop. */
    var html = shown.map(function (r) { return card(r, []); }).join('');
    if (filling.length) {
      html += '<p class="lrn-widen">' + (shown.length ? 'Broader suggestions' : 'Broader suggestions instead') + '</p>' +
              filling.map(function (r) { return card(r, []); }).join('');
    }

    $('lrn-result-list').innerHTML = (shown.length || filling.length) ? html
      : '<div class="lrn-empty"><h3>Nothing matches yet</h3><p>No free course on file fits this one. ' +
        'The full directory may still have something — it carries grants, tools and programs as well as courses.</p>' +
        '<a class="btn-ghost" href="/community-ai/">Browse the directory</a></div>';

    $('lrn-result-more').textContent = hits.length > shown.length
      ? 'Showing ' + shown.length + ' of ' + hits.length + '. The library below has the rest, with filters.'
      : '';

    $('lrn-result-heading').focus();
  }

  /* ---- library filtering ------------------------------------------------ */
  function optionsFor(key) {
    var seen = {};
    COURSES.forEach(function (r) {
      list(r[key]).forEach(function (v) { if (told(v)) seen[v] = (seen[v] || 0) + 1; });
    });
    return seen;
  }

  function matches(rec, skipKey) {
    for (var o in state.only) if (state.only[o] && ONLY[o] && !ONLY[o](rec)) return false;
    for (var k in state.filters) {
      if (k === skipKey) continue;
      var chosen = state.filters[k];
      if (!chosen || !chosen.length) continue;
      var have = list(rec[k]);
      if (!chosen.some(function (v) { return have.indexOf(v) !== -1; })) return false;
    }
    return true;
  }

  function compute() {
    var toks = tokens(state.q), rows = [];
    COURSES.forEach(function (r) {
      if (!matches(r, null)) return;
      var s = score(r, toks);
      if (!s) return;
      rows.push({ rec: r, score: s });
    });
    var by = state.sort;
    var lvlRank = { 'Yes': 0, 'Some prior knowledge helpful': 1, 'No, advanced': 2 };
    rows.sort(function (a, b) {
      if (by === 'title')   return a.rec.title.localeCompare(b.rec.title);
      if (by === 'org')     return (a.rec.org || '').localeCompare(b.rec.org || '') || a.rec.title.localeCompare(b.rec.title);
      if (by === 'checked') return String(b.rec.lastChecked || '').localeCompare(String(a.rec.lastChecked || ''));
      if (by === 'beginner') {
        var ar = lvlRank[a.rec.beginnerFriendly], br = lvlRank[b.rec.beginnerFriendly];
        return (ar === undefined ? 3 : ar) - (br === undefined ? 3 : br) || a.rec.title.localeCompare(b.rec.title);
      }
      return b.score - a.score || a.rec.title.localeCompare(b.rec.title);
    });
    return { rows: rows, toks: toks };
  }

  /* ---- filter boxes (the directory's control, reused) ------------------- */
  function buildFilters() {
    var host = $('lrn-fieldrow');
    host.innerHTML = FACETS.map(function (f) {
      var counts = optionsFor(f.key);
      var opts = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
      if (!opts.length) return '';
      var body = opts.map(function (v) {
        return '<label class="cf-multi-opt" data-find-text="' + esc(v.toLowerCase()) + '">' +
                 '<input type="checkbox" data-facet="' + esc(f.key) + '" value="' + esc(v) + '" />' +
                 '<span>' + esc(v) + '</span><em>' + counts[v] + '</em></label>';
      }).join('');
      var head = opts.length > 8
        ? '<div class="cf-multi-head"><input type="search" data-find="' + esc(f.key) + '" placeholder="Find&hellip;" ' +
          'aria-label="Find within ' + esc(f.label.toLowerCase()) + '" autocomplete="off" />' +
          '<button type="button" class="cf-multi-clear" data-clearfacet="' + esc(f.key) + '">Clear</button></div>'
        : '<div class="cf-multi-head cf-multi-head-bare"><button type="button" class="cf-multi-clear" ' +
          'data-clearfacet="' + esc(f.key) + '">Clear</button></div>';
      return '<div class="cf-field">' +
        '<span class="cf-field-label" id="lrn-lbl-' + esc(f.key) + '">' + esc(f.label) + '</span>' +
        '<div class="cf-multi" data-multi="' + esc(f.key) + '">' +
          '<button type="button" class="cf-multi-toggle" data-toggle="' + esc(f.key) + '" aria-expanded="false" ' +
            'aria-haspopup="true" aria-controls="lrn-panel-' + esc(f.key) + '" ' +
            'aria-labelledby="lrn-lbl-' + esc(f.key) + ' lrn-val-' + esc(f.key) + '">' +
            '<span id="lrn-val-' + esc(f.key) + '" data-value="' + esc(f.key) + '">' + esc(f.empty) + '</span>' +
          '</button>' +
          '<div class="cf-multi-panel" id="lrn-panel-' + esc(f.key) + '" role="group" ' +
            'aria-label="Filter by ' + esc(f.label.toLowerCase()) + '" hidden>' + head +
            '<div class="cf-multi-list">' + body + '</div></div>' +
        '</div></div>';
    }).join('');
  }

  function syncFilters() {
    var toks = tokens(state.q);
    FACETS.forEach(function (f) {
      var box = $('lrn-fieldrow').querySelector('[data-multi="' + f.key + '"]');
      if (!box) return;
      var chosen = state.filters[f.key] || [];
      var label = box.querySelector('[data-value]'), toggle = box.querySelector('[data-toggle]');
      label.textContent = chosen.length === 0 ? f.empty
                        : (chosen.length === 1 ? chosen[0] : chosen.length + ' selected');
      toggle.classList.toggle('has-selection', chosen.length > 0);

      var counts = {};
      COURSES.forEach(function (r) {
        if (!matches(r, f.key) || !score(r, toks)) return;
        list(r[f.key]).forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
      });
      Array.prototype.forEach.call(box.querySelectorAll('input[data-facet]'), function (input) {
        var on = chosen.indexOf(input.value) !== -1, n = counts[input.value] || 0;
        input.checked = on;
        input.disabled = n === 0 && !on;
        input.parentNode.classList.toggle('is-empty', n === 0 && !on);
        var em = input.parentNode.querySelector('em');
        if (em) em.textContent = n;
      });
    });
  }

  function syncOnly() {
    var live = 0;
    Array.prototype.forEach.call(document.querySelectorAll('.cf-only input[data-only]'), function (box) {
      var key = box.getAttribute('data-only');
      var n = COURSES.filter(ONLY[key]).length;
      var span = box.parentNode.querySelector('span');
      if (!span.dataset.base) span.dataset.base = span.textContent;
      if (!n) { box.parentNode.hidden = true; box.checked = false; delete state.only[key]; }
      else { box.parentNode.hidden = false; span.textContent = span.dataset.base + ' (' + n + ')';
             box.checked = !!state.only[key]; live++; }
    });
    var row = document.querySelector('.lrn-onlys');
    if (row) row.hidden = live === 0;
  }

  function renderChips() {
    var chips = [];
    if (state.q) chips.push('<span class="cf-chip">Search: &ldquo;' + esc(state.q) +
      '&rdquo;<button type="button" data-clear="q" aria-label="Clear search">&times;</button></span>');
    FACETS.forEach(function (f) {
      (state.filters[f.key] || []).forEach(function (v) {
        chips.push('<span class="cf-chip">' + esc(v) + '<button type="button" data-off="' + esc(f.key) +
          '" data-val="' + esc(v) + '" aria-label="Remove filter ' + esc(v) + '">&times;</button></span>');
      });
    });
    $('lrn-chips').innerHTML = chips.join('');
  }

  function renderList(keepShown) {
    var res = compute(), rows = res.rows, toks = res.toks;
    var more = $('lrn-showmore');

    $('lrn-count').innerHTML = rows.length === COURSES.length
      ? 'Showing all <strong>' + COURSES.length + '</strong> free courses'
      : 'Showing <strong>' + rows.length + '</strong> of ' + COURSES.length + ' free courses';

    if (!rows.length) {
      $('lrn-list').innerHTML = '<div class="lrn-empty"><h3>No course matches that yet</h3>' +
        '<p>Nothing on file fits every filter at once — which does not mean nothing exists. ' +
        'Try removing one, or search a plainer word.</p>' +
        '<button type="button" class="btn-primary" data-clear="all">Reset the filters</button></div>';
      more.hidden = true;
      return;
    }
    if (!keepShown) state.shown = PAGE;
    var page = rows.slice(0, state.shown), left = rows.length - page.length;
    more.hidden = left <= 0;
    more.textContent = 'Show ' + Math.min(left, PAGE) + ' more of ' + left;
    $('lrn-list').innerHTML = page.map(function (r) { return card(r.rec, toks); }).join('');
  }

  function renderAll(keepShown) {
    syncOnly(); syncFilters(); renderChips(); renderList(keepShown);
    $('lrn-clearq').hidden = !state.q;
  }

  /* ---- events -----------------------------------------------------------
     The base has no event-date field. These entries carry a date in
     Application Deadline, with no start time, end time or timezone anywhere,
     so the card shows the date and says plainly where it came from. Anything
     already past is left out rather than advertised as upcoming. */
  function eventCard(rec) {
    var url = safeUrl(rec.url), c = costOf(rec);
    return '<article class="lrn-card">' +
      '<p class="lrn-date">' + esc(prettyDate(rec.deadline)) + '</p>' +
      (rec.org ? '<p class="lrn-card-org">' + esc(rec.org) + '</p>' : '') +
      '<h3>' + esc(rec.title) + '</h3>' +
      '<ul class="lrn-tags">' + tags(rec).map(function (t) {
        return '<li class="lrn-tag' + (t[1] === 'gold' ? '' : ' ' + t[1]) + '">' + esc(t[0]) + '</li>';
      }).join('') + '</ul>' +
      (rec.description ? '<p class="lrn-card-desc">' + esc(clip(rec.description, 200)) + '</p>' : '') +
      '<dl class="lrn-facts">' + fact('For', list(rec.audienceStage).slice(0, 3).join(', ')) +
        fact('Format', list(rec.deliveryFormat).filter(told)) + fact('Cost', c.say) + '</dl>' +
      '<div class="lrn-card-foot">' +
        (url ? '<a class="lrn-visit" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
               'Register at ' + esc(hostOf(url)) + ' &nearr;</a>' : '') +
      '</div></article>';
  }

  function renderEvents() {
    var today = todayISO();
    var upcoming = EVENTS.filter(function (r) { return r.deadline && r.deadline >= today; })
                         .sort(function (a, b) { return a.deadline.localeCompare(b.deadline); });
    var undated = EVENTS.filter(function (r) { return !r.deadline; }).length;

    if (!upcoming.length) { $('lrn-events').hidden = true; return; }
    $('lrn-events').hidden = false;

    /* The heading above this grid says these sessions are free, so only the
       ones whose cost is confirmed free go in it. The rest are dated and worth
       knowing about, but they go below under their own heading: a cost nobody
       has stated is not a free one. */
    var free  = upcoming.filter(function (r) { return costOf(r).group === 'free'; });
    var other = upcoming.filter(function (r) { return costOf(r).group !== 'free'; });

    $('lrn-events-list').innerHTML = free.length
      ? free.map(eventCard).join('')
      : '<div class="lrn-empty"><h3>No confirmed-free session is scheduled right now</h3>' +
        '<p>Nothing upcoming has its cost confirmed as free. Dated sessions whose cost is not ' +
        'stated are listed below, and the library above is open any time.</p></div>';

    $('lrn-events-other').hidden = other.length === 0;
    if (other.length) $('lrn-events-other-list').innerHTML = other.map(eventCard).join('');

    $('lrn-events-note').textContent =
      'Dates come from each programme’s listed deadline, which is the only date this directory ' +
      'records — there is no start time or timezone on file, so check the official page before ' +
      'planning around one. Sessions whose date has passed are not shown' +
      (undated ? ', and ' + undated + (undated === 1 ? ' entry carries' : ' entries carry') +
                 ' no date at all, so ' + (undated === 1 ? 'it is' : 'they are') +
                 ' left out rather than given a date ' + (undated === 1 ? 'it does' : 'they do') +
                 ' not have.' : '.');
  }

  /* ---- certificates -----------------------------------------------------
     Support Available = "Certification or exam voucher" is the only
     certificate fact on file. It says something is offered. It does not say
     what the certificate is called, what it is worth, or -- except where Cost
     Structure says "Free training, paid exam" -- whether claiming it costs
     anything, so the note says exactly that rather than letting the section
     imply a free credential. */
  function renderCerts() {
    var certs = COURSES.filter(ONLY.certificate);
    if (!certs.length) { $('lrn-certs').hidden = true; return; }
    $('lrn-certs').hidden = false;

    var rank = function (r) { return costOf(r).group === 'free' ? 0 : 1; };
    certs.sort(function (a, b) { return rank(a) - rank(b) || a.title.localeCompare(b.title); });
    $('lrn-certs-list').innerHTML = certs.map(function (r) { return card(r, []); }).join('');

    var paidExam = certs.filter(function (r) { return costOf(r).group === 'freepaid'; }).length;
    $('lrn-certs-note').textContent =
      'This directory records only that a certificate, badge, or exam voucher is offered. It does not ' +
      'record what the certificate is called, what it is worth, or whether claiming it costs anything' +
      (paidExam ? ' — except where the provider has said the exam is paid, which ' + paidExam +
                  ' of these ' + (paidExam === 1 ? 'states' : 'state') + ' and ' +
                  (paidExam === 1 ? 'its card says' : 'their cards say') + '.' : '.') +
      ' Open the official page before counting on a credential.';
  }

  /* ---- wiring ----------------------------------------------------------- */
  function wire() {
    /* finder */
    $('lrn-goals').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-goal]');
      if (!btn) return;
      var id = btn.getAttribute('data-goal');
      state.goal = (state.goal === id) ? null : id;
      Array.prototype.forEach.call(this.querySelectorAll('[data-goal]'), function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-goal') === state.goal));
      });
      runFinder();
    });
    $('lrn-goal-reset').addEventListener('click', function () {
      state.goal = null;
      Array.prototype.forEach.call($('lrn-goals').querySelectorAll('[data-goal]'), function (b) {
        b.setAttribute('aria-pressed', 'false');
      });
      $('lrn-result').hidden = true;
      $('lrn-goals').querySelector('[data-goal]').focus();
    });

    /* search + sort */
    var q = $('lrn-q'), timer;
    q.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = q.value.trim(); renderAll(); }, 140);
    });
    $('lrn-clearq').addEventListener('click', function () { q.value = ''; state.q = ''; renderAll(); q.focus(); });
    $('lrn-sort').addEventListener('change', function () { state.sort = this.value; renderList(); });

    /* filter boxes */
    var row = $('lrn-fieldrow');
    row.addEventListener('click', function (e) {
      var toggle = e.target.closest('[data-toggle]');
      if (toggle) {
        var key = toggle.getAttribute('data-toggle');
        var panel = $('lrn-panel-' + key);
        openPanel(panel.hidden ? key : null);
        return;
      }
      var clear = e.target.closest('[data-clearfacet]');
      if (clear) { delete state.filters[clear.getAttribute('data-clearfacet')]; renderAll(); }
    });
    row.addEventListener('change', function (e) {
      var box = e.target.closest('input[data-facet]');
      if (!box) return;
      var key = box.getAttribute('data-facet');
      var cur = state.filters[key] || [], at = cur.indexOf(box.value);
      cur = at === -1 ? cur.concat([box.value]) : cur.slice(0, at).concat(cur.slice(at + 1));
      if (cur.length) state.filters[key] = cur; else delete state.filters[key];
      renderAll();
    });
    row.addEventListener('input', function (e) {
      var find = e.target.closest('input[data-find]');
      if (!find) return;
      var needle = find.value.trim().toLowerCase();
      var opts = find.closest('.cf-multi-panel').querySelector('.cf-multi-list');
      Array.prototype.forEach.call(opts.children, function (opt) {
        opt.hidden = needle !== '' && opt.getAttribute('data-find-text').indexOf(needle) === -1;
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('#lrn-fieldrow')) openPanel(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = row.querySelector('.cf-multi-panel:not([hidden])');
      if (!open) return;
      var toggle = open.parentNode.querySelector('[data-toggle]');
      openPanel(null);
      if (toggle) toggle.focus();
    });

    /* only-show switches */
    Array.prototype.forEach.call(document.querySelectorAll('.cf-only input[data-only]'), function (box) {
      box.addEventListener('change', function () {
        state.only[this.getAttribute('data-only')] = this.checked;
        renderAll();
      });
    });

    /* chips, reset, paging */
    $('lrn-chips').addEventListener('click', function (e) {
      var off = e.target.closest('[data-off]');
      if (off) {
        var key = off.getAttribute('data-off'), val = off.getAttribute('data-val');
        var cur = (state.filters[key] || []).filter(function (v) { return v !== val; });
        if (cur.length) state.filters[key] = cur; else delete state.filters[key];
        renderAll(); return;
      }
      if (e.target.closest('[data-clear="q"]')) { state.q = ''; $('lrn-q').value = ''; renderAll(); }
    });
    $('lrn-list').addEventListener('click', function (e) {
      if (e.target.closest('[data-clear="all"]')) resetAll();
    });
    $('lrn-reset').addEventListener('click', resetAll);
    $('lrn-showmore').addEventListener('click', function () {
      var first = state.shown;
      state.shown += PAGE;
      renderList(true);
      var cards = $('lrn-list').querySelectorAll('.lrn-card');
      if (cards[first]) cards[first].scrollIntoView({ block: 'center' });
    });
  }

  function openPanel(key) {
    Array.prototype.forEach.call($('lrn-fieldrow').querySelectorAll('[data-multi]'), function (box) {
      var mine = box.getAttribute('data-multi') === key;
      box.querySelector('.cf-multi-panel').hidden = !mine;
      box.querySelector('[data-toggle]').setAttribute('aria-expanded', String(mine));
      if (mine) {
        var find = box.querySelector('input[data-find]');
        if (find) find.focus();
      }
    });
  }

  function resetAll() {
    state.q = ''; state.filters = {}; state.only = {};
    $('lrn-q').value = '';
    openPanel(null);
    renderAll();
  }

  /* ---- boot ------------------------------------------------------------- */
  function boot(payload) {
    META = payload.meta || {};
    ALL = (payload.opportunities || []).map(derive);
    COURSES = ALL.filter(isCourse);
    EVENTS = ALL.filter(isEvent);

    var orgs = {};
    COURSES.forEach(function (r) { if (r.org) orgs[r.org] = true; });
    $('lrn-stat-courses').textContent = COURSES.length;
    $('lrn-stat-beginner').textContent = COURSES.filter(ONLY.beginner).length;
    $('lrn-stat-orgs').textContent = Object.keys(orgs).length;
    $('lrn-updated').textContent = META.generated
      ? 'Last refreshed ' + prettyDate(META.generated) + '.' : '';

    renderGoals();
    buildFilters();
    wire();
    renderAll();
    renderCerts();
    renderEvents();
  }

  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(boot)
    .catch(function (err) {
      $('lrn-list').innerHTML = '<div class="lrn-empty"><h3>The course list could not load</h3>' +
        '<p>Please refresh the page, or try again in a few minutes.</p>' +
        '<a class="btn-ghost" href="/community-ai/">Browse the directory instead</a></div>';
      $('lrn-count').textContent = '';
      if (window.console) console.error('Free AI Learning:', err);
    });
})();
