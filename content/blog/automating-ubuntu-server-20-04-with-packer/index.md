---
title: 'Automating Ubuntu Server 20.04 with Packer'
date: '18:04 27-04-2020'
taxonomy:
    category:
        - blog
    tag:
        - ubuntu
        - server
        - ubuntu-20.04
        - Packer
        - cloud-init
        - rancher
        - cloud-init-vmware
        - vsphere
        - vmware
    author:
        - jens
---

Ubuntu Server 20.04 has been out for a few days, which I think is a perfect time to build start my migration from Debian to Ubuntu. Now, with Debian, I had a nice Packer setup, that automatically builds base-images. These images have some default packages installed, some miscellaneous settings and a default user. These images are used by an Ansible Workflow that creates new VMs on the fly, and deploys whatever tools I need into the VM.

To build this setup with Debian, I used a preseed file. This solution has been around for ages. However, with the release of Ubuntu 20.04, they've introduced a new Installer called the "Live Installer".

![](https://beryju-org-assets.s3.beryju.org/blog/automating-ubuntu-server-20-04-with-packer/installer.png)

This installer is based on [curtin](https://curtin.readthedocs.io/en/latest/topics/overview.html), [netplan](https://netplan.io/) and [cloud-init](https://cloudinit.readthedocs.io/en/latest/). Whilst this is great in theory, especially for cloud-environments, it is a bit more difficult for on-prem installs.

Whereas with a preseed file being based on `d-i ...` statements, this new flow is completely YAML based. An example file could look like this:

```yaml
#cloud-config
autoinstall:
    version: 1
    locale: en_US
    keyboard:
        layout: en
        variant: uk
    identity:
        hostname: system
        username: vagrant
        # `vagrant`, but hashed
        password: '$6$xzsJvkg10l$/MR33d6N0hKXj23Mlb7xustF5i2TzA1iQt9gErJysQxnANBHUyeUdyc.paED1gB0tIx5XPG2Zic4BLygr1Z2a/'
    ssh:
        install-server: yes
        allow-pw: yes
```

There are equivalents for all `d-i` Options, which are listed here: https://wiki.ubuntu.com/FoundationsTeam/AutomatedServerInstalls/ConfigReference.
In my opinion this is a much cleaner overview to all options. With preseed files you'd often run into some cryptic option, that would result in 30 minutes of googling.

Now that we have this installer file, we need to somehow tell Ubuntu to use it for the install. This has also slightly changed from previous Ubuntu versions, with the main change being that floppy drives no longer mount by default.

According to the [cloud-init documentation](https://cloudinit.readthedocs.io/en/latest/topics/datasources/nocloud.html), a floppy drive with the label of `cidata` should work, but Packer has no option to set the floppy label for vSphere.

The only other options for loading the cloud-init configuration is via HTTP (directly from Packer or some other URL), or building a custom ISO.

Since I didn't want to build a custom ISO, I ended up uploading my cloud-config YAML to my s3, and referencing to it from the Packer file.

This is the full Packer file I ended up using:

```json
{
    "variables": {
        "vm_name": "ubuntu2004-amd64-beryjuorg-base",
        "vcenter_address": "",
        "vcenter_user": "",
        "vcenter_password": "",
        "vcenter_dc": "",
        "vcenter_cluster": "",
        "vcenter_host": "",
        "vcenter_datastore": "",
        "vcenter_network": "",
        "vcenter_ignore_ssl": "true"
    },
    "sensitive-variables": [
        "vcenter_password"
    ],
    "builders": [
        {
            "type": "vsphere-iso",
            "name": "{{ user `vm_name` }}",

            "vcenter_server": "{{ user `vcenter_address` }}",
            "username": "{{ user `vcenter_user` }}",
            "password": "{{ user `vcenter_password` }}",
            "insecure_connection": "{{ user `vcenter_ignore_ssl` }}",

            "cluster": "{{ user `vcenter_cluster` }}",
            "host": "{{ user `vcenter_host` }}",
            "datacenter": "{{ user `vcenter_dc` }}",
            "datastore": "{{ user `vcenter_datastore` }}",
            "network": "{{ user `vcenter_network` }}",

            "vm_name": "{{ user `vm_name` }}",
            "guest_os_type": "ubuntu64Guest",
            "convert_to_template": true,

            "CPUs": 2,
            "RAM": 2048,

            "disk_size": 8192,
            "disk_controller_type": "pvscsi",
            "disk_thin_provisioned": false,
            "network_card": "vmxnet3",

            "ssh_username": "vagrant",
            "ssh_password": "vagrant",
            "ssh_port": 22,

            "iso_paths": [
                "[esxi2-ssd1] ubuntu-20.04-live-server-amd64.iso"
            ],
            "boot_wait": "2s",
            "boot_command": [
                "<esc><esc><esc>",
                "<enter><wait>",
                "/casper/vmlinuz ",
                "root=/dev/sr0 ",
                "initrd=/casper/initrd ",
                "autoinstall ",
                "ds=nocloud-net;s=https://ubuntu-2004-cloud-init.s3.beryju.org/",
                "<enter>"
            ],
            "shutdown_command": "echo 'vagrant'|sudo -S shutdown -P now"
        }
    ],
    "post-processors": []
}
```

This creates an Ubuntu 20.04-based VM Template in vSphere, with a vagrant/vagrant user pre-defined. Whilst this image is already very useful, there is another step that I like to add to my images.

I plan to use this image with [Rancher](https://rancher.com/)'s vSphere Provisioner, which means I need the vSphere cloud-init datasource. This is available as a plugin [here](https://github.com/vmware/cloud-init-vmware-guestinfo).

My final provisioning script looks like this:

```shell
apt-get install -f -y python net-tools curl cloud-init python3-pip

# Install VMWare Guestinfo Cloud-init source, used by rancher
curl -sSL https://raw.githubusercontent.com/vmware/cloud-init-vmware-guestinfo/master/install.sh | sh -

# Reset Machine-ID
# http://manpages.ubuntu.com/manpages/bionic/man5/machine-id.5.html
# This is the equivalent of the SID in Windows
# Netplan also uses this as DHCP Identifier, causing multiple VMs from the same Image
# to get the same IP Address
rm -f /etc/machine-id

# Reset Cloud-init state (https://stackoverflow.com/questions/57564641/openstack-Packer-cloud-init)
# systemctl stop cloud-init
# rm -rf /var/lib/cloud/
cloud-init clean -s -l
```

This installs the datasource and resets the machine-id, thus resetting the Machine's state. Add this snippet to the Packer file to run this script after the install is done:

```json
[...]
    "provisioners": [
        {
            "type": "shell",
            "execute_command": "echo 'vagrant' | {{.Vars}} sudo -S -E bash '{{.Path}}'",
            "script": "scripts/setup_ubuntu2004.sh"
        }
    ],
[...]
```

After all of this is done, Packer converts the VM to a Template, which can then be used for further automations with Ansible, Rancher, or whatever floats your boat.

Hope this post helps you update to Ubuntu 20.04 and upgrade your infrastructure.

# Edit 2020-04-27:

After playing around a bit more with the Rancher integration, I've noticed some things. Rancher uses an auto-generated ISO for Cloud-init Metadata, which means you don't need the VMware datasource for Rancher. I will, however, be keeping it in my image, to make provisioning with Ansible easier. The other thing I noticed is that Docker does not yet have Community Edition builds for Ubuntu 20.04. Let's hope they add Focal Packages in the next few days, so we can actually start running stuff on 20.04.
