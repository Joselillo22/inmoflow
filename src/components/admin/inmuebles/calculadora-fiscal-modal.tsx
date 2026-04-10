"use client";

import { useState } from "react";
import { X, Calculator, AlertCircle, ChevronDown, ChevronUp, Share2 } from "lucide-react";

const PAISES_COMUNES = [
  { code: "NL", label: "Países Bajos" },
  { code: "GB", label: "Reino Unido" },
  { code: "DE", label: "Alemania" },
  { code: "BE", label: "Bélgica" },
  { code: "SE", label: "Suecia" },
  { code: "NO", label: "Noruega" },
  { code: "FR", label: "Francia" },
  { code: "DK", label: "Dinamarca" },
  { code: "FI", label: "Finlandia" },
  { code: "AT", label: "Austria" },
  { code: "IE", label: "Irlanda" },
  { code: "IT", label: "Italia" },
  { code: "PT", label: "Portugal" },
  { code: "PL", label: "Polonia" },
  { code: "US", label: "Estados Unidos" },
  { code: "CH", label: "Suiza" },
];

const MONEDAS = [
  { code: "EUR", label: "€ Euro" },
  { code: "GBP", label: "£ Libra" },
  { code: "SEK", label: "kr Suecia" },
  { code: "NOK", label: "kr Noruega" },
  { code: "DKK", label: "kr Dinamarca" },
  { code: "CHF", label: "Fr. Suizo" },
  { code: "USD", label: "$ Dólar" },
  { code: "PLN", label: "zł Polonia" },
];

function fmt(n: number, moneda = "EUR") {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(n);
}

interface ResultadoCalc {
  precioInmueble: number;
  moneda: string;
  tipoOperacion: string;
  paisComprador: string;
  esUE: boolean;
  costesCompra: {
    impuestoTransmision: { tipo: number; importe: number; nota: string };
    ajd?: { tipo: number; importe: number };
    notaria: number;
    registro: number;
    gestoria: number;
    totalCostesCompra: number;
    totalConPrecio: number;
    porcentajeSobrePrecio: string;
  };
  costesAnuales: {
    ibi: { estimado: number; nota: string };
    irnr: { tipo: number; baseImponible: number; importe: number; nota: string };
    comunidad: { estimadoMes: number; estimadoAnual: number };
    seguro: { estimadoAnual: number };
    totalAnual: number;
    totalMensual: number;
  };
  conversion?: {
    monedaDestino: string;
    tipoCambio: number;
    precioConvertido: number;
    costesCompraConvertido: number;
    costesAnualesConvertido: number;
    fuenteTipoCambio: string;
    fechaTipoCambio: string;
  };
  avisos: string[];
}

interface CalculadoraFiscalModalProps {
  open: boolean;
  onClose: () => void;
  precioInicial?: number;
}

