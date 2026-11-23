import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

let refreshRequest

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config
    const isAuthRequest = request?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && request && !request._retry && !isAuthRequest) {
      request._retry = true
      try {
        refreshRequest ||= axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true },
        ).finally(() => { refreshRequest = null })
        await refreshRequest
        return api(request)
      } catch {
        localStorage.removeItem('nexemers_user')
      }
    } else if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('nexemers_user')
    }
    return Promise.reject(error)
  },
)
