param(
  [string]$BaseUrl = 'http://localhost:5000',
  [string]$AccessToken = '',
  [string]$OutDir = (Join-Path $PSScriptRoot 'output\results-captures')
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Save-Response([string]$Name, [string]$Uri, [hashtable]$Headers = @{}) {
  $started = Get-Date
  try {
    $result = Invoke-WebRequest -Uri $Uri -Headers $Headers -TimeoutSec 25 -UseBasicParsing
    $status = [int]$result.StatusCode
    $body = $result.Content
  } catch {
    # Capture actual HTTP status code (e.g. 404) from the response if available
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $body = $reader.ReadToEnd()
      $reader.Close()
    } else {
      $status = 0
      $body = $_.ErrorDetails.Message
      if (-not $body) { $body = $_.Exception.Message }
    }
  }
  $elapsed = [math]::Round(((Get-Date) - $started).TotalMilliseconds)
  $obj = [ordered]@{ captured_at = (Get-Date).ToString('s'); method = 'GET'; url = $Uri; status = $status; elapsed_ms = $elapsed; body = $body }
  $obj | ConvertTo-Json -Depth 30 | Set-Content -Encoding utf8 (Join-Path $OutDir "$Name.json")
  Write-Host "$Name : HTTP $status / ${elapsed}ms"
}

Save-Response '01-health' "$BaseUrl/health"
Save-Response '02-course-catalog' "$BaseUrl/api/courses?sort=popular&page=1&limit=10"
Save-Response '03-recommended-courses' "$BaseUrl/api/courses?sort=recommended&page=1&limit=10"
if ($AccessToken) {
  $auth = @{ Authorization = "Bearer $AccessToken" }
  Save-Response '04-personalized-home' "$BaseUrl/api/user/home" $auth
  Save-Response '05-recommended-roadmap-node' "$BaseUrl/api/user/roadmap/nodes/REPLACE_WITH_REAL_NODE_ID/recommended-courses" $auth
} else {
  Write-Host 'Skipped authenticated requests; pass -AccessToken and replace roadmap node ID manually if needed.'
}
Save-Response '06-error-example' "$BaseUrl/api/not-a-real-route"

Write-Host "Saved JSON results under $OutDir"
