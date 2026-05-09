$start = Get-Date
$proc = Start-Process -FilePath "F:\codex\english-tutor\release\win-unpacked\English Tutor.exe" -PassThru -RedirectStandardError "$env:TEMP\electron_err.log" -RedirectStandardOutput "$env:TEMP\electron_out.log"
Write-Host "Started PID: $($proc.Id)"

Start-Sleep -Seconds 3

if ($proc.HasExited) {
    Write-Host "EXITED with code: $($proc.ExitCode)"
} else {
    Write-Host "Still running..."
    $children = Get-Process | Where-Object { $_.Parent.Id -eq $proc.Id }
    if ($children) {
        Write-Host "Child processes:"
        $children | Format-Table Id, ProcessName, MainWindowTitle
    }
}

# Check log files
if (Test-Path "$env:TEMP\electron_err.log") {
    $content = Get-Content "$env:TEMP\electron_err.log" -Raw
    if ($content) {
        Write-Host "`n[STDERR]:"
        Write-Host $content
    }
}

if (Test-Path "$env:TEMP\electron_out.log") {
    $content = Get-Content "$env:TEMP\electron_out.log" -Raw
    if ($content) {
        Write-Host "`n[STDOUT]:"
        Write-Host $content
    }
}

# Check Windows Event Log for Application errors
$events = Get-WinEvent -FilterHashtable @{LogName='Application';Level=2;StartTime=$start} -MaxEvents 3 -ErrorAction SilentlyContinue |
    Where-Object { $_.Message -like "*English*" -or $_.Message -like "*Tutor*" -or $_.Message -like "*electron*" }
if ($events) {
    Write-Host "`n[EVENT LOG ERRORS]:"
    $events | ForEach-Object { Write-Host $_.Message }
}
