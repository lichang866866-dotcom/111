# Get recent Application errors from Event Log
Get-WinEvent -FilterHashtable @{LogName='Application';Level=2} -MaxEvents 10 -ErrorAction SilentlyContinue |
    Select-Object TimeCreated, ProviderName, Message |
    ForEach-Object {
        Write-Host "Time: $($_.TimeCreated)"
        Write-Host "Provider: $($_.ProviderName)"
        Write-Host "Message: $($_.Message.Substring(0, [Math]::Min(500, $_.Message.Length)))"
        Write-Host "---"
    }

# Also check for Windows Error Reporting
Get-WinEvent -FilterHashtable @{LogName='Application';ProviderName='Windows Error Reporting'} -MaxEvents 5 -ErrorAction SilentlyContinue |
    Select-Object TimeCreated, Message
