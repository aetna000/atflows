<script lang="ts">
  import { highlightJson } from '$lib/utils/json-highlight'

  let { text, testId }: { text: string; testId?: string } = $props()
  let tokens = $derived(highlightJson(text))
</script>

<pre class="json-code" data-testid={testId}>{#each tokens as token}<span class:json-key={token.kind === 'key'} class:json-string={token.kind === 'string'} class:json-number={token.kind === 'number'} class:json-boolean={token.kind === 'boolean'} class:json-null={token.kind === 'null'} class:json-punctuation={token.kind === 'punctuation'}>{token.text}</span>{/each}</pre>

<style>
  .json-code { margin: 0; background: var(--bg-tertiary); border: 1px solid var(--border-primary); padding: 8px; color: var(--text-primary); font: 11px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; overflow-x: auto; }
  .json-key { color: #17666b; }
  .json-string { color: #865014; }
  .json-number { color: #6646a8; }
  .json-boolean { color: #a72e34; }
  .json-null { color: var(--text-muted); font-style: italic; }
  .json-punctuation { color: var(--text-secondary); }
  :global([data-theme='dark']) .json-key { color: #79d9df; }
  :global([data-theme='dark']) .json-string { color: #efbc7c; }
  :global([data-theme='dark']) .json-number { color: #c5b4fa; }
  :global([data-theme='dark']) .json-boolean { color: #f4a0a7; }
</style>
