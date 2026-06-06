
import React, {
    createContext, useContext, useEffect,
    useState, useCallback, type ReactNode,
  } from "react";
  import type { Session } from "@supabase/supabase-js";
  import { supabase }                    from "../lib/Supabase";
   import { checkHealth, saveToSupabase, getHistory} from "../services/api";
  import { usePrediction }               from "../hooks/usePrediction";
  import type { MenageInput, PredictionResult, HistoryEntry, StatsData } from "../types";
  
  export type TabType  = "classifier"|"eda"|"lda"|"geo"|"batch"|"historique"|"apropos";
  export type AppView  = "landing"|"auth"|"app";
  
  export interface AppContextValue {
    appView:        AppView;
    onStart:        () => void;
    session:        Session | null;
    loadingSession: boolean;
    signOut:        () => Promise<void>;
    apiOnline:      boolean | null;
    activeTab:      TabType;
    setActiveTab:   (t: TabType) => void;
    lastInput:      MenageInput | null;
    loading:        boolean;
    result:         PredictionResult | null;
    error:          string | null;
    handleSubmit:   (data: MenageInput) => Promise<void>;
    history:        HistoryEntry[];
    stats:          StatsData;
    clearHistory:   () => void;
    saving:         boolean;
    saveMsg:        string | null;
    handleSave:     () => Promise<void>;
    clearSaveMsg:   () => void;
  }
  
  const AppContext = createContext<AppContextValue | null>(null);
  
  export const useAppContext = (): AppContextValue => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useAppContext doit être dans <AppProvider>");
    return ctx;
  };
  
  export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  
    const [session,        setSession]        = useState<Session | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [appView,        setAppView]        = useState<AppView>("landing");
    const [apiOnline,      setApiOnline]      = useState<boolean | null>(null);
    const [activeTab,      setActiveTab]      = useState<TabType>("classifier");
    const [lastInput,      setLastInput]      = useState<MenageInput | null>(null);
    const [saving,         setSaving]         = useState(false);
    const [saveMsg,        setSaveMsg]        = useState<string | null>(null);
  
    const { loading, result, error, history, stats, predict, clearHistory, loadHistory } = usePrediction();
  
    
    // ── Auth ────────────────────────────────────────────────
    useEffect(() => {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session ?? null);
        setLoadingSession(false);
      });
      const { data: listener } = supabase.auth.onAuthStateChange((_evt, s) => {
        setSession(s);
        if (s) setAppView("app");
      });
      return () => listener.subscription.unsubscribe();
    }, []);
  
    // Ajuster la vue dès que la session est résolue
    useEffect(() => {
      if (!loadingSession) {
        setAppView(session ? "app" : "landing");
      }
    }, [loadingSession, session]);
  
    const signOut = useCallback(async () => {
      await supabase.auth.signOut();
      setSession(null);
      setAppView("landing");
    }, []);
  
    useEffect(() => {
      if (!session?.user?.id) return;
    
      const fetchHistory = async () => {
        try {
          const data = await getHistory(session.user.id);
          loadHistory(data);
        } catch (err) {
          console.error("Erreur historique", err);
        }
      };
    
      fetchHistory();
    }, [session, loadHistory]);
    // Bouton "Commencer" : connecté → app, sinon → auth
    const onStart = useCallback(() => {
      setAppView(session ? "app" : "auth");
    }, [session]);
  
    // ── Health check ─────────────────────────────────────────
    useEffect(() => {
      checkHealth().then(setApiOnline);
      const id = setInterval(() => checkHealth().then(setApiOnline), 30_000);
      return () => clearInterval(id);
    }, []);
  
    // ── Prédiction ───────────────────────────────────────────
    const handleSubmit = useCallback(async (data: MenageInput) => {
      setLastInput(data);
      setSaveMsg(null);
      await predict(data);
    }, [predict]);
  
    // ── Sauvegarde ───────────────────────────────────────────
    const handleSave = useCallback(async () => {
      if (!lastInput || !result || !session) return;
    
      setSaving(true);
      setSaveMsg(null);
    
      try {
        await saveToSupabase({
          ...lastInput,
          prediction: result.prediction, // ❗ numéro (0/1/2)
          probabilite: result.score,
          user_id: session.user.id
        });
    
        setSaveMsg("✓ Données enregistrées dans Supabase");
      } catch {
        setSaveMsg("✗ Erreur lors de l'enregistrement");
      } finally {
        setSaving(false);
      }
    }, [lastInput, result, session]);
  
    const clearSaveMsg = useCallback(() => setSaveMsg(null), []);
  
    
    return (
      <AppContext.Provider value={{
        appView, onStart,
        session, loadingSession, signOut,
        apiOnline,
        activeTab, setActiveTab,
        lastInput,
        loading, result, error, handleSubmit,
        history, stats, clearHistory,
        saving, saveMsg, handleSave, clearSaveMsg,
      }}>
        {children}
      </AppContext.Provider>
    );
  };
  
  export default AppContext;