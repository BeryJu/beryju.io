---
title: 'IPv6 and online.net'
date: '2020-04-12T18:04:00+02:00'
draft: false
metadata:
    keywords: 'online, onlinenet, ipv6, ip6, vyos, esxi, vmware, vsphere, dedicated, dedi, dedibox'
taxonomy:
    category:
        - blog
    tag:
        - tutorial
        - online.net
        - ipv6
        - vyos
    author:
        - jens
visible: true
---

## The experimenting

*Shoutout to [/u/dantho](https://www.reddit.com/user/dantho281) and [/u/CBRJack](https://www.reddit.com/user/CBRJack) for helping me with this*

I've recently started to mess around with IPv6, mostly for the reasons of being future-proof (somewhat), a lot of free addresses and also cause it seemed interesting. Now at home I already have IPv6, at least in theory. My home connection is a UnityMedia Cable Connection. This is running DS-Lite, so the whole aparetmeent complex has an external IPv4, and every flat has their own IPv6 space. Sounds pretty easy to deal with, right? No. (But this is also not the point of this post).

The first act in implementing IPv6 is finding out which implementation the Service Provider used. The best (in my opinion) implementation I have seen of this is at our work Colo, where we have Init7, a swiss ISP. You get a /48, and they just RA on your Ports so everything configures itself.

Online's implementation I would describe as the exact opposite. You also get a /48, which is nice, but nothing is automatic. For each Server you have with them, you get a /56 Subnet from your /48. So in the case you only have one server, you only get a /56 out of your /48.

As if that wasn't bad enough, you can't directly route that /56 to your Server. You will get a DHCP lease if you set it up correctly, and you will be able to ping your gateway, but it won't route you anywhere or route anything to you.

So now we're down to a /64 for WAN, which luckily you can create endless amounts of. Just finding out all of thse facts took dantho and I around 4-6 hours.

Now of course your Router doesn't get these DHCP leases without setting a DUID, basically a Client-Identifier proving that you actually want the Server to have IPv6. The only way to set this on pfSense is by encoding the data, and writing it to a special file. On VyOS you can easily set it as a parameter on that interface (`set interface ethernet eth0 dhcpv6-options duid <duid>`), but only if you're on a recent beta version (I am running `VyOS 1.2.0-beta1 (lithium)` in this case)

But the fun still doesn't end here. Since online.net uses Router Advertisements for their gateways, you're pretty much limited to VyOS or some other software router that can accept RA's on WAN interfaces.

And since we can only route a /64 to WAN, and can't route a seperate /64 to LAN since it would be missing the DUID, we have to use a smaller subnet than /64, which means no EUI-64 for you!

## The setup

All joking aside, how are the interfaces actually set up?

Well it's actually pretty simple, if you know what to look out for.

```
jens@ory3-rtr-prod-1# show interfaces ethernet eth0
 address dhcp
 address dhcpv6
 address 2001:bc8:21c3:301::1/64
 description WAN
 dhcpv6-options {
     duid <redacted>
 }
 duplex auto
 firewall {
     in {
         name INCOMING
     }
     local {
         name OUTGOING
     }
 }
 ipv6 {
     dup-addr-detect-transmits 1
 }
 smp-affinity auto
 speed auto
[edit]
jens@ory3-rtr-prod-1# show interfaces ethernet eth1
 address 172.20.3.1/24
 address 2001:bc8:21c3:301::1/80
 description LAN
 duplex auto
 ipv6 {
     router-advert {
         prefix 2001:bc8:21c3:301::1/80 {
         }
         send-advert true
     }
 }
 smp-affinity auto
 speed auto
[edit]
```

(In this config Router Advertisements are enabled on eth1, but since it's not a /64 the interfaces won't autoconfigure.)

You also need to append this to your `/etc/rc.local`, right above the `exit 0`:
```
sysctl -w net.ipv6.conf.eth0.accept_ra=2
```

This allows VyOS to accept Router Adverts on eth0, even though eth0 is in forwarding mode. This was also added to the [wiki](https://wiki.vyos.net/wiki/IPv6_Router_Advertisements) by [u/CBRJack](https://www.reddit.com/user/CBRJack)

This should enable you IPv6 on the main gateway itself and on all the VMs behind it. You could set up a DHCPv6 Server to have it hand out addresses in your /80, but I am managing that with Foreman.


*Working on the Foreman tutorials btw*
