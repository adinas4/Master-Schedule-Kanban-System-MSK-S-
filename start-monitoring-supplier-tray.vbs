Option Explicit

Dim shell, root, command
Set shell = CreateObject("WScript.Shell")

root = "C:\Users\matra\monitoring-supplier"
command = "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File """ & root & "\scripts\tray-controller.ps1"" -StartServices"

shell.CurrentDirectory = root
shell.Run command, 0, False

