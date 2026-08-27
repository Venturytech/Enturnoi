-- =============================================================
-- Enturnoi · Semilla del catálogo GLOBAL de servicios
-- Fuente: CATALOG en screens/CreateBusiness.jsx (config real definida
-- por la plataforma, no datos de prueba). Idempotente.
-- =============================================================

insert into services_catalog (type, category, name) values
  -- Barbería · Cortes
  ('barber', 'Cortes', 'Corte clásico'),
  ('barber', 'Cortes', 'Corte fade / degradado'),
  ('barber', 'Cortes', 'Corte a tijera'),
  ('barber', 'Cortes', 'Corte infantil'),
  ('barber', 'Cortes', 'Diseño de líneas / tribal'),
  ('barber', 'Cortes', 'Corte + lavado'),
  ('barber', 'Cortes', 'Corte a máquina completo'),
  -- Barbería · Barba
  ('barber', 'Barba', 'Arreglo de barba'),
  ('barber', 'Barba', 'Diseño de barba'),
  ('barber', 'Barba', 'Afeitado tradicional a navaja'),
  ('barber', 'Barba', 'Perfilado de barba'),
  ('barber', 'Barba', 'Tinte de barba'),
  -- Barbería · Rostro y cejas
  ('barber', 'Rostro y cejas', 'Perfilado de cejas'),
  ('barber', 'Rostro y cejas', 'Limpieza facial'),
  ('barber', 'Rostro y cejas', 'Depilación de nariz y oídos'),
  ('barber', 'Rostro y cejas', 'Mascarilla facial'),
  -- Barbería · Cabello y color
  ('barber', 'Cabello y color', 'Lavado + masaje capilar'),
  ('barber', 'Cabello y color', 'Tratamiento anticaída'),
  ('barber', 'Cabello y color', 'Hidratación capilar'),
  ('barber', 'Cabello y color', 'Tinte de cabello'),
  ('barber', 'Cabello y color', 'Alisado para hombre'),
  -- Barbería · Combos
  ('barber', 'Combos', 'Corte + barba'),
  ('barber', 'Combos', 'Corte + barba + cejas'),
  ('barber', 'Combos', 'Corte + tinte'),
  ('barber', 'Combos', 'Paquete novio'),
  -- Salón · Cabello
  ('salon', 'Cabello', 'Corte de dama'),
  ('salon', 'Cabello', 'Corte y peinado'),
  ('salon', 'Cabello', 'Lavado y secado'),
  ('salon', 'Cabello', 'Alisado / keratina'),
  ('salon', 'Cabello', 'Extensiones de cabello'),
  ('salon', 'Cabello', 'Permanente / rizado'),
  ('salon', 'Cabello', 'Peinado de evento'),
  -- Salón · Color
  ('salon', 'Color', 'Coloración completa'),
  ('salon', 'Color', 'Mechas / balayage'),
  ('salon', 'Color', 'Retoque de raíz'),
  ('salon', 'Color', 'Tinte fantasía'),
  ('salon', 'Color', 'Matización / toner'),
  -- Salón · Uñas
  ('salon', 'Uñas', 'Manicure clásica'),
  ('salon', 'Uñas', 'Manicure en gel / semipermanente'),
  ('salon', 'Uñas', 'Pedicure'),
  ('salon', 'Uñas', 'Uñas acrílicas / esculpidas'),
  ('salon', 'Uñas', 'Nail art'),
  ('salon', 'Uñas', 'Retiro de esmaltado'),
  -- Salón · Rostro y piel
  ('salon', 'Rostro y piel', 'Limpieza facial'),
  ('salon', 'Rostro y piel', 'Tratamiento antiedad'),
  ('salon', 'Rostro y piel', 'Depilación con cera (cejas, labio, piernas)'),
  ('salon', 'Rostro y piel', 'Maquillaje social'),
  ('salon', 'Rostro y piel', 'Maquillaje de novia'),
  -- Salón · Spa y bienestar
  ('salon', 'Spa y bienestar', 'Masaje relajante'),
  ('salon', 'Spa y bienestar', 'Exfoliación corporal'),
  ('salon', 'Spa y bienestar', 'Tratamiento capilar profundo'),
  ('salon', 'Spa y bienestar', 'Hidratación facial')
on conflict (type, category, name) do nothing;
