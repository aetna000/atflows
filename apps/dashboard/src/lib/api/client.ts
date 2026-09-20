export const api = {
  async get<T>(url: string): Promise<T> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },

  async post<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },

  async delete<T>(url: string, action: 'clear-demo-data' | 'clear-all-data' | 'clear-model-data'): Promise<T> {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'X-AtFlows-Action': action },
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },
}
