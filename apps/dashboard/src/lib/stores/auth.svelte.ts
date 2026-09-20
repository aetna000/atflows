export type Role = 'viewer' | 'investigator' | 'evidence_collector' | 'administrator'
export type Account = { username: string; display_name: string; role: Role; enabled: boolean; password_change_required: boolean }

export const authAccount = $state<{ value: Account | null }>({ value: null })
