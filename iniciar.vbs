Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & """ && node server\index.js", 1, False

' Aguardar 3 segundos para o servidor iniciar
WScript.Sleep 3000

' Abrir o navegador
WshShell.Run "http://localhost:3000"
