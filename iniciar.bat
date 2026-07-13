@echo off
chcp 65001 >nul
title Nexus Miner ERP v2.0

echo.
echo  ============================================
echo       NEXUS MINER - ERP B2B v2.0
echo       Prospeccao Inteligente
echo  ============================================
echo.

:: Verificar se Node.js esta no PATH
set "NODE_CMD="
where node >nul 2>nul
if %errorlevel% equ 0 (
    set "NODE_CMD=node"
    set "NPM_CMD=npm"
    goto :found
)

:: Procurar node em locais comuns
for %%P in (
    "%LOCALAPPDATA%\ms-playwright-go\1.57.0\node.exe"
    "%LOCALAPPDATA%\Temp\bun-node-*\node.exe"
    "C:\Program Files\nodejs\node.exe"
    "%APPDATA%\nvm\node.exe"
) do (
    if exist %%P (
        set "NODE_CMD=%%~P"
        set "NPM_CMD=%%~P\..\npm.cmd"
        goto :found
    )
)

:: Nao encontrou
echo  [ERRO] Node.js NAO foi encontrado!
echo.
echo  Para instalar:
echo    1. Acesse: https://nodejs.org
echo    2. Baixe a versao LTS (recomendado)
echo    3. Instale e marque "Add to PATH"
echo    4. Reinicie o terminal e execute este arquivo novamente
echo.
pause
exit /b 1

:found
echo  [OK] Node.js encontrado!
%NODE_CMD% -v
echo.

:: Navegar para o diretorio do projeto
cd /d "%~dp0"

:: Verificar se node_modules existe, senao instalar
if not exist "node_modules" (
    echo  [1/3] Instalando dependencias...
    if defined NPM_CMD (
        call "%NPM_CMD%" install --silent
    ) else (
        call "%NODE_CMD%" "%APPDATA%\npm\node_modules\npm\bin\npm-cli.js" install --silent 2>nul
        if %errorlevel% neq 0 (
            echo  [ERRO] npm nao encontrado! Instale Node.js pelo site oficial.
            pause
            exit /b 1
        )
    )
    if %errorlevel% neq 0 (
        echo  [ERRO] Falha ao instalar dependencias!
        pause
        exit /b 1
    )
    echo  [OK] Dependencias instaladas!
    echo.
) else (
    echo  [OK] Dependencias ja instaladas.
    echo.
)

:: Criar pasta data se nao existir
if not exist "data" mkdir data

:: Verificar se o banco ja foi criado
if not exist "data\nexusminer.db" (
    echo  [2/3] Criando banco de dados...
    call "%NODE_CMD%" server\database\seed.js
    echo.
) else (
    echo  [OK] Banco de dados ja existe.
    echo.
)

:: Iniciar o servidor
echo  [3/3] Iniciando servidor...
echo.
echo  ============================================
echo    Acesse: http://localhost:3000
echo    Login:  admin / admin123
echo.
echo    Pressione Ctrl+C para parar
echo  ============================================
echo.

call "%NODE_CMD%" server\index.js

pause
