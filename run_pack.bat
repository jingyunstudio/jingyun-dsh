@echo off
echo Starting Jingyun DSH Desktop Packaging Console...
cd /d %~dp0
call py scripts/pack_gui.py
pause
