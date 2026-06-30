import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const network = {
  overview:   ()           => api.get('/network/overview').then(r => r.data),
  scan:       (subnet)     => api.post('/network/scan', subnet ? { subnet } : {}).then(r => r.data),
  graph:      ()           => api.get('/network/graph').then(r => r.data),
  tailscale:  ()           => api.get('/network/tailscale').then(r => r.data),
  scans:      ()           => api.get('/network/scans').then(r => r.data),
}

export const devices = {
  list:       (params)     => api.get('/network/devices', { params }).then(r => r.data),
  get:        (id)         => api.get(`/network/devices/${id}`).then(r => r.data),
  update:     (id, data)   => api.patch(`/network/devices/${id}`, data).then(r => r.data),
  scanPorts:  (id)         => api.post(`/network/devices/${id}/scan-ports`).then(r => r.data),
  ports:      (id)         => api.get(`/network/devices/${id}/ports`).then(r => r.data),
}

export const alerts = {
  list:       (unread)     => api.get('/network/alerts', { params: unread ? { unread: '1' } : {} }).then(r => r.data),
  markRead:   (id)         => api.patch(`/network/alerts/${id}/read`).then(r => r.data),
  markAllRead:()           => api.patch('/network/alerts/read-all').then(r => r.data),
  remove:     (id)         => api.delete(`/network/alerts/${id}`).then(r => r.data),
}
