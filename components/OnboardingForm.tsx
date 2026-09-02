"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Plus, X, Check, ArrowRight, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTheme, cardShadow, type BusinessType } from "@/lib/theme";

export interface CatalogItem {
  id: string;
  category: string;
  name: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function OnboardingForm({
  businessType,
  catalog,
}: {
  businessType: BusinessType;
  catalog: CatalogItem[];
}) {
  const router = useRouter();
  const isBarber = businessType === "barber";
  const theme = getTheme(businessType);

  const groups = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of catalog) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }, [catalog]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [staffNames, setStaffNames] = useState<string[]>(["", ""]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [openCats, setOpenCats] = useState<Set<string>>(
    new Set(groups.length ? [groups[0].category] : []),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const toggleItem = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleCat = (cat: string) => {
    const next = new Set(openCats);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    setOpenCats(next);
  };

  const updateStaffName = (index: number, value: string) => {
    const next = [...staffNames];
    next[index] = value;
    setStaffNames(next);
  };
  const addStaffField = () => setStaffNames([...staffNames, ""]);
  const removeStaffField = (index: number) => {
    if (staffNames.length <= 1) return;
    setStaffNames(staffNames.filter((_, i) => i !== index));
  };

  const onSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Ponle un nombre a tu negocio.");
      return;
    }
    const cleanStaffNames = staffNames.map((n) => n.trim()).filter(Boolean);
    if (cleanStaffNames.length === 0) {
      setError(isBarber ? "Agrega al menos un barbero." : "Agrega al menos un estilista.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const slug = `${slugify(name) || "negocio"}-${Math.random().toString(36).slice(2, 6)}`;

      const { data: business, error: bizError } = await supabase
        .from("businesses")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          type: businessType,
          phone: phone.trim() || null,
          address: address.trim() || null,
          staff_count: cleanStaffNames.length,
          invite_slug: slug,
          status: "active",
        })
        .select("id")
        .single();

      if (bizError || !business) {
        setError("No se pudo crear el negocio. Intenta de nuevo.");
        return;
      }

      // Crea el perfil de cada barbero/estilista con el nombre que puso el dueño.
      const staffRows = cleanStaffNames.map((staffName) => ({
        business_id: business.id,
        name: staffName,
      }));
      const { error: staffError } = await supabase.from("staff").insert(staffRows);
      if (staffError) {
        setError("El negocio se creó, pero hubo un problema guardando el equipo.");
        return;
      }

      // Sube el logo (si hay) al bucket público y guarda su URL en el negocio.
      if (logoFile) {
        const ext = logoFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${business.id}/logo.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
          await supabase.from("businesses").update({ logo_url: pub.publicUrl }).eq("id", business.id);
        }
      }

      const rows = Array.from(selected).map((catalogId) => ({
        business_id: business.id,
        catalog_service_id: catalogId,
        price: parseFloat(prices[catalogId] ?? "") || 0,
        duration_minutes: 30,
      }));
      if (rows.length) {
        const { error: svcError } = await supabase.from("business_services").insert(rows);
        if (svcError) {
          setError("El negocio se creó, pero hubo un problema guardando los servicios.");
          return;
        }
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex justify-center px-4 py-10"
      style={{ background: theme.pageBg }}
    >
      <div className="w-full max-w-sm">
        <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: theme.accentRing }}>
          OPERACIONES
        </span>
        <h1 className="font-display text-2xl mt-1" style={{ color: theme.textPrimary }}>
          Crea tu negocio
        </h1>
        <p className="font-body text-sm mt-1 mb-6" style={{ color: theme.textMuted }}>
          {isBarber ? "Barbería" : "Salón de belleza"} · completa los datos de tu espacio.
        </p>

        <div
          className="rounded-3xl p-6"
          style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, boxShadow: cardShadow(businessType) }}
        >
          <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
            LOGO DEL NEGOCIO
          </label>
          <input
            ref={fileInput}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={onPickLogo}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="mt-2 mb-6 w-full rounded-xl flex flex-col items-center justify-center py-6 overflow-hidden"
            style={{ background: theme.inputBg, border: `1px dashed ${theme.inputBorder}` }}
          >
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt="Vista previa del logo"
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <>
                <Upload className="w-5 h-5 mb-2" style={{ color: theme.textMuted }} />
                <span className="font-body text-xs" style={{ color: theme.textMuted }}>
                  Subir imagen (PNG o JPG)
                </span>
              </>
            )}
          </button>

          <div className="mb-5">
            <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
              NOMBRE DEL NEGOCIO
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Corte & Cía"
              className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none"
              style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
            />
          </div>

          <div className="mb-5">
            <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
              TELÉFONO
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="809 000 0000"
              className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none"
              style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
            />
          </div>

          <div className="mb-6">
            <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
              DIRECCIÓN
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Calle, sector, ciudad"
              className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none"
              style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
            />
          </div>

          <div className="h-px w-full mb-6" style={{ background: theme.divider }} />

          <div className="mb-6">
            <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
              {isBarber ? "TU EQUIPO DE BARBEROS" : "TU EQUIPO DE ESTILISTAS"}
            </label>
            <p className="font-body text-xs mt-1 mb-3" style={{ color: theme.textMuted }}>
              Escribe el nombre de cada {isBarber ? "barbero" : "estilista"}. Con esto ya quedan creados sus perfiles.
            </p>
            <div className="space-y-2">
              {staffNames.map((staffName, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={staffName}
                    onChange={(e) => updateStaffName(index, e.target.value)}
                    placeholder={isBarber ? `Barbero ${index + 1}` : `Estilista ${index + 1}`}
                    className="font-body flex-1 px-4 py-3 rounded-xl outline-none"
                    style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
                  />
                  {staffNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStaffField(index)}
                      className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center"
                      style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}
                    >
                      <X className="w-4 h-4" style={{ color: theme.textMuted }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addStaffField}
              className="font-body w-full flex items-center justify-center gap-1.5 mt-2 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: theme.chipBg, color: theme.accentRing }}
            >
              <Plus className="w-4 h-4" />
              Agregar {isBarber ? "barbero" : "estilista"}
            </button>
          </div>

          <div className="h-px w-full mb-6" style={{ background: theme.divider }} />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
                SERVICIOS QUE OFRECES
              </label>
              <span
                className="font-body text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: theme.chipBg, color: theme.accentRing }}
              >
                {selected.size} elegidos
              </span>
            </div>
            <p className="font-body text-xs mt-1 mb-3" style={{ color: theme.textMuted }}>
              Marca todo lo que ofreces y define tu precio.
            </p>

            <div className="space-y-2">
              {groups.map((group) => {
                const isOpen = openCats.has(group.category);
                return (
                  <div
                    key={group.category}
                    className="rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${theme.inputBorder}` }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCat(group.category)}
                      className="w-full flex items-center justify-between px-3 py-3"
                      style={{ background: theme.inputBg }}
                    >
                      <span className="font-body text-sm font-medium" style={{ color: theme.textPrimary }}>
                        {group.category}
                      </span>
                      <ChevronDown
                        className="w-4 h-4 transition-transform"
                        style={{ color: theme.textMuted, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    </button>

                    {isOpen && (
                      <div className="p-2 space-y-1.5" style={{ background: theme.cardBg }}>
                        {group.items.map((item) => {
                          const active = selected.has(item.id);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 rounded-lg px-2.5 py-2"
                              style={{ background: active ? theme.chipBg : "transparent" }}
                            >
                              <button
                                type="button"
                                onClick={() => toggleItem(item.id)}
                                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                                style={{
                                  background: active ? theme.accentRing : "transparent",
                                  border: `1px solid ${active ? theme.accentRing : theme.inputBorder}`,
                                }}
                              >
                                {active && <Check className="w-3 h-3" style={{ color: theme.buttonText }} />}
                              </button>
                              <span className="font-body text-sm flex-1" style={{ color: theme.textPrimary }}>
                                {item.name}
                              </span>
                              {active && (
                                <input
                                  inputMode="numeric"
                                  value={prices[item.id] ?? ""}
                                  onChange={(e) => setPrices({ ...prices, [item.id]: e.target.value })}
                                  placeholder="RD$"
                                  className="font-body text-sm w-16 px-2 py-1 rounded-lg outline-none text-right"
                                  style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="font-body text-xs mt-4" style={{ color: "#F19391" }}>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-8"
            style={{
              background: `linear-gradient(135deg, ${theme.accentFrom} 0%, ${theme.accentTo} 100%)`,
              color: theme.buttonText,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Creando…" : "Crear negocio y generar mi link"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
