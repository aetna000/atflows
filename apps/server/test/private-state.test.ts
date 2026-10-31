import { expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { privatePath, protectPrivatePath } from '@atflows/integrations/private-state'

test('private state preserves existing content and rejects another ordinary user grant', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-private-'))
    try {
        const file = path.join(directory, 'existing.json')
        fs.writeFileSync(file, 'preserve')
        if (process.platform === 'win32') {
            const script = `$a=Get-Acl -LiteralPath $env:TEST_PRIVATE_PATH; $s=New-Object Security.Principal.SecurityIdentifier('S-1-5-32-545'); $r=New-Object Security.AccessControl.FileSystemAccessRule($s,'Read','Allow'); $a.AddAccessRule($r); Set-Acl -LiteralPath $env:TEST_PRIVATE_PATH -AclObject $a`
            const powershell = path.join(process.env.SystemRoot!, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
            execFileSync(powershell, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { env: { ...process.env, TEST_PRIVATE_PATH: file }, stdio: 'ignore' })
            expect(privatePath(file)).toBe(false)
        } else {
            fs.chmodSync(file, 0o644)
            expect(privatePath(file)).toBe(false)
        }
        protectPrivatePath(directory)
        protectPrivatePath(file)
        expect(privatePath(directory)).toBe(true)
        expect(privatePath(file)).toBe(true)
        expect(fs.readFileSync(file, 'utf8')).toBe('preserve')
        const newFile = path.join(directory, 'new.json')
        fs.writeFileSync(newFile, '{}', { mode: 0o600 })
        expect(privatePath(newFile)).toBe(true)
    } finally { fs.rmSync(directory, { recursive: true, force: true }) }
}, 30000)

test('private state rejects symlinks before changing their targets', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-private-link-'))
    try {
        const target = path.join(directory, 'target')
        const link = path.join(directory, 'link')
        fs.writeFileSync(target, 'preserve')
        try { fs.symlinkSync(target, link) } catch { return } // Windows may lack symlink privileges.
        expect(() => protectPrivatePath(link)).toThrow()
        expect(fs.readFileSync(target, 'utf8')).toBe('preserve')
    } finally { fs.rmSync(directory, { recursive: true, force: true }) }
})

test('Windows protection failure does not modify the existing file', () => {
    if (process.platform !== 'win32') return
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-private-failure-'))
    const previous = process.env.SystemRoot
    try {
        const target = path.join(directory, 'existing.json')
        fs.writeFileSync(target, 'preserve')
        process.env.SystemRoot = path.join(directory, 'missing-windows')
        expect(() => protectPrivatePath(target)).toThrow('Unable to protect')
        expect(fs.readFileSync(target, 'utf8')).toBe('preserve')
    } finally {
        if (previous === undefined) delete process.env.SystemRoot
        else process.env.SystemRoot = previous
        fs.rmSync(directory, { recursive: true, force: true })
    }
})
