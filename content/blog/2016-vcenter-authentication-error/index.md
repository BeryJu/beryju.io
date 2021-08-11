---
title: 'vCenter Authentication Error'
published: true
date: '2016-05-31T21:54:00+02:00'
taxonomy:
    category:
        - blog
    tag:
        - vcenter
        - error
        - domain
        - 'active directory'
        - N3Sso5Fault13InternalFault9ExceptionE
jscomments:
    provider: disqus
header_image: '0'
summary:
    enabled: '1'
    format: short
---

Over the weekend I've been renmaing my Domain Controllers to fit in with the other Servers (dc1 -> dc01). The Next day, I couldn't log into vCenter anymore with my Domain Account, neither with Windows Session Credentials nor Direct Input. I got this very cryptic error "N3Sso5Fault13InternalFault9ExceptionE":

![N3Sso5Fault13InternalFault9ExceptionE](https://beryju-org-assets.s3.beryju.org/blog/2016-vcenter-authentication-error/574adf8d47af8.png)

Took me a bit tinkering, but then I rembemered I renamed my DC's and hadn't updated them in vCenter. So I logged in with the vCenter SSO Administrator Account, readded the Authentication Source and all was well, even the Windows Session credentials worked again!
