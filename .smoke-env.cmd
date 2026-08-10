@echo off
set NODE_ENV=development
node "%~dp0node_modules\next\dist\bin\next" start -p 3100 -H 127.0.0.1
