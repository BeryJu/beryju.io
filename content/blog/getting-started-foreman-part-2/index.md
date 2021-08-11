---
title: 'Getting Started with Foreman: Part 2'
published: true
date: '2016-07-17T00:00:00+02:00'
metadata:
    keywords: 'foreman,provisioning,getting-started-with,tutorial,vmware,esxi,debian,dhcp,dns,tftp,getting-started-with-foreman'
    description: 'Getting Started with Foreman Part 2'
taxonomy:
    category:
        - blog
    tag:
        - tutorial
        - vmware
        - esxi
        - foreman
        - provisioning
        - getting-started-with
        - debian
        - dhcp
        - dns
        - tftp
        - getting-started-with-foreman
    author:
        - jens
jscomments:
    active: true
    provider: disqus
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

Continuing on from last [part](/blog/getting-started-foreman-part-1), we're going to provision Windows (7/10/Server). There are two ways to do this, [Wimaging by kireevco](https://github.com/kireevco/wimaging) or a WDS Server. I am going to show you the WDS way since it integrates with MDT. Also Wimaging hasn't been updated in a while.

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

** Since this is a continuation of the previous [part](/blog/getting-started-foreman-part-1), the hostnames are going to be the same as last time. **

Here's a quick list of things you need to follow this tutorial:
 - a Windows Server ISO (I am using 2012R2 Datacenter here, but anything that has the ability to install WDS will work)
 - an ISO of the Windows you want to install (I am using Windows 10 Pro x64 here, but it's pretty much the same with Windows 7/8/8.1)
 - about 150 GB Free Space on your VM host for MDT and the provisioned Windows VM
 - about 1-2 hours of your spare time
 - (optional, but recommended) an existing Active Directory Domain. I am not going to be relying on this, but I'll highlight where the steps differ.

Enough rambling, let's get started with installing the WDS Server.

## Installing and Configuring the WDS Server<a name="install_wds"></a>

The VM doesn't need a lot of power. I set mine up with one vCPU, 4 GB of RAM and 2 Harddrives. I use the first harddrive for the Windows install and the second one for WDS/MDT. This should be enough for 99% of all environments, since it essentialy only serves as a TFTP/SMB Server.

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/0_vm.png)

Mount your Windows Server ISO and start the install. There's nothing special to do here, just format both drives, select the first one as installation target and lean back for 15-30 mins while it installs itself.

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/1_ws%20install.png)

After we're done installing the OS, we're going to change the Hostname and a few other things. I am going to call my Server `war-dev-mdt01.beryju.org`, but you can call it whatever you want to. Additionally I am going to assign it a static IP since it shouldn't have to rely on Foreman's DHCP Server. After having done that, reboot the Machine so the Hostname is applied. After the restart, you'd also join it to the domain if you have one. Now begins the actual installation of our WDS Server. Open the Server Manager and go to `Manage`, `Add Roles and Features` and click next until you're presented with a list of roles to add. From that list we're going to select `Windows Deployment Services`. Answer the popup with `Add Features` since we want the Management tools as well.

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/2_wds%20install.png)

The rest of the wizard can be left as-is, just make sure both `Deployment Server` and `Transport Server` are checked in the WDS install pane. After the installation is completed, you need to start the `Post-Installation Tasks`, which creates a few necessary directories and files. If you have enabled Remote Management and you are joined to a domain, you can do the rest of this via the RSAT on your Desktop.

Now is also a good time to copy over the ISO of the OS we want to install. I created a seperate folder on the seconday drive named `Images`, where I just create a subfolder for every ISO. Now you shoud copy all files off the ISO,

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/4_copy%20iso.png)

## Installation and Basics of MDT 2013u2<a name="mdt_basics"></a>

Now, before we can install MDT, we have to install ADK.
>Windows Assessment and Deployment Kit (Windows ADK), formerly Windows Automated Installation Kit (Windows AIK or WAIK), is a collection of tools and technologies produced by Microsoft designed to help deploy Microsoft Windows operating system images to target computers or to a VHD (Virtual Hard Disk). It was first introduced with Windows Vista.
<cite>[Wikipedia](https://en.wikipedia.org/wiki/Windows_Assessment_and_Deployment_Kit)</cite>



The ADK installer can be downloaded [here](https://developer.microsoft.com/en-us/windows/hardware/windows-assessment-deployment-kit). I'd reccomend to insatll it on the seconday disk as well. All you need for MDT to work is `Deployment Tools` and `Windows Preinstallation Environment (Windows PE)`

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/5_adk.png)

Onward to MDT. MDT is the actual Framework that allows you to customize Windows installations. We need this so we can:
 - Automatically install Applications
 - Automatically join the PC to the Domain (optional)
 - and, most importantly, notify Foreman when the install is done.

As of July 2016 the latest version is 2013u2, which can be downloaded [here](https://www.microsoft.com/en-us/download/details.aspx?id=50407). The installation of MDT itself is pretty easy: Next, Accept, Next, Next, Next, Done. Now we have access to the `Deployment Workbench`, where we are going to spend the next chunk of our time.

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/6_mdt%201.png)

To actually work with MDT, we have to create a Deployment Share. This Share holds all Data to install the OS, the PXE Boot Images, applications to install and more. I am going to use `D:\DeploymentShare` as a Path for it. On the options page, tick all checkboxes so it asks as little as possible during install. Afterwards it should look like this if everything went right.

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/7_mdt%20done.png)

