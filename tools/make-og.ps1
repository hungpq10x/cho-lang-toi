# Xuất tools/og.html thành og-image.png (1200×630) bằng Edge/Chrome chạy ngầm.
$root = Split-Path $PSScriptRoot -Parent
$browser = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw 'Không tìm thấy Edge hoặc Chrome' }

$src = ([System.Uri](Join-Path $PSScriptRoot 'og.html')).AbsoluteUri
$out = Join-Path $root 'og-image.png'
$profileDir = Join-Path $env:TEMP 'cholangtoi-og-profile'

& $browser --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
  --user-data-dir="$profileDir" --window-size=1200,630 --virtual-time-budget=2000 `
  --screenshot="$out" $src | Out-Null
Get-Item $out
