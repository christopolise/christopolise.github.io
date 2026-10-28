# Archive (not published)

The site used to give every paper, poster and project its own long explainer page.
It is now a single page (see `_layouts/home.html`), so the long-form material lives here,
outside the build (`_archive/` is excluded in `_config.yml` and ignored by Jekyll).

- `explainers/` holds the full explainer pages as they were, with front matter and body
  (short version, method, results, figures).
- `layouts/work.html` and `layouts/redirect.html` are the layouts those pages used.
- `pages/research.html` and `pages/projects.html` are the old index pages.
- `figures/` holds the second figure of each work that had two. The home page keeps one
  per work. To bring one back, move it into `assets/js/figures/` and point the entry's
  `fig:` at it.
