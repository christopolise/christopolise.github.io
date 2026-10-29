# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

kitras.dev is the personal academic site of Christopher Kitras, a PhD candidate in Electrical and Computer Engineering at Brigham Young University. It serves three audiences in roughly equal measure; none takes priority over the others:

- **Industry recruiters and hiring managers** for research or engineering roles. They skim quickly and want the resume, the projects, and evidence of impact.
- **Academic hiring** (faculty search committees and postdoc PIs). They read the publication record, the venues, and the research direction closely.
- **Research peers** (collaborators, reviewers, and conference contacts). They usually arrive looking for one specific paper, poster, deck, or code repository after meeting Christopher or reading his work.

## Product Purpose

A single place where anyone evaluating or following Christopher's work can:

1. **Understand the research quickly.** He makes systems more intelligent, adaptable, and resilient: sensor networks, IoT resilience, and systems engineering, with a focus on extending the capability of simple systems *without adding extra hardware*.
2. **Read the work.** Open a publication, poster, or presentation and see its contribution.
3. **Take the CV or resume** as a PDF to evaluate offline or pass along.
4. **Get in touch** by email or LinkedIn about a role or a collaboration.

A visit succeeds when the visitor leaves with any of these done, and none of them should depend on serving a different audience first.

## Positioning

The site presents one researcher's real body of work: peer-reviewed papers (DySPAN 2025, 6 GHz stadium WiFi, crowd-sourced sensor location verification, radon and indoor air quality studies including Mongolian gers), posters, and course and lab projects. The through-line is a single research claim: getting more intelligence and resilience out of existing, simple systems rather than out of added hardware. Every page should make that claim, and the real artifacts behind it, easy to verify.

## Operating Context

- Visitors arrive from email signatures, LinkedIn, Google Scholar, conference contacts, and job applications. They often land on the home page and scan it, or follow a direct link to one publication or project.
- The CV and resume are PDFs that visitors download and forward. They are maintained outside the site and dropped into `assets/`.
- Christopher adds new work by writing a markdown file with front matter (title, authors with his name bolded, venue, figure, PDF link, extra `links`). That workflow is part of the product.

## Capabilities and Constraints

- **Stack:** Jekyll 4 with no theme gem, built by the GitHub Actions workflow in `.github/workflows/jekyll.yml` (on pushes to `master`) and hosted on GitHub Pages at `kitras.dev` (`CNAME`). Layouts: `base`, `home`, `page`. Plain CSS in `assets/css/site.css`, with no Sass. Long-form explainers from an earlier version are kept unpublished in `_archive/`.
- **Content model:** three collections, `_publications`, `_posters` and `_proj`, with `output: false`. They are listed on the home page and have no pages of their own. Each entry's front matter carries title, authors (Christopher bolded), venue, year, links, `fig` (one live figure, with `fig_caption`, `fig_label`, `fig_aspect`, `fig_illustrative`), and either `abstract` (verbatim from the source) or `about` (a short written summary). CV facts, the home bio and teaching rows live in `_data/cv.yml`. `_misc/` holds unpublished extras and is not built.
- **Figures:** each live figure is one file in `assets/js/figures/` that registers with the shared kit (`kit.js`). Its tunable values sit in a `config` block at the top, so animations can be tweaked later without touching layout code.
- **Preferences, not locks:** Christopher wants to keep the Jekyll + GitHub Pages stack, the separate content collections, and the BYU / NET Lab affiliation with credit to his advisor, Philip Lundrigan. He also said nothing is strictly fixed, so a change to any of these is allowed when it clearly serves the audiences above. Propose such changes explicitly rather than making them silently.
- **Unpublished work:** latency-based Wi-Fi subprotocol (paper under review) and unassociated-device connectivity. These appear only as brief "ongoing" rows drawn from the CV and resume, with no mechanism details.
- **Home CV sections** (education, experience, skills) are taken from the CV and may be removed later so they don't overwhelm recruiters. Keep them easy to switch off.

## Brand Commitments

- Name: **Christopher Kitras**. Domain: **kitras.dev**. Contact email: `chkitras@gmail.com` (matches the CV and resume and outlasts graduation). GitHub: `christopolise`.
- **No unifying metaphor.** The site must not tie the research together with a themed visual concept (sensor maps, route maps, instruments). A theme would undersell whichever work doesn't fit it. Each piece of work stands on its own merit. The quality bar is joshuamontierth.github.io and distill.pub, executed straight.
- **One page, not a maze.** The site is a single page in the spirit of the original kitras.dev and philip.lundrigan.org (plus a CV page). Every work is one row: a live figure thumbnail, citation and links, with the verbatim abstract (or a short summary when the source has none) and the full figure opening in place. No per-work subpages.
- Affiliation: PhD Candidate, Department of Electrical and Computer Engineering, BYU. Network Researcher in the NET Lab (netlab.byu.edu), advised by Philip Lundrigan. B.Sc. in Computer Engineering with a Computer Science minor, BYU, 2021.
- Voice: first person, plain and professional, as in the current Research section.
- Author lists in publication entries bold Christopher's name, and co-authors are always credited in full.

## Evidence on Hand

- Portrait: `assets/kitras.jpg`.
- Six publications in `_publications/`, with figures and PDFs in `assets/`. The DySPAN 2025 paper links to IEEE Xplore.
- Six posters in `_posters/` (HVAC, LAMDA, SSS, TCAM, T.R.A.C. Air, TCAM with multimodal LLMs).
- Seven projects in `_proj/` (ChessSight, Darknet, DSAV, EPIC Ethernet, Music RLHF, OpenGL Bellhop, WiLiE), several with presentation decks, code, and demo videos.
- CV and resume PDFs: `assets/Christopher_Kitras_CV.pdf` and `assets/Christopher_Kitras_Resume.pdf`.
- External profiles: GitHub, LinkedIn, Google Scholar (URLs in `_config.yml`).
- **Awards (verified):** Best Poster Award at Air Quality: Science for Solutions in 2023 (LaMDA poster) and 2024 (radon HVAC poster), and first place at a BYU Raspberry Pi competition for the Seven Segment Sign. All three are from the CV.
- **Absent, never fabricate:** testimonials, citation counts or metrics not shown on Scholar, other awards, press beyond the SSS coverage page, and job titles or employers beyond those in the CV and resume.

## Product Principles

1. **One page, three readers.** Every surface works for a 20-second recruiter skim and for a committee member's careful read, without making either one dig.
2. **The work is the proof.** Real figures, venues, PDFs, code, and demos carry the credibility. Claims about the research stay tied to the artifact that supports them.
3. **Contact and CV are always one step away.** Email, LinkedIn, the CV, and the resume are reachable from wherever a visitor lands.
4. **Credit is precise.** Co-authors, the advisor, the lab, and the venues are named accurately.
5. **Adding work stays a markdown edit.** Design changes must not make it harder to publish a new paper, poster, or project through front matter.
