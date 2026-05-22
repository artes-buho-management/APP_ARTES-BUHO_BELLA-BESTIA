import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoBellaBestia from './assets/logo-bella-bestia.webp'
import './App.css'

type MovementType = 'INGRESO' | 'GASTO'
type PaymentMethod = 'TARJETA' | 'EFECTIVO' | 'TRANSFERENCIA'
type ViewMode = 'evento' | 'semana' | 'mes'
type AppTab =
  | 'dashboard'
  | 'analitica'
  | 'informes'
  | 'escenarios'
  | 'movimientos'
  | 'libro'
  | 'eventos'
  | 'auditoria'
type VatType = 'EXENTO' | 'IVA_4' | 'IVA_10' | 'IVA_21'
type EventStatus = 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO' | 'APLAZADO'
type TemporalAxis = 'fecha_compra' | 'fecha_evento'
type AnalyticsSection = 'resumen' | 'ventas' | 'evento' | 'marketing' | 'rentabilidad'
type AnalyticsGranularity = 'semana' | 'mes' | 'evento'
type CustomerSegment = 'NUEVO' | 'RECURRENTE'

interface LedgerEntry {
  id: string
  date: string
  event: string
  concept: string
  category: string
  movementType: MovementType
  paymentMethod: PaymentMethod
  amount: number
  baseAmount?: number
  vatType?: VatType
  vatRate?: number
  vatAmount?: number
  withholdingRate?: number
  withholdingAmount?: number
  purchaseDate?: string
  eventDateTime?: string
  eventType?: string
  eventTimeSlot?: string
  eventStatus?: EventStatus
  artist?: string
  genre?: string
  promoter?: string
  venueSpace?: string
  zoneSection?: string
  ticketType?: string
  channel?: string
  source?: string
  medium?: string
  campaign?: string
  customerSegment?: CustomerSegment
  ticketCount?: number
  ticketCompCount?: number
  ticketRefundCount?: number
  scannedCount?: number
  discountAmount?: number
  feeAssumedAmount?: number
  directCostAmount?: number
  waitlistCount?: number
  totalCapacity?: number
  releasedCapacity?: number
  sellableCapacity?: number
  slotsAvailable?: number
  slotsOccupied?: number
  notes: string
}

interface AggregatedRow {
  key: string
  ingresos: number
  gastos: number
  beneficio: number
  margen: number
}

type AuditSeverity = 'ALTA' | 'MEDIA' | 'BAJA'
type MetricKey = 'ingresos' | 'gastos' | 'beneficio'
type ChartPeriodPreset = '3m' | '6m' | '12m' | 'todo'
type ChartGranularity = 'mes' | 'semana' | 'evento'

type DashboardKpiId =
  | 'ingresos_brutos'
  | 'ingresos_netos'
  | 'tickets_vendidos_netos'
  | 'precio_medio_ticket'
  | 'ocupacion'
  | 'ocupacion_pagada'
  | 'asistencia_escaneada'
  | 'scan_rate'
  | 'no_show_rate'
  | 'refund_rate'
  | 'pct_cortesias'
  | 'ritmo_venta_7d'
  | 'ritmo_venta_14d'
  | 'ritmo_venta_30d'
  | 'pace_index'
  | 'utilizacion_sala'
  | 'revenue_por_asistente'
  | 'revenue_por_dia_disponible'
  | 'numero_eventos'
  | 'numero_eventos_sold_out'
  | 'numero_eventos_en_riesgo'

interface AnalyticsFilters {
  dateFrom: string
  dateTo: string
  granularity: AnalyticsGranularity
  temporalAxis: TemporalAxis
  eventStatus: string
  artist: string
  genre: string
  promoter: string
  venueSpace: string
  zoneSection: string
  ticketType: string
  channel: string
  source: string
  medium: string
  campaign: string
}

interface EventAnalyticsSnapshot {
  event: string
  eventDateTime: string
  purchaseFirstDate: string
  artist: string
  genre: string
  promoter: string
  venueSpace: string
  zoneSection: string
  ticketType: string
  eventStatus: EventStatus
  totalCapacity: number
  releasedCapacity: number
  sellableCapacity: number
  ticketsPagados: number
  ticketsComp: number
  ticketsDevueltos: number
  ticketsValidosEmitidos: number
  scannedTickets: number
  ingresosBrutos: number
  ingresosNetos: number
  gastos: number
  beneficio: number
  ocupacion: number
  ocupacionPagada: number
  scanRate: number
  noShowRate: number
  refundRate: number
  pctCortesias: number
  paceIndex: number
  riskLevel: 'ALTO' | 'MEDIO' | 'BAJO'
  waitlistCount: number
  directCostAmount: number
  revenuePorAsistente: number
  margenBruto: number
  slotsDisponibles: number
  slotsOcupados: number
}

interface AuditFinding {
  id: string
  severity: AuditSeverity
  title: string
  detail: string
  action: string
}

interface MovementDraft {
  date: string
  purchaseDate: string
  eventDateTime: string
  eventStatus: EventStatus
  event: string
  artist: string
  genre: string
  promoter: string
  venueSpace: string
  zoneSection: string
  ticketType: string
  channel: string
  source: string
  medium: string
  campaign: string
  customerSegment: CustomerSegment
  ticketCount: string
  ticketCompCount: string
  ticketRefundCount: string
  scannedCount: string
  discountAmount: string
  feeAssumedAmount: string
  waitlistCount: string
  concept: string
  category: string
  paymentMethod: PaymentMethod
  baseAmount: string
  vatType: VatType
  withholdingRate: number
  notes: string
}

interface DataSourceInfo {
  source: 'local' | 'google_sheets' | 'google_sheets_public'
  readOnly: boolean
  sheet: {
    id: string
    url: string
    mainTab: string
    reportTabs: string[]
    controlTab?: string
  } | null
}

interface ReportWindowSnapshot {
  id: string
  label: string
  from: string
  to: string
  movements: number
  ingresos: number
  gastos: number
  beneficio: number
  margen: number
}

interface ScenarioAdjustments {
  optimisticIncomePct: number
  optimisticExpensePct: number
  pessimisticIncomePct: number
  pessimisticExpensePct: number
}

interface ScenarioSummaryRow {
  name: string
  income: number
  expense: number
  net: number
}

interface ExecutiveKpiIndex {
  id: string
  label: string
  score: number
  insight: string
  formula: string
}

const INCOME_CATEGORIES = [
  'Taquilla',
  'Barra',
  'Patrocinio',
  'Merchandising',
  'Reserva de sala',
]

const EXPENSE_CATEGORIES = [
  'Caché artistas',
  'Personal',
  'Sonido e iluminacion',
  'Marketing',
  'Seguridad',
  'Limpieza',
  'Suministros',
  'Otros',
]

const MOVEMENT_UI: Record<
  MovementType,
  {
    label: string
    methodLabel: string
    actionLabel: string
    conceptPlaceholder: string
    categories: string[]
  }
> = {
  INGRESO: {
    label: 'Ingreso',
    methodLabel: 'Método de cobro',
    actionLabel: 'Añadir ingreso',
    conceptPlaceholder: 'Ej: venta de entradas',
    categories: INCOME_CATEGORIES,
  },
  GASTO: {
    label: 'Gasto',
    methodLabel: 'Método de pago',
    actionLabel: 'Añadir gasto',
    conceptPlaceholder: 'Ej: caché DJ o seguridad',
    categories: EXPENSE_CATEGORIES,
  },
}

const VAT_OPTIONS: VatOption[] = [
  { type: 'EXENTO', label: 'Exento (0%)', rate: 0 },
  { type: 'IVA_4', label: 'IVA superreducido (4%)', rate: 4 },
  { type: 'IVA_10', label: 'IVA reducido (10%)', rate: 10 },
  { type: 'IVA_21', label: 'IVA general (21%)', rate: 21 },
]

const WITHHOLDING_OPTIONS = [0, 7, 15, 19]

const TABS: { id: AppTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analitica', label: 'Analítica' },
  { id: 'informes', label: 'Informes' },
  { id: 'escenarios', label: 'Escenarios' },
  { id: 'libro', label: 'Libro diario' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'auditoria', label: 'Auditoría' },
]

const VIEW_MODE_AXIS_LABEL: Record<ViewMode, string> = {
  evento: 'Evento',
  semana: 'Semana',
  mes: 'Mes',
}

const GRANULARITY_AXIS_LABEL: Record<AnalyticsGranularity, string> = {
  evento: 'Evento',
  semana: 'Semana',
  mes: 'Mes',
}

const TEMPORAL_AXIS_LABEL: Record<TemporalAxis, string> = {
  fecha_compra: 'Fecha de compra',
  fecha_evento: 'Fecha del evento',
}

const METRIC_META: Record<MetricKey, { label: string; color: string }> = {
  ingresos: { label: 'Ingresos', color: '#d9222f' },
  gastos: { label: 'Gastos', color: '#f0ad00' },
  beneficio: { label: 'Beneficio', color: '#0e6d3f' },
}

const ANALYTICS_STORAGE_KEY = 'bella-bestia-analytics-filters-v1'

const ANALYTICS_RISK_CONFIG = {
  paceIndexWarning: 0.85,
  paceIndexDanger: 0.65,
  occupancyWarning: 0.55,
  occupancyDanger: 0.4,
  soldOutThreshold: 0.97,
  targetUtilization: 0.65,
}

const KPI_LABELS: Record<DashboardKpiId, string> = {
  ingresos_brutos: 'Ingresos brutos',
  ingresos_netos: 'Ingresos netos',
  tickets_vendidos_netos: 'Tickets vendidos netos',
  precio_medio_ticket: 'Precio medio ticket',
  ocupacion: 'Ocupación',
  ocupacion_pagada: 'Ocupación pagada',
  asistencia_escaneada: 'Asistencia escaneada',
  scan_rate: 'Scan rate',
  no_show_rate: 'No-show rate',
  refund_rate: 'Refund rate',
  pct_cortesias: '% cortesías',
  ritmo_venta_7d: 'Ritmo venta 7D',
  ritmo_venta_14d: 'Ritmo venta 14D',
  ritmo_venta_30d: 'Ritmo venta 30D',
  pace_index: 'Pace index',
  utilizacion_sala: 'Utilización sala',
  revenue_por_asistente: 'Revenue por asistente',
  revenue_por_dia_disponible: 'Revenue por día disponible',
  numero_eventos: 'Número de eventos',
  numero_eventos_sold_out: 'Eventos sold out',
  numero_eventos_en_riesgo: 'Eventos en riesgo',
}

function createZeroKpiMap(): Record<DashboardKpiId, number> {
  return (Object.keys(KPI_LABELS) as DashboardKpiId[]).reduce((acc, key) => {
    acc[key] = 0
    return acc
  }, {} as Record<DashboardKpiId, number>)
}

const ANALYTICS_SECTIONS: { id: AnalyticsSection; label: string }[] = [
  { id: 'resumen', label: 'Resumen ejecutivo' },
  { id: 'ventas', label: 'Ventas y demanda' },
  { id: 'evento', label: 'Detalle por evento' },
  { id: 'marketing', label: 'Marketing y audiencia' },
  { id: 'rentabilidad', label: 'Rentabilidad y operación' },
]

function getDefaultCategory(movementType: MovementType) {
  return movementType === 'INGRESO' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]
}

function createDraft(
  movementType: MovementType,
  eventName = 'Evento nuevo',
  date = getTodayISODate(),
): MovementDraft {
  return {
    date,
    purchaseDate: date,
    eventDateTime: `${date}T22:00`,
    eventStatus: inferEventStatus(`${date}T22:00`),
    event: eventName,
    artist: eventName,
    genre: 'General',
    promoter: 'Bella Bestia',
    venueSpace: 'Sala principal',
    zoneSection: 'General',
    ticketType: movementType === 'INGRESO' ? 'Entrada general' : 'Proveedor',
    channel: movementType === 'INGRESO' ? 'Ticketera' : 'Operación',
    source: 'Directo',
    medium: 'Orgánico',
    campaign: 'Sin campaña',
    customerSegment: 'NUEVO',
    ticketCount: movementType === 'INGRESO' ? '1' : '0',
    ticketCompCount: '0',
    ticketRefundCount: '0',
    scannedCount: movementType === 'INGRESO' ? '1' : '0',
    discountAmount: '0',
    feeAssumedAmount: '0',
    waitlistCount: '0',
    concept: '',
    category: getDefaultCategory(movementType),
    paymentMethod: 'TARJETA',
    baseAmount: '',
    vatType: 'IVA_21',
    withholdingRate: movementType === 'GASTO' ? 15 : 0,
    notes: '',
  }
}

interface VatOption {
  type: VatType
  label: string
  rate: number
}

const INITIAL_ENTRIES: LedgerEntry[] = [
  {
    id: '1',
    date: '2026-01-09',
    event: 'Noche Indie Enero',
    concept: 'Venta entradas anticipadas',
    category: 'Taquilla',
    movementType: 'INGRESO',
    paymentMethod: 'TARJETA',
    amount: 2180,
    notes: 'Campaña digital',
  },
  {
    id: '2',
    date: '2026-01-09',
    event: 'Noche Indie Enero',
    concept: 'Barra principal',
    category: 'Barra',
    movementType: 'INGRESO',
    paymentMethod: 'EFECTIVO',
    amount: 1340,
    notes: 'Turno completo',
  },
  {
    id: '3',
    date: '2026-01-09',
    event: 'Noche Indie Enero',
    concept: 'Pago banda principal',
    category: 'Caché artistas',
    movementType: 'GASTO',
    paymentMethod: 'TRANSFERENCIA',
    amount: 980,
    notes: 'Contrato cerrado',
  },
  {
    id: '4',
    date: '2026-01-09',
    event: 'Noche Indie Enero',
    concept: 'Equipo tecnico',
    category: 'Personal',
    movementType: 'GASTO',
    paymentMethod: 'TRANSFERENCIA',
    amount: 390,
    notes: '2 tecnicos + 1 runner',
  },
  {
    id: '5',
    date: '2026-01-16',
    event: 'Sabado Rock Enero',
    concept: 'Taquilla puerta',
    category: 'Taquilla',
    movementType: 'INGRESO',
    paymentMethod: 'EFECTIVO',
    amount: 1740,
    notes: 'Venta en puerta',
  },
  {
    id: '6',
    date: '2026-01-16',
    event: 'Sabado Rock Enero',
    concept: 'Consumo barra',
    category: 'Barra',
    movementType: 'INGRESO',
    paymentMethod: 'TARJETA',
    amount: 1480,
    notes: 'Ticket medio alto',
  },
  {
    id: '7',
    date: '2026-01-16',
    event: 'Sabado Rock Enero',
    concept: 'Publicidad redes',
    category: 'Marketing',
    movementType: 'GASTO',
    paymentMethod: 'TARJETA',
    amount: 230,
    notes: 'Meta ads',
  },
  {
    id: '8',
    date: '2026-01-16',
    event: 'Sabado Rock Enero',
    concept: 'Refuerzo seguridad',
    category: 'Seguridad',
    movementType: 'GASTO',
    paymentMethod: 'TRANSFERENCIA',
    amount: 320,
    notes: '2 personas',
  },
  {
    id: '9',
    date: '2026-02-06',
    event: 'Session Urbana Febrero',
    concept: 'Patrocinio local',
    category: 'Patrocinio',
    movementType: 'INGRESO',
    paymentMethod: 'TRANSFERENCIA',
    amount: 900,
    notes: 'Marca bebidas',
  },
  {
    id: '10',
    date: '2026-02-06',
    event: 'Session Urbana Febrero',
    concept: 'Entradas online',
    category: 'Taquilla',
    movementType: 'INGRESO',
    paymentMethod: 'TARJETA',
    amount: 2660,
    notes: 'Venta web',
  },
  {
    id: '11',
    date: '2026-02-06',
    event: 'Session Urbana Febrero',
    concept: 'Produccion visual',
    category: 'Sonido e iluminacion',
    movementType: 'GASTO',
    paymentMethod: 'TRANSFERENCIA',
    amount: 760,
    notes: 'Pantallas y luces',
  },
  {
    id: '12',
    date: '2026-02-06',
    event: 'Session Urbana Febrero',
    concept: 'Limpieza post evento',
    category: 'Limpieza',
    movementType: 'GASTO',
    paymentMethod: 'EFECTIVO',
    amount: 145,
    notes: 'Servicio nocturno',
  },
  {
    id: '13',
    date: '2026-02-20',
    event: 'Fiesta Ochentera',
    concept: 'Entradas grupo',
    category: 'Taquilla',
    movementType: 'INGRESO',
    paymentMethod: 'TARJETA',
    amount: 1920,
    notes: 'Descuento pack',
  },
  {
    id: '14',
    date: '2026-02-20',
    event: 'Fiesta Ochentera',
    concept: 'Merchandising',
    category: 'Merchandising',
    movementType: 'INGRESO',
    paymentMethod: 'EFECTIVO',
    amount: 380,
    notes: 'Camisetas y posters',
  },
  {
    id: '15',
    date: '2026-02-20',
    event: 'Fiesta Ochentera',
    concept: 'Caché DJ invitado',
    category: 'Caché artistas',
    movementType: 'GASTO',
    paymentMethod: 'TRANSFERENCIA',
    amount: 640,
    notes: 'Sesión 3 horas',
  },
  {
    id: '16',
    date: '2026-02-20',
    event: 'Fiesta Ochentera',
    concept: 'Personal barra',
    category: 'Personal',
    movementType: 'GASTO',
    paymentMethod: 'TRANSFERENCIA',
    amount: 310,
    notes: 'Refuerzo de equipo',
  },
  {
    id: '17',
    date: '2026-03-05',
    event: 'Festival Primavera Dia 1',
    concept: 'Entradas preventa',
    category: 'Taquilla',
    movementType: 'INGRESO',
    paymentMethod: 'TARJETA',
    amount: 3490,
    notes: 'Abonos 1 dia',
  },
  {
    id: '18',
    date: '2026-03-05',
    event: 'Festival Primavera Dia 1',
    concept: 'Barra premium',
    category: 'Barra',
    movementType: 'INGRESO',
    paymentMethod: 'TARJETA',
    amount: 1775,
    notes: 'Ticket alto',
  },
  {
    id: '19',
    date: '2026-03-05',
    event: 'Festival Primavera Dia 1',
    concept: 'Montaje escenario',
    category: 'Sonido e iluminacion',
    movementType: 'GASTO',
    paymentMethod: 'TRANSFERENCIA',
    amount: 1190,
    notes: 'Proveedor externo',
  },
  {
    id: '20',
    date: '2026-03-05',
    event: 'Festival Primavera Dia 1',
    concept: 'Campaña lanzamiento',
    category: 'Marketing',
    movementType: 'GASTO',
    paymentMethod: 'TARJETA',
    amount: 420,
    notes: 'Video promo',
  },
  {
    id: '21',
    date: '2026-03-12',
    event: 'Festival Primavera Dia 2',
    concept: 'Entradas taquilla',
    category: 'Taquilla',
    movementType: 'INGRESO',
    paymentMethod: 'EFECTIVO',
    amount: 2040,
    notes: 'Venta última hora',
  },
  {
    id: '22',
    date: '2026-03-12',
    event: 'Festival Primavera Dia 2',
    concept: 'Reserva mesa VIP',
    category: 'Reserva de sala',
    movementType: 'INGRESO',
    paymentMethod: 'TRANSFERENCIA',
    amount: 580,
    notes: 'Mesa corporativa',
  },
  {
    id: '23',
    date: '2026-03-12',
    event: 'Festival Primavera Dia 2',
    concept: 'Backline y suministros',
    category: 'Suministros',
    movementType: 'GASTO',
    paymentMethod: 'TARJETA',
    amount: 355,
    notes: 'Reposicion urgente',
  },
  {
    id: '24',
    date: '2026-03-12',
    event: 'Festival Primavera Dia 2',
    concept: 'Cierre administrativo',
    category: 'Otros',
    movementType: 'GASTO',
    paymentMethod: 'TRANSFERENCIA',
    amount: 185,
    notes: 'Gestoria y tasas',
  },
]

const CURRENCY = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
})

const NUMBER_1 = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  useGrouping: 'always',
})

const NUMBER_2 = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
})

const NUMBER_0 = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  useGrouping: 'always',
})

const STORAGE_KEY = 'bella-bestia-ledger-storage-v1'
const SHEET_AUTO_SYNC_SECONDS = (() => {
  const secondsRaw = Number.parseInt(
    String(import.meta.env.VITE_SHEET_AUTO_SYNC_SECONDS ?? ''),
    10,
  )
  if (Number.isFinite(secondsRaw) && secondsRaw > 0) {
    return Math.min(300, Math.max(3, secondsRaw))
  }

  const minutesRaw = Number.parseInt(
    String(import.meta.env.VITE_SHEET_AUTO_SYNC_MINUTES ?? ''),
    10,
  )
  if (Number.isFinite(minutesRaw) && minutesRaw > 0) {
    return Math.min(300, Math.max(3, minutesRaw * 60))
  }

  return 5
})()
const SHEET_AUTO_SYNC_INTERVAL_MS = SHEET_AUTO_SYNC_SECONDS * 1000
const APP_VIEW_ONLY_MODE = true

const METHOD_COLORS: Record<PaymentMethod, string> = {
  TARJETA: '#d9222f',
  EFECTIVO: '#f0ad00',
  TRANSFERENCIA: '#2d5dd4',
}

type ExportRow = {
  Fecha: string
  FechaCompra: string
  FechaEvento: string
  Evento: string
  EstadoEvento: string
  Artista: string
  Genero: string
  Promotor: string
  SalaEspacio: string
  ZonaSeccion: string
  TipoTicket: string
  Tipo: MovementType
  'Método': PaymentMethod
  Channel: string
  Source: string
  Medium: string
  Campaign: string
  SegmentoCliente: string
  'Categoría': string
  Concepto: string
  TicketsPagados: string
  TicketsCortesia: string
  TicketsDevueltos: string
  TicketsEscaneados: string
  BaseImponibleEUR: string
  TipoIVA: string
  CuotaIVAEUR: string
  RetencionPct: string
  RetencionEUR: string
  DescuentoEUR: string
  FeeAsumidaEUR: string
  Waitlist: string
  TotalLineaEUR: string
  Notas: string
}

type ExportScope = 'combinado' | 'ingresos' | 'gastos'
type DiaryRangePreset = 'hoy' | '7dias' | 'mes' | 'ano' | 'todo' | 'custom'
type AnalysisScope = 'RESUMEN' | 'VENTAS' | 'COMPRAS'
type AnalysisRangePreset = 'semana' | 'mes' | 'trimestre' | 'ano' | 'ano_anterior' | 'todo' | 'custom'
type ReportMode = 'semana' | 'mes'
type ReportRangePreset = 'semana' | 'mes' | 'trimestre' | 'ano' | 'ano_anterior' | 'todo' | 'custom'
type EventsRangePreset = 'todo' | '12m' | '6m' | '3m' | 'mes' | 'semana'

type ReportSummaryRow = {
  'Período': string
  Movimientos: number
  IngresosEUR: string
  GastosEUR: string
  BeneficioEUR: string
  MargenPct: string
}

const ANALYSIS_SCOPE_LABEL: Record<AnalysisScope, string> = {
  RESUMEN: 'Resumen',
  VENTAS: 'Ventas',
  COMPRAS: 'Compras',
}

const EVENTS_RANGE_LABEL: Record<EventsRangePreset, string> = {
  todo: 'Todo',
  '12m': 'Últimos 12 meses',
  '6m': 'Últimos 6 meses',
  '3m': 'Últimos 3 meses',
  mes: 'Último mes',
  semana: 'Última semana',
}

const RANGE_PRESET_LABELS: Record<
  Exclude<AnalysisRangePreset | ReportRangePreset, 'custom'>,
  string
> = {
  semana: 'Semana actual',
  mes: 'Mes actual',
  trimestre: 'Trimestre actual',
  ano: 'Año actual',
  ano_anterior: 'Año anterior',
  todo: 'Todo',
}

const KPI_FORMULA_TEXT: Record<DashboardKpiId, string> = {
  ingresos_brutos: 'Suma de todas las líneas de ingreso filtradas.',
  ingresos_netos: 'Ingresos brutos menos devoluciones y ajustes.',
  tickets_vendidos_netos: 'Tickets pagados menos tickets devueltos.',
  precio_medio_ticket: 'Ingresos netos dividido por tickets vendidos netos.',
  ocupacion: 'Tickets válidos emitidos dividido por aforo liberado.',
  ocupacion_pagada: 'Tickets pagados dividido por aforo liberado.',
  asistencia_escaneada: 'Total de tickets escaneados en acceso.',
  scan_rate: 'Tickets escaneados dividido por tickets válidos.',
  no_show_rate: '1 menos scan rate.',
  refund_rate: 'Tickets devueltos dividido por tickets pagados.',
  pct_cortesias: 'Tickets de cortesía dividido por tickets válidos.',
  ritmo_venta_7d: 'Tickets vendidos netos en los últimos 7 días.',
  ritmo_venta_14d: 'Tickets vendidos netos en los últimos 14 días.',
  ritmo_venta_30d: 'Tickets vendidos netos en los últimos 30 días.',
  pace_index: 'Ritmo actual comparado con ritmo base del período.',
  utilizacion_sala: 'Slots ocupados dividido por slots disponibles.',
  revenue_por_asistente: 'Ingresos netos dividido por asistentes escaneados.',
  revenue_por_dia_disponible: 'Ingresos netos dividido por días/slots operativos.',
  numero_eventos: 'Conteo de eventos únicos del período filtrado.',
  numero_eventos_sold_out: 'Eventos con ocupación pagada en nivel sold out.',
  numero_eventos_en_riesgo: 'Eventos por debajo del umbral de ocupación objetivo.',
}

function getFileStamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  return `${year}${month}${day}-${hour}${minute}`
}

async function loadImageAsDataUrl(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return null
    }
    const blob = await response.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('No se pudo convertir el logo a base64.'))
      reader.readAsDataURL(blob)
    })
    return dataUrl || null
  } catch {
    return null
  }
}

function addPdfFooters(doc: jsPDF, footerLabel = 'BELLA BESTIA - INFORME CORPORATIVO') {
  const pages = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(70, 70, 70)
    doc.text(footerLabel, 12, pageHeight - 6)
    doc.text(`${page}/${pages}`, pageWidth - 12, pageHeight - 6, { align: 'right' })
  }
}

function hexToRgb(color: string) {
  const normalized = String(color || '')
    .replace('#', '')
    .trim()
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 28, g: 28, b: 28 }
  }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function formatCompactCurrency(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${NUMBER_1.format(value / 1_000_000)} M€`
  if (abs >= 1_000) return `${NUMBER_1.format(value / 1_000)} K€`
  return `${NUMBER_0.format(value)} €`
}

function drawPdfLineChart(
  doc: jsPDF,
  options: {
    x: number
    y: number
    width: number
    height: number
    title: string
    rows: AggregatedRow[]
    metric: MetricKey
    color: string
  },
) {
  const { x, y, width, height, title, rows, metric, color } = options
  doc.setDrawColor(223, 223, 223)
  doc.roundedRect(x, y, width, height, 2, 2, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(28, 28, 28)
  doc.text(title, x + 4, y + 6)

  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Sin datos en este período.', x + 4, y + 13)
    return
  }

  const values = rows.map((row) => getMetricValue(row, metric))
  const minValue = Math.min(0, ...values)
  const maxValue = Math.max(0, ...values)
  const span = Math.max(1, maxValue - minValue)
  const ticks = 5

  const chartLeft = x + 16
  const chartTop = y + 14
  const chartWidth = width - 22
  const chartHeight = height - 24
  const chartBottom = chartTop + chartHeight

  for (let index = 0; index < ticks; index += 1) {
    const ratio = index / (ticks - 1)
    const tickValue = maxValue - span * ratio
    const tickY = chartTop + chartHeight * ratio
    doc.setDrawColor(232, 232, 232)
    doc.line(chartLeft, tickY, chartLeft + chartWidth, tickY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.8)
    doc.setTextColor(120, 120, 120)
    doc.text(formatCompactCurrency(tickValue), chartLeft - 2, tickY + 2, { align: 'right' })
  }

  const rgb = hexToRgb(color)
  doc.setDrawColor(rgb.r, rgb.g, rgb.b)
  doc.setFillColor(rgb.r, rgb.g, rgb.b)
  doc.setLineWidth(0.9)

  const getY = (value: number) => chartBottom - ((value - minValue) / span) * chartHeight
  const getX = (index: number) => {
    if (values.length <= 1) return chartLeft + chartWidth / 2
    return chartLeft + (index / (values.length - 1)) * chartWidth
  }

  if (values.length === 1) {
    const value = values[0]
    const xCenter = getX(0)
    const zeroY = getY(0)
    const valueY = getY(value)
    const barWidth = Math.max(10, Math.min(26, chartWidth * 0.24))
    const barTop = Math.min(zeroY, valueY)
    const barHeight = Math.max(2.2, Math.abs(zeroY - valueY))
    const barX = xCenter - barWidth / 2
    const periodLabel = formatAxisTickLabel(rows[0]?.key ?? 'Periodo', 16)

    doc.setDrawColor(206, 206, 206)
    doc.line(chartLeft, zeroY, chartLeft + chartWidth, zeroY)

    doc.setFillColor(rgb.r, rgb.g, rgb.b)
    doc.roundedRect(barX, barTop, barWidth, barHeight, 1.4, 1.4, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.4)
    doc.setTextColor(34, 34, 34)
    doc.text(CURRENCY.format(value), xCenter, Math.max(chartTop + 3, barTop - 1.4), {
      align: 'center',
    })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.8)
    doc.setTextColor(92, 92, 92)
    doc.text(periodLabel, xCenter, chartBottom + 5, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.6)
    doc.setTextColor(80, 80, 80)
    doc.text('Vista mensual puntual: gráfico adaptado a un único periodo.', x + 4, y + height - 3.4)
    return
  }

  for (let index = 1; index < values.length; index += 1) {
    doc.line(getX(index - 1), getY(values[index - 1]), getX(index), getY(values[index]))
  }

  values.forEach((value, index) => {
    doc.circle(getX(index), getY(value), 1.3, 'F')
  })

  const tickIndexes = getXAxisTickIndexes(rows.length, 4)
  tickIndexes.forEach((index) => {
    const tickX = getX(index)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.6)
    doc.setTextColor(92, 92, 92)
    doc.text(formatAxisTickLabel(rows[index].key, 12), tickX, chartBottom + 5, { align: 'center' })
  })
}

function drawPdfMethodBars(
  doc: jsPDF,
  options: {
    x: number
    y: number
    width: number
    height: number
    title: string
    slices: { label: string; value: number; color: string }[]
  },
) {
  const { x, y, width, height, title, slices } = options
  doc.setDrawColor(223, 223, 223)
  doc.roundedRect(x, y, width, height, 2, 2, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(28, 28, 28)
  doc.text(title, x + 4, y + 6)

  const total = slices.reduce((acc, slice) => acc + slice.value, 0)
  if (total <= 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Sin datos en este período.', x + 4, y + 13)
    return
  }

  const baseY = y + 15
  const barWidth = width - 68
  const barHeight = 5

  slices.forEach((slice, index) => {
    const rowY = baseY + index * 11
    const share = total > 0 ? slice.value / total : 0
    const rgb = hexToRgb(slice.color)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(48, 48, 48)
    doc.text(slice.label, x + 4, rowY + 3.9)

    doc.setFillColor(240, 240, 240)
    doc.roundedRect(x + 27, rowY, barWidth, barHeight, 1.5, 1.5, 'F')
    doc.setFillColor(rgb.r, rgb.g, rgb.b)
    doc.roundedRect(x + 27, rowY, Math.max(1.2, barWidth * share), barHeight, 1.5, 1.5, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.1)
    doc.setTextColor(24, 24, 24)
    doc.text(`${formatPercent(share * 100)} · ${CURRENCY.format(slice.value)}`, x + width - 4, rowY + 3.9, {
      align: 'right',
    })
  })
}

function drawPdfScenarioBars(
  doc: jsPDF,
  options: {
    x: number
    y: number
    width: number
    height: number
    title: string
    rows: ScenarioSummaryRow[]
  },
) {
  const { x, y, width, height, title, rows } = options
  doc.setDrawColor(223, 223, 223)
  doc.roundedRect(x, y, width, height, 2, 2, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(28, 28, 28)
  doc.text(title, x + 4, y + 6)

  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Sin datos de escenarios.', x + 4, y + 13)
    return
  }

  const values = rows.map((row) => row.net)
  const minValue = Math.min(0, ...values)
  const maxValue = Math.max(0, ...values)
  const span = Math.max(1, maxValue - minValue)

  const chartLeft = x + 10
  const chartTop = y + 14
  const chartWidth = width - 20
  const chartHeight = height - 24
  const chartBottom = chartTop + chartHeight

  const getY = (value: number) => chartBottom - ((value - minValue) / span) * chartHeight
  const zeroY = getY(0)

  doc.setDrawColor(226, 226, 226)
  doc.line(chartLeft, zeroY, chartLeft + chartWidth, zeroY)

  const slotWidth = chartWidth / rows.length
  rows.forEach((row, index) => {
    const barX = chartLeft + index * slotWidth + slotWidth * 0.22
    const barWidth = slotWidth * 0.56
    const valueY = getY(row.net)
    const barTop = Math.min(valueY, zeroY)
    const barHeight = Math.max(1.2, Math.abs(valueY - zeroY))
    const shortName = row.name.replace('Escenario ', '')
    const isPositive = row.net >= 0

    if (index === 0) {
      doc.setFillColor(20, 93, 145)
    } else if (isPositive) {
      doc.setFillColor(32, 132, 74)
    } else {
      doc.setFillColor(190, 35, 35)
    }
    doc.rect(barX, barTop, barWidth, barHeight, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(45, 45, 45)
    doc.text(formatAxisTickLabel(shortName, 11), barX + barWidth / 2, chartBottom + 6, {
      align: 'center',
    })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.6)
    doc.text(CURRENCY.format(row.net), barX + barWidth / 2, barTop - 1.4, {
      align: 'center',
    })
  })
}

function drawPdfRankingBars(
  doc: jsPDF,
  options: {
    x: number
    y: number
    width: number
    height: number
    title: string
    rows: AggregatedRow[]
    maxRows?: number
    positiveColor?: string
    negativeColor?: string
  },
) {
  const {
    x,
    y,
    width,
    height,
    title,
    rows,
    maxRows = 8,
    positiveColor = '#145d91',
    negativeColor = '#be2323',
  } = options

  doc.setDrawColor(223, 223, 223)
  doc.roundedRect(x, y, width, height, 2, 2, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(28, 28, 28)
  doc.text(title, x + 4, y + 6)

  const scopedRows = rows.slice(0, Math.max(1, maxRows))
  if (scopedRows.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Sin datos en este período.', x + 4, y + 13)
    return
  }

  const values = scopedRows.map((row) => row.beneficio)
  const minValue = Math.min(0, ...values)
  const maxValue = Math.max(0, ...values)
  const span = Math.max(1, maxValue - minValue)
  const labelWidth = Math.min(58, Math.max(42, width * 0.36))
  const valueWidth = 28
  const chartX = x + labelWidth + 4
  const chartWidth = Math.max(20, width - labelWidth - valueWidth - 10)
  const zeroX = chartX + ((0 - minValue) / span) * chartWidth
  const topY = y + 12
  const availableHeight = height - 16
  const rowHeight = Math.max(8.2, availableHeight / scopedRows.length)

  doc.setDrawColor(205, 205, 205)
  doc.line(zeroX, topY, zeroX, topY + rowHeight * scopedRows.length)

  const positiveRgb = hexToRgb(positiveColor)
  const negativeRgb = hexToRgb(negativeColor)

  scopedRows.forEach((row, index) => {
    const rowTop = topY + index * rowHeight
    const centerY = rowTop + rowHeight * 0.5
    const valueX = chartX + ((row.beneficio - minValue) / span) * chartWidth
    const barLeft = Math.min(zeroX, valueX)
    const barWidth = Math.max(1.2, Math.abs(valueX - zeroX))
    const barHeight = Math.max(3.6, rowHeight * 0.46)
    const rgb = row.beneficio >= 0 ? positiveRgb : negativeRgb

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.8)
    doc.setTextColor(42, 42, 42)
    doc.text(formatAxisTickLabel(row.key, 22), x + 2, centerY + 2.1)

    doc.setFillColor(rgb.r, rgb.g, rgb.b)
    doc.roundedRect(barLeft, centerY - barHeight / 2, barWidth, barHeight, 1.2, 1.2, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(28, 28, 28)
    doc.text(CURRENCY.format(row.beneficio), x + width - 2, centerY + 2.1, { align: 'right' })
  })
}

function drawPdfComparativeBars(
  doc: jsPDF,
  options: {
    x: number
    y: number
    width: number
    height: number
    title: string
    rows: AggregatedRow[]
    maxRows?: number
  },
) {
  const { x, y, width, height, title, rows, maxRows = 8 } = options
  doc.setDrawColor(223, 223, 223)
  doc.roundedRect(x, y, width, height, 2, 2, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(28, 28, 28)
  doc.text(title, x + 4, y + 6)

  const scopedRows = rows.slice(0, Math.max(1, maxRows))
  if (scopedRows.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Sin datos en este período.', x + 4, y + 13)
    return
  }

  const ingresosRgb = hexToRgb(METRIC_META.ingresos.color)
  const gastosRgb = hexToRgb(METRIC_META.gastos.color)
  const maxValue = Math.max(
    1,
    ...scopedRows.flatMap((row) => [Math.max(0, row.ingresos), Math.max(0, row.gastos)]),
  )

  const chartLeft = x + 8
  const chartTop = y + 20
  const chartWidth = width - 16
  const chartHeight = Math.max(28, height - 34)
  const chartBottom = chartTop + chartHeight

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.8)
  doc.setTextColor(50, 50, 50)

  const tickCount = 4
  for (let tick = 0; tick <= tickCount; tick += 1) {
    const ratio = tick / tickCount
    const tickY = chartBottom - ratio * chartHeight
    const tickValue = maxValue * ratio
    doc.setDrawColor(233, 233, 233)
    doc.line(chartLeft, tickY, chartLeft + chartWidth, tickY)
    doc.text(formatCompactCurrency(tickValue), chartLeft - 2, tickY + 1.8, { align: 'right' })
  }

  doc.setFillColor(ingresosRgb.r, ingresosRgb.g, ingresosRgb.b)
  doc.rect(x + 4, y + 10, 3, 2.2, 'F')
  doc.setTextColor(40, 40, 40)
  doc.text('Ingresos', x + 8.6, y + 11.8)
  doc.setFillColor(gastosRgb.r, gastosRgb.g, gastosRgb.b)
  doc.rect(x + 30, y + 10, 3, 2.2, 'F')
  doc.text('Gastos', x + 34.6, y + 11.8)

  const groupWidth = chartWidth / scopedRows.length
  const barWidth = Math.max(2.2, Math.min(8, groupWidth * 0.24))
  scopedRows.forEach((row, index) => {
    const centerX = chartLeft + index * groupWidth + groupWidth / 2
    const ingresoHeight = (Math.max(0, row.ingresos) / maxValue) * chartHeight
    const gastoHeight = (Math.max(0, row.gastos) / maxValue) * chartHeight
    const ingresoX = centerX - barWidth - 1.2
    const gastoX = centerX + 1.2

    doc.setFillColor(ingresosRgb.r, ingresosRgb.g, ingresosRgb.b)
    doc.rect(ingresoX, chartBottom - ingresoHeight, barWidth, ingresoHeight, 'F')
    doc.setFillColor(gastosRgb.r, gastosRgb.g, gastosRgb.b)
    doc.rect(gastoX, chartBottom - gastoHeight, barWidth, gastoHeight, 'F')

    doc.setFontSize(7.2)
    doc.setTextColor(65, 65, 65)
    doc.text(formatAxisTickLabel(row.key, 14), centerX, chartBottom + 4.8, { align: 'center' })
  })
}

function drawPdfIndexBars(
  doc: jsPDF,
  options: {
    x: number
    y: number
    width: number
    height: number
    title: string
    rows: { label: string; score: number }[]
  },
) {
  const { x, y, width, height, title, rows } = options
  doc.setDrawColor(223, 223, 223)
  doc.roundedRect(x, y, width, height, 2, 2, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(28, 28, 28)
  doc.text(title, x + 4, y + 6)

  if (!rows.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Sin datos de índices.', x + 4, y + 13)
    return
  }

  const labelWidth = Math.min(62, Math.max(44, width * 0.4))
  const barX = x + labelWidth + 4
  const barWidth = Math.max(18, width - labelWidth - 22)
  const rowHeight = Math.max(9, (height - 16) / rows.length)

  rows.forEach((row, index) => {
    const score = clampScore(row.score)
    const rowTop = y + 11 + index * rowHeight
    const barY = rowTop + 2
    const barHeight = Math.max(3.8, rowHeight * 0.42)
    const fillWidth = Math.max(1.2, (score / 100) * barWidth)
    const fillColor =
      score >= 75 ? [32, 132, 74] : score >= 50 ? [217, 156, 20] : [190, 35, 35]

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(45, 45, 45)
    doc.text(formatAxisTickLabel(row.label, 20), x + 2, barY + 3.1)

    doc.setFillColor(240, 240, 240)
    doc.roundedRect(barX, barY, barWidth, barHeight, 1.1, 1.1, 'F')
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
    doc.roundedRect(barX, barY, fillWidth, barHeight, 1.1, 1.1, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(28, 28, 28)
    doc.text(`${NUMBER_0.format(score)}/100`, x + width - 2, barY + 3.1, { align: 'right' })
  })
}

function buildScenarioRowsFromTotals(
  ingresos: number,
  gastos: number,
  adjustments: ScenarioAdjustments,
): ScenarioSummaryRow[] {
  const optimisticIncome = ingresos * (1 + adjustments.optimisticIncomePct / 100)
  const optimisticExpense = gastos * (1 + adjustments.optimisticExpensePct / 100)
  const optimisticNet = optimisticIncome - optimisticExpense

  const pessimisticIncome = ingresos * (1 + adjustments.pessimisticIncomePct / 100)
  const pessimisticExpense = gastos * (1 + adjustments.pessimisticExpensePct / 100)
  const pessimisticNet = pessimisticIncome - pessimisticExpense

  return [
    {
      name: 'Escenario base',
      income: ingresos,
      expense: gastos,
      net: ingresos - gastos,
    },
    {
      name: 'Escenario optimista',
      income: optimisticIncome,
      expense: optimisticExpense,
      net: optimisticNet,
    },
    {
      name: 'Escenario pesimista',
      income: pessimisticIncome,
      expense: pessimisticExpense,
      net: pessimisticNet,
    },
  ]
}

function formatPercent(value: number) {
  return `${NUMBER_1.format(value)}%`
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${NUMBER_1.format(value)}%`
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
}

