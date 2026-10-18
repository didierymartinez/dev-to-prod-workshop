import { seccion01 } from "./seccion-01";
import { seccion02 } from "./seccion-02";
import { seccion03 } from "./seccion-03";
import { seccion04 } from "./seccion-04";
import { seccion05 } from "./seccion-05";
import { seccion06 } from "./seccion-06";
import { seccion07 } from "./seccion-07";
import { seccion08 } from "./seccion-08";
import { seccion09 } from "./seccion-09";
import { seccion10 } from "./seccion-10";
import { seccion11 } from "./seccion-11";
import { seccion12 } from "./seccion-12";
import { seccion13 } from "./seccion-13";
import { seccion14 } from "./seccion-14";
import { seccion15 } from "./seccion-15";
import { seccion16 } from "./seccion-16";
import { seccion17 } from "./seccion-17";
import { seccion18 } from "./seccion-18";
import { seccion19 } from "./seccion-19";
import { seccion20 } from "./seccion-20";
import { seccion21 } from "./seccion-21";
import { seccion22 } from "./seccion-22";
import { seccion23 } from "./seccion-23";
import { seccion24 } from "./seccion-24";
import { seccion25 } from "./seccion-25";
import { seccion26 } from "./seccion-26";
import { seccion27 } from "./seccion-27";
import { seccion28 } from "./seccion-28";
import { seccion29 } from "./seccion-29";
import { seccion30 } from "./seccion-30";
import { seccion31 } from "./seccion-31";
import { seccion32 } from "./seccion-32";
import { seccion33 } from "./seccion-33";
import { seccion34 } from "./seccion-34";
import { seccion35 } from "./seccion-35";
import { seccion36 } from "./seccion-36";
import { seccion37 } from "./seccion-37";
import { seccion38 } from "./seccion-38";
import { seccion39 } from "./seccion-39";
import { seccion40 } from "./seccion-40";
import { seccion41 } from "./seccion-41";
import { seccion42 } from "./seccion-42";
import { seccion43 } from "./seccion-43";
import { seccion44 } from "./seccion-44";
import { seccion45 } from "./seccion-45";
import { seccion46 } from "./seccion-46";
import { seccion47 } from "./seccion-47";
import { seccion48 } from "./seccion-48";
import { seccion49 } from "./seccion-49";
import { seccion50 } from "./seccion-50";
import { seccion51 } from "./seccion-51";
import { seccion52 } from "./seccion-52";
import { seccion53 } from "./seccion-53";
import { seccion54 } from "./seccion-54";
import { seccion55 } from "./seccion-55";
import { seccion56 } from "./seccion-56";
import { seccion57 } from "./seccion-57";
import { seccion58 } from "./seccion-58";
import { seccion59 } from "./seccion-59";
import { seccion60 } from "./seccion-60";
import { seccion61 } from "./seccion-61";
import { seccion62 } from "./seccion-62";
import { seccion63 } from "./seccion-63";
import { seccion64 } from "./seccion-64";
import { seccion65 } from "./seccion-65";
import { seccion66 } from "./seccion-66";
import { seccion67 } from "./seccion-67";
import { seccion68 } from "./seccion-68";
import { seccion69 } from "./seccion-69";
import { seccion70 } from "./seccion-70";
import type { Seccion } from "./tipos";

// Las secciones de la presentación, en el orden del taller.
export const secciones: Seccion[] = [
  seccion01,
  seccion02,
  seccion03,
  seccion04,
  seccion05,
  seccion06,
  seccion07,
  seccion08,
  seccion09,
  seccion10,
  seccion11,
  seccion12,
  seccion13,
  seccion14,
  seccion15,
  seccion16,
  seccion17,
  seccion18,
  seccion19,
  seccion20,
  seccion21,
  seccion22,
  seccion23,
  seccion24,
  seccion25,
  seccion26,
  seccion27,
  seccion28,
  seccion29,
  seccion30,
  seccion31,
  seccion32,
  seccion33,
  seccion34,
  seccion35,
  seccion36,
  seccion37,
  seccion38,
  seccion39,
  seccion40,
  seccion41,
  seccion42,
  seccion43,
  seccion44,
  seccion45,
  seccion46,
  seccion47,
  seccion48,
  seccion49,
  seccion50,
  seccion51,
  seccion52,
  seccion53,
  seccion54,
  seccion55,
  seccion56,
  seccion57,
  seccion58,
  seccion59,
  seccion60,
  seccion61,
  seccion62,
  seccion63,
  seccion64,
  seccion65,
  seccion66,
  seccion67,
  seccion68,
  seccion69,
  seccion70,
];

export const seccionPorNumero = (n: number): Seccion => {
  const s = secciones.find((x) => x.numero === n);
  if (!s) throw new Error(`No hay láminas para la sección ${n}`);
  return s;
};
