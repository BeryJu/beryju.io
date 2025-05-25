---
title: 'Implementing EAP, EAP-TLS and more (mostly) from scratch'
date: '2025-05-25'
taxonomy:
    category:
        - blog
    tag:
        - radius
        - eap
        - eap-tls
        - tls
    author:
        - jens
---

The first question you might be asking yourself after reading the title of this post is "Why in the @#$%&! would you do that". If that wasn't the first thing that came to your mind, you're probably wondering what EAP even is and why you should be so taken aback. Don't worry, I will try to answer both of these questions with this blog post.

## Why implement EAP from scratch

There are a couple reasons why I decided to do this. A big factor was that I've attempted to do this maybe five or six times over the past two to three years. It is quite surprising how much repeated failure to accomplish a goal can be used as motivation to not give up and (even with looong delays in between attempts) try again.

But even if I succeeded back with the first try, there are still a lot of reasons for not doing this. There's a lot of great open source software out there (mainly [FreeRadius]) that implements this already and is already well tested and has proven its quality. I should also note that my primary goal with implementing this from scratch was to integrate it with [authentik], the identity provider I created as an open source project 6+ years ago (see [this blog post](https://goauthentik.io/blog/2022-11-02-the-next-step-for-authentik) for more details about that).

[authentik] has a built in RADIUS server, which can be used to provide radius for different devices, which authenticates to your central authentication infrastructure. Due to implementing RADIUS directly using the [amazing layeh.com/radius library](https://github.com/layeh/radius), it has always supported only [PAP]. [PAP] is the most basic form of RADIUS authentication but also the most insecure method of authenticating via RADIUS as it does not support any form of encryption (mostly, this will be explained later), and transmits the users' password over the network in plaintext.

Back when I first implemented the RADIUS server for authentik, I considered using [FreeRadius], and integrating it with authentik using their configuration option for authenticating via external executables.
This however didn't feel like a great solution, first off I'm not a fan of shipping existing software with special config to integrate with authentik (that could just be a documentation for "How to integrate FreeRadius with authentik"), and secondly, [having done this before](https://github.com/goauthentik/authentik/pull/1365), sooner or later you will get to a point where the configuration of the software you're packaging isn't going to allow you to do things how you want them to.

Are these reasons good enough to warrant implementing this from (mostly) scratch? I don't know yet, but it certainly helped me learn quite a few things about how EAP, TLS, MSCHAPv2 work, how low level protocol parsing is done, and how end-devices implement these protocols.

## Starting from the beginning

[RADIUS] (short for Remote Authentication Dial In User Service) is a protocol used for authentication in many different network setups, most frequently by mobile phones to authenticate to your ISP using its SIM card, by DSL internet connections to connect to your ISP, but for this case most importantly it is also very frequently used in enterprise networks to authenticate end-users' machines onto the network.

RADIUS is a request-challenge-response format protocol, where a device (usually the ethernet switch or WiFi access point) will send [Access-Request](https://datatracker.ietf.org/doc/html/rfc2865#section-4.1) packets to the RADIUS Server, which may either response with [Access-Accept](https://datatracker.ietf.org/doc/html/rfc2865#section-4.2) or [Access-Challenge](https://datatracker.ietf.org/doc/html/rfc2865#section-4.4) packets.

Each RADIUS packet can contain a varying number of [Attributes](https://datatracker.ietf.org/doc/html/rfc2865#section-5) (also called AVPs - Attribute Value Pairs) which are used to exchange data and authentication challenges/responses between RADIUS server and client. Each attribute has a unique, well defined ID, and can be set multiple times in a single RADIUS packet to allow for larger messages as the value is limited to 255 bytes.

[EAP] is a protocol that does not need to used within RADIUS, however in the context of this blog post we will only use it within RADIUS (and later on even within itself). In RADIUS, EAP data is stored in an Attribute Value Pair with the ID [79](https://datatracker.ietf.org/doc/html/rfc3579#section-3.1). EAP also supports multiple types of "sub-protocols" within it, all denoted by a well defined ID. This means that the RADIUS client and server can negotiate on which protocol to use, for example based on the configuration of each side.

## Making RADIUS secure

So far, everything we looked at is transmitted as plain text over the wire. This is obviously not great for a lot of reasons, and as such protocols like EAP-TLS, EAP-TTLS and others have been widely used for a long time.

When I started working on this, I could not find a library to help me implement this. This might be due to protocols like this mostly using older C++ code and not "relatively" new language like Go, which is what the authentik RADIUS server uses. I could simply also have missed a library.

This means my adventure started with a raw EAP message and an open Wireshark window with a successful authentication for comparison. Implementing EAP parsing itself was relatively straight forward (in this simple iteration anyways, we'll get back to this later) and so I won't go too in-depth in it here (if you're still curious, [here](https://github.com/goauthentik/authentik/blob/9b7731e219c9cd655739ed83caac0b83a2c545f8/internal/outpost/radius/eap/protocol/eap/payload.go#L37)'s the code).

In the very beginning I didn't even know how to test this properly and so all my initial tests were done using a separate SSID setup on my access-point and configuring that to use the RADIUS server running on my laptop. This obviously didn't give me much data to help figure out what's happening as I was also using my iPhone as a test-device. Luckily I found out about [`eapol_test`](https://manpages.debian.org/testing/eapoltest/eapol_test.8.en.html) somewhat shortly after. This tool allows for testing various WiFi authentication methods from a Linux machine, and is **very** verbose with its logging.

The first hurdle was getting [EAP-TLS] to work. I chose this protocol as it both secure but also very widely supported, especially for the use with WPA2/3 enterprise for WiFi authentication.

Luckily I was able to find a client implementation of EAP-TLS in Go, however it relied on a customized version of Go's `crypto/tls` package. This wasn't a great omen as the main thing I was trying to avoid was writing any TLS code myself, as this is almost never ever a good idea.

After some testing I was able to get some initial data from Go's `tls.Server`'s `Handshake` method, and sending that to the client seemed to be somewhat correct as it replied with more and different data back.

## Fusing together two different worlds

For those reading that have used `tls.Server` in Go, or in fact any network protocol in Go offer a somewhat similar interface to an open file. They have a `Read()` and a `Write()` method, and expect to be given an object with the same methods as an underlying network transport.

In most cases, this makes sense. It allows for the protocol to consume as much data as it needs, do processing on it and send back as much data it wants to. And initially this is how I wanted to implement all of this as that would make composing protocols within each other very simple.

However this turned out to not be as easy as initially thought due to how much state needs to be kept, and RADIUS being transported over UDP. Additionally to that we can't send as much data to the client as the protocol needs to; we need to send as much data as a RADIUS packet can fit and then wait for the client to ask for more data. With most EAP sub-protocols this isn't an issue, however with anything TLS-based, the sub-protocols specify a separate chunking mechanism.

My solution to this was to create an custom buffered connection I'd parse to `tls.Server`, which buffers both incoming and outgoing data. You might ask; Why incoming data too? Turns out that the client can also send us more data than fits in a single packet. We do however get told how much data we should be expecting, so we can save incoming data into memory, tell the client to send us the next chunk and repeat until we have everything.


[authentik]: https://goauthentik.io
[RADIUS]: https://datatracker.ietf.org/doc/html/rfc2865
[PAP]: https://datatracker.ietf.org/doc/html/rfc2865#section-5.2
[freeradius]: https://www.freeradius.org
[EAP]: https://datatracker.ietf.org/doc/html/rfc3748
[EAP-TLS]: https://datatracker.ietf.org/doc/html/rfc5216
