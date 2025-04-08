---
title: Pixelbook Go 使用体验
date: 2025-04-08 08:43:06
tags:
---

最近在海鲜市场花不到500买了 Pixelbook Go，来简单分享一下使用体验，总的来说比较超出我的预期。

# 刷入 Arch Linux

作为赛博洁癖，买来第一件事就是刷入 Arch，不喜欢 chromeOS 的一堆毒瘤软件。

解除写保护需要拆机暂时拆除电池，只接入电源。进开发者模式刷 UEFI 固件：

```bash
cd; curl -LOk mrchromebox.tech/firmware-util.sh && sudo bash firmware-util.sh
```

之前在 macOS 上的 pd 虚拟机安装 Arch Linux ARM 用的 archboot iso 安装，但是我到这个 Pixelbook Go 上启动失败，提示找不到 initram 于是换了官方的启动镜像成功了。

## 声卡驱动

参考[这个仓库](https://github.com/WeirdTreeThing/chromebook-linux-audio)即可一键部署声卡驱动程序

## Steam

这个本子用来玩galgame还是不错的，但是默认的 Steam proton 无法启动。需要用 proton-ge 魔改版。而且 Pixelbook Go 的 vulkan 驱动似乎有问题，目前我用不了 dxvk 来启动游戏，你可以用 wined3d 来尝试一下。

```shell
$ yay -S proton-ge-custom-bin
$ cd /usr/share/steam/compatibilitytools.d/proton-ge-custom/
$ sed -i 's/^[[:space:]]*#[[:space:]]*\("PROTON_USE_WINED3D": "1",\)/\1/' user_settings.py

```

但是不知道为什么，steamwebhelper 第一次启动会无响应，第二次就好了。而且 steamwebhelper 极其不优雅，早就想换掉了。

可以尝试一下 [steam-tui](https://github.com/dmadisetti/steam-tui)
```bash
$ yay -S steam-tui
```

不用臃肿的 web 界面即可快速启动游戏。

## 电池优化

可以试一下 [TLP](https://wiki.archlinux.org/title/TLP) 工具

```shell
$ sudo systemctl enable --now tlp
```

在 `/etc/tlp.conf` 中可以看到 TLP 的配置文件，在这里可以给电池做限制充电，就像 macOS 的 AlDente。
