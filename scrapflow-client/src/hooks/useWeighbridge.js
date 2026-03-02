import { useCallback, useEffect, useRef } from 'react'
import { useTicketStore } from '@/store/ticketStore'

/**
 * Web Serial API hook for connecting to a weighbridge scale.
 * Parses incoming ASCII weight strings like:  "ST,GS,  1234.56 kg\r\n"
 * Returns connect/disconnect functions and live weight state.
 */
export function useWeighbridge() {
  const { setLiveWeight, setWeighbridgeConnected, liveWeight, weighbridgeConnected } = useTicketStore()
  const portRef = useRef(null)
  const readerRef = useRef(null)
  const abortRef = useRef(null)

  const parseWeight = useCallback((line) => {
    // Match a number (possibly decimal) followed by optional unit
    const match = line.match(/([\d,]+\.?\d*)\s*(kg|t|KG|T)?/)
    if (match) {
      const raw = parseFloat(match[1].replace(',', ''))
      const unit = match[2]?.toLowerCase()
      // Convert tons to kg
      return unit === 't' ? raw * 1000 : raw
    }
    return null
  }, [])

  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      console.warn('[Weighbridge] Web Serial API not supported')
      return false
    }

    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' })
      portRef.current = port
      abortRef.current = new AbortController()

      setWeighbridgeConnected(true)

      // Start reading loop
      const textDecoder = new TextDecoderStream()
      port.readable.pipeTo(textDecoder.writable)

      const reader = textDecoder.readable.getReader()
      readerRef.current = reader

      let buffer = ''

      const readLoop = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += value

            // Process complete lines
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const weight = parseWeight(line.trim())
              if (weight !== null) {
                setLiveWeight(weight)
              }
            }
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('[Weighbridge] Read error:', err)
          }
        }
      }

      readLoop()
      return true
    } catch (err) {
      console.error('[Weighbridge] Connect failed:', err)
      setWeighbridgeConnected(false)
      return false
    }
  }, [parseWeight, setLiveWeight, setWeighbridgeConnected])

  const disconnect = useCallback(async () => {
    if (readerRef.current) {
      await readerRef.current.cancel()
      readerRef.current = null
    }
    if (portRef.current) {
      await portRef.current.close()
      portRef.current = null
    }
    setWeighbridgeConnected(false)
    setLiveWeight(null)
  }, [setWeighbridgeConnected, setLiveWeight])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator

  return {
    liveWeight,
    isConnected: weighbridgeConnected,
    isSupported,
    connect,
    disconnect,
  }
}