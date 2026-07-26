param(
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

$wslConfigPath = Join-Path $env:USERPROFILE ".wslconfig"
$projectDir = Split-Path -Parent $PSScriptRoot

function Get-TwentyApiUrl {
  if (-not [string]::IsNullOrWhiteSpace($env:TWENTY_API_URL)) {
    return $env:TWENTY_API_URL.Trim().TrimEnd('/')
  }

  $envFile = Join-Path $projectDir '.env'
  if (Test-Path -LiteralPath $envFile) {
    foreach ($line in Get-Content -LiteralPath $envFile) {
      $trimmed = $line.Trim()
      if ($trimmed -match '^\s*#' -or $trimmed -eq '') {
        continue
      }
      if ($trimmed -match '^\s*TWENTY_API_URL\s*=\s*(.+)\s*$') {
        return $Matches[1].Trim().Trim('"').Trim("'").TrimEnd('/')
      }
    }
  }

  return $null
}

$twentyUrl = Get-TwentyApiUrl
if (-not $twentyUrl) {
  Write-Error "TWENTY_API_URL is required. Set it in the environment or in .env before running this script."
}

function Test-WindowsTwentyAccess {
  try {
    & curl.exe -fsS --connect-timeout 10 "$twentyUrl/healthz" | Out-Null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Test-WslNodeTwentyAccess {
  $wslProjectDir = wsl wslpath -a $projectDir
  $result = wsl bash -lc "source ~/.nvm/nvm.sh 2>/dev/null; cd '$wslProjectDir' && TWENTY_URL='$twentyUrl' node scripts/network-preflight.mjs" 2>&1
  return $LASTEXITCODE -eq 0
}

Write-Host "Checking Windows access to Twenty ($twentyUrl)..."
if (-not (Test-WindowsTwentyAccess)) {
  Write-Error "Windows cannot reach $twentyUrl. Verify VPN/internal network and that Twenty is running."
}

Write-Host "Windows access: OK"

Write-Host "Checking WSL access to Twenty..."
if (Test-WslNodeTwentyAccess) {
  Write-Host "WSL access: OK"
  Write-Host "No WSL networking changes are required."
  exit 0
}

Write-Host "WSL access: FAILED"
Write-Host ""
Write-Host "WSL2 NAT cannot reach the Twenty host from Linux, while Windows can."
Write-Host "Private deploy requires WSL mirrored networking."
Write-Host ""

if (-not $Apply) {
  Write-Host "Run this command to apply the fix:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/setup-wsl-mirrored-network.ps1 -Apply"
  exit 1
}

$desiredContent = @"
[wsl2]
networkingMode=mirrored
dnsTunneling=true
firewall=true
autoProxy=true
"@

if (Test-Path -LiteralPath $wslConfigPath) {
  $existing = Get-Content -LiteralPath $wslConfigPath -Raw
  if ($existing -match "networkingMode\s*=\s*mirrored") {
    Write-Host "Mirrored networking is already configured in $wslConfigPath"
  } else {
    Add-Content -LiteralPath $wslConfigPath -Value "`n[wsl2]`nnetworkingMode=mirrored`ndnsTunneling=true`nfirewall=true`nautoProxy=true`n"
    Write-Host "Updated $wslConfigPath"
  }
} else {
  Set-Content -LiteralPath $wslConfigPath -Value $desiredContent -Encoding UTF8
  Write-Host "Created $wslConfigPath"
}

Write-Host ""
Write-Host "Restarting WSL to apply networking changes..."
wsl --shutdown
Start-Sleep -Seconds 3

Write-Host "Re-checking WSL access to Twenty..."
if (-not (Test-WslNodeTwentyAccess)) {
  Write-Error "WSL still cannot reach Twenty after enabling mirrored networking. Reboot Windows and run this script again."
}

Write-Host "WSL access: OK"
Write-Host "You can now run deploy.bat again."
