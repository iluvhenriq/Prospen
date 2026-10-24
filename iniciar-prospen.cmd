@echo off
rem Abre o PROSPEN no computador com dois cliques (versao de producao, mais
rem estavel que o npm run dev). Deixe esta janela aberta enquanto usar o app;
rem para desligar, feche-a. Depois de atualizar o codigo, rode "npm run build".
cd /d "%~dp0"
title PROSPEN
if not exist ".next\BUILD_ID" (
  echo Preparando o PROSPEN pela primeira vez. Leva alguns minutos...
  call npm run build || (echo Falha ao preparar. Veja a mensagem acima. & pause & exit /b 1)
)
echo Abrindo o PROSPEN em http://localhost:3000/painel
start "" cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:3000/painel"
call npm run start
pause
