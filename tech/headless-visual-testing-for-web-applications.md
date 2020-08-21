---
title: Headless Visual Testing For Web Applications
titleImage:
    url: https://source.unsplash.com/U3sOwViXhkY/1600x900
    credits: Franck V. | https://unsplash.com/@franckinjapan
    source: Unsplash | https://unsplash.com
description: A story of utilizing existing resources and setup a visual testing pipeline for applications.
publications:
    - codeburst.io | https://codeburst.io/headless-visual-testing-for-web-applications-9b90d125ee5b
date: 2018-07-30
layout: layouts/post.njk
tags: ["tech", "automation", "testing"]
---

**Some time back**, A team had come across an interesting challenge. The team, let’s call them _Rangers_, had embarked on a journey creating a cross platform enterprise application which would allow them to write business logic once and deploy it as an iOS app, an Android app as well as a Web application.

Rangers were doing great. They had precise test suites honoring the [test pyramid](https://martinfowler.com/bliki/TestPyramid.html). A well thought of CI system to execute them and a clear path to production. They also implemented UI Testing framework to run on top of their current infrastructure and capture UI issues as part of the feedback. It worked flawlessly on the mobile apps.

_But not the web app_. The tests were flaky and would fail for no apparent reasons in some runs while they would pass on others. Rangers spent hours debugging the root cause: the Chrome browser version, the chrome-driver, ImageMagick comparisons and the fuzz factor. They even tried to have exact identical agents, hardware and software images but still couldn’t pin point the root cause.

On verge of giving up, one Ranger asked a very important question: **Is it the physical displays on the agents?**

Is it physical displays?

Images are made up of pixels. The physical displays (desktop monitors, laptop screens) arrange and render pixels onto the illuminated screen. The number of pixels in an image is always constant. However, it’s representation varies across displays depending on the capability of a display to pack pixels on the screen. this capability is measured as **Pixel Per Inch (PPI)** and can be deduced using formula below where height and width is the resolution set for the display (1080p, 720p, etc..) and _diagonal_ is the diagonal length of display:

`sqrt( height² + width²)/diagonal`

![PPI screens](/images/headless-visual-testing-for-web-applications/res.png)

This means that _for same resolution, displays of different sizes will render same image with a fuzz or slight variance_.

The Rangers realised that the key to get repeatable robust results is to control this PPI. However, the PPIs are property of physical display and cannot be altered or mocked. What required was a _virtual_ display which can be configured, looked at and taken screenshot off. and **Xvfb** does just that. It’s a virtual [frame buffer](https://en.wikipedia.org/wiki/Framebuffer) for X server, a full-fledged implementation which mocks the physical display with detailed configuration and even allows one to VNC!

#### The Plan

Rangers decided that the best _robust, repeatable and portable_ solution would be a [containerized](https://en.wikipedia.org/wiki/Linux_containers) setup with test suites mounted and run against.

The plan was to have a [Docker](https://www.docker.com/) image with **Xvfb**, **Chromium** and **Chrome-driver** setup to start at launch, along with **x11vnc** to provide a VNC just in case it was required to debug. The required modules for test automation viz. [Selenium](https://www.seleniumhq.org/), [ImageMagick](https://www.imagemagick.org/) was also baked in to the image.

Consider below sample Dockerfile which creates a light weight docker image and starts the Xvfb and VNC:

```docker
FROM alpine
RUN echo "http://dl-4.alpinelinux.org/alpine/latest-stable/main" >> /etc/apk/repositories && \
echo "http://dl-4.alpinelinux.org/alpine/latest-stable/community" >> /etc/apk/repositories
RUN apk update && \ apk add xvfb x11vnc chromium chromium-chromedriver imagemagickARG UID=1000
ENV DISPLAY :99
EXPOSE 5900 VOLUME
VOLUME /images
WORKDIR /appRUN echo 'echo "starting Xvfb and x11vnc"' >> /app/init.sh && \ 
    echo "`which Xvfb` $DISPLAY -dpi 100 -screen 0 1024x768x24 &" >> /app/init.sh && \
    echo "`which x11vnc` -display $DISPLAY -forever >&2 &" >> /app/init.sh && \
    echo 'echo "done."' >> /app/init.shRUN adduser -D -u $UID testrunner
USER testrunner
CMD ["/bin/sh","-c","sh init.sh && /bin/sh"]
```

The above docker image, once built, can then be executed as

```shell
$ docker run -ti -p 5900:5900 -v ~/test_dir/images:/images <image_name>
```

The command will start up the docker image, mounts the directories of interest, starts Xvfb and x11vnc that can be vnc’ed @ 127.0.0.1:5900.

![flow charts](/images/headless-visual-testing-for-web-applications/flow-chart.png)

#### The Result

The flakiness was gone and it opened up new possibilities of testing in isolation various different device configurations like iPhone, Samsung S8, tablets for responsive web tests using Chromium flags. _But that’s a story to be told some other day_.

>
>This blog is a transcript of a talk I gave at VodQA Pune. The slides are also available [here](https://www.slideshare.net/manishkkatoch/visual-testing-of-web-apps-in-a-headless-environment).
>
>PS: There are tools and frameworks in markets which can be used instead, but cost considerable amount of money. The idea here is to utilize best of open source and existing investments to get fast feedbacks.