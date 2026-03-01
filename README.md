# vmandke.github.io

Personal site by Vinaya Mandke. Visit the live site at [vmandke.github.io](https://vmandke.github.io).

---

## Local Development

### Prerequisites

- Ruby & Bundler installed
- Jekyll gem available via Bundler

### Running Locally

**1. Install dependencies**
```bash
bundle install
```

**2. Clear cache and build artifacts**
```bash
rm -rf _site .jekyll-cache
```

**3. Start the local server with live reload**
```bash
bundle exec jekyll serve --livereload
```

The site will be available at `http://localhost:4000`.
Changes to files will automatically trigger a browser refresh.

### Adding a New Post

Create a file in the `_posts/` directory with the format:

```
_posts/YYYY-MM-DD-title-of-post.md
```

With the following front matter:

```markdown
---
layout: post
title: <title>
date: YYYY-MM-DD
---
...
```

## Adding a New Reflection

Create a file in the `_reflections/` directory with the format:

```
_reflections/YYYY-MM-DD-title-of-reflection.md
```

With the following front matter:

```markdown
---
layout: post
title: <title>
date: 2026-02-26
category: career
---
...
```