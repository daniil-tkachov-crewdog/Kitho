// Minimal user-agent parsing: device type and browser name.
export function parseDevice(ua: string): string {
  if (/bot|crawler|spider|crawling/i.test(ua)) return 'Bot'
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'Tablet'
  if (/Mobi|iPhone|iPod|Android|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return 'Mobile'
  return 'Desktop'
}

export function parseBrowser(ua: string): string {
  const rules: [RegExp, string][] = [
    [/Edg(e|A|iOS)?\/([\d]+)/, 'Edge'],
    [/OPR\/([\d]+)|Opera/, 'Opera'],
    [/SamsungBrowser\/([\d]+)/, 'Samsung Internet'],
    [/YaBrowser\/([\d]+)/, 'Yandex'],
    [/Firefox\/([\d]+)|FxiOS/, 'Firefox'],
    [/Chrome\/([\d]+)|CriOS/, 'Chrome'],
    [/Version\/([\d]+).*Safari/, 'Safari'],
  ]
  for (const [re, name] of rules) if (re.test(ua)) return name
  return 'Other'
}
