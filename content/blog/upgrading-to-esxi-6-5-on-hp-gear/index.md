---
title: 'Upgrading to ESXi 6.5 on HP gear'
date: '2020-04-26T18:04:00+02:00'
draft: false
metadata:
    description: 'It''s been a day since vSphere 6,5 came out, and sysadmins all over the world have been updating their test systems. This works really well if you update to vCenter 6.5 first, since it has the Update Manager integrated. However...'
taxonomy:
    category:
        - blog
    tag:
        - vmware
        - esxi
        - vcenter
        - error
        - vsphere
        - 'esxi 6.5'
        - 'vsphere 6.5'
    author:
        - jens
---

It's been a day since vSphere 6,5 came out, and sysadmins all over the world have been updating their test systems. This works really well if you update to vCenter 6.5 first, since it has the Update Manager integrated.

Upgrading to ESXi 6.5 worked fine on my Dell R710, which was running ESXi 6.0u2 (Dell customized) before. My DL380 G6's however just threw the error `Software or system configuration of host <hostname> is incompatible. Check scan results for details.` They also have ESXi 6.0u2 (HP customized) installed, however it turns out that there's a VIB in the old HP image that conflicts with 6.5.

To remove it, you just have to enable SSH and execute `esxcli software vib remove --vibname=char-hpcru`. If you have access to the offline depot for 6.5, you can just continue with the update:
```
esxcli software profile update -d /vmfs/volumes/datastore/VMware-ESXi-6.5.0-4564106-depot.zip -p ESXi-6.5.0-4564106-standard
```
After that command has finished, you can reboot the host via vCenter and it'll upgrade to 6.5. To update it with the Update Manager instead, you have to reboot the host after removing the VIB and Remediate the host after that.
