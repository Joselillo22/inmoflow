export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import { PropietarioPortalButton } from "@/components/admin/propietario-portal-button";

export default async function KYCPage() {
  const [propietarios, stats] = await Promise.all([
    prisma.propietario.findMany({
      include: {
        inmuebles: { select: { referencia: true, titulo: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.propietario.groupBy({
      by: ["kycVerificado"],
      _count: true,
    }),
  ]);

  const verificados = stats.find((s) => s.kycVerificado)?._count ?? 0;
  const sinVerificar = stats.find((s) => !s.kycVerificado)?._count ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">KYC / PBC — Prevención Blanqueo de Capitales</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted text-success">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-secondary">Verificados</p>
              <p className="text-2xl font-bold text-success">{verificados}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted text-danger">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-secondary">Sin verificar</p>
              <p className="text-2xl font-bold text-danger">{sinVerificar}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted text-warning">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-secondary">Total propietarios</p>
              <p className="text-2xl font-bold">{propietarios.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Propietarios</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-semibold text-secondary">Nombre</th>
                  <th className="text-left py-3 px-2 font-semibold text-secondary">DNI/NIE</th>
                  <th className="text-left py-3 px-2 font-semibold text-secondary">Nacionalidad</th>
                  <th className="text-left py-3 px-2 font-semibold text-secondary">KYC</th>
                  <th className="text-left py-3 px-2 font-semibold text-secondary">Origen fondos</th>
                  <th className="text-left py-3 px-2 font-semibold text-secondary">Inmuebles</th>
                  <th className="text-left py-3 px-2 font-semibold text-secondary">Portal</th>
                </tr>
              </thead>
              <tbody>
                {propietarios.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">{p.nombre} {p.apellidos ?? ""}</td>
                    <td className="py-3 px-2 font-mono text-xs">{p.dniNie ?? "—"}</td>
                    <td className="py-3 px-2">{p.nacionalidad ?? "—"}</td>
                    <td className="py-3 px-2">
                      {p.kycVerificado ? (
                        <Badge variant="success">Verificado {p.kycFecha ? formatDate(p.kycFecha) : ""}</Badge>
                      ) : (
                        <Badge variant="danger">Pendiente</Badge>
                      )}
                    </td>
                    <td className="py-3 px-2">{p.origenFondos ?? <span className="text-danger">Falta</span>}</td>
                    <td className="py-3 px-2">{p.inmuebles.length}</td>
                    <td className="py-3 px-2">
                      <PropietarioPortalButton
                        propietarioId={p.id}
                        propietarioNombre={`${p.nombre}${p.apellidos ? " " + p.apellidos : ""}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
