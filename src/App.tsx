/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Menu, 
  X, 
  Navigation, 
  MapPin, 
  History, 
  LogOut, 
  Car, 
  Fuel, 
  DollarSign, 
  Plus, 
  Minus, 
  ChevronRight,
  ArrowLeft,
  Share2,
  Bookmark,
  AlertCircle,
  Clock,
  Route as RouteIcon,
  Settings,
  Info,
  BarChart3,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMap, 
  useMapsLibrary,
  InfoWindow,
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';

import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  handleFirestoreError,
  OperationType,
  User,
  deleteDoc
} from './firebase';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDistance = (meters: number) => 
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

// --- Components ---

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface RouteDisplayProps {
  key?: React.Key;
  origin: string | google.maps.LatLngLiteral;
  destination: string | google.maps.LatLngLiteral;
  onRouteCalculated: (info: { distance: number; duration: number; path: any; error?: string }) => void;
  onLoadingChange: (loading: boolean) => void;
}

function RouteDisplay({ origin, destination, onRouteCalculated, onLoadingChange }: RouteDisplayProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;
    
    onLoadingChange(true);
    polylinesRef.current.forEach(p => p.setMap(null));

    (routesLib as any).Route.computeRoutes({
      origin,
      destination,
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    }).then(({ routes }: any) => {
      if (routes?.[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach((p: any) => p.setMap(map));
        polylinesRef.current = newPolylines;
        if (routes[0].viewport) map.fitBounds(routes[0].viewport);
        
        onRouteCalculated({
          distance: routes[0].distanceMeters,
          duration: routes[0].durationMillis / 60000,
          path: routes[0].path
        });
      } else {
        onRouteCalculated({ distance: 0, duration: 0, path: null, error: "Nenhuma rota encontrada" });
      }
    })
    .catch((err: any) => {
      console.error("Error computing route:", err);
      onRouteCalculated({ distance: 0, duration: 0, path: null, error: "Erro ao calcular rota" });
    })
    .finally(() => onLoadingChange(false));

    return () => polylinesRef.current.forEach(p => p.setMap(null));
  }, [routesLib, map, origin, destination]);

  return null;
}

// --- Screens ---

function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 text-center max-w-sm w-full"
      >
        <h1 className="text-4xl font-display font-bold text-slate-900 mb-2 tracking-tight">Minha Rota</h1>
        <p className="text-slate-500 mb-10 font-medium">Calcule o custo da sua viagem com inteligência e precisão.</p>
        
        <button 
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-4 bg-white border border-slate-200 py-4 px-6 rounded-2xl shadow-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-google-blue border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="font-bold text-slate-700">Entrar com Google</span>
            </>
          )}
        </button>
        
        <p className="mt-8 text-xs text-slate-400 font-medium">
          Ao entrar, você concorda com nossos Termos de Uso e Política de Privacidade.
        </p>
      </motion.div>
    </div>
  );
}

