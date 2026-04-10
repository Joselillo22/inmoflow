"use client";

import { useState } from "react";
import { Calculator, Share2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

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
  { code: "RU", label: "Rusia" },
  { code: "US", label: "Estados Unidos" },
  { code: "CH", label: "Suiza" },
];

const MONEDAS = [
  { code: "EUR", label: "€ Euro" },
  { code: "GBP", label: "£ Libra" },
  { code: "SEK", label: "kr Corona sueca" },
  { code: "NOK", label: "kr Corona noruega" },
  { code: "DKK", label: "kr Corona danesa" },
  { code: "CHF", label: "Fr. Franco suizo" },
  { code: "USD", label: "$ Dólar" },
  { code: "PLN", label: "zł Esloti polaco" },
];

function fmt(n: number, moneda = "EUR") {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(n);
}

interface Resultado {
  precioInmueble: number;
  moneda: string;
  tipoOperacion: string;
  paisComprador: string;
  esUE: boolean;
  costesCompra: {
    impuestoTransmision: { tipo: number; importe: number; nota: string };
    ajd?: { tipo: number; importe: number };
    iva?: { tipo: number; importe: number };
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

export default function CalculadoraFiscalPage() {
  const [precio, setPrecio] = useState("");
  const [tipo, setTipo] = useState<"segunda_mano" | "obra_nueva">("segunda_mano");
  const [pais, setPais] = useState("NL");
  const [moneda, setMoneda] = useState("EUR");
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState("");
  const [detallesOpen, setDetallesOpen] = useState(false);

  async function calcular() {
    if (!precio || isNaN(Number(precio)) || Number(precio) <= 0) {
      setError("Introduce un precio válido");
      return;
    }
    setError("");
    setCalculando(true);
    setResultado(null);

    try {
      const params = new URLSearchParams({
        precio,
        tipoOperacion: tipo,
        paisComprador: pais,
        moneda,
      });
      const res = await fetch(`/api/calculadora-fiscal?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al calcular"); return; }
      setResultado(data.data);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setCalculando(false);
    }
  }

  function compartirWhatsApp() {
    if (!resultado) return;
    const r = resultado;
    const monedaLabel = r.moneda !== "EUR" && r.conversion ? r.moneda : "EUR";
    const precioFmt = r.conversion ? fmt(r.conversion.precioConvertido, monedaLabel) : fmt(r.precioInmueble);
    const totalFmt = r.conversion ? fmt(r.conversion.precioConvertido + r.conversion.costesCompraConvertido, monedaLabel) : fmt(r.costesCompra.totalConPrecio);
    const anualesFmt = r.conversion ? fmt(r.conversion.costesAnualesConvertido, monedaLabel) : fmt(r.costesAnuales.totalAnual);

    const texto = `*Resumen fiscal de compra*\n\n`
      + `🏠 Precio: ${precioFmt}\n`
      + `📋 Impuesto (${r.tipoOperacion === "segunda_mano" ? "ITP" : "IVA"}): ${fmt(r.costesCompra.impuestoTransmision.importe)} (${(r.costesCompra.impuestoTransmision.tipo * 100).toFixed(0)}%)\n`
      + `📝 Notaría + registro + gestoría: ${fmt(r.costesCompra.notaria + r.costesCompra.registro + r.costesCompra.gestoria)}\n`
      + `💰 *Total de compra: ${totalFmt}*\n\n`
      + `📅 Gastos anuales estimados: ${anualesFmt}/año (${fmt(r.costesAnuales.totalMensual)}/mes)\n`
      + `  • IBI: ${fmt(r.costesAnuales.ibi.estimado)}/año\n`
      + `  • IRNR ${(r.costesAnuales.irnr.tipo * 100).toFixed(0)}%: ${fmt(r.costesAnuales.irnr.importe)}/año\n`
      + `  • Comunidad: ${fmt(r.costesAnuales.comunidad.estimadoMes)}/mes\n\n`
      + `_Cálculo orientativo. Contacte con nosotros para asesoramiento._`;

    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-4">
      {/* Título */}
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Calculadora fiscal</h1>
      </div>
      <p className="text-sm text-secondary -mt-2">Costes de compra para compradores extranjeros</p>

      {/* Formulario */}
      <div className="bg-white rounded-2xl border border-border p-4 space-y-4 shadow-sm">
        {/* Precio */}
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">Precio del inmueble (€)</label>
          <input
            type="number"
            inputMode="numeric"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="195000"
            className="w-full h-14 text-xl font-bold border-2 border-border rounded-xl px-4 focus:outline-none focus:border-primary transition-colors bg-background text-foreground placeholder:text-secondary/40"
          />
        </div>

        {/* Tipo operacion */}
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">Tipo de inmueble</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "segunda_mano", label: "Segunda mano" },
              { value: "obra_nueva", label: "Obra nueva" },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value as "segunda_mano" | "obra_nueva")}
                className={`h-14 rounded-xl border-2 text-sm font-semibold transition-colors cursor-pointer ${
                  tipo === t.value
                    ? "border-primary bg-primary text-white"
                    : "border-border text-foreground bg-background"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* País comprador */}
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">País del comprador</label>
          <select
            value={pais}
            onChange={(e) => setPais(e.target.value)}
            className="w-full h-14 border-2 border-border rounded-xl px-4 text-base text-foreground bg-background focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            {PAISES_COMUNES.map((p) => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Moneda */}
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">Mostrar en</label>
          <select
            value={moneda}
            onChange={(e) => setMoneda(e.target.value)}
            className="w-full h-14 border-2 border-border rounded-xl px-4 text-base text-foreground bg-background focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            {MONEDAS.map((m) => (
              <option key={m.code} value={m.code}>{m.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        <button
          type="button"
          onClick={calcular}
          disabled={calculando}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-bold disabled:opacity-60 cursor-pointer active:scale-[0.98] transition-all"
        >
          {calculando ? "Calculando..." : "Calcular"}
        </button>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="space-y-3">
          {/* Card 1: Total compra */}
          <div className="bg-primary rounded-2xl p-4 text-white shadow-sm">
            <p className="text-sm font-medium text-white/80 mb-1">Coste total de compra</p>
            <p className="text-3xl font-bold">
              {resultado.conversion
                ? fmt(resultado.conversion.precioConvertido + resultado.conversion.costesCompraConvertido, resultado.conversion.monedaDestino)
                : fmt(resultado.costesCompra.totalConPrecio)}
            </p>
            <p className="text-sm text-white/70 mt-1">
              Precio + impuestos + gastos ({resultado.costesCompra.porcentajeSobrePrecio} sobre el precio)
            </p>
          </div>

          {/* Card 2: Desglose impuestos */}
          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setDetallesOpen(!detallesOpen)}
              className="w-full flex items-center justify-between cursor-pointer"
            >
              <p className="text-sm font-bold text-foreground">Desglose de gastos de compra</p>
              {detallesOpen ? <ChevronUp className="h-4 w-4 text-secondary" /> : <ChevronDown className="h-4 w-4 text-secondary" />}
            </button>

            {detallesOpen && (
              <div className="mt-3 space-y-2 pt-3 border-t border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-foreground">
                      {resultado.tipoOperacion === "segunda_mano" ? "ITP" : "IVA"}{" "}
                      ({(resultado.costesCompra.impuestoTransmision.tipo * 100).toFixed(0)}%)
                    </p>
                    <p className="text-[11px] text-secondary">{resultado.costesCompra.impuestoTransmision.nota}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{fmt(resultado.costesCompra.impuestoTransmision.importe)}</p>
                </div>
                {resultado.costesCompra.ajd && resultado.tipoOperacion === "segunda_mano" && (
                  <div className="flex justify-between">
                    <p className="text-sm text-foreground">AJD ({(resultado.costesCompra.ajd.tipo * 100).toFixed(1)}%)</p>
                    <p className="text-sm font-semibold">{fmt(resultado.costesCompra.ajd.importe)}</p>
                  </div>
                )}
                <div className="flex justify-between">
                  <p className="text-sm text-foreground">Notaría</p>
                  <p className="text-sm font-semibold">{fmt(resultado.costesCompra.notaria)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-foreground">Registro</p>
                  <p className="text-sm font-semibold">{fmt(resultado.costesCompra.registro)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-foreground">Gestoría</p>
                  <p className="text-sm font-semibold">{fmt(resultado.costesCompra.gestoria)}</p>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <p className="text-sm font-bold text-foreground">Total gastos</p>
                  <p className="text-sm font-bold text-primary">{fmt(resultado.costesCompra.totalCostesCompra)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Costes anuales */}
          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
            <p className="text-sm font-bold text-foreground mb-3">Gastos anuales estimados</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-foreground">IBI (impuesto municipal)</p>
                  <p className="text-[11px] text-secondary">{resultado.costesAnuales.ibi.nota}</p>
                </div>
                <p className="text-sm font-semibold">{fmt(resultado.costesAnuales.ibi.estimado)}/año</p>
              </div>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-foreground">IRNR ({(resultado.costesAnuales.irnr.tipo * 100).toFixed(0)}%)</p>
                  <p className="text-[11px] text-secondary">{resultado.costesAnuales.irnr.nota}</p>
                </div>
                <p className="text-sm font-semibold">{fmt(resultado.costesAnuales.irnr.importe)}/año</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-foreground">Comunidad de propietarios</p>
                <p className="text-sm font-semibold">{fmt(resultado.costesAnuales.comunidad.estimadoMes)}/mes</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-foreground">Seguro del hogar</p>
                <p className="text-sm font-semibold">{fmt(resultado.costesAnuales.seguro.estimadoAnual)}/año</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-secondary">Total gastos anuales</p>
              <p className="text-2xl font-bold text-foreground">
                {resultado.conversion
                  ? fmt(resultado.conversion.costesAnualesConvertido, resultado.conversion.monedaDestino)
                  : fmt(resultado.costesAnuales.totalAnual)}
              </p>
              <p className="text-sm text-secondary">
                ({resultado.conversion
                  ? fmt(Math.round(resultado.conversion.costesAnualesConvertido / 12), resultado.conversion.monedaDestino)
                  : fmt(resultado.costesAnuales.totalMensual)}/mes)
              </p>
            </div>
          </div>

          {/* Card 4: Conversión de moneda */}
          {resultado.conversion && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 shadow-sm">
              <p className="text-sm font-bold text-foreground mb-2">
                En {resultado.conversion.monedaDestino} (1€ = {resultado.conversion.tipoCambio.toFixed(4)} {resultado.conversion.monedaDestino})
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <p className="text-sm text-foreground">Precio</p>
                  <p className="text-sm font-semibold">{fmt(resultado.conversion.precioConvertido, resultado.conversion.monedaDestino)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-foreground">Gastos de compra</p>
                  <p className="text-sm font-semibold">{fmt(resultado.conversion.costesCompraConvertido, resultado.conversion.monedaDestino)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-foreground">Gastos anuales</p>
                  <p className="text-sm font-semibold">{fmt(resultado.conversion.costesAnualesConvertido, resultado.conversion.monedaDestino)}/año</p>
                </div>
              </div>
              <p className="text-[10px] text-secondary mt-2">Tipo de cambio: {resultado.conversion.fuenteTipoCambio} ({resultado.conversion.fechaTipoCambio})</p>
            </div>
          )}

          {/* Avisos */}
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 space-y-2">
            <p className="text-sm font-bold text-blue-900">Información importante</p>
            {resultado.avisos.map((aviso, i) => (
              <div key={i} className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">{aviso}</p>
              </div>
            ))}
          </div>

          {/* Botón compartir WhatsApp */}
          <button
            type="button"
            onClick={compartirWhatsApp}
            className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
          >
            <Share2 className="h-5 w-5" />
            Compartir por WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
