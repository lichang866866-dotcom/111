@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d F:\codex\english-tutor
rmdir /s /q node_modules\electron 2>nul
npm install electron@29.4.6 --save-dev
echo Done