function calculateStabilityScore(rows: AggregatedRow[]) {
  if (!Array.isArray(rows) || rows.length <= 1) {
    return 100
  }
  const values = rows.map((row) => row.beneficio)
  const mean = values.reduce((acc, value) => acc + value, 0) / values.length
  const meanAbs = Math.max(1, Math.abs(mean))
  const variance =
    values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length
  const std = Math.sqrt(variance)
  const variationPct = (std / meanAbs) * 100
  return clampScore(100 - variationPct * 1.4)
}

function buildExecutiveKpiIndexes(input: {
  marginPct: number
  expenseRatioPct: number
  digitalSharePct: number
  monthlyRows: AggregatedRow[]
}): ExecutiveKpiIndex[] {
  const rentabilidad = clampScore(input.marginPct)
  const controlGasto = clampScore(100 - input.expenseRatioPct)
  const digital = clampScore(input.digitalSharePct)
  const estabilidad = calculateStabilityScore(input.monthlyRows)
  return [
    {
      id: 'rentabilidad',
      label: 'Índice de rentabilidad',
      score: rentabilidad,
      insight: `Margen actual: ${formatPercent(input.marginPct)}`,
      formula: 'Puntuación = margen % (ajustado a escala 0-100).',
    },
    {
      id: 'control_gasto',
      label: 'Índice de control de gasto',
      score: controlGasto,
      insight: `Peso de gasto: ${formatPercent(input.expenseRatioPct)}`,
      formula: 'Puntuación = 100 - peso de gasto sobre volumen total.',
    },
    {
      id: 'digital',
      label: 'Índice de eficiencia digital',
      score: digital,
      insight: `Cobro/Pago digital: ${formatPercent(input.digitalSharePct)}`,
      formula: 'Puntuación = % de tarjeta + transferencia.',
    },
    {
      id: 'estabilidad',
      label: 'Índice de estabilidad mensual',
      score: estabilidad,
      insight: 'Variación del beneficio entre meses',
      formula: 'Puntuación basada en desviación del beneficio mensual.',
    },
  ]
}

function formatNumberEs2(value: number) {
  return NUMBER_2.format(value)
}

function parseAmountEs(raw: string) {
  const compact = raw.trim().replace(/\s/g, '')
  if (!compact) {
    return Number.NaN
  }

  if (compact.includes(',')) {
    return Number(compact.replace(/\./g, '').replace(',', '.'))
  }

  if (/^\d{1,3}(\.\d{3})+$/.test(compact)) {
    return Number(compact.replace(/\./g, ''))
  }

  return Number(compact)
}

function parseIntEs(raw: string) {
  const compact = raw.trim().replace(/\./g, '').replace(',', '.')
  if (!compact) {
    return 0
  }
  const parsed = Number.parseFloat(compact)
  if (!Number.isFinite(parsed)) {
    return 0
  }
  return Math.max(0, Math.round(parsed))
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function repairMojibakeText(input: string) {
  const value = String(input || '')
  if (!/[ÃÂâ�]/.test(value)) {
    return value
  }

  try {
    const bytes = new Uint8Array(Array.from(value).map((char) => char.charCodeAt(0)))
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    if (decoded && !/[ÃÂâ�]/.test(decoded)) {
      return decoded
    }
  } catch {
    // noop
  }

  return value
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/â€œ|â€/g, '"')
    .replace(/â€™/g, "'")
}

function cleanUiText(value: unknown, fallback = '') {
  if (typeof value !== 'string') {
    return fallback
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return fallback
  }
  return repairMojibakeText(trimmed)
}

function isVatType(value: unknown): value is VatType {
  return (
    value === 'EXENTO' ||
    value === 'IVA_4' ||
    value === 'IVA_10' ||
    value === 'IVA_21'
  )
}

function getVatRate(vatType: VatType) {
  return VAT_OPTIONS.find((option) => option.type === vatType)?.rate ?? 0
}

function getVatLabel(vatType: VatType | undefined) {
  return VAT_OPTIONS.find((option) => option.type === vatType)?.label ?? 'Exento (0%)'
}

function normalizeLedgerEntry(entry: Partial<LedgerEntry>) {
  if (
    typeof entry?.id !== 'string' ||
    typeof entry?.date !== 'string' ||
    typeof entry?.event !== 'string' ||
    typeof entry?.concept !== 'string' ||
    typeof entry?.category !== 'string' ||
    (entry?.movementType !== 'INGRESO' && entry?.movementType !== 'GASTO') ||
    (entry?.paymentMethod !== 'TARJETA' &&
      entry?.paymentMethod !== 'EFECTIVO' &&
      entry?.paymentMethod !== 'TRANSFERENCIA') ||
    typeof entry?.amount !== 'number' ||
    typeof entry?.notes !== 'string'
  ) {
    return null
  }

  const vatType = isVatType(entry.vatType) ? entry.vatType : 'EXENTO'
  const vatRate =
    typeof entry.vatRate === 'number' ? entry.vatRate : getVatRate(vatType)
  const withholdingRate =
    typeof entry.withholdingRate === 'number' ? entry.withholdingRate : 0

  const baseAmount =
    typeof entry.baseAmount === 'number' ? entry.baseAmount : entry.amount
  const vatAmount =
    typeof entry.vatAmount === 'number'
      ? entry.vatAmount
      : roundMoney(baseAmount * (vatRate / 100))
  const withholdingAmount =
    typeof entry.withholdingAmount === 'number'
      ? entry.withholdingAmount
      : roundMoney(baseAmount * (withholdingRate / 100))

  const hasTaxFields =
    typeof entry.baseAmount === 'number' ||
    typeof entry.vatAmount === 'number' ||
    typeof entry.withholdingAmount === 'number' ||
    typeof entry.vatRate === 'number' ||
    typeof entry.withholdingRate === 'number'

  const amount = hasTaxFields
    ? roundMoney(baseAmount + vatAmount - withholdingAmount)
    : entry.amount

  const eventName = cleanUiText(entry.event)
  const concept = cleanUiText(entry.concept)
  const category = cleanUiText(entry.category)
  const notes = cleanUiText(entry.notes, '')
  const genre = cleanUiText(entry.genre, 'General')
  const promoter = cleanUiText(entry.promoter, 'Bella Bestia')
  const venueSpace = cleanUiText(entry.venueSpace, 'Sala principal')
  const zoneSection = cleanUiText(entry.zoneSection, 'General')
  const ticketType = cleanUiText(entry.ticketType, 'General')
  const channel = cleanUiText(entry.channel, 'Directo')
  const source = cleanUiText(entry.source, 'Directo')
  const medium = cleanUiText(entry.medium, 'Orgánico')
  const campaign = cleanUiText(entry.campaign, 'Sin campaña')
  const artist = cleanUiText(entry.artist, eventName || 'Evento')
  const eventType = cleanUiText(entry.eventType)
  const eventTimeSlot = cleanUiText(entry.eventTimeSlot)

  return {
    ...entry,
    event: eventName || 'Evento sin nombre',
    concept: concept || 'Línea sin concepto',
    category: category || (entry.movementType === 'INGRESO' ? 'Taquilla' : 'Otros'),
    notes,
    amount,
    baseAmount,
    vatType,
    vatRate,
    vatAmount,
    withholdingRate,
    withholdingAmount,
    purchaseDate:
      typeof entry.purchaseDate === 'string' && entry.purchaseDate
        ? entry.purchaseDate
        : entry.date,
    eventDateTime:
      typeof entry.eventDateTime === 'string' && entry.eventDateTime
        ? entry.eventDateTime
        : `${entry.date}T22:00:00`,
    eventType,
    eventTimeSlot,
    eventStatus:
      entry.eventStatus === 'PROGRAMADO' ||
      entry.eventStatus === 'EN_CURSO' ||
      entry.eventStatus === 'FINALIZADO' ||
      entry.eventStatus === 'CANCELADO' ||
      entry.eventStatus === 'APLAZADO'
        ? entry.eventStatus
        : inferEventStatus(
            typeof entry.eventDateTime === 'string' && entry.eventDateTime
              ? entry.eventDateTime
              : `${entry.date}T22:00:00`,
          ),
    artist,
    genre,
    promoter,
    venueSpace,
    zoneSection,
    ticketType,
    channel,
    source,
    medium,
    campaign,
    customerSegment:
      entry.customerSegment === 'NUEVO' || entry.customerSegment === 'RECURRENTE'
        ? entry.customerSegment
        : 'NUEVO',
    ticketCount:
      typeof entry.ticketCount === 'number'
        ? entry.ticketCount
        : entry.movementType === 'INGRESO'
          ? Math.max(1, Math.round(amount / 18))
          : 0,
    ticketCompCount: typeof entry.ticketCompCount === 'number' ? entry.ticketCompCount : 0,
    ticketRefundCount: typeof entry.ticketRefundCount === 'number' ? entry.ticketRefundCount : 0,
    scannedCount:
      typeof entry.scannedCount === 'number'
        ? entry.scannedCount
        : entry.movementType === 'INGRESO'
          ? Math.max(0, Math.round((Math.max(1, Math.round(amount / 18)) * 0.86)))
          : 0,
    discountAmount: typeof entry.discountAmount === 'number' ? entry.discountAmount : 0,
    feeAssumedAmount: typeof entry.feeAssumedAmount === 'number' ? entry.feeAssumedAmount : 0,
    directCostAmount:
      typeof entry.directCostAmount === 'number'
        ? entry.directCostAmount
        : entry.movementType === 'GASTO'
          ? amount
          : 0,
    waitlistCount: typeof entry.waitlistCount === 'number' ? entry.waitlistCount : 0,
    totalCapacity:
      typeof entry.totalCapacity === 'number'
        ? entry.totalCapacity
        : Math.max(300, Math.round((Math.max(1, Math.round(amount / 18)) * 2.8))),
    releasedCapacity:
      typeof entry.releasedCapacity === 'number'
        ? entry.releasedCapacity
        : Math.max(300, Math.round((Math.max(1, Math.round(amount / 18)) * 2.6))),
    sellableCapacity:
      typeof entry.sellableCapacity === 'number'
        ? entry.sellableCapacity
        : Math.max(280, Math.round((Math.max(1, Math.round(amount / 18)) * 2.5))),
    slotsAvailable: typeof entry.slotsAvailable === 'number' ? entry.slotsAvailable : 30,
    slotsOccupied:
      typeof entry.slotsOccupied === 'number'
        ? entry.slotsOccupied
        : entry.movementType === 'INGRESO'
          ? 1
          : 0,
  } as LedgerEntry
}

function sanitizeLedgerEntries(rawEntries: unknown) {
  if (!Array.isArray(rawEntries)) {
    return []
  }
  return rawEntries
    .map((entry) => normalizeLedgerEntry(entry as Partial<LedgerEntry>))
    .filter((entry): entry is LedgerEntry => entry !== null)
}

function escapeCsvCell(value: string | number) {
  const normalized = String(value).replace(/"/g, '""')
  return `"${normalized}"`
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function buildExportRows(entries: LedgerEntry[]): ExportRow[] {
  return [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((entry) => ({
      Fecha: formatDate(entry.date),
      FechaCompra: formatDate(entry.purchaseDate || entry.date),
      FechaEvento: formatDateTime(getEntryEventDateTime(entry)),
      Evento: entry.event,
      TipoEvento: entry.eventType || '',
      FranjaHoraria: entry.eventTimeSlot || '',
      EstadoEvento: entry.eventStatus || inferEventStatus(getEntryEventDateTime(entry)),
      Artista: entry.artist || entry.event,
      Genero: entry.genre || 'General',
      Promotor: entry.promoter || 'Bella Bestia',
      SalaEspacio: entry.venueSpace || 'Sala principal',
      ZonaSeccion: entry.zoneSection || 'General',
      TipoTicket: entry.ticketType || 'General',
      Tipo: entry.movementType,
      'Método': entry.paymentMethod,
      Channel: entry.channel || 'Directo',
      Source: entry.source || 'Directo',
      Medium: entry.medium || 'Orgánico',
      Campaign: entry.campaign || 'Sin campaña',
      SegmentoCliente: entry.customerSegment || 'NUEVO',
      'Categoría': entry.category,
      Concepto: entry.concept,
      TicketsPagados: formatNumberEs2(entry.ticketCount ?? 0),
      TicketsCortesia: formatNumberEs2(entry.ticketCompCount ?? 0),
      TicketsDevueltos: formatNumberEs2(entry.ticketRefundCount ?? 0),
      TicketsEscaneados: formatNumberEs2(entry.scannedCount ?? 0),
      BaseImponibleEUR: formatNumberEs2(entry.baseAmount ?? entry.amount),
      TipoIVA: getVatLabel(entry.vatType),
      CuotaIVAEUR: formatNumberEs2(entry.vatAmount ?? 0),
      RetencionPct: formatPercent(entry.withholdingRate ?? 0),
      RetencionEUR: formatNumberEs2(entry.withholdingAmount ?? 0),
      DescuentoEUR: formatNumberEs2(entry.discountAmount ?? 0),
      FeeAsumidaEUR: formatNumberEs2(entry.feeAssumedAmount ?? 0),
      Waitlist: formatNumberEs2(entry.waitlistCount ?? 0),
      TotalLineaEUR: formatNumberEs2(entry.amount),
      Notas: entry.notes,
    }))
}

function entriesByScope(entries: LedgerEntry[], scope: ExportScope) {
  if (scope === 'ingresos') {
    return entries.filter((entry) => entry.movementType === 'INGRESO')
  }
  if (scope === 'gastos') {
    return entries.filter((entry) => entry.movementType === 'GASTO')
  }
  return entries
}

function exportEntriesToCsv(entries: LedgerEntry[], scope: ExportScope = 'combinado') {
  const scopedEntries = entriesByScope(entries, scope)
  const rows = buildExportRows(scopedEntries)
  const headers: (keyof ExportRow)[] = [
    'Fecha',
    'FechaCompra',
    'FechaEvento',
    'Evento',
    'EstadoEvento',
    'Artista',
    'Genero',
    'Promotor',
    'SalaEspacio',
    'ZonaSeccion',
    'TipoTicket',
    'Tipo',
    'Método',
    'Channel',
    'Source',
    'Medium',
    'Campaign',
    'SegmentoCliente',
    'Categoría',
    'Concepto',
    'TicketsPagados',
    'TicketsCortesia',
    'TicketsDevueltos',
    'TicketsEscaneados',
    'BaseImponibleEUR',
    'TipoIVA',
    'CuotaIVAEUR',
    'RetencionPct',
    'RetencionEUR',
    'DescuentoEUR',
    'FeeAsumidaEUR',
    'Waitlist',
    'TotalLineaEUR',
    'Notas',
  ]

  const lines = rows.map((row) =>
    headers.map((header) => escapeCsvCell(row[header])).join(';'),
  )
  const content = `\uFEFF${headers.join(';')}\n${lines.join('\n')}`
  const label =
    scope === 'ingresos' ? 'ingresos' : scope === 'gastos' ? 'gastos' : 'combinado'
  downloadTextFile(
    `bella-bestia-${label}-${getFileStamp()}.csv`,
    content,
    'text/csv;charset=utf-8;',
  )
}

function exportEntriesToExcel(entries: LedgerEntry[]) {
  const rows = buildExportRows(entries)
  const headers: (keyof ExportRow)[] = [
    'Fecha',
    'FechaCompra',
    'FechaEvento',
    'Evento',
    'EstadoEvento',
    'Artista',
    'Genero',
    'Promotor',
    'SalaEspacio',
    'ZonaSeccion',
    'TipoTicket',
    'Tipo',
    'Método',
    'Channel',
    'Source',
    'Medium',
    'Campaign',
    'SegmentoCliente',
    'Categoría',
    'Concepto',
    'TicketsPagados',
    'TicketsCortesia',
    'TicketsDevueltos',
    'TicketsEscaneados',
    'BaseImponibleEUR',
    'TipoIVA',
    'CuotaIVAEUR',
    'RetencionPct',
    'RetencionEUR',
    'DescuentoEUR',
    'FeeAsumidaEUR',
    'Waitlist',
    'TotalLineaEUR',
    'Notas',
  ]

  const headerHtml = headers.map((header) => `<th>${header}</th>`).join('')
  const bodyHtml = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td>${String(row[header]).replace(/</g, '&lt;')}</td>`)
          .join('')}</tr>`,
    )
    .join('')

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
    </head>
    <body>
      <table border="1">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </body>
  </html>`

  downloadTextFile(
    `bella-bestia-movimientos-${getFileStamp()}.xls`,
    `\uFEFF${html}`,
    'application/vnd.ms-excel;charset=utf-8;',
  )
}

function exportEntriesToJson(entries: LedgerEntry[]) {
  downloadTextFile(
    `bella-bestia-backup-${getFileStamp()}.json`,
    JSON.stringify(entries, null, 2),
    'application/json;charset=utf-8;',
  )
}

function buildReportSummaryRows(entries: LedgerEntry[], mode: ReportMode): ReportSummaryRow[] {
  const rows = aggregateRows(entries, mode)
  const movementCounter = entries.reduce<Record<string, number>>((acc, entry) => {
    const bucket = mode === 'semana' ? getWeekLabel(entry.date) : getMonthLabel(entry.date)
    acc[bucket] = (acc[bucket] ?? 0) + 1
    return acc
  }, {})

  return rows.map((row) => ({
    'Período': row.key,
    Movimientos: movementCounter[row.key] ?? 0,
    IngresosEUR: formatNumberEs2(row.ingresos),
    GastosEUR: formatNumberEs2(row.gastos),
    BeneficioEUR: formatNumberEs2(row.beneficio),
    MargenPct: formatPercent(row.margen),
  }))
}

function exportReportSummaryToCsv(entries: LedgerEntry[], mode: ReportMode) {
  const rows = buildReportSummaryRows(entries, mode)
  const headers: (keyof ReportSummaryRow)[] = [
    'Período',
    'Movimientos',
    'IngresosEUR',
    'GastosEUR',
    'BeneficioEUR',
    'MargenPct',
  ]

  const lines = rows.map((row) =>
    headers.map((header) => escapeCsvCell(row[header])).join(';'),
  )
  const content = `\uFEFF${headers.join(';')}\n${lines.join('\n')}`
  const modeLabel = mode === 'semana' ? 'semanal' : 'mensual'

  downloadTextFile(
    `bella-bestia-informe-${modeLabel}-${getFileStamp()}.csv`,
    content,
    'text/csv;charset=utf-8;',
  )
}

function exportReportSummaryToExcel(entries: LedgerEntry[], mode: ReportMode) {
  const rows = buildReportSummaryRows(entries, mode)
  const headers: (keyof ReportSummaryRow)[] = [
    'Período',
    'Movimientos',
    'IngresosEUR',
    'GastosEUR',
    'BeneficioEUR',
    'MargenPct',
  ]

  const headerHtml = headers.map((header) => `<th>${header}</th>`).join('')
  const bodyHtml = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td>${String(row[header]).replace(/</g, '&lt;')}</td>`)
          .join('')}</tr>`,
    )
    .join('')

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
    </head>
    <body>
      <table border="1">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </body>
  </html>`

  const modeLabel = mode === 'semana' ? 'semanal' : 'mensual'
  downloadTextFile(
    `bella-bestia-informe-${modeLabel}-${getFileStamp()}.xls`,
    `\uFEFF${html}`,
    'application/vnd.ms-excel;charset=utf-8;',
  )
}

function exportReportToJson(params: {
  entries: LedgerEntry[]
  mode: ReportMode
  scope: AnalysisScope
  dateFrom: string
  dateTo: string
  preset: ReportRangePreset
}) {
  const { entries, mode, scope, dateFrom, dateTo, preset } = params
  const modeLabel = mode === 'semana' ? 'semanal' : 'mensual'
  const payload = {
    sala: 'Bella Bestia',
    informe: modeLabel,
    alcance: ANALYSIS_SCOPE_LABEL[scope],
    periodo: {
      preset,
      desde: dateFrom,
      hasta: dateTo,
    },
    generadoEn: new Date().toLocaleString('es-ES'),
    resumen: buildReportSummaryRows(entries, mode),
    detalle: buildExportRows(entries),
  }

  downloadTextFile(
    `bella-bestia-informe-${modeLabel}-${getFileStamp()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8;',
  )
}

function exportObjectRowsToCsv(
  filenamePrefix: string,
  rows: Array<Record<string, string | number>>,
) {
  if (rows.length === 0) {
    return
  }
  const headers = Object.keys(rows[0])
  const lines = rows.map((row) =>
    headers.map((header) => escapeCsvCell(row[header] ?? '')).join(';'),
  )
  const content = `\uFEFF${headers.join(';')}\n${lines.join('\n')}`
  downloadTextFile(
    `${filenamePrefix}-${getFileStamp()}.csv`,
    content,
    'text/csv;charset=utf-8;',
  )
}

function getTodayISODate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftISODate(dateInput: string, days: number) {
  const date = new Date(`${dateInput}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

function getMonthStartISODate(dateInput = getTodayISODate()) {
  const [year, month] = dateInput.split('-')
  return `${year}-${month}-01`
}

function getYearStartISODate(dateInput = getTodayISODate()) {
  const [year] = dateInput.split('-')
  return `${year}-01-01`
}

function getPreviousYearRange(dateInput = getTodayISODate()) {
  const [yearRaw] = dateInput.split('-')
  const year = Number(yearRaw) - 1
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  }
}

function getQuarterStartISODate(dateInput = getTodayISODate()) {
  const [year, monthRaw] = dateInput.split('-')
  const month = Number(monthRaw)
  const quarterStart = Math.floor((month - 1) / 3) * 3 + 1
  return `${year}-${String(quarterStart).padStart(2, '0')}-01`
}

function getWeekStartISODate(dateInput = getTodayISODate()) {
  const date = new Date(`${dateInput}T00:00:00`)
  const day = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - day)
  return toISODate(date)
}

function getRangeByPreset(preset: DiaryRangePreset) {
  const today = getTodayISODate()
  if (preset === 'hoy') {
    return { from: today, to: today }
  }
  if (preset === '7dias') {
    return { from: shiftISODate(today, -6), to: today }
  }
  if (preset === 'mes') {
    return { from: getMonthStartISODate(today), to: today }
  }
  if (preset === 'ano') {
    return { from: getYearStartISODate(today), to: today }
  }
  return { from: '', to: '' }
}

function getAnalysisRangeByPreset(preset: AnalysisRangePreset) {
  const today = getTodayISODate()
  if (preset === 'semana') {
    return { from: getWeekStartISODate(today), to: today }
  }
  if (preset === 'mes') {
    return { from: getMonthStartISODate(today), to: today }
  }
  if (preset === 'trimestre') {
    return { from: getQuarterStartISODate(today), to: today }
  }
  if (preset === 'ano') {
    return { from: getYearStartISODate(today), to: today }
  }
  if (preset === 'ano_anterior') {
    return getPreviousYearRange(today)
  }
  return { from: '', to: '' }
}

function getReportRangeByPreset(preset: ReportRangePreset) {
  const today = getTodayISODate()
  if (preset === 'semana') {
    return { from: getWeekStartISODate(today), to: today }
  }
  if (preset === 'mes') {
    return { from: getMonthStartISODate(today), to: today }
  }
  if (preset === 'trimestre') {
    return { from: getQuarterStartISODate(today), to: today }
  }
  if (preset === 'ano') {
    return { from: getYearStartISODate(today), to: today }
  }
  if (preset === 'ano_anterior') {
    return getPreviousYearRange(today)
  }
  return { from: '', to: '' }
}

function getDaysRange(from: string, to: string) {
  if (!from || !to) {
    return null
  }
  const fromDate = new Date(`${from}T00:00:00`)
  const toDate = new Date(`${to}T00:00:00`)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return null
  }
  const diffMs = Math.abs(toDate.getTime() - fromDate.getTime())
  return Math.floor(diffMs / 86400000) + 1
}

function resolveAnalysisViewModeFromPreset(preset: AnalysisRangePreset): ViewMode {
  if (preset === 'semana') {
    return 'semana'
  }
  if (preset === 'mes') {
    return 'evento'
  }
  if (preset === 'custom') {
    return 'mes'
  }
  return 'mes'
}

function resolveAnalysisViewModeFromCustomRange(from: string, to: string): ViewMode {
  const days = getDaysRange(from, to)
  if (days === null) {
    return 'mes'
  }
  if (days <= 31) {
    return 'evento'
  }
  if (days <= 90) {
    return 'semana'
  }
  return 'mes'
}

function shiftISOMonths(dateInput: string, months: number) {
  const date = new Date(`${dateInput}T00:00:00`)
  date.setMonth(date.getMonth() + months)
  return toISODate(date)
}

function getEventsRangeByPreset(preset: EventsRangePreset) {
  const today = getTodayISODate()
  if (preset === 'semana') {
    return { from: getWeekStartISODate(today), to: today }
  }
  if (preset === 'mes') {
    return { from: getMonthStartISODate(today), to: today }
  }
  if (preset === '3m') {
    return { from: shiftISOMonths(getMonthStartISODate(today), -2), to: today }
  }
  if (preset === '6m') {
    return { from: shiftISOMonths(getMonthStartISODate(today), -5), to: today }
  }
  if (preset === '12m') {
    return { from: shiftISOMonths(getMonthStartISODate(today), -11), to: today }
  }
  return { from: '', to: '' }
}

function buildDefaultAnalyticsFilters(): AnalyticsFilters {
  const today = getTodayISODate()
  return {
    dateFrom: getYearStartISODate(today),
    dateTo: today,
    granularity: 'semana',
    temporalAxis: 'fecha_compra',
    eventStatus: 'TODOS',
    artist: 'TODOS',
    genre: 'TODOS',
    promoter: 'TODOS',
    venueSpace: 'TODOS',
    zoneSection: 'TODOS',
    ticketType: 'TODOS',
    channel: 'TODOS',
    source: 'TODOS',
    medium: 'TODOS',
    campaign: 'TODOS',
  }
}

function sanitizeAnalyticsFilters(raw: Partial<AnalyticsFilters>): AnalyticsFilters {
  const base = buildDefaultAnalyticsFilters()
  return {
    ...base,
    ...raw,
    dateFrom: typeof raw.dateFrom === 'string' ? raw.dateFrom : base.dateFrom,
    dateTo: typeof raw.dateTo === 'string' ? raw.dateTo : base.dateTo,
    granularity:
      raw.granularity === 'evento' || raw.granularity === 'semana' || raw.granularity === 'mes'
        ? raw.granularity
        : base.granularity,
    temporalAxis:
      raw.temporalAxis === 'fecha_compra' || raw.temporalAxis === 'fecha_evento'
        ? raw.temporalAxis
        : base.temporalAxis,
  }
}

function getMonthLabel(dateInput: string) {
  const [year, month] = dateInput.split('-')
  return `${year}-${month}`
}

function getWeekLabel(dateInput: string) {
  const date = new Date(`${dateInput}T00:00:00`)
  const day = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - day + 3)

  const isoYear = date.getFullYear()
  const firstThursday = new Date(isoYear, 0, 4)
  const firstDay = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3)

  const diff = date.getTime() - firstThursday.getTime()
  const week = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000))
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

function parseISODateSafe(dateInput?: string | null) {
  if (!dateInput) {
    return null
  }
  const parsed = new Date(`${dateInput}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

function getMonthStartFromISODate(dateInput: string) {
  const parsed = parseISODateSafe(dateInput)
  if (!parsed) {
    return null
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1)
}

function getWeekStartFromISODate(dateInput: string) {
  const parsed = parseISODateSafe(dateInput)
  if (!parsed) {
    return null
  }
  const day = (parsed.getDay() + 6) % 7
  parsed.setDate(parsed.getDate() - day)
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

function parseMonthKeyToDate(key: string) {
  const match = key.match(/^(\d{4})-(\d{2})$/)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }
  return new Date(year, month - 1, 1)
}

function parseWeekKeyToDate(key: string) {
  const match = key.match(/^(\d{4})-W(\d{2})$/)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const week = Number(match[2])
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) {
    return null
  }

  const jan4 = new Date(year, 0, 4)
  const jan4Day = (jan4.getDay() + 6) % 7
  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - jan4Day)

  const result = new Date(week1Monday)
  result.setDate(week1Monday.getDate() + (week - 1) * 7)
  result.setHours(0, 0, 0, 0)
  return result
}

function buildChartLabelsFromRange(
  granularity: Extract<ChartGranularity, 'mes' | 'semana'>,
  fromDate: Date,
  toDate: Date,
) {
  const labels: string[] = []
  const cursor = new Date(fromDate)
  const end = new Date(toDate)

  if (granularity === 'mes') {
    while (cursor <= end) {
      labels.push(getMonthLabel(toISODate(cursor)))
      cursor.setMonth(cursor.getMonth() + 1)
    }
  } else {
    while (cursor <= end) {
      labels.push(getWeekLabel(toISODate(cursor)))
      cursor.setDate(cursor.getDate() + 7)
    }
  }

  return labels
}

function inferPeriodRangeFromRows(
  rows: AggregatedRow[],
  granularity: Extract<ChartGranularity, 'mes' | 'semana'>,
) {
  if (rows.length === 0) {
    return null
  }

  const sortedRows = [...rows].sort((a, b) => a.key.localeCompare(b.key))
  if (granularity === 'mes') {
    const fromDate = parseMonthKeyToDate(sortedRows[0].key)
    const toDate = parseMonthKeyToDate(sortedRows[sortedRows.length - 1].key)
    if (!fromDate || !toDate) {
      return null
    }
    return { fromDate, toDate }
  }

  const fromDate = parseWeekKeyToDate(sortedRows[0].key)
  const toDate = parseWeekKeyToDate(sortedRows[sortedRows.length - 1].key)
  if (!fromDate || !toDate) {
    return null
  }
  return { fromDate, toDate }
}

function getBucket(entry: LedgerEntry, mode: ViewMode) {
  if (mode === 'evento') {
    return entry.event
  }
  if (mode === 'semana') {
    return getWeekLabel(entry.date)
  }
  return getMonthLabel(entry.date)
}

function getAnalyticsBucket(
  entry: LedgerEntry,
  granularity: AnalyticsGranularity,
  axis: TemporalAxis,
) {
  if (granularity === 'evento') {
    return entry.event
  }
  const axisDate = getEntryAxisDate(entry, axis)
  return granularity === 'semana'
    ? getWeekLabel(axisDate)
    : getMonthLabel(axisDate)
}

function formatDate(dateInput: string) {
  const [year, month, day] = dateInput.split('-')
  return `${day}/${month}/${year}`
}

function formatDateTime(dateTimeInput: string) {
  const parsed = new Date(dateTimeInput)
  if (Number.isNaN(parsed.getTime())) {
    return dateTimeInput
  }
  return parsed.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getIsoDateFromDateTime(dateTimeInput: string) {
  const parsed = new Date(dateTimeInput)
  if (Number.isNaN(parsed.getTime())) {
    return dateTimeInput.slice(0, 10)
  }
  return toISODate(parsed)
}

function addDaysISO(dateInput: string, days: number) {
  const parsed = new Date(`${dateInput}T00:00:00`)
  parsed.setDate(parsed.getDate() + days)
  return toISODate(parsed)
}

function diffDays(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00`)
  const to = new Date(`${toDate}T00:00:00`)
  const diff = to.getTime() - from.getTime()
  return Math.round(diff / (24 * 60 * 60 * 1000))
}

function previousRange(fromDate: string, toDate: string) {
  const totalDays = Math.max(1, diffDays(fromDate, toDate) + 1)
  const prevTo = addDaysISO(fromDate, -1)
  const prevFrom = addDaysISO(prevTo, -(totalDays - 1))
  return { from: prevFrom, to: prevTo }
}

function yearAgoRange(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00`)
  const to = new Date(`${toDate}T00:00:00`)
  from.setFullYear(from.getFullYear() - 1)
  to.setFullYear(to.getFullYear() - 1)
  return { from: toISODate(from), to: toISODate(to) }
}

function getEntryAxisDate(entry: LedgerEntry, axis: TemporalAxis) {
  if (axis === 'fecha_evento') {
    const raw = entry.eventDateTime || entry.date
    return raw.includes('T') ? raw.slice(0, 10) : raw
  }
  return entry.purchaseDate || entry.date
}

function getEntryEventDateTime(entry: LedgerEntry) {
  if (entry.eventDateTime) {
    return entry.eventDateTime
  }
  return `${entry.date}T22:00:00`
}

function inferEventStatus(eventDateTime: string): EventStatus {
  const now = new Date()
  const eventDate = new Date(eventDateTime)
  if (Number.isNaN(eventDate.getTime())) {
    return 'PROGRAMADO'
  }
  const hoursDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursDiff > 12) {
    return 'PROGRAMADO'
  }
  if (hoursDiff >= -8 && hoursDiff <= 12) {
    return 'EN_CURSO'
  }
  return 'FINALIZADO'
}

function computeDeltaPct(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) {
      return 0
    }
    return current > 0 ? 100 : -100
  }
  return ((current - previous) / Math.abs(previous)) * 100
}

function formatDelta(current: number, previous: number) {
  const delta = computeDeltaPct(current, previous)
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${NUMBER_1.format(delta)}%`
}

function getSafeRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0
  }
  return numerator / denominator
}

function sortUnique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' }),
  )
}

