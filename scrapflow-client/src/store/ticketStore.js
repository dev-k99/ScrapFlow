import { create } from 'zustand'

// Manages the active wizard state for inbound ticket creation
export const useTicketStore = create((set, get) => ({
  // ─── Active Wizard Ticket ──────────────────────────────
  activeTicket: null,       // Full InboundTicketResponseDto
  activeStep: 0,            // 0-5 matching TicketStatus steps
  isDirty: false,           // unsaved changes in current step

  setActiveTicket: (ticket) => {
    const stepMap = {
      Created: 0,
      GrossWeighed: 1,
      Graded: 2,
      TareWeighed: 3,
      PaymentRecorded: 4,
      Completed: 5,
      Cancelled: -1,
    }
    set({
      activeTicket: ticket,
      activeStep: stepMap[ticket?.status] ?? 0,
      isDirty: false,
    })
  },

  updateActiveTicket: (updates) =>
    set((s) => ({
      activeTicket: s.activeTicket ? { ...s.activeTicket, ...updates } : null,
    })),

  advanceStep: () =>
    set((s) => ({
      activeStep: Math.min(s.activeStep + 1, 5),
      isDirty: false,
    })),

  clearActiveTicket: () => set({ activeTicket: null, activeStep: 0, isDirty: false }),

  setDirty: (v = true) => set({ isDirty: v }),

  // ─── Weighbridge Live Value ────────────────────────────
  liveWeight: null,          // kg from serial port
  weighbridgeConnected: false,

  setLiveWeight: (kg) => set({ liveWeight: kg }),
  setWeighbridgeConnected: (v) => set({ weighbridgeConnected: v }),
}))