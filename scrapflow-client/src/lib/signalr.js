import * as signalR from '@microsoft/signalr'

class HubManager {
  constructor() {
    this.connection = null
    this.listeners = new Map()
  }

  async connect(token) {
    const url = import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5010/hubs/inventory'

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    // Re-attach all listeners on reconnect
    this.connection.onreconnected(() => {
      console.log('[SignalR] Reconnected')
      this.listeners.forEach((handlers, event) => {
        handlers.forEach((cb) => this.connection.on(event, cb))
      })
    })

    this.connection.onclose(() => {
      console.log('[SignalR] Connection closed')
    })

    try {
      await this.connection.start()
      console.log('[SignalR] Connected')
    } catch (err) {
      console.error('[SignalR] Failed to connect:', err)
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.stop()
      this.connection = null
      this.listeners.clear()
    }
  }

  on(event, callback) {
    if (!this.connection) return
    this.connection.on(event, callback)

    if (!this.listeners.has(event)) this.listeners.set(event, [])
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (!this.connection) return
    this.connection.off(event, callback)

    const handlers = this.listeners.get(event)
    if (handlers) {
      const idx = handlers.indexOf(callback)
      if (idx > -1) handlers.splice(idx, 1)
    }
  }

  async joinSite(siteId) {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinSiteGroup', siteId)
    }
  }

  async leaveSite(siteId) {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveSiteGroup', siteId)
    }
  }

  get state() {
    return this.connection?.state ?? 'Disconnected'
  }
}

// Singleton instance
const hubManager = new HubManager()
export default hubManager