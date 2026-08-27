// =============================================================
// Tema visual único barbería / salón.
// Reemplaza las copias del objeto `theme` repartidas por los
// prototipos de /screens. Cambia aquí y cambia en toda la app.
//   barbería = negro + dorado
//   salón    = blanco + rosado
// =============================================================

export type BusinessType = "barber" | "salon";

export interface Theme {
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textMuted: string;
  labelColor: string;
  divider: string;
  inputBg: string;
  inputBorder: string;
  accentFrom: string;
  accentTo: string;
  accentRing: string;
  buttonText: string;
  secondaryBorder: string;
  secondaryText: string;
  chipBg: string;
  tag: string;
  green: string;
  yellow: string;
}

const barber: Theme = {
  pageBg: "radial-gradient(circle at 50% 0%, #1a1610 0%, #0a0806 55%, #050403 100%)",
  cardBg: "#12100c",
  cardBorder: "#29231a",
  textPrimary: "#F3EBDA",
  textMuted: "#8a8072",
  labelColor: "#c4b89f",
  divider: "#241f16",
  inputBg: "#0e0c09",
  inputBorder: "#2a2419",
  accentFrom: "#E3B04B",
  accentTo: "#B8862F",
  accentRing: "#C9962C",
  buttonText: "#161208",
  secondaryBorder: "#3a3222",
  secondaryText: "#E3D5B4",
  chipBg: "#332813",
  tag: "#D9A94A",
  green: "#3FBF7F",
  yellow: "#E0A93B",
};

const salon: Theme = {
  pageBg: "radial-gradient(circle at 50% 0%, #FFFFFF 0%, #FBF3F5 55%, #F7E9ED 100%)",
  cardBg: "#FFFFFF",
  cardBorder: "#F0DCE2",
  textPrimary: "#3A2530",
  textMuted: "#9A7A87",
  labelColor: "#8A6472",
  divider: "#F0DCE2",
  inputBg: "#FDF8F9",
  inputBorder: "#EBD3DA",
  accentFrom: "#E7A6BC",
  accentTo: "#C77E9B",
  accentRing: "#D890A8",
  buttonText: "#FFFFFF",
  secondaryBorder: "#EBD3DA",
  secondaryText: "#9A5D75",
  chipBg: "#F7DCE4",
  tag: "#C77E9B",
  green: "#3FBF7F",
  yellow: "#E0A93B",
};

export function getTheme(type: BusinessType): Theme {
  return type === "barber" ? barber : salon;
}

export const cardShadow = (type: BusinessType): string =>
  type === "barber"
    ? "0 30px 60px -20px rgba(0,0,0,0.6)"
    : "0 30px 60px -25px rgba(199,126,155,0.25)";
