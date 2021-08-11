---
title: 'Running Home-Assistant with Supervisor on Ubuntu'
date: '2020-12-14T18:04:00+02:00'
taxonomy:
    category:
        - blog
    tag:
        - ubuntu
        - server
        - ubuntu-20.04
        - home-assistant
        - hass
        - hassio
        - supervisor
    author:
        - jens
---

Recently, Home-Assistant have changed their stance, and only "support" installations on [HassOS and Debian 10 (at the time of writing this)](https://www.home-assistant.io/more-info/unsupported/os).

Normally, this wouldn't really matter to me, as I don't really care about having a "supported" system or not. However, they also decided, that unsupported installations can't get OTA Updates through Supervisor, such as upgrading to the recently [recently released version 2020.12](https://www.home-assistant.io/blog/2020/12/13/release-202012/).

Now, being curious as I am, decided to snoop a bit in the supervisor Source to find how this check works.

In the file [`operating_system.py`, on line 8](https://github.com/home-assistant/supervisor/blob/main/supervisor/resolution/evaluations/operating_system.py), they check against the static string `Debian GNU/Linux 10 (buster)`.

The current value for this check is retrieved [here, in Line 98](https://github.com/home-assistant/supervisor/blob/main/supervisor/dbus/hostname.py#L98). From the name of the variable we can see, that DBus is used to get the value.

After some more research, I found [this](https://www.freedesktop.org/software/systemd/man/org.freedesktop.hostname1.html#Methods%20and%20Properties), which states that
```
OperatingSystemPrettyName, OperatingSystemCPEName, and HomeURL expose the PRETTY_NAME=, CPE_NAME= and HOME_URL= fields from os-release(5).
```

Looking further, I found [that `os-release` simply takes the value from /etc/os-release](https://www.freedesktop.org/software/systemd/man/os-release.html#).

This makes the check quite easy to bypass.

! Doing this will obviously make your install unsupported. If you run into any issues during/after this modification, I take no responsibility in the matter.

On your Home-Assistant VM, simply edit `/etc/os-release`, and comment out the existing `PRETTY_NAME` value:

```
#PRETTY_NAME="Ubuntu 20.04.1 LTS"
```

and add the value Supervisor is expecting:

```
PRETTY_NAME="Debian GNU/Linux 10 (buster)"
```

Afterwards, save the file and reboot the VM. Now you should be able to upgrade Home-Assistant through Supervisor again.
