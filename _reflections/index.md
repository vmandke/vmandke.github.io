---
layout: default
title: Reflections
permalink: /reflections/
---
<div class="masthead">
  <a class="back-link" href="/" style="align-self:flex-start;">← Home</a>

  <div class="titlename">Reflections</div>
  <div class="subtitle">Explorations, imperfectly journaled</div>

  <div class="posts">
    {% assign categories = site.reflections
       | where_exp: "p", "p.path != 'index.md'"
       | map: 'category'
       | uniq
       | compact %}

    {% for category in categories %}
    <div class="category-block">
      <h2><a href="/reflections/{{ category }}/">{{ category | capitalize | replace: "-", " " }}</a></h2>
      <ul>
        {% assign cat_posts = site.reflections
           | where: "category", category
           | sort: "date" | reverse
           | limit: 5 %}
        {% for post in cat_posts %}
          <li>
            <a href="{{ post.url }}">{{ post.title }}</a>
            {% if post.date %} — {{ post.date | date: "%b %-d, %Y" }}{% endif %}
          </li>
        {% endfor %}
      </ul>
    </div>
    {% endfor %}
  </div>
</div>