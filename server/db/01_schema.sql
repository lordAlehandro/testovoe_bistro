-- =====================================================================
-- Схема картотеки граждан (PostgreSQL 16+).
-- Главная таблица — citizen. Разделы карточки (документы, адреса, семья…)
-- лежат в отдельных таблицах и ссылаются на гражданина через citizen_id.
-- Справочники (регионы, категории) хранятся кодами, подписи — на фронте.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------
-- Гражданин: раздел «Основные сведения»
-- ---------------------------------------------------------------------
CREATE TABLE citizen (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_number   integer GENERATED ALWAYS AS IDENTITY UNIQUE, -- учётный номер, понятный людям

  last_name         text NOT NULL,
  first_name        text NOT NULL,
  middle_name       text,
  sex               char(1) NOT NULL CHECK (sex IN ('M', 'F')),
  birth_date        date NOT NULL CHECK (birth_date > '1900-01-01'),
  birth_place       text,
  death_date        date CHECK (death_date IS NULL OR death_date >= birth_date),

  citizenship_code  text NOT NULL DEFAULT 'RU',
  marital_status    text CHECK (marital_status IN ('single', 'married', 'civil_union', 'divorced', 'widowed')),

  snils             text UNIQUE CHECK (snils ~ '^\d{3}-\d{3}-\d{3} \d{2}$'),
  inn               text UNIQUE CHECK (inn ~ '^\d{12}$'),
  oms_policy        text UNIQUE CHECK (oms_policy ~ '^\d{16}$'),

  region_code       text NOT NULL,
  social_category   text,
  disability_group  text CHECK (disability_group IN ('1', '2', '3')),
  record_status     text NOT NULL DEFAULT 'active' CHECK (record_status IN ('active', 'archived', 'deceased', 'moved')),
  note              text,

  -- ФИО одной строкой в нижнем регистре — для поиска.
  full_name_search  text GENERATED ALWAYS AS (
                      lower(last_name || ' ' || first_name || ' ' || coalesce(middle_name, ''))
                    ) STORED,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Индексы под поиск, фильтры и сортировки картотеки.
CREATE INDEX citizen_fio_trgm_idx ON citizen USING gin (full_name_search gin_trgm_ops);
CREATE INDEX citizen_name_idx     ON citizen (last_name, first_name, id);
CREATE INDEX citizen_birth_idx    ON citizen (birth_date);
CREATE INDEX citizen_region_idx   ON citizen (region_code);
CREATE INDEX citizen_created_idx  ON citizen (created_at);

-- ---------------------------------------------------------------------
-- Разделы-таблицы карточки. ON DELETE CASCADE: удалили гражданина — удалились и его записи.
-- ---------------------------------------------------------------------
CREATE TABLE identity_document (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id     uuid NOT NULL REFERENCES citizen(id) ON DELETE CASCADE,
  doc_type       text NOT NULL,
  series         text,
  number         text NOT NULL,
  issued_by      text,
  division_code  text CHECK (division_code ~ '^\d{3}-\d{3}$'),
  issued_date    date,
  expires_date   date CHECK (expires_date IS NULL OR expires_date > issued_date),
  is_primary     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE address (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id   uuid NOT NULL REFERENCES citizen(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('registration', 'residence', 'temporary', 'postal')),
  postal_code  text CHECK (postal_code ~ '^\d{6}$'),
  region_code  text NOT NULL,
  locality     text NOT NULL,
  street       text,
  house        text,
  apartment    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contact (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id      uuid NOT NULL REFERENCES citizen(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('mobile', 'home_phone', 'work_phone', 'email', 'telegram')),
  value           text NOT NULL,
  is_primary      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE family_member (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id      uuid NOT NULL REFERENCES citizen(id) ON DELETE CASCADE,
  relation        text NOT NULL CHECK (relation IN
                    ('spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'guardian', 'ward', 'other')),
  last_name       text NOT NULL,
  first_name      text NOT NULL,
  middle_name     text,
  birth_date      date,
  phone           text,
  is_dependent    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE education (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id      uuid NOT NULL REFERENCES citizen(id) ON DELETE CASCADE,
  level           text NOT NULL,
  institution     text NOT NULL,
  specialty_code  text,
  specialty_name  text,
  start_year      smallint,
  end_year        smallint CHECK (end_year IS NULL OR end_year >= start_year),
  is_completed    boolean NOT NULL DEFAULT true,
  diploma_number  text,
  with_honors     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Записи раздела всегда ищутся по гражданину.
CREATE INDEX ON identity_document (citizen_id);
CREATE INDEX ON address (citizen_id);
CREATE INDEX ON contact (citizen_id);
CREATE INDEX ON family_member (citizen_id);
CREATE INDEX ON education (citizen_id);
