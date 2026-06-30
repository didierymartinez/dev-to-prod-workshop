// La evolución del código del taller, paso a paso. Cada paso es una versión completa del
// snippet; el animador calcula el diff con el paso anterior y lo transforma (líneas que se
// van colapsan en rojo, las nuevas crecen en verde, las que quedan permanecen).

import generated from "./steps-generated.json";

export type Step = { title: string; code: string[]; concepts?: string[] };

// Si hay pasos generados (todo el workshop), se usan; si no, el set base hecho a mano.
const FALLBACK: Step[] = [
  {
    title: "1 · Los eventos — record (inmutables)",
    code: [
      "record EmpresaRegistrada(string Nombre, string Plan);",
      "record PlanCambiado(string NuevoPlan);",
      "record EmpresaSuspendida(string Motivo);",
      "record EmpresaReactivada();",
    ],
  },
  {
    title: "2 · La historia — un Stream (lista ordenada)",
    code: [
      "record EmpresaRegistrada(string Nombre, string Plan);",
      "record PlanCambiado(string NuevoPlan);",
      "record EmpresaSuspendida(string Motivo);",
      "record EmpresaReactivada();",
      "",
      "var historia = new List<object>",
      "{",
      '    new EmpresaRegistrada("Andes", "Básico"),',
      '    new PlanCambiado("Premium"),',
      '    new EmpresaSuspendida("falta de pago"),',
      "};",
    ],
  },
  {
    title: "3 · Recorrer y aplicar — foreach + if",
    code: [
      "var historia = new List<object> { /* los hechos, en orden */ };",
      "",
      'string nombre = "";  string plan = "";',
      "bool suspendida;     int reactivaciones;",
      "",
      "foreach (var hecho in historia)",
      "{",
      "    if (hecho is EmpresaRegistrada r) { nombre = r.Nombre; plan = r.Plan; }",
      "    if (hecho is PlanCambiado p)      { plan = p.NuevoPlan; }",
      "    if (hecho is EmpresaSuspendida)   { suspendida = true; }",
      "}",
    ],
  },
  {
    title: "4 · Del if encadenado al switch por tipo",
    code: [
      "var historia = new List<object> { /* los hechos, en orden */ };",
      "",
      'string nombre = "";  string plan = "";',
      "bool suspendida;     int reactivaciones;",
      "",
      "foreach (var hecho in historia)",
      "{",
      "    switch (hecho)",
      "    {",
      "        case EmpresaRegistrada r: nombre = r.Nombre; plan = r.Plan; break;",
      "        case PlanCambiado p:      plan = p.NuevoPlan; break;",
      "        case EmpresaSuspendida:   suspendida = true; break;",
      "    }",
      "}",
    ],
  },
  {
    title: "5 · De variables sueltas a una clase — Aggregate Root",
    code: [
      "class Empresa : AggregateRoot",
      "{",
      '    public string Nombre { get; private set; } = "";',
      '    public string Plan   { get; private set; } = "";',
      "    public bool   Suspendida { get; private set; }",
      "",
      "    protected override void Aplicar(object hecho)",
      "    {",
      "        switch (hecho)",
      "        {",
      "            case EmpresaRegistrada r: Nombre = r.Nombre; Plan = r.Plan; break;",
      "            case PlanCambiado p:      Plan = p.NuevoPlan; break;",
      "            case EmpresaSuspendida:   Suspendida = true; break;",
      "        }",
      "    }",
      "}",
    ],
  },
  {
    title: "6 · El motor, una sola vez — clase base abstracta",
    code: [
      "abstract class AggregateRoot",
      "{",
      "    public void Load(IEnumerable<object> historia)",
      "    {",
      "        foreach (var hecho in historia) Aplicar(hecho);",
      "    }",
      "    protected abstract void Aplicar(object hecho);",
      "}",
      "",
      "class Empresa : AggregateRoot",
      "{",
      "    // propiedades + override Aplicar (el switch)",
      "}",
    ],
  },
  {
    title: "7 · Emitir hechos — decide (≠ aplicar)",
    code: [
      "class Empresa : AggregateRoot",
      "{",
      "    // propiedades + override Aplicar (el switch)",
      "",
      "    public PlanCambiado CambiarPlan(string nuevoPlan)",
      "    {",
      '        if (Suspendida) throw new ReglaDeNegocioException("...");',
      "        return new PlanCambiado(nuevoPlan);",
      "    }",
      "",
      "    public EmpresaSuspendida? Suspender(string motivo)",
      "        => Suspendida ? null : new EmpresaSuspendida(motivo);",
      "}",
    ],
  },
];

// El set efectivo: generado si existe, si no el fallback.
export const steps: Step[] = (generated as Step[]).length
  ? (generated as unknown as Step[])
  : FALLBACK;
