(function(){
  "use strict";

  /* ---------------- INLINE ICONS (Lucide, ISC license) ---------------- */
  const ICONS = {
    'users':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'user-plus':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
    'user-check':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>',
    'layers':'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    'briefcase':'<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    'share-2':'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
    'message-circle':'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    'message-square':'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    'cpu':'<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
    'refresh-cw':'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',
    'lightbulb':'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    'network':'<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
    'check-circle':'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'landmark':'<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
    'arrow-right':'<line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    'arrow-left-right':'<polyline points="17 11 21 7 17 3"/><line x1="21" x2="9" y1="7" y2="7"/><polyline points="7 21 3 17 7 13"/><line x1="15" x2="3" y1="17" y2="17"/>',
    'chevron-right':'<path d="m9 18 6-6-6-6"/>',
    'layout-grid':'<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    'trending-up':'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    'file-text':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    'zap':'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    'graduation-cap':'<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    'book-open':'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    'mic':'<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    'headphones':'<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    'video':'<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>',
    'smartphone':'<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    'instagram':'<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
    'youtube':'<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    'facebook':'<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    'globe':'<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    'camera':'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    'archive':'<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    'search':'<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/>',
    'external-link':'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>',
    'award':'<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
    'file-check':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/>',
    'shield-check':'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    'target':'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'clock':'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'x':'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'monitor':'<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    'code':'<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    'database':'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    'workflow':'<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
    'heart':'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    'info':'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    'alert-triangle':'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'sparkles':'<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
    'quote':'<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>'
  };

  /* ---------------- DATA (mirrors the live report; internal staff names removed) ---------------- */
  const navItems = [
    ['overview','Overview'],['strategy-projects','Strategy & Projects'],['ai-ecosystem','AI Ecosystem'],
    ['community-engagement','Community & Engagement'],['impact','Impact Stories'],['leadership-growth','Leadership & Growth'],['future','Future']
  ];

  const yearJourney = [
    {date:"Q3 2024",title:"Role Assumption",desc:"Stepped into the Stretch Director role and began a broad listening tour with 48 stakeholders.",icon:"user-plus"},
    {date:"Oct 2024",title:"IT Showcase Launch",desc:"Hosted the first cross-unit IT Showcase with OISS and SOM to strengthen collaboration and visibility.",icon:"share-2"},
    {date:"Nov 2024",title:"OneDrive Migration",desc:"Completed the full transition from Box to OneDrive for Yale College staff.",icon:"database"},
    {date:"Jan 2025",title:"AI CoP Engagement",desc:"Joined the AI Community of Practice and made intentional connections and contributions that strengthened cross-unit learning, encouraged responsible use, and helped staff feel more confident exploring new tools.",icon:"cpu"},
    {date:"Mar 2025",title:"Next Leaders Fellowship Completion",desc:"Wrapped up the EDUCAUSE Next Leaders Fellowship and applied the learning directly to cross-unit leadership work.",icon:"award"},
    {date:"Mar 2025",title:"Slate Integration",desc:"Unified first-year onboarding data flow across five systems.",icon:"workflow"},
    {date:"May 2025",title:"Digital Signage",desc:"Standardized the Appspace rollout for all 14 Residential Colleges and prepared content workflows for fall.",icon:"monitor"},
    {date:"Jul 2025",title:"Doctoral Program Start",desc:"Began my Executive Doctorate in Business Administration, connecting research with IT strategy and equity-focused work at Yale.",icon:"graduation-cap"},
    {date:"Sep 2025",title:"Cultural Centers",desc:"Delivered a classroom conversion proposal and moved it forward for Provost review.",icon:"landmark"},
    {date:"Dec 2025",title:"MOR Program Completion",desc:"Completed the MOR program and incorporated those leadership tools into ongoing collaboration across Yale College IT, FAS-SEAS IT, and ITS.",icon:"user-check"}
  ];

  const engagementData = [
    {title:"Cross-Unit IT Forums",icon:"share-2",stats:"5 Forums | 50+ Attendees",detail:"Convened monthly 'IT Showcase & Share' sessions with OISS, SOM, and ITS. Sparked collaborative pilots like the new digital forms tool."},
    {title:"Student Mentorship & Advising",icon:"heart",stats:"12+ Students Mentored",detail:"First-Year Academic Adviser, Pierson Fellow, and mentor to New Haven Promise interns. Provided holistic support and career guidance."},
    {title:"Senior Leadership 1:1s",icon:"users",stats:"48 Meetings",detail:"Monthly syncs with 4 senior leaders across the College and central IT. Ensured continuous alignment on strategic priorities like AI support."},
    {title:"IT Leadership Council (ITLC)",icon:"layers",stats:"12 Meetings | 3 Town Halls",detail:"Regular participant in monthly ITLC meetings. Co-presented AI roadmap progress at Town Halls to ~250 attendees."},
    {title:"Project Working Groups",icon:"briefcase",stats:"40+ Planning Meetings",detail:"Led 8+ working groups (Box, Digital Signage, Slate). Delivered 100% OneDrive migration and unified First-Year onboarding."},
    {title:"AI Workshops & Drop-Ins",icon:"cpu",stats:"100+ Attendees | 5 Sessions",detail:"Organized 3 training sessions and 2 drop-ins. Generated 25+ AI use cases fed into ITS planning. 90% confidence boost reported."}
  ];

  const projects = [
    {category:"Space & Culture",title:"Cultural Center Classroom Conversion",impact:"Inclusive Learning",metrics:["3 Centers Evaluated","Pending Approval","Spring 2026 Target"],description:"Led cross-dept initiative to propose repurposing spaces in AFAM, NACC, and AACC as classrooms. Completed evaluation and seeking Provost approval for technology/furniture refresh to align academic mission with cultural hubs."},
    {category:"Talent / Web",title:"Student-Led YaleSites Migration",impact:"Workforce Dev",metrics:["20+ sites migrated","4 student devs mentored","2 interns hired"],description:"Delegated migration to New Haven Promise interns and student developers. Provided mentorship to build a pipeline of IT talent while modernizing infrastructure."},
    {category:"Integration",title:"First-Year Onboarding (Slate)",impact:"Automation",metrics:["5 systems integrated","100% housing feed automation","3 workflows automated"],description:"Transitioned onboarding workflows into Slate, integrating data from Admissions, SIS, Housing, and Yale Health."},
    {category:"Platform",title:"Yale College IT SharePoint Hub",impact:"Self-Service",metrics:["100% staff onboarded","40+ resources published","3 shared workflows"],description:"Built a centralized intranet for staff resources, workflows, and documentation, serving as the internal knowledge base."},
    {category:"AI Innovation",title:"Smart Routing AI Assistant",impact:"Efficiency",metrics:["30% instant resolution","1 prototype launched","2 ITS teams engaged"],description:"Developed a Gemini-powered bot to triage support requests. Yale College is acting as an incubator for this enterprise solution."},
    {category:"Operations",title:"Digital Signage Upgrade",impact:"Standardization",metrics:["50% rollout completed","14 Residential Colleges","1 centralized channel"],description:"Migrated residential colleges to Appspace platform with standardized Canva templates."},
    {category:"Adoption",title:"Collaboration Tools Campaign",impact:"Adoption",metrics:["20% increase in Teams","15% reduction in file issues","5 tip sheets"],description:"Boosted adoption of Teams and OneDrive through targeted 'Tips & Tricks' campaigns."}
  ];

  const techStack = [
    {category:"AI & Automation",tools:["Clarity","M365 Copilot","Power Automate","Gemini"]},
    {category:"Operations & Ops",tools:["Slate","Appspace","ServiceNow","Dynamic Forms"]},
    {category:"Infrastructure & Web",tools:["Drupal (YaleSites)","SharePoint","Pantheon"]},
    {category:"Collaboration",tools:["Microsoft Teams","OneDrive","Zoom"]}
  ];

  const roleImpacts = [
    {id:1,role:"Student",icon:"graduation-cap",impacts:[
      {label:"Unified Onboarding Portal",project:"First-Year Onboarding (Slate)"},
      {label:"Mentored 12+ Students",project:"Student IT Associates"},
      {label:"Xplore App Prototype",project:"Student Developers"}]},
    {id:2,role:"Faculty",icon:"book-open",impacts:[
      {label:"AI Grading Assistants",project:"AI Workshops & Copilot Training"},
      {label:"Advisory Committee Voice",project:"Yale College IT Advisory"},
      {label:"Enhanced Classroom Tech",project:"Cultural Center Classroom Conversion"}]},
    {id:3,role:"Staff",icon:"briefcase",impacts:[
      {label:"Automated Workflows",project:"First-Year Onboarding (Slate)"},
      {label:"AI Community of Practice",project:"AI CoP Kickoff"},
      {label:"SharePoint Knowledge Base",project:"Yale College IT SharePoint Hub"}]}
  ];

  const timelineEvents = [
    {q:"Q4 2025",title:"BSC02 Rollout",desc:"Implementing AI support framework."},
    {q:"Jan 2026",title:"Cultural Classrooms",desc:"Target implementation start (pending approval)."},
    {q:"2026",title:"First-Year Portal",desc:"Full launch of unified student hub."},
    {q:"2027",title:"ServiceNow Pilot",desc:"Unifying helpdesk ticketing."},
    {q:"Next",title:"AI Archive Search",desc:"Natural language search for LUX collections."}
  ];

  const aiCycle = [
    {stage:"Research (DBA)",icon:"graduation-cap",description:"Executive DBA research on 'Equity-Minded AI Adoption' establishes the theoretical framework.",output:"Evidence-based Playbooks"},
    {stage:"Strategy (Governance)",icon:"layers",description:"Balanced Scorecard (BSC02) aligns research with University policy and security guardrails.",output:"AI Support Roadmap"},
    {stage:"Practice (Community)",icon:"users",description:"Lunch & Learns and Workshops test the strategy in the real world with staff.",output:"Adoption Data"},
    {stage:"Validation (Feedback)",icon:"refresh-cw",description:"Community feedback informs new research questions, restarting the cycle.",output:"Continuous Improvement"}
  ];

  const promptVault = [
    {category:"Plain Request",prompt:"Summarize this in three short paragraphs.",desc:"Simple, direct instructions often yield the best results for basic tasks."},
    {category:"Role-Based",prompt:"Act as a meeting planner and create an agenda for a 60-minute session. Include time for introductions, goals, discussion, and Q&A.",desc:"Assigning a persona helps the AI understand the context and desired output format."},
    {category:"Tone Rewrite",prompt:"Rewrite this message to sound warm and direct for a team email.",desc:"Perfect for adjusting communication style without rewriting content from scratch."},
    {category:"Organization",prompt:"Turn this meeting transcript into a structured summary with decisions, action items, and next steps.",desc:"Transforms messy input into structured, actionable business intelligence."},
    {category:"Comparison",prompt:"Compare these three project management tools: Asana, Monday.com, Smartsheet. Create a table with pros and cons.",desc:"Rapidly synthesizes options to aid decision-making."}
  ];

  const podcastMetrics = {
    totalGrowth:"14,000%",
    platforms:[
      {name:"Spotify",url:"https://open.spotify.com/show/3i5HUA9ENPuL0yG8RfBMVW"},
      {name:"Apple Podcasts",url:"https://podcasts.apple.com/us/podcast/yale-college-voices-exploring-diverse-roles-and/id1710317630"},
      {name:"SoundCloud",url:"https://soundcloud.com/yale-college-voices"},
      {name:"iHeart",url:"https://www.iheart.com/podcast/269-yale-college-voices-explor-308577787/"},
      {name:"Amazon Music",url:"https://music.amazon.com/es-us/podcasts/143425ec-3b40-4f8c-b3ed-988e9631e5aa/yale-college-voices-exploring-diverse-roles-and-innovative-projects-of-our-staff"},
      {name:"Audible",url:"https://www.audible.com/podcast/Yale-College-Voices-Exploring-Diverse-Roles-and-Innovative-Projects-of-Our-Staff/B0G3JY3TZ2"},
      {name:"YouTube",url:"https://www.youtube.com/@YaleCollegeVoices"}
    ],
    socialBreakdown:[
      {platform:"TikTok",count:474,engagement:"3.85%",icon:"smartphone"},
      {platform:"Instagram",count:336,engagement:"2.59%",icon:"instagram"},
      {platform:"YouTube",count:111,engagement:"N/A",icon:"youtube"},
      {platform:"Facebook",count:63,engagement:"N/A",icon:"facebook"}
    ],
    topContent:"Interview with Carolina Davila (La Casa Cultural) - Driving conversations on leadership & belonging."
  };

  const externalLeadership = [
    {org:"EDUCAUSE",role:"Presenter & Community Leader",topic:"AI Innovation & Impact at Yale",details:"Presented on the intersection of DEI and AI adoption. Highlighted the 'Practitioner-Scholar' model to a national audience."},
    {org:"NERCOMP",role:"Planning Committee & Moderator",topic:"Regional Higher-Ed AI Strategy",details:"Helped shape the agenda for regional IT leaders, ensuring focus on student services and ethical governance."}
  ];

  const credentials = [
    {title:"MOR Leaders Program",issuer:"MOR Associates",date:"Nov 2025",skills:"Strategic Leadership, Change Management, Cross-Team Collaboration"},
    {title:"Next Leaders Fellowship",issuer:"EDUCAUSE",date:"Jul 2025",skills:"Executive IT Leadership, DEI Management, Strategic Planning"},
    {title:"Agent Explorer (Copilot)",issuer:"Founderz Business School / Microsoft",date:"Nov 26, 2025",skills:"AI Agents, Microsoft Copilot Integration, Prompt Engineering"},
    {title:"AI Skills 4 Women",issuer:"Founderz Business School",date:"Nov 26, 2025",skills:"Applied Machine Learning, Data Analysis, AI Ethics"},
    {title:"Dashboard in a Day",issuer:"Microsoft",date:"Jul 1, 2025",skills:"Power BI, Data Modeling, DAX, Visualization Best Practices"}
  ];

  const citiCerts = [
    {title:"Social & Behavioral Research",link:"https://www.citiprogram.org/verify/?k2674a795-a51a-41c4-813f-c1caa88efb1e-73637366"},
    {title:"Research with Children",link:"https://www.citiprogram.org/verify/?k6df32295-5301-4824-8984-093076a2ca71-73136963"},
    {title:"Humanities Responsible Conduct",link:"https://www.citiprogram.org/verify/?k3bac4e87-c28b-4f17-9075-78918652fe18-73637367"},
    {title:"Social & Behavioral RCR",link:"https://www.citiprogram.org/verify/?k4c03216a-2afa-46e6-a206-ddbd2cf848f8-73136964"},
    {title:"Conflicts of Interest",link:"https://www.citiprogram.org/verify/?k3323fa88-4fb1-4628-ac4a-899f80e87b18-73632001"},
    {title:"Information Privacy & Security",link:"https://www.citiprogram.org/verify/?kaa5b60d3-8fe7-420f-a191-1e7cceb09ed8-73632002"}
  ];

  const mentorshipFlow = {
    received:[
      {focus:"Organizational Design"},
      {focus:"Cross-Unit Dynamics"},
      {focus:"Balanced Scorecard Strategy"},
      {focus:"FAS-SEAS Alignment"}
    ],
    given:[
      {group:"Yale ITS Mentorship",detail:"Coached Junior IT Manager (6 Sessions)"},
      {group:"New Haven Promise",detail:"Career pathways presentations for young women"},
      {group:"Student Developers",detail:"Mentored 4 students; 2 hired as interns"},
      {group:"Staff AI CoP",detail:"Leading 100+ member community of practice"}
    ]
  };

  const testimonials = [
    {text:"I would love to continue working as a student photographer when I come back... I am grateful for the opportunity.",author:"Student Photographer",context:"Year-End Feedback"},
    {text:"This was one of the most helpful conversations this year. Please continue these!",author:"Staff Member",context:"AI Drop-In Feedback"},
    {text:"Working on Xplore was the highlight of my year, applying classroom knowledge to a real project.",author:"Student Developer",context:"Project Debrief"},
    {text:"Appreciate having an IT person who speaks our language.",author:"Head of College",context:"Strategic Planning"}
  ];

  const transformations = [
    {area:"Digital Signage",before:"14 Separate Local Solutions",after:"1 Unified Appspace Platform",impact:"Consistent messaging across all Residential Colleges."},
    {area:"Support Pathways",before:"Unclear Roles for Cultural Centers",after:"Clear Division & Communication",impact:"Reduced frustration and improved response times."},
    {area:"First-Year Onboarding",before:"Fragmented Manual Data Entry",after:"Slate Integration & Automation",impact:"Seamless data flow for ~1,600 incoming students."},
    {area:"Storage",before:"Legacy Box Storage",after:"100% OneDrive Migration",impact:"Modern, integrated collaboration environment."}
  ];

  const aiDecisionFramework = [
    {id:'accuracy',label:'Accuracy & Structure',tool:'GPT-4o / Copilot',desc:'Best for: Drafting emails, reports, and structured output.'},
    {id:'long-docs',label:'Long Document Analysis',tool:'Claude (Clarity)',desc:'Best for: Analyzing PDFs, research papers, and policy docs.'},
    {id:'creativity',label:'Fast Creativity',tool:'Gemini',desc:'Best for: Brainstorming, ideation, and quick drafts.'},
    {id:'office',label:'Office Integration',tool:'M365 Copilot',desc:'Best for: Excel analysis, PowerPoint slides, and Outlook summaries.'}
  ];

  const strategyWeb = [
    {id:"ai",goal:"AI Innovation",icon:"cpu",relatedProjects:["Smart Routing AI Bot","Copilot Workshops","Prompt Library","ASCEND Networking"],partners:["ITS","Microsoft","Poorvu Center","HBCU Researchers"],outcome:"92% Staff Confidence Boost"},
    {id:"ops",goal:"Operational Excellence",icon:"refresh-cw",relatedProjects:["First-Year Onboarding (Slate)","Box to OneDrive","Digital Signage"],partners:["Admissions","Housing","Facilities"],outcome:"100% Migration Success"},
    {id:"culture",goal:"Collaborative Culture",icon:"users",relatedProjects:["IT Showcase & Share","Advisory Committee","OneIT Conference","Cultural Center Classrooms"],partners:["OISS","SOM","Architecture","Cultural Centers"],outcome:"Silo-busting 'OneIT' Model"}
  ];

  const futureReasons = [
    {title:"Sustained Alignment with University Strategy",desc:"Directly supporting the 'Community Inclusion and Excellence' university initiative by modernizing Cultural Centers. Ensuring Yale College IT remains coupled with the central 'Enabling AI' roadmap.",connection:"University: Community Inclusion | IT: Enabling AI"},
    {title:"Momentum on Strategic Initiatives",desc:"Critical projects like AI Support structures and the ServiceNow pilot are in mid-flight. Dedicated leadership ensures they land successfully, supporting the 'Foundational' IT pillar.",connection:"IT Pillar: Foundational (Service Delivery)"},
    {title:"Nurturing Critical Relationships",desc:"The trust recently built with Deans, Faculty, and Cultural Centers requires consistent engagement to maintain. This human layer bridges central governance with local 'Administrative Data' needs.",connection:"IT Pillar: Administrative Data at Yale"},
    {title:"Continuous Innovation Funnel",desc:"The 'Showcase & Share' and Advisory groups have created a pipeline of ideas that needs active management. This directly validates and scales the 'Enabling AI' central initiative.",connection:"IT Pillar: Enabling AI (ask.yale.edu)"},
    {title:"Long-Term Cultural Change",desc:"Moving from siloed operations to a 'OneIT' mindset is a multi-year cultural shift. This supports the 'Flexible Computing' goal of standardizing management across constituent groups.",connection:"IT Pillar: Foundational (Flexible Computing)"}
  ];

  const lunchLearnCurriculum = ["Prompt Engineering Basics","Data Analysis with Copilot","Meeting Summarization","Email & Comm Drafting","Safe AI Usage Guidelines","Document Transformation","Brainstorming Partners","Technical Troubleshooting","Presentation Building","Workflow Automation"];

  const archivingInitiative = [
    {title:"Student Photography Program",icon:"camera",metrics:"15,000+ Images | 10 Students",details:"Hired 10 student photographers and developed a Power Automate Kanban system for self-assignment. Covered high-profile events like the OneIT Annual Conference and events led by the Dean of Yale College."},
    {title:"LUX & Aviary Integration",icon:"archive",metrics:"60k+ Legacy Images | 35+ Podcast Episodes",details:"Partnering with the University Archivist to preserve content via Aviary, making it accessible through Yale's LUX Collections."},
    {title:"AI Natural Language Search",icon:"search",metrics:"Next Level",details:"Developing AI-powered search to allow natural language queries like 'Show me fall orientation photos' across the archive."}
  ];

  const externalMentors = [
    {name:"Michael Cato",role:"CIO, Bowdoin College",focus:"Strategic Alignment",insight:"Make your voice heard; align IT with institutional mission.",impact:"Co-designed AI Leadership Academy; applied strategic framing to Yale College IT planning."},
    {name:"Sherri Costanzo",role:"Deputy CIO, Bowdoin College",focus:"Operational Excellence",insight:"Empower staff; balance innovation with operations.",impact:"Delegated YaleSites migration; improved team engagement and meeting structure."},
    {name:"Stanley McIntyre",role:"CIO, University of Richmond",focus:"Change Management",insight:"Lead with listening; build trust through transparency.",impact:"Applied advice in faculty engagement and cross-unit forums."},
    {name:"Kimberley Jones",role:"CIO, Morehouse College",focus:"Career Advancement",insight:"Step up and be heard; overcome impostor syndrome.",impact:"Pursued higher-level opportunities; increased visibility in leadership forums."},
    {name:"Vijay Menta",role:"CIO, WPI",focus:"Strategic Clarity",insight:"Clarity breeds momentum; celebrate wins.",impact:"Strengthened strategic communication; secured endorsement for Executive DBA program."}
  ];

  const studentStories = [
    {title:"College Fellow & Adviser",role:"Pierson College",icon:"book-open",description:"Serving as a First-Year Academic Adviser and Pierson Fellow to guide students through their transition to Yale. Provided holistic support on course selection and navigating academic procedures, modeling the importance of proactive engagement with faculty networks.",outcome:"Strengthened Advising Ecosystem"},
    {title:"New Haven Promise Mentor",role:"Community Outreach",icon:"heart",description:"Supervised Promise interns on daily IT projects and was invited to speak to scholars about careers in technology. One standout intern led portions of a website migration and received a graduate school recommendation based on their performance.",outcome:"Bridge to New Haven Community"},
    {title:"Student-Led Innovation",role:"Technical Leadership",icon:"code",description:"Empowered Student Developers to drive the 'Yale College Xplore' app prototype and YaleSites migration. Adopted an 'all-win' model where students acted as project co-leads, gaining real-world product development skills while delivering critical infrastructure.",outcome:"Rapid Prototyping & Skill Building"},
    {title:"Creative Documentation Team",role:"Student Employment",icon:"camera",description:"Expanded the Student Photography program to 10 photographers to cover high-profile events. Structured as professional development with media credentials and portfolio building, rather than just a transaction.",outcome:"15,000+ Images & High Satisfaction"},
    {title:"ITS Peer Mentorship",role:"Staff Development",icon:"user-check",description:"Mentored a junior ITS colleague through the Staff Learning & Development program. Sponsored their participation in strategic meetings to broaden their network, reinforcing a culture of continuous learning and support beyond my own team.",outcome:"Cross-Departmental Growth"}
  ];

  const studentImpactStats = [
    {value:"12+",label:"Students Mentored/Supervised"},
    {value:"100%",label:"Intern Project Success Rate"},
    {value:"2",label:"Student Project Leads Appointed"},
    {value:"1",label:"App Prototype Delivered"}
  ];

  /* ---------------- STATE + HELPERS ---------------- */
  const state = { tab:'overview', strategy:null, prompt:0, framework:null, future:null };
  const I  = (n,c,cls)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls||''}"${c?` style="color:var(--${c})"`:''} aria-hidden="true">${ICONS[n]||''}</svg>`;
  const SH = (t,s)=>`<div class="yer-sh"><h2>${t}</h2><p>${s}</p></div>`;
  const BADGE = (l)=>`<span class="yer-badge">${l}</span>`;
  const nextBtn = (href,label)=>`<div style="display:flex;justify-content:flex-end;margin-top:2rem;"><a href="${href}" class="btn-primary" style="display:inline-flex;align-items:center;gap:.5rem;">${label} ${I('arrow-right',null,'sm')}</a></div>`;

  /* ---------------- TAB RENDERERS ---------------- */
  function tOverview(){
    const sum=[
      ['cpu','AI Support Structure','Built an AI support structure meeting people where they were. Created the AI Community of Practice, running workshops and drop-ins that built trust and practical skills during a period of uncertainty.'],
      ['refresh-cw','Operational Gaps & Routing','Surfaced and fixed issues with support routing using Power Automate. Partnered to improve Dynamic Forms, ID card distribution, and the Appspace transition, strengthening cross-unit relationships.'],
      ['workflow','First-Year Onboarding','Completed a full review of Opening Days systems and outlined the path to a unified portal. Pulled together conversations across Yale College, central IT, and Student Affairs.'],
      ['mic','Community & Mentorship','Grew the Yale College Voices Podcast to connect stories across the college. Actively mentored students, supported the photography program, and guided junior staff through new responsibilities.']
    ];
    const nav=[
      ['Engagement','IT Showcase & Share','Event summaries and examples of cross-team knowledge exchange.','community-engagement.html'],
      ['Projects','YaleSites Migration','Student-led partnership outcomes and platform adoption resources.','strategy-projects.html'],
      ['Integration','First-Year Onboarding','Process documentation and user-journey improvements via Slate.','strategy-projects.html'],
      ['Innovation','AI Support & CoP','Training, trust-building, and practical skill development.','ai-ecosystem.html']
    ];
    const stats=[['14,000%','Podcast Growth'],['100+','AI CoP Members'],['20+','Sites Migrated'],['92%','AI Confidence']];
    return `
    <div class="yer-band yer-hero" style="padding:2.5rem;position:relative;overflow:hidden;">
      <div aria-hidden="true" style="position:absolute;right:-40px;top:0;height:100%;width:38%;background:rgba(192,132,252,.12);transform:skewX(-12deg);z-index:0;"></div>
      <div style="position:relative;z-index:1;">
        <h1 style="font-family:var(--serif);font-size:clamp(1.7rem,4vw,2.5rem);font-weight:900;line-height:1.12;margin-bottom:.75rem;">Darice Corey, Senior Director of Yale College IT</h1>
        <p style="font-size:1.15rem;color:var(--muted2);margin-bottom:1rem;">Stretch Opportunity: Year-End Report (2024–2025)</p>
        <div style="height:3px;width:80px;background:var(--yellow);margin-bottom:1.5rem;"></div>
        <p style="max-width:760px;font-size:1.02rem;line-height:1.8;color:var(--muted2);">"I started with a blank slate and used it to build an IT foundation that strengthens Yale College and contributes to the wider Yale community. With no preset limits, I formed new partnerships, launched strategic projects, and set up systems and communities that now support work well beyond my own unit."</p>
      </div>
    </div>

    <div style="margin-top:2.5rem;">${SH("Executive Summary","Expanding scope to clear barriers, strengthen communication, and improve experiences.")}
      <div class="yer-grid yer-g2">
        ${sum.map((s,i)=>`<div class="yer-card" style="border-left:4px solid ${i%2?'var(--yellow)':'var(--accent)'};"><h4 style="display:flex;align-items:center;gap:.5rem;font-size:1.1rem;color:var(--accent);margin-bottom:.5rem;">${I(s[0],'accent','sm')} ${s[1]}</h4><p class="yer-muted" style="font-size:.9rem;line-height:1.7;">${s[2]}</p></div>`).join('')}
      </div>
      <div class="yer-card" style="background:var(--soft);text-align:center;margin-top:1.25rem;"><p style="font-family:var(--serif);font-style:italic;font-size:1.1rem;color:var(--accent);">"This year reinforced that my strongest contributions come from connecting dots across units, listening closely, and turning insights into action."</p></div>
    </div>

    <div class="yer-card" style="margin-top:2.5rem;">
      <h3 style="display:flex;align-items:center;gap:.5rem;font-size:1.2rem;margin-bottom:.5rem;">${I('info','accent')} How to Navigate This Report</h3>
      <p class="yer-muted" style="margin-bottom:1.25rem;max-width:640px;">This interactive report highlights the core bodies of work from the past year. Select a card to jump to the section detailing that initiative.</p>
      <div class="yer-grid yer-g4">
        ${nav.map(n=>`<a href="${n[3]}" class="yer-card yer-clickable" style="display:block;text-decoration:none;background:var(--soft);"><span class="yer-eyebrow" style="font-size:.66rem;">${n[0]}</span><span style="display:block;font-weight:700;color:var(--accent);font-size:1.02rem;margin:.3rem 0;">${n[1]}</span><span class="yer-muted" style="font-size:.78rem;">${n[2]}</span></a>`).join('')}
      </div>
    </div>

    <div class="yer-card" style="margin-top:2.5rem;text-align:center;">
      <h3 style="font-family:var(--serif);font-size:1.2rem;color:var(--accent);margin-bottom:2rem;">The "OneIT" Connector Model</h3>
      <div style="position:relative;max-width:600px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:.5rem;">
        <div style="position:absolute;top:50%;left:8%;right:8%;height:2px;background:var(--line2);z-index:0;"></div>
        <div style="position:relative;z-index:1;background:var(--soft);border:1px solid var(--line2);border-radius:10px;padding:1rem .5rem;width:30%;max-width:120px;">${I('layers','muted2')}<div style="font-weight:700;font-size:.78rem;margin-top:.4rem;">Central ITS</div></div>
        <div style="position:relative;z-index:2;background:var(--accent);color:var(--on-accent);border-radius:50%;width:140px;height:140px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;border:4px solid var(--bg);box-shadow:0 10px 30px rgba(0,0,0,.25);">${I('refresh-cw',null,'lg yer-spin')}<span style="font-weight:700;font-size:.78rem;margin-top:.3rem;">Yale College IT</span><span style="font-size:.62rem;opacity:.85;">(Translation Layer)</span></div>
        <div style="position:relative;z-index:1;background:var(--soft);border:1px solid var(--line2);border-radius:10px;padding:1rem .5rem;width:30%;max-width:120px;">${I('graduation-cap','muted2')}<div style="font-weight:700;font-size:.78rem;margin-top:.4rem;">Campus</div></div>
      </div>
    </div>

    <div style="margin-top:3rem;">
      <h3 style="font-family:var(--serif);font-size:1.4rem;text-align:center;margin-bottom:1.5rem;">2024–2025 Year in Review</h3>
      <div style="border-left:3px solid var(--line2);margin-left:.5rem;display:flex;flex-direction:column;gap:1.5rem;padding:.5rem 0;">
        ${yearJourney.map(e=>`<div style="position:relative;padding-left:1.75rem;"><div style="position:absolute;left:-9px;top:4px;width:14px;height:14px;border-radius:50%;background:var(--bg);border:3px solid var(--accent);"></div><div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-bottom:.2rem;"><span style="font-size:.72rem;font-weight:700;color:var(--accent);background:var(--soft);padding:.15rem .5rem;border-radius:5px;">${e.date}</span><h4 style="font-size:1rem;display:flex;align-items:center;gap:.4rem;">${I(e.icon,'accent','sm')} ${e.title}</h4></div><p class="yer-muted" style="font-size:.86rem;max-width:640px;">${e.desc}</p></div>`).join('')}
      </div>
    </div>

    <div class="yer-grid yer-g4" style="margin-top:2.5rem;">
      ${stats.map((s,i)=>`<div class="yer-stat"${i===3?' style="background:var(--accent);border-color:var(--accent);"':''}><div class="num"${i===3?' style="color:var(--on-accent);"':''}>${s[0]}</div><div class="lbl"${i===3?' style="color:var(--on-accent);opacity:.85;"':''}>${s[1]}</div></div>`).join('')}
    </div>
    ${nextBtn('strategy-projects.html','Explore Strategy & Projects')}`;
  }

  function tStrategyProjects(){
    const p0=projects[0];
    const spotlight=`<div class="yer-band yer-clickable" data-project="0" style="padding:2rem;display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;">
      <span class="yer-icchip" style="width:64px;height:64px;background:rgba(255,255,255,.1);">${I('landmark','yellow','lg')}</span>
      <div style="flex:1;min-width:240px;"><span class="yer-badge" style="background:var(--yellow);color:#241038;border-color:var(--yellow);">Spotlight Project</span><h3 style="font-family:var(--serif);font-size:1.5rem;margin:.5rem 0;">${p0.title}</h3><p style="color:var(--muted2);line-height:1.7;margin-bottom:.75rem;">${p0.description}</p><div>${p0.metrics.map(m=>BADGE(m)).join('')}</div></div>
      ${I('arrow-right','accent')}
    </div>`;
    const archive=`<div class="yer-band" style="padding:2rem;">
      <span class="yer-badge">Spotlight: Digital Archiving</span>
      <h3 style="font-family:var(--serif);font-size:1.5rem;display:flex;align-items:center;gap:.5rem;margin:.5rem 0 .75rem;">${I('globe','accent')} Preserving the Present</h3>
      <p style="color:var(--muted2);line-height:1.7;margin-bottom:1.25rem;">"By partnering with the University Archivist, we are ensuring that over 15,000 new event photos and 35+ podcast episodes are actively preserved and made accessible through Yale's LUX Collections."</p>
      <div class="yer-grid yer-g3" style="margin-bottom:1.25rem;">${archivingInitiative.map(it=>`<div class="yer-card" style="background:rgba(255,255,255,.07);border-color:var(--line2);"><div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.4rem;">${I(it.icon,'yellow','sm')}<span class="yer-eyebrow" style="color:var(--yellow);">${it.metrics.split('|')[0].trim()}</span></div><p style="font-size:.82rem;">${it.title}</p></div>`).join('')}</div>
      <a href="https://lux.collections.yale.edu/" target="_blank" rel="noreferrer" class="btn-primary" style="display:inline-flex;align-items:center;gap:.5rem;">Explore LUX ${I('external-link',null,'sm')}</a>
    </div>`;
    const s=strategyWeb.find(x=>x.id===state.strategy);
    let detail='';
    if(s){
      detail=`<div class="yer-card yer-reveal" style="margin-top:1.5rem;"><div style="text-align:center;margin-bottom:1rem;"><span class="yer-badge" style="background:var(--accent);color:var(--on-accent);border-color:var(--accent);">Deep Dive: ${s.goal}</span></div>
        <div class="yer-grid yer-g3">
          <div class="yer-card" style="background:var(--soft);border-left:4px solid var(--purple);"><h5 class="yer-eyebrow" style="margin-bottom:.6rem;">Strategic Projects</h5><ul style="list-style:none;display:flex;flex-direction:column;gap:.5rem;">${s.relatedProjects.map(p=>`<li style="display:flex;gap:.5rem;align-items:flex-start;font-size:.86rem;font-weight:500;">${I('check-circle','purple','sm')} ${p}</li>`).join('')}</ul></div>
          <div class="yer-card" style="background:var(--soft);border-left:4px solid var(--accent);"><h5 class="yer-eyebrow" style="margin-bottom:.6rem;">Key Partners</h5><ul style="list-style:none;display:flex;flex-direction:column;gap:.5rem;">${s.partners.map(p=>`<li style="display:flex;gap:.5rem;align-items:center;font-size:.86rem;font-weight:500;"><span style="width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;"></span> ${p}</li>`).join('')}</ul></div>
          <div class="yer-card" style="background:rgba(52,211,153,.1);border-left:4px solid var(--green);display:flex;flex-direction:column;justify-content:center;"><h5 class="yer-eyebrow" style="color:var(--green);margin-bottom:.4rem;">Tangible Outcome</h5><p style="font-size:1.4rem;font-weight:800;color:var(--green);line-height:1.15;">${s.outcome}</p></div>
        </div></div>`;
    }
    const framework=`<div class="yer-card" style="background:var(--soft);">
      <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:1.25rem;"><span class="yer-icchip" style="width:42px;height:42px;background:var(--accent);color:var(--on-accent);">${I('network',null,'sm')}</span><div><h3 style="font-size:1.15rem;">Strategic Alignment Framework</h3><p class="yer-muted" style="font-size:.84rem;">How local needs inform and align with University goals.</p></div></div>
      <div class="yer-grid yer-g3">${strategyWeb.map(it=>`<button class="yer-card yer-clickable" data-strategy="${it.id}" style="text-align:left;${state.strategy===it.id?'border-color:var(--accent);background:var(--accent);color:var(--on-accent);':''}"><div style="display:flex;align-items:center;gap:.6rem;"><span class="yer-icchip" style="width:40px;height:40px;${state.strategy===it.id?'background:rgba(255,255,255,.2);':''}">${I(it.icon,state.strategy===it.id?null:'accent')}</span><h4 style="font-size:1.05rem;">${it.goal}</h4></div><p style="font-size:.82rem;margin-top:.5rem;${state.strategy===it.id?'opacity:.85;':'color:var(--muted2);'}">Click to explore alignment</p></button>`).join('')}</div>
      ${detail}
    </div>`;
    const engine=`<div class="yer-band" style="padding:2rem;">
      <h4 style="font-size:1.4rem;display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;">${I('layout-grid','yellow')} The Technology Engine</h4>
      <p style="color:var(--muted2);margin-bottom:1.5rem;max-width:640px;">Moving from fragmented, local tools to unified enterprise platforms. This stack powers our operational efficiency and enables scalable support.</p>
      <div class="yer-grid yer-g4">${techStack.map(st=>`<div class="yer-card" style="background:rgba(255,255,255,.07);border-color:var(--line2);"><h5 class="yer-eyebrow" style="color:var(--yellow);border-bottom:1px solid var(--line2);padding-bottom:.4rem;margin-bottom:.5rem;">${st.category}</h5><ul style="list-style:none;display:flex;flex-direction:column;gap:.35rem;">${st.tools.map(t=>`<li style="font-size:.84rem;display:flex;align-items:center;gap:.4rem;"><span style="width:4px;height:4px;border-radius:50%;background:currentColor;"></span>${t}</li>`).join('')}</ul></div>`).join('')}</div>
    </div>`;
    const portfolioCard=(p,idx,color)=>`<div class="yer-card yer-clickable" data-project="${idx}" style="border-left:3px solid ${color};display:flex;flex-direction:column;"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.6rem;"><span class="yer-badge">${p.category}</span>${I('chevron-right','accent','sm')}</div><h3 style="font-size:1.05rem;margin-bottom:.6rem;line-height:1.3;">${p.title}</h3><div style="margin-top:auto;">${p.metrics.slice(0,2).map(m=>BADGE(m)).join('')}</div></div>`;
    const portfolio=`<div>
      <div class="yer-sh"><h2>Operational Portfolio</h2><p>Ongoing initiatives driving daily efficiency and student success.</p></div>
      <h4 class="yer-eyebrow" style="border-left:3px solid var(--accent);padding-left:.6rem;margin-bottom:1rem;">Core Systems & Infrastructure</h4>
      <div class="yer-grid yer-g3" style="margin-bottom:1.75rem;">${[2,3,5].map(i=>portfolioCard(projects[i],i,'var(--accent)')).join('')}</div>
      <h4 class="yer-eyebrow" style="border-left:3px solid var(--yellow);padding-left:.6rem;margin-bottom:1rem;">Innovation & Enablement</h4>
      <div class="yer-grid yer-g3">${[1,4,6].map(i=>portfolioCard(projects[i],i,'var(--yellow)')).join('')}</div>
    </div>`;
    return SH("Strategy & Projects","Connecting University goals to specific projects, partners, and outcomes.")
      +spotlight+`<div style="height:1.5rem;"></div>`+archive+`<div style="height:1.5rem;"></div>`+framework+`<div style="height:1.5rem;"></div>`+engine+`<div style="height:1.5rem;"></div>`+portfolio
      +nextBtn('ai-ecosystem.html','Explore AI Ecosystem');
  }

  function tAi(){
    const loop=`<div class="yer-band" style="padding:2rem;margin-bottom:1.5rem;">
      <h3 class="yer-eyebrow" style="text-align:center;letter-spacing:.18em;margin-bottom:1.5rem;">The Theory-to-Practice Loop</h3>
      <div class="yer-loop">${aiCycle.map(st=>`<div class="yer-loop-step"><div class="yer-loop-circle" style="background:#fff;color:#2d1f4e;border-color:rgba(255,255,255,.4);">${I(st.icon)}</div><h4 style="font-size:.95rem;margin-bottom:.4rem;">${st.stage}</h4><p style="font-size:.78rem;color:var(--muted2);margin-bottom:.5rem;">${st.description}</p><span style="font-size:.72rem;font-weight:700;color:#241038;background:var(--yellow);padding:.2rem .55rem;border-radius:999px;">Result: ${st.output}</span></div>`).join('')}</div>
    </div>`;
    const curric=`<div class="yer-grid" style="grid-template-columns:1fr 2fr;gap:1.25rem;margin-bottom:1.5rem;">
      <div class="yer-card" style="background:var(--soft);"><h4 style="display:flex;align-items:center;gap:.5rem;margin-bottom:.6rem;">${I('file-text','accent','sm')} Practical Curriculum</h4><p class="yer-muted" style="font-size:.85rem;margin-bottom:.85rem;">Based on my "AI Tools &amp; Best Practices" presentation, we teach 10 core skills to staff:</p><ul style="list-style:none;display:flex;flex-direction:column;gap:.5rem;font-size:.82rem;">${lunchLearnCurriculum.slice(0,5).map(it=>`<li style="display:flex;gap:.5rem;align-items:center;"><span style="width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;"></span>${it}</li>`).join('')}</ul></div>
      <div class="yer-card"><h4 style="margin-bottom:.5rem;">How It Weaves Together</h4><p class="yer-muted" style="font-size:.9rem;line-height:1.7;margin-bottom:1.25rem;">The <strong>Research</strong> (a doctoral research workshop) provides the theoretical framework. This informs the <strong>Strategy</strong> (Balanced Scorecard), which mandates the creation of support structures. These structures are validated through <strong>Community Practice</strong> (Lunch &amp; Learns), creating a continuous feedback loop.</p><div style="display:flex;gap:1.5rem;flex-wrap:wrap;"><div><div style="font-family:var(--serif);font-size:1.6rem;font-weight:800;color:var(--accent);">92%</div><div class="yer-eyebrow">Confidence Boost</div></div><div><div style="font-family:var(--serif);font-size:1.6rem;font-weight:800;color:var(--accent);">100+</div><div class="yer-eyebrow">CoP Members</div></div><div><div style="font-family:var(--serif);font-size:1.6rem;font-weight:800;color:var(--green);">New</div><div class="yer-eyebrow">HBCU Research Network</div></div></div></div>
    </div>`;
    const pv=promptVault[state.prompt];
    const vault=`<div class="yer-card" style="background:var(--soft);margin-bottom:1.5rem;">
      <h3 style="display:flex;align-items:center;gap:.5rem;color:var(--accent);margin-bottom:.5rem;">${I('file-text','accent')} Interactive Prompt Vault</h3>
      <p class="yer-muted" style="font-size:.9rem;margin-bottom:1.25rem;max-width:640px;">Browse the actual teaching materials from our workshops. Select a category to see the optimized prompts we provide to Yale staff.</p>
      <div class="yer-grid" style="grid-template-columns:1fr 2fr;gap:1.25rem;">
        <div>${promptVault.map((it,i)=>`<button class="yer-pick${state.prompt===i?' active':''}" data-prompt="${i}">${it.category}</button>`).join('')}</div>
        <div class="yer-card"><span class="yer-eyebrow">Example Prompt</span><p style="font-family:var(--serif);font-size:1.15rem;line-height:1.6;margin:.6rem 0 1rem;">"${pv.prompt}"</p><div style="background:var(--soft);border:1px solid var(--line2);border-radius:8px;padding:.75rem;font-size:.82rem;display:flex;gap:.5rem;align-items:flex-start;">${I('lightbulb','yellow','sm')}<span><strong>Why it works:</strong> ${pv.desc}</span></div></div>
      </div>
    </div>`;
    const fw=aiDecisionFramework.find(f=>f.id===state.framework);
    const result=fw?`<div class="yer-card yer-reveal"><span class="yer-eyebrow">Recommended Tool</span><h4 style="font-size:1.8rem;color:var(--accent);margin:.3rem 0 .4rem;">${fw.tool}</h4><p class="yer-muted">${fw.desc}</p></div>`:`<div class="yer-card" style="border-style:dashed;text-align:center;color:var(--muted2);display:flex;align-items:center;justify-content:center;min-height:150px;">Select a task type to see the recommendation.</div>`;
    const framework=`<div class="yer-band" style="padding:2rem;margin-bottom:1.5rem;"><div class="yer-grid" style="grid-template-columns:1fr 1fr;gap:1.5rem;align-items:center;"><div><h3 style="display:flex;align-items:center;gap:.5rem;font-size:1.4rem;margin-bottom:.4rem;">${I('zap','yellow')} AI Decision Framework</h3><p style="color:var(--muted2);font-size:.88rem;margin-bottom:1.25rem;">Interactive tool developed for staff training. Click a need to see the recommended Yale tool.</p><div class="yer-grid yer-g2" style="gap:.6rem;">${aiDecisionFramework.map(f=>`<button class="yer-pick${state.framework===f.id?' active':''}" data-framework="${f.id}" style="margin:0;${state.framework===f.id?'background:var(--yellow);color:#241038;border-color:var(--yellow);':''}">${f.label}</button>`).join('')}</div></div><div>${result}</div></div></div>`;
    return SH("The Integrated AI Ecosystem","How Research, Strategy, and Community weave together to drive adoption.")
      +loop+curric+vault+framework+nextBtn('community-engagement.html','Explore Community & Engagement');
  }

  function tCommunity(){
    const advisory=`<div class="yer-band" style="padding:2rem;display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;">
      <div style="flex:1;min-width:260px;"><span class="yer-badge" style="background:var(--yellow);color:#241038;border-color:var(--yellow);">Strategic Spotlight</span><h3 style="font-family:var(--serif);font-size:1.6rem;display:flex;align-items:center;gap:.5rem;margin:.5rem 0 .75rem;">${I('message-circle','yellow')} Yale College IT Advisory</h3><p style="color:var(--muted2);line-height:1.7;font-size:1.02rem;margin-bottom:1rem;">"Convening Deans, Faculty, Staff, and ITS leadership in a unified forum. This group has become the primary engine for aligning central IT services with the unique academic mission of Yale College."</p><div style="display:flex;gap:.75rem;flex-wrap:wrap;"><div style="background:rgba(255,255,255,.08);border:1px solid var(--line2);border-radius:8px;padding:.5rem .9rem;"><span style="display:block;font-size:1.1rem;font-weight:800;">Monthly</span><span class="yer-eyebrow" style="color:var(--muted2);">Cadence</span></div><div style="background:rgba(255,255,255,.08);border:1px solid var(--line2);border-radius:8px;padding:.5rem .9rem;"><span style="display:block;font-size:1.1rem;font-weight:800;">Direct</span><span class="yer-eyebrow" style="color:var(--muted2);">Provost Access</span></div></div></div>
      <span class="yer-icchip" style="width:90px;height:90px;background:rgba(255,255,255,.06);">${I('users',null,'xl')}</span>
    </div>`;
    const matrix=`<div style="margin-top:1.5rem;"><div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;"><div style="flex:1;height:1px;background:var(--line2);"></div><h3 class="yer-eyebrow">Engagement Ecosystem</h3><div style="flex:1;height:1px;background:var(--line2);"></div></div>
      <div class="yer-grid yer-g3">${engagementData.filter(it=>it.title!=="Yale College IT Advisory").map(it=>`<div class="yer-card"><div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.85rem;"><span class="yer-icchip">${I(it.icon,'accent')}</span><h4 style="font-size:.95rem;line-height:1.25;">${it.title}</h4></div><div style="margin-bottom:.75rem;"><span class="yer-chip">${it.stats}</span></div><p class="yer-muted" style="font-size:.88rem;line-height:1.6;">${it.detail}</p></div>`).join('')}</div></div>`;
    const mentor=`<div class="yer-card" style="background:var(--soft);margin-top:1.5rem;"><div style="text-align:center;margin-bottom:1.5rem;"><span class="yer-eyebrow">Student &amp; Staff Success</span><h3 style="font-family:var(--serif);font-size:1.5rem;color:var(--accent);margin:.25rem 0;">Mentorship &amp; Talent Development</h3><p class="yer-muted" style="max-width:620px;margin:0 auto;">Strategic engagement that exemplifies innovative leadership—from advising first-year students to empowering student developers on critical IT projects.</p></div>
      <div class="yer-grid yer-g3">${studentStories.map(s=>`<div class="yer-card" style="display:flex;flex-direction:column;"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.75rem;"><span class="yer-icchip" style="width:42px;height:42px;">${I(s.icon,'accent','sm')}</span><span class="yer-eyebrow" style="font-size:.62rem;">${s.role}</span></div><h4 style="font-size:1.05rem;margin-bottom:.5rem;">${s.title}</h4><p class="yer-muted" style="font-size:.85rem;line-height:1.6;flex-grow:1;margin-bottom:.85rem;">${s.description}</p><div style="border-top:1px solid var(--line2);padding-top:.6rem;"><span style="font-size:.76rem;font-weight:700;color:var(--accent);display:flex;align-items:center;gap:.4rem;">${I('sparkles','yellow','sm')} ${s.outcome}</span></div></div>`).join('')}
        <div class="yer-card" style="display:flex;flex-direction:column;"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.75rem;"><span class="yer-icchip" style="width:42px;height:42px;">${I('globe','accent','sm')}</span><span class="yer-eyebrow" style="font-size:.62rem;">Strategic Networking</span></div><h4 style="font-size:1.05rem;margin-bottom:.5rem;">ASCEND Initiative</h4><p class="yer-muted" style="font-size:.85rem;line-height:1.6;flex-grow:1;margin-bottom:.85rem;">Attended networking meetings to develop connections with HBCU researchers. Established initial contact for future collaborative opportunities.</p><div style="border-top:1px solid var(--line2);padding-top:.6rem;"><span style="font-size:.76rem;font-weight:700;color:var(--accent);display:flex;align-items:center;gap:.4rem;">${I('network','yellow','sm')} Expanded Research Network</span></div></div>
      </div></div>`;
    const podcast=`<div class="yer-band" style="--band:#15131c;background:#15131c;padding:2rem;margin-top:1.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;"><div><span class="yer-eyebrow" style="color:var(--muted2);">Digital Community</span><h3 style="font-size:1.6rem;display:flex;align-items:center;gap:.6rem;margin-top:.2rem;">${I('mic','pink','lg')} Yale College Voices</h3><p class="yer-muted" style="margin-top:.3rem;">Hosted &amp; Produced by Darice Corey</p></div><span style="background:var(--pink);color:#fff;padding:.5rem .9rem;border-radius:8px;font-weight:700;font-size:.85rem;">${podcastMetrics.totalGrowth} Digital Growth</span></div>
      <p class="yer-eyebrow" style="margin-bottom:.6rem;color:var(--muted2);">Available On</p>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.5rem;">${podcastMetrics.platforms.map(p=>`<a href="${p.url}" target="_blank" rel="noopener noreferrer" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);padding:.3rem .75rem;border-radius:999px;font-size:.8rem;display:inline-flex;align-items:center;gap:.4rem;text-decoration:none;color:#fff;">${I(p.name==="YouTube"?'video':'headphones',p.name==="YouTube"?'red':'blue','sm')} ${p.name}</a>`).join('')}</div>
      <div class="yer-grid yer-g4">${podcastMetrics.socialBreakdown.map(s=>`<div class="yer-card" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14);"><div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;">${I(s.icon,null,'sm')}<span style="font-weight:700;">${s.platform}</span></div><div style="font-size:1.5rem;font-weight:800;">${s.count}</div><div class="yer-muted" style="font-size:.72rem;">Followers</div>${s.engagement!=="N/A"?`<div style="margin-top:.5rem;font-size:.72rem;font-weight:600;color:var(--green);">${s.engagement} Engagement</div>`:''}</div>`).join('')}</div>
      <div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,.14);display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">${I('trending-up','yellow','sm')}<span style="font-weight:600;font-size:.85rem;">Trending:</span><span class="yer-muted" style="font-size:.85rem;font-style:italic;">${podcastMetrics.topContent}</span></div>
    </div>`;
    return SH("Community & Engagement","Convening cross-unit forums, mentoring talent, and amplifying community stories.")
      +advisory+matrix+mentor+podcast+nextBtn('impact.html','Explore Impact Stories');
  }

  function tImpact(){
    const roleBox=`<div class="yer-band" style="padding:2rem;margin-bottom:1.5rem;"><h3 style="font-family:var(--serif);font-size:1.5rem;text-align:center;margin-bottom:1.5rem;">Impact by Role</h3>
      <div class="yer-grid yer-g3">${roleImpacts.map(r=>`<div class="yer-card" style="background:rgba(255,255,255,.06);border-color:var(--line2);display:flex;flex-direction:column;"><div style="text-align:center;border-bottom:1px solid var(--line2);padding-bottom:.85rem;margin-bottom:.85rem;"><span class="yer-icchip" style="background:var(--yellow);color:#241038;margin:0 auto .5rem;">${I(r.icon,null,'sm')}</span><h4 style="font-size:1.15rem;">${r.role}</h4></div><div style="display:flex;flex-direction:column;gap:.6rem;">${r.impacts.map(im=>`<div style="background:rgba(0,0,0,.18);border:1px solid var(--line2);border-radius:8px;padding:.6rem .75rem;"><div style="display:flex;gap:.5rem;align-items:flex-start;">${I('check-circle','green','sm')}<div><p style="font-weight:600;font-size:.85rem;margin-bottom:.35rem;line-height:1.3;">${im.label}</p><span style="font-size:.64rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted2);background:rgba(0,0,0,.2);border:1px solid var(--line2);padding:.15rem .4rem;border-radius:4px;display:inline-flex;align-items:center;gap:.3rem;">${I('info',null,'sm')} ${im.project}</span></div></div></div>`).join('')}</div></div>`).join('')}</div></div>`;
    const voices=`<h3 style="display:flex;align-items:center;gap:.5rem;color:var(--accent);margin-bottom:1rem;">${I('message-circle','accent')} Voices of the Community</h3>
      <div class="yer-grid yer-g2" style="margin-bottom:1.5rem;">${testimonials.map(t=>`<div class="yer-card" style="position:relative;overflow:hidden;"><p style="font-style:italic;line-height:1.6;margin-bottom:1rem;">"${t.text}"</p><div style="display:flex;align-items:center;gap:.5rem;"><span style="width:28px;height:3px;background:var(--accent);border-radius:2px;"></span><span style="font-size:.78rem;font-weight:700;">${t.author}</span><span class="yer-muted" style="font-size:.78rem;">• ${t.context}</span></div></div>`).join('')}</div>`;
    const trans=`<div class="yer-card" style="background:var(--soft);margin-bottom:1.5rem;"><h3 style="display:flex;align-items:center;gap:.5rem;color:var(--accent);margin-bottom:1.25rem;">${I('refresh-cw','green')} Operational Transformation</h3><div style="display:flex;flex-direction:column;gap:1rem;">${transformations.map(tr=>`<div class="yer-card" style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;"><div style="flex:1;min-width:200px;"><h4 style="margin-bottom:.4rem;">${tr.area}</h4><span style="font-size:.74rem;font-weight:600;color:var(--red);background:rgba(248,113,113,.14);padding:.2rem .5rem;border-radius:5px;">BEFORE: ${tr.before}</span></div>${I('arrow-left-right','muted2')}<div style="flex:1;min-width:200px;"><span style="font-size:.74rem;font-weight:600;color:var(--green);background:rgba(52,211,153,.14);padding:.2rem .5rem;border-radius:5px;display:inline-block;margin-bottom:.4rem;">AFTER: ${tr.after}</span><p class="yer-muted" style="font-size:.85rem;">${tr.impact}</p></div></div>`).join('')}</div></div>`;
    const talent=`<div class="yer-card"><h3 style="display:flex;align-items:center;gap:.5rem;color:var(--accent);margin-bottom:.85rem;">${I('user-plus','accent')} Talent Development Outcomes</h3><p class="yer-muted" style="line-height:1.7;margin-bottom:1.5rem;">"My engagement with students this year has been a highlight... serving as a college fellow and adviser, mentoring interns, and spearheading student-driven initiatives modeled the values of inclusive leadership. These experiences reinforced that empowering others is a powerful catalyst for organizational success."</p><div class="yer-grid yer-g4">${studentImpactStats.map(s=>`<div class="yer-stat" style="background:var(--soft);"><div class="num">${s.value}</div><div class="lbl">${s.label}</div></div>`).join('')}</div></div>`;
    return SH("Impact Stories","Voices of the community and the tangible difference made.")
      +roleBox+voices+trans+talent+nextBtn('leadership-growth.html','Explore Leadership & Growth');
  }

  function tLeadershipGrowth(){
    const dba=`<div class="yer-band" style="padding:2rem;margin-bottom:1.5rem;display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;justify-content:space-between;">
      <div style="flex:1;min-width:260px;"><div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-bottom:.6rem;"><span class="yer-badge" style="background:var(--yellow);color:#241038;border-color:var(--yellow);">Scholar-Practitioner</span><span style="font-size:.8rem;color:var(--muted2);display:flex;align-items:center;gap:.3rem;">${I('check-circle',null,'sm')} Accepted Spring 2025</span></div><h3 style="font-family:var(--serif);font-size:1.6rem;margin-bottom:.25rem;">Doctorate of Business Administration</h3><p style="color:var(--muted2);font-size:1.05rem;">Fairfield University</p></div>
      <div style="background:rgba(255,255,255,.08);border:1px solid var(--line2);border-radius:10px;padding:1rem;min-width:200px;"><p class="yer-eyebrow" style="color:var(--muted2);margin-bottom:.3rem;">Current Status</p><p style="font-weight:600;font-size:.9rem;">6 Months Completed</p><div style="height:6px;background:rgba(0,0,0,.25);border-radius:999px;margin-top:.5rem;overflow:hidden;"><div style="height:100%;width:16%;background:var(--yellow);"></div></div><p style="font-size:.66rem;color:var(--muted2);text-align:right;margin-top:.25rem;">3-Year Program</p></div>
    </div>`;
    const ext=`<div class="yer-grid yer-g3" style="margin-bottom:1.5rem;">
      ${externalLeadership.map(it=>`<div class="yer-card"><span class="yer-eyebrow">${it.org}</span><h4 style="font-size:1.1rem;margin:.3rem 0;">${it.topic}</h4><span class="yer-badge">${it.role}</span><p class="yer-muted" style="font-size:.86rem;line-height:1.6;margin-top:.6rem;">${it.details}</p></div>`).join('')}
      <div class="yer-band" style="padding:1.5rem;"><h4 style="font-size:1.2rem;display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;">${I('award','yellow')} Fellowships</h4><ul style="list-style:none;display:flex;flex-direction:column;gap:.85rem;"><li style="border-bottom:1px solid var(--line2);padding-bottom:.75rem;"><strong style="display:block;color:var(--yellow);margin-bottom:.2rem;">EDUCAUSE Next Leaders</strong><span style="color:var(--muted2);font-size:.85rem;">Completed strategic capstone on AI support models.</span></li><li><strong style="display:block;color:var(--yellow);margin-bottom:.2rem;">Vantage CIO Lounge</strong><span style="color:var(--muted2);font-size:.85rem;">Executive insights on governance shaping IT Town Hall agendas.</span></li></ul></div>
    </div>`;
    const growthEngine=`<div class="yer-card" style="background:var(--soft);margin-bottom:1.5rem;"><div style="text-align:center;margin-bottom:1.5rem;"><h3 style="font-family:var(--serif);font-size:1.4rem;">The Growth Engine</h3><p class="yer-muted">The cyclical flow of mentorship: gaining wisdom to empower others.</p></div>
      <div class="yer-grid yer-g3" style="align-items:center;margin-bottom:1.75rem;">
        <div class="yer-card" style="border-left:4px solid var(--green);"><h4 style="display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;">${I('target','green','sm')} Guidance Received</h4><ul style="list-style:none;display:flex;flex-direction:column;gap:.6rem;">${mentorshipFlow.received.map(m=>`<li style="border-bottom:1px solid var(--line2);padding-bottom:.5rem;"><span style="font-weight:600;font-size:.86rem;">${m.focus}</span></li>`).join('')}</ul></div>
        <div style="text-align:center;"><div class="yer-icchip" style="width:70px;height:70px;background:var(--accent);color:var(--on-accent);margin:0 auto;">${I('refresh-cw',null,'lg yer-spin')}</div><div style="margin-top:.85rem;font-weight:700;color:var(--accent);font-size:.85rem;">Knowledge Synthesis</div></div>
        <div class="yer-card" style="border-right:4px solid var(--blue);text-align:right;"><h4 style="display:flex;align-items:center;gap:.5rem;justify-content:flex-end;margin-bottom:1rem;">Impact Delivered ${I('user-plus','blue','sm')}</h4><ul style="list-style:none;display:flex;flex-direction:column;gap:.6rem;">${mentorshipFlow.given.map(m=>`<li style="border-bottom:1px solid var(--line2);padding-bottom:.5rem;"><span style="font-weight:700;display:block;font-size:.86rem;">${m.group}</span><span class="yer-muted" style="font-size:.76rem;">${m.detail}</span></li>`).join('')}</ul></div>
      </div>
      <div style="border-top:1px solid var(--line2);padding-top:1.25rem;"><h4 style="display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;">${I('users','indigo')} Strategic Mentorship Network</h4><div style="display:flex;flex-direction:column;gap:.6rem;">${externalMentors.map(m=>`<div class="yer-card" style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center;"><div style="flex:1;min-width:220px;"><h5 style="font-size:.88rem;">${m.name}, <span style="font-weight:400;color:var(--muted2);">${m.role}</span></h5><p style="font-size:.8rem;color:var(--indigo);font-style:italic;margin-top:.2rem;">"${m.insight}"</p></div><div style="text-align:right;min-width:160px;"><span style="font-size:.7rem;font-weight:700;color:var(--indigo);background:var(--soft);padding:.2rem .5rem;border-radius:5px;display:inline-block;margin-bottom:.3rem;">${m.focus}</span><p class="yer-muted" style="font-size:.76rem;"><strong>Impact:</strong> ${m.impact}</p></div></div>`).join('')}</div></div>
    </div>`;
    const foundation=`<div><div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;"><div style="flex:1;height:1px;background:var(--line2);"></div><h3 style="font-family:var(--serif);font-size:1.4rem;">Professional Foundation</h3><div style="flex:1;height:1px;background:var(--line2);"></div></div>
      <div class="yer-grid yer-g3" style="margin-bottom:1.25rem;">${credentials.map(c=>`<div class="yer-card" style="display:flex;flex-direction:column;"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem;"><span class="yer-eyebrow">${c.issuer}</span>${I('check-circle','green','sm')}</div><h4 style="margin-bottom:.25rem;">${c.title}</h4><p style="font-size:.78rem;color:var(--accent);margin-bottom:.6rem;">${c.date}</p><p class="yer-muted" style="font-size:.84rem;line-height:1.5;flex-grow:1;">${c.skills}</p></div>`).join('')}
        <div class="yer-card" style="background:var(--soft);text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;">${I('shield-check','green','xl')}<h4 style="margin:.5rem 0 .25rem;">Digital Verification</h4><p class="yer-muted" style="font-size:.8rem;margin-bottom:.85rem;">View validated credentials on external platforms.</p><div style="display:flex;gap:.5rem;"><a href="https://www.credly.com/users/darice-corey/badges#credly" target="_blank" rel="noreferrer" class="btn-ghost" style="padding:.4rem .8rem;font-size:.74rem;">Credly</a><a href="https://learn.microsoft.com/en-us/users/daricecorey/" target="_blank" rel="noreferrer" class="btn-ghost" style="padding:.4rem .8rem;font-size:.74rem;">MS Learn</a></div></div>
      </div>
      <div class="yer-card"><h5 class="yer-eyebrow" style="display:flex;align-items:center;gap:.4rem;margin-bottom:.75rem;">${I('file-check','teal','sm')} Research Ethics &amp; Compliance (CITI Program)</h5><div style="display:flex;flex-wrap:wrap;gap:.5rem;">${citiCerts.map(c=>`<a href="${c.link}" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;gap:.35rem;background:var(--soft);border:1px solid var(--line2);color:var(--text);padding:.35rem .7rem;border-radius:999px;font-size:.76rem;font-weight:500;text-decoration:none;">${c.title} ${I('external-link','muted2','sm')}</a>`).join('')}</div></div>
    </div>`;
    return `<div>${SH("Leadership & Influence","Growing talent, visibility, and influence across the University and Higher Ed community.")}${dba}${ext}</div>${growthEngine}${foundation}${nextBtn('future.html','See The Future Roadmap')}`;
  }

  function tFuture(){
    const risk=`<div class="yer-band" style="padding:2rem;margin-bottom:1.5rem;border-left:8px solid var(--yellow);"><h3 style="font-family:var(--serif);font-size:1.5rem;display:flex;align-items:center;gap:.6rem;margin-bottom:.75rem;">${I('alert-triangle','yellow')} The Risk of Reversion</h3><p style="color:var(--muted2);line-height:1.8;font-size:1.05rem;max-width:760px;">"To revert now would be to leave a story half-written. The risk of stopping is not just stagnation, but regression – silo walls could creep back up, and opportunities could be missed."</p></div>`;
    const roadmap=`<div class="yer-card" style="margin-bottom:1.5rem;"><h3 style="display:flex;align-items:center;gap:.5rem;color:var(--accent);margin-bottom:1.5rem;">${I('clock','accent')} Strategic Roadmap: The Next Phase</h3><div class="yer-timeline">${timelineEvents.map(e=>`<div class="yer-tl-item"><div class="yer-tl-dot">${e.q}</div><h4 style="font-size:.85rem;margin:.2rem 0;">${e.title}</h4><p class="yer-muted" style="font-size:.75rem;">${e.desc}</p></div>`).join('')}</div></div>`;
    const reasons=`<h3 style="font-size:1.2rem;margin-bottom:1rem;">Five Strategic Pillars for Continuance</h3><div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1rem;">${futureReasons.map((r,i)=>`<div class="yer-card yer-clickable" data-future="${i}" style="border-left:4px solid ${state.future===i?'var(--accent)':'var(--line2)'};${state.future===i?'background:var(--soft);':''}"><div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;"><div style="display:flex;align-items:center;gap:1rem;"><span style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;${state.future===i?'background:var(--accent);color:var(--on-accent);':'background:var(--soft);color:var(--muted2);'}">${i+1}</span><h4 style="font-size:1.05rem;color:${state.future===i?'var(--accent)':'var(--text)'};">${r.title}</h4></div><span style="transform:rotate(${state.future===i?'90':'0'}deg);transition:transform .3s;flex-shrink:0;">${I('arrow-right','muted2','sm')}</span></div>${state.future===i?`<div class="yer-reveal" style="padding-left:3rem;margin-top:.75rem;border-top:1px solid var(--line2);padding-top:.85rem;"><p class="yer-muted" style="line-height:1.7;margin-bottom:.6rem;">${r.desc}</p><span style="display:inline-flex;align-items:center;gap:.4rem;background:var(--soft);color:var(--accent);border:1px solid var(--line2);padding:.25rem .6rem;border-radius:999px;font-size:.74rem;font-weight:700;">${I('target',null,'sm')} ${r.connection}</span></div>`:''}</div>`).join('')}</div><p style="text-align:center;color:var(--muted2);font-size:.78rem;font-style:italic;margin-bottom:1.5rem;">Tap on a pillar to explore the strategic rationale.</p>`;
    const concl=`<div class="yer-band" style="padding:2.5rem;text-align:center;"><h3 style="font-family:var(--serif);font-size:1.6rem;display:flex;align-items:center;justify-content:center;gap:.6rem;margin-bottom:1.5rem;">${I('sparkles','yellow')} Conclusion</h3><p style="font-size:1.15rem;line-height:1.8;max-width:720px;margin:0 auto 1.5rem;font-style:italic;color:var(--muted2);">"This stretch opportunity has been transformative. We turned a 'blank slate' into a year of connecting systems, people, and initiatives. The forward-thinking, partnership-driven approach clearly works. By maintaining this role, I will keep leveraging what I’ve learned to drive further positive change."</p><span style="display:inline-block;background:var(--yellow);color:#241038;padding:.85rem 2rem;border-radius:999px;font-weight:800;font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;">The work is far from done.</span></div>`;
    return SH("Why This Work Must Continue","The case for an expanded scope to maintain momentum and value.")+risk+roadmap+reasons+concl;
  }

  const RENDERERS = {
    'overview':tOverview,'strategy-projects':tStrategyProjects,'ai-ecosystem':tAi,
    'community-engagement':tCommunity,'impact':tImpact,'leadership-growth':tLeadershipGrowth,'future':tFuture
  };

  /* ---------------- WIRING ---------------- */
  const tabsEl = document.getElementById('yer-tabs');
  const contentEl = document.getElementById('yer-content');
  const overlay = document.getElementById('yer-overlay');
  const modal = document.getElementById('yer-modal');

  const currentTab = (contentEl && contentEl.dataset.yerTab) || 'overview';
  if(RENDERERS[currentTab]) state.tab = currentTab;

  tabsEl.innerHTML = navItems.map(([id,label])=>`<a class="yer-tab" role="tab" data-tab="${id}" href="${id==='overview'?'index.html':id+'.html'}">${label}</a>`).join('');

  function refreshIcons(){ /* icons are inlined as SVG; nothing to hydrate */ }

  function renderPanel(){
    contentEl.innerHTML = `<div class="yer-panel active">${(RENDERERS[state.tab]||tOverview)()}</div>`;
    Array.from(tabsEl.children).forEach(b=>{
      const on = b.dataset.tab===state.tab;
      b.classList.toggle('active', on);
      if(on) b.setAttribute('aria-selected','true'); else b.removeAttribute('aria-selected');
    });
  }

  function openModal(idx){
    const p = projects[idx]; if(!p) return;
    modal.innerHTML = `
      <button class="yer-modal-close" data-modal-close aria-label="Close">${I('x')}</button>
      <span class="yer-eyebrow">${p.category}</span>
      <h3 style="font-family:var(--serif);font-size:1.5rem;color:var(--cream);margin:.4rem 0 .85rem;">${p.title}</h3>
      <div style="margin-bottom:1rem;">${p.metrics.map(m=>BADGE(m)).join('')}</div>
      <p style="color:var(--muted);line-height:1.8;margin-bottom:1.25rem;">${p.description}</p>
      <div style="background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:1rem;">
        <span class="yer-eyebrow" style="color:var(--muted);">Impact</span>
        <p style="color:var(--green);font-weight:600;display:flex;align-items:center;gap:.5rem;margin-top:.3rem;">${I('check-circle','green','sm')} ${p.impact}</p>
      </div>`;
    overlay.hidden = false;
  }
  function closeModal(){ overlay.hidden = true; modal.innerHTML=''; }

  document.addEventListener('click', function(e){
    const t = e.target.closest('[data-strategy],[data-prompt],[data-framework],[data-future],[data-project],[data-modal-close]');
    if(!t) return;
    if(t.dataset.strategy!=null){ state.strategy = t.dataset.strategy; renderPanel(); }
    else if(t.dataset.prompt!=null){ state.prompt = parseInt(t.dataset.prompt,10); renderPanel(); }
    else if(t.dataset.framework!=null){ state.framework = t.dataset.framework; renderPanel(); }
    else if(t.dataset.future!=null){ const i=parseInt(t.dataset.future,10); state.future = (state.future===i)?null:i; renderPanel(); }
    else if(t.dataset.project!=null){ openModal(parseInt(t.dataset.project,10)); }
    else if(t.hasAttribute('data-modal-close')){ closeModal(); }
  });
  overlay.addEventListener('click', function(e){ if(e.target===overlay) closeModal(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && !overlay.hidden) closeModal(); });

  renderPanel();
  refreshIcons();
  const activeTab = tabsEl.querySelector('.yer-tab.active');
  if(activeTab) activeTab.scrollIntoView({block:'nearest',inline:'center'});
})();
