---
title: 'Getting Started with Foreman: Part 3'
published: true
date: '2016-07-18T00:00:00+02:00'
metadata:
    keywords: 'foreman,provisioning,getting-started-with,tutorial,vmware,esxi,debian,dhcp,dns,tftp,getting-started-with-foreman'
    description: 'Getting Started with Foreman Part 3'
taxonomy:
    category:
        - blog
    tag:
        - foreman
        - provisioning
        - getting-started-with
        - tutorial
        - vmware
        - esxi
        - dhcp
        - dns
        - tftp
        - getting-started-with-foreman
    author:
        - jens
header_image: '0'
summary:
    enabled: '1'
    format: short
content:
    items: '@self.children'
    limit: 5
    pagination: true
    url_taxonomy_filters: true
    order:
        dir: desc
        by: date
---

### What we're going to do in this Part

Continuing on from last [part](blog/getting-started-foreman-part-2), we're going to provision VMware's ESXi. Since ESXi is based on Linux, we can actually do this without a separate server or special configuration, we just need a few files.

===

## Table of Contents

 - [Part 1: Getting Started](https://beryju.org/blog/getting-started-foreman-part-1)
   - [Installing the OS](https://beryju.org/blog/getting-started-foreman-part-1#install_os)
   - [Installing Foreman](https://beryju.org/blog/getting-started-foreman-part-1#install_foreman)
   - [Settings Foreman up](https://beryju.org/blog/getting-started-foreman-part-1#setting_up)
   - [Creating our first VM](https://beryju.org/blog/getting-started-foreman-part-1#creating_vm)
 - [Part 2: Deploying Windows 7/10/Server](https://beryju.org/blog/getting-started-foreman-part-2)
   - [Installing and Configuring the WDS Server](https://beryju.org/blog/getting-started-foreman-part-2#install_wds)
   - [Installation and Basics of MDT 2013u2](https://beryju.org/blog/getting-started-foreman-part-2#mdt_basics)
   - [Integrating it with Foreman (the Windows side)](https://beryju.org/blog/getting-started-foreman-part-2#foreman_integration_win)
   - [Integrating it with Foreman (the Foreman side)](https://beryju.org/blog/getting-started-foreman-part-2#foreman_integration_fore)
   - [Deploying our first Windows VM](https://beryju.org/blog/getting-started-foreman-part-2#windows_deployment)
 - [Part 3: Deploying ESXi](https://beryju.org/blog/getting-started-foreman-part-3)
   - [Preparation of the Source](https://beryju.org/blog/getting-started-foreman-part-3#foreman_prepare_source)
   - [Creating templates](https://beryju.org/blog/getting-started-foreman-part-3#foreman_creating_templates)
   - [Integrating it with vCenter](https://beryju.org/blog/getting-started-foreman-part-3#vcenter_integration)
   - [Deploying our first ESXi Box](https://beryju.org/blog/getting-started-foreman-part-3#deploying)
 - Part 4: Getting Started with Puppet
 - Part 5: Advanced Puppet

### Prerequisites

** This is technically a continuation of the [previous part](blog/getting-started-foreman-part-2), but since I redid most of my VMs, the hostnames are going to be different. **

Here's a quick list of things you need to follow this tutorial:
 - an ESXi 6.0 ISO (using u2 in this case, can't offer a direct download here .[.](https://www.reddit.com/r/homelab/comments/4vym2d/rhomelabs_ftp_server/).)
 - enough room for an ESXi VM (2 Cores/4 GB Ram) or an empty host

Enough rambling, let's get started.

## Preparation of the Source<a name="foreman_prepare_source"></a>

First of we're going to need to extract all files from the installation ISO. To do that, we're going to mount it under `/mnt` and copy the files over to `/srv/tftp/esxi/6`. We also have to adjust the prefix on the bootloader, since it wants to load files straight from the root. After that we have to make some adjustments to `syslinux`, since the version shipping with Foreman doesn't quite do what we need it to do.
```
mount -noloop $PATH_TO_YOUR_ISO /mnt
mkdir -r /srv/tftp/esxi/6
cp -a /mnt /srv/tftp/esxi/6
umount /mnt
cd /srv/tftp/esxi/6/
sed -i.org 's&/&&g' boot.cfg
echo 'prefix=../esxi/6/' >> boot.cfg
cd /tmp/
wget -q https://www.kernel.org/pub/linux/utils/boot/syslinux/3.xx/syslinux-3.86.tar.bz2
tar xjf syslinux-3.86.tar.bz2
mkdir /srv/tftp/syslinux386
cp syslinux-3.86/core/pxelinux.0 /srv/tftp/syslinux386/
find syslinux-3.86/com32/ -name \*.c32 -exec cp {} /srv/tftp/syslinux386 \;
ln -s ../pxelinux.cfg /srv/tftp/syslinux386/
cp /usr/lib/syslinux/modules/bios/pxechn.c32 /srv/tftp/
cp /usr/lib/syslinux/modules/bios/libcom32.c32 /srv/tftp/
echo 'DEFAULT chainloadsyslnx386' > /srv/tftp/goto.cfg
echo 'DEFAULT installesx60' > /srv/tftp/syslinux386/goto.cfg
```
Now that we have all files in place, we can close the SSH session and jump over to the webinterface to create all necessary objects there.

## Creating templates<a name="foreman_creating_templates"></a>

We're going to start with the Installation Media. This isn't actually used by ESXi during the installation, but it is required by Foreman.

` image `

Afterwards, we have to create the operating system itself. Choose `Red Hat` as the family and `SHA512` for the password hash. You can also go ahead and set the installation media to the one we just created in the `Installation Media` tab after you create the OS.

Now we need to create our PXELinux template, to tell Foreman where it can find our ESXi sources.
```
<%#
kind: PXELinux
name: ESXi 6.0 (PXELinux)
oses:
- ESXi 6.0
%>

INCLUDE goto.cfg

LABEL chainloadsyslnx386
  kernel pxechn.c32
  append /syslinux386/pxelinux.0 -p /syslinux386/

LABEL installesx60
  kernel ../esxi/6/mboot.c32
  append -c boot.cfg ks=<%= foreman_url('provision') %>
```
Make sure that you set the type as `PXELinux` and choose ESXi in the `Association` tab.

Next up is the actual provisioning template, which tells ESXi what to install and which settings to use. Be sure to set the type to `Provisioning` and associate the template with ESXi.
```
<%#
kind: provision
name: ESXi 6.0 (Provision)
oses:
- ESXi 6.0
%>

# Accept the VMware End User License Agreement.
vmaccepteula
rootpw --iscrypted <%= root_pass %>

# Partitioning.
# Default: Clear all partitions.
<% if @dynamic -%>
%include /tmp/diskpart.cfg
<% else -%>
<%= @host.diskLayout %>
<% end -%>

install --firstdisk --overwritevmfs

network --bootproto=dhcp --device=vmnic0

reboot

%post --interpreter=busybox

# Fix DNS.
echo "nameserver <%= @host.subnet.dns_primary %>" > /etc/resolv.conf

echo "Informing Foreman that we are built"
wget -q -O /dev/null <%= foreman_url %>

exit 0

while ! vim-cmd hostsvc/runtimeinfo; do
sleep 10
done

# enable & start SSH
vim-cmd hostsvc/enable_ssh
vim-cmd hostsvc/start_ssh

# enable & start ESXi Shell
vim-cmd hostsvc/enable_esx_shell
vim-cmd hostsvc/start_esx_shell

# Suppress ESXi Shell warning
esxcli system settings advanced set -o /UserVars/SuppressShellWarning -i 1
exit 0

%firstboot --interpreter=python
<%= snippet "esxi_join_vcenter.py" %>
```

We also need a minimal partition table for this install. This just formats and installs ESXi on the first disk it can find.

```
<%#
kind: ptable
name: ESXi 6.0 (Partitioning)
oses:
- ESXi 6.0
%>

clearpart --firstdisk --overwritevmfs
```

Again, set the OS Family to Red Hat and that's mostly it for our Foreman templates. We're going to come back later to finalize the vCenter integration, but for now, this is all.

## Integrating it with vCenter<a name="vcenter_integration"></a>

We could in theory install ESXi via Foreman. But since this series is all about automation, what fun would that be without having it auto-join our vCenter? For security reasons, we have to create a separate vCenter use, that can only add hosts. This is because we unfortunately need to enter that user's password in plain-text. We also have to store our ESXi root password in plain-text, so you might want to change that post-install with a Host Profile or the like.
Since we can't assign rights on a per-user basis in vCenter, we have to create a role for this first, which only has the permission "Host -> Inventory -> Add host to cluster", as show here:

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-3/57b760fd51b9d.png)

Next, we need to create a user with a decently complicated password, and assign it the just created role

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-3/57b760e27afc9.png)

Now, because we at least want a little bit of obscurity and not just the plain-text password, we're going to base64-encode it. This doesn't make it any safter, it just hides the passwords from the untrained eye. To do that, we can use the Linux utility `base64`. Execute ` echo "YourPasswordHere" | base64` on any Linux machine you have access to. Do that for both the vCenter user and the ESXi root, and save the output in a notepad.

Now, since the script used to join vCenter is kinda long, I posted it to my [Git](https://git.beryju.org/snippets/8), which, thinking about it, makes sense for other snippets here. Oh well.
This needs to be created as a snippet, with the filename `esxi_join_vcenter.py`

Finally, we have to copy our vCenter Datacenter/Cluster Structure to Foreman hostgroups, since the hostgroup is used to determine, which Datacenter and Cluster the ESXi Machines is going to join.

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-3/5ddc4118ffbf0d476f050f0dfd9b161062ef74b35f44456267525a0457d30b0d0d0fd5f1860620882301af0618f10af4a5ea417009bac68468f57ffd264ab876.png)

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-3/d60482fe3cb9163887d21f1348e201ab05880aa1c9868538bfc73437c72586beab504ddc1acf025533c349442174f12684388f544d2c8ab73d0efc6f9089ce4e.png)

We also have to set our passowrds and the vCenter hostname, which I suggest you set on the root hostgroup. Click `Edit` and browse to the `Parameters` tab, so you can fill the global parameters in as shown here

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-3/57b760bca517d.png)

## Deploying our first ESXi Box<a name="#deploying"></a>

Creating the ESXi Box is the simplest task out of all of them. Deploying it in a VM is basically the same as deploying Linux/Windows, with the only difference for a physical host being, that you have to enter it's MAC address beforehand under `Interfaces` -> `Edit`, so Foremam can create a DHCP reserveation for that MAC address.

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-3/eaaa6edda24965d94f66b94bc0f8883aeea29e7a8fa941b47767406bf9598a52e0df8286ea62cda8fcdd4d01b22047369f4737d311c140eaacabec8ee55f3aab.png)

If everything worked coorectly, you should end up with this:

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-3/final.png)

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-3/67717e239c13c01ee5f139fa65a8eb361f85de72acfe926a9b7f352a3de56aac4d08666d707561a484fd0e829c52d057a399e578d3dbe162efbe28e09097a065a.png)
