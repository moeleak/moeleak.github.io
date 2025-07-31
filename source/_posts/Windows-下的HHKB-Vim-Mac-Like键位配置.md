---
title: Windows 下的HHKB+Vim+Mac-Like键位配置
date: 2025-06-03 01:28:33
tags: [tech, Windows]
---

折腾了一圈 PowerToys 的改键，但是不可以编程，自定义的功能比较少，最后还是用 AutoHotkey 实现了一下，吐槽一下 ahk 的神经病语法，幸好现在是 ai 时代，ai就可以帮我实现我的需求，遇到问题再修改一下就可以了。

附上我的配置文件：

```ahk
full_command_line := DllCall("GetCommandLine", "str")
if not (A_IsAdmin or RegExMatch(full_command_line, " /restart(?!\S)"))
{
        try
        {
                if A_IsCompiled
                        Run *RunAs "%A_ScriptFullPath%" /restart
                else
                        Run *RunAs "%A_AhkPath%" /restart "%A_ScriptFullPath%"
        }
        ExitApp
}


CTRL_ESC_TIMEOUT := 200

GroupAdd, TargetApps, ahk_exe Code.exe
GroupAdd, TargetApps, ahk_exe Obsidian.exe
GroupAdd, TargetApps, ahk_exe chrome.exe
GroupAdd, TargetApps, ahk_exe alacritty.exe
GroupAdd, TargetApps, ahk_exe idea64.exe
GroupAdd, TargetApps, ahk_exe WindowsTerminal.exe
GroupAdd, TargetApps, ahk_exe zen.exe
GroupAdd, TargetApps, ahk_exe PowerToys.PowerLauncher.exe
Return

#IfWinActive ahk_group TargetApps

~LControl::
  pressedTime := A_TickCount

  KeyWait, LControl

  if ((A_TickCount - pressedTime < CTRL_ESC_TIMEOUT) && (A_PriorKey = "LControl"))
  {
    SendInput {Blind}{Escape}
  }

Return
#IfWinActive

^Space::
Run, C:\Tools\im-select\im-select.exe locale, , Hide
Return

#IfWinActive ahk_exe WindowsTerminal.exe
#c::
  SendInput, ^+c ; ^ for Ctrl, + for Shift
Return

#v::
  SendInput, ^+v
Return

#t::
  SendInput, ^+t
Return

#w::
  SendInput, ^+w
Return

; 将 Win+1 映射到 Ctrl+Alt+1
#1::
    SendInput, ^!1
return

; 将 Win+2 映射到 Ctrl+Alt+2
#2::
    SendInput, ^!2
return

; 将 Win+3 映射到 Ctrl+Alt+3
#3::
    SendInput, ^!3
return

; 将 Win+4 映射到 Ctrl+Alt+4
#4::
    SendInput, ^!4
return

; 将 Win+5 映射到 Ctrl+Alt+5
#5::
    SendInput, ^!5
return

; 将 Win+6 映射到 Ctrl+Alt+6
#6::
    SendInput, ^!6
return

; 将 Win+7 映射到 Ctrl+Alt+7
#7::
    SendInput, ^!7
return

; 将 Win+8 映射到 Ctrl+Alt+8
#8::
    SendInput, ^!8
return

; 将 Win+9 映射到 Ctrl+Alt+9
#9::
    SendInput, ^!9
return
#IfWinActive

; Win+C 映射为 Ctrl+C (复制) - 全局默认
#c::
    SendInput, ^c
Return

; Win+V 映射为 Ctrl+V (粘贴) - 全局默认
#v::
    SendInput, ^v
Return

; Win+A 映射为 Ctrl+A (全选)
#a::
    SendInput, ^a
Return

#z::
  SendInput, ^z
Return

; Win+W 映射为 Alt+F4 (关闭窗口)
#w::
    SendInput, !{F4}
Return

; Win+M 映射为 最小化当前窗口
#m::
    WinMinimize, A ; A 代表当前活动窗口
Return

; ===================================
; Vim 风格 Win + HJKL 光标移动
; ===================================

#h::SendInput, {Left}
Return
#j::SendInput, {Down}
Return
#k::SendInput, {Up}
Return

$#l::SendInput, {Right} ; $ 强制使用键盘钩子
Return

; ===================================
; Win+Tab -> Alt+Tab
; ===================================
$#Tab::
    SendInput {Blind}{LAlt Down}{Tab}
    KeyWait, LWin
    SendInput {LAlt Up}
Return

; ===================================
; Group Applications
; ===================================
GroupAdd, TargetApps, ahk_exe Code.exe
GroupAdd, TargetApps, ahk_exe Obsidian.exe
GroupAdd, TargetApps, ahk_exe chrome.exe

GroupAdd, TerminalApps, ahk_exe WindowsTerminal.exe
GroupAdd, TerminalApps, ahk_exe alacritty.exe
GroupAdd, TerminalApps, ahk_exe cmd.exe
GroupAdd, TerminalApps, ahk_exe powershell.exe
GroupAdd, TerminalApps, ahk_exe pwsh.exe
GroupAdd, TerminalApps, ahk_exe conhost.exe
GroupAdd, TerminalApps, ahk_exe mintty.exe
GroupAdd, TerminalApps, ahk_exe putty.exe

Return

; ===================================
; Zen Browser
; ===================================
#IfWinActive ahk_exe zen.exe
    #t::SendInput, ^t
    #f::SendInput, ^f
#IfWinActive
```

