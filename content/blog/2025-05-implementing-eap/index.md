---
title: "Implementing EAP, EAP-TLS and more (mostly) from scratch"
date: "2025-05-25"
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

The first question you might be asking yourself after reading the title of this post is

> "Why in the **@#$%&!** would you do that"

If that wasn't the first thing that came to your mind, you're probably wondering what EAP even is and why you should be so taken aback. Don't worry, I will try to answer both of these questions with this blog post.

## Why implement EAP from scratch

There are a couple reasons why I decided to do this. A big factor was that I've attempted to do this maybe five or six times over the past two to three years. It is quite surprising how much repeated failure to accomplish a goal can be used as motivation to not give up and (even with looong delays in between attempts) try again.

But even if I succeeded back with the first try, there are still a lot of reasons for not doing this. There's a lot of great open source software out there (mainly [FreeRadius]) that implements this already and is well tested and has proven its quality. I should also note that my primary goal with implementing this from scratch was to integrate it with [authentik], the identity provider I created as an open source project 6+ years ago (see [this blog post](https://goauthentik.io/blog/2022-11-02-the-next-step-for-authentik) for more details about that).

[authentik] has a built in RADIUS server, which can be used to provide RADIUS for different devices and authenticates to your central authentication infrastructure. Due to implementing RADIUS directly using the [amazing layeh.com/radius library](https://github.com/layeh/radius), it has always supported only [PAP]. [PAP] is the most basic form of RADIUS authentication but also the most insecure form, as it does not support any form of encryption (mostly, this will be explained later), and transmits the user's password over the network in plaintext.

Back when I first implemented the RADIUS server for authentik, I considered using [FreeRadius], and integrating it with authentik using their configuration option for authenticating via external executables.
This however didn't feel like a great solution, first off I'm not a fan of shipping existing software with special config to integrate with authentik (that could just be a documentation for "How to integrate FreeRadius with authentik"), and secondly, [having done this before](https://github.com/goauthentik/authentik/pull/1365), sooner or later you will get to a point where the configuration of the software you're packaging isn't going to allow you to do things how you want them to.

Are these reasons good enough to warrant implementing this from (mostly) scratch? I don't know yet, but it certainly helped me learn quite a few things about how EAP, TLS, MSCHAPv2 work, how low level protocol parsing is done, and how end-devices implement these protocols.

## Starting from the beginning

[RADIUS] (short for Remote Authentication Dial In User Service) is a protocol used for authentication in many different network setups, most frequently by mobile phones to authenticate to your ISP using its SIM card, by DSL internet connections to connect to your ISP, but for this case most importantly it is also very frequently used in enterprise networks to authenticate end-users' machines onto the network.

RADIUS is a request-challenge-response format protocol, where a device (usually the ethernet switch or WiFi access point) will send [Access-Request](https://datatracker.ietf.org/doc/html/rfc2865#section-4.1) packets to the RADIUS Server, which may either response with [Access-Accept](https://datatracker.ietf.org/doc/html/rfc2865#section-4.2) or [Access-Challenge](https://datatracker.ietf.org/doc/html/rfc2865#section-4.4) packets.

Each RADIUS packet can contain a varying number of [Attributes](https://datatracker.ietf.org/doc/html/rfc2865#section-5) (also called AVPs - Attribute Value Pairs) which are used to exchange data and authentication challenges/responses between RADIUS server and client. Each attribute has a unique, well defined ID, and can be set multiple times in a single RADIUS packet to allow for larger messages as the value is limited to 255 bytes.

[EAP] is a protocol that does not need to be used within RADIUS, however in the context of this blog post we will only use it within RADIUS (and later on even within itself). In RADIUS, EAP data is stored in an Attribute Value Pair with the ID [79](https://datatracker.ietf.org/doc/html/rfc3579#section-3.1). EAP also supports multiple types of "sub-protocols" within it, all denoted by a well defined ID. This means that the RADIUS client and server can negotiate on which protocol to use, for example based on the configuration of each side.

TLS and all other protocols are then sent back and forth within EAP, and aside from TLS these protocols will be talked about in their respective section.

{{< figure src="eap-tls-packets.png" position="center" caption="A visual representation of the layering of protocols" >}}

## Making RADIUS secure

So far, everything we looked at is transmitted as plain text over the wire. This is obviously not great for a lot of reasons, and as such protocols like EAP-TLS, EAP-TTLS and others have been widely used for a long time.

When I started working on this, I could not find a library to help me implement this. This might be due to protocols like this mostly using older C++ code and not a "relatively" new language like Go, which is what the authentik RADIUS server uses. I could simply also have missed a library.

This means my adventure started with a raw EAP message and an open Wireshark window with a successful authentication for comparison. Implementing EAP parsing itself was relatively straight forward (in this simple iteration anyways, we'll get back to this later) and so I won't go too in-depth in it here (if you're still curious, [here](https://github.com/goauthentik/authentik/blob/9b7731e219c9cd655739ed83caac0b83a2c545f8/internal/outpost/radius/eap/protocol/eap/payload.go#L37)'s the code).

In the very beginning I didn't even know how to test this properly and so all my initial tests were done using a separate SSID setup on my access-point and configuring that to use the RADIUS server running on my laptop. This obviously didn't give me much data to help figure out what's happening as I was also using my iPhone as a test-device. Luckily I found out about [`eapol_test`](https://manpages.debian.org/testing/eapoltest/eapol_test.8.en.html) somewhat shortly after. This tool allows for testing various WiFi authentication methods from a Linux machine, and is **very** verbose with its logging.

#### The sidequest of Wireshark

At this point I also noticed a very annoying issue that by now I'm pretty sure is a Wireshark bug; RADIUS packets with somewhat larger EAP payload would not be correctly parsed by Wireshark.

{{< figure src="wireshark-bug.png" position="center" caption="Wireshark screenshot of a successful authentication using standard `eapol_test`" >}}

This threw me off quite a bit as this was showing up whether or nor the authentication was successful. No matter if I used `eapol_test` or an iPad as test device. After a couple hours of researching and trying to dissect `eapol_test` I found that it sets its maximum fragment size to [1398 bytes](https://w1.fi/wpa_supplicant/devel/config__ssid_8h.html), which Wireshark doesn't seem to like. Cloning the code for it, editing `wpa_supplicant/config_ssid.h`, and setting `DEFAULT_FRAGMENT_SIZE` to something like `1000` and then running `make eapol_test` fixed this issue and allowed to me to look at the full conversation in Wireshark.

Sigh that took a couple hours to figure out; end of the sidequest.

---

The first hurdle was getting [EAP-TLS] to work. I chose this protocol as it both secure but also very widely supported, especially for the use with WPA2/3 enterprise for WiFi authentication.

Luckily I was able to find a client implementation of EAP-TLS in Go, however it relied on a customized version of Go's `crypto/tls` package. This wasn't a great omen as the main thing I was trying to avoid was writing any TLS code myself, as this is almost never ever a good idea.

After some testing I was able to get some initial data from Go's `tls.Server`'s `Handshake` method, and sending that to the client seemed to be somewhat correct as it replied with more and different data back.

## Fusing together two different worlds

For those reading that have used `tls.Server` in Go, or in fact any network protocol in Go, you'll know that it offer a somewhat similar interface to an open file.

```go
// A rough look at what methods a network connection usually implement
type NetworkConnection interface {
    Read([]byte) (int, error)
    Write([]byte) error
}
```

In most cases, this makes sense. It allows for the protocol to consume as much data as it needs, do processing on it and send back as much data it wants to. And initially this is how I wanted to implement all of this as that would make composing protocols within each other very simple.

However this turned out to not be as easy as initially thought due to how much state needs to be kept, and RADIUS being transported over UDP. Additionally to that we can't send as much data to the client as the protocol needs to; we need to send as much data as a RADIUS packet can fit and then wait for the client to ask for more data. With most EAP sub-protocols this isn't an issue, however with anything TLS-based, the sub-protocols specify a separate chunking mechanism.

My solution to this was to create an custom buffered connection I'd pass to `tls.Server`, which buffers both incoming and outgoing data. You might ask; Why incoming data too? Turns out that the client can also send us more data than fits in a single packet. We do however get told how much data we should be expecting, so we can save incoming data into memory, tell the client to send us the next chunk and repeat until we have everything.

The implementation for this functions roughly functions as follows:

- Incoming packets have a field for their total length and whether more fragments will follow, so we know how much data to anticipate.
- We store the incoming data in memory as well as the total expected length, and continue to give the client the go-ahead to send us more data.
- Whenever we get the final packet from the client and we have all the data we pass it to Go's TLS library.
- Due to the way the Go's TLS server is implemented, we basically just wait for it to have data to send out.
- To send out the data we do the reverse as above, we know how much total data we have to send, so we chunk it into smaller requests, and after each request we wait for the client to send us the go-ahead to continue.
- After Go's `Handshake` method completes, we know that the handshake is done (and if any errors happened).

**Importantly**, even after the handshake is done on the server-side, there might be more data that needs to be transferred. This I didn't know initially; and it took quite a bit of time to figure out why things weren't working.

Now, everything looked successful to me, and there were a lot of `SUCCESS` messages from `eapol_test`, but it still ended with a `FAILURE`. However there was at least some slightly helpful messages:

```
EAPOL: Successfully fetched key (len=32)
PMK from EAPOL - hexdump(len=32): 0c 9b 2e d3 03 4c 51 8d 1b 18 a4 fa f9 36 71 ac a6 fb c9 57 e6 fe fb c0 1b 4c 87 a1 72 0b ff 12
WARNING: PMK mismatch
PMK from AS - hexdump(len=32): 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
No EAP-Key-Name received from server
```

#### The sidequest of MPPE

MPPE (which stands for Microsoft Point-to-Point Encryption) is a way of encryption, and I'm not going to try to explain it further as specifically in this area I have no idea what I'm talking about.

Reading further into [this](https://datatracker.ietf.org/doc/html/rfc2548#section-2.4) and [this](https://datatracker.ietf.org/doc/html/rfc3079#section-5.2) I started to figure out what EAP-TLS clients expect here. This is additional data extracted from the TLS connection after the handshake finished used to authenticate further communication between client and RADIUS server.

Looking into implementing this once again sent me through the source code of wpa_supplicant, and seeing what they do:

```cpp
static void eap_tls_success(struct eap_sm *sm, struct eap_tls_data *data,
                            struct eap_method_ret *ret)
{
        [...] Shortened for brevity

        if (data->ssl.tls_v13) {
                label = "EXPORTER_EAP_TLS_Key_Material";
                context = eap_tls13_context;
                context_len = 1;
        } else {
                label = "client EAP encryption";
        }

        eap_tls_free_key(data);
        data->key_data = eap_peer_tls_derive_key(sm, &data->ssl, label,
                                                 context, context_len,
                                                 EAP_TLS_KEY_LEN +
                                                 EAP_EMSK_LEN);
        if (data->key_data) {
                wpa_hexdump_key(MSG_DEBUG, "EAP-TLS: Derived key",
                                data->key_data, EAP_TLS_KEY_LEN);
                wpa_hexdump_key(MSG_DEBUG, "EAP-TLS: Derived EMSK",
                                data->key_data + EAP_TLS_KEY_LEN,
                                EAP_EMSK_LEN);
        } else {
                wpa_printf(MSG_INFO, "EAP-TLS: Failed to derive key");
        }
}
```

This led me down the road to figuring out `eap_peer_tls_derive_key`, then `tls_connection_export_key` and finally `SSL_export_keying_material`. Once again after looking around some more this led me to the Go equivalent, `ExportKeyingMaterial()`.

This function needs to be passed the correct label as specified above, a buffer that depending on TLS version is either `[]byte{}` or `[]byte{13}` (the latter for TLS 1.3) and an empty 64 byte buffer...no wait, actually a 128 byte buffer, despite each of the MPPE keys being 32 bytes...

At this point I felt very much out of my depth so I was basically trying to directly port the code from C++ to Go. It did take me another hour to figure out that the first key was the first 32 bytes of the buffer from above and the second key was the next 32 bytes, but offset by 32 bytes...? Ok sure.

Once again, that's the end of the sidequest....

---

For EAP-TLS specifically, this basically finishes the authentication. EAP-TLS uses TLS Client Certificates for authentication, so the RADIUS server will validate the certificate and determine the result of the authentication based on that.

{{< figure src="eap-tls-success.png" position="center" caption="An unbelievable amount of glee befell me once I finally saw the first 'SUCCESS' message." >}}

## Going even further

Initially this was all that I wanted to accomplish; I was successfully able to connect to my WiFi with my iPad using a set of self-signed certificates, authenticated by authentik.

However also around this time I was wondering how this would make sense within authentik as a product, how we wanted to use this and/or if this was maybe something that would be better to only publish as a separate library. At the same time though, the itch that implementing this had unknowingly formed was not quite scratched yet.

Purely by coincidence we got an inquiry a couple days later about supporting [PEAP], which is something I had previously only briefly considered.

[PEAP] exists in two different versions, PEAPv0 which uses [MSCHAPv2] over TLS and PEAPv1 which uses [EAP-GTC] over TLS. Anyone that had to deal with [MSCHAPv2] will know why it immediately made my alarm bells ring; it relies on passwords being stored with a reversible hash, making any kind of password storage much less secure and is not something that should be done, like ever. [EAP-GTC] on the other hand was something I had looked at quite a bit before, as it uses a dynamic Challenge-Response system. This would allow us to implement multi-factor authentication and even other things, as our RADIUS server can send the client any prompt.

The main downside of having these two different versions is that on a lot of systems, only PEAPv0 is supported (primarily due to Microsoft not adding support for PEAPv1, ever, not even to this date). Out of sheer curiosity and to scratch that newly formed itch I still wanted to look into MSCHAPv2 and see how it works, and maybe figure out a way to store a separate set of credentials that can be in plaintext.

Once again to start figuring this out I started with a Wireshark window of a successful authentication. I noticed that even though PEAP uses a different EAP Type ID (EAP-TLS is 13, PEAP is 26) (and you might've noticed that the screenshot above actually shows PEAP), the data within EAP was still the same as with EAP-TLS. This was a welcome surprise as I had just spent all this time to implement EAP-TLS, but now I had to re-organize the code to support the same protocol logic with a different type ID and also for protocols to support an "inner" layer.

On the successful connection I noticed that unlike with EAP-TLS, there was still traffic being sent back and forth after the successful TLS Handshake...however I wasn't able to look at what's contained in the TLS connection.

{{< figure src="encrypted-tls-data.png" position="center" caption="Alright, keep your secrets then." >}}

To be fully honest for this, I thought all you needed to decrypt TLS traffic was the private key of the certificate used by the server. I even tried using the private key of the local CA I used to generate these certs. It once again took quite a while to learn how things work nowadays and that more data is required.

[The Wireshark Wiki](https://wiki.wireshark.org/TLS) helped with this one, mentioning `SSLKEYLOGFILE` which was the one magic word I had to find for google to give me the results I needed. It then pointed me to [this GitHub issue](https://github.com/golang/go/issues/13057), which then pointed me to the `KeyLogWriter` attribute on `*tls.Config`, which allowed me to write out TLS master secrets to a file that I could feed into Wireshark aaaaand......

{{< figure src="decrypted-tls-data.png" position="center" caption="Finally, the data." >}}

## EAP...inside of EAP....?



[authentik]: https://goauthentik.io
[freeradius]: https://www.freeradius.org
[RADIUS]: https://datatracker.ietf.org/doc/html/rfc2865
[PAP]: https://datatracker.ietf.org/doc/html/rfc2865#section-5.2
[EAP]: https://datatracker.ietf.org/doc/html/rfc3748
[EAP-TLS]: https://datatracker.ietf.org/doc/html/rfc5216
[PEAP]: https://datatracker.ietf.org/doc/html/rfc8940
[MSCHAPv2]: https://datatracker.ietf.org/doc/html/rfc2759
[EAP-GTC]: https://datatracker.ietf.org/doc/html/rfc3748#section-5.6
