---
title: Pixel 9 Pro XL
date: 2024-10-29 19:29:07
tags: [tech, android]
---

Pixel 6 Pro 碎了，遂换了 Pixel 9 Pro XL。

不过本来我就有比较强烈的换机欲望了，Pixel 6 Pro 的初代 Tensor 处理器可以说是💩，发热严重且慢，就是能效很低。

<!-- more -->

![](https://s2.loli.net/2024/10/31/MeVSKzQOyLUWqtc.jpg)

## 为什么不用其他手机？

在同等价位下，大部分其他手机诚然有比 Pixel 更高的性价比，比如说更好的处理器，系统的本地化，而且完善的售后服务网络。但是！👇

### Google Pixel 优势

- 完整原生的 Google 服务
- 原生 Android 体验
- 可以第一时间体验到最新版本的 Android
- 隐私保护（可以刷入*GrapheneOS*）
- Gemini AI
- 干净极简的审美
- 可以解锁 Bootloader，方便对手机进行魔改
- ~~信仰~~

### 不选择其他手机

- 满天飞的广告
- 毒瘤软件
- - iOS不开放的系统环境

## 实机体验

版本分为美版台版日版（欧版）

### 不同版本比较

国内使用体验：台版>日版>美版

当前价格贵到低：美版>台版>日版

| 版本      | 毫米波支持 | 国内主要影响                                       |
| --------- | ---------- | -------------------------------------------------- |
| 美版      | 支持       | 国内用不上，缺少移动5G N79频段，移动5G体验稍差     |
| 台版/欧版 | 不支持     | 国内三大运营商频段全支持                           |
| 日版      | 不支持     | 国内三大运营商频段全支持，但拍照有声音，需root修改 |

我这次买的是日版的 Pixel 9 Pro XL。8.2k 购入 512G

## 包装

现在手机厂商的包装真是越来越 ~~差~~ 环保了，有种从垃圾桶里捡回来的一样，全纸质。

![](https://s2.loli.net/2024/10/30/3fkMYteGWC9H7i2.jpg)

![](https://s2.loli.net/2024/10/30/CrvZEJBGhyL5xSM.jpg)

## 外观

Google 的设计美学一直都在我的审美上，采用四边等宽的6.8英寸直屏和直角边框设计，介于1.5K到2K的屏幕分辨率，有约3000nits的峰值亮度，可以说是目前最好的一块屏幕

不过那个毫米波天线真的是好奇怪，设计的不好看。

## DIY

### Root 权限

购买Pixel的一个很大原因就是方便刷机，可以一键解锁 Bootloader，在更新 Android 15 之后，打开开发者选项，打开 OEM，Type-C 连接到电脑上。

```
$ fastboot flashing unlock
```

即可解锁 Bootloader。

接下来是获取 root 权限，流行的一共有 3 种方案

- Magisk
- Kernel SU
- APatch

我选用的是 APatch，隐藏性更好，更新也比较快。

在[这里](https://developers.google.com/android/images#komodo)找到你对应的系统，下载刷机包，提取出 boot.img boot_init.img 等镜像文件。

在 GitHub 上下载到 APatch 的 apk，用 APatch Manager 修补。

```
$ fastboot flash boot boot_apatch.img
$ fastboot reboot
```

重启之后打开 APatch Manager 就可以发现已经获得 root 权限了。

### 修改机型

由于我这一款 Pixel 是日版的，相机快门声音无法关闭，可以通过修改机型为美版或台版解决。

```
$ su
# dd if=/dev/block/by-name/devinfo of=/sdcard/devinfo_.img
```

用 Hex 编辑器，修改对应的机型代码即可。（注：Pixel 9 Pro 要自己搜索）

![](https://s2.loli.net/2024/10/31/2DWnbfioPN3Jrda.png)

```
# dd if=/sdcard/devinfo_.img of=/dev/block/by-name/devinfo
# exit
$ exit
$ adb reboot
```

### 模块

- Google Photos Unlimited Backup 谷歌相册无限备份
- Pixel Xpert 用来客制化系统UI
- Play Integrity Fix 防检测
- Tricky Store 防检测
- ZygiskNext
- LSPosed_mod

### 模拟门禁

用 Card Emulator Pro 模拟门禁卡，就可以开宿舍门了

![](https://s2.loli.net/2024/10/31/yHOE1fUQDqzbPrL.png)

### 优化

Google 对软件层面的优化还是数一数二的，但是再好也压不过国产毒瘤软件（）

用 Thanox Pro 乖巧模式压一下国产毒瘤后台。

![](https://s2.loli.net/2024/10/31/h14AIxou3eV6CjT.png)

## 缺点

- 三星debuff工艺处理器
- 贵！！！

