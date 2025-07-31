---
title: 提取U校园视音频文件
date: 2025-01-13 15:06:27
tags: [tech, android]
comments: true
---

需要 root 权限，一次比较无聊的经历。

<!-- more -->

## 0x01

首先找到文件位置，由于全部下载，文件会比较大，只需找到文件所在位置，然后看哪个文件夹比较大就可以定位视音频文件了。

```shell
komodo:/data/data/cn.unipus.ucampus.student # du -sh *
18K	app_UApm
3.5K	app_textures
4.2M	app_webview
7.5M	cache
3.5K	code_cache
23K	crashsdk
204K	databases
5.9G	files
760K	shared_prefs
komodo:/data/data/cn.unipus.ucampus.student # cd files
komodo:/data/data/cn.unipus.ucampus.student/files # du -sh *
3.5K	auth
16K	bac.catch
4.0K	bwc.catch
24K	cn.jiguang.joperate.jcore_report
4.0K	com.tencent.open.config.json.1106180023
4.0K	com_alibaba_aliyun_crash_defend_sdk_info
4.0K	crs.catch
3.5K	dau
4.0K	exid.dat
3.5K	filedownloader
38M	i39bd9d1b6fefdb81
18K	jpush_stat_history
39K	jpush_stat_history_pushcore
356K	libijmDataEncryption.so
4.0K	push_stat_cache.json
4.0K	r_key_info
5.8G	s
3.5K	s_e
3.5K	stats
4.0K	umeng_it.cache
0	umeng_policy_result_flag
0	umeng_zcfg_flag
3.5K	userinfo
69M	www
komodo:/data/data/cn.unipus.ucampus.student/files #
---------------------------------------------
komodo:/data/data/cn.unipus.ucampus.student/files/s/e/yys3 # ls -la
total 6137375
drwx------ 2 u0_a471 u0_a471     24576 2025-01-13 15:03 .
drwx------ 3 u0_a471 u0_a471      3452 2025-01-13 14:38 ..
-rw------- 1 u0_a471 u0_a471 180790694 2025-01-13 14:43 .03525879A1678CE0661A3047B9179904.wys
-rw------- 1 u0_a471 u0_a471  17698039 2025-01-13 14:59 .059D19BC8DC951A1951EAD6B2AAB2D2A.wys
-rw------- 1 u0_a471 u0_a471    510824 2025-01-13 14:47 .099BB643CF75F4034594B49EB3D4F105.wys
-rw------- 1 u0_a471 u0_a471  18964672 2025-01-13 15:02 .09C4A48CD6B2E6E42CE49B3900183580.wys
-rw------- 1 u0_a471 u0_a471    528987 2025-01-13 14:39 .0BBBC1EA5E84620AF862500ABFCA8E64.wys
-rw------- 1 u0_a471 u0_a471  15923918 2025-01-13 14:42 .120D48F44C16718060454E55ADE88F2D.wys
-rw------- 1 u0_a471 u0_a471    464099 2025-01-13 14:44 .125F3C8C9EE14F5FE68476E7CEBFE453.wys
-rw------- 1 u0_a471 u0_a471   1529286 2025-01-13 14:45 .1292F1B558E2A5D3CC433E253F7A96E7.wys
-rw------- 1 u0_a471 u0_a471    701727 2025-01-13 14:47 .12FC64E26F9EC26CFE56D810B19CE09B.wys
-rw------- 1 u0_a471 u0_a471    522405 2025-01-13 14:42 .1400FC514F47DCAA5A4F2C46C03D00DE.wys
-rw------- 1 u0_a471 u0_a471    505809 2025-01-13 14:46 .15480FE404DA8AA31E7B20DB0525610E.wys
-rw------- 1 u0_a471 u0_a471   2762788 2025-01-13 15:00 .15F06D4033DDF699D3854296FE0FB839.wys
-rw------- 1 u0_a471 u0_a471    242476 2025-01-13 14:41 .16FB7917F2EB4200368037A03F387846.wys
......
komodo:/data/data/cn.unipus.ucampus.student/files/s/e/yys3 #
```

确定都在 `/data/data/cn.unipus.ucampus.student/files/s/e/yys3`里，拷贝复制到`/sdcard`里，直接adb pull到电脑上

## 0x02

确定文件格式

```shell
$ xxd .03525879A1678CE0661A3047B9179904.wys | less
```

![](https://s2.loli.net/2025/01/13/kWEg8GO7tK2aQbU.png)

因为它的存储形式是 “mp42”，而不是 “24pm”，这一点就可以看出这是一个大端的 32 位格式。所以数据会按照 4 个字节进行存储。

貌似没有对格式进行什么加密，修改，看起来就是mp4文件，但是我的播放器不能直接打开。

写个脚本转换一下

```bash
#!/usr/bin/env bash
i=1
for file in $(ls -tr .*.wys); do
    echo "Converting $file -> ${i}.mp4"
    ffmpeg -i "$file" -c copy "${i}.mp4" -loglevel quiet
    ((i++))
done
echo "All done!"
```

## 0x03

![](https://s2.loli.net/2025/01/13/XPkJE3dba1LAcxQ.png)
