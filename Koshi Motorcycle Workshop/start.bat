@echo off
title Koshi Motorcycle Workshop - Billing & Inventory Management
color 0B
echo ============================================================
echo      KOSHI MOTORCYCLE WORKSHOP MANAGEMENT SYSTEM
echo ============================================================
echo Starting server...
echo Please wait, opening in your default web browser...
echo.

:: Launch browser after 2 seconds in background
start "" timeout /t 2 /nobreak >nul & start http://localhost:5000

:: Start Node.js server
node backend\server.js
pause

