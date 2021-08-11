---
title: 'Setup Walkthrough'
published: true
date: '2016-03-29T00:00:00+02:00'
taxonomy:
    category:
        - blog
    tag:
        - setup
        - battlestation
        - homelab
header_image: '1'
header_image_file: header.png
summary:
    enabled: '1'
    format: short
---

===

## Home Setup Walkthrough

A few people on /r/homelab asked for this and I've been wanting to do it for some time anyways, so here it goes

## Let's jump right in!
![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_092820.jpg?cropResize=800x600&lightbox=1920)

#### The Screens are 3x Dell G210 24", one Hyundai 17" Screen and a Medion 23" Screen.
![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_092856.jpg?cropResize=800x600&lightbox=1920)

#### Code Keyboard with Tai-Hao PBT Doubleshot Keys
![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_092930.jpg?cropResize=800x600&lightbox=1920)

#### Logitech G500. Great Mouse.
![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_092935.jpg?cropResize=800x600&lightbox=1920)

#### Blue Snowball. The Red LED is disconnected since it's pretty annoying. Next to that, a FiiO E10 Olympus for Output
![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_094942.jpg?cropResize=800x600&lightbox=1920)

## The 'Rack'

![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_092845.jpg?cropResize=800x600&lightbox=1920)

#### Let's start from the Top. Random Stuff and Audiotechnica ATH-M50's. Good Headphones, just a bit lacking in the bass department

![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_095624.jpg?cropResize=800x600&lightbox=1920)

#### Self-built PC

Specs:
 - Intel Core i7 2700k
 - AsRock P67 Pro3 SE (awful Motherboard, but I got it for cheap)
 - 8 GB DDR3 Mixed RAM (some Corsair and some Kingston)
 - Sapphire Radeon R9 280x with 1 Broken Fan
 - OEM Radeon HD 7550 for more Screens
 - Samsung 830 128 GB SSD
 - Xigmatek Case...I forgot the exact Name
 - Windows 10 Pro x64

![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_095618.jpg?cropResize=800x600&lightbox=1920)

#### 2x HP ProLiant DL380G6

Specs:
 - Intel Xeon E5540
 - 12 GB DDR3 ECC RAM
 - 2x 146 GB 15K SAS Drives each
 - ESXi 6.0u2

![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_095608.jpg?cropResize=800x600&lightbox=1920)

#### Whitebox Server

Specs:
 - Intel Xeon E5405
 - 24 GB DDR2 ECC RAM
 - Supermicro X7DB-E
 - No Harddrives
 - ESXi 6.0u2

![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_093012.jpg?cropResize=800x600&lightbox=1920)

#### Switches - 2x Netgear GS748TS, Stacked

![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_093008.jpg?cropResize=800x600&lightbox=1920)

#### Whitebox NAS/SAN

Specs:
 - Intel Core i3 2100
 - 8 GB DDR3 ECC RAM
 - Asus P8P67-M
 - 3ware 9650-8LPML
 - 2x 160 GB HDD for OS (Debian 8 with ZFSOnLinux)
 - 2x 250 GB SSD for VMs (shared via iSCSI)
 - 3x 2 TB HDD for Data (RaidZ1)
 - 5x 1 TB HDD for Backups (Raid Z1)

![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_092949.jpg?cropResize=800x600&lightbox=1920)

#### Overview of the vCenter

![](56fa3e74b41db.png)

#### Using a bunch of Power

![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_092957.jpg?cropResize=800x600&lightbox=1920)

## DJ Setup

![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_095530.jpg?cropResize=800x600&lightbox=1920)

#### Laptop is a Dell Vostro 3550

![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_095541.jpg?cropResize=800x600&lightbox=1920)

### Cat Tax!

![](https://beryju-org-assets.s3.beryju.org/blog/setup-walkthrough/IMG_20160329_092727.jpg?cropResize=800x600&lightbox=1920)

{% include 'partials/socialbuttons.html.twig' with {'url' : page.url} %}
