---
title: 'My Thoughts about Puppet 4'
published: true
date: '2016-07-24T22:00:00+02:00'
taxonomy:
    category:
        - blog
    tag:
        - foreman
        - puppet
    author:
        - jens
jscomments:
    active: true
    provider: disqus
header_image: '0'
---

This weekend I decided to upgrade my Foreman to 1.12, which finally supports Puppet 4. I was pretty excited for this, since I always try to run the latest software since [April 2015](https://puppet.com/blog/say-hello-to-open-source-puppet-4). I used [this](http://projects.theforeman.org/projects/foreman/wiki/Upgrading_from_Puppet_3_to_4) guide to upgrade my Puppet install since Foreman still supports Puppet 3, and won't force you to upgrade. The guide in itself wasn't too hard, so I was able to finish it within the hour. Shortly finishing the guide, I started getting bombarded with mails from my foreman, since nodes started to fail. Now it's Sunday evening, and I still haven't fixed all the issues that came up since the upgrade. Now that might be due to my (relative) inexperience with Puppet (about 1 year), but I'd still like to share my thoughts on Puppet 3 vs Puppet 4. So here's a list of thoughts in no particular order:

## New AIO-Packages
Puppet 4 switched to so-called 'AIO' Packages, which means that there are less dependencies, which in itself is a good thing, but that also means it installs itself to `/opt/`, as opposed to the correct places in your OS. Since the `puppet` executable is also in there now, you can't just run `puppet agent -t`, you either have to add `/opt/puppetlabs/puppet/bin` to your PATH or run `/opt/puppetlabs/puppet/bin/puppet agent -t` every time you want to manually apply changes. Multiple places, as well as the guide above mention that there are non-AIO packages, but I have yet to find those.
Another problem with this is that you no longer have an InitV or SystemCtl Service, at least until you run `/opt/puppetlabs/bin/puppet resource service puppet ensure=running enable=true`.

## New directory Structure
This is really just a little nitpick rather than an issue, but changing the directory structure doesn't seem needed from the old versions. I also didn't have to deal with this much since the guide above mentions where you have to move what. This also doesn't concern the agent-installs either since I just copied the old config file over.

## Puppetserver running in JRuby
So with the new version it's no longer a 'puppetmaster', it's a puppetserver. And whereas the old one could run as ruby itself or with apache2 and passenger. This is my main complaint with this post. I just don't understand why they had to drag Java into this. With ~50 hosts on Puppet 3, my master had a RAM usage of about 3 GB (with foreman, foreman-proxy and a few other things). After I upgraded to Puppet 4, the RAM usage rose to 3.9 out of 4 GB, with ~1 GB swapped. After I gave the host 6 GB instead of 4, it settled down to about 4.2 GB of usage. WHY? Why did they have to drag Java into this? WHAT ADVANTAGE DOES JAVA BRING IN THIS MIX? IT WAS RUNNING SO WELL WITH PASSENGER AND APACHE2!

## Module Compatibility
An even smaller nitpick than the directory structure above, since out of the ~35 modules I use only 2 came up with errors after the upgrade, and one of those modules is self-written (I forgot the @ for variables in templates, which Puppet 3 apparently doesn't need?). This is very good and I was planning with a lot more module errors

All these things have brought me to recreate my Puppet environment with a fresh install for Foreman 1.12 and Puppet 3 (I am also doing that since I am switching my hostname-schema, but sssh).
