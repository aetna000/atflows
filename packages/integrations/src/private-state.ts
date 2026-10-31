import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

// Pass the path as an environment variable, never as PowerShell source.
const windowsAcl = String.raw`
$ErrorActionPreference = 'Stop'
$targets = ConvertFrom-Json -InputObject $env:ATFLOWS_PRIVATE_TARGETS
foreach ($target in $targets) {
$item = Get-Item -LiteralPath $target -Force
if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'reparse point' }
$user = [Security.Principal.WindowsIdentity]::GetCurrent().User
$system = New-Object Security.Principal.SecurityIdentifier('S-1-5-18')
$admins = New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')
$trusted = @($user.Value, $system.Value, $admins.Value)
$acl = Get-Acl -LiteralPath $target
$owner = $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value
if ($owner -notin $trusted) { throw 'untrusted owner' }
if ($env:ATFLOWS_PRIVATE_ACTION -eq 'protect') {
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($rule in @($acl.Access)) { $acl.RemoveAccessRuleSpecific($rule) }
  $inheritance = if ($item.PSIsContainer) { 'ContainerInherit, ObjectInherit' } else { 'None' }
  foreach ($sid in @($user, $system, $admins)) {
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', $inheritance, 'None', 'Allow')
    $acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $target -AclObject $acl
  $acl = Get-Acl -LiteralPath $target
}
if ($env:ATFLOWS_PRIVATE_ACTION -eq 'protect' -and -not $acl.AreAccessRulesProtected) { throw 'inherited ACL' }
$allowed = $false
foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
  if ($rule.AccessControlType -eq 'Allow') {
    if ($rule.IdentityReference.Value -notin $trusted) { throw 'untrusted allow ACE' }
    if ($rule.IdentityReference.Value -eq $user.Value) { $allowed = $true }
  }
}
if (-not $allowed) { throw 'owner has no access' }
}
`

function windowsPrivate(targets: string[], action: 'protect' | 'check'): void {
    const executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    execFileSync(executable, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(windowsAcl, 'utf16le').toString('base64')], {
        env: { ...process.env, ATFLOWS_PRIVATE_TARGETS: JSON.stringify(targets.map(target => path.resolve(target))), ATFLOWS_PRIVATE_ACTION: action }, stdio: 'ignore', timeout: 15000,
    })
}

export function privatePath(target: string): boolean {
    try {
        const info = fs.lstatSync(target)
        if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory())) return false
        if (process.platform !== 'win32') return info.uid === process.getuid?.() && !(info.mode & 0o077)
        windowsPrivate([target], 'check')
        return true
    } catch { return false }
}

export function protectPrivatePaths(targets: string[]): void {
    for (const target of targets) {
        const info = fs.lstatSync(target)
        if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory())) throw new Error('private state path must be an ordinary file or directory')
        if (process.platform !== 'win32') {
            if (info.uid !== process.getuid?.()) throw new Error('private state path must be owned by the current user')
            fs.chmodSync(target, info.isDirectory() ? 0o700 : 0o600)
        }
    }
    if (process.platform === 'win32') {
        try { windowsPrivate(targets, 'protect') }
        catch { throw new Error('Unable to protect private AtFlows state on this filesystem') }
    }
}

export function protectPrivatePath(target: string): void { protectPrivatePaths([target]) }
