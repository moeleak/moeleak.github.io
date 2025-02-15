---
title: Build Android kernel for Pixel 9 Pro XL
date: 2025-02-12 17:23:31
tags: [tech, android]

---

# 配置环境

macOS 下使用 orbstack 的 docker，建立镜像：

```shell
$ docker run -v /Volumes/Projects:/pubghack --platform linux/amd64 -it ubuntu:22.04 bash
```

安装依赖：

```shell
# apt-get install git repo kmod cpio ccache automake flex lzop bison gperf build-essential zip curl zlib1g-dev g++-multilib libxml2-utils bzip2 libbz2-dev libbz2-1.0 libghc-bzlib-dev squashfs-tools pngcrush schedtool dpkg-dev liblz4-tool make optipng maven libssl-dev pwgen libswitch-perl policycoreutils minicom libxml-sax-base-perl libxml-simple-perl bc libc6-dev-i386 lib32ncurses5-dev libx11-dev lib32z-dev libgl1-mesa-dev xsltproc unzip device-tree-compiler python3 python2 binutils-aarch64-linux-gnu pahole gcc-arm-linux-gnueabihf gcc-aarch64-linux-gnu p7zip-full p7zip-rar 
```

