$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Write-Host "Starting Fresh Pick prototype at http://127.0.0.1:4173/"
Write-Host "Logs are printed here and also appended to prototype/server.log"
node .\server.mjs
