let reloadingForSignIn = false

function checkResponse(res: Response) {
  if (res.status === 401 && !reloadingForSignIn) {
    reloadingForSignIn = true
    window.location.reload()
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`)
}

export const api = {
  async get<T>(url: string): Promise<T> {
    const res = await fetch(url)
    checkResponse(res)
    return res.json()
  },

  async post<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    checkResponse(res)
    return res.json()
  },

  async delete<T>(url: string, action: 'clear-demo-data' | 'clear-all-data' | 'clear-model-data'): Promise<T> {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'X-AtFlows-Action': action },
    })
    checkResponse(res)
    return res.json()
  },
}