function filterEntriesByAnalytics(
  entries: LedgerEntry[],
  filters: AnalyticsFilters,
  fromDate = filters.dateFrom,
  toDate = filters.dateTo,
) {
  return entries.filter((entry) => {
    const axisDate = getEntryAxisDate(entry, filters.temporalAxis)
    if (axisDate < fromDate || axisDate > toDate) {
      return false
    }

    if (filters.eventStatus !== 'TODOS' && (entry.eventStatus || inferEventStatus(getEntryEventDateTime(entry))) !== filters.eventStatus) {
      return false
    }
    if (filters.artist !== 'TODOS' && (entry.artist || entry.event) !== filters.artist) {
      return false
    }
    if (filters.genre !== 'TODOS' && (entry.genre || 'General') !== filters.genre) {
      return false
    }
    if (filters.promoter !== 'TODOS' && (entry.promoter || 'Bella Bestia') !== filters.promoter) {
      return false
    }
    if (filters.venueSpace !== 'TODOS' && (entry.venueSpace || 'Sala principal') !== filters.venueSpace) {
      return false
    }
    if (filters.zoneSection !== 'TODOS' && (entry.zoneSection || 'General') !== filters.zoneSection) {
      return false
    }
    if (filters.ticketType !== 'TODOS' && (entry.ticketType || 'General') !== filters.ticketType) {
      return false
    }
    if (filters.channel !== 'TODOS' && (entry.channel || 'Directo') !== filters.channel) {
      return false
    }
    if (filters.source !== 'TODOS' && (entry.source || 'Directo') !== filters.source) {
      return false
    }
    if (filters.medium !== 'TODOS' && (entry.medium || 'Orgánico') !== filters.medium) {
      return false
    }
    if (filters.campaign !== 'TODOS' && (entry.campaign || 'Sin campaña') !== filters.campaign) {
      return false
    }
    return true
  })
}

function aggregateRows(entries: LedgerEntry[], mode: ViewMode) {
  const grouped = new Map<string, { ingresos: number; gastos: number }>()

  entries.forEach((entry) => {
    const key = getBucket(entry, mode)
    const current = grouped.get(key) ?? { ingresos: 0, gastos: 0 }

    if (entry.movementType === 'INGRESO') {
      current.ingresos += entry.amount
    } else {
      current.gastos += entry.amount
    }
    grouped.set(key, current)
  })

  return Array.from(grouped.entries())
    .map(([key, value]) => {
      const beneficio = value.ingresos - value.gastos
      return {
        key,
        ingresos: value.ingresos,
        gastos: value.gastos,
        beneficio,
        margen: value.ingresos > 0 ? (beneficio / value.ingresos) * 100 : 0,
      }
    })
    .sort((a, b) => b.key.localeCompare(a.key))
}

function aggregateRowsByCustomKey(
  entries: LedgerEntry[],
  keyBuilder: (entry: LedgerEntry) => string,
) {
  const grouped = new Map<string, { ingresos: number; gastos: number }>()

  entries.forEach((entry) => {
    const key = cleanUiText(keyBuilder(entry), 'Sin dato')
    const current = grouped.get(key) ?? { ingresos: 0, gastos: 0 }
    if (entry.movementType === 'INGRESO') {
      current.ingresos += entry.amount
    } else {
      current.gastos += entry.amount
    }
    grouped.set(key, current)
  })

  return Array.from(grouped.entries())
    .map(([key, value]) => {
      const beneficio = value.ingresos - value.gastos
      return {
        key,
        ingresos: value.ingresos,
        gastos: value.gastos,
        beneficio,
        margen: value.ingresos > 0 ? (beneficio / value.ingresos) * 100 : 0,
      }
    })
    .sort((a, b) => {
      if (b.beneficio !== a.beneficio) {
        return b.beneficio - a.beneficio
      }
      return b.ingresos - a.ingresos
    })
}

function aggregateAnalyticsRows(
  entries: LedgerEntry[],
  granularity: AnalyticsGranularity,
  axis: TemporalAxis,
) {
  const grouped = new Map<string, { ingresos: number; gastos: number }>()

  entries.forEach((entry) => {
    const key = getAnalyticsBucket(entry, granularity, axis)
    const current = grouped.get(key) ?? { ingresos: 0, gastos: 0 }
    if (entry.movementType === 'INGRESO') {
      current.ingresos += entry.amount
    } else {
      current.gastos += entry.amount
    }
    grouped.set(key, current)
  })

  return Array.from(grouped.entries())
    .map(([key, value]) => {
      const beneficio = value.ingresos - value.gastos
      return {
        key,
        ingresos: value.ingresos,
        gastos: value.gastos,
        beneficio,
        margen: value.ingresos > 0 ? (beneficio / value.ingresos) * 100 : 0,
      }
    })
    .sort((a, b) => b.key.localeCompare(a.key))
}

function getMetricValue(row: AggregatedRow, metric: MetricKey) {
  if (metric === 'ingresos') {
    return row.ingresos
  }
  if (metric === 'gastos') {
    return row.gastos
  }
  return row.beneficio
}

function buildAuditFindings(
  entries: LedgerEntry[],
  totals: {
    ingresos: number
    gastos: number
    beneficio: number
    efectivo: number
  },
  byEvent: AggregatedRow[],
) {
  const findings: AuditFinding[] = []

  if (totals.ingresos <= 0) {
    findings.push({
      id: 'without-income',
      severity: 'ALTA',
      title: 'No hay ingresos registrados',
      detail: 'El período filtrado tiene ingresos en cero.',
      action: 'Revisar carga de taquilla, barra y patrocinios.',
    })
  }

  if (totals.ingresos > 0) {
    const expenseRatio = totals.gastos / totals.ingresos
    if (expenseRatio > 0.85) {
      findings.push({
        id: 'expense-ratio-high',
        severity: 'ALTA',
        title: 'Ratio de gasto muy alto',
        detail: `Los gastos representan ${formatPercent(expenseRatio * 100)} de los ingresos.`,
        action: 'Revisar caché, personal y marketing del período.',
      })
    } else if (expenseRatio > 0.7) {
      findings.push({
        id: 'expense-ratio-medium',
        severity: 'MEDIA',
        title: 'Ratio de gasto en zona de riesgo',
        detail: `Los gastos representan ${formatPercent(expenseRatio * 100)} de los ingresos.`,
        action: 'Ajustar partidas de coste variable en proximos eventos.',
      })
    }
  }

  if (totals.ingresos > 0) {
    const cashShare = totals.efectivo / totals.ingresos
    if (cashShare > 0.35) {
      findings.push({
        id: 'cash-share',
        severity: 'MEDIA',
        title: 'Peso alto de efectivo',
        detail: `El efectivo supone ${formatPercent(cashShare * 100)} del ingreso.`,
        action: 'Reforzar control de caja y cuadre de cierre por evento.',
      })
    }
  }

  const negativeEvents = byEvent.filter((eventRow) => eventRow.beneficio < 0)
  if (negativeEvents.length > 0) {
    findings.push({
      id: 'negative-events',
      severity: 'ALTA',
      title: 'Eventos con pérdida',
      detail: `${negativeEvents.length} evento(s) tienen beneficio negativo.`,
      action: 'Analizar precio medio, aforo y coste artístico por evento.',
    })
  }

  const highExpenses = entries.filter(
    (entry) => entry.movementType === 'GASTO' && entry.amount >= 1200,
  )
  if (highExpenses.length > 0) {
    findings.push({
      id: 'high-expense-lines',
      severity: 'MEDIA',
      title: 'Gastos altos sin aprobacion explicita',
      detail: `${highExpenses.length} línea(s) de gasto superan 1.200 EUR.`,
      action: 'Crear flujo de aprobacion para gastos extraordinarios.',
    })
  }

  const linesWithoutNotes = entries.filter((entry) => entry.notes.trim() === '')
  if (linesWithoutNotes.length > 0) {
    findings.push({
      id: 'empty-notes',
      severity: 'BAJA',
      title: 'Movimientos sin nota interna',
      detail: `${linesWithoutNotes.length} línea(s) no tienen detalle en notas.`,
      action: 'Obligar justificacion corta para mejorar trazabilidad.',
    })
  }

  const duplicateCounter = new Map<string, number>()
  entries.forEach((entry) => {
    const fingerprint = [
      entry.date,
      entry.event.toLowerCase(),
      entry.movementType,
      entry.concept.toLowerCase(),
      entry.amount.toFixed(2),
    ].join('|')
    duplicateCounter.set(fingerprint, (duplicateCounter.get(fingerprint) ?? 0) + 1)
  })
  const duplicatedLines = Array.from(duplicateCounter.values()).filter(
    (value) => value > 1,
  ).length
  if (duplicatedLines > 0) {
    findings.push({
      id: 'possible-duplicates',
      severity: 'MEDIA',
      title: 'Posibles duplicados contables',
      detail: `Se detectan ${duplicatedLines} patrón(es) de línea repetida.`,
      action: 'Comprobar si son cargos reales o asientos duplicados.',
    })
  }

  if (findings.length === 0) {
    findings.push({
      id: 'healthy',
      severity: 'BAJA',
      title: 'Sin riesgos criticos detectados',
      detail: 'La foto actual del período no muestra alertas graves.',
      action: 'Mantener cierre semanal y revision mensual.',
    })
  }

  return findings
}

function getAuditScore(findings: AuditFinding[]) {
  const penalties: Record<AuditSeverity, number> = {
    ALTA: 18,
    MEDIA: 9,
    BAJA: 4,
  }
  const rawScore = findings.reduce((score, finding) => {
    return score - penalties[finding.severity]
  }, 100)
  return Math.max(15, rawScore)
}

function sortBySeverity(findings: AuditFinding[]) {
  const order: Record<AuditSeverity, number> = {
    ALTA: 0,
    MEDIA: 1,
    BAJA: 2,
  }
  return [...findings].sort((a, b) => order[a.severity] - order[b.severity])
}