function DashboardScreen({ user }: { user: User }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [consumption, setConsumption] = useState(12.5);
  const [fuelPrice, setFuelPrice] = useState(5.89);
  const [manualTolls, setManualTolls] = useState(0);
  const [extraCosts, setExtraCosts] = useState(0);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number; path: any; error?: string } | null>(null);
  const [activeRoute, setActiveRoute] = useState<{ origin: string; destination: string; timestamp: number } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedHistoryTrip, setSelectedHistoryTrip] = useState<any | null>(null);

  const autocompleteOriginRef = useRef<HTMLDivElement>(null);
  const autocompleteDestRef = useRef<HTMLDivElement>(null);
  const placesLib = useMapsLibrary('places');

  // Load history
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/trips`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(trips);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/trips`);
    });

    return () => unsubscribe();
  }, [user]);

  // Autocomplete setup
  useEffect(() => {
    if (!placesLib || !autocompleteOriginRef.current || !autocompleteDestRef.current) return;

    const originEl = new (placesLib as any).PlaceAutocompleteElement();
    const destEl = new (placesLib as any).PlaceAutocompleteElement();

    autocompleteOriginRef.current.appendChild(originEl);
    autocompleteDestRef.current.appendChild(destEl);

    originEl.addEventListener('gmp-select', async (e: any) => {
      const place = e.placePrediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress'] });
      setOrigin(place.displayName || place.formattedAddress || "");
    });

    destEl.addEventListener('gmp-select', async (e: any) => {
      const place = e.placePrediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress'] });
      setDestination(place.displayName || place.formattedAddress || "");
    });

    return () => {
      originEl.remove();
      destEl.remove();
    };
  }, [placesLib]);

  const totalFuelCost = useMemo(() => {
    if (!routeInfo) return 0;
    const distanceKm = routeInfo.distance / 1000;
    return (distanceKm / consumption) * fuelPrice * (isRoundTrip ? 2 : 1);
  }, [routeInfo, consumption, fuelPrice, isRoundTrip]);

  const totalTolls = manualTolls * (isRoundTrip ? 2 : 1);
  const totalExtraCosts = extraCosts * (isRoundTrip ? 2 : 1);
  const totalCost = totalFuelCost + totalTolls + totalExtraCosts;

  const handleCalculate = () => {
    if (!origin || !destination) return;
    setRouteInfo(null);
    setActiveRoute({ origin, destination, timestamp: Date.now() });
    setShowModal(true);
  };

  const handleClear = () => {
    setOrigin("");
    setDestination("");
    setRouteInfo(null);
    setActiveRoute(null);
    // Clear autocomplete inputs manually if needed
    const inputs = document.querySelectorAll('gmp-place-autocomplete-element input');
    inputs.forEach((input: any) => input.value = "");
  };

  const handleSaveTrip = async () => {
    if (!user || !routeInfo || !activeRoute) return;
    setIsSaving(true);
    try {
      const tripData = {
        userId: user.uid,
        origin: activeRoute.origin,
        destination: activeRoute.destination,
        distance: routeInfo.distance,
        duration: routeInfo.duration,
        consumption,
        fuelPrice,
        manualTolls,
        extraCosts,
        isRoundTrip,
        totalCost,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, `users/${user.uid}/trips`), tripData);
      setToast("Viagem salva no histórico!");
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/trips`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTrip = async (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/trips`, tripId));
      setToast("Viagem removida!");
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/trips/${tripId}`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center">
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Minha Rota</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Calculadora de Custos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-xs font-bold text-slate-900">{user?.displayName}</p>
            <p className="text-[10px] text-slate-400 font-medium">{user?.email}</p>
          </div>
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'User'} 
              className="w-9 h-9 rounded-full border-2 border-slate-100 shadow-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
              <span className="text-xs font-bold text-slate-400">
                {user?.displayName?.charAt(0) || 'U'}
              </span>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group text-slate-400 hover:text-google-red"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Controls & Results */}
        <div className="lg:col-span-4 space-y-6">
          {/* Input Section */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-google-blue" />
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Viagem</h2>
              </div>
              <button 
                onClick={handleClear}
                className="text-[10px] font-bold text-slate-400 hover:text-google-red uppercase tracking-widest transition-colors"
              >
                Limpar
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Origem</label>
                <div ref={autocompleteOriginRef} className="[&_input]:!w-full [&_input]:!bg-slate-50 [&_input]:!border-slate-200 [&_input]:!rounded-lg [&_input]:!py-2 [&_input]:!px-3 [&_input]:!text-sm [&_input]:!font-medium [&_input]:!outline-none [&_input]:focus:!ring-2 [&_input]:focus:!ring-google-blue/20 [&_input]:!transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Destino</label>
                <div ref={autocompleteDestRef} className="[&_input]:!w-full [&_input]:!bg-slate-50 [&_input]:!border-slate-200 [&_input]:!rounded-lg [&_input]:!py-2 [&_input]:!px-3 [&_input]:!text-sm [&_input]:!font-medium [&_input]:!outline-none [&_input]:focus:!ring-2 [&_input]:focus:!ring-google-blue/20 [&_input]:!transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Consumo (km/L)</label>
                <div className="relative">
                  <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" 
                    value={consumption}
                    onChange={(e) => setConsumption(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-google-blue/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Preço (R$/L)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" 
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-google-blue/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pedágios (R$)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="number" 
                  value={manualTolls}
                  onChange={(e) => setManualTolls(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-google-blue/20 outline-none transition-all"
                  placeholder="Insira manualmente"
                />
              </div>
              <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg mt-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-amber-700 leading-tight">
                  Este aplicativo não calcula pedágios automaticamente. Os valores devem ser inseridos manualmente.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2.5">
                <RouteIcon className="w-4 h-4 text-google-blue" />
                <span className="text-xs font-bold text-slate-600">Ida e Volta</span>
              </div>
              <button 
                onClick={() => setIsRoundTrip(!isRoundTrip)}
                className={cn("w-8 h-4 rounded-full relative transition-colors", isRoundTrip ? "bg-google-blue" : "bg-slate-300")}
              >
                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all", isRoundTrip ? "right-0.5" : "left-0.5")} />
              </button>
            </div>

            <button 
              onClick={handleCalculate}
              disabled={isCalculating || !origin || !destination}
              className="w-full bg-google-blue text-white py-3 rounded-lg font-bold shadow-md shadow-google-blue/10 hover:bg-google-blue/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCalculating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Navigation className="w-4 h-4" />}
              Calcular
            </button>
          </section>

          {/* Results Section */}
          <AnimatePresence>
            {routeInfo && (
              <motion.section 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <BarChart3 className="w-4 h-4 text-google-green" />
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Resumo</h2>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Custo Estimado</p>
                  <h4 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(totalCost)}</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Combustível</p>
                    <p className="text-xs font-bold text-slate-900">{formatCurrency(totalFuelCost)}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Pedágios</p>
                    <p className="text-xs font-bold text-slate-900">{formatCurrency(totalTolls)}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Distância</p>
                    <p className="text-xs font-bold text-slate-900">{formatDistance(routeInfo.distance * (isRoundTrip ? 2 : 1))}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Tempo</p>
                    <p className="text-xs font-bold text-slate-900">{formatDuration(routeInfo.duration)}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handleSaveTrip}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 bg-google-blue text-white py-2.5 rounded-lg font-bold hover:bg-google-blue/90 transition-all active:scale-[0.98] disabled:opacity-50 text-xs"
                  >
                    {isSaving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
                    Salvar
                  </button>
                  <button 
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeRoute?.origin || '')}&destination=${encodeURIComponent(activeRoute?.destination || '')}&travelmode=driving`;
                      window.open(url, '_blank');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 py-2.5 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98] text-xs"
                  >
                    <Navigation className="w-3.5 h-3.5 text-google-blue" />
                    Maps
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Map & History */}
        <div className="lg:col-span-8 space-y-6">
          {/* Map Section */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[300px] md:h-[400px] relative">
            <Map
              defaultCenter={{ lat: -23.5505, lng: -46.6333 }}
              defaultZoom={12}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              disableDefaultUI={false}
            >
              {activeRoute && (
                <RouteDisplay 
                  key={`${activeRoute.origin}-${activeRoute.destination}-${activeRoute.timestamp}`}
                  origin={activeRoute.origin} 
                  destination={activeRoute.destination} 
                  onRouteCalculated={setRouteInfo} 
                  onLoadingChange={setIsCalculating}
                />
              )}
            </Map>
            
            {isCalculating && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="bg-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 border border-slate-100">
                  <div className="w-4 h-4 border-2 border-google-blue border-t-transparent rounded-full animate-spin" />
                  <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">Calculando...</p>
                </div>
              </div>
            )}
          </section>

          {/* History Section */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Histórico</h2>
              </div>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">{history.length} viagens</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
              {history.length === 0 ? (
                <div className="col-span-full text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nenhuma viagem salva</p>
                </div>
              ) : (
                history.map((trip) => (
                  <motion.div 
                    key={trip.id} 
                    whileHover={{ y: -1 }}
                    className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-google-blue/20 transition-all cursor-pointer group flex flex-col justify-between relative"
                    onClick={() => setSelectedHistoryTrip(trip)}
                  >
                    <button 
                      onClick={(e) => handleDeleteTrip(trip.id, e)}
                      className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-slate-100 rounded-md text-slate-300 hover:text-google-red hover:border-google-red/20 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-google-blue">{formatCurrency(trip.totalCost)}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase pr-6">{trip.createdAt?.toDate ? trip.createdAt.toDate().toLocaleDateString('pt-BR') : '---'}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-google-blue shrink-0" />
                          <p className="text-[10px] font-bold text-slate-600 truncate">{trip.origin}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-google-red shrink-0" />
                          <p className="text-[10px] font-bold text-slate-600 truncate">{trip.destination}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-50 flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>{formatDistance(trip.distance)}</span>
                      <span>{trip.consumption} km/L</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {/* History Detail Modal */}
      <AnimatePresence>
        {selectedHistoryTrip && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedHistoryTrip(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col"
            >
              <div className="overflow-y-auto custom-scrollbar">
                <div className="bg-slate-900 p-5 sm:p-6 text-white text-center relative">
                  <button 
                    onClick={() => setSelectedHistoryTrip(null)}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                    <History className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <p className="text-[9px] sm:text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Viagem em {selectedHistoryTrip.createdAt?.toDate ? selectedHistoryTrip.createdAt.toDate().toLocaleDateString('pt-BR') : '---'}</p>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">{formatCurrency(selectedHistoryTrip.totalCost)}</h3>
                </div>

                <div className="p-5 sm:p-6 space-y-5 sm:space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-google-blue mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Origem</p>
                        <p className="text-[11px] sm:text-xs font-bold text-slate-700">{selectedHistoryTrip.origin}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-google-red mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Destino</p>
                        <p className="text-[11px] sm:text-xs font-bold text-slate-700">{selectedHistoryTrip.destination}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Combustível</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">{formatCurrency(selectedHistoryTrip.totalCost - (selectedHistoryTrip.manualTolls || 0) * (selectedHistoryTrip.isRoundTrip ? 2 : 1) - (selectedHistoryTrip.extraCosts || 0) * (selectedHistoryTrip.isRoundTrip ? 2 : 1))}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Pedágios</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">{formatCurrency((selectedHistoryTrip.manualTolls || 0) * (selectedHistoryTrip.isRoundTrip ? 2 : 1))}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Distância</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">{formatDistance(selectedHistoryTrip.distance * (selectedHistoryTrip.isRoundTrip ? 2 : 1))}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Consumo</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">{selectedHistoryTrip.consumption} km/L</p>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-3">
                    <button 
                      onClick={() => {
                        setOrigin(selectedHistoryTrip.origin);
                        setDestination(selectedHistoryTrip.destination);
                        setConsumption(selectedHistoryTrip.consumption);
                        setFuelPrice(selectedHistoryTrip.fuelPrice);
                        setManualTolls(selectedHistoryTrip.manualTolls || 0);
                        setIsRoundTrip(selectedHistoryTrip.isRoundTrip);
                        setSelectedHistoryTrip(null);
                        handleCalculate();
                      }}
                      className="flex-1 bg-google-blue text-white py-2.5 sm:py-3 rounded-xl font-bold hover:bg-google-blue/90 transition-all active:scale-[0.98] text-[10px] sm:text-xs"
                    >
                      Refazer Viagem
                    </button>
                    <button 
                      onClick={() => setSelectedHistoryTrip(null)}
                      className="flex-1 bg-white border border-slate-200 text-slate-500 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-[0.98] text-[10px] sm:text-xs"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Results Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col"
            >
              {!routeInfo ? (
                <div className="p-6 sm:p-12 flex flex-col items-center justify-center space-y-5 sm:space-y-6 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-google-blue border-t-transparent rounded-full animate-spin" />
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">Calculando Rota</h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Buscando o melhor trajeto e custos para você...</p>
                  </div>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="text-[10px] sm:text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest pt-2 sm:pt-4"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (routeInfo as any).error ? (
                <div className="p-6 sm:p-12 flex flex-col items-center justify-center space-y-5 sm:space-y-6 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-google-red/10 rounded-2xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-google-red" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">Ops! Algo deu errado</h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">{(routeInfo as any).error}. Por favor, verifique os endereços e tente novamente.</p>
                  </div>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] text-sm"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                <div className="overflow-y-auto custom-scrollbar">
                  <div className="bg-google-blue p-5 sm:p-8 text-white text-center relative">
                    <button 
                      onClick={() => setShowModal(false)}
                      className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 backdrop-blur-md">
                      <BarChart3 className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <p className="text-[10px] sm:text-sm font-bold text-white/80 uppercase tracking-widest mb-0.5 sm:mb-1">Custo Total Estimado</p>
                    <h3 className="text-2xl sm:text-5xl font-bold tracking-tight">{formatCurrency(totalCost)}</h3>
                  </div>

                  <div className="p-5 sm:p-8 space-y-5 sm:space-y-8">
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="bg-slate-50 p-2.5 sm:p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                        <Fuel className="w-4 h-4 sm:w-5 sm:h-5 text-google-blue mb-1.5 sm:mb-2" />
                        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Combustível</p>
                        <p className="text-sm sm:text-lg font-bold text-slate-900">{formatCurrency(totalFuelCost)}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 sm:p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-google-red mb-1.5 sm:mb-2" />
                        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Pedágios</p>
                        <p className="text-sm sm:text-lg font-bold text-slate-900">{formatCurrency(totalTolls)}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 sm:p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                        <RouteIcon className="w-4 h-4 sm:w-5 sm:h-5 text-google-green mb-1.5 sm:mb-2" />
                        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Distância</p>
                        <p className="text-sm sm:text-lg font-bold text-slate-900">{formatDistance(routeInfo.distance * (isRoundTrip ? 2 : 1))}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 sm:p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-google-yellow mb-1.5 sm:mb-2" />
                        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Tempo</p>
                        <p className="text-sm sm:text-lg font-bold text-slate-900">{formatDuration(routeInfo.duration)}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 sm:gap-3">
                      <button 
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeRoute?.origin || '')}&destination=${encodeURIComponent(activeRoute?.destination || '')}&travelmode=driving`;
                          window.open(url, '_blank');
                        }}
                        className="w-full bg-google-blue text-white py-3 sm:py-4 rounded-2xl font-bold shadow-xl shadow-google-blue/20 hover:bg-google-blue/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-lg"
                      >
                        <Navigation className="w-4 h-4 sm:w-6 sm:h-6" />
                        Navegar no Google Maps
                      </button>
                      <div className="flex gap-2 sm:gap-3">
                        <button 
                          onClick={handleSaveTrip}
                          disabled={isSaving}
                          className="flex-1 bg-slate-100 text-slate-700 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm"
                        >
                          {isSaving ? <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                          Salvar Viagem
                        </button>
                        <button 
                          onClick={() => setShowModal(false)}
                          className="flex-1 bg-white border border-slate-200 text-slate-500 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-[0.98] text-[10px] sm:text-sm"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl font-bold text-xs flex items-center gap-2"
          >
            <Bookmark className="w-3.5 h-3.5 text-google-blue" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        setDoc(userRef, {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          createdAt: serverTimestamp()
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${u.uid}`));
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-google-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasValidKey && user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6 font-sans">
        <div className="max-w-lg w-full text-center space-y-6 bg-white p-10 rounded-3xl shadow-2xl border border-slate-100">
          <div className="w-20 h-20 bg-google-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin className="text-google-blue w-10 h-10" />
          </div>
          <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Configuração Necessária</h2>
          <p className="text-slate-600 leading-relaxed">Para habilitar os mapas e cálculos de rota em tempo real, você precisa adicionar uma Chave de API do Google Maps.</p>
          
          <div className="text-left space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Passo a Passo:</p>
            <ol className="space-y-3 text-sm text-slate-700 list-decimal list-inside font-medium">
              <li>Obtenha uma chave em <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener" className="text-google-blue hover:underline font-bold">Google Cloud Console</a></li>
              <li>Abra as <strong>Configurações</strong> (ícone de engrenagem no canto superior direito)</li>
              <li>Vá em <strong>Secrets</strong></li>
              <li>Adicione <code>GOOGLE_MAPS_PLATFORM_KEY</code> como nome e cole sua chave</li>
            </ol>
          </div>
          
          <p className="text-xs text-slate-400 font-medium italic">O aplicativo será reiniciado automaticamente após a configuração.</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LoginScreen />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DashboardScreen user={user} />
          </motion.div>
        )}
      </AnimatePresence>
    </APIProvider>
  );
}
