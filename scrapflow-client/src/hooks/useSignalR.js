import { useEffect, useCallback } from 'react'
import hubManager from '@/lib/signalr'
import { useAuthStore } from '@/store/authStore'

/**
 * Connect to SignalR, optionally join a site group, and listen for events.
 * 
 * Usage:
 *   useSignalR({
 *     siteId: 'abc123',
 *     onInventoryUpdated: (lot) => refetch(),
 *     onTicketCompleted: (ticket) => ...,
 *   })
 */
export function useSignalR({ siteId, onInventoryUpdated, onTicketCompleted, onPriceUpdated } = {}) {
  const { token } = useAuthStore()

  useEffect(() => {
    if (!token) return

    let mounted = true

    const setup = async () => {
      await hubManager.connect(token)
      if (!mounted) return

      if (siteId) {
        await hubManager.joinSite(siteId)
      }

      if (onInventoryUpdated) {
        hubManager.on('InventoryUpdated', onInventoryUpdated)
      }
      if (onTicketCompleted) {
        hubManager.on('TicketCompleted', onTicketCompleted)
      }
      if (onPriceUpdated) {
        hubManager.on('PricesUpdated', onPriceUpdated)
      }
    }

    setup()

    return () => {
      mounted = false
      if (onInventoryUpdated) hubManager.off('InventoryUpdated', onInventoryUpdated)
      if (onTicketCompleted) hubManager.off('TicketCompleted', onTicketCompleted)
      if (onPriceUpdated) hubManager.off('PricesUpdated', onPriceUpdated)
      if (siteId) hubManager.leaveSite(siteId)
    }
  }, [token, siteId])

  return {
    connectionState: hubManager.state,
  }
}