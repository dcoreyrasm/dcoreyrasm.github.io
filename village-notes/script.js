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

  // Used to build the empty-state link, which appends a prefill for whatever
  // the visitor was searching for. The section button carries this URL in the
  // markup instead of relying on script -- keep the two in step.
  var FORM_URL = 'https://airtable.com/appxUByKs5ULrDZQp/pagofYquo4QHUjcQG/form';

  var state = { all: [], search: '', terms: [], track: '', categories: [], towns: [],
               counties: [], flags: {}, sort: 'name', shown: 0 };

  // Cards are built as HTML strings; 524 of them at once is the slowest thing
  // the page does. Rendering a screenful and extending on demand keeps the
  // first paint quick without hiding anything -- the count above always
  // reports the full match, and Show more walks the rest.
  var PAGE = 60;

  var el = {
    search:     document.getElementById('vn-search'),
    track:      document.getElementById('vn-track'),
    catToggle:  document.getElementById('vn-cat-toggle'),
    catPanel:   document.getElementById('vn-cat-panel'),
    catLabel:   document.getElementById('vn-cat-label'),
    catList:    document.getElementById('vn-cat-list'),
    catFind:    document.getElementById('vn-cat-find'),
    catClear:   document.getElementById('vn-cat-clear'),
    // Scoped to inputs carrying a flag. The county row reuses the same
    // .vn-toggle markup for its styling and keyboard behaviour, and those
    // boxes are not quick filters -- without [data-flag] they would be
    // counted, hidden and cleared as if they were.
    toggles:    document.querySelectorAll('.vn-toggle input[data-flag]'),
    townToggle: document.getElementById('vn-town-toggle'),
    townPanel:  document.getElementById('vn-town-panel'),
    townLabel:  document.getElementById('vn-town-label'),
    townList:   document.getElementById('vn-town-list'),
    townFind:   document.getElementById('vn-town-find'),
    townClear:  document.getElementById('vn-town-clear'),
    reset:      document.getElementById('vn-reset'),
    featured:   document.getElementById('vn-featured'),
    doorway:    document.getElementById('vn-doorway'),
    doorwayNum: document.getElementById('vn-doorway-detail'),
    doorwayBtn: document.getElementById('vn-doorway-btn'),
    foodFallback: document.getElementById('vn-food-fallback'),
    shopFallback: document.getElementById('vn-shop-fallback'),
    shopReset:  document.getElementById('vn-shop-reset'),
    countyList: document.getElementById('vn-county-list'),
    results:    document.getElementById('vn-results'),
    empty:      document.getElementById('vn-empty'),
    emptyBody:  document.getElementById('vn-empty-body'),
    resultline: document.getElementById('vn-resultline'),
    emptyCta:   document.getElementById('vn-empty-cta'),
    emptyAsk:   document.getElementById('vn-empty-ask'),
    emptyAdd:   document.getElementById('vn-empty-add'),
    sort:       document.getElementById('vn-sort'),
    showMore:   document.getElementById('vn-showmore'),
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

  // labelFor is optional: it only changes what the option reads as, never the
  // value, so filtering, the Airtable prefill and the share URL keep working
  // off the real track name. Defaults to showing the value as-is.
  function fillSelect(select, values, allLabel, labelFor) {
    var current = select.value;
    select.innerHTML = '';
    var first = document.createElement('option');
    first.value = '';
    first.textContent = allLabel;
    select.appendChild(first);
    values.forEach(function (v) {
      var opt = document.createElement('option');
      opt.value = v;
      opt.textContent = labelFor ? labelFor(v) : v;
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

  // An announced, dated event -- an open house, tour, information session,
  // webinar, registration night. Returns the date if it has not happened yet,
  // otherwise null, and null is the whole point: this is the only thing on a
  // listing that goes wrong by sitting still. Hours and cost are still roughly
  // true next month; last March's open house is a lie the moment it passes.
  //
  // Checked against the visitor's clock rather than the sync's. The JSON is
  // rebuilt every six hours, but the card must stop advertising yesterday's
  // event even if no sync has run since, and a page left open overnight must
  // not still be advertising it in the morning.
  //
  // Both fields are required. Text with no date would never expire, which is
  // exactly the failure this guards against, so it is held back and the sync
  // names it on the run rather than the page showing something undismissable.
  function liveEvent(r) {
    if (!has(r.event) || !has(r.eventDate)) return null;
    var raw = String(r.eventDate);
    var when = new Date(raw + (/^\d{4}-\d{2}-\d{2}$/.test(raw) ? 'T00:00:00' : ''));
    if (isNaN(when.getTime())) return null;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return when < today ? null : when;
  }

  function plural(n, one, many) { return n === 1 ? one : many; }

  /* ---------- what-you-need groups ---------- */

  // The Category field carries 58 options and does two jobs at once: the kind
  // of need, and the specific flavour. A single flat list makes a parent guess
  // whether a robotics week is filed under STEM, Specialty or Summer Day, and
  // filtering on the wrong guess hides it. So the filter works on the group and
  // the specific category stays visible on the card and inside search.
  // scripts/check-vocabulary.js reads this literal to tell a new Airtable
  // category from a coined duplicate, so it is parsed as well as run.
  // Renaming the variable or reindenting its closing bracket breaks that
  // check -- loudly, by design, rather than by reporting every category
  // as unmapped.
  // The audiences this directory serves. Declared rather than read off
  // the data, because a track with no listings yet still has to be offerable:
  // somebody looking for pet care needs to find the section and be asked to
  // add the first one, not conclude the site has nothing to do with pets.
  // Selecting an empty track lands on the contribution prompt, which is the
  // most useful thing an empty section can do.
  //
  // Food & Basic Needs is the one track that is deliberately listed here while
  // holding nothing: its 55 researched listings are Pending Review in Airtable
  // and the sync does not carry unpublished records. The section therefore
  // offers itself, finds nothing, and says where else to look -- which is the
  // honest answer until those listings clear review.
  //
  // scripts/check-vocabulary.js reads this literal, so it is the one place the
  // expected tracks are written down. A track in the data but not here still
  // appears in the dropdown -- and fails the sync check, which is how a fifth
  // one gets noticed rather than quietly filtering to nothing.
  var TRACKS = ['Family & Childcare', 'Elder Care', 'Pet Care & Resources',
                'Teens & High School', 'Food & Basic Needs'];

  var FOOD_TRACK = 'Food & Basic Needs';

  // The dropdown asks "Who you're caring for", so the options have to answer
  // that question rather than name the track. Display only -- the values, the
  // data and the Airtable field are untouched, and a track missing from here
  // falls back to its own name instead of vanishing.
  //
  // Food has no label here on purpose. Every other track answers "who", and
  // food assistance does not: it is the one section where the person asking is
  // usually the person who needs it, and "Yourself or your household" reads as
  // a means test rather than a filter. Its own name is the kinder answer.
  var TRACK_LABELS = {
    'Family & Childcare':   'Kids & family',
    'Elder Care':           'Older adults',
    'Pet Care & Resources': 'Pets'
  };
  function trackLabel(v) { return TRACK_LABELS[v] || v; }

  var GROUPS = [
    ['Child Care', ['Center-Based Daycare','Home Daycare (Licensed)','Infant Care',
      'Preschool / Pre-K','Before/After School Care','Backup/Emergency Care',
      'Nanny / Au Pair','Nanny Share','Babysitting Co-op']],
    ['Camps & School Breaks', ['Summer Day Camp','Summer Sleepaway Camp','Sports Camp',
      'STEM/Tech Camp','Arts Camp','Nature / Outdoor Camp','Academic/Enrichment Camp',
      'Faith-Based Camp','Municipal/Parks & Rec Camp','Language Immersion Camp',
      'Specialty Camp','Inclusive/Special Needs Camp','School Vacation Week Care',
      // These two were coined the same way as the aliases below, but each names
      // a kind of camp the original list cannot say -- a working farm is not a
      // nature preserve -- so both were kept as real options.
      'Medical / Diagnosis-Specific Camp','Nature / Farm Camp',
      // The two below are second spellings of options already above, coined by
      // a writer that invented options instead of picking them. Their records
      // have been moved onto the canonical names and the options removed from
      // Airtable -- but the map keeps the aliases, because a name coined once
      // can be coined again, and an unmapped category drops into "Other" where
      // it tells a parent nothing.
      'Special Needs / Inclusive Camp','Outdoor/Nature Camp']],
    ['Activities & Enrichment', ['Afterschool Enrichment','Tutoring / Academic Support',
      'Literacy / Reading Program','Youth Development Program','Teen Program',
      'Teen/CIT Program','Counselor-in-Training Program','Youth Employment Program']],
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
    ['Benefits, Legal & Money', ['Elder Law / Financial Planning','Veterans Benefits Counseling']],

    // Pet Care & Resources. Grouped the way an owner's problem arrives: who
    // looks after them day to day, who treats them when something is wrong,
    // and who helps when the household cannot cope on its own.
    ['Pet Day-to-Day Care', ['Dog Daycare','Pet Boarding','Pet Sitting (In-Home)',
      'Dog Walking','Dog Park','Pet Grooming','Training & Behavior Support',
      'Pet Transportation']],
    ['Pet Health & Emergencies', ['Veterinary Care','Emergency Veterinary Care',
      'Low-Cost Veterinary Clinic','Mobile Veterinary Service',
      'Vaccination & Microchip Clinic','Spay/Neuter Assistance']],
    ['Pet Help & Rehoming', ['Pet Food Assistance','Emergency Pet Foster Care',
      'Pet-Friendly Housing','Adoption & Rescue','Lost & Found Pet Services',
      'Pet Loss & Grief Support']],

    // Teens & High School, split the way the family's question splits:
    // which school, and then what comes after it.
    ['Schools & Specialties', ['High School (Public)','High School (Private)',
      'Magnet / Specialty School']],
    ['Careers & College Paths', ['Apprenticeship','Job Training Program',
      'College Access / Readiness']],

    // Cross-track, and deliberately small. Disability and accessibility support
    // is not a track: nearly every organisation offering it also serves seniors
    // or families, and moving those records would break the home they already
    // have. The accessibility filter finds them where they are. This category
    // is only for the rare organisation whose sole purpose is disability
    // support and which fits nowhere else -- an independent living centre, a
    // disability-rights legal aid office. No existing record was moved into it.
    ['Disability & Accessibility', ['Disability & Accessibility Services']],

    // Food & Basic Needs. One group rather than several, because six options
    // is already a scannable list and splitting them would invent distinctions
    // the records do not make.
    //
    // Pet Food Assistance is NOT here, and must not be. It lives under Pet Help
    // & Rehoming and it answers a different question -- it keeps an animal fed
    // so a household does not have to surrender it. Folding the two together
    // would put pet food in front of a parent looking for a food pantry, and a
    // food pantry in front of someone looking for help feeding a dog. Both are
    // wrong, and the second is worse.
    ['Food Assistance', ['Food Bank / Food Pantry','Mobile Food Distribution',
      'Community Meals / Soup Kitchen','Senior Food Assistance',
      'School / Family Food Support','Emergency / Seasonal Food Assistance']],

    // Affordable family shopping, inside Family & Childcare. Two groups rather
    // than one, because the two halves answer different questions and a family
    // is only ever asking one of them. A shop is somewhere you can go on
    // Saturday; a sale is a date you have to catch. Mixing them would put a
    // consignment weekend that has not been announced yet next to a store that
    // is open now, and a parent needing school clothes this week cannot use
    // the second kind at all.
    ['Thrift, Consignment & Affordable Shopping',
      ["Children's Resale / Consignment",'Family Thrift Store',
       'Clothing & Household Resale','Maternity & Baby Gear Resale',
       'Free Clothing Closets']],

    // The dated half. These expire, which is why they are kept apart: the
    // card's event row already hides an event once its date passes, and a
    // group that is mostly empty between seasons is honest in a way a merged
    // list would not be.
    ['Seasonal Consignment Sales & Clothing Exchanges',
      ["Seasonal Children's Consignment Sales",'Clothing Swaps & Exchanges',
       'School Uniform Exchanges']]
  ];

  // The two groups above, named once so the card and the filters agree on what
  // counts as affordable shopping.
  var SHOPPING_GROUP   = 'Thrift, Consignment & Affordable Shopping';
  var SHOPPING_SEASONAL = 'Seasonal Consignment Sales & Clothing Exchanges';

  var GROUP_OF = (function () {
    var map = {};
    GROUPS.forEach(function (g) { g[1].forEach(function (c) { map[c] = g[0]; }); });
    return map;
  })();

  function groupOf(r) { return GROUP_OF[r.category] || 'Other'; }

  // Category is a single select, so it can only say what a place is mainly
  // for. A centre filed as Center-Based Daycare that also runs a preschool and
  // after-school care was invisible to a parent filtering for either -- which
  // is the whole reason Services Offered exists on the record. So a service
  // counts towards its equivalent category when filtering.
  //
  // Only exact equivalents are listed. "Arts Enrichment" is deliberately not
  // mapped to "Arts Camp": a day camp that runs an art hour is not an arts
  // camp, and ticking Arts Camp to be shown every generic day camp in the
  // state is worse than not finding the arts camp at all. Same reasoning
  // keeps "Child Care" out -- it is broader than any one category.
  var SERVICE_AS_CATEGORY = {
    'Infant Care':                   ['Infant Care'],
    'Preschool / Pre-K':             ['Preschool / Pre-K'],
    'Before-School Care':            ['Before/After School Care'],
    'After-School Care':             ['Before/After School Care'],
    'Before- and After-School Care': ['Before/After School Care'],
    'School Vacation Care':          ['School Vacation Week Care'],
    'Summer Day Camp':               ['Summer Day Camp'],
    'Summer Sleepaway Camp':         ['Summer Sleepaway Camp'],
    'Specialty Camp':                ['Specialty Camp'],
    'Teen / CIT Program':            ['Teen/CIT Program'],
    'Teen Program':                  ['Teen Program'],
    'Youth Employment':              ['Youth Employment Program'],
    'Afterschool Enrichment':        ['Afterschool Enrichment'],
    'Literacy / Tutoring':           ['Tutoring / Academic Support', 'Literacy / Reading Program'],
    'Adaptive Program':              ['Inclusive/Special Needs Camp'],
    'Parent / Family Support':       ['Parenting Support/Classes'],
    'Caregiver Support':             ['Caregiver Support Group'],
    // Services Offered already carried this exact name before the teen
    // track existed, which is why the category reuses it verbatim rather
    // than inventing "College Prep" as a third spelling.
    'College Access / Readiness':    ['College Access / Readiness'],

    // Elder Care. Services Offered carries these names and the Category field
    // carries the same ideas under slightly different spellings, so without
    // this a card announces what it just said: nine listings currently read
    // "Skilled Nursing / Rehab" at the top and "Also offers: Skilled Nursing"
    // below. Mapping them removes the echo and, where the service is NOT the
    // listing's own category, widens the filter correctly -- an assisted
    // living residence that also runs an adult day programme now answers to
    // both. Home Modification is deliberately absent: there is no category of
    // that name, so it is a service only, like Transportation.
    'Adult Day Program':             ['Adult Day Program'],
    'Assisted Living':               ['Assisted Living'],
    'Skilled Nursing':               ['Skilled Nursing / Rehab'],
    'Hospice':                       ['Hospice / Palliative Care'],
    'Durable Medical Equipment Loan':['Durable Medical Equipment Loan'],
    'Veterans Benefits Counseling':  ['Veterans Benefits Counseling'],
    'Meal Delivery':                 ['Meal Delivery'],
    'Senior Center':                 ['Senior Center / Congregate Meals & Social Programs'],
    'Companion Services':            ['Companion Services'],

    // Every pet category is also a service, because pet providers stack
    // services more than childcare ones do: one kennel boards, grooms and
    // trains; one humane society rehomes, fosters, reunites strays and runs
    // the vaccine clinic. Filed under one of those each would be invisible
    // to somebody searching for any of the others.
    'Dog Daycare':                   ['Dog Daycare'],
    'Pet Boarding':                  ['Pet Boarding'],
    'Pet Sitting (In-Home)':         ['Pet Sitting (In-Home)'],
    'Dog Walking':                   ['Dog Walking'],
    'Dog Park':                      ['Dog Park'],
    'Pet Grooming':                  ['Pet Grooming'],
    'Training & Behavior Support':   ['Training & Behavior Support'],
    'Pet Transportation':            ['Pet Transportation'],
    'Veterinary Care':               ['Veterinary Care'],
    'Emergency Veterinary Care':     ['Emergency Veterinary Care'],
    'Low-Cost Veterinary Clinic':    ['Low-Cost Veterinary Clinic'],
    'Mobile Veterinary Service':     ['Mobile Veterinary Service'],
    'Vaccination & Microchip Clinic':['Vaccination & Microchip Clinic'],
    'Spay/Neuter Assistance':        ['Spay/Neuter Assistance'],
    'Pet Food Assistance':           ['Pet Food Assistance'],
    'Emergency Pet Foster Care':     ['Emergency Pet Foster Care'],
    'Pet-Friendly Housing':          ['Pet-Friendly Housing'],
    'Adoption & Rescue':             ['Adoption & Rescue'],
    'Lost & Found Pet Services':     ['Lost & Found Pet Services'],
    'Pet Loss & Grief Support':      ['Pet Loss & Grief Support']
  };

  // Every category a listing can honestly answer to: its own, plus any its
  // other services amount to. Computed once at load and cached on the record,
  // because filtering runs it across 500+ listings on every keystroke.
  function categoriesOf(r) {
    var out = r.category ? [r.category] : [];
    (r.servicesOffered || []).forEach(function (service) {
      (SERVICE_AS_CATEGORY[service] || []).forEach(function (c) {
        if (out.indexOf(c) === -1) out.push(c);
      });
    });
    return out;
  }

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
    fullDay:     function (r) { return r.schoolDayCoverage === 'Full Workday'; },

    // Disability and accessibility support, across all five tracks at once.
    // Three ways a listing can qualify, because the base records this in three
    // places and a family does not care which one was filled in: the service
    // is tagged, the kind of support is named, or the provider has written
    // down what it can accommodate.
    disability:  function (r) {
      var services = r.servicesOffered || [];
      return services.indexOf('Disability Support') !== -1 ||
             services.indexOf('Special-Needs Pet Care') !== -1 ||
             (r.specializedSupport || []).length > 0 ||
             has(r.accessibility);
    },

    // A dated event that has not happened yet. liveEvent() is the same
    // function the card uses, so the filter and the card can never disagree
    // about whether something is upcoming -- an expired sale is excluded here
    // for exactly the reason it is hidden there. Like every toggle, this one
    // hides itself when nothing in the current section qualifies, which is
    // what keeps it honest between consignment seasons.
    upcomingEvent: function (r) { return liveEvent(r) !== null; }
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

    // Above the badges, because it is the one row with a deadline on it.
    // The year is shown only when it is not this one -- "Mar 14" reads as a
    // date a family can act on; "Mar 14, 2027" reads as an archive entry.
    var eventRow = '';
    var eventOn = liveEvent(r);
    if (eventOn) {
      var opts = { month: 'short', day: 'numeric' };
      if (eventOn.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
      eventRow = '<p class="vn-event">' +
                   '<span class="vn-visually-hidden">Upcoming event: </span>' +
                   '<span class="vn-event-when">' +
                     esc(eventOn.toLocaleDateString('en-US', opts)) +
                   '</span>' +
                   '<span class="vn-event-what">' + esc(r.event) + '</span>' +
                 '</p>';
    }

    // The track is shown as a coloured pill (see the accent pops in
    // village-notes.css). The slug only picks the pill colour; the words
    // still carry the meaning, so colour is never the only signal.
    var trackSlug = String(r.track || 'resource').toLowerCase().split(/[^a-z]+/)[0] || 'resource';
    var head = '<p class="vn-card-track"><span class="vn-track-pill" data-track="' + esc(trackSlug) + '">' + esc(r.track || 'Resource') + '</span>';
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

    // What else this place does, beyond the single category it is filed under.
    // Anything the category already says is dropped, so a daycare does not
    // announce that it also offers child care.
    var alsoOffers = (r.servicesOffered || []).filter(function (service) {
      if ((SERVICE_AS_CATEGORY[service] || []).indexOf(r.category) !== -1) return false;
      return !(service === 'Child Care' &&
               (r.category === 'Center-Based Daycare' || r.category === 'Home Daycare (Licensed)'));
    });

    // For a pet listing these are the first two questions, so they sit above
    // hours and cost rather than among the details. "None Stated" is dropped:
    // it is a real answer in the field, but as a card row it reads like a
    // promise the provider never made.
    var animals = (r.animals || []).filter(function (a) { return a !== 'Not Confirmed'; });
    var petRules = (r.petRequirements || []).filter(function (x) { return x !== 'None Stated'; });

    // Teens & High School. Grade Range and School District are new fields,
    // empty on every existing record, so those rows self-hide the way the pet
    // rows above do. The other three do NOT: Program Setting, Camp & Program
    // Topics and Teen Opportunity Type are already filled in on camps and
    // youth programmes, and showing them unconditionally would put new rows on
    // cards this change is meant to leave alone. So they are gated on the
    // track. Same for Apply by, which reads Registration Closes -- a field
    // camps already use. Search is different: indexing a field can only add
    // matches, never remove one, so the haystack above takes them for every
    // track.
    var teenTrack = r.track === 'Teens & High School';
    var teenList = function (values) {
      return teenTrack ? (values || []).join(', ') || null : null;
    };

    // Food & Basic Needs. Residency and Last Verified have both been mapped
    // since the state import without ever reaching a card, so they are gated
    // the same way the teen rows above are: showing them unconditionally would
    // put new rows on every existing listing, which this change is not for.
    //
    // Last Verified earns its place on this track specifically. A pantry's
    // opening hours change more often than a daycare's, and a date the visitor
    // can see is what lets them judge how much to trust the rest of the card --
    // which is the honest version of a field that cannot promise it is current.
    var foodTrack = r.track === FOOD_TRACK;
    var foodOnly = function (value) { return foodTrack ? (value || null) : null; };

    // Affordable family shopping. A shop and a sale want different rows, and
    // neither wants the other's: a seasonal sale has a date and a seller
    // deadline, a permanent shop has opening hours. Both are gated the way the
    // teen and food rows are, so nothing appears on the 700-odd cards this
    // change is not about.
    var shopGroup  = groupOf(r);
    var isSale     = shopGroup === SHOPPING_SEASONAL;
    var isShopping = isSale || shopGroup === SHOPPING_GROUP;

    // Seller/consignor registration, for a sale. Three separate Airtable
    // fields say one thing between them, so they are joined rather than given
    // a row each -- and the whole row disappears when none is filled in.
    var sellerBits = isSale ? [
      r.registrationStatus && r.registrationStatus !== 'Not Confirmed'
        ? r.registrationStatus : null,
      formatDate(r.registrationOpens) ? 'opens ' + formatDate(r.registrationOpens) : null,
      formatDate(r.registrationCloses) ? 'closes ' + formatDate(r.registrationCloses) : null
    ].filter(has) : [];

    var facts =
      fact('Serves', servesLabel) +
      fact('Takes', animals.join(', ') || null) +
      fact('Before booking', petRules.join(', ') || null) +
      fact('Support', (r.specializedSupport || []).join(', ') || null) +
      fact('Accessibility', r.accessibility, true) +
      fact('Grades', r.gradeRange && r.gradeRange !== 'Not Confirmed'
                     ? r.gradeRange : null) +
      fact('District', r.schoolDistrict) +
      fact('Setting', teenList(r.programSetting)) +
      fact('Focus', teenList(r.programTopics)) +
      fact('Opportunities', teenList(r.teenOpportunity)) +
      fact('Apply by', teenTrack ? (formatDate(r.registrationCloses) || null) : null) +
      fact('Also offers', alsoOffers.join(', ') || null) +
      fact('Hours', r.hours) +
      fact('Waitlist', r.availability, true) +
      fact('Ages', r.ages) +
      fact(isSale ? 'Admission' : 'Cost', r.cost) +
      fact('Times', times || null) +
      fact('Days', (r.daysOffered || []).join(', ') || null) +
      fact('Extended', (r.extendedCare || []).filter(function (x) {
        return x !== 'None' && x !== 'Not Confirmed'; }).join(', ') || null) +
      fact('Languages', (r.languages || []).filter(function (x) {
        return x !== 'Not Confirmed'; }).join(', ') || null) +
      fact('Meals', r.meals && r.meals !== 'Not Confirmed' ? r.meals : null) +
      fact('Licensing', r.licensing && r.licensing !== 'Not Confirmed' ? r.licensing : null) +
      fact('Who can come', foodOnly(
        r.residency && r.residency !== 'Not Confirmed' ? r.residency : null)) +
      fact('Seller registration', sellerBits.join(', ') || null) +
      fact('Last checked', (foodTrack || isShopping)
                           ? (formatDate(r.lastVerified) || null) : null) +
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

    // A pantry's hours, eligibility and stock move faster than this directory
    // can follow, and the cost of a wasted trip falls on somebody who may have
    // spent their last bus fare making it. The card says so rather than
    // implying the listing is a guarantee. Food only: every track goes stale,
    // but this is the one where being wrong means going hungry today.
    // Tags, shown small and last. They are search vocabulary first and card
    // content second, so they sit below the facts rather than competing with
    // them -- and the row is absent entirely once the repeats are dropped.
    var tagList = newTagsOf(r, [
      r.track, r.category, r.name, r.town, r.specificType,
      (r.townsServed || []).join(' '), facts, r.notes
    ].join(' '));
    var tagRow = tagList.length
      ? '<ul class="vn-tags" aria-label="Tags">' +
        tagList.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
        '</ul>'
      : '';

    var foodCaveat = foodTrack
      ? '<p class="vn-card-caveat">Contact the organization to confirm current ' +
        'hours, eligibility, and availability before visiting.</p>'
      : '';

    return '<article class="vn-card">' +
      head +
      '<h3 class="vn-card-name">' + esc(r.name || 'Untitled listing') + '</h3>' +
      (has(r.town) ? '<p class="vn-card-town">' + esc(r.town) + '</p>' : '') +
      eventRow +
      badgeRow +
      stars(r.rating) +
      (has(r.specificType) ? '<p class="vn-card-type">' + esc(r.specificType) + '</p>' : '') +
      (facts ? '<dl class="vn-facts">' + facts + '</dl>' : '') +
      tagRow +
      foodCaveat +
      notes +
      '<div class="vn-card-foot">' +
        (links.length ? '<div class="vn-card-links">' + links.join('') + '</div>' : '') +
        (source.length ? '<p class="vn-card-source">' + esc(source.join(' &middot; ')).replace(/&amp;middot;/g, '&middot;') + '</p>' : '') +
      '</div>' +
    '</article>';
  }

  /* ---------- turning a dead end into a contribution ---------- */

  // Finding nothing is the most useful moment on the page: the visitor has
  // just told us, precisely, about a gap. Rather than "try clearing the search
  // box", say what was missing and offer to record it -- carrying the search
  // into the form so they are not asked to type it twice.

  function currentSearchWords() {
    var bits = [];
    if (state.categories.length) {
      bits.push(state.categories.length <= 2 ? state.categories.join(' or ')
                                             : state.categories.length + ' types');
    }
    if (state.towns.length) {
      bits.push('in ' + (state.towns.length <= 3 ? state.towns.join(', ')
                                                 : state.towns.length + ' towns'));
    }
    if (state.search) bits.push('matching "' + state.search + '"');
    if (!bits.length && state.track) bits.push(state.track.toLowerCase());
    return bits.join(' ');
  }

  // Airtable form fields can be prefilled from the query string. If the field
  // names ever change the extra parameters are simply ignored, so a stale
  // prefill degrades to a blank form rather than an error.
  function formLink() {
    if (!FORM_URL) return '/contact.html';
    var q = [];
    if (state.towns.length === 1) q.push('prefill_Town%2FArea+(CT)=' + encodeURIComponent(state.towns[0]));
    if (state.categories.length === 1) q.push('prefill_Category=' + encodeURIComponent(state.categories[0]));
    if (state.track) q.push('prefill_Track=' + encodeURIComponent(state.track));
    return FORM_URL + (q.length ? (FORM_URL.indexOf('?') === -1 ? '?' : '&') + q.join('&') : '');
  }

  /* ---------- food assistance: the quick way in, and the way out ---------- */

  // Food is the one search where sending somebody away empty-handed is not an
  // acceptable outcome. Every other track can honestly answer "nobody has added
  // one yet, would you add it" -- that is a gap in a directory. Here the person
  // asking may need to eat today, and the right answer is not a contribution
  // form, it is the two statewide services that already know every pantry in
  // Connecticut. So this block appears whenever a food search finds nothing.
  //
  // It is shown in addition to the contribution prompt rather than instead of
  // it: the prompt is still true, it is just not the urgent part.

  function foodSearchActive() {
    if (state.track === FOOD_TRACK) return true;
    // Also catch someone who picked a food category without the track, and
    // someone typing "food pantry" into the search box with no filters set.
    return state.categories.some(function (c) {
      return (GROUP_OF[c] || '') === 'Food Assistance';
    });
  }

  function updateFoodFallback(isEmpty) {
    if (!el.foodFallback) return;
    el.foodFallback.hidden = !(isEmpty && foodSearchActive());
  }

  function shoppingSearchActive() {
    return state.categories.some(function (c) {
      var g = GROUP_OF[c] || '';
      return g === SHOPPING_GROUP || g === SHOPPING_SEASONAL;
    });
  }

  function updateShopFallback(isEmpty) {
    if (!el.shopFallback) return;
    el.shopFallback.hidden = !(isEmpty && shoppingSearchActive());
  }

  function updateEmptyCta(hasFilters) {
    if (!el.emptyCta) return;
    el.emptyCta.hidden = !hasFilters;
    if (!hasFilters) return;
    var what = currentSearchWords();
    el.emptyAsk.textContent = what
      ? 'Nobody has added anything for ' + what + ' yet. If you know somewhere \u2014 even just a name and a phone number \u2014 that is exactly the gap worth filling.'
      : 'If you know somewhere that belongs here, adding it takes a minute.';
    el.emptyAdd.setAttribute('href', formLink());
    if (FORM_URL) {
      el.emptyAdd.setAttribute('target', '_blank');
      el.emptyAdd.setAttribute('rel', 'noopener noreferrer');
    }
  }

  /* ---------- sorting ---------- */

  // What a family actually came for. A listing with real hours, a real waitlist
  // note and a real cost is worth more than one with a phone number, so
  // "detail" ranks on those rather than on how many fields are populated.
  var DETAIL_FIELDS = ['hours', 'availability', 'cost', 'website', 'ages', 'contact'];

  function detailScore(r) {
    var n = 0;
    DETAIL_FIELDS.forEach(function (k) { if (has(r[k])) n++; });
    // The imported boilerplate is not a real availability note; it says
    // "contact the program". Do not let it count as knowledge we have.
    if (/^Contact the program directly/i.test(r.availability || '')) n--;
    if (r.rating) n++;
    return n;
  }

  function byName(a, b) { return String(a.name || '').localeCompare(String(b.name || '')); }

  var SORTS = {
    name:     byName,
    town:     function (a, b) {
                return String(a.town || '').localeCompare(String(b.town || '')) || byName(a, b);
              },
    detail:   function (a, b) { return detailScore(b) - detailScore(a) || byName(a, b); },
    needs:    function (a, b) { return detailScore(a) - detailScore(b) || byName(a, b); },
    verified: function (a, b) {
                var av = a.lastVerified || a.dateSubmitted || '';
                var bv = b.lastVerified || b.dateSubmitted || '';
                return bv.localeCompare(av) || byName(a, b);
              }
  };

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
  // Comma separated in Airtable, a list here. Trimmed and de-duplicated so a
  // trailing comma or a double space does not become an empty chip.
  function tagsOf(r) {
    return String(r.tags || '').split(',')
      .map(function (t) { return t.trim(); })
      .filter(function (t, i, all) { return t && all.indexOf(t) === i; });
  }

  // Tags are written for the search box, so most of them restate the category,
  // track or town -- which the card already prints at the top. Measured on the
  // live data, 168 of 188 chips on the first page of results said something the
  // same card said somewhere else. A chip that repeats the line above it costs
  // space and teaches the reader to skip the row, so only the tags that add a
  // word are shown. Every tag still goes into the search index: this hides a
  // chip, it never narrows what can be found.
  //
  // Both sides are reduced to words before comparing, because the tags do not
  // always carry a record's punctuation -- "children s resale / consignment"
  // against "Children's Resale / Consignment" is the same thing said twice.
  // Whole tokens only, so the tag "care" is not swallowed by "childcare".
  function wordsOf(value) {
    return ' ' + String(value || '').toLowerCase()
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim() + ' ';
  }

  function newTagsOf(r, shown) {
    var text = wordsOf(shown);
    return tagsOf(r).filter(function (t) {
      return text.indexOf(wordsOf(t)) === -1;
    });
  }

  function servesTown(r, town) {
    if (r.town === town) return true;
    if (isStatewide(r)) return true;
    return served(r).indexOf(town) !== -1;
  }

  /* ---------- county ----------

     Connecticut does not store a county on the record, and it is not a field
     anybody is going to maintain by hand on 800 listings. It is derivable: a
     town belongs to exactly one county and has since 1960, so the map below is
     the whole of it and it does not drift.

     What this is NOT: a service area. A shop in Milford is in New Haven County;
     that says nothing about whether it serves Waterbury. Filtering by county
     matches a listing on the town it actually sits in (or a town it has
     explicitly said it serves), never on everything inside the county line.

     All 169 towns, grouped the way people still say them even though county
     government was abolished -- "Fairfield County" is how a parent describes
     where they live, so it is how the filter has to ask. */
  var COUNTY_TOWNS = {
    'Fairfield': [
      'Bethel', 'Bridgeport', 'Brookfield', 'Danbury', 'Darien', 'Easton',
      'Fairfield', 'Greenwich', 'Monroe', 'New Canaan', 'New Fairfield',
      'Newtown', 'Norwalk', 'Redding', 'Ridgefield', 'Shelton', 'Sherman',
      'Stamford', 'Stratford', 'Trumbull', 'Weston', 'Westport', 'Wilton'
    ],
    'Hartford': [
      'Avon', 'Berlin', 'Bloomfield', 'Bristol', 'Burlington', 'Canton',
      'East Granby', 'East Hartford', 'East Windsor', 'Enfield',
      'Farmington', 'Glastonbury', 'Granby', 'Hartford', 'Hartland',
      'Manchester', 'Marlborough', 'New Britain', 'Newington',
      'Plainville', 'Rocky Hill', 'Simsbury', 'South Windsor',
      'Southington', 'Suffield', 'West Hartford', 'Wethersfield',
      'Windsor', 'Windsor Locks'
    ],
    'Litchfield': [
      'Barkhamsted', 'Bethlehem', 'Bridgewater', 'Canaan', 'Colebrook',
      'Cornwall', 'Goshen', 'Harwinton', 'Kent', 'Litchfield', 'Morris',
      'New Hartford', 'New Milford', 'Norfolk', 'North Canaan',
      'Plymouth', 'Roxbury', 'Salisbury', 'Sharon', 'Thomaston',
      'Torrington', 'Warren', 'Washington', 'Watertown', 'Winchester',
      'Woodbury'
    ],
    'Middlesex': [
      'Chester', 'Clinton', 'Cromwell', 'Deep River', 'Durham',
      'East Haddam', 'East Hampton', 'Essex', 'Haddam', 'Killingworth',
      'Middlefield', 'Middletown', 'Old Saybrook', 'Portland', 'Westbrook'
    ],
    'New Haven': [
      'Ansonia', 'Beacon Falls', 'Bethany', 'Branford', 'Cheshire', 'Derby',
      'East Haven', 'Guilford', 'Hamden', 'Madison', 'Meriden',
      'Middlebury', 'Milford', 'Naugatuck', 'New Haven', 'North Branford',
      'North Haven', 'Orange', 'Oxford', 'Prospect', 'Seymour',
      'Southbury', 'Wallingford', 'Waterbury', 'West Haven', 'Wolcott',
      'Woodbridge'
    ],
    'New London': [
      'Bozrah', 'Colchester', 'East Lyme', 'Franklin', 'Griswold', 'Groton',
      'Lebanon', 'Ledyard', 'Lisbon', 'Lyme', 'Montville', 'New London',
      'North Stonington', 'Norwich', 'Old Lyme', 'Preston', 'Salem',
      'Sprague', 'Stonington', 'Voluntown', 'Waterford'
    ],
    'Tolland': [
      'Andover', 'Bolton', 'Columbia', 'Coventry', 'Ellington', 'Hebron',
      'Mansfield', 'Somers', 'Stafford', 'Tolland', 'Union', 'Vernon',
      'Willington'
    ],
    'Windham': [
      'Ashford', 'Brooklyn', 'Canterbury', 'Chaplin', 'Eastford', 'Hampton',
      'Killingly', 'Plainfield', 'Pomfret', 'Putnam', 'Scotland',
      'Sterling', 'Thompson', 'Windham', 'Woodstock'
    ],
  };

  // Villages and boroughs that are not towns but are what people actually type.
  // Each sits inside one town, so it inherits that town's county. Kept separate
  // from the 169 so the list above stays checkable against the state's own.
  var VILLAGE_TOWN = {
    'Lakeville': 'Salisbury',
    'Moodus': 'East Haddam',
    'Mystic': 'Stonington',
    'Pawcatuck': 'Stonington',
    'South Windham': 'Windham',
    'Storrs': 'Mansfield',
    'West Cornwall': 'Cornwall',
    'Willimantic': 'Windham',
    'Winsted': 'Winchester'
  };

  var COUNTY_OF = (function () {
    var map = {};
    Object.keys(COUNTY_TOWNS).forEach(function (county) {
      COUNTY_TOWNS[county].forEach(function (town) { map[town] = county; });
    });
    Object.keys(VILLAGE_TOWN).forEach(function (village) {
      map[village] = map[VILLAGE_TOWN[village]];
    });
    return map;
  })();

  var COUNTIES = Object.keys(COUNTY_TOWNS).sort();

  // Every county a listing can honestly be filed under: the one it sits in,
  // plus the counties of any town it has said it serves. A statewide listing
  // answers to all of them, which is what statewide means.
  function countiesOf(r) {
    if (isStatewide(r)) return COUNTIES.slice();
    var seen = {}, out = [];
    [r.town].concat(served(r)).forEach(function (t) {
      var c = COUNTY_OF[t];
      if (c && !seen[c]) { seen[c] = true; out.push(c); }
    });
    return out;
  }

  function matches(r) {
    if (state.track && r.track !== state.track) return false;
    if (state.categories.length && !(r._cats || []).some(function (c) {
      return state.categories.indexOf(c) !== -1;
    })) return false;
    if (state.towns.length && !state.towns.some(function (t) { return servesTown(r, t); })) return false;
    // County narrows the same way a town does, on where the listing actually
    // is or where it has said it serves -- not on everything inside the line.
    if (state.counties.length) {
      var mine = r._counties || [];
      if (!state.counties.some(function (c) { return mine.indexOf(c) !== -1; })) return false;
    }
    for (var flag in state.flags) {
      if (state.flags[flag] && FLAGS[flag] && !FLAGS[flag](r)) return false;
    }
    if (!state.terms.length) return true;
    return matchesSearch(r._haystack);
  }


  /* ---------- search terms ----------

     Split on whitespace, and require every term to match somewhere in the
     record. Adding a word narrows the results rather than widening them, so
     "mystic museum" finds the museum in Mystic instead of everything in
     Mystic plus every museum in the state.

     Terms are matched independently and may land in different fields, which
     is what makes that example work at all: one word is the town, the other
     is the category. A single-word search behaves exactly as it did before.

     Community AI already searched this way. These two now agree with it.

     Two things sit on top of that, because "every word must match" is exactly
     right for "mystic museum" and exactly wrong for how people ask for help.

     1. INTENT WORDS. "free wheelchair Bridgeport" found nothing while
        "wheelchair" found five, because no listing writes the word "free" --
        they write "no cost", "loan", "donation", or nothing at all. Same for
        "low cost", "help with", and "near me", which is not a place. These
        say what kind of answer somebody wants rather than what the record
        contains, so they stop narrowing and the search runs on the words that
        carry meaning.

     2. SYNONYMS. A resident types "diapers"; the record says "infant
        supplies". They type "internet"; it says "broadband". A term matches
        if the record holds it OR a known alternative, which can only widen a
        search -- no listing stops being findable by the word it already uses.

     Both are deliberately small and hand-written, and every synonym was
     counted against the live data before it stayed -- matching is substring
     matching, so a short synonym quietly matches inside longer words. A
     stemmer or a fuzzy match would do that everywhere and at a scale nobody
     could audit. */

  // Words describing the kind of help wanted rather than the resource. Dropped
  // from matching, never from the box: the visitor still sees what they typed.
  var INTENT_WORDS = {
    'free': 1, 'low': 1, 'cost': 1, 'low-cost': 1, 'lowcost': 1, 'cheap': 1,
    'affordable': 1, 'reduced': 1, 'discount': 1, 'discounted': 1, 'sliding': 1,
    'scale': 1, 'near': 1, 'me': 1, 'nearby': 1, 'close': 1, 'around': 1,
    'help': 1, 'helping': 1, 'need': 1, 'needed': 1, 'looking': 1, 'for': 1,
    'with': 1, 'any': 1, 'some': 1, 'a': 1, 'an': 1, 'the': 1, 'in': 1, 'at': 1,
    'and': 1, 'or': 1, 'of': 1, 'my': 1, 'we': 1, 'i': 1
  };

  // Each key widens to itself plus its list. Written from the resident's word
  // toward the directory's word, because that is the gap that loses people.
  // Each key widens to itself plus its list. Written from the resident's word
  // toward the directory's word, because that is the gap that loses people.
  //
  // Kept deliberately short, and every entry measured against the live data
  // before it was allowed to stay. Matching is substring matching, so a short
  // synonym is a trap: "child" is inside "childcare", "rent" is inside
  // "parent", "infant" is inside half the daycare listings. Pairs that read
  // perfectly well in the abstract -- kids/children, baby/infant, rent/rental
  // -- each matched roughly two-thirds of the directory and were dropped.
  // Anything that cannot be justified by a count is not here.
  //
  // thrift / consignment / resale are also absent on purpose. They are not
  // interchangeable: a consignment shop pays you for your child's outgrown
  // coat, a donation thrift store does not. Widening between them put eight
  // Goodwills in front of somebody searching "consignment". The Tags field is
  // where a listing says which words it answers to.
  var SYNONYMS = {
    wheelchair:   ['wheel chair', 'mobility', 'durable medical equipment'],
    walker:       ['mobility', 'durable medical equipment'],
    scooter:      ['mobility', 'durable medical equipment'],
    crutches:     ['durable medical equipment', 'mobility'],
    hospital:     ['hospital bed', 'durable medical equipment'],
    bed:          ['hospital bed', 'durable medical equipment'],
    equipment:    ['durable medical equipment', 'medical equipment'],
    // In this directory equipment is lent, not rented: the places that have a
    // hospital bed call themselves a loan closet. 0 listings say "rental", 3
    // say "loan", which is why somebody searching the ordinary word found
    // nothing. "rent" on its own is deliberately absent -- it is a substring
    // of "parent" and matches 523 of 810 listings on its own.
    rental:       ['loan', 'lending'],
    diaper:       ['infant supplies', 'baby supplies'],
    diapers:      ['diaper', 'infant supplies', 'baby supplies'],
    internet:     ['broadband', 'wifi', 'wi-fi', 'connectivity'],
    broadband:    ['internet'],
    wifi:         ['internet', 'broadband'],
    ride:         ['transportation', 'transport'],
    transport:    ['transportation'],
    van:          ['transportation', 'accessible vehicle'],
    heat:         ['heating', 'energy', 'utility'],
    heating:      ['heat', 'energy', 'utility'],
    utility:      ['utilities', 'energy'],
    utilities:    ['utility', 'energy'],
    clothes:      ['clothing', 'apparel'],
    clothing:     ['clothes', 'apparel'],
    food:         ['pantry', 'meals', 'groceries'],
    groceries:    ['food', 'pantry'],
    pantry:       ['food', 'food bank'],
    meal:         ['meals', 'food'],
    dentist:      ['dental'],
    dental:       ['dentist'],
    glasses:      ['vision', 'eye'],
    vision:       ['eye', 'glasses'],
    hearing:      ['hearing aid', 'audiology'],
    tutor:        ['tutoring', 'literacy', 'academic support'],
    tutoring:     ['tutor', 'literacy', 'academic support'],
    lawyer:       ['legal', 'attorney'],
    legal:        ['lawyer', 'attorney'],
    taxes:        ['tax preparation', 'vita'],
    tax:          ['tax preparation', 'vita'],
    benefits:     ['benefits enrollment', 'snap'],
    companionship:['companion', 'friendly visiting'],
    vet:          ['veterinary', 'veterinarian'],
    veterinary:   ['vet', 'veterinarian'],
    senior:       ['older adult', 'elder']
  };

  function searchTerms(value) {
    return String(value || '').trim().toLowerCase().split(/\s+/)
      .filter(Boolean)
      .filter(function (t) { return !INTENT_WORDS[t]; });
  }

  // Every spelling a term may match on: itself, its synonyms, and the naive
  // singular/plural pair. The pair is only tried on words long enough that
  // adding or dropping an s cannot turn them into a different word.
  function termVariants(term) {
    var out = [term];
    (SYNONYMS[term] || []).forEach(function (s) { out.push(s); });
    if (term.length > 3) {
      if (term.charAt(term.length - 1) === 's') out.push(term.slice(0, -1));
      else out.push(term + 's');
    }
    return out;
  }

  function matchesSearch(hay) {
    var terms = state.terms || [];
    var text = hay || '';
    for (var i = 0; i < terms.length; i++) {
      var variants = termVariants(terms[i]);
      var hit = false;
      for (var v = 0; v < variants.length && !hit; v++) {
        if (text.indexOf(variants[v]) !== -1) hit = true;
      }
      if (!hit) return false;
    }
    return true;
  }

  function haystack(r) {
    return [r.name, r.track, r.category, r.specificType, r.town, r.address,
            r.ages, r.hours, r.availability, r.cost, r.contact, r.notes,
            r.submittedBy]
      .concat(Array.isArray(r.townsServed) ? r.townsServed : [])
      .concat(r.servicesOffered || []).concat(r.languages || [])
      .concat(r.animals || []).concat(r.petRequirements || [])
      .concat(r.programSetting || []).concat(r.programTopics || [])
      .concat(r.teenOpportunity || []).concat(r.specializedSupport || [])
      .concat([groupOf(r), r.registrationStatus, r.licensing,
               r.gradeRange, r.schoolDistrict, r.accessibility])
      // County and the shopping type the record was researched into. Indexing
      // a field can only ever add matches, so "thrift stores in Fairfield
      // County" finds them without a county control being touched.
      .concat(countiesOf(r).map(function (c) { return c + ' County'; }))
      .concat([r.shoppingType, r.foodType])
      // Free-text tags. The whole point of the field is that a resident can
      // find a listing by the word they would actually type, so it goes in
      // alongside everything else rather than being a filter of its own.
      .concat(tagsOf(r))
      // Only while the event is still ahead. Indexing a field usually can
      // only add matches, which is why the teen fields are indexed for every
      // track -- but an expired event is text the card deliberately does not
      // show, and matching "open house" against something invisible sends a
      // family to a card that never mentions one.
      .concat(liveEvent(r) ? [r.event] : [])
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
    // Counted over the same widened set the filter uses, so a group that says
    // 40 returns 40 rather than the 12 filed under it.
    pool.forEach(function (r) {
      (r._cats || []).forEach(function (c) { live[c] = (live[c] || 0) + 1; });
    });

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

  function render(keepShown) {
    // Recomputed here rather than at every place the query can change --
    // typing, a reset, a filter chip, a shared link -- so the two can never
    // drift apart.
    state.terms = searchTerms(state.search);
    var shown = state.all.filter(matches).sort(SORTS[state.sort] || SORTS.name);

    if (!keepShown) state.shown = PAGE;
    var page = shown.slice(0, state.shown);

    if (!shown.length) {
      el.results.innerHTML = '';
      el.showMore.hidden = true;
      el.empty.hidden = false;
      var filtered = state.all.length > 0;
      el.emptyBody.textContent = filtered
        ? 'Nothing in the directory matches that yet \u2014 which does not mean nothing exists.'
        : 'The directory is still being filled in. Published listings appear here automatically once they clear review.';
      updateEmptyCta(filtered);
      updateFoodFallback(true);
      updateShopFallback(true);
    } else {
      el.empty.hidden = true;
      updateFoodFallback(false);
      updateShopFallback(false);
      el.results.innerHTML = page.map(card).join('');
      var left = shown.length - page.length;
      el.showMore.hidden = left <= 0;
      el.showMore.textContent = 'Show ' + Math.min(left, PAGE) + ' more of ' + left;
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
      return '<label class="vn-multi-opt" data-town="' + esc(t) + '">' +
               '<input type="checkbox" value="' + esc(t) + '" />' +
               '<span>' + esc(t) + '</span>' +
             '</label>';
    }).join('');
    syncTownUI();
  }

  function syncTownUI() {
    var n = state.towns.length;
    el.townLabel.textContent =
      n === 0 ? 'All towns' : (n === 1 ? state.towns[0] : n + ' towns selected');
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

  /* ---------- county filter ---------- */

  // Eight options, so this is a plain row of checkboxes rather than the
  // searchable panel the 130-town list needs. It reuses the quick-filter
  // markup the toggles already use, which is why it inherits their keyboard
  // behaviour and focus ring for free instead of being a third way to pick
  // something on the same page.
  function buildCountyList() {
    if (!el.countyList) return;
    el.countyList.innerHTML = COUNTIES.map(function (c) {
      return '<label class="vn-toggle"><input type="checkbox" value="' + esc(c) + '" />' +
             '<span>' + esc(c) + '</span></label>';
    }).join('');
    syncCountyUI();
  }

  function syncCountyUI() {
    if (!el.countyList) return;
    Array.prototype.forEach.call(el.countyList.querySelectorAll('input'), function (box) {
      box.checked = state.counties.indexOf(box.value) !== -1;
    });
  }

  function bindCountyFilter() {
    if (!el.countyList) return;
    el.countyList.addEventListener('change', function (event) {
      var box = event.target;
      if (!box || box.type !== 'checkbox') return;
      var at = state.counties.indexOf(box.value);
      if (box.checked && at === -1) state.counties.push(box.value);
      if (!box.checked && at !== -1) state.counties.splice(at, 1);
      render();
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

  function bindSortAndPaging() {
    el.sort.addEventListener('change', function () {
      state.sort = this.value;
      render();
    });
    el.showMore.addEventListener('click', function () {
      state.shown += PAGE;
      render(true);
      // Keep the reader where they were rather than jumping to the top.
      var cards = el.results.children;
      if (cards.length) cards[Math.max(0, state.shown - PAGE)].scrollIntoView({ block: 'center' });
    });
  }

  function bindDoorway() {
    if (!el.doorwayBtn) return;
    el.doorwayBtn.addEventListener('click', function () {
      var box = document.getElementById('vn-flag-disability');
      if (!box || box.parentNode.hidden) return;
      box.checked = true;
      box.dispatchEvent(new Event('change'));
      el.results.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  function bindToggles() {
    Array.prototype.forEach.call(el.toggles, function (box) {
      box.addEventListener('change', function () {
        state.flags[this.dataset.flag] = this.checked;
        if (this.dataset.flag === 'disability') tuneToggles();
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
    // Counted within the chosen track, not across the whole directory. These
    // toggles are childcare-shaped -- Care 4 Kids, before/after care, covers a
    // workday -- and offering them to somebody browsing pet care is offering a
    // filter that can only return nothing.
    var pool = state.track
      ? state.all.filter(function (r) { return r.track === state.track; })
      : state.all;
    var shown = 0;
    Array.prototype.forEach.call(el.toggles, function (box) {
      var test = FLAGS[box.dataset.flag];
      var n = test ? pool.filter(test).length : 0;
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

    // Paid leave covers time off to care for a family member, which a pet is
    // not. Offering it above a pet-care search is the same mistake as offering
    // a Care 4 Kids filter there, so it stands down for that one track.
    if (el.featured) el.featured.hidden = state.track === 'Pet Care & Resources';

    if (el.doorway) {
      var n = pool.filter(FLAGS.disability).length;
      el.doorway.hidden = n === 0 || !!state.flags.disability;
      el.doorwayNum.textContent = n + ' ' + plural(n, 'listing', 'listings') +
        (state.track ? ' here' : ' across all five sections') +
        ' name the accommodations they can make, the support they offer, or ' +
        'both. They stay filed under the kind of care they are, so this is a ' +
        'way of finding them together rather than a separate list.';
    }
  }

  /* ---------- events ---------- */

  function bind() {
    bindTownMulti();
    bindCatMulti();
    bindCountyFilter();
    bindToggles();
    bindDoorway();
    bindSortAndPaging();
    el.search.addEventListener('input', function () {
      state.search = this.value.trim().toLowerCase();
      render();
    });

    el.track.addEventListener('change', function () {
      state.track = this.value;
      buildCatList();
      tuneToggles();
      render();
    });

    el.reset.addEventListener('click', function () {
      state.search = state.track = '';
      state.towns = [];
      state.categories = [];
      state.flags = {};
      state.sort = 'name';
      el.sort.value = 'name';
      el.search.value = '';
      el.track.value = '';
      state.counties = [];
      Array.prototype.forEach.call(el.toggles, function (t) { t.checked = false; });
      syncTownUI();
      syncCountyUI();
      buildCatList();
      tuneToggles();
      render();
      el.search.focus();
    });

    if (el.shopReset) {
      el.shopReset.addEventListener('click', function () { el.reset.click(); });
    }

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
          r._cats = categoriesOf(r);
          r._counties = countiesOf(r);
          r._haystack = haystack(r);
          return r;
        });

        fillSelect(el.track, uniqueSorted(TRACKS.concat(
          state.all.map(function (r) { return r.track; }))), 'Anyone', trackLabel);
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
          // "Statewide" is not a town, but 21 listings carry it as their
          // Town/Area, so it was sitting in the dropdown between Stamford and
          // Sterling. Every one of them also carries the Towns Served
          // statewide flag, which already matches them to whatever town a
          // family picks, so dropping the option loses nobody.
          return t && !/^statewide/i.test(t) && !/,| and | area$/i.test(t);
        });
        buildTownList(uniqueSorted(townValues));
        buildCountyList();
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
