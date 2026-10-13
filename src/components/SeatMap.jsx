import { motion, AnimatePresence } from 'framer-motion'
import { SEAT_LAYOUT, FRONT_LABEL } from '../lib/seatLayout'

export default function SeatMap({ seats, mySeat, onPick, onAdminClick }) {
  const bySeat = Object.fromEntries(seats.map(s => [s.seat_number, s]))

  return (
    <div className="w-full max-w-3xl mx-auto px-2">
      {/* Front of room */}
      <div className="mx-auto mb-6 w-2/3 rounded-b-2xl bg-ink py-2 text-center text-xs
                      font-semibold tracking-widest text-white uppercase shadow-lg">
        {FRONT_LABEL}
      </div>

      <div className="flex flex-col gap-2 sm:gap-4">
        {SEAT_LAYOUT.map((row, r) => (
          <div key={r} className="grid gap-1.5 sm:gap-3"
               style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
            {row.map((n, c) => {
              if (n === null) return <div key={c} />
              const seat = bySeat[n]
              const taken = seat?.claimed
              const mine = n === mySeat

              return (
                <motion.button
                  key={n}
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (r * row.length + c) * 0.03, type: 'spring', stiffness: 260, damping: 20 }}
                  whileHover={!taken ? { scale: 1.08, y: -2 } : {}}
                  whileTap={!taken ? { scale: 0.94 } : {}}
                  disabled={taken && !onAdminClick}
                  onClick={() => (taken ? onAdminClick?.(n) : onPick?.(n))}
                  className={[
                    'relative aspect-square rounded-xl sm:rounded-2xl flex items-center justify-center',
                    'text-[10px] sm:text-sm font-bold leading-tight p-1 shadow-md transition-colors overflow-hidden',
                    mine  ? 'bg-bee text-white ring-4 ring-bee/40'
                    : taken ? 'bg-ink text-white cursor-default'
                    : 'bg-white text-ink border-2 border-ink/20 hover:border-bee',
                  ].join(' ')}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={taken ? seat.name : n}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="break-words text-center"
                    >
                      {taken ? seat.name : n}
                    </motion.span>
                  </AnimatePresence>
                  {mine && (
                    <motion.span layoutId="pulse" className="absolute inset-0 rounded-2xl border-2 border-bee animate-ping" />
                  )}
                </motion.button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}