export function CalculadoraFiscalModal({ open, onClose, precioInicial }: CalculadoraFiscalModalProps) {
  const [precio, setPrecio] = useState(precioInicial ? String(Math.round(precioInicial)) : "");
  const [tipo, setTipo] = useState<"segunda_mano" | "obra_nueva">("segunda_mano");
  const [pais, setPais] = useState("NL");
  const [moneda, setMoneda] = useState("EUR");
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCalc | null>(null);
  const [error, setError] = useState("");
  const [detallesOpen, setDetallesOpen] = useState(false);

  if (!open) return null;

  async function calcular() {
    if (!precio || isNaN(Number(precio)) || Number(precio) <= 0) {
      setError("Introduce un precio válido");
      return;
    }
    setError("");
    setCalculando(true);
    setResultado(null);
    try {
      const params = new URLSearchParams({ precio, tipoOperacion: tipo, paisComprador: pais, moneda });
      const res = await fetch(`/api/calculadora-fiscal?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      setResultado(data.data);
    } catch {
      setError("Error de conexión");
    } finally {
      setCalculando(false);
    }
  }

  function compartirWhatsApp() {
    if (!resultado) return;
    const m = resultado.conversion?.monedaDestino ?? "EUR";
    const totalFmt = resultado.conversion
      ? fmt(resultado.conversion.precioConvertido + resultado.conversion.costesCompraConvertido, m)
      : fmt(resultado.costesCompra.totalConPrecio);
    const anualesFmt = resultado.conversion
      ? fmt(resultado.conversion.costesAnualesConvertido, m)
      : fmt(resultado.costesAnuales.totalAnual);

    const texto = `*Resumen fiscal de compra*\n\n`
      + `🏠 Precio: ${fmt(resultado.precioInmueble)}\n`
      + `📋 ${resultado.tipoOperacion === "segunda_mano" ? "ITP" : "IVA"} (${(resultado.costesCompra.impuestoTransmision.tipo * 100).toFixed(0)}%): ${fmt(resultado.costesCompra.impuestoTransmision.importe)}\n`
      + `📝 Notaría + registro + gestoría: ${fmt(resultado.costesCompra.notaria + resultado.costesCompra.registro + resultado.costesCompra.gestoria)}\n`
      + `💰 *Total de compra: ${totalFmt}*\n\n`
      + `📅 Gastos anuales: ${anualesFmt}/año\n\n`
      + `_Cálculo orientativo. Contacte con nosotros para asesoramiento._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-md max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Calculadora fiscal no residentes
          </h3>
          <button type="button" onClick={onClose} className="text-secondary hover:text-foreground cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {/* Formulario */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Precio (€)</label>
              <input
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="195000"
                className="w-full h-10 border border-border rounded-lg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "segunda_mano", label: "Segunda mano" },
                { value: "obra_nueva", label: "Obra nueva" },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value as "segunda_mano" | "obra_nueva")}
                  className={`h-9 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    tipo === t.value ? "border-primary bg-primary text-white" : "border-border text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">País comprador</label>
                <select
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  className="w-full h-9 border border-border rounded-lg px-2 text-xs text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {PAISES_COMUNES.map((p) => (
                    <option key={p.code} value={p.code}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Moneda</label>
                <select
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value)}
                  className="w-full h-9 border border-border rounded-lg px-2 text-xs text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {MONEDAS.map((m) => (
                    <option key={m.code} value={m.code}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}

            <button
              type="button"
              onClick={calcular}
              disabled={calculando}
              className="w-full h-10 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-60 cursor-pointer transition-colors"
            >
              {calculando ? "Calculando..." : "Calcular"}
            </button>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className="space-y-3 pt-1">
              {/* Total */}
              <div className="bg-primary rounded-xl p-3 text-white text-center">
                <p className="text-xs text-white/70 mb-0.5">Coste total de compra</p>
                <p className="text-2xl font-bold">
                  {resultado.conversion
                    ? fmt(resultado.conversion.precioConvertido + resultado.conversion.costesCompraConvertido, resultado.conversion.monedaDestino)
                    : fmt(resultado.costesCompra.totalConPrecio)}
                </p>
                <p className="text-xs text-white/60">{resultado.costesCompra.porcentajeSobrePrecio} sobre el precio</p>
              </div>

              {/* Desglose */}
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDetallesOpen(!detallesOpen)}
                  className="w-full flex justify-between items-center px-3 py-2.5 bg-muted cursor-pointer"
                >
                  <span className="text-xs font-medium text-foreground">Desglose gastos de compra</span>
                  {detallesOpen ? <ChevronUp className="h-3.5 w-3.5 text-secondary" /> : <ChevronDown className="h-3.5 w-3.5 text-secondary" />}
                </button>
                {detallesOpen && (
                  <div className="px-3 py-2 space-y-1.5">
                    <div className="flex justify-between">
                      <p className="text-xs text-foreground">{resultado.tipoOperacion === "segunda_mano" ? "ITP" : "IVA"} ({(resultado.costesCompra.impuestoTransmision.tipo * 100).toFixed(0)}%)</p>
                      <p className="text-xs font-semibold">{fmt(resultado.costesCompra.impuestoTransmision.importe)}</p>
                    </div>
                    {resultado.costesCompra.ajd && (
                      <div className="flex justify-between">
                        <p className="text-xs text-foreground">AJD ({(resultado.costesCompra.ajd.tipo * 100).toFixed(1)}%)</p>
                        <p className="text-xs font-semibold">{fmt(resultado.costesCompra.ajd.importe)}</p>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <p className="text-xs text-foreground">Notaría</p>
                      <p className="text-xs font-semibold">{fmt(resultado.costesCompra.notaria)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-xs text-foreground">Registro + gestoría</p>
                      <p className="text-xs font-semibold">{fmt(resultado.costesCompra.registro + resultado.costesCompra.gestoria)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Gastos anuales */}
              <div className="border border-border rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground mb-2">Gastos anuales estimados</p>
                <div className="flex justify-between">
                  <p className="text-xs text-foreground">IBI</p>
                  <p className="text-xs font-semibold">{fmt(resultado.costesAnuales.ibi.estimado)}/año</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-xs text-foreground">IRNR ({(resultado.costesAnuales.irnr.tipo * 100).toFixed(0)}%)</p>
                  <p className="text-xs font-semibold">{fmt(resultado.costesAnuales.irnr.importe)}/año</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-xs text-foreground">Comunidad</p>
                  <p className="text-xs font-semibold">{fmt(resultado.costesAnuales.comunidad.estimadoMes)}/mes</p>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-border">
                  <p className="text-xs font-bold text-foreground">Total</p>
                  <p className="text-xs font-bold text-primary">
                    {resultado.conversion
                      ? fmt(resultado.conversion.costesAnualesConvertido, resultado.conversion.monedaDestino)
                      : fmt(resultado.costesAnuales.totalAnual)}/año
                  </p>
                </div>
              </div>

              {/* Conversión */}
              {resultado.conversion && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-foreground mb-1">
                    En {resultado.conversion.monedaDestino} (1€ = {resultado.conversion.tipoCambio.toFixed(4)} {resultado.conversion.monedaDestino})
                  </p>
                  <p className="text-[10px] text-secondary">Fuente: {resultado.conversion.fuenteTipoCambio} ({resultado.conversion.fechaTipoCambio})</p>
                </div>
              )}

              {/* Avisos */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1.5">
                {resultado.avisos.map((a, i) => (
                  <div key={i} className="flex gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800">{a}</p>
                  </div>
                ))}
              </div>

              {/* WhatsApp */}
              <button
                type="button"
                onClick={compartirWhatsApp}
                className="w-full h-10 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Share2 className="h-4 w-4" /> Compartir por WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