Next step is to actually add the OS. To do that, we're going to `Operating System`, `Import Operating System` on the right. Select `Full set of source files`, navigate to the Directory of the ISO you copied earlier and continue on. The Import process is going to take a while, so lean back and relax for a few minutes.

After that is done, we're going to create our first Task Sequence. A Task Sequence defines what the Preinstallation System actually does, so things like format disk 0, clone the image to that partition and so on.  The ID we choose is very important, since it has to match with the OS we're creating in Foreman. Go with `windows_10_0` so it matches with the later instructions. (I know the pictures show something different, but `windows_10_0` is correct.) The Template we're going to use is `Standard Client Task Sequence` since we're going to install a desktop OS. If you want to provision Windows Server with this, you should use `Standard Server Task Sequence`. Next select the OS you want to install. After that we can input a Windows Key, which I'd reccomend since it takes one manual step away from the install. The rest of the wizard should be self-explanatory.

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/8_tas%20done.png)

## Integrating it with Foreman (the Windows side)<a name="foreman_integration_win"></a>

This is the part where we actually integrate WDS/MDT with Foreman. The goals for this part are:
 - Get the Windows Installer to tell Foreman when it's done
 - Get the Windows Installer to ask Foreman for the PC's hostname

For that first point, I've found it's easiest to just have the installer execute a PowerShell script which calls Foreman. To enable PowerShell in the installer, we have to right click on the Deployment Share in our Deployment Workbench. Then we select the architecture on top to configure the correct boot image.

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/9_pe%20powershell.png)

Since we're already here, we can also add the part that asks Foreman for the hostname. In the same window under the Rules tab, enter the following:
```ini
[Settings]
Priority=Default, GetComputerName, GetTaskSequence

[Default]
OSInstall=YES
SkipCapture=YES
SkipAdminPassword=YES
SkipProductKey=YES
SkipComputerBackup=YES
SkipBitLocker=YES
SkipBDDWelcome=YES
SkipUserData=YES
SkipComputerBackup=YES
SkipComputerName=YES
SkipDomainMembership=YES
SkipLocaleSelection=YES
SkipSummary=YES
SkipTimeZone=YES
SkipTaskSequence=YES
TimeZoneName=W. Europe Standard Time

[GetComputerName]
WebService=http://war-dev-puppet01.beryju.org/unattended/provision
Method=GET
OSDComputerName=string

[GetTaskSequence]
WebService=http://war-dev-puppet01.beryju.org/unattended/user_data
Method=GET
TaskSequenceID=string
```

(Quick note: if you're integrating this into an AD Domain, you should create a seperate user for this and not use the administrator account.) Obviously, the `Domain` settings can be left out if you're not using an AD Domain. Click on the button `Edit Bootstrap.ini` and add the lines
```
SkipBDDWelcome=YES
UserID=administrator
UserDomain=corp.beryju.org
UserPassword=<password>
```
at the end. This wil skip the initial welcome screen and the network credentials. Confirm these settings with ok.

Now we have to create a small PowerShell Script, which basically tells Foreman that we're done with the base install and that it shouldn't PXE boot this machine again. This File needs to be accessible by the installer, so put it on the DeploymentShare Folder. (Mine is called Postinst.ps1) (Also make sure it's actually `.ps1` and not `.ps1.txt`)

```powershell
$r = [System.Net.WebRequest]::Create("http://war-dev-puppet01.beryju.org/unattended/built")
$resp = $r.GetResponse()
$reqstream = $resp.GetResponseStream()
$sr = new-object System.IO.StreamReader $reqstream
$result = $sr.ReadToEnd()
write-host $result
```

We also need to add a step to the Task Sequence, so the script is executed at the right point in the install. Open the Task Sequence Steps by right-clicking your Task Sequence, selecting Properties and navigating to the second tab.
Here you need to add a `Run a PowerShell Script` Task by clicking on Add, General and `Run a PowerShell Script`. Set the 'PowerShell script' field to the UNC Path of your PowerShell script.

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/10_tas%20foreman.png)

Now we have to build the WIM Files, which can be done by right-clicking our `Deployment Share` and selecting `Update Deployment Share`. After this is done, we need to add the Boot and Install image to WDS itself. Go back to your `Windows Deployment Services` Console. First, add the Boot Image by selecting `Boot Images` on the left side, right-click on the blank and select `Add Boot Image...`. The Path for the Boot image is `D:\DeploymentShare\Boot\LiteTouchPE_x64.wim`. After that, add the Install Image by doing the same in the `Install Images` Section. You have to create a Boot Image Group first though, which you can name whatever you want. The Path for the Install Image is ```D:\DeploymentShare\Operating Systems\Windows 10 Pro x64\sources\install.wim```.

We also have also have to disable listening on DHCP ports and the F12 Key Prompt. This is done in the Server Properties; under the `DHCP` tab the first Checkbox and under the `Boot` tab both policy selections to `Always continue the PXE boot`. This is all we (should) have to do in Windows for now.

## Integrating it with Foreman (the Foreman side)<a name="foreman_integration_fore"></a>

Now we also need to tell Foreman about our WDS Server. First, we have to manually create a DNS record for our WDS service, Execute
```echo -e "server localhost\nupdate add war-dev-mdt01.beryju.org 86400 a 172.16.4.59\nsend" | nsupdate  -D -k /etc/bind/rndc.key``` on your Foreman server after replacing `war-dev-mdt01.beryju.org` with the FQDN of your WDS server and `172.16.4.59` with the IP of it. We also have to disable the requirement of SSL since MDT WebServices don't like unsigned HTTPS certs, so execute this ```sed -i -e 's/:require_ssl: true/:require_ssl: false/g' /etc/foreman/settings.yaml && /etc/init.d/apache2 restart``` Afterward, we're going to create the Operating System in Foreman. To do that, open the Web interface and navigate to `Hosts`, `Operating System` and select `New Operating System`. Then fill all fields in as shown in the next picture.

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/12_fore%20os.png)

