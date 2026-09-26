const credential = /(?:bearer|password|secret|api[_-]?key|authorization)|(?:sk-|gh[pousr]_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9_-]*|eyJ[A-Za-z0-9_-]+\./i

// Metadata label policy, not a detector for arbitrary secrets in arbitrary text.
function safeLabel(value) {
    return typeof value === 'string' && value.length <= 128 &&
        /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value) && !credential.test(value)
        ? value : 'other'
}

module.exports = { safeLabel }
