---
title: CI CD Workflows
excerpt: An example by which we demonstrate how we can add constraints to business domain for compile time validation of business logic!
image: https://source.unsplash.com/aJfOuWeNzko/1600x900
imageCredit: Bas van den Eijkhof | https://unsplash.com/@basvde
imageSource: Unsplash | https://unsplash.com
publications:
date: 2019-03-14
layout: layouts/post.njk
tags: ["playbooks","practices"]
---

#### Continuous Deployment

Below are some of the patterns that are useful when thinking of applying CI/CD to your projects.

##### 1. Xtreme Programming (XP)
 
{{ "images/playbooks/ci-cd-pure-xp.svg" | readFile }} 

##### 2. Classic setup with code review

{{ "images/playbooks/ci-cd-reviewer.svg" | readFile }}

##### 3. Conscientious Deployment

{{ "images/playbooks/ci-cd-gated.svg" | readFile }} 