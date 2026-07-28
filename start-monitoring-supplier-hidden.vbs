Option Explicit

Dim shell, root, command
Set shell = CreateObject("WScript.Shell")

root = "C:\Users\matra\monitoring-supplier"
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & root & "\scripts\local-dev.ps1"" -Action restart-all"

shell.CurrentDirectory = root
shell.Run command, 0, False

