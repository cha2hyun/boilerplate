import { createContext, useContext } from 'react'

/** App injects Query-owned data; shared formatting never imports an entity or fetches. */
export const ExchangeRateContext = createContext<number | null>(null)
export const useUsdKrwRate = () => useContext(ExchangeRateContext)
