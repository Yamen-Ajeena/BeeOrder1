const KEY = 'beeorder_device_token'
export function getDeviceToken() {
  let t = localStorage.getItem(KEY)
  if (!t) {
    t = crypto.randomUUID() + crypto.randomUUID()
    localStorage.setItem(KEY, t)
  }
  return t
}