import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeUrl } from '../lib/api'

const AnalysisContext = createContext(null)

export function useAnalysis() {
    return useContext(AnalysisContext)
}

export function AnalysisProvider({ children }) {
    const [analysisState, setAnalysisState] = useState({
        loading: false,
        url: '',
        error: '',
    })
    const navigateRef = useRef(null)

    // Layout vai setar isso
    const setNavigate = useCallback((nav) => {
        navigateRef.current = nav
    }, [])

    const startAnalysis = useCallback(async (url) => {
        setAnalysisState({ loading: true, url, error: '' })
        try {
            const result = await analyzeUrl(url)
            setAnalysisState({ loading: false, url: '', error: '' })
            // Navega para o resultado
            if (navigateRef.current) {
                navigateRef.current('/result', { state: { result } })
            }
            return result
        } catch (err) {
            setAnalysisState({ loading: false, url: '', error: err.message })
            throw err
        }
    }, [])

    const dismissError = useCallback(() => {
        setAnalysisState((prev) => ({ ...prev, error: '' }))
    }, [])

    return (
        <AnalysisContext.Provider
            value={{ ...analysisState, startAnalysis, dismissError, setNavigate }}
        >
            {children}
        </AnalysisContext.Provider>
    )
}
