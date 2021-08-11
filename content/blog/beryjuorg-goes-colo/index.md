---
title: 'BeryJu.org goes Colo'
published: true
date: '2017-06-14T21:40:00+02:00'
taxonomy:
    category:
        - blog
    tag:
        - setup
        - homelab
        - vyos
    author:
        - jens
header_image: '0'
---

#**It’s colo time baby!**

######*the structure of this post was totally not stolen from [MonsterMuffin](https://blog.monstermuffin.org/muffin-goes-colo/) (<3 bb)*<br><br>

After a recent power bill reminded me that Servers were not free to run, but rather pulled some rather big power costs behind them, I decided to downsize.

My initial Plan involved selling 3 of my 1366-era servers and keeping the R410 as sole VM host. This brought it's own headaches, like having to deal with moronic eBay buyers and manually having to fiddle with the partition table since it was a partition in a partition (don't ask)...

So anyways, after having sold the three space-heaters, and having moved everything to the R410, I quickly realized something: This thing is loud as *fuck*.

I however didn't have the money to go for something more quiet, like a DL360e G8 or similar. So I started looking at colo....

## Colo at work

A few days later I asked my boss if we had some space left in our Colo, and if I could use 1u of that. We rent a quarter rack locally to use, with IWB in their BSL1 Datacenter. After having explained to him, why I, a normal IT Tech, has his own private servers, he accepted my request.

This meant I had to order rails, somehow squeeze 2 SSDs into an R410 and make sure I have a colleague to install it with.

## The Pre-Preparation

### Cleanup

Since this server has lived in my mildly-dusty room for a good year, and I don't have a compressor at home, I used this opportunity to clean the Server.

![](https://beryju-org-assets.s3.beryju.org/blog/beryjuorg-goes-colo/IMG_20170613_070655.jpg)

This should improve temperatures by a little, while also keeping the Color Rack dust-free.

### The Rails

Rails were pretty easy to find on eBay, however they were sadly 70€ with shipping. There were a few auctions at the time, but since I didn't want to have an extra wait and potentially spend more money, I just bit the bullet and forked out the 70.

### The SSDs

Pretty early after having fully migrated to the R410 I noticed that IOPS were atrocious with the local HDD Raid 10. I did have 2 Crucial 250 GB SSDs laying on hand, which I used to use with iSCSI. My First plan was to just a Slimline Optical to HDD adapter, but I couldn't find mine and dint't want to buy another one.

After playing around with a few other plans, I decided to get [this](http://www.ebay.com/itm/172255122928?_trksid=p2060353.m2749.l2649&ssPageName=STRK%3AMEBIDX%3AIT), which converts the slimline SATA Power to normal SATA Power. This would be enough for one SSD. Shortly after having gotten the adapter though, I realized that 250 GB of Flash weren't going to cut it...

The R410 however only has one spare power connector, so I had to get creative. One SATA Power to Molex and one Molex to double SATA Adapter later, I had 2 SSDs running in my R410. These fit pretty fairly in the space where the optical drive would be (I only had to remove a *few* metal studs).

The End Results looks as following:

![](https://beryju-org-assets.s3.beryju.org/blog/beryjuorg-goes-colo/IMG_20170613_141853.jpg)

### The Preparation

I wanted my Server to be ready for the installation, so I installed a VyOS VM to do my Routing/Firewalling/NATing. The network as a whole is setup in the following way:

![](https://beryju-org-assets.s3.beryju.org/blog/beryjuorg-goes-colo/860adfb9661a1e6c0f39becc8c91a7163178d3e37bfa55b12fbbeb9f35c6e09d.png)

After making sure the VyOS VM can connected to the internet, to my VPN and integrated into my BGP network, I also had to assign the iDRAC a static IP. This was a very controversial step, however I chose to do so to be completely independent from other systems. I could have hooked it up to one of our work servers and tunneled everything through there, but I wanted my server to interface as little as possible with actual work servers.

## The Installation

After the rails finally arrived, I had to wait for a chance to actually go to the datacenter. I don't drive, and I *reaaally* didn't want to carry a 1u Server across Basel. Luckily, when I asked one of my colleagues about it, he mentioned that one of our work servers was installed without rails. It was laying on top of two servers for [ff3l.net](https://ff3l.net). We ordered rails for all three servers, and scheduled an appointment to install them.

![](https://beryju-org-assets.s3.beryju.org/blog/beryjuorg-goes-colo/IMG_20170613_153139.jpg)

![](https://beryju-org-assets.s3.beryju.org/blog/beryjuorg-goes-colo/IMG_20170613_153725.jpg)

Luckily I didn't have to install the Server on my own, because even though Dell's Rails are pretty easy, it was a pain.

Setup after the install was pretty easy too, I just had to assign my VyOS box the static IP, assign both ports on the work router to the correct bridge, and everything connected.

The End-End Result after installing the server and setting everything up looks like this:

![](https://beryju-org-assets.s3.beryju.org/blog/beryjuorg-goes-colo/IMG_20170613_155928.jpg)

![](https://beryju-org-assets.s3.beryju.org/blog/beryjuorg-goes-colo/IMG_20170613_162517.jpg)

And of course, the speeds are great too:

```
jens@bsl1-bx-dev-1 ~ $ ./speedtest-cli
Retrieving speedtest.net configuration...
Testing from Fiber7 (77.109.145.45)...
Retrieving speedtest.net server list...
Selecting best server based on ping...
Hosted by Init 7 (Winterthur) [2.04 km]: 6.535 ms
Testing download speed................................................................................
Download: 900.63 Mbit/s
Testing upload speed................................................................................................
Upload: 857.32 Mbit/s
```

```
jens@bsl1-bx-dev-1 ~ $ traceroute bsl2-stor-prod-1.bsl2.beryju.org
traceroute to bsl2-stor-prod-1.bsl2.beryju.org (172.16.8.20), 30 hops max, 60 byte packets
 1  bsl1-rtr-prod-1.bsl1.beryju.org (172.16.1.1)  0.111 ms  0.100 ms  0.085 ms
 2  ory1-rtr-prod-1.ory1.beryju.org (172.31.16.1)  18.883 ms  18.828 ms  19.442 ms
 3  bsl2-rtr-prod-1.bsl2.beryju.org (172.31.16.10)  53.241 ms  53.255 ms  53.394 ms
 4  bsl2-sotr-prod-1.bsl2.beryju.org (172.16.8.20)  53.663 ms  53.688 ms  53.877 ms
```


## So no more on-site Servers, Jens?

Weeeeeell kinda....

My original Plan for home, now named BSL3, was to get an E5-2xxx Tower Server, with a bunch of HDD Bays, and replace my fileserver with it. This would be quiet enough and also draw little enough power to be sustainable.

Howeeeeeeever....

Anything newer than 1366 is still really expensive in Europe, and with my apprentice salary an ML350e G8 wasn't gonna happen anytime soon.

I did however switch to VyOS installed on an old Atom Nettop, just so I have VPN and BGP on the same box as my main Gateway.

A few days later however I noticed that I still have my old Dell Vostro 3550 Laptop, with an i3 2120M and 10 GB of RAM....

Installed ESXi on it, set up a Foreman proxy and it's now going to host my few on-site VMs (Plex, DC and Foreman Proxy).

This should be enough for me until I move out, at which point I will probably get a brand new HP or Dell Tower server.

*btw working on foreman part 4 kthxbye*

{% include 'partials/socialbuttons.html.twig' with {'url' : page.url} %}
