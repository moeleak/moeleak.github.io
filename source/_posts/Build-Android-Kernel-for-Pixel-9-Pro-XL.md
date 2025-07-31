---
title: Build Android Kernel for Pixel 9 Pro XL
date: 2025-02-15 17:23:31
tags: [tech, android]
---

# 配置环境

macOS 下使用 orbstack 的 docker，建立镜像，建议别想着在 macOS 下编译，对于 android kernel，Google 只给了win和linux-x86平台下的工具链，如果想自己折腾的话会很麻烦，会浪费很多时间（我就是浪费了好多时间还没弄成功www）。

所以用 docker 会比较方便。

还有一件事，macOS 默认的 APFS 没有开启大小写敏感（case-sensitive），而内核编译需要大小写敏感的文件系统，因此你需要新加卷一个大小写敏感的文件系统。可以使用 disk unility 工具，如图所示。

![](https://s2.loli.net/2025/02/15/oUTnaryCwf53bvN.png)

```shell
$ docker run -v /Volumes/Projects:/projects --platform linux/amd64 -it ubuntu:22.04 bash
```

安装依赖：

```shell
$ sudo apt-get install git repo kmod cpio ccache automake flex lzop bison gperf build-essential zip curl zlib1g-dev g++-multilib libxml2-utils bzip2 libbz2-dev libbz2-1.0 libghc-bzlib-dev squashfs-tools pngcrush schedtool dpkg-dev liblz4-tool make optipng maven libssl-dev pwgen libswitch-perl policycoreutils minicom libxml-sax-base-perl libxml-simple-perl bc libc6-dev-i386 lib32ncurses5-dev libx11-dev lib32z-dev libgl1-mesa-dev xsltproc unzip device-tree-compiler python3 python2 binutils-aarch64-linux-gnu pahole gcc-arm-linux-gnueabihf gcc-aarch64-linux-gnu p7zip-full p7zip-rar 
```

# 下载 android kernel 

参考[这里](https://source.android.com/docs/setup/build/building-pixel-kernels)查看你的 pixel 代号，在国内可以用 ustc 和 thu 的源，不然下载会很慢

```shell
$ export REPO_URL='https://mirrors.tuna.tsinghua.edu.cn/git/git-repo/'
$ repo init -u https://mirrors.ustc.edu.cn/aosp/kernel/manifest.git -b android-gs-caimito-6.1-android14-qpr3-d1 --depth=1
$ repo sync -c --no-tags
```

# 编译

```shell
$ ./build_caimito.sh
```

## 从源代码编译，不使用 prebuilt

```shell
$ ./build_caimito.sh --config=use_source_tree_aosp
```

## 修改内核Kconfig配置文件

```shell
$ tools/bazel run //private/devices/google/caimito:zumapro_caimito_config -- menuconfig
```

其中 menuconfig 也可以改成 nconfig, savedefconfig

## 编译内核模块

参考 KernelSU 的 [GitHub Action](https://github.com/tiann/KernelSU/blob/main/.github/workflows/gki-kernel.yml) 脚本

