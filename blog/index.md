---
layout: default
title: Blog
---
<div class="masthead">
  <a class="back-link" href="/" style="align-self:flex-start;">← Home</a>
  <div class="titlename">Blog</div>
  <div class="subtitle">Essays, ideas, and longer-form writing</div>

  <div class="posts" style="width:90%; max-width:72rem; margin-top:2.5rem;">
    {% assign blog_posts = site.posts | sort: "date" | reverse %}
    {% if blog_posts.size == 0 %}
      <p style="color:#999; font-style:italic;">Nothing here yet — first post coming soon.</p>
    {% else %}
      {% for post in blog_posts %}
      <div style="margin: 0.6rem 0;">
        <a href="{{ post.url }}" style="text-decoration:none; color:inherit;">{{ post.title }}</a>
        {% if post.date %}<span style="color:#888;"> — {{ post.date | date: "%b %-d, %Y" }}</span>{% endif %}
      </div>
      {% endfor %}
    {% endif %}
  </div>
</div>