function SummaryTable({
  title,
  rows,
}: {
  title: string
  rows: AggregatedRow[]
}) {
  return (
    <article className="summary-card">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table className="summary-table">
          <thead>
            <tr>
              <th>Bloque</th>
              <th>Ingresos</th>
              <th>Gastos</th>
              <th>Beneficio</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map((row) => (
              <tr key={`${title}-${row.key}`}>
                <td>{row.key}</td>
                <td>{CURRENCY.format(row.ingresos)}</td>
                <td>{CURRENCY.format(row.gastos)}</td>
                <td className={row.beneficio >= 0 ? 'pos' : 'neg'}>
                  {CURRENCY.format(row.beneficio)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

function buildConicGradient(
  slices: { value: number; color: string }[],
  fallbackColor = '#e4e4e4',
) {
  const total = slices.reduce((acc, slice) => acc + slice.value, 0)
  if (total <= 0) {
    return `conic-gradient(${fallbackColor} 0deg 360deg)`
  }

  let current = 0
  const parts = slices.map((slice) => {
    const span = (slice.value / total) * 360
    const start = current
    const end = current + span
    current = end
    return `${slice.color} ${start}deg ${end}deg`
  })
  return `conic-gradient(${parts.join(',')})`
}

function DonutChart({
  title,
  slices,
  totalLabel,
}: {
  title: string
  totalLabel: string
  slices: { label: string; value: number; color: string }[]
}) {
  const total = slices.reduce((acc, slice) => acc + slice.value, 0)
  const gradient = buildConicGradient(slices)

  return (
    <article className="panel chart-card">
      <h3>{title}</h3>
      <p className="chart-axis-note">
        Lectura rápida: color = método, importe = euros, % = peso sobre el total.
      </p>
      <div className="donut-layout">
        <div className="donut-outer" style={{ background: gradient }}>
          <div className="donut-inner">
            <strong>{totalLabel}</strong>
            <small>{CURRENCY.format(total)}</small>
          </div>
        </div>
        <ul className="chart-legend">
          {slices.map((slice) => {
            const share = total > 0 ? (slice.value / total) * 100 : 0
            return (
                <li key={slice.label}>
                  <span style={{ background: slice.color }} />
                  <p>{slice.label}</p>
                  <strong>{formatPercent(share)}</strong>
                  <small>{CURRENCY.format(slice.value)}</small>
                </li>
              )
            })}
        </ul>
      </div>
    </article>
  )
}

function DualBarChart({
  title,
  rows,
  xAxisLabel = 'bloques',
}: {
  title: string
  rows: AggregatedRow[]
  xAxisLabel?: string
}) {
  const topRows = rows.slice(0, 6)
  const maxValue = Math.max(
    1,
    ...topRows.flatMap((row) => [row.ingresos, row.gastos]),
  )

  return (
    <article className="panel chart-card">
      <h3>{title}</h3>
      <p className="chart-axis-note">
        Bloque: {xAxisLabel} | Importe: EUR.
      </p>
      {topRows.length === 0 ? (
        <p>Sin datos para pintar barras.</p>
      ) : (
        <ul className="double-bar-list">
          {topRows.map((row) => (
            <li key={row.key}>
              <p>{row.key}</p>
              <div className="double-bar">
                <span
                  className="bar-in"
                  style={{ width: `${(row.ingresos / maxValue) * 100}%` }}
                />
                <span
                  className="bar-out"
                  style={{ width: `${(row.gastos / maxValue) * 100}%` }}
                />
              </div>
              <div className="double-values">
                <small>I: {CURRENCY.format(row.ingresos)}</small>
                <small>G: {CURRENCY.format(row.gastos)}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function getChartX(
  index: number,
  total: number,
  width: number,
  leftPad: number,
  rightPad: number,
) {
  if (total <= 1) {
    return leftPad + (width - leftPad - rightPad) / 2
  }
  return leftPad + (index * (width - leftPad - rightPad)) / (total - 1)
}

function getChartY(
  value: number,
  minValue: number,
  maxValue: number,
  height: number,
  topPad: number,
  bottomPad: number,
) {
  const range = maxValue - minValue || 1
  return height - bottomPad - ((value - minValue) / range) * (height - topPad - bottomPad)
}

function buildLinePointsByScale(
  values: number[],
  width: number,
  height: number,
  leftPad: number,
  rightPad: number,
  topPad: number,
  bottomPad: number,
  minValue: number,
  maxValue: number,
) {
  if (values.length === 0) {
    return ''
  }

  return values
    .map((value, index) => {
      const x = getChartX(index, values.length, width, leftPad, rightPad)
      const y = getChartY(value, minValue, maxValue, height, topPad, bottomPad)
      return `${x},${y}`
    })
    .join(' ')
}

function buildYAxisTicks(minValue: number, maxValue: number, steps = 5) {
  let min = minValue
  let max = maxValue

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [0]
  }

  if (min === max) {
    const delta = Math.max(1, Math.abs(min) * 0.2)
    min -= delta
    max += delta
  }

  return Array.from({ length: steps }, (_, index) => {
    const ratio = index / (steps - 1)
    return max - (max - min) * ratio
  })
}

function getXAxisTickIndexes(total: number, maxTicks = 6) {
  if (total <= 0) {
    return []
  }
  if (total <= maxTicks) {
    return Array.from({ length: total }, (_, index) => index)
  }

  const indexes = new Set<number>([0, total - 1])
  const step = Math.ceil(total / (maxTicks - 1))

  for (let index = 0; index < total; index += step) {
    indexes.add(index)
  }

  indexes.add(Math.floor(total / 2))

  return Array.from(indexes).sort((a, b) => a - b)
}

function formatAxisTickLabel(label: string, maxLength = 12) {
  if (label.length <= maxLength) {
    return label
  }
  return `${label.slice(0, maxLength - 1)}...`
}

function formatAxisMoney(value: number) {
  return `${NUMBER_0.format(value)} €`
}

function getChartPeriodLimit(period: ChartPeriodPreset, granularity: ChartGranularity = 'mes') {
  if (period === 'todo') {
    return 0
  }
  if (granularity === 'evento') {
    if (period === '3m') return 12
    if (period === '6m') return 24
    return 48
  }
  if (granularity === 'semana') {
    if (period === '3m') return 13
    if (period === '6m') return 26
    return 52
  }
  if (period === '3m') return 3
  if (period === '6m') return 6
  return 12
}

function scopeRowsByChartPeriod(
  rows: AggregatedRow[],
  period: ChartPeriodPreset,
  granularity: ChartGranularity = 'mes',
) {
  const sortedRows = [...rows].sort((a, b) => a.key.localeCompare(b.key))
  const limit = getChartPeriodLimit(period, granularity)
  return limit > 0 ? sortedRows.slice(-limit) : sortedRows
}

function scopeRowsForChart(
  rows: AggregatedRow[],
  options: {
    period: ChartPeriodPreset
    granularity: ChartGranularity
    dateFrom?: string
    dateTo?: string
    fillMissing?: boolean
  },
) {
  const { period, granularity, dateFrom, dateTo, fillMissing = true } = options
  const sortedRows = [...rows].sort((a, b) => a.key.localeCompare(b.key))
  const baseScoped = scopeRowsByChartPeriod(sortedRows, period, granularity)

  if (!fillMissing || granularity === 'evento') {
    return baseScoped
  }

  const timeGranularity = granularity as Extract<ChartGranularity, 'mes' | 'semana'>
  const rowByKey = new Map(baseScoped.map((row) => [row.key, row]))

  const rangeFromInput =
    timeGranularity === 'mes'
      ? getMonthStartFromISODate(dateFrom ?? '')
      : getWeekStartFromISODate(dateFrom ?? '')
  const rangeToInput =
    timeGranularity === 'mes'
      ? getMonthStartFromISODate(dateTo ?? '')
      : getWeekStartFromISODate(dateTo ?? '')

  let fromDate: Date | null = null
  let toDate: Date | null = null

  if (period === 'todo' && rangeFromInput && rangeToInput) {
    fromDate = rangeFromInput <= rangeToInput ? rangeFromInput : rangeToInput
    toDate = rangeFromInput <= rangeToInput ? rangeToInput : rangeFromInput
  } else {
    const limit = getChartPeriodLimit(period, granularity)
    if (limit > 0) {
      const endDate =
        rangeToInput ??
        inferPeriodRangeFromRows(baseScoped, timeGranularity)?.toDate ??
        (timeGranularity === 'mes'
          ? getMonthStartFromISODate(getTodayISODate())
          : getWeekStartFromISODate(getTodayISODate()))

      if (!endDate) {
        return baseScoped
      }

      toDate = new Date(endDate)
      fromDate = new Date(endDate)
      if (timeGranularity === 'mes') {
        fromDate.setMonth(fromDate.getMonth() - (limit - 1))
      } else {
        fromDate.setDate(fromDate.getDate() - (limit - 1) * 7)
      }
    } else {
      const inferred = inferPeriodRangeFromRows(baseScoped, timeGranularity)
      if (inferred) {
        fromDate = inferred.fromDate
        toDate = inferred.toDate
      }
    }
  }

  if (!fromDate || !toDate) {
    return baseScoped
  }

  const labels = buildChartLabelsFromRange(timeGranularity, fromDate, toDate)
  if (labels.length === 0) {
    return baseScoped
  }

  return labels.map((label) => {
    const existing = rowByKey.get(label)
    if (existing) {
      return existing
    }
    return {
      key: label,
      ingresos: 0,
      gastos: 0,
      beneficio: 0,
      margen: 0,
    }
  })
}

function getChartPeriodLabel(period: ChartPeriodPreset) {
  if (period === '3m') return 'últimos 3 meses'
  if (period === '6m') return 'últimos 6 meses'
  if (period === '12m') return 'últimos 12 meses'
  return 'todo el histórico'
}

function getPresetDisplayLabel(
  preset: AnalysisRangePreset | ReportRangePreset,
  fromDate: string,
  toDate: string,
) {
  if (preset === 'custom') {
    if (fromDate && toDate) {
      return `${formatDate(fromDate)} - ${formatDate(toDate)}`
    }
    return 'Personalizado'
  }
  return RANGE_PRESET_LABELS[preset]
}

function TrendLineChart({
  title,
  rows,
  metric = 'beneficio',
  xAxisLabel = 'Período',
  yAxisLabel = 'Importe (EUR)',
  color = '#b20f19',
}: {
  title: string
  rows: AggregatedRow[]
  metric?: MetricKey
  xAxisLabel?: string
  yAxisLabel?: string
  color?: string
}) {
  const width = 420
  const height = 230
  const leftPad = 64
  const rightPad = 16
  const topPad = 16
  const bottomPad = 54
  const values = rows.map((row) => getMetricValue(row, metric))
  const minValue = values.length > 0 ? Math.min(...values, 0) : 0
  const maxValue = values.length > 0 ? Math.max(...values, 0) : 1
  const points = buildLinePointsByScale(
    values,
    width,
    height,
    leftPad,
    rightPad,
    topPad,
    bottomPad,
    minValue,
    maxValue,
  )
  const yTicks = buildYAxisTicks(minValue, maxValue, 5)
  const xTickIndexes = getXAxisTickIndexes(rows.length, 6)
  const axisY = height - bottomPad
  const axisX = leftPad
  const isSinglePoint = values.length === 1
  const singlePointBarWidth = 18
  const singlePointCenterX = getChartX(0, values.length, width, leftPad, rightPad)
  const singlePointZeroY = getChartY(0, minValue, maxValue, height, topPad, bottomPad)
  const singlePointValueY = getChartY(values[0] ?? 0, minValue, maxValue, height, topPad, bottomPad)
  const singlePointBarTop = Math.min(singlePointZeroY, singlePointValueY)
  const singlePointBarHeight = Math.max(2.4, Math.abs(singlePointZeroY - singlePointValueY))

  return (
    <article className="panel chart-card">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p>Sin datos para tendencia.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart" role="img">
            {yTicks.map((tick, index) => {
              const y = getChartY(tick, minValue, maxValue, height, topPad, bottomPad)
              return (
                <g key={`y-tick-${title}-${index}`}>
                  <line className="chart-grid-line" x1={leftPad} y1={y} x2={width - rightPad} y2={y} />
                  <text x={leftPad - 8} y={y + 3} textAnchor="end" className="chart-tick-label">
                    {formatAxisMoney(tick)}
                  </text>
                </g>
              )
            })}
            <line x1={axisX} y1={axisY} x2={width - rightPad} y2={axisY} />
            <line x1={axisX} y1={topPad} x2={axisX} y2={axisY} />
            {isSinglePoint ? (
              <>
                <line
                  className="zero-line"
                  x1={leftPad}
                  y1={singlePointZeroY}
                  x2={width - rightPad}
                  y2={singlePointZeroY}
                />
                <rect
                  x={singlePointCenterX - singlePointBarWidth / 2}
                  y={singlePointBarTop}
                  width={singlePointBarWidth}
                  height={singlePointBarHeight}
                  rx={3}
                  style={{ fill: color }}
                />
              </>
            ) : (
              <>
                <polyline points={points} style={{ stroke: color }} />
                {values.map((value, index) => {
                  const x = getChartX(index, values.length, width, leftPad, rightPad)
                  const y = getChartY(value, minValue, maxValue, height, topPad, bottomPad)
                  return (
                    <circle
                      key={`${rows[index].key}-${index}`}
                      cx={x}
                      cy={y}
                      r={4}
                      style={{ fill: color }}
                    />
                  )
                })}
              </>
            )}
            {xTickIndexes.map((index) => {
              const x = getChartX(index, rows.length, width, leftPad, rightPad)
              return (
                <g key={`x-tick-${title}-${rows[index].key}-${index}`}>
                  <line className="chart-tick-mark" x1={x} y1={axisY} x2={x} y2={axisY + 4} />
                  <text x={x} y={axisY + 16} textAnchor="middle" className="chart-x-tick-label">
                    {formatAxisTickLabel(rows[index].key, 13)}
                  </text>
                </g>
              )
            })}
            <text x={width / 2} y={height - 4} className="chart-axis-text">
              {xAxisLabel}
            </text>
            <text
              x={14}
              y={height / 2}
              className="chart-axis-text"
              transform={`rotate(-90 14 ${height / 2})`}
            >
              {yAxisLabel}
            </text>
          </svg>
          <ul className="trend-labels">
            {rows.map((row) => (
              <li key={row.key}>
                <strong>{row.key}</strong>
                <span
                  className={
                    getMetricValue(row, metric) >= 0
                      ? 'pos'
                      : 'neg'
                  }
                >
                  {CURRENCY.format(getMetricValue(row, metric))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  )
}

function TrendExplorerChart({
  rows,
  mode,
  onModeChange,
  period,
  metricsVisible,
  onToggleMetric,
  xAxisLabel,
  granularity,
  dateFrom,
  dateTo,
}: {
  rows: AggregatedRow[]
  mode: 'barras' | 'linea'
  onModeChange: (next: 'barras' | 'linea') => void
  period: ChartPeriodPreset
  metricsVisible: Record<MetricKey, boolean>
  onToggleMetric: (metric: MetricKey) => void
  xAxisLabel: string
  granularity: ChartGranularity
  dateFrom?: string
  dateTo?: string
}) {
  const scopedRows = scopeRowsForChart(rows, {
    period,
    granularity,
    dateFrom,
    dateTo,
    fillMissing: granularity !== 'evento',
  })
  const isEventAxis = xAxisLabel.toLowerCase() === 'evento'
  const hasFewPoints = scopedRows.length < 3
  const chartMode: 'barras' | 'linea' =
    isEventAxis || hasFewPoints ? 'barras' : mode
  const selectedMetrics = (Object.keys(METRIC_META) as MetricKey[]).filter(
    (metric) => metricsVisible[metric],
  )
  const metricsToDraw: MetricKey[] =
    selectedMetrics.length > 0 ? selectedMetrics : (['beneficio'] as MetricKey[])
  const allValues = scopedRows.flatMap((row) =>
    metricsToDraw.map((metric) => getMetricValue(row, metric)),
  )
  const maxValue = allValues.length > 0 ? Math.max(...allValues, 0) : 1
  const minValue = allValues.length > 0 ? Math.min(...allValues, 0) : 0
  const maxAbs = Math.max(1, ...allValues.map((value) => Math.abs(value)))

  const width = 560
  const height = 280
  const leftPad = 66
  const rightPad = 20
  const topPad = 18
  const bottomPad = 64
  const zeroY = getChartY(0, minValue, maxValue, height, topPad, bottomPad)
  const yTicks = buildYAxisTicks(minValue, maxValue, 5)
  const xTickIndexes = getXAxisTickIndexes(scopedRows.length, 7)

  return (
    <article className="panel chart-card trend-explorer">
      <div className="trend-explorer-head">
        <h3>Explorador principal (ingresos, gastos y beneficio)</h3>
        <div className="chart-view-switch" role="group" aria-label="Vista del gráfico principal">
          <button
            type="button"
            className={chartMode === 'barras' ? 'active' : ''}
            onClick={() => onModeChange('barras')}
          >
            Barras
          </button>
          <button
            type="button"
            className={chartMode === 'linea' ? 'active' : ''}
            onClick={() => onModeChange('linea')}
            disabled={isEventAxis}
            title={isEventAxis ? 'Para comparar eventos usa barras.' : 'Cambiar a línea'}
          >
            Línea
          </button>
        </div>
      </div>

      <div className="trend-explorer-toolbar">
        <div className="metric-switch">
          {(Object.keys(METRIC_META) as MetricKey[]).map((metric) => (
            <label key={metric} className="metric-chip">
              <input
                type="checkbox"
                checked={metricsVisible[metric]}
                onChange={() => onToggleMetric(metric)}
              />
              <span style={{ background: METRIC_META[metric].color }} />
              {METRIC_META[metric].label}
            </label>
          ))}
        </div>
      </div>

      <p className="chart-axis-note">
        {isEventAxis
          ? 'Comparativa por evento: mejor en barras.'
          : hasFewPoints
            ? 'Con pocos puntos se muestra en barras para lectura clara.'
            : `Horizontal: ${xAxisLabel}. Vertical: EUR.`}
      </p>

      {scopedRows.length === 0 ? (
        <p>Sin datos para este período.</p>
      ) : chartMode === 'linea' ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart trend-explorer-chart" role="img">
          {yTicks.map((tick, index) => {
            const y = getChartY(tick, minValue, maxValue, height, topPad, bottomPad)
            return (
              <g key={`trend-y-${index}`}>
                <line className="chart-grid-line" x1={leftPad} y1={y} x2={width - rightPad} y2={y} />
                <text x={leftPad - 8} y={y + 3} textAnchor="end" className="chart-tick-label">
                  {formatAxisMoney(tick)}
                </text>
              </g>
            )
          })}
          <line x1={leftPad} y1={height - bottomPad} x2={width - rightPad} y2={height - bottomPad} />
          <line x1={leftPad} y1={topPad} x2={leftPad} y2={height - bottomPad} />
          <line x1={leftPad} y1={zeroY} x2={width - rightPad} y2={zeroY} className="zero-line" />

          {metricsToDraw.map((metric) => {
            const values = scopedRows.map((row) => getMetricValue(row, metric))
            const points = buildLinePointsByScale(
              values,
              width,
              height,
              leftPad,
              rightPad,
              topPad,
              bottomPad,
              minValue,
              maxValue,
            )
            return (
              <g key={`line-${metric}`}>
                <polyline points={points} style={{ stroke: METRIC_META[metric].color }} />
                {values.map((value, index) => {
                  const x = getChartX(index, values.length, width, leftPad, rightPad)
                  const y = getChartY(value, minValue, maxValue, height, topPad, bottomPad)
                  return (
                    <circle
                      key={`${metric}-${scopedRows[index].key}`}
                      cx={x}
                      cy={y}
                      r={3.5}
                      style={{ fill: METRIC_META[metric].color }}
                    />
                  )
                })}
              </g>
            )
          })}

          {xTickIndexes.map((index) => {
            const x = getChartX(index, scopedRows.length, width, leftPad, rightPad)
            return (
              <g key={`trend-x-${scopedRows[index].key}-${index}`}>
                <line className="chart-tick-mark" x1={x} y1={height - bottomPad} x2={x} y2={height - bottomPad + 4} />
                <text x={x} y={height - bottomPad + 16} textAnchor="middle" className="chart-x-tick-label">
                  {formatAxisTickLabel(scopedRows[index].key, 12)}
                </text>
              </g>
            )
          })}

          <text x={width / 2} y={height - 4} className="chart-axis-text">
            {xAxisLabel}
          </text>
          <text
            x={14}
            y={height / 2}
            className="chart-axis-text"
            transform={`rotate(-90 14 ${height / 2})`}
          >
            Importe en EUR
          </text>
        </svg>
      ) : (
        <ul className="metric-bar-list">
          {scopedRows.map((row) => (
            <li key={`bars-${row.key}`}>
              <p>{row.key}</p>
              {metricsToDraw.map((metric) => {
                const value = getMetricValue(row, metric)
                return (
                  <div key={`${row.key}-${metric}`} className="metric-bar-row">
                    <small>{METRIC_META[metric].label}</small>
                    <div className="metric-bar-track">
                      <span
                        style={{
                          width: `${(Math.abs(value) / maxAbs) * 100}%`,
                          background: METRIC_META[metric].color,
                        }}
                      />
                    </div>
                    <strong className={value >= 0 ? 'pos' : 'neg'}>
                      {CURRENCY.format(value)}
                    </strong>
                  </div>
                )
              })}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function App() {
  const [entries, setEntries] = useState<LedgerEntry[]>(INITIAL_ENTRIES.slice(0, 0))
  const [storageReady, setStorageReady] = useState(false)
  const [lastLocalBackupAt, setLastLocalBackupAt] = useState('')
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard')
  const [viewMode, setViewMode] = useState<ViewMode>('mes')
  const [selectedBucket, setSelectedBucket] = useState('TODOS')
  const [analysisScope, setAnalysisScope] = useState<AnalysisScope>('RESUMEN')
  const [analysisPreset, setAnalysisPreset] = useState<AnalysisRangePreset>('ano')
  const [analysisDateFrom, setAnalysisDateFrom] = useState(() =>
    getYearStartISODate(getTodayISODate()),
  )
  const [analysisDateTo, setAnalysisDateTo] = useState(() => getTodayISODate())
  const [dashboardChartMode, setDashboardChartMode] = useState<'barras' | 'linea'>(
    'barras',
  )
  const [dashboardChartPeriod, setDashboardChartPeriod] =
    useState<ChartPeriodPreset>('todo')
  const [dashboardMetricsVisible, setDashboardMetricsVisible] = useState<
    Record<MetricKey, boolean>
  >({
    ingresos: true,
    gastos: true,
    beneficio: true,
  })
  const [reportMode, setReportMode] = useState<ReportMode>('mes')
  const [reportScope, setReportScope] = useState<AnalysisScope>('RESUMEN')
  const [reportPreset, setReportPreset] = useState<ReportRangePreset>('mes')
  const [reportDateFrom, setReportDateFrom] = useState(() =>
    getMonthStartISODate(getTodayISODate()),
  )
  const [reportDateTo, setReportDateTo] = useState(() => getTodayISODate())
  const [reportChartMode, setReportChartMode] = useState<'barras' | 'linea'>('linea')
  const [reportChartPeriod, setReportChartPeriod] = useState<ChartPeriodPreset>('todo')
  const [reportMetricsVisible, setReportMetricsVisible] = useState<
    Record<MetricKey, boolean>
  >({
    ingresos: true,
    gastos: true,
    beneficio: true,
  })
  const [isPrintingReport, setIsPrintingReport] = useState(false)
  const [formError, setFormError] = useState('')
  const [sourceInfo, setSourceInfo] = useState<DataSourceInfo>({
    source: 'google_sheets',
    readOnly: true,
    sheet: null,
  })
  const [sourceSyncBusy, setSourceSyncBusy] = useState(false)
  const [sourceSyncMessage, setSourceSyncMessage] = useState('')
  const [sourceSyncError, setSourceSyncError] = useState('')
  const [lastRemoteSyncAt, setLastRemoteSyncAt] = useState('')
  const entriesHashRef = useRef('')
  const remotePullBusyRef = useRef(false)
  const [isSourcePanelExpanded, setIsSourcePanelExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<MovementType | null>(null)
  const [scenarioAdjustments, setScenarioAdjustments] = useState<ScenarioAdjustments>({
    optimisticIncomePct: 18,
    optimisticExpensePct: -8,
    pessimisticIncomePct: -14,
    pessimisticExpensePct: 12,
  })
  const [scenarioPeriod, setScenarioPeriod] = useState<ChartPeriodPreset>('12m')
  const [eventsRangePreset, setEventsRangePreset] = useState<EventsRangePreset>('todo')
  const [diaryPreset, setDiaryPreset] = useState<DiaryRangePreset>('mes')
  const [diaryDateFrom, setDiaryDateFrom] = useState(() =>
    getMonthStartISODate(getTodayISODate()),
  )
  const [diaryDateTo, setDiaryDateTo] = useState(() => getTodayISODate())
  const [diaryTypeFilter, setDiaryTypeFilter] = useState<'TODOS' | MovementType>(
    'TODOS',
  )
  const [diaryMethodFilter, setDiaryMethodFilter] = useState<
    'TODOS' | PaymentMethod
  >('TODOS')
  const [diaryEventFilter, setDiaryEventFilter] = useState('TODOS')
  const [diarySearch, setDiarySearch] = useState('')

  const [draftIncome, setDraftIncome] = useState<MovementDraft>(() =>
    createDraft('INGRESO'),
  )
  const [draftExpense, setDraftExpense] = useState<MovementDraft>(() =>
    createDraft('GASTO'),
  )
  const [movementFormType, setMovementFormType] = useState<MovementType>('INGRESO')
  const [analyticsSection, setAnalyticsSection] = useState<AnalyticsSection>('resumen')
  const [selectedEventDrilldown, setSelectedEventDrilldown] = useState('TODOS')
  const [analyticsFilters, setAnalyticsFilters] = useState<AnalyticsFilters>(() => {
    try {
      const raw = window.localStorage.getItem(ANALYTICS_STORAGE_KEY)
      if (!raw) {
        return buildDefaultAnalyticsFilters()
      }
      const parsed = JSON.parse(raw) as Partial<AnalyticsFilters>
      return sanitizeAnalyticsFilters(parsed)
    } catch {
      return buildDefaultAnalyticsFilters()
    }
  })

  const isGoogleSheetsSource =
    sourceInfo.source === 'google_sheets' || sourceInfo.source === 'google_sheets_public'
  const isSheetReadOnlyMode =
    APP_VIEW_ONLY_MODE || (isGoogleSheetsSource && sourceInfo.readOnly)
  const sourceBadgeLabel =
    sourceInfo.source === 'google_sheets_public'
      ? 'Google Sheets público'
      : isGoogleSheetsSource
      ? 'Google Sheets'
      : 'Sin conexión con hoja'

  useEffect(() => {
    entriesHashRef.current = JSON.stringify(entries)
  }, [entries])

  useEffect(() => {
    let cancelled = false

    async function bootstrapData() {
      try {
        const sourceRes = await fetch('/api/data-source', {
          method: 'GET',
          credentials: 'same-origin',
        })
        if (sourceRes.ok) {
          const sourcePayload = (await sourceRes.json()) as Partial<DataSourceInfo>
          if (!cancelled) {
            const rawSource = sourcePayload.source
            const normalizedSource: DataSourceInfo['source'] =
              rawSource === 'google_sheets' || rawSource === 'google_sheets_public'
                ? rawSource
                : 'local'
            setSourceInfo({
              source: normalizedSource,
              readOnly: Boolean(sourcePayload.readOnly),
              sheet:
                sourcePayload.sheet &&
                typeof sourcePayload.sheet === 'object' &&
                'url' in sourcePayload.sheet
                  ? {
                      id: String((sourcePayload.sheet as { id?: string }).id || ''),
                      url: String((sourcePayload.sheet as { url?: string }).url || ''),
                      mainTab: String(
                        (sourcePayload.sheet as { mainTab?: string }).mainTab || 'Introduccion de datos',
                      ),
                      reportTabs: Array.isArray(
                        (sourcePayload.sheet as { reportTabs?: string[] }).reportTabs,
                      )
                        ? (sourcePayload.sheet as { reportTabs: string[] }).reportTabs
                        : ['Situacion_Semanal', 'Situacion_Mensual', 'Situacion_Eventos'],
                      controlTab: String(
                        (sourcePayload.sheet as { controlTab?: string }).controlTab || 'Control_App',
                      ),
                    }
                  : null,
            })
          }
        }

        const entriesRes = await fetch('/api/entries', {
          method: 'GET',
          credentials: 'same-origin',
        })
        if (entriesRes.ok) {
          const payload = (await entriesRes.json()) as { entries?: unknown }
          const sanitized = sanitizeLedgerEntries(payload.entries ?? [])
          if (!cancelled) {
            setEntries(sanitized)
            setSourceSyncError('')
          }
          if (!cancelled) {
            setLastRemoteSyncAt(new Date().toLocaleString('es-ES'))
          }
        } else {
          throw new Error('No se pudo cargar /api/entries desde Google Sheets.')
        }
      } catch (error) {
        console.error('No se pudo cargar la fuente remota.', error)
        if (!cancelled) {
          setEntries([])
          setSourceSyncError(
            'No se pudo conectar con Google Sheets. Revisa la conexión y vuelve a recargar desde hoja.',
          )
        }
      } finally {
        if (!cancelled) {
          setStorageReady(true)
        }
      }
    }

    void bootstrapData()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!storageReady) {
      return
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
      setLastLocalBackupAt(new Date().toLocaleString('es-ES'))
    } catch (error) {
      console.error('No se pudo guardar el respaldo local.', error)
    }
  }, [entries, storageReady])

  useEffect(() => {
    if (!storageReady) {
      return
    }
    if (APP_VIEW_ONLY_MODE) {
      return
    }
    if (sourceInfo.source !== 'google_sheets' || sourceInfo.readOnly) {
      return
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/entries', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entries }),
        })
        if (!response.ok) {
          throw new Error('No se pudo sincronizar la hoja.')
        }
        setLastRemoteSyncAt(new Date().toLocaleString('es-ES'))
      } catch (error) {
        setSourceSyncError(
          `Error de sincronización: ${error instanceof Error ? error.message : 'fallo desconocido.'}`,
        )
      }
    }, 800)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [entries, storageReady, sourceInfo.source, sourceInfo.readOnly])

  useEffect(() => {
    if (
      !storageReady ||
      (sourceInfo.source !== 'google_sheets' && sourceInfo.source !== 'google_sheets_public')
    ) {
      return
    }

    let cancelled = false
    const pullFromSheet = async () => {
      if (remotePullBusyRef.current || cancelled) {
        return
      }
      remotePullBusyRef.current = true
      try {
        const response = await fetch('/api/entries', {
          method: 'GET',
          credentials: 'same-origin',
        })
        if (!response.ok || cancelled) {
          return
        }
        const payload = (await response.json()) as { entries?: unknown }
        const sanitized = sanitizeLedgerEntries(payload.entries ?? [])
        const incoming = JSON.stringify(sanitized)
        if (entriesHashRef.current !== incoming) {
          setEntries(sanitized)
          entriesHashRef.current = incoming
        }
        setLastRemoteSyncAt(new Date().toLocaleString('es-ES'))
        setSourceSyncError('')
      } catch {
        if (!cancelled) {
          setSourceSyncError('No se pudo actualizar la hoja en tiempo real. Reintentando...')
        }
      } finally {
        remotePullBusyRef.current = false
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pullFromSheet()
      }
    }

    const handleWindowFocus = () => {
      void pullFromSheet()
    }

    void pullFromSheet()
    const intervalId = window.setInterval(() => {
      void pullFromSheet()
    }, SHEET_AUTO_SYNC_INTERVAL_MS)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [storageReady, sourceInfo.source])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        ANALYTICS_STORAGE_KEY,
        JSON.stringify(analyticsFilters),
      )
    } catch (error) {
      console.error('No se pudo guardar los filtros analíticos.', error)
    }
  }, [analyticsFilters])

  useEffect(() => {
    document.body.classList.toggle('report-print-active', isPrintingReport)
    return () => {
      document.body.classList.remove('report-print-active')
    }
  }, [isPrintingReport])

  useEffect(() => {
    const handleAfterPrint = () => setIsPrintingReport(false)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [])

  const analysisEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (analysisPreset !== 'todo') {
        const from = analysisDateFrom || '0000-01-01'
        const to = analysisDateTo || '9999-12-31'
        if (entry.date < from || entry.date > to) {
          return false
        }
      }

      if (analysisScope === 'VENTAS' && entry.movementType !== 'INGRESO') {
        return false
      }
      if (analysisScope === 'COMPRAS' && entry.movementType !== 'GASTO') {
        return false
      }
      return true
    })
  }, [entries, analysisScope, analysisPreset, analysisDateFrom, analysisDateTo])

  const bucketOptions = useMemo(() => {
    const unique = Array.from(
      new Set(analysisEntries.map((entry) => getBucket(entry, viewMode))),
    ).sort((a, b) => b.localeCompare(a))
    return ['TODOS', ...unique]
  }, [analysisEntries, viewMode])

  const activeBucket = bucketOptions.includes(selectedBucket)
    ? selectedBucket
    : 'TODOS'

  const filteredEntries = useMemo(() => {
    if (activeBucket === 'TODOS') {
      return analysisEntries
    }
    return analysisEntries.filter(
      (entry) => getBucket(entry, viewMode) === activeBucket,
    )
  }, [analysisEntries, viewMode, activeBucket])

  const totals = useMemo(() => {
    const ingresos = filteredEntries
      .filter((entry) => entry.movementType === 'INGRESO')
      .reduce((acc, entry) => acc + entry.amount, 0)

    const gastos = filteredEntries
      .filter((entry) => entry.movementType === 'GASTO')
      .reduce((acc, entry) => acc + entry.amount, 0)

    const efectivo = filteredEntries
      .filter(
        (entry) =>
          entry.movementType === 'INGRESO' && entry.paymentMethod === 'EFECTIVO',
      )
      .reduce((acc, entry) => acc + entry.amount, 0)

    const tarjeta = filteredEntries
      .filter(
        (entry) =>
          entry.movementType === 'INGRESO' && entry.paymentMethod === 'TARJETA',
      )
      .reduce((acc, entry) => acc + entry.amount, 0)

    const transferencia = filteredEntries
      .filter(
        (entry) =>
          entry.movementType === 'INGRESO' &&
          entry.paymentMethod === 'TRANSFERENCIA',
      )
      .reduce((acc, entry) => acc + entry.amount, 0)

    const beneficio = ingresos - gastos
    return {
      ingresos,
      gastos,
      beneficio,
      margen: ingresos > 0 ? (beneficio / ingresos) * 100 : 0,
      efectivo,
      tarjeta,
      transferencia,
    }
  }, [filteredEntries])

  const taxTotals = useMemo(() => {
    const ivaRepercutido = filteredEntries
      .filter((entry) => entry.movementType === 'INGRESO')
      .reduce((acc, entry) => acc + (entry.vatAmount ?? 0), 0)

    const ivaSoportado = filteredEntries
      .filter((entry) => entry.movementType === 'GASTO')
      .reduce((acc, entry) => acc + (entry.vatAmount ?? 0), 0)

    const retencionSufrida = filteredEntries
      .filter((entry) => entry.movementType === 'INGRESO')
      .reduce((acc, entry) => acc + (entry.withholdingAmount ?? 0), 0)

    const retencionPracticada = filteredEntries
      .filter((entry) => entry.movementType === 'GASTO')
      .reduce((acc, entry) => acc + (entry.withholdingAmount ?? 0), 0)

    return {
      ivaRepercutido,
      ivaSoportado,
      saldoIva: ivaRepercutido - ivaSoportado,
      retencionSufrida,
      retencionPracticada,
    }
  }, [filteredEntries])

  const expenseByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>()

    filteredEntries
      .filter((entry) => entry.movementType === 'GASTO')
      .forEach((entry) => {
        categoryMap.set(
          entry.category,
          (categoryMap.get(entry.category) ?? 0) + entry.amount,
        )
      })

    const total = Array.from(categoryMap.values()).reduce((acc, val) => acc + val, 0)
    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        ratio: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredEntries])

  const summaryByWeek = useMemo(
    () => aggregateRows(analysisEntries, 'semana'),
    [analysisEntries],
  )
  const summaryByMonth = useMemo(
    () => aggregateRows(analysisEntries, 'mes'),
    [analysisEntries],
  )
  const summaryByActiveMode = useMemo(
    () => aggregateRows(analysisEntries, viewMode),
    [analysisEntries, viewMode],
  )
  const visibleSummaryByActiveMode = useMemo(() => {
    if (activeBucket === 'TODOS') {
      return summaryByActiveMode
    }
    return summaryByActiveMode.filter((row) => row.key === activeBucket)
  }, [summaryByActiveMode, activeBucket])

  const filteredByEvent = useMemo(
    () => aggregateRows(filteredEntries, 'evento'),
    [filteredEntries],
  )

  const auditFindings = useMemo(() => {
    const findings = buildAuditFindings(filteredEntries, totals, filteredByEvent)
    return sortBySeverity(findings)
  }, [filteredEntries, totals, filteredByEvent])

  const auditScore = useMemo(() => getAuditScore(auditFindings), [auditFindings])

  const eventOptions = useMemo(() => {
    return Array.from(new Set(entries.map((entry) => entry.event))).sort((a, b) =>
      a.localeCompare(b),
    )
  }, [entries])

  const expenseMethodTotals = useMemo(
    () => ({
      tarjeta: filteredEntries
        .filter(
          (entry) =>
            entry.movementType === 'GASTO' && entry.paymentMethod === 'TARJETA',
        )
        .reduce((acc, entry) => acc + entry.amount, 0),
      efectivo: filteredEntries
        .filter(
          (entry) =>
            entry.movementType === 'GASTO' && entry.paymentMethod === 'EFECTIVO',
        )
        .reduce((acc, entry) => acc + entry.amount, 0),
      transferencia: filteredEntries
        .filter(
          (entry) =>
            entry.movementType === 'GASTO' &&
            entry.paymentMethod === 'TRANSFERENCIA',
        )
        .reduce((acc, entry) => acc + entry.amount, 0),
    }),
    [filteredEntries],
  )

  const paymentSlices = useMemo(() => {
    const isCompras = analysisScope === 'COMPRAS'
    return [
      {
        label: 'Tarjeta',
        value: isCompras ? expenseMethodTotals.tarjeta : totals.tarjeta,
        color: METHOD_COLORS.TARJETA,
      },
      {
        label: 'Efectivo',
        value: isCompras ? expenseMethodTotals.efectivo : totals.efectivo,
        color: METHOD_COLORS.EFECTIVO,
      },
      {
        label: 'Transferencia',
        value: isCompras
          ? expenseMethodTotals.transferencia
          : totals.transferencia,
        color: METHOD_COLORS.TRANSFERENCIA,
      },
    ]
  }, [analysisScope, expenseMethodTotals, totals])

  const monthlyTrendRows = useMemo(
    () => [...summaryByMonth].sort((a, b) => a.key.localeCompare(b.key)),
    [summaryByMonth],
  )

  const weeklyTrendRows = useMemo(
    () => [...summaryByWeek].sort((a, b) => a.key.localeCompare(b.key)),
    [summaryByWeek],
  )

  const dashboardMonthlyTrendRows = useMemo(
    () =>
      scopeRowsForChart(monthlyTrendRows, {
        period: dashboardChartPeriod,
        granularity: 'mes',
        dateFrom: analysisPreset === 'todo' ? undefined : analysisDateFrom,
        dateTo: analysisPreset === 'todo' ? undefined : analysisDateTo,
      }),
    [
      monthlyTrendRows,
      dashboardChartPeriod,
      analysisPreset,
      analysisDateFrom,
      analysisDateTo,
    ],
  )

  const dashboardWeeklyTrendRows = useMemo(
    () =>
      scopeRowsForChart(weeklyTrendRows, {
        period: dashboardChartPeriod,
        granularity: 'semana',
        dateFrom: analysisPreset === 'todo' ? undefined : analysisDateFrom,
        dateTo: analysisPreset === 'todo' ? undefined : analysisDateTo,
      }),
    [
      weeklyTrendRows,
      dashboardChartPeriod,
      analysisPreset,
      analysisDateFrom,
      analysisDateTo,
    ],
  )

  const dashboardCumulativeMonthlyRows = useMemo(
    () => {
      let cumulative = 0
      return dashboardMonthlyTrendRows.map((row) => {
        cumulative += row.beneficio
        return {
          ...row,
          beneficio: cumulative,
        }
      })
    },
    [dashboardMonthlyTrendRows],
  )
  const dashboardPeriodLabel = getPresetDisplayLabel(
    analysisPreset,
    analysisDateFrom,
    analysisDateTo,
  )

  const scenarioScopedMonthlyRows = useMemo(
    () => scopeRowsByChartPeriod(monthlyTrendRows, scenarioPeriod, 'mes'),
    [monthlyTrendRows, scenarioPeriod],
  )

  const scenarioScopedTotals = useMemo(() => {
    return scenarioScopedMonthlyRows.reduce(
      (acc, row) => ({
        ingresos: acc.ingresos + row.ingresos,
        gastos: acc.gastos + row.gastos,
      }),
      { ingresos: 0, gastos: 0 },
    )
  }, [scenarioScopedMonthlyRows])

  const scenarioRows = useMemo(() => {
    return buildScenarioRowsFromTotals(
      scenarioScopedTotals.ingresos,
      scenarioScopedTotals.gastos,
      scenarioAdjustments,
    )
  }, [scenarioScopedTotals, scenarioAdjustments])

  const scenarioAggregatedRows = useMemo(
    () =>
      scenarioRows.map((scenario) => ({
        key: scenario.name,
        ingresos: scenario.income,
        gastos: scenario.expense,
        beneficio: scenario.net,
        margen: scenario.income > 0 ? (scenario.net / scenario.income) * 100 : 0,
      })),
    [scenarioRows],
  )

  const scenarioPeriodLabel = getChartPeriodLabel(scenarioPeriod)

  const eventsRange = useMemo(
    () => getEventsRangeByPreset(eventsRangePreset),
    [eventsRangePreset],
  )

  const eventTabEntries = useMemo(() => {
    if (eventsRangePreset === 'todo') {
      return entries
    }
    const from = eventsRange.from || '0000-01-01'
    const to = eventsRange.to || '9999-12-31'
    return entries.filter((entry) => {
      const eventDate = getIsoDateFromDateTime(entry.eventDateTime || entry.date)
      return eventDate >= from && eventDate <= to
    })
  }, [entries, eventsRangePreset, eventsRange])

  const eventSummaryRows = useMemo(
    () => aggregateRows(eventTabEntries, 'evento'),
    [eventTabEntries],
  )

  const eventTabMonthlyTrendRows = useMemo(
    () =>
      aggregateRows(eventTabEntries, 'mes').sort((a, b) =>
        a.key.localeCompare(b.key),
      ),
    [eventTabEntries],
  )

  const eventTabTypeSummaryRows = useMemo(
    () =>
      aggregateRowsByCustomKey(
        eventTabEntries,
        (entry) => entry.eventType || 'Sin tipo',
      ),
    [eventTabEntries],
  )

  const eventTabTimeSlotSummaryRows = useMemo(
    () =>
      aggregateRowsByCustomKey(
        eventTabEntries,
        (entry) => entry.eventTimeSlot || 'Sin franja',
      ),
    [eventTabEntries],
  )

  const movementCountByEventTab = useMemo(() => {
    return eventTabEntries.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.event] = (acc[entry.event] ?? 0) + 1
      return acc
    }, {})
  }, [eventTabEntries])

  const eventTabTotals = useMemo(() => {
    return eventSummaryRows.reduce(
      (acc, row) => ({
        ingresos: acc.ingresos + row.ingresos,
        gastos: acc.gastos + row.gastos,
        beneficio: acc.beneficio + row.beneficio,
      }),
      { ingresos: 0, gastos: 0, beneficio: 0 },
    )
  }, [eventSummaryRows])

  const bestEventTypeRow = eventTabTypeSummaryRows[0] ?? null
  const bestEventTimeSlotRow = eventTabTimeSlotSummaryRows[0] ?? null

  const totalMethodBase =
    paymentSlices.reduce((acc, slice) => acc + slice.value, 0) || 1
  const incomeLineCount = filteredEntries.filter(
    (entry) => entry.movementType === 'INGRESO',
  ).length
  const expenseLineCount = filteredEntries.filter(
    (entry) => entry.movementType === 'GASTO',
  ).length
  const averageIncomeLine = incomeLineCount > 0 ? totals.ingresos / incomeLineCount : 0
  const averageExpenseLine = expenseLineCount > 0 ? totals.gastos / expenseLineCount : 0
  const scopeTotalLabel =
    analysisScope === 'VENTAS'
      ? 'Ventas'
      : analysisScope === 'COMPRAS'
        ? 'Compras'
        : 'Volumen'
  const scopeTotalAmount =
    analysisScope === 'VENTAS'
      ? totals.ingresos
      : analysisScope === 'COMPRAS'
        ? totals.gastos
        : totals.ingresos + totals.gastos
  const scopeLineCount =
    analysisScope === 'VENTAS'
      ? incomeLineCount
      : analysisScope === 'COMPRAS'
        ? expenseLineCount
        : filteredEntries.length
  const scopeAverageAmount = scopeLineCount > 0 ? scopeTotalAmount / scopeLineCount : 0
  const scopeMethodDigitalAmount =
    analysisScope === 'COMPRAS'
      ? expenseMethodTotals.tarjeta + expenseMethodTotals.transferencia
      : totals.tarjeta + totals.transferencia
  const scopeMethodCashAmount =
    analysisScope === 'COMPRAS' ? expenseMethodTotals.efectivo : totals.efectivo
  const scopeMethodBase =
    analysisScope === 'COMPRAS' ? totals.gastos : totals.ingresos
  const digitalShare =
    scopeMethodBase > 0 ? (scopeMethodDigitalAmount / scopeMethodBase) * 100 : 0
  const cashShare =
    scopeMethodBase > 0 ? (scopeMethodCashAmount / scopeMethodBase) * 100 : 0
  const movementVolume = totals.ingresos + totals.gastos
  const expenseRatio = movementVolume > 0 ? (totals.gastos / movementVolume) * 100 : 0
  const bestEvent = [...filteredByEvent].sort((a, b) => b.beneficio - a.beneficio)[0]
  const lastMonthRow = dashboardMonthlyTrendRows[dashboardMonthlyTrendRows.length - 1]
  const previousMonthRow =
    dashboardMonthlyTrendRows.length > 1
      ? dashboardMonthlyTrendRows[dashboardMonthlyTrendRows.length - 2]
      : null
  const monthDelta =
    lastMonthRow && previousMonthRow
      ? lastMonthRow.beneficio - previousMonthRow.beneficio
      : 0
  const dashboardKpiIndexes = useMemo(
    () =>
      buildExecutiveKpiIndexes({
        marginPct: totals.margen,
        expenseRatioPct: expenseRatio,
        digitalSharePct: digitalShare,
        monthlyRows: dashboardMonthlyTrendRows,
      }),
    [totals.margen, expenseRatio, digitalShare, dashboardMonthlyTrendRows],
  )
  const scenarioBase = scenarioRows[0]

  const reportEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (reportPreset !== 'todo') {
        const from = reportDateFrom || '0000-01-01'
        const to = reportDateTo || '9999-12-31'
        if (entry.date < from || entry.date > to) {
          return false
        }
      }

      if (reportScope === 'VENTAS' && entry.movementType !== 'INGRESO') {
        return false
      }
      if (reportScope === 'COMPRAS' && entry.movementType !== 'GASTO') {
        return false
      }
      return true
    })
  }, [entries, reportPreset, reportDateFrom, reportDateTo, reportScope])

  const reportRows = useMemo(
    () => aggregateRows(reportEntries, reportMode),
    [reportEntries, reportMode],
  )

  const reportRowsChronological = useMemo(
    () => [...reportRows].sort((a, b) => a.key.localeCompare(b.key)),
    [reportRows],
  )

  const reportRowsByEvent = useMemo(
    () => aggregateRows(reportEntries, 'evento'),
    [reportEntries],
  )

  const reportMovementCountByEvent = useMemo(() => {
    return reportEntries.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.event] = (acc[entry.event] ?? 0) + 1
      return acc
    }, {})
  }, [reportEntries])

  const reportTypeSummaryRows = useMemo(
    () =>
      aggregateRowsByCustomKey(
        reportEntries,
        (entry) => entry.eventType || 'Sin tipo',
      ),
    [reportEntries],
  )

  const reportTimeSlotSummaryRows = useMemo(
    () =>
      aggregateRowsByCustomKey(
        reportEntries,
        (entry) => entry.eventTimeSlot || 'Sin franja',
      ),
    [reportEntries],
  )

  const reportMovementCountByBucket = useMemo(() => {
    return reportEntries.reduce<Record<string, number>>((acc, entry) => {
      const key = reportMode === 'semana' ? getWeekLabel(entry.date) : getMonthLabel(entry.date)
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
  }, [reportEntries, reportMode])

  const reportTotals = useMemo(() => {
    const ingresos = reportEntries
      .filter((entry) => entry.movementType === 'INGRESO')
      .reduce((acc, entry) => acc + entry.amount, 0)
    const gastos = reportEntries
      .filter((entry) => entry.movementType === 'GASTO')
      .reduce((acc, entry) => acc + entry.amount, 0)
    const beneficio = ingresos - gastos
    return {
      ingresos,
      gastos,
      beneficio,
      margen: ingresos > 0 ? (beneficio / ingresos) * 100 : 0,
    }
  }, [reportEntries])

  const reportMethodTotals = useMemo(() => {
    return reportEntries.reduce(
      (acc, entry) => {
        if (entry.paymentMethod === 'TARJETA') {
          acc.tarjeta += entry.amount
        } else if (entry.paymentMethod === 'EFECTIVO') {
          acc.efectivo += entry.amount
        } else {
          acc.transferencia += entry.amount
        }
        return acc
      },
      { tarjeta: 0, efectivo: 0, transferencia: 0 },
    )
  }, [reportEntries])

  const reportPaymentSlices = useMemo(
    () => [
      {
        label: 'Tarjeta',
        value: reportMethodTotals.tarjeta,
        color: METHOD_COLORS.TARJETA,
      },
      {
        label: 'Efectivo',
        value: reportMethodTotals.efectivo,
        color: METHOD_COLORS.EFECTIVO,
      },
      {
        label: 'Transferencia',
        value: reportMethodTotals.transferencia,
        color: METHOD_COLORS.TRANSFERENCIA,
      },
    ],
    [reportMethodTotals],
  )

  const reportMonthlyRows = useMemo(
    () => aggregateRows(reportEntries, 'mes').sort((a, b) => a.key.localeCompare(b.key)),
    [reportEntries],
  )

  const reportMonthlyRowsScoped = useMemo(
    () =>
      scopeRowsForChart(reportMonthlyRows, {
        period: reportChartPeriod,
        granularity: 'mes',
        dateFrom: reportDateFrom,
        dateTo: reportDateTo,
      }),
    [reportMonthlyRows, reportChartPeriod, reportDateFrom, reportDateTo],
  )

  const reportCumulativeMonthlyRowsScoped = useMemo(
    () => {
      let cumulative = 0
      return reportMonthlyRowsScoped.map((row) => {
        cumulative += row.beneficio
        return {
          ...row,
          beneficio: cumulative,
        }
      })
    },
    [reportMonthlyRowsScoped],
  )
  const reportPeriodScopeLabel = getPresetDisplayLabel(
    reportPreset,
    reportDateFrom,
    reportDateTo,
  )

  const reportBestBucket = useMemo(
    () => [...reportRows].sort((a, b) => b.beneficio - a.beneficio)[0],
    [reportRows],
  )

  const reportWorstBucket = useMemo(
    () => [...reportRows].sort((a, b) => a.beneficio - b.beneficio)[0],
    [reportRows],
  )

  const reportPositiveBuckets = reportRows.filter((row) => row.beneficio >= 0).length
  const reportNegativeBuckets = reportRows.filter((row) => row.beneficio < 0).length
  const reportOperationalIntensity =
    reportTotals.ingresos + reportTotals.gastos > 0
      ? (reportTotals.gastos / (reportTotals.ingresos + reportTotals.gastos)) * 100
      : 0
  const reportMethodBase =
    reportScope === 'COMPRAS'
      ? reportTotals.gastos
      : reportTotals.ingresos > 0
        ? reportTotals.ingresos
        : reportTotals.ingresos + reportTotals.gastos
  const reportDigitalShare =
    reportMethodBase > 0
      ? ((reportMethodTotals.tarjeta + reportMethodTotals.transferencia) / reportMethodBase) *
        100
      : 0
  const reportExpenseRatio =
    reportTotals.ingresos + reportTotals.gastos > 0
      ? (reportTotals.gastos / (reportTotals.ingresos + reportTotals.gastos)) * 100
      : 0
  const reportKpiIndexes = useMemo(
    () =>
      buildExecutiveKpiIndexes({
        marginPct: reportTotals.margen,
        expenseRatioPct: reportExpenseRatio,
        digitalSharePct: reportDigitalShare,
        monthlyRows: reportMonthlyRows,
      }),
    [reportTotals.margen, reportExpenseRatio, reportDigitalShare, reportMonthlyRows],
  )

  const reportAverageLineAmount =
    reportEntries.length > 0
      ? (reportTotals.ingresos + reportTotals.gastos) / reportEntries.length
      : 0

  const reportPeriodLabel =
    reportPreset === 'todo'
      ? 'Histórico completo'
      : `${formatDate(reportDateFrom)} - ${formatDate(reportDateTo)}`

  const reportGeneratedAt = new Date().toLocaleString('es-ES')

  const reportWindowSnapshots = useMemo<ReportWindowSnapshot[]>(() => {
    const today = getTodayISODate()
    const ranges = [
      {
        id: 'year',
        label: 'Año en curso',
        from: getYearStartISODate(today),
        to: today,
      },
      {
        id: '12m',
        label: 'Últimos 12 meses',
        from: shiftISODate(today, -364),
        to: today,
      },
      {
        id: '3m',
        label: 'Últimos 3 meses',
        from: shiftISODate(today, -89),
        to: today,
      },
      {
        id: '1m',
        label: 'Último mes',
        from: shiftISODate(today, -29),
        to: today,
      },
      {
        id: '1w',
        label: 'Última semana',
        from: shiftISODate(today, -6),
        to: today,
      },
    ] as const

    return ranges.map((range) => {
      const scopedEntries = entries.filter((entry) => {
        if (entry.date < range.from || entry.date > range.to) {
          return false
        }
        if (reportScope === 'VENTAS' && entry.movementType !== 'INGRESO') {
          return false
        }
        if (reportScope === 'COMPRAS' && entry.movementType !== 'GASTO') {
          return false
        }
        return true
      })

      const ingresos = scopedEntries
        .filter((entry) => entry.movementType === 'INGRESO')
        .reduce((acc, entry) => acc + entry.amount, 0)
      const gastos = scopedEntries
        .filter((entry) => entry.movementType === 'GASTO')
        .reduce((acc, entry) => acc + entry.amount, 0)
      const beneficio = ingresos - gastos

      return {
        ...range,
        movements: scopedEntries.length,
        ingresos,
        gastos,
        beneficio,
        margen: ingresos > 0 ? (beneficio / ingresos) * 100 : 0,
      }
    })
  }, [entries, reportScope])

  const analyticsBaseEntries = useMemo(
    () =>
      entries
        .map((entry) => normalizeLedgerEntry(entry))
        .filter((entry): entry is LedgerEntry => entry !== null),
    [entries],
  )

  const analyticsFilterOptions = useMemo(() => {
    return {
      eventStatus: sortUnique(
        analyticsBaseEntries.map((entry) => entry.eventStatus || inferEventStatus(getEntryEventDateTime(entry))),
      ),
      artist: sortUnique(analyticsBaseEntries.map((entry) => entry.artist || entry.event)),
      genre: sortUnique(analyticsBaseEntries.map((entry) => entry.genre || 'General')),
      promoter: sortUnique(analyticsBaseEntries.map((entry) => entry.promoter || 'Bella Bestia')),
      venueSpace: sortUnique(analyticsBaseEntries.map((entry) => entry.venueSpace || 'Sala principal')),
      zoneSection: sortUnique(analyticsBaseEntries.map((entry) => entry.zoneSection || 'General')),
      ticketType: sortUnique(analyticsBaseEntries.map((entry) => entry.ticketType || 'General')),
      channel: sortUnique(analyticsBaseEntries.map((entry) => entry.channel || 'Directo')),
      source: sortUnique(analyticsBaseEntries.map((entry) => entry.source || 'Directo')),
      medium: sortUnique(analyticsBaseEntries.map((entry) => entry.medium || 'Orgánico')),
      campaign: sortUnique(analyticsBaseEntries.map((entry) => entry.campaign || 'Sin campaña')),
    }
  }, [analyticsBaseEntries])

  const analyticsFilteredEntries = useMemo(
    () => filterEntriesByAnalytics(analyticsBaseEntries, analyticsFilters),
    [analyticsBaseEntries, analyticsFilters],
  )

  const analyticsSeriesRows = useMemo(
    () =>
      aggregateAnalyticsRows(
        analyticsFilteredEntries,
        analyticsFilters.granularity,
        analyticsFilters.temporalAxis,
      ),
    [analyticsFilteredEntries, analyticsFilters.granularity, analyticsFilters.temporalAxis],
  )

  const analyticsSeriesRowsChronological = useMemo(
    () => [...analyticsSeriesRows].sort((a, b) => a.key.localeCompare(b.key)),
    [analyticsSeriesRows],
  )

  const analyticsSalesCurveRows = useMemo(() => {
    const grouped = new Map<string, { ingresos: number; gastos: number; tickets: number }>()
    analyticsFilteredEntries.forEach((entry) => {
      const key = getEntryAxisDate(entry, analyticsFilters.temporalAxis)
      const current = grouped.get(key) ?? { ingresos: 0, gastos: 0, tickets: 0 }
      if (entry.movementType === 'INGRESO') {
        current.ingresos += entry.amount
        current.tickets += Math.max(0, (entry.ticketCount ?? 0) - (entry.ticketRefundCount ?? 0))
      } else {
        current.gastos += entry.amount
      }
      grouped.set(key, current)
    })
    return Array.from(grouped.entries())
      .map(([key, value]) => ({
        key,
        ingresos: value.ingresos,
        gastos: value.gastos,
        beneficio: value.ingresos - value.gastos,
        margen: value.ingresos > 0 ? ((value.ingresos - value.gastos) / value.ingresos) * 100 : 0,
        tickets: value.tickets,
      }))
      .sort((a, b) => a.key.localeCompare(b.key))
  }, [analyticsFilteredEntries, analyticsFilters.temporalAxis])

  const analyticsBreakdownByGenre = useMemo(() => {
    const grouped = new Map<string, { ingresos: number; gastos: number; tickets: number }>()
    analyticsFilteredEntries.forEach((entry) => {
      const key = entry.genre || 'General'
      const current = grouped.get(key) ?? { ingresos: 0, gastos: 0, tickets: 0 }
      if (entry.movementType === 'INGRESO') {
        current.ingresos += entry.amount
        current.tickets += Math.max(0, (entry.ticketCount ?? 0) - (entry.ticketRefundCount ?? 0))
      } else {
        current.gastos += entry.amount
      }
      grouped.set(key, current)
    })
    return Array.from(grouped.entries())
      .map(([key, value]) => ({
        key,
        ingresos: value.ingresos,
        gastos: value.gastos,
        beneficio: value.ingresos - value.gastos,
        tickets: value.tickets,
      }))
      .sort((a, b) => b.ingresos - a.ingresos)
  }, [analyticsFilteredEntries])

  const analyticsBreakdownByPromoter = useMemo(() => {
    const grouped = new Map<string, { ingresos: number; tickets: number }>()
    analyticsFilteredEntries.forEach((entry) => {
      const key = entry.promoter || 'Bella Bestia'
      const current = grouped.get(key) ?? { ingresos: 0, tickets: 0 }
      if (entry.movementType === 'INGRESO') {
        current.ingresos += entry.amount
        current.tickets += Math.max(0, (entry.ticketCount ?? 0) - (entry.ticketRefundCount ?? 0))
      }
      grouped.set(key, current)
    })
    return Array.from(grouped.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.ingresos - a.ingresos)
  }, [analyticsFilteredEntries])

  const analyticsBreakdownByArtist = useMemo(() => {
    const grouped = new Map<string, { ingresos: number; tickets: number }>()
    analyticsFilteredEntries.forEach((entry) => {
      const key = entry.artist || entry.event
      const current = grouped.get(key) ?? { ingresos: 0, tickets: 0 }
      if (entry.movementType === 'INGRESO') {
        current.ingresos += entry.amount
        current.tickets += Math.max(0, (entry.ticketCount ?? 0) - (entry.ticketRefundCount ?? 0))
      }
      grouped.set(key, current)
    })
    return Array.from(grouped.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.ingresos - a.ingresos)
  }, [analyticsFilteredEntries])

  const analyticsBreakdownByWeekday = useMemo(() => {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    const grouped = new Map<string, { ingresos: number; tickets: number }>()
    analyticsFilteredEntries.forEach((entry) => {
      const axisDate = getEntryAxisDate(entry, analyticsFilters.temporalAxis)
      const date = new Date(`${axisDate}T00:00:00`)
      const jsDay = date.getDay()
      const index = jsDay === 0 ? 6 : jsDay - 1
      const key = days[index]
      const current = grouped.get(key) ?? { ingresos: 0, tickets: 0 }
      if (entry.movementType === 'INGRESO') {
        current.ingresos += entry.amount
        current.tickets += Math.max(0, (entry.ticketCount ?? 0) - (entry.ticketRefundCount ?? 0))
      }
      grouped.set(key, current)
    })
    return days.map((day) => ({ key: day, ...(grouped.get(day) ?? { ingresos: 0, tickets: 0 }) }))
  }, [analyticsFilteredEntries, analyticsFilters.temporalAxis])

  const analyticsBreakdownBySource = useMemo(() => {
    const grouped = new Map<string, { ingresos: number; tickets: number }>()
    analyticsFilteredEntries.forEach((entry) => {
      const key = `${entry.source || 'Directo'} / ${entry.medium || 'Orgánico'} / ${entry.campaign || 'Sin campaña'}`
      const current = grouped.get(key) ?? { ingresos: 0, tickets: 0 }
      if (entry.movementType === 'INGRESO') {
        current.ingresos += entry.amount
        current.tickets += Math.max(0, (entry.ticketCount ?? 0) - (entry.ticketRefundCount ?? 0))
      }
      grouped.set(key, current)
    })
    return Array.from(grouped.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.ingresos - a.ingresos)
  }, [analyticsFilteredEntries])

  const analyticsCustomerMix = useMemo(() => {
    const result = analyticsFilteredEntries.reduce(
      (acc, entry) => {
        if (entry.movementType !== 'INGRESO') {
          return acc
        }
        const tickets = Math.max(0, (entry.ticketCount ?? 0) - (entry.ticketRefundCount ?? 0))
        if ((entry.customerSegment || 'NUEVO') === 'RECURRENTE') {
          acc.recurrentes += tickets
        } else {
          acc.nuevos += tickets
        }
        return acc
      },
      { nuevos: 0, recurrentes: 0 },
    )
    const total = result.nuevos + result.recurrentes
    return {
      ...result,
      pctNuevos: getSafeRate(result.nuevos, Math.max(1, total)) * 100,
      pctRecurrentes: getSafeRate(result.recurrentes, Math.max(1, total)) * 100,
    }
  }, [analyticsFilteredEntries])

  const analyticsEventSnapshots = useMemo(() => {
    const grouped = new Map<string, LedgerEntry[]>()
    analyticsFilteredEntries.forEach((entry) => {
      const rows = grouped.get(entry.event) ?? []
      rows.push(entry)
      grouped.set(entry.event, rows)
    })

    const baseSnapshots = Array.from(grouped.entries()).map(([eventName, rows]) => {
      const ingresosRows = rows.filter((entry) => entry.movementType === 'INGRESO')
      const gastosRows = rows.filter((entry) => entry.movementType === 'GASTO')

      const ticketsPagados = ingresosRows.reduce((acc, entry) => acc + (entry.ticketCount ?? 0), 0)
      const ticketsComp = ingresosRows.reduce((acc, entry) => acc + (entry.ticketCompCount ?? 0), 0)
      const ticketsDevueltos = rows.reduce((acc, entry) => acc + (entry.ticketRefundCount ?? 0), 0)
      const ticketsValidosEmitidos = Math.max(0, ticketsPagados + ticketsComp - ticketsDevueltos)
      const scannedTickets = Math.min(
        ticketsValidosEmitidos,
        rows.reduce((acc, entry) => acc + (entry.scannedCount ?? 0), 0),
      )

      const ingresosBrutos = ingresosRows.reduce((acc, entry) => acc + entry.amount, 0)
      const discountAmount = ingresosRows.reduce((acc, entry) => acc + (entry.discountAmount ?? 0), 0)
      const feeAssumedAmount = ingresosRows.reduce((acc, entry) => acc + (entry.feeAssumedAmount ?? 0), 0)
      const avgTicketAmount = ticketsPagados > 0 ? ingresosBrutos / ticketsPagados : 0
      const refundAmount = ticketsDevueltos * avgTicketAmount
      const ingresosNetos = Math.max(0, ingresosBrutos - refundAmount - discountAmount - feeAssumedAmount)
      const gastos = gastosRows.reduce((acc, entry) => acc + entry.amount, 0)
      const beneficio = ingresosNetos - gastos

      const totalCapacity = Math.max(...rows.map((entry) => entry.totalCapacity ?? 0), 600)
      const releasedCapacity = Math.max(...rows.map((entry) => entry.releasedCapacity ?? 0), totalCapacity)
      const sellableCapacity = Math.max(
        1,
        ...rows.map((entry) => entry.sellableCapacity ?? 0),
        Math.round(releasedCapacity * 0.96),
      )

      const ocupacion = getSafeRate(ticketsValidosEmitidos, sellableCapacity)
      const ocupacionPagada = getSafeRate(ticketsPagados, sellableCapacity)
      const scanRate = getSafeRate(scannedTickets, ticketsValidosEmitidos)
      const noShowRate = Math.max(0, 1 - scanRate)
      const refundRate = getSafeRate(ticketsDevueltos, Math.max(1, ticketsPagados))
      const pctCortesias = getSafeRate(ticketsComp, Math.max(1, ticketsValidosEmitidos))
      const revenuePorAsistente = getSafeRate(ingresosNetos, Math.max(1, scannedTickets))
      const directCostAmount = rows.reduce((acc, entry) => acc + (entry.directCostAmount ?? 0), 0)
      const margenBruto = ingresosNetos - directCostAmount
      const waitlistCount = Math.max(...rows.map((entry) => entry.waitlistCount ?? 0), 0)
      const slotsDisponibles = Math.max(...rows.map((entry) => entry.slotsAvailable ?? 0), 30)
      const slotsOcupados = Math.max(...rows.map((entry) => entry.slotsOccupied ?? 0), 1)

      const sortedByEventDate = [...rows].sort((a, b) =>
        getEntryEventDateTime(a).localeCompare(getEntryEventDateTime(b)),
      )
      const sortedByPurchase = [...rows].sort((a, b) =>
        (a.purchaseDate || a.date).localeCompare(b.purchaseDate || b.date),
      )
      const eventDateTime = getEntryEventDateTime(sortedByEventDate[0])
      const purchaseFirstDate = sortedByPurchase[0].purchaseDate || sortedByPurchase[0].date

      return {
        event: eventName,
        eventDateTime,
        purchaseFirstDate,
        artist: sortedByEventDate[0].artist || eventName,
        genre: sortedByEventDate[0].genre || 'General',
        promoter: sortedByEventDate[0].promoter || 'Bella Bestia',
        venueSpace: sortedByEventDate[0].venueSpace || 'Sala principal',
        zoneSection: sortedByEventDate[0].zoneSection || 'General',
        ticketType: sortedByEventDate[0].ticketType || 'General',
        eventStatus:
          sortedByEventDate[0].eventStatus || inferEventStatus(eventDateTime),
        totalCapacity,
        releasedCapacity,
        sellableCapacity,
        ticketsPagados,
        ticketsComp,
        ticketsDevueltos,
        ticketsValidosEmitidos,
        scannedTickets,
        ingresosBrutos,
        ingresosNetos,
        gastos,
        beneficio,
        ocupacion,
        ocupacionPagada,
        scanRate,
        noShowRate,
        refundRate,
        pctCortesias,
        paceIndex: 1,
        riskLevel: 'BAJO' as const,
        waitlistCount,
        directCostAmount,
        revenuePorAsistente,
        margenBruto,
        slotsDisponibles,
        slotsOcupados,
      }
    })

    return baseSnapshots.map((snapshot) => {
      const comparables = baseSnapshots.filter(
        (candidate) =>
          candidate.event !== snapshot.event &&
          (candidate.genre === snapshot.genre ||
            candidate.promoter === snapshot.promoter ||
            candidate.venueSpace === snapshot.venueSpace),
      )
      const baseline = comparables.length
        ? comparables.reduce((acc, row) => acc + row.ocupacionPagada, 0) /
          comparables.length
        : baseSnapshots.length > 1
          ? baseSnapshots
              .filter((row) => row.event !== snapshot.event)
              .reduce((acc, row) => acc + row.ocupacionPagada, 0) /
            Math.max(1, baseSnapshots.length - 1)
          : snapshot.ocupacionPagada || 1
      const paceIndex = baseline > 0 ? snapshot.ocupacionPagada / baseline : 1
      const eventDate = getIsoDateFromDateTime(snapshot.eventDateTime)
      const daysToEvent = diffDays(getTodayISODate(), eventDate)

      let riskLevel: EventAnalyticsSnapshot['riskLevel'] = 'BAJO'
      if (daysToEvent >= 0) {
        if (
          paceIndex < ANALYTICS_RISK_CONFIG.paceIndexDanger ||
          snapshot.ocupacionPagada < ANALYTICS_RISK_CONFIG.occupancyDanger
        ) {
          riskLevel = 'ALTO'
        } else if (
          paceIndex < ANALYTICS_RISK_CONFIG.paceIndexWarning ||
          snapshot.ocupacionPagada < ANALYTICS_RISK_CONFIG.occupancyWarning
        ) {
          riskLevel = 'MEDIO'
        }
      }

      return {
        ...snapshot,
        paceIndex,
        riskLevel,
      }
    })
  }, [analyticsFilteredEntries])

  const analyticsUpcomingEvents = useMemo(
    () =>
      analyticsEventSnapshots
        .filter(
          (snapshot) =>
            diffDays(getTodayISODate(), getIsoDateFromDateTime(snapshot.eventDateTime)) >= 0,
        )
        .sort((a, b) => a.eventDateTime.localeCompare(b.eventDateTime)),
    [analyticsEventSnapshots],
  )

  const analyticsTopEvents = useMemo(
    () => [...analyticsEventSnapshots].sort((a, b) => b.beneficio - a.beneficio).slice(0, 5),
    [analyticsEventSnapshots],
  )

  const analyticsBottomEvents = useMemo(
    () => [...analyticsEventSnapshots].sort((a, b) => a.beneficio - b.beneficio).slice(0, 5),
    [analyticsEventSnapshots],
  )

  const analyticsSelectedEvent =
    selectedEventDrilldown === 'TODOS'
      ? analyticsEventSnapshots[0]
      : analyticsEventSnapshots.find((event) => event.event === selectedEventDrilldown)

  const analyticsSelectedEventEntries = useMemo(() => {
    if (!analyticsSelectedEvent) {
      return []
    }
    return analyticsFilteredEntries.filter(
      (entry) => entry.event === analyticsSelectedEvent.event,
    )
  }, [analyticsFilteredEntries, analyticsSelectedEvent])

  const analyticsSelectedEventTimeline = useMemo(() => {
    if (!analyticsSelectedEvent) {
      return []
    }
    return aggregateAnalyticsRows(
      analyticsSelectedEventEntries,
      'semana',
      analyticsFilters.temporalAxis,
    ).sort((a, b) => a.key.localeCompare(b.key))
  }, [analyticsSelectedEvent, analyticsSelectedEventEntries, analyticsFilters.temporalAxis])

  const analyticsSelectedEventByZone = useMemo(() => {
    const grouped = new Map<string, { ingresos: number; tickets: number }>()
    analyticsSelectedEventEntries.forEach((entry) => {
      const key = entry.zoneSection || 'General'
      const current = grouped.get(key) ?? { ingresos: 0, tickets: 0 }
      if (entry.movementType === 'INGRESO') {
        current.ingresos += entry.amount
        current.tickets += Math.max(0, (entry.ticketCount ?? 0) - (entry.ticketRefundCount ?? 0))
      }
      grouped.set(key, current)
    })
    return Array.from(grouped.entries()).map(([key, value]) => ({ key, ...value }))
  }, [analyticsSelectedEventEntries])

  const analyticsSelectedEventByTicketType = useMemo(() => {
    const grouped = new Map<string, { ingresos: number; tickets: number }>()
    analyticsSelectedEventEntries.forEach((entry) => {
      const key = entry.ticketType || 'General'
      const current = grouped.get(key) ?? { ingresos: 0, tickets: 0 }
      if (entry.movementType === 'INGRESO') {
        current.ingresos += entry.amount
        current.tickets += Math.max(0, (entry.ticketCount ?? 0) - (entry.ticketRefundCount ?? 0))
      }
      grouped.set(key, current)
    })
    return Array.from(grouped.entries()).map(([key, value]) => ({ key, ...value }))
  }, [analyticsSelectedEventEntries])

  const analyticsKpiValues = useMemo(() => {
    const ingresosBrutos = analyticsEventSnapshots.reduce((acc, row) => acc + row.ingresosBrutos, 0)
    const ingresosNetos = analyticsEventSnapshots.reduce((acc, row) => acc + row.ingresosNetos, 0)
    const ticketsVendidosNetos = analyticsEventSnapshots.reduce(
      (acc, row) => acc + Math.max(0, row.ticketsPagados - row.ticketsDevueltos),
      0,
    )
    const ticketsPagadosTotal = analyticsEventSnapshots.reduce((acc, row) => acc + row.ticketsPagados, 0)
    const ticketsValidos = analyticsEventSnapshots.reduce((acc, row) => acc + row.ticketsValidosEmitidos, 0)
    const ticketsComp = analyticsEventSnapshots.reduce((acc, row) => acc + row.ticketsComp, 0)
    const ticketsDevueltos = analyticsEventSnapshots.reduce((acc, row) => acc + row.ticketsDevueltos, 0)
    const scanned = analyticsEventSnapshots.reduce((acc, row) => acc + row.scannedTickets, 0)
    const gastos = analyticsEventSnapshots.reduce((acc, row) => acc + row.gastos, 0)
    const totalSellable = analyticsEventSnapshots.reduce((acc, row) => acc + row.sellableCapacity, 0)
    const totalSlots = analyticsEventSnapshots.reduce((acc, row) => acc + row.slotsDisponibles, 0)
    const occupiedSlots = analyticsEventSnapshots.reduce((acc, row) => acc + row.slotsOcupados, 0)
    const riskEvents = analyticsUpcomingEvents.filter((event) => event.riskLevel !== 'BAJO').length
    const soldOutEvents = analyticsEventSnapshots.filter(
      (event) => event.ocupacionPagada >= ANALYTICS_RISK_CONFIG.soldOutThreshold,
    ).length
    const totalEvents = analyticsEventSnapshots.length
    const totalRevenueVolume = ingresosBrutos + gastos
    const avgPace =
      analyticsEventSnapshots.length > 0
        ? analyticsEventSnapshots.reduce((acc, row) => acc + row.paceIndex, 0) /
          analyticsEventSnapshots.length
        : 0

    const rhythmBaseDate = analyticsFilters.dateTo
    const sevenDays = addDaysISO(rhythmBaseDate, -6)
    const fourteenDays = addDaysISO(rhythmBaseDate, -13)
    const thirtyDays = addDaysISO(rhythmBaseDate, -29)

    const amountForWindow = (fromDate: string) =>
      analyticsFilteredEntries
        .filter(
          (entry) =>
            entry.movementType === 'INGRESO' &&
            getEntryAxisDate(entry, analyticsFilters.temporalAxis) >= fromDate &&
            getEntryAxisDate(entry, analyticsFilters.temporalAxis) <= rhythmBaseDate,
        )
        .reduce((acc, entry) => acc + entry.amount, 0)

    const ritmo7 = amountForWindow(sevenDays)
    const ritmo14 = amountForWindow(fourteenDays)
    const ritmo30 = amountForWindow(thirtyDays)

    return {
      ingresos_brutos: ingresosBrutos,
      ingresos_netos: ingresosNetos,
      tickets_vendidos_netos: ticketsVendidosNetos,
      precio_medio_ticket: getSafeRate(ingresosNetos, Math.max(1, ticketsVendidosNetos)),
      ocupacion: getSafeRate(ticketsValidos, Math.max(1, totalSellable)),
      ocupacion_pagada: getSafeRate(ticketsPagadosTotal, Math.max(1, totalSellable)),
      asistencia_escaneada: scanned,
      scan_rate: getSafeRate(scanned, Math.max(1, ticketsValidos)),
      no_show_rate: Math.max(0, 1 - getSafeRate(scanned, Math.max(1, ticketsValidos))),
      refund_rate: getSafeRate(ticketsDevueltos, Math.max(1, ticketsPagadosTotal)),
      pct_cortesias: getSafeRate(ticketsComp, Math.max(1, ticketsValidos)),
      ritmo_venta_7d: ritmo7,
      ritmo_venta_14d: ritmo14,
      ritmo_venta_30d: ritmo30,
      pace_index: avgPace,
      utilizacion_sala: getSafeRate(occupiedSlots, Math.max(1, totalSlots)),
      revenue_por_asistente: getSafeRate(ingresosNetos, Math.max(1, scanned)),
      revenue_por_dia_disponible: getSafeRate(ingresosNetos, Math.max(1, totalSlots)),
      numero_eventos: totalEvents,
      numero_eventos_sold_out: soldOutEvents,
      numero_eventos_en_riesgo: riskEvents,
      _gastos: gastos,
      _total_volume: totalRevenueVolume,
    } as Record<DashboardKpiId, number> & { _gastos: number; _total_volume: number }
  }, [analyticsEventSnapshots, analyticsFilteredEntries, analyticsFilters.dateTo, analyticsFilters.temporalAxis, analyticsUpcomingEvents])

  const analyticsPreviousPeriodKpis = useMemo(() => {
    const previous = previousRange(analyticsFilters.dateFrom, analyticsFilters.dateTo)
    const previousEntries = filterEntriesByAnalytics(
      analyticsBaseEntries,
      analyticsFilters,
      previous.from,
      previous.to,
    )
    const previousRows = aggregateAnalyticsRows(
      previousEntries,
      'evento',
      analyticsFilters.temporalAxis,
    )
    const ingresosBrutos = previousEntries
      .filter((entry) => entry.movementType === 'INGRESO')
      .reduce((acc, entry) => acc + entry.amount, 0)
    const ingresosNetos = ingresosBrutos -
      previousEntries
        .filter((entry) => entry.movementType === 'INGRESO')
        .reduce((acc, entry) => acc + (entry.discountAmount ?? 0) + (entry.feeAssumedAmount ?? 0), 0)
    const ticketsNetos = previousEntries
      .filter((entry) => entry.movementType === 'INGRESO')
      .reduce((acc, entry) => acc + (entry.ticketCount ?? 0) - (entry.ticketRefundCount ?? 0), 0)

    return {
      ...createZeroKpiMap(),
      ingresos_brutos: ingresosBrutos,
      ingresos_netos: ingresosNetos,
      tickets_vendidos_netos: ticketsNetos,
      numero_eventos: previousRows.length,
    } satisfies Record<DashboardKpiId, number>
  }, [analyticsBaseEntries, analyticsFilters])

  const analyticsYearAgoKpis = useMemo(() => {
    const yearAgo = yearAgoRange(analyticsFilters.dateFrom, analyticsFilters.dateTo)
    const entriesYearAgo = filterEntriesByAnalytics(
      analyticsBaseEntries,
      analyticsFilters,
      yearAgo.from,
      yearAgo.to,
    )
    const ingresosBrutos = entriesYearAgo
      .filter((entry) => entry.movementType === 'INGRESO')
      .reduce((acc, entry) => acc + entry.amount, 0)
    const ingresosNetos = ingresosBrutos -
      entriesYearAgo
        .filter((entry) => entry.movementType === 'INGRESO')
        .reduce((acc, entry) => acc + (entry.discountAmount ?? 0) + (entry.feeAssumedAmount ?? 0), 0)
    const ticketsNetos = entriesYearAgo
      .filter((entry) => entry.movementType === 'INGRESO')
      .reduce((acc, entry) => acc + (entry.ticketCount ?? 0) - (entry.ticketRefundCount ?? 0), 0)

    return {
      ...createZeroKpiMap(),
      ingresos_brutos: ingresosBrutos,
      ingresos_netos: ingresosNetos,
      tickets_vendidos_netos: ticketsNetos,
    } satisfies Record<DashboardKpiId, number>
  }, [analyticsBaseEntries, analyticsFilters])

  useEffect(() => {
    if (analyticsEventSnapshots.length === 0) {
      setSelectedEventDrilldown('TODOS')
      return
    }
    const exists = analyticsEventSnapshots.some(
      (snapshot) => snapshot.event === selectedEventDrilldown,
    )
    if (!exists) {
      setSelectedEventDrilldown(analyticsEventSnapshots[0].event)
    }
  }, [analyticsEventSnapshots, selectedEventDrilldown])

  const diaryEntries = useMemo(() => {
    const search = diarySearch.trim().toLowerCase()

    return [...entries]
      .filter((entry) => {
        if (diaryPreset !== 'todo') {
          const from = diaryDateFrom || '0000-01-01'
          const to = diaryDateTo || '9999-12-31'
          if (entry.date < from || entry.date > to) {
            return false
          }
        }

        if (diaryTypeFilter !== 'TODOS' && entry.movementType !== diaryTypeFilter) {
          return false
        }

        if (diaryMethodFilter !== 'TODOS' && entry.paymentMethod !== diaryMethodFilter) {
          return false
        }

        if (diaryEventFilter !== 'TODOS' && entry.event !== diaryEventFilter) {
          return false
        }

        if (!search) {
          return true
        }

        const haystack = `${entry.concept} ${entry.category} ${entry.notes}`.toLowerCase()
        return haystack.includes(search)
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [
    entries,
    diaryPreset,
    diaryDateFrom,
    diaryDateTo,
    diaryTypeFilter,
    diaryMethodFilter,
    diaryEventFilter,
    diarySearch,
  ])

  const diaryTotals = useMemo(() => {
    const ingresos = diaryEntries
      .filter((entry) => entry.movementType === 'INGRESO')
      .reduce((acc, entry) => acc + entry.amount, 0)
    const gastos = diaryEntries
      .filter((entry) => entry.movementType === 'GASTO')
      .reduce((acc, entry) => acc + entry.amount, 0)
    return {
      ingresos,
      gastos,
      balance: ingresos - gastos,
    }
  }, [diaryEntries])

  function calculateDraftTotals(draft: MovementDraft) {
    const baseAmount = parseAmountEs(draft.baseAmount)
    const vatRate = getVatRate(draft.vatType)
    const vatAmount = Number.isFinite(baseAmount)
      ? roundMoney(baseAmount * (vatRate / 100))
      : 0
    const withholdingAmount = Number.isFinite(baseAmount)
      ? roundMoney(baseAmount * (draft.withholdingRate / 100))
      : 0
    const discountAmount = parseAmountEs(draft.discountAmount)
    const feeAssumedAmount = parseAmountEs(draft.feeAssumedAmount)
    const totalAmount = Number.isFinite(baseAmount)
      ? roundMoney(
          baseAmount +
            vatAmount -
            withholdingAmount -
            (Number.isFinite(discountAmount) ? discountAmount : 0) -
            (Number.isFinite(feeAssumedAmount) ? feeAssumedAmount : 0),
        )
      : 0
    return {
      baseAmount,
      vatRate,
      vatAmount,
      withholdingAmount,
      discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
      feeAssumedAmount: Number.isFinite(feeAssumedAmount) ? feeAssumedAmount : 0,
      totalAmount,
    }
  }

  const activeMovementDraft =
    movementFormType === 'INGRESO' ? draftIncome : draftExpense
  const activeMovementTotals = calculateDraftTotals(activeMovementDraft)
  const isEditingCurrentMovement =
    editingId !== null && editingType === movementFormType
  const movementUi = MOVEMENT_UI[movementFormType]

  function handleExportCsvCombined() {
    exportEntriesToCsv(entries, 'combinado')
  }

  function handleExportCsvIngresos() {
    exportEntriesToCsv(entries, 'ingresos')
  }

  function handleExportCsvGastos() {
    exportEntriesToCsv(entries, 'gastos')
  }

  function handleExportExcel() {
    exportEntriesToExcel(entries)
  }

  function handleExportJson() {
    exportEntriesToJson(entries)
  }

  function handleDiaryPresetChange(preset: DiaryRangePreset) {
    setDiaryPreset(preset)
    if (preset === 'custom') {
      return
    }
    const range = getRangeByPreset(preset)
    setDiaryDateFrom(range.from)
    setDiaryDateTo(range.to)
  }

  function handleAnalysisPresetChange(preset: AnalysisRangePreset) {
    setAnalysisPreset(preset)
    setViewMode(resolveAnalysisViewModeFromPreset(preset))
    setDashboardChartPeriod('todo')
    if (preset === 'custom') {
      return
    }
    const range = getAnalysisRangeByPreset(preset)
    setAnalysisDateFrom(range.from)
    setAnalysisDateTo(range.to)
    setSelectedBucket('TODOS')
  }

  function handleReportPresetChange(preset: ReportRangePreset) {
    setReportPreset(preset)
    setReportChartPeriod('todo')
    if (preset === 'custom') {
      return
    }
    const range = getReportRangeByPreset(preset)
    setReportDateFrom(range.from)
    setReportDateTo(range.to)
  }

  function handleToggleDashboardMetric(metric: MetricKey) {
    setDashboardMetricsVisible((prev) => {
      const next = { ...prev, [metric]: !prev[metric] }
      const anyVisible = Object.values(next).some(Boolean)
      if (anyVisible) {
        return next
      }
      return { ...next, [metric]: true }
    })
  }

  function handleToggleReportMetric(metric: MetricKey) {
    setReportMetricsVisible((prev) => {
      const next = { ...prev, [metric]: !prev[metric] }
      const anyVisible = Object.values(next).some(Boolean)
      if (anyVisible) {
        return next
      }
      return { ...next, [metric]: true }
    })
  }

  function handleExportReportSummaryCsv() {
    exportReportSummaryToCsv(reportEntries, reportMode)
  }

  function handleExportReportSummaryExcel() {
    exportReportSummaryToExcel(reportEntries, reportMode)
  }

  function handleExportReportJson() {
    exportReportToJson({
      entries: reportEntries,
      mode: reportMode,
      scope: reportScope,
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
      preset: reportPreset,
    })
  }

  async function handlePrintCorporateReport() {
    setSourceSyncError('')
    setSourceSyncMessage('')
    setIsPrintingReport(true)

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const marginX = 14
      const usableWidth = pageWidth - marginX * 2
      const logoDataUrl = await loadImageAsDataUrl(logoBellaBestia)
      const topRows = [...reportRows].sort((a, b) => b.beneficio - a.beneficio).slice(0, 10)
      const riskRows = [...reportRows].sort((a, b) => a.beneficio - b.beneficio).slice(0, 10)
      const monthRows = reportMonthlyRows.slice(-12)
      let cumulativeBenefit = 0
      const cumulativeMonthRows = monthRows.map((row) => {
        cumulativeBenefit += row.beneficio
        return { ...row, beneficio: cumulativeBenefit }
      })
      const reportScenarioRows = buildScenarioRowsFromTotals(
        reportTotals.ingresos,
        reportTotals.gastos,
        scenarioAdjustments,
      )
      const scenarioBase = reportScenarioRows[0]
      const monthlyWindows = [
        { label: 'Últimos 3 meses', months: 3 },
        { label: 'Últimos 6 meses', months: 6 },
        { label: 'Últimos 12 meses', months: 12 },
      ]
      const windowSummaryRows = monthlyWindows.map(({ label, months }) => {
        const scopedRows = monthRows.slice(-months)
        const ingresos = scopedRows.reduce((acc, row) => acc + row.ingresos, 0)
        const gastos = scopedRows.reduce((acc, row) => acc + row.gastos, 0)
        const beneficio = ingresos - gastos
        const margen = ingresos > 0 ? (beneficio / ingresos) * 100 : 0
        return {
          label,
          meses: scopedRows.length,
          ingresos,
          gastos,
          beneficio,
          margen,
        }
      })
      const recentRows = [...reportEntries]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 40)
      const reportTypeRows = reportTypeSummaryRows.slice(0, 10)
      const reportTimeRows = reportTimeSlotSummaryRows.slice(0, 10)
      const reportEventRows = reportRowsByEvent.slice(0, 15)
      const snapshotChartRows = reportWindowSnapshots.map((row) => ({
        key: row.label,
        ingresos: row.ingresos,
        gastos: row.gastos,
        beneficio: row.beneficio,
        margen: row.margen,
      }))
      const windowChartRows = windowSummaryRows.map((row) => ({
        key: row.label,
        ingresos: row.ingresos,
        gastos: row.gastos,
        beneficio: row.beneficio,
        margen: row.margen,
      }))
      const kpiChartRows = reportKpiIndexes.map((index) => ({
        label: index.label,
        score: index.score,
      }))

      const addSectionHeader = (title: string, subtitle: string) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(15)
        doc.setTextColor(120, 15, 32)
        doc.text(title, marginX, 18)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(45, 45, 45)
        doc.text(subtitle, marginX, 25)
      }

      doc.setFillColor(94, 12, 34)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')
      doc.setFillColor(217, 34, 47)
      doc.rect(0, 0, pageWidth, 174, 'F')
      doc.setFillColor(245, 191, 24)
      doc.rect(0, 174, pageWidth, pageHeight - 174, 'F')
      doc.setFillColor(18, 73, 116)
      doc.circle(pageWidth - 24, 24, 18, 'F')

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', pageWidth / 2 - 23, 18, 46, 46)
      }

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(31)
      doc.text('BELLA BESTIA', pageWidth / 2, 88, { align: 'center' })
      doc.setFontSize(18)
      doc.text('INFORME CORPORATIVO', pageWidth / 2, 101, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      doc.text(`Período: ${reportPeriodLabel}`, pageWidth / 2, 116, { align: 'center' })
      doc.text(`Alcance: ${ANALYSIS_SCOPE_LABEL[reportScope]}`, pageWidth / 2, 124, {
        align: 'center',
      })
      doc.text(`Generado: ${reportGeneratedAt}`, pageWidth / 2, 132, { align: 'center' })

      doc.setTextColor(30, 30, 30)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Resumen ejecutivo para junta directiva', marginX, 190)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10.8)
      doc.text(`- Ingresos: ${CURRENCY.format(reportTotals.ingresos)}`, marginX, 199)
      doc.text(`- Gastos: ${CURRENCY.format(reportTotals.gastos)}`, marginX, 207)
      doc.text(`- Beneficio neto: ${CURRENCY.format(reportTotals.beneficio)}`, marginX, 215)
      doc.text(`- Margen: ${formatPercent(reportTotals.margen)}`, marginX, 223)
      doc.text(`- Líneas analizadas: ${NUMBER_0.format(reportEntries.length)}`, marginX, 231)
      doc.text(
        `- Bloques positivos: ${NUMBER_0.format(reportPositiveBuckets)} | Bloques en alerta: ${NUMBER_0.format(reportNegativeBuckets)}`,
        marginX,
        239,
      )

      doc.addPage()
      addSectionHeader('Índice ejecutivo', 'Páginas y estructura del informe')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11.2)
      const indexRows = [
        ['1. Situación automática por ventanas temporales', 'página 3'],
        ['2. Tendencia consolidada por ventana temporal', 'página 4'],
        ['3. Índices KPI de dirección', 'página 5'],
        ['4. Ranking de bloques rentables', 'página 6'],
        ['5. Ranking de bloques en alerta', 'página 7'],
        ['6. Rentabilidad por tipo de evento y franja horaria', 'página 8'],
        ['7. Tendencias visuales de ingresos y gastos', 'página 9'],
        ['8. Tendencias visuales de beneficio y balance', 'página 10'],
        ['9. Escenarios base, optimista y pesimista', 'página 11'],
        ['10. Rentabilidad por evento', 'página 12'],
        ['11. Detalle operativo de líneas recientes', 'página 13'],
        ['12. Cierre ejecutivo y plan 30-60-90', 'página 14'],
      ]
      indexRows.forEach((row, index) => {
        doc.text(row[0], marginX, 38 + index * 9)
        doc.text(row[1], pageWidth - marginX, 38 + index * 9, { align: 'right' })
      })

      const addTablePage = (
        title: string,
        subtitle: string,
        head: string[],
        body: string[][],
        options?: {
          tableStartY?: number
          drawVisuals?: () => void
        },
      ) => {
        doc.addPage()
        addSectionHeader(title, subtitle)
        if (options?.drawVisuals) {
          options.drawVisuals()
        }
        autoTable(doc, {
          startY: options?.tableStartY ?? 30,
          head: [head],
          body,
          margin: { left: marginX, right: marginX },
          styles: {
            fontSize: 8.6,
            cellPadding: 2,
            textColor: [20, 20, 20],
            lineColor: [225, 225, 225],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [217, 34, 47],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250],
          },
          theme: 'grid',
        })
      }

      addTablePage(
        '1) Situación automática',
        'Comparativa de ventanas fijas para seguimiento de negocio.',
        ['Ventana', 'Período', 'Mov.', 'Ingresos', 'Gastos', 'Beneficio', 'Margen'],
        reportWindowSnapshots.map((row) => [
          row.label,
          `${formatDate(row.from)} - ${formatDate(row.to)}`,
          NUMBER_0.format(row.movements),
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
          formatPercent(row.margen),
        ]),
        {
          tableStartY: 134,
          drawVisuals: () => {
            drawPdfComparativeBars(doc, {
              x: marginX,
              y: 34,
              width: usableWidth,
              height: 94,
              title: 'Barras comparativas por ventana',
              rows: snapshotChartRows,
              maxRows: 4,
            })
          },
        },
      )

      addTablePage(
        '2) Tendencia consolidada por ventana',
        'Resumen agregado por tramos móviles de tiempo.',
        ['Ventana', 'Meses usados', 'Ingresos', 'Gastos', 'Beneficio', 'Margen'],
        windowSummaryRows.map((row) => [
          row.label,
          NUMBER_0.format(row.meses),
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
          formatPercent(row.margen),
        ]),
        {
          tableStartY: 134,
          drawVisuals: () => {
            drawPdfComparativeBars(doc, {
              x: marginX,
              y: 34,
              width: usableWidth,
              height: 94,
              title: 'Comparativa de ingresos y gastos por ventanas temporales',
              rows: windowChartRows,
              maxRows: 3,
            })
          },
        },
      )

      addTablePage(
        '3) Índices KPI de dirección',
        'Puntuación sintética para comité: 0-100.',
        ['Indicador', 'Puntuación', 'Lectura'],
        reportKpiIndexes.map((index) => [
          index.label,
          `${NUMBER_0.format(index.score)}/100`,
          index.insight,
        ]),
        {
          tableStartY: 134,
          drawVisuals: () => {
            drawPdfIndexBars(doc, {
              x: marginX,
              y: 34,
              width: usableWidth,
              height: 94,
              title: 'Lectura visual de KPI (escala 0-100)',
              rows: kpiChartRows,
            })
          },
        },
      )

      addTablePage(
        '4) Bloques más rentables',
        'Top por beneficio para proteger palancas de crecimiento.',
        ['Bloque', 'Mov.', 'Ingresos', 'Gastos', 'Beneficio', 'Margen'],
        topRows.map((row) => [
          row.key,
          NUMBER_0.format(reportMovementCountByBucket[row.key] ?? 0),
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
          formatPercent(row.margen),
        ]),
        {
          tableStartY: 134,
          drawVisuals: () => {
            drawPdfComparativeBars(doc, {
              x: marginX,
              y: 34,
              width: usableWidth,
              height: 94,
              title: 'Barras comparativas del top rentable',
              rows: topRows,
              maxRows: 8,
            })
          },
        },
      )

      addTablePage(
        '5) Bloques a vigilar',
        'Foco en desviaciones para plan de acción inmediato.',
        ['Bloque', 'Mov.', 'Ingresos', 'Gastos', 'Beneficio', 'Margen'],
        riskRows.map((row) => [
          row.key,
          NUMBER_0.format(reportMovementCountByBucket[row.key] ?? 0),
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
          formatPercent(row.margen),
        ]),
        {
          tableStartY: 134,
          drawVisuals: () => {
            drawPdfComparativeBars(doc, {
              x: marginX,
              y: 34,
              width: usableWidth,
              height: 94,
              title: 'Barras comparativas de bloques en alerta',
              rows: riskRows,
              maxRows: 8,
            })
          },
        },
      )

      doc.addPage()
      addSectionHeader(
        '6) Rentabilidad por tipo y franja',
        'Lectura ejecutiva para decidir qué formato de evento potenciar.',
      )
      drawPdfRankingBars(doc, {
        x: marginX,
        y: 32,
        width: (usableWidth - 6) / 2,
        height: 88,
        title: 'Tipo de evento (beneficio)',
        rows: reportTypeRows,
        maxRows: 8,
        positiveColor: '#145d91',
      })
      drawPdfRankingBars(doc, {
        x: marginX + (usableWidth - 6) / 2 + 6,
        y: 32,
        width: (usableWidth - 6) / 2,
        height: 88,
        title: 'Franja horaria (beneficio)',
        rows: reportTimeRows,
        maxRows: 8,
        positiveColor: '#d9222f',
      })
      autoTable(doc, {
        startY: 126,
        head: [['Tipo de evento', 'Ingresos', 'Gastos', 'Beneficio', 'Margen']],
        body: reportTypeRows.map((row) => [
          row.key,
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
          formatPercent(row.margen),
        ]),
        margin: { left: marginX, right: pageWidth / 2 + 2 },
        styles: { fontSize: 8.1, cellPadding: 1.8 },
        headStyles: { fillColor: [18, 73, 116], textColor: [255, 255, 255] },
        theme: 'grid',
      })
      autoTable(doc, {
        startY: 126,
        head: [['Franja horaria', 'Ingresos', 'Gastos', 'Beneficio', 'Margen']],
        body: reportTimeRows.map((row) => [
          row.key,
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
          formatPercent(row.margen),
        ]),
        margin: { left: pageWidth / 2 + 2, right: marginX },
        styles: { fontSize: 8.1, cellPadding: 1.8 },
        headStyles: { fillColor: [217, 34, 47], textColor: [255, 255, 255] },
        theme: 'grid',
      })

      doc.addPage()
      addSectionHeader(
        '7) Tendencias visuales (ingresos y gastos)',
        'Lectura mensual para detectar aceleración o tensión de coste.',
      )
      drawPdfLineChart(doc, {
        x: marginX,
        y: 32,
        width: usableWidth,
        height: 96,
        title: 'Ingresos mensuales',
        rows: monthRows,
        metric: 'ingresos',
        color: METRIC_META.ingresos.color,
      })
      drawPdfLineChart(doc, {
        x: marginX,
        y: 134,
        width: usableWidth,
        height: 96,
        title: 'Gastos mensuales',
        rows: monthRows,
        metric: 'gastos',
        color: METRIC_META.gastos.color,
      })

      doc.addPage()
      addSectionHeader(
        '8) Tendencias visuales (beneficio y acumulado)',
        'Seguimiento del resultado y su progresión acumulada.',
      )
      drawPdfLineChart(doc, {
        x: marginX,
        y: 32,
        width: usableWidth,
        height: 96,
        title: 'Beneficio mensual',
        rows: monthRows,
        metric: 'beneficio',
        color: METRIC_META.beneficio.color,
      })
      drawPdfLineChart(doc, {
        x: marginX,
        y: 134,
        width: usableWidth,
        height: 96,
        title: 'Balance acumulado',
        rows: cumulativeMonthRows,
        metric: 'beneficio',
        color: '#145d91',
      })

      doc.addPage()
      addSectionHeader(
        '9) Escenarios y mix operativo',
        'Comparativa de escenarios con distribución por método.',
      )
      drawPdfScenarioBars(doc, {
        x: marginX,
        y: 32,
        width: usableWidth,
        height: 84,
        title: 'Escenarios (base, optimista, pesimista)',
        rows: reportScenarioRows,
      })
      drawPdfMethodBars(doc, {
        x: marginX,
        y: 122,
        width: usableWidth,
        height: 56,
        title: 'Mix por método de cobro/pago',
        slices: reportPaymentSlices,
      })
      autoTable(doc, {
        startY: 184,
        head: [['Escenario', 'Ingresos', 'Gastos', 'Beneficio', 'Margen', 'Δ vs base']],
        body: reportScenarioRows.map((row) => {
          const margin = row.income > 0 ? (row.net / row.income) * 100 : 0
          const delta = row.net - scenarioBase.net
          return [
            row.name,
            CURRENCY.format(row.income),
            CURRENCY.format(row.expense),
            CURRENCY.format(row.net),
            formatPercent(margin),
            `${delta >= 0 ? '+' : ''}${CURRENCY.format(delta)}`,
          ]
        }),
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 8.4, cellPadding: 2 },
        headStyles: { fillColor: [120, 15, 32], textColor: [255, 255, 255] },
        theme: 'grid',
      })

      addTablePage(
        '10) Rentabilidad por evento',
        'Visión completa de todos los eventos del período seleccionado.',
        ['Evento', 'Mov.', 'Ingresos', 'Gastos', 'Beneficio', 'Margen'],
        reportEventRows.map((row) => [
          row.key,
          NUMBER_0.format(reportMovementCountByEvent[row.key] ?? 0),
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
          formatPercent(row.margen),
        ]),
        {
          tableStartY: 134,
          drawVisuals: () => {
            drawPdfComparativeBars(doc, {
              x: marginX,
              y: 34,
              width: usableWidth,
              height: 94,
              title: 'Comparativa de ingresos y gastos por evento',
              rows: reportEventRows,
              maxRows: 8,
            })
          },
        },
      )

      addTablePage(
        '11) Detalle de líneas recientes',
        'Detalle operativo para revisar en comité.',
        ['Fecha', 'Evento', 'Tipo', 'Categoría', 'Concepto', 'Total'],
        recentRows.map((entry) => [
          formatDate(entry.date),
          entry.event,
          entry.movementType,
          entry.category,
          entry.concept,
          CURRENCY.format(entry.amount),
        ]),
      )

      doc.addPage()
      addSectionHeader('12) Cierre ejecutivo', 'Plan de acción para el siguiente ciclo')
      drawPdfIndexBars(doc, {
        x: marginX,
        y: 34,
        width: usableWidth,
        height: 74,
        title: 'KPI directivos para seguimiento semanal',
        rows: kpiChartRows,
      })
      autoTable(doc, {
        startY: 114,
        head: [['Ventana', 'Ingresos', 'Gastos', 'Beneficio', 'Margen']],
        body: reportWindowSnapshots.map((row) => [
          row.label,
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
          formatPercent(row.margen),
        ]),
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 8.4, cellPadding: 1.8 },
        headStyles: { fillColor: [18, 73, 116], textColor: [255, 255, 255] },
        theme: 'grid',
      })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(26, 26, 26)
      doc.text('Prioridades sugeridas (30-60-90 días)', marginX, 176)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10.8)
      doc.text('- 30 días: blindar bloques rentables y revisar eventos en alerta.', marginX, 188)
      doc.text('- 60 días: ajustar coste variable y reforzar mix digital.', marginX, 198)
      doc.text('- 90 días: validar escenario optimista con objetivo de margen.', marginX, 208)
      doc.text(
        `Escenario base: ${CURRENCY.format(scenarioBase.net)} | Optimista: ${CURRENCY.format(reportScenarioRows[1].net)} | Pesimista: ${CURRENCY.format(reportScenarioRows[2].net)}`,
        marginX,
        222,
      )
      doc.text(
        'Recomendación: revisar semanalmente y cerrar mensual con reporte de desviaciones.',
        marginX,
        232,
      )

      addPdfFooters(doc, 'BELLA BESTIA - INFORME CORPORATIVO')
      doc.save(`Bella Bestia - Informe corporativo ${getFileStamp()}.pdf`)
      setSourceSyncMessage('Informe escrito PDF generado correctamente.')
    } catch (error) {
      setSourceSyncError(
        `No se pudo generar el informe PDF: ${error instanceof Error ? error.message : 'fallo desconocido.'}`,
      )
    } finally {
      setIsPrintingReport(false)
    }
  }

  async function handlePrintExecutivePresentationPdf() {
    setSourceSyncError('')
    setSourceSyncMessage('')
    setIsPrintingReport(true)

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const marginX = 12
      const usableWidth = pageWidth - marginX * 2
      const logoDataUrl = await loadImageAsDataUrl(logoBellaBestia)
      const presentationGranularity: ChartGranularity =
        reportMode === 'semana' ? 'semana' : 'mes'
      const scopedRows = scopeRowsByChartPeriod(
        reportRowsChronological,
        reportChartPeriod,
        presentationGranularity,
      )
      const presentationRows = scopedRows.length > 0 ? scopedRows : reportRowsChronological
      const presentationBucketKeys = new Set(presentationRows.map((row) => row.key))
      const presentationEntries = reportEntries.filter((entry) => {
        const key =
          reportMode === 'semana' ? getWeekLabel(entry.date) : getMonthLabel(entry.date)
        return presentationBucketKeys.has(key)
      })
      const presentationTotals = presentationEntries.reduce(
        (acc, entry) => {
          if (entry.movementType === 'INGRESO') {
            acc.ingresos += entry.amount
          } else {
            acc.gastos += entry.amount
          }
          return acc
        },
        { ingresos: 0, gastos: 0 },
      )
      const presentationBenefit = presentationTotals.ingresos - presentationTotals.gastos
      const presentationMargin =
        presentationTotals.ingresos > 0
          ? (presentationBenefit / presentationTotals.ingresos) * 100
          : 0
      const presentationMethodTotals = presentationEntries.reduce(
        (acc, entry) => {
          if (entry.paymentMethod === 'TARJETA') acc.tarjeta += entry.amount
          else if (entry.paymentMethod === 'EFECTIVO') acc.efectivo += entry.amount
          else acc.transferencia += entry.amount
          return acc
        },
        { tarjeta: 0, efectivo: 0, transferencia: 0 },
      )
      const presentationPaymentSlices = [
        { label: 'Tarjeta', value: presentationMethodTotals.tarjeta, color: METHOD_COLORS.TARJETA },
        { label: 'Efectivo', value: presentationMethodTotals.efectivo, color: METHOD_COLORS.EFECTIVO },
        {
          label: 'Transferencia',
          value: presentationMethodTotals.transferencia,
          color: METHOD_COLORS.TRANSFERENCIA,
        },
      ]
      const topRows = [...presentationRows].sort((a, b) => b.beneficio - a.beneficio).slice(0, 7)
      const riskRows = [...presentationRows].sort((a, b) => a.beneficio - b.beneficio).slice(0, 7)
      const monthRows = aggregateRows(presentationEntries, 'mes')
        .sort((a, b) => a.key.localeCompare(b.key))
        .slice(-12)
      let cumulativeBenefit = 0
      const cumulativeMonthRows = monthRows.map((row) => {
        cumulativeBenefit += row.beneficio
        return { ...row, beneficio: cumulativeBenefit }
      })
      const presentationKpiIndexes = buildExecutiveKpiIndexes({
        marginPct: presentationMargin,
        expenseRatioPct:
          presentationTotals.ingresos + presentationTotals.gastos > 0
            ? (presentationTotals.gastos /
                (presentationTotals.ingresos + presentationTotals.gastos)) *
              100
            : 0,
        digitalSharePct:
          presentationTotals.ingresos + presentationTotals.gastos > 0
            ? ((presentationMethodTotals.tarjeta + presentationMethodTotals.transferencia) /
                (presentationTotals.ingresos + presentationTotals.gastos)) *
              100
            : 0,
        monthlyRows: monthRows,
      })
      const reportScenarioRows = buildScenarioRowsFromTotals(
        presentationTotals.ingresos,
        presentationTotals.gastos,
        scenarioAdjustments,
      )
      const scenarioBase = reportScenarioRows[0]
      const monthlyWindows = [
        { label: 'Últimos 3 meses', months: 3 },
        { label: 'Últimos 6 meses', months: 6 },
        { label: 'Últimos 12 meses', months: 12 },
      ]
      const windowSummaryRows = monthlyWindows.map(({ label, months }) => {
        const scopedRows = monthRows.slice(-months)
        const ingresos = scopedRows.reduce((acc, row) => acc + row.ingresos, 0)
        const gastos = scopedRows.reduce((acc, row) => acc + row.gastos, 0)
        const beneficio = ingresos - gastos
        return {
          label,
          meses: scopedRows.length,
          ingresos,
          gastos,
          beneficio,
          margen: ingresos > 0 ? (beneficio / ingresos) * 100 : 0,
        }
      })
      const presentationTypeRows = aggregateRowsByCustomKey(
        presentationEntries,
        (entry) => entry.eventType || 'Sin tipo',
      ).slice(0, 8)
      const presentationTimeRows = aggregateRowsByCustomKey(
        presentationEntries,
        (entry) => entry.eventTimeSlot || 'Sin franja',
      ).slice(0, 8)
      const presentationEventRows = aggregateRows(presentationEntries, 'evento').slice(0, 8)
      const scenarioWindowRows = monthlyWindows.map(({ label, months }) => {
        const scopedRows = monthRows.slice(-months)
        const ingresos = scopedRows.reduce((acc, row) => acc + row.ingresos, 0)
        const gastos = scopedRows.reduce((acc, row) => acc + row.gastos, 0)
        const rows = buildScenarioRowsFromTotals(ingresos, gastos, scenarioAdjustments)
        return {
          label,
          meses: scopedRows.length,
          base: rows[0].net,
          optimista: rows[1].net,
          pesimista: rows[2].net,
        }
      })

      const addSlideHeader = (title: string, subtitle: string) => {
        doc.setFillColor(217, 34, 47)
        doc.rect(0, 0, pageWidth, 24, 'F')
        doc.setFillColor(245, 191, 24)
        doc.rect(0, 22, pageWidth, 2, 'F')

        if (logoDataUrl) {
          doc.addImage(logoDataUrl, 'PNG', marginX, 4, 12, 12)
        }

        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.text(title, marginX + 16, 12)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text(subtitle, marginX + 16, 18)
        doc.setTextColor(22, 22, 22)
      }

      const addCoverSlide = () => {
        doc.setFillColor(94, 12, 34)
        doc.rect(0, 0, pageWidth, pageHeight, 'F')
        doc.setFillColor(217, 34, 47)
        doc.rect(0, 0, pageWidth, pageHeight * 0.64, 'F')
        doc.setFillColor(245, 191, 24)
        doc.rect(0, pageHeight * 0.64, pageWidth, pageHeight * 0.36, 'F')
        doc.setFillColor(18, 73, 116)
        doc.circle(pageWidth - 28, 28, 22, 'F')

        if (logoDataUrl) {
          doc.addImage(logoDataUrl, 'PNG', pageWidth / 2 - 28, 24, 56, 56)
        }

        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(34)
        doc.text('BELLA BESTIA', pageWidth / 2, 102, { align: 'center' })
        doc.setFontSize(20)
        doc.text('PRESENTACIÓN EJECUTIVA', pageWidth / 2, 116, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(13)
        doc.text(`Período: ${reportPeriodLabel}`, pageWidth / 2, 132, { align: 'center' })
        doc.text(`Alcance: ${ANALYSIS_SCOPE_LABEL[reportScope]}`, pageWidth / 2, 141, { align: 'center' })
        doc.text(`Generado: ${reportGeneratedAt}`, pageWidth / 2, 150, { align: 'center' })
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Documento preparado para comité directivo', pageWidth / 2, 176, { align: 'center' })
      }

      const addTrendSlide = (
        title: string,
        subtitle: string,
        rows: AggregatedRow[],
        metric: MetricKey,
        color: string,
      ) => {
        doc.addPage()
        addSlideHeader(title, subtitle)
        drawPdfLineChart(doc, {
          x: marginX,
          y: 33,
          width: usableWidth,
          height: 136,
          title,
          rows,
          metric,
          color,
        })
      }

      addCoverSlide()

      doc.addPage()
      addSlideHeader('Índice de la presentación', 'Guion de lectura')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      ;[
        '1. Foto general del período y KPI de dirección',
        '2. Ranking top + alertas + tabla de ventanas temporales',
        '3. Rentabilidad por tipo de evento y franja horaria',
        '4. Escenarios por ventana temporal',
        '5. Tendencia de ingresos',
        '6. Tendencia de gastos',
        '7. Tendencia de beneficio',
        '8. Balance acumulado',
        '9. Escenarios base/optimista/pesimista + mix de método',
        '10. Cierre ejecutivo con plan 30-60-90',
      ].forEach((row, index) => {
        doc.text(row, marginX, 44 + index * 10)
      })

      doc.addPage()
      addSlideHeader(
        'Foto general del período',
        `KPIs clave de negocio · ${reportPeriodScopeLabel}`,
      )
      const cardWidth = (usableWidth - 12) / 4
      const baseY = 34
      const cardData = [
        { label: 'Ingresos', value: CURRENCY.format(presentationTotals.ingresos), color: [255, 250, 236] as [number, number, number] },
        { label: 'Gastos', value: CURRENCY.format(presentationTotals.gastos), color: [253, 244, 226] as [number, number, number] },
        { label: 'Beneficio', value: CURRENCY.format(presentationBenefit), color: [231, 247, 236] as [number, number, number] },
        { label: 'Margen', value: formatPercent(presentationMargin), color: [229, 240, 252] as [number, number, number] },
      ]
      cardData.forEach((card, index) => {
        const x = marginX + index * (cardWidth + 4)
        const [r, g, b] = card.color
        doc.setFillColor(r, g, b)
        doc.setDrawColor(210, 210, 210)
        doc.roundedRect(x, baseY, cardWidth, 24, 3, 3, 'FD')
        doc.setTextColor(20, 20, 20)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text(card.label, x + 3, baseY + 8)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(11.5)
        doc.text(card.value, x + 3, baseY + 16)
      })

      doc.setTextColor(25, 25, 25)
      doc.setFontSize(10.5)
      doc.text(
        `Bloque más rentable: ${topRows[0]?.key || 'Sin datos'} (${CURRENCY.format(topRows[0]?.beneficio ?? 0)})`,
        marginX,
        66,
      )
      doc.text(
        `Bloque a vigilar: ${riskRows[0]?.key || 'Sin datos'} (${CURRENCY.format(riskRows[0]?.beneficio ?? 0)})`,
        marginX,
        73,
      )
      doc.text(`Líneas analizadas: ${NUMBER_0.format(presentationEntries.length)}`, marginX, 80)

      drawPdfLineChart(doc, {
        x: marginX,
        y: 84,
        width: (usableWidth - 6) / 2,
        height: 74,
        title: 'Tendencia de beneficio',
        rows: monthRows,
        metric: 'beneficio',
        color: METRIC_META.beneficio.color,
      })
      drawPdfMethodBars(doc, {
        x: marginX + (usableWidth - 6) / 2 + 6,
        y: 84,
        width: (usableWidth - 6) / 2,
        height: 74,
        title: 'Peso por método de cobro/pago',
        slices: presentationPaymentSlices,
      })

      autoTable(doc, {
        startY: 162,
        head: [['Índice KPI', 'Puntuación', 'Lectura']],
        body: presentationKpiIndexes.map((index) => [
          index.label,
          `${NUMBER_0.format(index.score)}/100`,
          index.insight,
        ]),
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 8, cellPadding: 1.8 },
        headStyles: { fillColor: [18, 73, 116], textColor: [255, 255, 255] },
        theme: 'grid',
      })

      doc.addPage()
      addSlideHeader('Top y alertas', 'Comparativa por beneficio y focos de riesgo')
      autoTable(doc, {
        startY: 34,
        head: [['Top 5', 'Ingresos', 'Gastos', 'Beneficio']],
        body: topRows.map((row) => [
          row.key,
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
        ]),
        margin: { left: marginX, right: pageWidth / 2 + 2 },
        styles: { fontSize: 8.5, cellPadding: 2 },
        headStyles: { fillColor: [34, 132, 74], textColor: [255, 255, 255] },
        theme: 'grid',
      })
      autoTable(doc, {
        startY: 34,
        head: [['Alertas', 'Ingresos', 'Gastos', 'Beneficio']],
        body: riskRows.map((row) => [
          row.key,
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
        ]),
        margin: { left: pageWidth / 2 + 2, right: marginX },
        styles: { fontSize: 8.5, cellPadding: 2 },
        headStyles: { fillColor: [180, 30, 30], textColor: [255, 255, 255] },
        theme: 'grid',
      })

      autoTable(doc, {
        startY: 120,
        head: [['Ventana', 'Meses', 'Ingresos', 'Gastos', 'Beneficio', 'Margen']],
        body: windowSummaryRows.map((row) => [
          row.label,
          NUMBER_0.format(row.meses),
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
          formatPercent(row.margen),
        ]),
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 8.5, cellPadding: 2 },
        headStyles: { fillColor: [18, 73, 116], textColor: [255, 255, 255] },
        theme: 'grid',
      })

      doc.addPage()
      addSlideHeader(
        'Rentabilidad por tipo y franja',
        `Comparativa ejecutiva · ${reportPeriodScopeLabel}`,
      )
      drawPdfRankingBars(doc, {
        x: marginX,
        y: 34,
        width: (usableWidth - 6) / 2,
        height: 66,
        title: 'Tipo de evento (beneficio)',
        rows: presentationTypeRows,
        maxRows: 6,
        positiveColor: '#145d91',
      })
      drawPdfRankingBars(doc, {
        x: marginX + (usableWidth - 6) / 2 + 6,
        y: 34,
        width: (usableWidth - 6) / 2,
        height: 66,
        title: 'Franja horaria (beneficio)',
        rows: presentationTimeRows,
        maxRows: 6,
        positiveColor: '#d9222f',
      })
      autoTable(doc, {
        startY: 106,
        head: [['Tipo de evento', 'Ingresos', 'Gastos', 'Beneficio']],
        body: presentationTypeRows.map((row) => [
          row.key,
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
        ]),
        margin: { left: marginX, right: pageWidth / 2 + 2 },
        styles: { fontSize: 8.2, cellPadding: 1.8 },
        headStyles: { fillColor: [18, 73, 116], textColor: [255, 255, 255] },
        theme: 'grid',
      })
      autoTable(doc, {
        startY: 106,
        head: [['Franja horaria', 'Ingresos', 'Gastos', 'Beneficio']],
        body: presentationTimeRows.map((row) => [
          row.key,
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
        ]),
        margin: { left: pageWidth / 2 + 2, right: marginX },
        styles: { fontSize: 8.2, cellPadding: 1.8 },
        headStyles: { fillColor: [217, 34, 47], textColor: [255, 255, 255] },
        theme: 'grid',
      })

      autoTable(doc, {
        startY: 170,
        head: [['Evento', 'Ingresos', 'Gastos', 'Beneficio', 'Margen']],
        body: presentationEventRows.map((row) => [
          row.key,
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
          formatPercent(row.margen),
        ]),
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 8, cellPadding: 1.8 },
        headStyles: { fillColor: [120, 15, 32], textColor: [255, 255, 255] },
        theme: 'grid',
      })

      doc.addPage()
      addSlideHeader(
        'Escenarios por ventana temporal',
        'Comparativa base, optimista y pesimista por tramo temporal',
      )
      drawPdfRankingBars(doc, {
        x: marginX,
        y: 34,
        width: (usableWidth - 6) / 2,
        height: 66,
        title: 'Beneficio base por ventana',
        rows: scenarioWindowRows.map((row) => ({
          key: row.label,
          ingresos: 0,
          gastos: 0,
          beneficio: row.base,
          margen: 0,
        })),
        maxRows: 3,
        positiveColor: '#145d91',
      })
      drawPdfRankingBars(doc, {
        x: marginX + (usableWidth - 6) / 2 + 6,
        y: 34,
        width: (usableWidth - 6) / 2,
        height: 66,
        title: 'Delta optimista vs base',
        rows: scenarioWindowRows.map((row) => ({
          key: row.label,
          ingresos: 0,
          gastos: 0,
          beneficio: row.optimista - row.base,
          margen: 0,
        })),
        maxRows: 3,
        positiveColor: '#20844a',
      })
      autoTable(doc, {
        startY: 106,
        head: [['Ventana', 'Meses', 'Base', 'Optimista', 'Pesimista', 'Δ Opt. vs base', 'Δ Pes. vs base']],
        body: scenarioWindowRows.map((row) => [
          row.label,
          NUMBER_0.format(row.meses),
          CURRENCY.format(row.base),
          CURRENCY.format(row.optimista),
          CURRENCY.format(row.pesimista),
          `${row.optimista - row.base >= 0 ? '+' : ''}${CURRENCY.format(row.optimista - row.base)}`,
          `${row.pesimista - row.base >= 0 ? '+' : ''}${CURRENCY.format(row.pesimista - row.base)}`,
        ]),
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 8.1, cellPadding: 1.8 },
        headStyles: { fillColor: [18, 73, 116], textColor: [255, 255, 255] },
        theme: 'grid',
      })

      doc.addPage()
      addSlideHeader('Ventanas automáticas', 'Lectura en 12 meses, 3 meses, 1 mes y 1 semana')
      autoTable(doc, {
        startY: 34,
        head: [['Ventana', 'Período', 'Mov.', 'Ingresos', 'Gastos', 'Beneficio', 'Margen']],
        body: reportWindowSnapshots.map((row) => [
          row.label,
          `${formatDate(row.from)} - ${formatDate(row.to)}`,
          NUMBER_0.format(row.movements),
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
          formatPercent(row.margen),
        ]),
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 8.5, cellPadding: 2 },
        headStyles: { fillColor: [217, 34, 47], textColor: [255, 255, 255] },
        theme: 'grid',
      })

      addTrendSlide(
        'Tendencia de ingresos',
        'Lectura mensual para detectar aceleración o frenada comercial',
        monthRows,
        'ingresos',
        METRIC_META.ingresos.color,
      )
      addTrendSlide(
        'Tendencia de gastos',
        'Control de estructura de coste y disciplina operativa',
        monthRows,
        'gastos',
        METRIC_META.gastos.color,
      )
      addTrendSlide(
        'Tendencia de beneficio',
        'Resultado final del negocio por mes',
        monthRows,
        'beneficio',
        METRIC_META.beneficio.color,
      )
      addTrendSlide(
        'Balance acumulado',
        'Progreso del beneficio acumulado en el período',
        cumulativeMonthRows,
        'beneficio',
        '#145d91',
      )

      doc.addPage()
      addSlideHeader(
        'Escenarios + mix por método',
        `Simulación de decisiones · ${reportPeriodScopeLabel}`,
      )
      drawPdfScenarioBars(doc, {
        x: marginX,
        y: 34,
        width: usableWidth,
        height: 72,
        title: 'Escenarios (base / optimista / pesimista)',
        rows: reportScenarioRows,
      })
      drawPdfMethodBars(doc, {
        x: marginX,
        y: 112,
        width: usableWidth,
        height: 52,
        title: 'Peso por método de cobro/pago',
        slices: presentationPaymentSlices,
      })
      autoTable(doc, {
        startY: 168,
        head: [['Escenario', 'Beneficio', 'Margen', 'Δ vs base']],
        body: reportScenarioRows.map((row) => {
          const margin = row.income > 0 ? (row.net / row.income) * 100 : 0
          const delta = row.net - scenarioBase.net
          return [
            row.name,
            CURRENCY.format(row.net),
            formatPercent(margin),
            `${delta >= 0 ? '+' : ''}${CURRENCY.format(delta)}`,
          ]
        }),
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 8.3, cellPadding: 2 },
        headStyles: { fillColor: [120, 15, 32], textColor: [255, 255, 255] },
        theme: 'grid',
      })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(120, 15, 32)
      doc.text('Mensajes clave para la reunión', marginX, 192)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(30, 30, 30)
      doc.text('- Mantener foco comercial en bloques top y replicar formato ganador.', marginX, 201)
      doc.text('- Reducir coste variable en bloques en alerta para elevar margen.', marginX, 208)

      doc.addPage()
      addSlideHeader('Cierre ejecutivo', 'Plan de acción 30-60-90')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(24, 24, 24)
      doc.text('Marco de decisión para comité', marginX, 42)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      doc.text('30 días: proteger eventos rentables y cerrar fugas de coste.', marginX, 56)
      doc.text('60 días: consolidar mix digital y elevar ticket medio por línea.', marginX, 67)
      doc.text('90 días: validar escenario optimista y ajustar presupuesto mensual.', marginX, 78)
      doc.text(
        `Escenario base: ${CURRENCY.format(scenarioBase.net)} | Optimista: ${CURRENCY.format(reportScenarioRows[1].net)} | Pesimista: ${CURRENCY.format(reportScenarioRows[2].net)}`,
        marginX,
        94,
      )
      autoTable(doc, {
        startY: 108,
        head: [['Ventana', 'Ingresos', 'Gastos', 'Beneficio', 'Margen']],
        body: reportWindowSnapshots.map((row) => [
          row.label,
          CURRENCY.format(row.ingresos),
          CURRENCY.format(row.gastos),
          CURRENCY.format(row.beneficio),
          formatPercent(row.margen),
        ]),
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 9, cellPadding: 2.2 },
        headStyles: { fillColor: [18, 73, 116], textColor: [255, 255, 255] },
        theme: 'grid',
      })

      addPdfFooters(doc, 'BELLA BESTIA - PRESENTACION EJECUTIVA')
      doc.save(`Bella Bestia - Presentación ejecutiva ${getFileStamp()}.pdf`)
      setSourceSyncMessage('Presentación ejecutiva PDF generada correctamente.')
    } catch (error) {
      setSourceSyncError(
        `No se pudo generar la presentación PDF: ${error instanceof Error ? error.message : 'fallo desconocido.'}`,
      )
    } finally {
      setIsPrintingReport(false)
    }
  }

  function updateAnalyticsFilter<K extends keyof AnalyticsFilters>(
    key: K,
    value: AnalyticsFilters[K],
  ) {
    setAnalyticsFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  function handleAnalyticsQuickRange(
    preset: 'semana' | 'mes' | 'trimestre' | 'ano' | 'todo',
  ) {
    if (preset === 'todo') {
      setAnalyticsFilters((prev) => ({
        ...prev,
        dateFrom: '2000-01-01',
        dateTo: getTodayISODate(),
      }))
      return
    }
    const range = getReportRangeByPreset(preset)
    setAnalyticsFilters((prev) => ({
      ...prev,
      dateFrom: range.from,
      dateTo: range.to,
    }))
  }

  function handleResetAnalyticsFilters() {
    setAnalyticsFilters(buildDefaultAnalyticsFilters())
    setAnalyticsSection('resumen')
  }

  function handleExportUpcomingEventsCsv() {
    const rows = analyticsUpcomingEvents.map((row) => ({
      Evento: row.event,
      FechaEvento: formatDateTime(row.eventDateTime),
      Estado: row.eventStatus,
      Artista: row.artist,
      Promotor: row.promoter,
      OcupacionPagadaPct: formatPercent(row.ocupacionPagada * 100),
      PaceIndex: NUMBER_2.format(row.paceIndex),
      Riesgo: row.riskLevel,
      IngresosNetosEUR: formatNumberEs2(row.ingresosNetos),
      BeneficioEUR: formatNumberEs2(row.beneficio),
    }))
    exportObjectRowsToCsv('bella-bestia-proximos-eventos', rows)
  }

  function handleExportRankingCsv() {
    const rows = analyticsEventSnapshots.map((row) => ({
      Evento: row.event,
      FechaEvento: formatDateTime(row.eventDateTime),
      IngresosNetosEUR: formatNumberEs2(row.ingresosNetos),
      GastosEUR: formatNumberEs2(row.gastos),
      BeneficioEUR: formatNumberEs2(row.beneficio),
      MargenBrutoEUR: formatNumberEs2(row.margenBruto),
      OcupacionPagadaPct: formatPercent(row.ocupacionPagada * 100),
      PaceIndex: NUMBER_2.format(row.paceIndex),
      Riesgo: row.riskLevel,
    }))
    exportObjectRowsToCsv('bella-bestia-ranking-eventos', rows)
  }

  function handleExportMarketingCsv() {
    const rows = analyticsBreakdownBySource.map((row) => ({
      Fuente: row.key,
      IngresosEUR: formatNumberEs2(row.ingresos),
      Tickets: row.tickets,
    }))
    exportObjectRowsToCsv('bella-bestia-marketing-breakdown', rows)
  }

  function handleExportDiaryCsv() {
    exportEntriesToCsv(diaryEntries, 'combinado')
  }

  function handleExportDiaryExcel() {
    exportEntriesToExcel(diaryEntries)
  }

  function handleExportDiaryJson() {
    exportEntriesToJson(diaryEntries)
  }

  async function handleReloadFromSource() {
    setSourceSyncBusy(true)
    setSourceSyncError('')
    setSourceSyncMessage('')
    try {
      const response = await fetch('/api/entries', {
        method: 'GET',
        credentials: 'same-origin',
      })
      if (!response.ok) {
        throw new Error('No se pudo leer la hoja de calculo.')
      }
      const payload = (await response.json()) as { entries?: unknown }
      const sanitized = sanitizeLedgerEntries(payload.entries ?? [])
      setEntries(sanitized)
      setLastRemoteSyncAt(new Date().toLocaleString('es-ES'))
      setSourceSyncMessage('Datos recargados desde Google Sheets.')
    } catch (error) {
      setSourceSyncError(
        `Error de recarga: ${error instanceof Error ? error.message : 'fallo desconocido.'}`,
      )
    } finally {
      setSourceSyncBusy(false)
    }
  }

  async function handleRebuildSheetReports() {
    setSourceSyncBusy(true)
    setSourceSyncError('')
    setSourceSyncMessage('')
    try {
      const response = await fetch('/api/reports/rebuild', {
        method: 'POST',
        credentials: 'same-origin',
      })
      const payload = (await response.json()) as {
        ok?: boolean
        error?: string
        weeklyRows?: number
        monthlyRows?: number
        eventRows?: number
      }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'No se pudieron generar los reportes.')
      }
      setSourceSyncMessage(
        `Reportes en hoja actualizados: semanal ${payload.weeklyRows ?? 0}, mensual ${payload.monthlyRows ?? 0}, evento ${payload.eventRows ?? 0}.`,
      )
    } catch (error) {
      setSourceSyncError(
        `Error al generar reportes: ${error instanceof Error ? error.message : 'fallo desconocido.'}`,
      )
    } finally {
      setSourceSyncBusy(false)
    }
  }

  async function handlePrepareSheetWorkspace() {
    setSourceSyncBusy(true)
    setSourceSyncError('')
    setSourceSyncMessage('')
    try {
      const response = await fetch('/api/sheets/bootstrap', {
        method: 'POST',
        credentials: 'same-origin',
      })
      const payload = (await response.json()) as {
        ok?: boolean
        error?: string
        tabs?: string[]
      }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'No se pudo preparar la hoja.')
      }
      setSourceSyncMessage(
        `Hoja preparada con pestañas: ${(payload.tabs || []).join(', ') || 'OK'}.`,
      )
      setLastRemoteSyncAt(new Date().toLocaleString('es-ES'))
    } catch (error) {
      setSourceSyncError(
        `Error al preparar la hoja: ${error instanceof Error ? error.message : 'fallo desconocido.'}`,
      )
    } finally {
      setSourceSyncBusy(false)
    }
  }

  function handleResetDiaryFilters() {
    const monthRange = getRangeByPreset('mes')
    setDiaryPreset('mes')
    setDiaryDateFrom(monthRange.from)
    setDiaryDateTo(monthRange.to)
    setDiaryTypeFilter('TODOS')
    setDiaryMethodFilter('TODOS')
    setDiaryEventFilter('TODOS')
    setDiarySearch('')
  }

  function updateDraft(
    movementType: MovementType,
    updater: (prev: MovementDraft) => MovementDraft,
  ) {
    if (movementType === 'INGRESO') {
      setDraftIncome(updater)
      return
    }
    setDraftExpense(updater)
  }

  function resetForm(movementType: MovementType, eventName: string, dateValue?: string) {
    setFormError('')
    const cleanDraft = createDraft(
      movementType,
      eventName || 'Evento nuevo',
      dateValue ?? getTodayISODate(),
    )
    if (movementType === 'INGRESO') {
      setDraftIncome(cleanDraft)
    } else {
      setDraftExpense(cleanDraft)
    }
    setMovementFormType(movementType)
    setEditingId(null)
    setEditingType(null)
  }

  function handleMovementFormTypeChange(nextType: MovementType) {
    setMovementFormType(nextType)
    setFormError('')
    if (editingId && editingType && editingType !== nextType) {
      setEditingId(null)
      setEditingType(null)
    }
  }

  function startEdit(entry: LedgerEntry) {
    if (isSheetReadOnlyMode) {
      setFormError(
        'Modo visor activo: para editar, cambia el dato en Google Sheets y pulsa "Recargar desde hoja".',
      )
      return
    }
    setActiveTab('movimientos')
    setMovementFormType(entry.movementType)
    setEditingId(entry.id)
    setEditingType(entry.movementType)
    setFormError('')
    const patchDraft: MovementDraft = {
      date: entry.date,
      purchaseDate: entry.purchaseDate || entry.date,
      eventDateTime: (entry.eventDateTime || `${entry.date}T22:00:00`).slice(0, 16),
      eventStatus: entry.eventStatus || inferEventStatus(entry.eventDateTime || `${entry.date}T22:00:00`),
      event: entry.event,
      artist: entry.artist || entry.event,
      genre: entry.genre || 'General',
      promoter: entry.promoter || 'Bella Bestia',
      venueSpace: entry.venueSpace || 'Sala principal',
      zoneSection: entry.zoneSection || 'General',
      ticketType: entry.ticketType || 'General',
      channel: entry.channel || 'Directo',
      source: entry.source || 'Directo',
      medium: entry.medium || 'Orgánico',
      campaign: entry.campaign || 'Sin campaña',
      customerSegment: entry.customerSegment || 'NUEVO',
      ticketCount: String(entry.ticketCount ?? 0),
      ticketCompCount: String(entry.ticketCompCount ?? 0),
      ticketRefundCount: String(entry.ticketRefundCount ?? 0),
      scannedCount: String(entry.scannedCount ?? 0),
      discountAmount: formatNumberEs2(entry.discountAmount ?? 0),
      feeAssumedAmount: formatNumberEs2(entry.feeAssumedAmount ?? 0),
      waitlistCount: String(entry.waitlistCount ?? 0),
      concept: entry.concept,
      category: entry.category,
      paymentMethod: entry.paymentMethod,
      baseAmount: formatNumberEs2(entry.baseAmount ?? entry.amount),
      vatType: entry.vatType ?? 'EXENTO',
      withholdingRate: entry.withholdingRate ?? 0,
      notes: entry.notes,
    }
    if (entry.movementType === 'INGRESO') {
      setDraftIncome(patchDraft)
    } else {
      setDraftExpense(patchDraft)
    }
  }

  function removeEntry(entry: LedgerEntry) {
    if (isSheetReadOnlyMode) {
      setFormError(
        'Modo visor activo: para borrar, elimina la línea en Google Sheets y pulsa "Recargar desde hoja".',
      )
      return
    }
    const confirmDelete = window.confirm(
      `Vas a borrar "${entry.concept}" (${CURRENCY.format(entry.amount)}).`,
    )
    if (!confirmDelete) {
      return
    }

    setEntries((prev) => prev.filter((item) => item.id !== entry.id))
    if (editingId === entry.id) {
      resetForm(entry.movementType, 'Evento nuevo')
    }
  }

  function handleSubmitForType(
    event: FormEvent<HTMLFormElement>,
    movementType: MovementType,
    draft: MovementDraft,
  ) {
    event.preventDefault()
    setFormError('')
    if (isSheetReadOnlyMode) {
      setFormError(
        'Modo visor activo: la introducción se hace en Google Sheets. Después pulsa "Recargar desde hoja".',
      )
      return
    }

    const baseAmount = parseAmountEs(draft.baseAmount)
    const vatRate = getVatRate(draft.vatType)
    const vatAmount = Number.isFinite(baseAmount)
      ? roundMoney(baseAmount * (vatRate / 100))
      : 0
    const withholdingAmount = Number.isFinite(baseAmount)
      ? roundMoney(baseAmount * (draft.withholdingRate / 100))
      : 0
    const discountAmount = parseAmountEs(draft.discountAmount)
    const feeAssumedAmount = parseAmountEs(draft.feeAssumedAmount)
    const amount = Number.isFinite(baseAmount)
      ? roundMoney(baseAmount + vatAmount - withholdingAmount - (Number.isFinite(discountAmount) ? discountAmount : 0))
      : Number.NaN
    if (!draft.event.trim() || !draft.concept.trim() || !draft.category.trim()) {
      setFormError('Completa evento, concepto y categoría.')
      return
    }
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      setFormError('La base imponible debe ser mayor que 0. Formato: 1.234,56')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('El total de la línea no puede ser 0 o negativo.')
      return
    }

    const normalizedEntry = {
      date: draft.date,
      purchaseDate: draft.purchaseDate || draft.date,
      eventDateTime: draft.eventDateTime ? `${draft.eventDateTime}:00` : `${draft.date}T22:00:00`,
      eventStatus: draft.eventStatus,
      event: draft.event.trim(),
      artist: draft.artist.trim() || draft.event.trim(),
      genre: draft.genre.trim() || 'General',
      promoter: draft.promoter.trim() || 'Bella Bestia',
      venueSpace: draft.venueSpace.trim() || 'Sala principal',
      zoneSection: draft.zoneSection.trim() || 'General',
      ticketType: draft.ticketType.trim() || 'General',
      channel: draft.channel.trim() || 'Directo',
      source: draft.source.trim() || 'Directo',
      medium: draft.medium.trim() || 'Orgánico',
      campaign: draft.campaign.trim() || 'Sin campaña',
      customerSegment: draft.customerSegment,
      ticketCount: parseIntEs(draft.ticketCount),
      ticketCompCount: parseIntEs(draft.ticketCompCount),
      ticketRefundCount: parseIntEs(draft.ticketRefundCount),
      scannedCount: parseIntEs(draft.scannedCount),
      discountAmount: Number.isFinite(discountAmount) ? roundMoney(discountAmount) : 0,
      feeAssumedAmount: Number.isFinite(feeAssumedAmount) ? roundMoney(feeAssumedAmount) : 0,
      waitlistCount: parseIntEs(draft.waitlistCount),
      concept: draft.concept.trim(),
      category: draft.category.trim(),
      movementType,
      paymentMethod: draft.paymentMethod,
      baseAmount,
      vatType: draft.vatType,
      vatRate,
      vatAmount,
      withholdingRate: draft.withholdingRate,
      withholdingAmount,
      directCostAmount: movementType === 'GASTO' ? amount : 0,
      amount,
      notes: draft.notes.trim(),
    }

    if (editingId && editingType === movementType) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === editingId ? { ...entry, ...normalizedEntry } : entry,
        ),
      )
      resetForm(movementType, normalizedEntry.event, normalizedEntry.date)
      return
    }

    const nextEntry: LedgerEntry = {
      id: `manual-${Date.now()}`,
      ...normalizedEntry,
    }

    setEntries((prev) => [nextEntry, ...prev])
    resetForm(movementType, normalizedEntry.event)
  }

  const percentKpis = new Set<DashboardKpiId>([
    'ocupacion',
    'ocupacion_pagada',
    'scan_rate',
    'no_show_rate',
    'refund_rate',
    'pct_cortesias',
    'utilizacion_sala',
  ])
  const countKpis = new Set<DashboardKpiId>([
    'tickets_vendidos_netos',
    'asistencia_escaneada',
    'numero_eventos',
    'numero_eventos_sold_out',
    'numero_eventos_en_riesgo',
  ])

  function formatKpiValue(id: DashboardKpiId, value: number) {
    if (percentKpis.has(id)) {
      return formatPercent(value * 100)
    }
    if (countKpis.has(id)) {
      return NUMBER_2.format(value)
    }
    if (id === 'pace_index') {
      return NUMBER_2.format(value)
    }
    return CURRENCY.format(value)
  }

  const analyticsKpiOrder: DashboardKpiId[] = [
    'ingresos_brutos',
    'ingresos_netos',
    'tickets_vendidos_netos',
    'precio_medio_ticket',
    'ocupacion',
    'ocupacion_pagada',
    'asistencia_escaneada',
    'scan_rate',
    'no_show_rate',
    'refund_rate',
    'pct_cortesias',
    'ritmo_venta_7d',
    'ritmo_venta_14d',
    'ritmo_venta_30d',
    'pace_index',
    'utilizacion_sala',
    'revenue_por_asistente',
    'revenue_por_dia_disponible',
    'numero_eventos',
    'numero_eventos_sold_out',
    'numero_eventos_en_riesgo',
  ]

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-head">
          <div className="hero-brand">
            <img src={logoBellaBestia} alt="Logo oficial Bella Bestia" />
            <div>
              <p className="hero-tag">APP ARTES BUHO</p>
              <h1>Bella Bestia Finanzas</h1>
              <p>
              Gestión detallada de ingresos y gastos para sala de conciertos,
                con control por periodos y detalle de eventos.
              </p>
            </div>
          </div>
          <p className="hero-help">
            Interfaz inspirada en flujo tipo Holded: clara, rápida y con
            lectura y análisis en tiempo real.
          </p>
        </div>
        <nav className="tab-nav" aria-label="Navegación principal">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          <a href="/logout" className="logout-link">
            Cerrar sesión
          </a>
        </nav>
      </section>

      <section className="panel source-panel">
        <div className="source-head">
          <h3>Fuente de datos</h3>
          <span className={isGoogleSheetsSource ? 'badge ok' : 'badge neutral'}>
            {sourceBadgeLabel}
          </span>
          {isSheetReadOnlyMode ? <span className="badge warn">Solo lectura desde la app</span> : null}
          <button
            type="button"
            className="source-toggle"
            onClick={() => setIsSourcePanelExpanded((prev) => !prev)}
            aria-expanded={isSourcePanelExpanded}
            aria-controls="source-panel-body"
          >
            {isSourcePanelExpanded ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {isSourcePanelExpanded ? (
          <div className="source-body" id="source-panel-body">
            <p>
              {isSheetReadOnlyMode
                ? 'Modo visor activo: los datos se cargan en Google Sheets. Aquí solo analizas, filtras y generas informes.'
                : isGoogleSheetsSource
                ? 'La introducción de líneas se hace en la hoja. Aquí visualizas paneles y puedes regenerar reportes.'
                : 'No hay hoja conectada todavía. Revisa variables de Google y vuelve a recargar desde hoja.'}
            </p>
            {sourceInfo.sheet?.url ? (
              <p className="source-link">
                Hoja conectada ({sourceInfo.sheet.mainTab}):{' '}
                <a href={sourceInfo.sheet.url} target="_blank" rel="noreferrer">
                  abrir Google Sheets
                </a>
              </p>
            ) : null}
            {sourceInfo.sheet?.reportTabs?.length ? (
              <p className="source-meta">
                Pestañas de cuadro de mando:{' '}
                <strong>{sourceInfo.sheet.reportTabs.join(' · ')}</strong>
                {sourceInfo.sheet.controlTab ? (
                  <>
                    {' '}| Control: <strong>{sourceInfo.sheet.controlTab}</strong>
                  </>
                ) : null}
              </p>
            ) : null}
            <div className="export-actions">
              {sourceInfo.source === 'google_sheets' ? (
                <button type="button" onClick={handlePrepareSheetWorkspace} disabled={sourceSyncBusy}>
                  {sourceSyncBusy ? 'Preparando...' : 'Preparar hoja (pestañas + formato)'}
                </button>
              ) : null}
              <button type="button" onClick={handleReloadFromSource} disabled={sourceSyncBusy}>
                {sourceSyncBusy ? 'Recargando...' : 'Recargar desde hoja'}
              </button>
              {sourceInfo.source === 'google_sheets' ? (
                <button type="button" onClick={handleRebuildSheetReports} disabled={sourceSyncBusy}>
                  {sourceSyncBusy ? 'Generando...' : 'Generar reportes semanal/mensual/evento'}
                </button>
              ) : null}
            </div>
            <p className="source-meta">
              Última sincronización remota:{' '}
              <strong>{lastRemoteSyncAt || 'sin sincronizar todavía'}</strong>
            </p>
            {isGoogleSheetsSource ? (
              <p className="source-meta">
                Sincronización automática hoja a app cada{' '}
                <strong>
                  {SHEET_AUTO_SYNC_SECONDS} segundo{SHEET_AUTO_SYNC_SECONDS === 1 ? '' : 's'}
                </strong>
                , y también al volver a esta pestaña.
              </p>
            ) : null}
            {sourceSyncMessage ? <p className="source-ok">{sourceSyncMessage}</p> : null}
            {sourceSyncError ? <p className="source-error">{sourceSyncError}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="panel controls">
        <div className="controls-grid">
          <label className="filter-field">
            Informe
            <select
              value={analysisScope}
              onChange={(event) => {
                setAnalysisScope(event.target.value as AnalysisScope)
                setSelectedBucket('TODOS')
              }}
            >
              <option value="RESUMEN">Resumen (ventas + compras)</option>
              <option value="VENTAS">Ventas</option>
              <option value="COMPRAS">Compras</option>
            </select>
          </label>

          <label className="filter-field">
            Período rápido
            <select
              value={analysisPreset}
              onChange={(event) =>
                handleAnalysisPresetChange(event.target.value as AnalysisRangePreset)
              }
            >
              <option value="semana">Semana actual</option>
              <option value="mes">Mes actual</option>
              <option value="trimestre">Trimestre actual</option>
              <option value="ano">Año actual</option>
              <option value="ano_anterior">Año anterior</option>
              <option value="todo">Todo</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>

          <label className="filter-field">
            Desde
            <input
              type="date"
              value={analysisDateFrom}
              onChange={(event) => {
                setAnalysisPreset('custom')
                const nextFrom = event.target.value
                setAnalysisDateFrom(nextFrom)
                setViewMode(resolveAnalysisViewModeFromCustomRange(nextFrom, analysisDateTo))
                setDashboardChartPeriod('todo')
                setSelectedBucket('TODOS')
              }}
              disabled={analysisPreset === 'todo'}
            />
          </label>

          <label className="filter-field">
            Hasta
            <input
              type="date"
              value={analysisDateTo}
              onChange={(event) => {
                setAnalysisPreset('custom')
                const nextTo = event.target.value
                setAnalysisDateTo(nextTo)
                setViewMode(resolveAnalysisViewModeFromCustomRange(analysisDateFrom, nextTo))
                setDashboardChartPeriod('todo')
                setSelectedBucket('TODOS')
              }}
              disabled={analysisPreset === 'todo'}
            />
          </label>

          <label className="filter-field controls-wide" htmlFor="bucket-select">
            Bloque del período
            <select
              id="bucket-select"
              value={activeBucket}
              onChange={(event) => setSelectedBucket(event.target.value)}
            >
              {bucketOptions.map((bucket) => (
                <option key={bucket} value={bucket}>
                  {bucket === 'TODOS' ? 'Todo (sin filtro)' : bucket}
                </option>
              ))}
            </select>
          </label>

          <p className="select-help controls-wide">
            Informe activo: <strong>{ANALYSIS_SCOPE_LABEL[analysisScope]}</strong>. Filas tras filtros:{' '}
            <strong>{filteredEntries.length}</strong> de <strong>{analysisEntries.length}</strong>.
          </p>
        </div>
      </section>

      {activeTab === 'analitica' ? (
        <>
          <section className="panel analytics-toolbar">
            <h3>Dashboard analítico de sala</h3>
            <p>
              Vista de negocio con filtros globales, eje temporal por compra o por fecha de evento,
              y drilldown de mes a semana y evento.
            </p>

            <div className="analytics-section-switch">
              {ANALYTICS_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={analyticsSection === section.id ? 'active' : ''}
                  onClick={() => setAnalyticsSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>

            <div className="analytics-quick-range">
              <label>
                Período rápido
                <select
                  defaultValue="todo"
                  onChange={(event) =>
                    handleAnalyticsQuickRange(
                      event.target.value as
                        | 'semana'
                        | 'mes'
                        | 'trimestre'
                        | 'ano'
                        | 'todo',
                    )
                  }
                >
                  <option value="semana">Semana actual</option>
                  <option value="mes">Mes actual</option>
                  <option value="trimestre">Trimestre actual</option>
                  <option value="ano">Año actual</option>
                  <option value="todo">Todo</option>
                </select>
              </label>
              <button type="button" onClick={handleResetAnalyticsFilters}>Limpiar filtros</button>
            </div>

            <div className="analytics-filters-grid">
              <label>
                Desde
                <input
                  type="date"
                  value={analyticsFilters.dateFrom}
                  onChange={(event) =>
                    updateAnalyticsFilter('dateFrom', event.target.value)
                  }
                />
              </label>
              <label>
                Hasta
                <input
                  type="date"
                  value={analyticsFilters.dateTo}
                  onChange={(event) =>
                    updateAnalyticsFilter('dateTo', event.target.value)
                  }
                />
              </label>
              <label>
                Granularidad
                <select
                  value={analyticsFilters.granularity}
                  onChange={(event) =>
                    updateAnalyticsFilter(
                      'granularity',
                      event.target.value as AnalyticsGranularity,
                    )
                  }
                >
                  <option value="semana">Semana</option>
                  <option value="mes">Mes</option>
                  <option value="evento">Evento</option>
                </select>
              </label>
              <label>
                Eje temporal
                <select
                  value={analyticsFilters.temporalAxis}
                  onChange={(event) =>
                    updateAnalyticsFilter(
                      'temporalAxis',
                      event.target.value as TemporalAxis,
                    )
                  }
                >
                  <option value="fecha_compra">Fecha de compra</option>
                  <option value="fecha_evento">Fecha del evento</option>
                </select>
              </label>
              <label>
                Estado evento
                <select
                  value={analyticsFilters.eventStatus}
                  onChange={(event) =>
                    updateAnalyticsFilter('eventStatus', event.target.value)
                  }
                >
                  <option value="TODOS">Todos</option>
                  {analyticsFilterOptions.eventStatus.map((value) => (
                    <option key={`status-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Artista
                <select
                  value={analyticsFilters.artist}
                  onChange={(event) => updateAnalyticsFilter('artist', event.target.value)}
                >
                  <option value="TODOS">Todos</option>
                  {analyticsFilterOptions.artist.map((value) => (
                    <option key={`artist-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Género
                <select
                  value={analyticsFilters.genre}
                  onChange={(event) => updateAnalyticsFilter('genre', event.target.value)}
                >
                  <option value="TODOS">Todos</option>
                  {analyticsFilterOptions.genre.map((value) => (
                    <option key={`genre-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Promotor
                <select
                  value={analyticsFilters.promoter}
                  onChange={(event) => updateAnalyticsFilter('promoter', event.target.value)}
                >
                  <option value="TODOS">Todos</option>
                  {analyticsFilterOptions.promoter.map((value) => (
                    <option key={`promoter-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sala / espacio
                <select
                  value={analyticsFilters.venueSpace}
                  onChange={(event) => updateAnalyticsFilter('venueSpace', event.target.value)}
                >
                  <option value="TODOS">Todos</option>
                  {analyticsFilterOptions.venueSpace.map((value) => (
                    <option key={`venue-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Zona / sección
                <select
                  value={analyticsFilters.zoneSection}
                  onChange={(event) => updateAnalyticsFilter('zoneSection', event.target.value)}
                >
                  <option value="TODOS">Todos</option>
                  {analyticsFilterOptions.zoneSection.map((value) => (
                    <option key={`zone-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tipo de ticket
                <select
                  value={analyticsFilters.ticketType}
                  onChange={(event) => updateAnalyticsFilter('ticketType', event.target.value)}
                >
                  <option value="TODOS">Todos</option>
                  {analyticsFilterOptions.ticketType.map((value) => (
                    <option key={`ticket-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Canal
                <select
                  value={analyticsFilters.channel}
                  onChange={(event) => updateAnalyticsFilter('channel', event.target.value)}
                >
                  <option value="TODOS">Todos</option>
                  {analyticsFilterOptions.channel.map((value) => (
                    <option key={`channel-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Source
                <select
                  value={analyticsFilters.source}
                  onChange={(event) => updateAnalyticsFilter('source', event.target.value)}
                >
                  <option value="TODOS">Todos</option>
                  {analyticsFilterOptions.source.map((value) => (
                    <option key={`source-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Medium
                <select
                  value={analyticsFilters.medium}
                  onChange={(event) => updateAnalyticsFilter('medium', event.target.value)}
                >
                  <option value="TODOS">Todos</option>
                  {analyticsFilterOptions.medium.map((value) => (
                    <option key={`medium-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Campaign
                <select
                  value={analyticsFilters.campaign}
                  onChange={(event) => updateAnalyticsFilter('campaign', event.target.value)}
                >
                  <option value="TODOS">Todos</option>
                  {analyticsFilterOptions.campaign.map((value) => (
                    <option key={`campaign-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {!storageReady ? (
            <section className="panel analytics-state-panel">
              <h3>Cargando datos...</h3>
              <p>Estamos preparando el cuadro de mando analítico.</p>
            </section>
          ) : analyticsFilteredEntries.length === 0 ? (
            <section className="panel analytics-state-panel">
              <h3>Sin datos con los filtros actuales</h3>
              <p>Ajusta filtros o añade movimientos para alimentar el dashboard.</p>
              <button type="button" onClick={handleResetAnalyticsFilters}>
                Resetear filtros
              </button>
            </section>
          ) : (
            <>
              <section className="kpi-grid analytics-kpi-grid">
                {analyticsKpiOrder.map((kpiId) => (
                  <article className="kpi" key={`kpi-${kpiId}`}>
                    <p>{KPI_LABELS[kpiId]}</p>
                    <h2>{formatKpiValue(kpiId, analyticsKpiValues[kpiId] ?? 0)}</h2>
                    <small className="kpi-compare">Cálculo: {KPI_FORMULA_TEXT[kpiId]}</small>
                    <small className="kpi-compare">
                      vs período anterior:{' '}
                      <strong
                        className={
                          computeDeltaPct(
                            analyticsKpiValues[kpiId] ?? 0,
                            analyticsPreviousPeriodKpis[kpiId] ?? 0,
                          ) >= 0
                            ? 'pos'
                            : 'neg'
                        }
                      >
                        {formatDelta(
                          analyticsKpiValues[kpiId] ?? 0,
                          analyticsPreviousPeriodKpis[kpiId] ?? 0,
                        )}
                      </strong>
                    </small>
                    {kpiId in analyticsYearAgoKpis ? (
                      <small className="kpi-compare">
                        vs año anterior:{' '}
                        <strong
                          className={
                            computeDeltaPct(
                              analyticsKpiValues[kpiId] ?? 0,
                              analyticsYearAgoKpis[kpiId as keyof typeof analyticsYearAgoKpis] ?? 0,
                            ) >= 0
                              ? 'pos'
                              : 'neg'
                          }
                        >
                          {formatDelta(
                            analyticsKpiValues[kpiId] ?? 0,
                            analyticsYearAgoKpis[kpiId as keyof typeof analyticsYearAgoKpis] ?? 0,
                          )}
                        </strong>
                      </small>
                    ) : null}
                  </article>
                ))}
              </section>

              {analyticsSection === 'resumen' ? (
                <>
                  <section className="chart-grid">
                    <TrendExplorerChart
                      rows={analyticsSeriesRowsChronological}
                      mode={dashboardChartMode}
                      onModeChange={setDashboardChartMode}
                      period={dashboardChartPeriod}
                      metricsVisible={dashboardMetricsVisible}
                      onToggleMetric={handleToggleDashboardMetric}
                      xAxisLabel={GRANULARITY_AXIS_LABEL[analyticsFilters.granularity]}
                      granularity={analyticsFilters.granularity}
                      dateFrom={analyticsFilters.dateFrom}
                      dateTo={analyticsFilters.dateTo}
                    />
                    <DualBarChart
                      title="Top rendimiento por bloque"
                      rows={[...analyticsSeriesRows].sort((a, b) => b.beneficio - a.beneficio)}
                      xAxisLabel={GRANULARITY_AXIS_LABEL[analyticsFilters.granularity]}
                    />
                    <TrendLineChart
                      title="Beneficio acumulado"
                      rows={analyticsSeriesRowsChronological}
                      metric="beneficio"
                      xAxisLabel={GRANULARITY_AXIS_LABEL[analyticsFilters.granularity]}
                      yAxisLabel="Importe (EUR)"
                      color={METRIC_META.beneficio.color}
                    />
                  </section>

                  <section className="summary-grid analytics-summary-grid">
                    <article className="summary-card">
                      <h3>Próximos eventos (semáforo de riesgo)</h3>
                      <div className="export-actions">
                        <button type="button" onClick={handleExportUpcomingEventsCsv}>
                          Exportar CSV
                        </button>
                      </div>
                      <div className="table-wrap">
                        <table className="summary-table">
                          <thead>
                            <tr>
                              <th>Evento</th>
                              <th>Fecha</th>
                              <th>Ocupación pagada</th>
                              <th>Pace</th>
                              <th>Riesgo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analyticsUpcomingEvents.length === 0 ? (
                              <tr>
                                <td colSpan={5}>No hay eventos próximos con los filtros actuales.</td>
                              </tr>
                            ) : (
                              analyticsUpcomingEvents.map((row) => (
                                <tr key={`upcoming-${row.event}`}>
                                  <td>
                                    <button
                                      type="button"
                                      className="link-button"
                                      onClick={() => {
                                        setSelectedEventDrilldown(row.event)
                                        setAnalyticsSection('evento')
                                      }}
                                    >
                                      {row.event}
                                    </button>
                                  </td>
                                  <td>{formatDateTime(row.eventDateTime)}</td>
                                  <td>{formatPercent(row.ocupacionPagada * 100)}</td>
                                  <td>{NUMBER_2.format(row.paceIndex)}</td>
                                  <td>
                                    <span className={`risk-pill risk-${row.riskLevel.toLowerCase()}`}>{row.riskLevel}</span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>

                    <article className="summary-card">
                      <h3>Ranking top y bottom eventos</h3>
                      <div className="export-actions">
                        <button type="button" onClick={handleExportRankingCsv}>
                          Exportar CSV
                        </button>
                      </div>
                      <div className="table-wrap">
                        <table className="summary-table">
                          <thead>
                            <tr>
                              <th>Evento</th>
                              <th>Beneficio</th>
                              <th>Margen</th>
                              <th>Pace</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analyticsTopEvents.map((row) => (
                              <tr key={`top-${row.event}`}>
                            <td>TOP · {row.event}</td>
                                <td className="pos">{CURRENCY.format(row.beneficio)}</td>
                                <td>{formatPercent(getSafeRate(row.beneficio, Math.max(1, row.ingresosNetos)) * 100)}</td>
                                <td>{NUMBER_2.format(row.paceIndex)}</td>
                              </tr>
                            ))}
                            {analyticsBottomEvents.map((row) => (
                              <tr key={`bottom-${row.event}`}>
                            <td>BOTTOM · {row.event}</td>
                                <td className={row.beneficio >= 0 ? 'pos' : 'neg'}>{CURRENCY.format(row.beneficio)}</td>
                                <td>{formatPercent(getSafeRate(row.beneficio, Math.max(1, row.ingresosNetos)) * 100)}</td>
                                <td>{NUMBER_2.format(row.paceIndex)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  </section>
                </>
              ) : null}

              {analyticsSection === 'ventas' ? (
                <>
                  <section className="chart-grid">
                    <TrendLineChart
                      title="Curva de ventas (ingresos netos)"
                      rows={analyticsSalesCurveRows}
                      metric="ingresos"
                      xAxisLabel={TEMPORAL_AXIS_LABEL[analyticsFilters.temporalAxis]}
                      yAxisLabel="Importe (EUR)"
                      color={METRIC_META.ingresos.color}
                    />
                    <TrendLineChart
                      title="Curva de gastos"
                      rows={analyticsSalesCurveRows}
                      metric="gastos"
                      xAxisLabel={TEMPORAL_AXIS_LABEL[analyticsFilters.temporalAxis]}
                      yAxisLabel="Importe (EUR)"
                      color={METRIC_META.gastos.color}
                    />
                    <TrendLineChart
                      title="Curva de beneficio"
                      rows={analyticsSalesCurveRows}
                      metric="beneficio"
                      xAxisLabel={TEMPORAL_AXIS_LABEL[analyticsFilters.temporalAxis]}
                      yAxisLabel="Importe (EUR)"
                      color={METRIC_META.beneficio.color}
                    />
                  </section>

                  <section className="summary-grid analytics-summary-grid">
                    <SummaryTable title="Ventas por género" rows={analyticsBreakdownByGenre.map((row) => ({
                      key: row.key,
                      ingresos: row.ingresos,
                      gastos: row.gastos,
                      beneficio: row.beneficio,
                      margen: row.ingresos > 0 ? (row.beneficio / row.ingresos) * 100 : 0,
                    }))} />
                    <SummaryTable title="Ventas por promotor" rows={analyticsBreakdownByPromoter.map((row) => ({
                      key: row.key,
                      ingresos: row.ingresos,
                      gastos: 0,
                      beneficio: row.ingresos,
                      margen: 100,
                    }))} />
                    <SummaryTable title="Ventas por artista" rows={analyticsBreakdownByArtist.map((row) => ({
                      key: row.key,
                      ingresos: row.ingresos,
                      gastos: 0,
                      beneficio: row.ingresos,
                      margen: 100,
                    }))} />
                  </section>
                </>
              ) : null}

              {analyticsSection === 'evento' ? (
                <section className="panel analytics-event-detail">
                  <h3>Detalle analítico por evento</h3>
                  <label className="filter-field analytics-event-select">
                    Evento
                    <select
                      value={analyticsSelectedEvent?.event || 'TODOS'}
                      onChange={(event) => setSelectedEventDrilldown(event.target.value)}
                    >
                      {analyticsEventSnapshots.map((snapshot) => (
                        <option key={`event-drill-${snapshot.event}`} value={snapshot.event}>
                          {snapshot.event}
                        </option>
                      ))}
                    </select>
                  </label>

                  {analyticsSelectedEvent ? (
                    <>
                      <div className="analytics-event-kpis">
                        <article>
                          <h4>Ficha evento</h4>
                          <p>Fecha/hora: <strong>{formatDateTime(analyticsSelectedEvent.eventDateTime)}</strong></p>
                          <p>Artista: <strong>{analyticsSelectedEvent.artist}</strong></p>
                          <p>Promotor: <strong>{analyticsSelectedEvent.promoter}</strong></p>
                          <p>Género: <strong>{analyticsSelectedEvent.genre}</strong></p>
                          <p>Estado: <strong>{analyticsSelectedEvent.eventStatus}</strong></p>
                        </article>
                        <article>
                          <h4>Capacidades</h4>
                          <p>Aforo total: <strong>{NUMBER_2.format(analyticsSelectedEvent.totalCapacity)}</strong></p>
                          <p>Aforo liberado: <strong>{NUMBER_2.format(analyticsSelectedEvent.releasedCapacity)}</strong></p>
                          <p>Aforo vendible: <strong>{NUMBER_2.format(analyticsSelectedEvent.sellableCapacity)}</strong></p>
                          <p>Ocupación pagada: <strong>{formatPercent(analyticsSelectedEvent.ocupacionPagada * 100)}</strong></p>
                          <p>Ocupación total: <strong>{formatPercent(analyticsSelectedEvent.ocupacion * 100)}</strong></p>
                        </article>
                        <article>
                          <h4>Tickets y revenue</h4>
                          <p>Pagados: <strong>{NUMBER_2.format(analyticsSelectedEvent.ticketsPagados)}</strong></p>
                          <p>Cortesía: <strong>{NUMBER_2.format(analyticsSelectedEvent.ticketsComp)}</strong></p>
                          <p>Devueltos: <strong>{NUMBER_2.format(analyticsSelectedEvent.ticketsDevueltos)}</strong></p>
                          <p>Escaneados: <strong>{NUMBER_2.format(analyticsSelectedEvent.scannedTickets)}</strong></p>
                          <p>Scan rate: <strong>{formatPercent(analyticsSelectedEvent.scanRate * 100)}</strong></p>
                          <p>No-show: <strong>{formatPercent(analyticsSelectedEvent.noShowRate * 100)}</strong></p>
                          <p>Revenue por asistente: <strong>{CURRENCY.format(analyticsSelectedEvent.revenuePorAsistente)}</strong></p>
                        </article>
                      </div>

                      <section className="chart-grid">
                        <TrendLineChart
                          title="Curva acumulada de ventas (semanal)"
                          rows={analyticsSelectedEventTimeline}
                          metric="ingresos"
                          xAxisLabel="Semana"
                          yAxisLabel="Importe (EUR)"
                          color={METRIC_META.ingresos.color}
                        />
                        <SummaryTable
                          title="Mix por zona / sección"
                          rows={analyticsSelectedEventByZone.map((row) => ({
                            key: row.key,
                            ingresos: row.ingresos,
                            gastos: 0,
                            beneficio: row.ingresos,
                            margen: 100,
                          }))}
                        />
                        <SummaryTable
                          title="Mix por tipo de ticket"
                          rows={analyticsSelectedEventByTicketType.map((row) => ({
                            key: row.key,
                            ingresos: row.ingresos,
                            gastos: 0,
                            beneficio: row.ingresos,
                            margen: 100,
                          }))}
                        />
                      </section>
                    </>
                  ) : (
                    <p>No hay evento seleccionado.</p>
                  )}
                </section>
              ) : null}

              {analyticsSection === 'marketing' ? (
                <section className="summary-grid analytics-summary-grid">
                  <article className="summary-card">
                    <h3>Embudo marketing (source / medium / campaign)</h3>
                    <div className="export-actions">
                      <button type="button" onClick={handleExportMarketingCsv}>
                        Exportar CSV
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table className="summary-table">
                        <thead>
                          <tr>
                            <th>Fuente</th>
                            <th>Ingresos</th>
                            <th>Tickets</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsBreakdownBySource.length === 0 ? (
                            <tr>
                              <td colSpan={3}>Sin datos de atribución todavía.</td>
                            </tr>
                          ) : (
                            analyticsBreakdownBySource.map((row) => (
                              <tr key={`source-row-${row.key}`}>
                                <td>{row.key}</td>
                                <td>{CURRENCY.format(row.ingresos)}</td>
                                <td>{NUMBER_2.format(row.tickets)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </article>

                  <article className="summary-card">
                    <h3>Audiencia: nuevos vs recurrentes</h3>
                    <p>Nuevos: <strong>{NUMBER_2.format(analyticsCustomerMix.nuevos)}</strong> ({formatPercent(analyticsCustomerMix.pctNuevos)})</p>
                    <p>Recurrentes: <strong>{NUMBER_2.format(analyticsCustomerMix.recurrentes)}</strong> ({formatPercent(analyticsCustomerMix.pctRecurrentes)})</p>
                    <p>
                      Si conectas geografía o analítica web, este bloque mostrará también:
                      conversión web, cohortes y distribución geográfica.
                    </p>
                  </article>

                  <SummaryTable
                    title="Ventas por día de la semana"
                    rows={analyticsBreakdownByWeekday.map((row) => ({
                      key: row.key,
                      ingresos: row.ingresos,
                      gastos: 0,
                      beneficio: row.ingresos,
                      margen: 100,
                    }))}
                  />
                </section>
              ) : null}

              {analyticsSection === 'rentabilidad' ? (
                <section className="summary-grid analytics-summary-grid">
                  <article className="summary-card">
                    <h3>Rentabilidad por evento</h3>
                    <div className="table-wrap">
                      <table className="summary-table">
                        <thead>
                          <tr>
                            <th>Evento</th>
                            <th>Ingresos netos</th>
                            <th>Coste directo</th>
                            <th>Margen bruto</th>
                            <th>Revenue por asistente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsEventSnapshots.map((row) => (
                            <tr key={`profit-${row.event}`}>
                              <td>{row.event}</td>
                              <td>{CURRENCY.format(row.ingresosNetos)}</td>
                              <td>{CURRENCY.format(row.directCostAmount)}</td>
                              <td className={row.margenBruto >= 0 ? 'pos' : 'neg'}>
                                {CURRENCY.format(row.margenBruto)}
                              </td>
                              <td>{CURRENCY.format(row.revenuePorAsistente)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>

                  <article className="summary-card">
                    <h3>Operación de sala</h3>
                    <p>
                      Utilización de sala: <strong>{formatPercent((analyticsKpiValues.utilizacion_sala ?? 0) * 100)}</strong>
                    </p>
                    <p>
                      Revenue por día disponible: <strong>{CURRENCY.format(analyticsKpiValues.revenue_por_dia_disponible ?? 0)}</strong>
                    </p>
                    <p>
                      Eventos sold out: <strong>{NUMBER_2.format(analyticsKpiValues.numero_eventos_sold_out ?? 0)}</strong>
                    </p>
                    <p>
                      Eventos en riesgo: <strong>{NUMBER_2.format(analyticsKpiValues.numero_eventos_en_riesgo ?? 0)}</strong>
                    </p>
                  </article>
                </section>
              ) : null}
            </>
          )}
        </>
      ) : null}

      {activeTab === 'informes' ? (
        <>
          <section className="panel report-toolbar report-print-hide">
            <h3>Centro de informes corporativos</h3>
            <p>
              Genera informe escrito para reunión y también una presentación ejecutiva
              lista para descargar en PDF.
            </p>

            <div className="report-controls-grid">
              <label>
                Tipo de informe
                <select
                  value={reportMode}
                  onChange={(event) => setReportMode(event.target.value as ReportMode)}
                >
                  <option value="semana">Semanal</option>
                  <option value="mes">Mensual</option>
                </select>
              </label>

              <label>
                Alcance
                <select
                  value={reportScope}
                  onChange={(event) => setReportScope(event.target.value as AnalysisScope)}
                >
                  <option value="RESUMEN">Resumen (ventas + compras)</option>
                  <option value="VENTAS">Solo ventas</option>
                  <option value="COMPRAS">Solo compras</option>
                </select>
              </label>

              <label>
                Período rápido
                <select
                  value={reportPreset}
                  onChange={(event) =>
                    handleReportPresetChange(event.target.value as ReportRangePreset)
                  }
                >
                  <option value="semana">Semana actual</option>
                  <option value="mes">Mes actual</option>
                  <option value="trimestre">Trimestre actual</option>
                  <option value="ano">Año actual</option>
                  <option value="ano_anterior">Año anterior</option>
                  <option value="todo">Todo</option>
                  <option value="custom">Personalizado</option>
                </select>
              </label>

              <label>
                Desde
                <input
                  type="date"
                  value={reportDateFrom}
                  onChange={(event) => {
                    setReportPreset('custom')
                    setReportDateFrom(event.target.value)
                    setReportChartPeriod('todo')
                  }}
                  disabled={reportPreset === 'todo'}
                />
              </label>

              <label>
                Hasta
                <input
                  type="date"
                  value={reportDateTo}
                  onChange={(event) => {
                    setReportPreset('custom')
                    setReportDateTo(event.target.value)
                    setReportChartPeriod('todo')
                  }}
                  disabled={reportPreset === 'todo'}
                />
              </label>

              <label>
                Vista del gráfico
                <select
                  value={reportChartMode}
                  onChange={(event) =>
                    setReportChartMode(event.target.value as 'barras' | 'linea')
                  }
                >
                  <option value="linea">Línea</option>
                  <option value="barras">Barras</option>
                </select>
              </label>
            </div>

            <div className="report-actions">
              <button type="button" onClick={handleExportReportSummaryCsv}>
                CSV resumen
              </button>
              <button type="button" onClick={handleExportReportSummaryExcel}>
                Excel resumen
              </button>
              <button type="button" onClick={handleExportReportJson}>
                JSON completo
              </button>
              <button type="button" className="report-print-btn" onClick={handlePrintCorporateReport}>
                Informe escrito (PDF)
              </button>
              <button
                type="button"
                className="report-presentation-btn"
                onClick={handlePrintExecutivePresentationPdf}
              >
                Presentación ejecutiva (PDF)
              </button>
            </div>
          </section>

          <section className="report-print-root" id="report-print-root">
            <article className="report-cover">
              <div className="report-brand">
                <img src={logoBellaBestia} alt="Logo Sala Bella Bestia" />
                <div>
                  <p className="report-kicker">{'BELLA BESTIA - INFORME CORPORATIVO'}</p>
                  <h2>Informe {reportMode === 'semana' ? 'semanal' : 'mensual'} de sala</h2>
                  <p>
                    Alcance: <strong>{ANALYSIS_SCOPE_LABEL[reportScope]}</strong>
                  </p>
                  <p>
                    Período analizado: <strong>{reportPeriodLabel}</strong>
                  </p>
                </div>
              </div>

              <div className="report-meta">
                <span>Generado: {reportGeneratedAt}</span>
                <span>{'L\u00edneas analizadas'}: {reportEntries.length}</span>
                <span>Modo: {reportMode === 'semana' ? 'Semanal' : 'Mensual'}</span>
              </div>
            </article>

            <section className="report-highlight-strip">
              <article className="report-highlight">
                <p>Ritmo del período</p>
                <h4>{reportRows.length} bloque(s)</h4>
                <small>
                  {reportPositiveBuckets} en positivo | {reportNegativeBuckets} en alerta
                </small>
              </article>
              <article className="report-highlight">
                <p>{'Bloque m\u00e1s rentable'}</p>
                <h4>{reportBestBucket?.key || 'Sin datos'}</h4>
                <small className={reportBestBucket?.beneficio ?? 0 >= 0 ? 'pos' : 'neg'}>
                  {reportBestBucket ? CURRENCY.format(reportBestBucket.beneficio) : '0,00 EUR'}
                </small>
              </article>
              <article className="report-highlight">
                <p>Bloque a vigilar</p>
                <h4>{reportWorstBucket?.key || 'Sin datos'}</h4>
                <small className={reportWorstBucket?.beneficio ?? 0 >= 0 ? 'pos' : 'neg'}>
                  {reportWorstBucket ? CURRENCY.format(reportWorstBucket.beneficio) : '0,00 EUR'}
                </small>
              </article>
              <article className="report-highlight">
                <p>Intensidad operativa</p>
                <h4>{formatPercent(reportOperationalIntensity)}</h4>
                <small>Peso de gasto sobre volumen total</small>
              </article>
            </section>

            <section className="kpi-grid report-kpi-grid">
              <article className="kpi report-kpi report-kpi-income">
                <p>Ingresos</p>
                <h2>{CURRENCY.format(reportTotals.ingresos)}</h2>
                <small className="kpi-compare">Cálculo: suma de todas las líneas de ingreso del período.</small>
              </article>
              <article className="kpi report-kpi report-kpi-expense">
                <p>Gastos</p>
                <h2>{CURRENCY.format(reportTotals.gastos)}</h2>
                <small className="kpi-compare">Cálculo: suma de todas las líneas de gasto del período.</small>
              </article>
              <article className="kpi report-kpi report-kpi-profit">
                <p>Beneficio</p>
                <h2 className={reportTotals.beneficio >= 0 ? 'pos' : 'neg'}>
                  {CURRENCY.format(reportTotals.beneficio)}
                </h2>
                <small className="kpi-compare">Cálculo: ingresos menos gastos.</small>
              </article>
              <article className="kpi report-kpi report-kpi-average">
                <p>{'Ticket medio por l\u00ednea'}</p>
                <h2>{CURRENCY.format(reportAverageLineAmount)}</h2>
                <small className="kpi-compare">Cálculo: (ingresos + gastos) dividido por número de líneas.</small>
              </article>
            </section>

            <section className="panel report-summary-panel report-index-panel">
              <h3>Índices KPI de dirección</h3>
              <div className="kpi-index-grid">
                {reportKpiIndexes.map((index) => (
                  <article key={`report-index-${index.id}`} className="kpi-index-card">
                    <p>{index.label}</p>
                    <strong
                      className={
                        index.score >= 75 ? 'pos' : index.score >= 50 ? '' : 'neg'
                      }
                    >
                      {NUMBER_0.format(index.score)}/100
                    </strong>
                    <small>{index.insight}</small>
                    <small className="kpi-compare">Cálculo: {index.formula}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel report-summary-panel report-snapshot-panel">
              <h3>Situación automática (ventanas fijas)</h3>
              <div className="table-wrap">
                <table className="report-summary-table">
                  <thead>
                    <tr>
                      <th>Ventana</th>
                      <th>Período</th>
                      <th>Movimientos</th>
                      <th>Ingresos</th>
                      <th>Gastos</th>
                      <th>Beneficio</th>
                      <th>Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportWindowSnapshots.map((row) => (
                      <tr key={`snapshot-${row.id}`}>
                        <td>{row.label}</td>
                        <td>
                          {formatDate(row.from)} - {formatDate(row.to)}
                        </td>
                        <td>{NUMBER_0.format(row.movements)}</td>
                        <td>{CURRENCY.format(row.ingresos)}</td>
                        <td>{CURRENCY.format(row.gastos)}</td>
                        <td className={row.beneficio >= 0 ? 'pos' : 'neg'}>
                          {CURRENCY.format(row.beneficio)}
                        </td>
                        <td>{formatPercent(row.margen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="summary-grid">
              <SummaryTable
                title={`Rentabilidad por tipo de evento · ${reportPeriodScopeLabel}`}
                rows={reportTypeSummaryRows}
              />
              <SummaryTable
                title={`Rentabilidad por franja horaria · ${reportPeriodScopeLabel}`}
                rows={reportTimeSlotSummaryRows}
              />
            </section>

            <section className="panel report-summary-panel">
              <h3>Rentabilidad por evento (vista completa)</h3>
              <div className="table-wrap">
                <table className="report-summary-table">
                  <thead>
                    <tr>
                      <th>Evento</th>
                      <th>Movimientos</th>
                      <th>Ingresos</th>
                      <th>Gastos</th>
                      <th>Beneficio</th>
                      <th>Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRowsByEvent.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No hay eventos en el período seleccionado.</td>
                      </tr>
                    ) : (
                      reportRowsByEvent.map((row) => (
                        <tr key={`report-event-${row.key}`}>
                          <td>{row.key}</td>
                          <td>{reportMovementCountByEvent[row.key] ?? 0}</td>
                          <td>{CURRENCY.format(row.ingresos)}</td>
                          <td>{CURRENCY.format(row.gastos)}</td>
                          <td className={row.beneficio >= 0 ? 'pos' : 'neg'}>
                            {CURRENCY.format(row.beneficio)}
                          </td>
                          <td>{formatPercent(row.margen)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="chart-grid report-chart-grid">
              <TrendExplorerChart
                rows={reportRowsChronological}
                mode={reportChartMode}
                onModeChange={setReportChartMode}
                period={reportChartPeriod}
                metricsVisible={reportMetricsVisible}
                onToggleMetric={handleToggleReportMetric}
                xAxisLabel={reportMode === 'semana' ? 'Semana' : 'Mes'}
                granularity={reportMode === 'semana' ? 'semana' : 'mes'}
                dateFrom={reportDateFrom}
                dateTo={reportDateTo}
              />
              <DonutChart
                title={'Peso por m\u00e9todo de cobro/pago'}
                totalLabel="Total"
                slices={reportPaymentSlices}
              />
              <TrendLineChart
                title={`Evolución de ingresos · ${reportPeriodScopeLabel}`}
                rows={reportMonthlyRowsScoped}
                metric="ingresos"
                xAxisLabel="Mes"
                yAxisLabel="Ingresos (EUR)"
                color={METRIC_META.ingresos.color}
              />
              <TrendLineChart
                title={`Evolución de gastos · ${reportPeriodScopeLabel}`}
                rows={reportMonthlyRowsScoped}
                metric="gastos"
                xAxisLabel="Mes"
                yAxisLabel="Gastos (EUR)"
                color={METRIC_META.gastos.color}
              />
              <TrendLineChart
                title={`Evolución de beneficio · ${reportPeriodScopeLabel}`}
                rows={reportMonthlyRowsScoped}
                metric="beneficio"
                xAxisLabel="Mes"
                yAxisLabel="Beneficio (EUR)"
                color={METRIC_META.beneficio.color}
              />
              <TrendLineChart
                title={`Balance acumulado mensual · ${reportPeriodScopeLabel}`}
                rows={reportCumulativeMonthlyRowsScoped}
                metric="beneficio"
                xAxisLabel="Mes"
                yAxisLabel="Balance acumulado (EUR)"
              />
            </section>

            <section className="panel report-summary-panel">
              <h3>Resumen ejecutivo por bloque</h3>
              {reportBestBucket ? (
                <p className="report-best">
                  {'Bloque m\u00e1s rentable'}: <strong>{reportBestBucket.key}</strong> - Beneficio:{' '}
                  <strong className={reportBestBucket.beneficio >= 0 ? 'pos' : 'neg'}>
                    {CURRENCY.format(reportBestBucket.beneficio)}
                  </strong>
                </p>
              ) : null}
              <div className="table-wrap">
                <table className="report-summary-table">
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Movimientos</th>
                      <th>Ingresos</th>
                      <th>Gastos</th>
                      <th>Beneficio</th>
                      <th>Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No hay datos en el período seleccionado.</td>
                      </tr>
                    ) : (
                      reportRows.map((row) => (
                        <tr key={`report-row-${row.key}`}>
                          <td>{row.key}</td>
                          <td>{reportMovementCountByBucket[row.key] ?? 0}</td>
                          <td>{CURRENCY.format(row.ingresos)}</td>
                          <td>{CURRENCY.format(row.gastos)}</td>
                          <td className={row.beneficio >= 0 ? 'pos' : 'neg'}>
                            {CURRENCY.format(row.beneficio)}
                          </td>
                          <td>{formatPercent(row.margen)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </>
      ) : null}

      {activeTab === 'dashboard' ? (
        <>
          <section className="kpi-grid">
            <article className="kpi">
              <p>{scopeTotalLabel}</p>
              <h2>{CURRENCY.format(scopeTotalAmount)}</h2>
              <small className="kpi-compare">Cálculo: suma de importes del alcance elegido.</small>
            </article>
            <article className="kpi">
              <p>Media por línea</p>
              <h2>{CURRENCY.format(scopeAverageAmount)}</h2>
              <small className="kpi-compare">Cálculo: volumen total dividido por número de líneas.</small>
            </article>
            <article className="kpi">
              <p>Beneficio</p>
              <h2 className={totals.beneficio >= 0 ? 'pos' : 'neg'}>
                {CURRENCY.format(totals.beneficio)}
              </h2>
              <small className="kpi-compare">Cálculo: ingresos menos gastos.</small>
            </article>
            <article className="kpi">
              <p>Margen</p>
              <h2>{formatPercent(totals.margen)}</h2>
              <small className="kpi-compare">Cálculo: beneficio dividido por ingresos.</small>
            </article>
          </section>

          <section className="panel kpi-index-panel">
            <h3>Índices KPI de dirección</h3>
            <div className="kpi-index-grid">
              {dashboardKpiIndexes.map((index) => (
                <article key={`dashboard-index-${index.id}`} className="kpi-index-card">
                  <p>{index.label}</p>
                  <strong
                    className={
                      index.score >= 75 ? 'pos' : index.score >= 50 ? '' : 'neg'
                    }
                  >
                    {NUMBER_0.format(index.score)}/100
                  </strong>
                  <small>{index.insight}</small>
                  <small className="kpi-compare">Cálculo: {index.formula}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="dashboard-insight-grid">
            <article className="panel insight-panel">
              <h3>Radar operativo rápido</h3>
              <ul className="insight-meters">
                <li>
                  <div className="meter-head">
                    <span>
                      {analysisScope === 'COMPRAS'
                        ? 'Pago digital (tarjeta + transferencia)'
                        : 'Cobro digital (tarjeta + transferencia)'}
                    </span>
                    <strong>{formatPercent(digitalShare)}</strong>
                  </div>
                  <div className="meter-track">
                    <span style={{ width: `${Math.min(digitalShare, 100)}%` }} />
                  </div>
                </li>
                <li>
                  <div className="meter-head">
                    <span>
                      {analysisScope === 'COMPRAS'
                        ? 'Peso de pagos en efectivo'
                        : 'Peso de cobros en efectivo'}
                    </span>
                    <strong>{formatPercent(cashShare)}</strong>
                  </div>
                  <div className="meter-track cash">
                    <span style={{ width: `${Math.min(cashShare, 100)}%` }} />
                  </div>
                </li>
                <li>
                  <div className="meter-head">
                    <span>Peso de compras sobre volumen total</span>
                    <strong>{formatPercent(expenseRatio)}</strong>
                  </div>
                  <div className="meter-track expense">
                    <span style={{ width: `${Math.min(expenseRatio, 100)}%` }} />
                  </div>
                </li>
              </ul>
            </article>

            <article className="panel insight-panel">
              <h3>Productividad del período</h3>
              <div className="insight-mini-grid">
                <div>
                  <p>Líneas de ingreso</p>
                  <strong>{incomeLineCount}</strong>
                </div>
                <div>
                  <p>Líneas de gasto</p>
                  <strong>{expenseLineCount}</strong>
                </div>
                <div>
                  <p>Media por ingreso</p>
                  <strong>{CURRENCY.format(averageIncomeLine)}</strong>
                </div>
                <div>
                  <p>Media por gasto</p>
                  <strong>{CURRENCY.format(averageExpenseLine)}</strong>
                </div>
              </div>
            </article>

            <article className="panel insight-panel">
              <h3>Foco de negocio</h3>
              {bestEvent ? (
                <div className="focus-box">
                  <p>
                    Bloque mas rentable: <strong>{bestEvent.key}</strong>
                  </p>
                  <p>
                    Beneficio: <strong>{CURRENCY.format(bestEvent.beneficio)}</strong>
                  </p>
                  <p>Margen: {formatPercent(bestEvent.margen)}</p>
                </div>
              ) : (
                <p>Sin datos de eventos para destacar.</p>
              )}
              {lastMonthRow ? (
                <div className="focus-box">
                  <p>
                    Último mes visible: <strong>{lastMonthRow.key}</strong>
                  </p>
                  <p>
                    Beneficio mensual:{' '}
                    <strong className={lastMonthRow.beneficio >= 0 ? 'pos' : 'neg'}>
                      {CURRENCY.format(lastMonthRow.beneficio)}
                    </strong>
                  </p>
                  {previousMonthRow ? (
                    <p className={monthDelta >= 0 ? 'pos' : 'neg'}>
                      Variación vs mes anterior: {CURRENCY.format(monthDelta)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          </section>

          <section className="chart-grid">
            <DonutChart
              title={
                analysisScope === 'COMPRAS'
                  ? 'Quesito de compras por método'
                  : 'Quesito de ventas por método'
              }
              totalLabel={analysisScope === 'COMPRAS' ? 'Pagos' : 'Cobros'}
              slices={paymentSlices}
            />
            <TrendExplorerChart
              rows={visibleSummaryByActiveMode}
              mode={dashboardChartMode}
              onModeChange={setDashboardChartMode}
              period={dashboardChartPeriod}
              metricsVisible={dashboardMetricsVisible}
              onToggleMetric={handleToggleDashboardMetric}
              xAxisLabel={VIEW_MODE_AXIS_LABEL[viewMode]}
              granularity={viewMode}
              dateFrom={analysisPreset === 'todo' ? undefined : analysisDateFrom}
              dateTo={analysisPreset === 'todo' ? undefined : analysisDateTo}
            />
            <TrendLineChart
              title={`Tendencia mensual de ingresos · ${dashboardPeriodLabel}`}
              rows={dashboardMonthlyTrendRows}
              metric="ingresos"
              xAxisLabel="Mes"
              yAxisLabel="Ingresos (EUR)"
              color={METRIC_META.ingresos.color}
            />
            <TrendLineChart
              title={`Tendencia mensual de gastos · ${dashboardPeriodLabel}`}
              rows={dashboardMonthlyTrendRows}
              metric="gastos"
              xAxisLabel="Mes"
              yAxisLabel="Gastos (EUR)"
              color={METRIC_META.gastos.color}
            />
            <TrendLineChart
              title={`Tendencia mensual de beneficio · ${dashboardPeriodLabel}`}
              rows={dashboardMonthlyTrendRows}
              metric="beneficio"
              xAxisLabel="Mes"
              yAxisLabel="Beneficio (EUR)"
              color={METRIC_META.beneficio.color}
            />
            <DualBarChart
              title="Barras semanales (ingresos vs gastos)"
              rows={dashboardWeeklyTrendRows}
              xAxisLabel="Semana"
            />
            <TrendLineChart
              title={`Balance acumulado mensual · ${dashboardPeriodLabel}`}
              rows={dashboardCumulativeMonthlyRows}
              metric="beneficio"
              xAxisLabel="Mes"
              yAxisLabel="Balance acumulado (EUR)"
            />
          </section>

          <section className="tax-grid">
            <article className="panel tax-card">
              <h3>Panel fiscal (IVA y retenciones)</h3>
              <ul>
                <li>
                  <span>IVA repercutido (ingresos)</span>
                  <strong>{CURRENCY.format(taxTotals.ivaRepercutido)}</strong>
                </li>
                <li>
                  <span>IVA soportado (gastos)</span>
                  <strong>{CURRENCY.format(taxTotals.ivaSoportado)}</strong>
                </li>
                <li>
                  <span>Saldo IVA estimado</span>
                  <strong className={taxTotals.saldoIva >= 0 ? 'neg' : 'pos'}>
                    {CURRENCY.format(taxTotals.saldoIva)}
                  </strong>
                </li>
              </ul>
            </article>
            <article className="panel tax-card">
              <h3>Retenciones (ej. DJs con IRPF)</h3>
              <ul>
                <li>
                  <span>Retencion sufrida en ingresos</span>
                  <strong>{CURRENCY.format(taxTotals.retencionSufrida)}</strong>
                </li>
                <li>
                  <span>Retencion practicada en gastos</span>
                  <strong>{CURRENCY.format(taxTotals.retencionPracticada)}</strong>
                </li>
                <li>
                  <span>Control recomendado</span>
                  <strong>Revision mensual modelo fiscal</strong>
                </li>
              </ul>
            </article>
          </section>

          <section className="split-grid">
            <article className="panel">
              <h3>Detalle de gastos por categoría</h3>
              {expenseByCategory.length === 0 ? (
                <p>Sin gastos en este filtro.</p>
              ) : (
                <ul className="bar-list">
                  {expenseByCategory.map((item) => (
                    <li key={item.category}>
                      <div className="bar-head">
                        <span>{item.category}</span>
                        <span>{CURRENCY.format(item.amount)}</span>
                      </div>
                      <div className="bar-track">
                        <span style={{ width: `${Math.min(item.ratio, 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="panel">
              <h3>
                {analysisScope === 'COMPRAS'
                  ? 'Compras por método de pago'
                  : 'Ventas por método de cobro'}
              </h3>
              <ul className="payment-list">
                {paymentSlices.map((slice) => (
                  <li key={`payment-${slice.label}`}>
                    <span>{slice.label}</span>
                    <strong>{CURRENCY.format(slice.value)}</strong>
                    <small>{formatPercent((slice.value / totalMethodBase) * 100)}</small>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </>
      ) : null}

      {activeTab === 'escenarios' ? (
        <>
          <section className="panel scenario-settings">
            <h3>Escenarios de cuadro de mando</h3>
            <p>
              Aquí simulamos qué pasaría si el negocio va mejor o peor.
            </p>
            <p>
              Paso 1: elige período. Paso 2: mueve los controles. Paso 3: revisa el resultado.
            </p>
            <label className="filter-field" htmlFor="scenario-range">
              Período rápido
              <select
                id="scenario-range"
                value={scenarioPeriod}
                onChange={(event) =>
                  setScenarioPeriod(event.target.value as ChartPeriodPreset)
                }
              >
                <option value="3m">Últimos 3 meses</option>
                <option value="6m">Últimos 6 meses</option>
                <option value="12m">Últimos 12 meses</option>
                <option value="todo">Todo</option>
              </select>
            </label>
            <p>
              Período activo: <strong>{scenarioPeriodLabel}</strong> ({scenarioScopedMonthlyRows.length}{' '}
              meses con datos).
            </p>
            <div className="scenario-controls-grid">
              <label className="scenario-control">
                <span>Optimista: cambio en ingresos</span>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={scenarioAdjustments.optimisticIncomePct}
                  onChange={(event) =>
                    setScenarioAdjustments((prev) => ({
                      ...prev,
                      optimisticIncomePct: Number(event.target.value),
                    }))
                  }
                />
                <strong>{formatSignedPercent(scenarioAdjustments.optimisticIncomePct)}</strong>
              </label>

              <label className="scenario-control">
                <span>Optimista: cambio en gastos</span>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  step="1"
                  value={scenarioAdjustments.optimisticExpensePct}
                  onChange={(event) =>
                    setScenarioAdjustments((prev) => ({
                      ...prev,
                      optimisticExpensePct: Number(event.target.value),
                    }))
                  }
                />
                <strong>{formatSignedPercent(scenarioAdjustments.optimisticExpensePct)}</strong>
              </label>

              <label className="scenario-control">
                <span>Pesimista: cambio en ingresos</span>
                <input
                  type="range"
                  min="-60"
                  max="0"
                  step="1"
                  value={scenarioAdjustments.pessimisticIncomePct}
                  onChange={(event) =>
                    setScenarioAdjustments((prev) => ({
                      ...prev,
                      pessimisticIncomePct: Number(event.target.value),
                    }))
                  }
                />
                <strong>{formatSignedPercent(scenarioAdjustments.pessimisticIncomePct)}</strong>
              </label>

              <label className="scenario-control">
                <span>Pesimista: cambio en gastos</span>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={scenarioAdjustments.pessimisticExpensePct}
                  onChange={(event) =>
                    setScenarioAdjustments((prev) => ({
                      ...prev,
                      pessimisticExpensePct: Number(event.target.value),
                    }))
                  }
                />
                <strong>{formatSignedPercent(scenarioAdjustments.pessimisticExpensePct)}</strong>
              </label>
            </div>
          </section>

          <section className="scenario-grid">
            {scenarioRows.map((scenario) => (
              <article className="scenario" key={scenario.name}>
                <h3>{scenario.name}</h3>
                <p>Ingresos: {CURRENCY.format(scenario.income)}</p>
                <p>Gastos: {CURRENCY.format(scenario.expense)}</p>
                <p className={scenario.net >= 0 ? 'pos' : 'neg'}>
                  Resultado: {CURRENCY.format(scenario.net)}
                </p>
              </article>
            ))}
          </section>

          <section className="dashboard-insight-grid">
            <article className="panel insight-panel">
              <h3>Impacto vs escenario base</h3>
              <div className="focus-box">
                <p>
                  Optimista:{" "}
                  <strong className={scenarioRows[1].net - scenarioBase.net >= 0 ? 'pos' : 'neg'}>
                    {CURRENCY.format(scenarioRows[1].net - scenarioBase.net)}
                  </strong>
                </p>
                <p>
                  Pesimista:{" "}
                  <strong className={scenarioRows[2].net - scenarioBase.net >= 0 ? 'pos' : 'neg'}>
                    {CURRENCY.format(scenarioRows[2].net - scenarioBase.net)}
                  </strong>
                </p>
              </div>
            </article>
            <article className="panel insight-panel">
              <h3>Margen por escenario</h3>
              <ul className="insight-meters">
                {scenarioRows.map((scenario) => {
                  const margin =
                    scenario.income > 0 ? (scenario.net / scenario.income) * 100 : 0
                  return (
                    <li key={`scenario-margin-${scenario.name}`}>
                      <div className="meter-head">
                        <span>{scenario.name}</span>
                        <strong>{formatPercent(margin)}</strong>
                      </div>
                      <div className="meter-track">
                        <span style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </article>
            <article className="panel insight-panel">
              <h3>Lectura rápida</h3>
              <div className="focus-box">
                <p>
                  Mejor escenario: <strong>{scenarioRows[1].name}</strong>
                </p>
                <p>
                  Resultado:{" "}
                  <strong className={scenarioRows[1].net >= 0 ? 'pos' : 'neg'}>
                    {CURRENCY.format(scenarioRows[1].net)}
                  </strong>
                </p>
              </div>
              <div className="focus-box">
                <p>
                  Escenario de riesgo: <strong>{scenarioRows[2].name}</strong>
                </p>
                <p>
                  Resultado:{" "}
                  <strong className={scenarioRows[2].net >= 0 ? 'pos' : 'neg'}>
                    {CURRENCY.format(scenarioRows[2].net)}
                  </strong>
                </p>
              </div>
            </article>
          </section>

          <section className="chart-grid">
            <DualBarChart
              title={`Comparativa por escenario (${scenarioPeriodLabel})`}
              rows={scenarioAggregatedRows}
              xAxisLabel="Escenario"
            />
            <TrendLineChart
              title={`Evolución de beneficio (${scenarioPeriodLabel})`}
              rows={scenarioScopedMonthlyRows}
              metric="beneficio"
              xAxisLabel="Mes"
              yAxisLabel="Beneficio (EUR)"
              color={METRIC_META.beneficio.color}
            />
            <TrendLineChart
              title={`Evolución de ingresos (${scenarioPeriodLabel})`}
              rows={scenarioScopedMonthlyRows}
              metric="ingresos"
              xAxisLabel="Mes"
              yAxisLabel="Ingresos (EUR)"
              color={METRIC_META.ingresos.color}
            />
            <TrendLineChart
              title={`Evolución de gastos (${scenarioPeriodLabel})`}
              rows={scenarioScopedMonthlyRows}
              metric="gastos"
              xAxisLabel="Mes"
              yAxisLabel="Gastos (EUR)"
              color={METRIC_META.gastos.color}
            />
          </section>

          <section className="panel scenario-compare">
            <h3>Comparativa contra escenario base</h3>
            <div className="table-wrap">
              <table className="scenario-table">
                <thead>
                  <tr>
                    <th>Escenario</th>
                    <th>Diferencia ingresos</th>
                    <th>Diferencia gastos</th>
                    <th>Diferencia resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioRows.slice(1).map((scenario) => (
                    <tr key={`compare-${scenario.name}`}>
                      <td>{scenario.name}</td>
                      <td className={scenario.income - scenarioBase.income >= 0 ? 'pos' : 'neg'}>
                        {CURRENCY.format(scenario.income - scenarioBase.income)}
                      </td>
                      <td className={scenario.expense - scenarioBase.expense >= 0 ? 'neg' : 'pos'}>
                        {CURRENCY.format(scenario.expense - scenarioBase.expense)}
                      </td>
                      <td className={scenario.net - scenarioBase.net >= 0 ? 'pos' : 'neg'}>
                        {CURRENCY.format(scenario.net - scenarioBase.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === 'movimientos' ? (
        <>
          <section className="panel backup-panel">
            <h3>Respaldo y exportación de líneas diarias</h3>
            <p>
              Tu base queda respaldada en el navegador automáticamente y puedes
              descargar copia completa cuando quieras.
            </p>
            <p className="backup-status">
              Último respaldo local:{' '}
              <strong>{lastLocalBackupAt || 'pendiente de primer guardado'}</strong>
            </p>
            <p className="backup-status">
              Fuente activa:{' '}
              <strong>
                {isGoogleSheetsSource
                  ? `Google Sheets (${sourceInfo.sheet?.mainTab || 'Movimientos'})`
                  : 'respaldo local'}
              </strong>
            </p>
            {isSheetReadOnlyMode ? (
              <p className="source-note">
                Modo visor activo: la aplicación no permite editar ni borrar líneas.
                Todo se gestiona en Google Sheets y luego pulsas "Recargar desde hoja".
              </p>
            ) : null}
            <div className="export-actions">
              <button type="button" onClick={handleExportCsvCombined}>
                CSV combinado
              </button>
              <button type="button" onClick={handleExportCsvIngresos}>
                CSV ingresos
              </button>
              <button type="button" onClick={handleExportCsvGastos}>
                CSV gastos
              </button>
              <button type="button" onClick={handleExportExcel}>
                Exportar Excel
              </button>
              <button type="button" onClick={handleExportJson}>
                Backup JSON
              </button>
            </div>
          </section>

          <section className="movement-forms-grid">
            <article className="panel movement-panel">
              <h3>Panel unico de movimientos</h3>
              <form
                className="entry-form"
                onSubmit={(event) =>
                  handleSubmitForType(event, movementFormType, activeMovementDraft)
                }
              >
                <fieldset className="entry-form-fieldset" disabled={isSheetReadOnlyMode}>
                <label>
                  Tipo
                  <select
                    value={movementFormType}
                    onChange={(event) =>
                      handleMovementFormTypeChange(event.target.value as MovementType)
                    }
                  >
                    <option value="INGRESO">Ingreso</option>
                    <option value="GASTO">Gasto</option>
                  </select>
                </label>
                <label>
                  Fecha
                  <input
                    type="date"
                    value={activeMovementDraft.date}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Fecha compra
                  <input
                    type="date"
                    value={activeMovementDraft.purchaseDate}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        purchaseDate: e.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Fecha y hora evento
                  <input
                    type="datetime-local"
                    value={activeMovementDraft.eventDateTime}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        eventDateTime: e.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Evento
                  <input
                    list="movement-event-list"
                    value={activeMovementDraft.event}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        event: e.target.value,
                      }))
                    }
                    required
                  />
                  <datalist id="movement-event-list">
                    {eventOptions.map((eventName) => (
                      <option key={`movement-${eventName}`} value={eventName} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Estado evento
                  <select
                    value={activeMovementDraft.eventStatus}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        eventStatus: e.target.value as EventStatus,
                      }))
                    }
                  >
                    <option value="PROGRAMADO">Programado</option>
                    <option value="EN_CURSO">En curso</option>
                    <option value="FINALIZADO">Finalizado</option>
                    <option value="CANCELADO">Cancelado</option>
                    <option value="APLAZADO">Aplazado</option>
                  </select>
                </label>
                <label>
                  Artista
                  <input
                    type="text"
                    value={activeMovementDraft.artist}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        artist: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Género
                  <input
                    type="text"
                    value={activeMovementDraft.genre}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        genre: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Promotor
                  <input
                    type="text"
                    value={activeMovementDraft.promoter}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        promoter: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Sala / espacio
                  <input
                    type="text"
                    value={activeMovementDraft.venueSpace}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        venueSpace: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Zona / sección
                  <input
                    type="text"
                    value={activeMovementDraft.zoneSection}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        zoneSection: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Tipo ticket
                  <input
                    type="text"
                    value={activeMovementDraft.ticketType}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        ticketType: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {movementUi.methodLabel}
                  <select
                    value={activeMovementDraft.paymentMethod}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        paymentMethod: e.target.value as PaymentMethod,
                      }))
                    }
                  >
                    <option value="TARJETA">Tarjeta</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </label>
                <label>
                  Segmento cliente
                  <select
                    value={activeMovementDraft.customerSegment}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        customerSegment: e.target.value as CustomerSegment,
                      }))
                    }
                  >
                    <option value="NUEVO">Nuevo</option>
                    <option value="RECURRENTE">Recurrente</option>
                  </select>
                </label>
                <label>
                  Canal
                  <input
                    type="text"
                    value={activeMovementDraft.channel}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        channel: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Source
                  <input
                    type="text"
                    value={activeMovementDraft.source}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        source: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Medium
                  <input
                    type="text"
                    value={activeMovementDraft.medium}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        medium: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Campaign
                  <input
                    type="text"
                    value={activeMovementDraft.campaign}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        campaign: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Categoría
                  <select
                    value={activeMovementDraft.category}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  >
                    {movementUi.categories.map((category) => (
                      <option key={`${movementFormType}-cat-${category}`} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tipo de IVA
                  <select
                    value={activeMovementDraft.vatType}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        vatType: e.target.value as VatType,
                      }))
                    }
                  >
                    {VAT_OPTIONS.map((option) => (
                      <option key={`${movementFormType}-vat-${option.type}`} value={option.type}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Retencion (%)
                  <select
                    value={activeMovementDraft.withholdingRate}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        withholdingRate: Number(e.target.value),
                      }))
                    }
                  >
                    {WITHHOLDING_OPTIONS.map((option) => (
                      <option key={`${movementFormType}-ret-${option}`} value={option}>
                        {formatPercent(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Concepto
                  <input
                    type="text"
                    value={activeMovementDraft.concept}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        concept: e.target.value,
                      }))
                    }
                    placeholder={movementUi.conceptPlaceholder}
                    required
                  />
                </label>
                <label>
                  Base imponible EUR
                  <input
                    type="text"
                    inputMode="decimal"
                    value={activeMovementDraft.baseAmount}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        baseAmount: e.target.value,
                      }))
                    }
                    placeholder="0,00"
                    required
                  />
                </label>
                <label>
                  Tickets pagados
                  <input
                    type="text"
                    inputMode="numeric"
                    value={activeMovementDraft.ticketCount}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        ticketCount: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Tickets cortesía
                  <input
                    type="text"
                    inputMode="numeric"
                    value={activeMovementDraft.ticketCompCount}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        ticketCompCount: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Tickets devueltos
                  <input
                    type="text"
                    inputMode="numeric"
                    value={activeMovementDraft.ticketRefundCount}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        ticketRefundCount: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Tickets escaneados
                  <input
                    type="text"
                    inputMode="numeric"
                    value={activeMovementDraft.scannedCount}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        scannedCount: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Descuento EUR
                  <input
                    type="text"
                    inputMode="decimal"
                    value={activeMovementDraft.discountAmount}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        discountAmount: e.target.value,
                      }))
                    }
                    placeholder="0,00"
                  />
                </label>
                <label>
                  Fee asumida EUR
                  <input
                    type="text"
                    inputMode="decimal"
                    value={activeMovementDraft.feeAssumedAmount}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        feeAssumedAmount: e.target.value,
                      }))
                    }
                    placeholder="0,00"
                  />
                </label>
                <label>
                  Waitlist
                  <input
                    type="text"
                    inputMode="numeric"
                    value={activeMovementDraft.waitlistCount}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        waitlistCount: e.target.value,
                      }))
                    }
                  />
                </label>
                <div className="tax-preview wide">
                  <p>
                    <span>Base:</span>{' '}
                    <strong>{CURRENCY.format(activeMovementTotals.baseAmount || 0)}</strong>
                  </p>
                  <p>
                    <span>IVA ({formatPercent(activeMovementTotals.vatRate)}):</span>{' '}
                    <strong>{CURRENCY.format(activeMovementTotals.vatAmount)}</strong>
                  </p>
                  <p>
                    <span>
                      Retencion ({formatPercent(activeMovementDraft.withholdingRate)}):
                    </span>{' '}
                    <strong>{CURRENCY.format(activeMovementTotals.withholdingAmount)}</strong>
                  </p>
                  <p>
                    <span>Descuento:</span>{' '}
                    <strong>{CURRENCY.format(activeMovementTotals.discountAmount)}</strong>
                  </p>
                  <p>
                    <span>Fee asumida:</span>{' '}
                    <strong>{CURRENCY.format(activeMovementTotals.feeAssumedAmount)}</strong>
                  </p>
                  <p className="tax-total-line">
                    <span>Total línea:</span>{' '}
                    <strong>{CURRENCY.format(activeMovementTotals.totalAmount)}</strong>
                  </p>
                </div>
                <label className="wide">
                  Notas
                  <input
                    type="text"
                    value={activeMovementDraft.notes}
                    onChange={(e) =>
                      updateDraft(movementFormType, (prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Detalle opcional"
                  />
                </label>
                <div className="form-actions wide">
                  <button type="submit" className="submit">
                    {isEditingCurrentMovement
                      ? `Guardar ${movementUi.label.toLowerCase()}`
                      : movementUi.actionLabel}
                  </button>
                  {isEditingCurrentMovement ? (
                    <button
                      type="button"
                      className="submit secondary"
                      onClick={() =>
                        resetForm(
                          movementFormType,
                          activeMovementDraft.event || 'Evento nuevo',
                        )
                      }
                    >
                      Cancelar edicion
                    </button>
                  ) : null}
                </div>
                </fieldset>
              </form>
            </article>
          </section>
          {formError ? <p className="form-error">{formError}</p> : null}
        </>
      ) : null}

      {activeTab === 'libro' ? (
        <>
          <section className="panel diario-filtros">
            <h3>Libro diario contable</h3>
            <p>Filtra por fechas y encuentra cualquier movimiento en segundos.</p>

            <div className="diario-filtros-grid">
              <label>
                Período rápido
                <select
                  value={diaryPreset}
                  onChange={(event) =>
                    handleDiaryPresetChange(event.target.value as DiaryRangePreset)
                  }
                >
                  <option value="hoy">Hoy</option>
                  <option value="7dias">Últimos 7 días</option>
                  <option value="mes">Mes actual</option>
                  <option value="ano">Año actual</option>
                  <option value="todo">Todo</option>
                  <option value="custom">Personalizado</option>
                </select>
              </label>

              <label>
                Desde
                <input
                  type="date"
                  value={diaryDateFrom}
                  onChange={(event) => {
                    setDiaryPreset('custom')
                    setDiaryDateFrom(event.target.value)
                  }}
                  disabled={diaryPreset === 'todo'}
                />
              </label>

              <label>
                Hasta
                <input
                  type="date"
                  value={diaryDateTo}
                  onChange={(event) => {
                    setDiaryPreset('custom')
                    setDiaryDateTo(event.target.value)
                  }}
                  disabled={diaryPreset === 'todo'}
                />
              </label>

              <label>
                Tipo
                <select
                  value={diaryTypeFilter}
                  onChange={(event) =>
                    setDiaryTypeFilter(event.target.value as 'TODOS' | MovementType)
                  }
                >
                  <option value="TODOS">Todos</option>
                  <option value="INGRESO">Ingresos</option>
                  <option value="GASTO">Gastos</option>
                </select>
              </label>

              <label>
                Método
                <select
                  value={diaryMethodFilter}
                  onChange={(event) =>
                    setDiaryMethodFilter(event.target.value as 'TODOS' | PaymentMethod)
                  }
                >
                  <option value="TODOS">Todos</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </label>

              <label>
                Evento
                <select
                  value={diaryEventFilter}
                  onChange={(event) => setDiaryEventFilter(event.target.value)}
                >
                  <option value="TODOS">Todos</option>
                  {eventOptions.map((eventName) => (
                    <option key={`diary-${eventName}`} value={eventName}>
                      {eventName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="diario-wide">
                Buscar texto
                <input
                  type="text"
                  value={diarySearch}
                  onChange={(event) => setDiarySearch(event.target.value)}
                  placeholder="Concepto, categoría o nota"
                />
              </label>
            </div>

            <div className="diario-resumen">
              <span>
                Lineas mostradas: <strong>{diaryEntries.length}</strong>
              </span>
              <span>
                Ingresos: <strong>{CURRENCY.format(diaryTotals.ingresos)}</strong>
              </span>
              <span>
                Gastos: <strong>{CURRENCY.format(diaryTotals.gastos)}</strong>
              </span>
              <span>
                Balance: <strong className={diaryTotals.balance >= 0 ? 'pos' : 'neg'}>{CURRENCY.format(diaryTotals.balance)}</strong>
              </span>
            </div>

            <div className="export-actions">
              <button type="button" onClick={handleExportDiaryCsv}>
                CSV del filtro
              </button>
              <button type="button" onClick={handleExportDiaryExcel}>
                Excel del filtro
              </button>
              <button type="button" onClick={handleExportDiaryJson}>
                JSON del filtro
              </button>
              <button type="button" onClick={handleResetDiaryFilters}>
                Limpiar filtros
              </button>
            </div>
          </section>

          <section className="panel">
            <h3>Detalle línea a línea</h3>
            {isSheetReadOnlyMode ? (
              <p className="source-note">
                Modo visor activo: aquí solo filtras y analizas. Para cambios de datos usa Google Sheets.
              </p>
            ) : null}
            <div className="table-wrap">
              <table className="entries-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Evento</th>
                    <th>Tipo</th>
                    <th>Método</th>
                    <th>Categoría</th>
                    <th>Concepto</th>
                    <th>Base</th>
                    <th>IVA</th>
                    <th>Ret.</th>
                    <th>Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {diaryEntries.length === 0 ? (
                    <tr>
                      <td colSpan={11}>No hay movimientos con este filtro.</td>
                    </tr>
                  ) : (
                    diaryEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.date)}</td>
                        <td>{entry.event}</td>
                        <td>
                          <span
                            className={
                              entry.movementType === 'INGRESO' ? 'pill in' : 'pill out'
                            }
                          >
                            {entry.movementType}
                          </span>
                        </td>
                        <td>{entry.paymentMethod}</td>
                        <td>{entry.category}</td>
                        <td>{entry.concept}</td>
                        <td>{CURRENCY.format(entry.baseAmount ?? entry.amount)}</td>
                        <td>
                          {getVatLabel(entry.vatType)} -{' '}
                          {CURRENCY.format(entry.vatAmount ?? 0)}
                        </td>
                        <td>
                          {formatPercent(entry.withholdingRate ?? 0)} -{' '}
                          {CURRENCY.format(entry.withholdingAmount ?? 0)}
                        </td>
                        <td>{CURRENCY.format(entry.amount)}</td>
                        <td>
                          {isSheetReadOnlyMode ? (
                            <span className="source-lock-pill">Solo lectura</span>
                          ) : (
                            <div className="action-buttons">
                              <button
                                type="button"
                                className="action-edit"
                                onClick={() => startEdit(entry)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="action-delete"
                                onClick={() => removeEntry(entry)}
                              >
                                Borrar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === 'eventos' ? (
        <>
          <section className="panel">
            <h3>Eventos: lectura fácil</h3>
            <p>1) Elige un período.</p>
            <p>2) Mira cada evento con ingresos, gastos y beneficio.</p>
            <p>3) Si un evento sale en rojo, hay que revisarlo.</p>
            <label className="filter-field" htmlFor="events-range">
              Período rápido
              <select
                id="events-range"
                value={eventsRangePreset}
                onChange={(event) =>
                  setEventsRangePreset(event.target.value as EventsRangePreset)
                }
              >
                <option value="semana">Última semana</option>
                <option value="mes">Último mes</option>
                <option value="3m">Últimos 3 meses</option>
                <option value="6m">Últimos 6 meses</option>
                <option value="12m">Últimos 12 meses</option>
                <option value="todo">Todo</option>
              </select>
            </label>
            <p>
              Período activo: <strong>{EVENTS_RANGE_LABEL[eventsRangePreset]}</strong>
              {eventsRangePreset !== 'todo' && eventsRange.from && eventsRange.to ? (
                <> ({formatDate(eventsRange.from)} - {formatDate(eventsRange.to)})</>
              ) : null}
            </p>
          </section>

          <section className="summary-grid">
            <SummaryTable
              title={`Todos los eventos · ${EVENTS_RANGE_LABEL[eventsRangePreset]}`}
              rows={eventSummaryRows}
            />
            <article className="panel event-card">
              <h3>Resumen del período</h3>
              <p>
                Eventos visibles: <strong>{eventSummaryRows.length}</strong>
              </p>
              <p>
                Líneas contables: <strong>{eventTabEntries.length}</strong>
              </p>
              <p>Ingresos: {CURRENCY.format(eventTabTotals.ingresos)}</p>
              <p>Gastos: {CURRENCY.format(eventTabTotals.gastos)}</p>
              <p className={eventTabTotals.beneficio >= 0 ? 'pos' : 'neg'}>
                Beneficio: {CURRENCY.format(eventTabTotals.beneficio)}
              </p>
              <p>
                Tipo más rentable:{' '}
                <strong>{bestEventTypeRow ? bestEventTypeRow.key : 'Sin datos'}</strong>
                {bestEventTypeRow ? ` (${CURRENCY.format(bestEventTypeRow.beneficio)})` : ''}
              </p>
              <p>
                Franja más rentable:{' '}
                <strong>{bestEventTimeSlotRow ? bestEventTimeSlotRow.key : 'Sin datos'}</strong>
                {bestEventTimeSlotRow ? ` (${CURRENCY.format(bestEventTimeSlotRow.beneficio)})` : ''}
              </p>
            </article>
          </section>

          <section className="summary-grid">
            <SummaryTable
              title={`Rentabilidad por tipo de evento · ${EVENTS_RANGE_LABEL[eventsRangePreset]}`}
              rows={eventTabTypeSummaryRows}
            />
            <SummaryTable
              title={`Rentabilidad por franja horaria · ${EVENTS_RANGE_LABEL[eventsRangePreset]}`}
              rows={eventTabTimeSlotSummaryRows}
            />
          </section>

          <section className="event-card-grid">
            {eventSummaryRows.length === 0 ? (
              <article className="event-card">
                <h3>Sin datos</h3>
                <p>No hay eventos para este período.</p>
              </article>
            ) : (
              eventSummaryRows.map((row) => (
                <article key={row.key} className="event-card">
                  <h3>{row.key}</h3>
                  <p>
                    Movimientos: <strong>{movementCountByEventTab[row.key] ?? 0}</strong>
                  </p>
                  <p>Ingresos: {CURRENCY.format(row.ingresos)}</p>
                  <p>Gastos: {CURRENCY.format(row.gastos)}</p>
                  <p className={row.beneficio >= 0 ? 'pos' : 'neg'}>
                    Beneficio: {CURRENCY.format(row.beneficio)}
                  </p>
                  <p>Margen: {formatPercent(row.margen)}</p>
                </article>
              ))
            )}
          </section>

          <section className="chart-grid">
            <DualBarChart
              title={`Comparativa por evento · ${EVENTS_RANGE_LABEL[eventsRangePreset]}`}
              rows={eventSummaryRows}
              xAxisLabel="Evento"
            />
            <TrendLineChart
              title={`Tendencia mensual de beneficio · ${EVENTS_RANGE_LABEL[eventsRangePreset]}`}
              rows={eventTabMonthlyTrendRows}
            />
          </section>

          <section className="chart-grid">
            <DualBarChart
              title={`Rentabilidad por tipo de evento · ${EVENTS_RANGE_LABEL[eventsRangePreset]}`}
              rows={eventTabTypeSummaryRows}
              xAxisLabel="Tipo de evento"
            />
            <DualBarChart
              title={`Rentabilidad por franja horaria · ${EVENTS_RANGE_LABEL[eventsRangePreset]}`}
              rows={eventTabTimeSlotSummaryRows}
              xAxisLabel="Franja horaria"
            />
          </section>
        </>
      ) : null}

      {activeTab === 'auditoria' ? (
        <>
          <section className="audit-overview">
            <article className="panel audit-score">
              <h3>Salud contable del bloque</h3>
              <div className="score-line">
                <strong>{auditScore}/100</strong>
                <span>{auditFindings.length} alerta(s)</span>
              </div>
              <p>
                Objetivo recomendado: mantener la salud por encima de 80 con cierre
                semanal y conciliacion mensual.
              </p>
            </article>
            <article className="panel audit-plan">
              <h3>Método recomendado para Bella Bestia</h3>
              <ol>
                <li>Registro diario línea a línea, sin agrupar tickets.</li>
                <li>
                    Cierre por evento con caja, tarjeta y transferencia separadas.
                </li>
                <li>Cierre semanal para detectar desviaciones de gasto rápido.</li>
                <li>Cierre mensual con escenario base/optimista/pesimista.</li>
              </ol>
            </article>
          </section>

          <section className="finding-grid">
            {auditFindings.map((finding) => (
              <article
                className={`finding severity-${finding.severity.toLowerCase()}`}
                key={finding.id}
              >
                <p className="finding-level">{finding.severity}</p>
                <h3>{finding.title}</h3>
                <p>{finding.detail}</p>
                <p className="finding-action">Acción: {finding.action}</p>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </main>
  )
}

export default App