After that, we have to create all the templates needed for WDS. Navigate to `Host`, `Provisioning Templates` and click on `New Template`. The name should be something like `WDS Provision`, and the content is the follwoing:
```
<?xml version="1.0" encoding="utf-8"?>
<string xmlns="http://beryju.org"><%= @host.shortname %></string>
```
On the `Type` tab, you need to select `provision` as type, and on the `Associations` tab click on Windows in the `All Items` List. Create another template with the type `user_data` and the same association, but the title `WDS user_data` and the content
```
<?xml version="1.0" encoding="utf-8"?>
<string><%= @host.operatingsystem.name %>_<%= @host.operatingsystem.major %>_<%= @host.operatingsystem.minor %></string>
```

After that, create another template with the name `WDS PXE Chain`. This one is of the Type `PXELinux`, and the content should be this

```
<%#
kind: PXELinux
name: WDS PXE Chain
oses:
- Windows 10,
- Windows 8.1/Server 2012R2
%>

<% if @host.pxe_build? %>
default Windows
label Windows
    kernel pxechn.c32
    append 172.16.4.59::\boot\x64\wdsnbp.com -W
<% end %>
```
You're going to need to change the IP in that snippet to the IP of your WDS Server. Afterwards, we also need to create an empty Partition Table since that's done by MDT. Go to `Hosts`, `Partition Tables` and create a new one. The name should be something like `WDS Default`. Select `Windows` as Operating System Family and paste some filler text like this:
```
<%#
kind: ptable
name: WDS default ptable
oses:
- Windows Server 2008
- Windows Server 2008 R2
- Windows Server 2012
- Windows Server 2012 R2
- Windows
%>
```

Since Windows uses `x64` instead of `x86_64`, we also have to generate a new Architecture. This is done in the `Architecture` menu under `Hosts`. Simply click on `New Architecture`, enter `x64` as name and select Windows as the OS. Last we need to create an Installation Media. This is a Foreman requirement, but it's not actually used for anything. Make sure it looks similar to this

![](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/13_fore%20media.png)

and you should be good. The you can go back to the Operating System List, select Windows and select all those templates as defaults. Now before you can actually deploy a Windows Machine, you need to download these files [pxechn.c32](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/pxechn.c32) and [libcom32.c32](https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/libcom32.c32), and put it in `/srv/tftp` on your Foreman machine. Without this file, your PXE Server wouldn't be able to forward anything to WDS. Now these files worked fine for me when I initially wrote this tutorial, but if those don't work just get the [latest](https://www.kernel.org/pub/linux/utils/boot/syslinux/syslinux-6.03.tar.gz) and move all of these files to the TFTP Root: `chain.c32, ldlinux.c32,
libcom32.c32, libutil.c32, linux.c32, mboot.c32, menu.c32, pxechn.c32,
pxelinux.0`. Thanks to Ido Kaplan in the comments for the tip!

## Deploying our first Windows VM<a name="windows_deployment"></a>

Click `Hosts`, `New Host` and select the Windows OS on the `Operating System` tab. If you did everything correctly, you should be able to just lean back and watch it install itself, as you can see here: (sped up 20x)

<video controls style="max-width: 100%;" src="https://beryju-org-assets.s3.beryju.org/blog/getting-started-foreman-part-2/raw.webm"></video>
