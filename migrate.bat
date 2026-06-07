@echo off
cd /d "F:\BOT\poke-commu-system"

echo [1/5] Backup App.jsx...
if exist "src\App.jsx" copy "src\App.jsx" "src\App.backup.jsx"
if exist "src\App.new.jsx" copy "src\App.new.jsx" "src\App.jsx"

echo [2/5] Create archive folder...
if not exist "src\_archive" mkdir "src\_archive"

echo [3/5] Move old files...
if exist "src\components\views\_old" rmdir /S /Q "src\components\views\_old"
if exist "src\components\views\admin\_old" rmdir /S /Q "src\components\views\admin\_old"
if exist "src\components\modals\_old" rmdir /S /Q "src\components\modals\_old"

echo [4/5] Run migration script...
call node scripts\migrate-structure.js

echo [5/5] Done!
pause