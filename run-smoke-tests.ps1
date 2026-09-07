# Runs each API's smoke tests separately. Login tokens are cached by global-setup.ts,
# so the pauses below are only a safety margin for the 5/min login rate limit.

Write-Host "Running Admin API Smoke Tests..." -ForegroundColor Cyan
npm run test:smoke:admin

Write-Host "`nWaiting 10 seconds to avoid rate limiting..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`nRunning Player API Smoke Tests..." -ForegroundColor Cyan
npm run test:smoke:player

Write-Host "`nWaiting 10 seconds to avoid rate limiting..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`nRunning Agent API Smoke Tests..." -ForegroundColor Cyan
npm run test:smoke:agent

Write-Host "`n✅ All smoke tests completed!" -ForegroundColor Green
