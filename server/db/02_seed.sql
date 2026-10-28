-- =====================================================================
-- Тестовые данные: 100 000 граждан и их документы, адреса, контакты,
-- семья и образование. Всё генерируется внутри PostgreSQL за секунды.
-- setseed делает «случайные» данные одинаковыми при каждом запуске.
-- =====================================================================
SELECT setseed(0.2026);

-- Случайный элемент массива. Повтор элемента в массиве = он выпадает чаще.
CREATE FUNCTION pg_temp.pick(arr anyarray) RETURNS anyelement LANGUAGE sql VOLATILE AS
$$ SELECT arr[1 + floor(random() * array_length(arr, 1))::int] $$;

-- Случайное целое от lo до hi включительно.
CREATE FUNCTION pg_temp.rnd(lo int, hi int) RETURNS int LANGUAGE sql VOLATILE AS
$$ SELECT lo + floor(random() * (hi - lo + 1))::int $$;

-- СНИЛС с верным контрольным числом (тот же алгоритм, что в web/src/lib/checksums.ts).
CREATE FUNCTION pg_temp.snils(n bigint) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE d text := lpad(n::text, 9, '0'); s int := 0; c int;
BEGIN
  FOR i IN 1..9 LOOP s := s + substr(d, i, 1)::int * (10 - i); END LOOP;
  c := CASE WHEN s < 100 THEN s WHEN s <= 101 THEN 0 ELSE s % 101 END;
  IF c = 100 THEN c := 0; END IF;
  RETURN substr(d, 1, 3) || '-' || substr(d, 4, 3) || '-' || substr(d, 7, 3) || ' ' || lpad(c::text, 2, '0');
END $$;

-- ИНН физлица (12 цифр) с верными контрольными цифрами.
CREATE FUNCTION pg_temp.inn12(n bigint) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE d text := lpad(n::text, 10, '0'); s int := 0;
  w1 int[] := '{7,2,4,10,3,5,9,4,6,8}'; w2 int[] := '{3,7,2,4,10,3,5,9,4,6,8}';
BEGIN
  FOR i IN 1..10 LOOP s := s + substr(d, i, 1)::int * w1[i]; END LOOP;
  d := d || ((s % 11) % 10)::text; s := 0;
  FOR i IN 1..11 LOOP s := s + substr(d, i, 1)::int * w2[i]; END LOOP;
  RETURN d || ((s % 11) % 10)::text;
END $$;

-- Главный город региона — для места рождения и адресов.
CREATE TEMP TABLE region_city (region_code text PRIMARY KEY, city text);
INSERT INTO region_city VALUES
  ('77','Москва'), ('78','Санкт-Петербург'), ('50','Подольск'), ('47','Гатчина'), ('23','Краснодар'),
  ('66','Екатеринбург'), ('16','Казань'), ('54','Новосибирск'), ('52','Нижний Новгород'), ('61','Ростов-на-Дону'),
  ('02','Уфа'), ('74','Челябинск'), ('63','Самара'), ('24','Красноярск'), ('59','Пермь'), ('34','Волгоград'),
  ('36','Воронеж'), ('55','Омск'), ('72','Тюмень'), ('38','Иркутск'), ('25','Владивосток'), ('39','Калининград'),
  ('76','Ярославль'), ('70','Томск'), ('14','Якутск');

/* ------------------------------ граждане ------------------------------ */

INSERT INTO citizen (
  last_name, first_name, middle_name, sex, birth_date, birth_place, citizenship_code,
  marital_status, snils, inn, oms_policy, region_code, social_category, disability_group,
  record_status, death_date, created_at
)
SELECT
  CASE WHEN p.male THEN p.last ELSE p.last || 'а' END,
  CASE WHEN p.male THEN pg_temp.pick(ARRAY['Александр','Сергей','Дмитрий','Андрей','Алексей','Максим','Иван','Михаил','Артём','Николай','Евгений','Владимир','Павел','Роман','Игорь','Кирилл','Олег','Денис'])
       ELSE pg_temp.pick(ARRAY['Елена','Ольга','Наталья','Анна','Мария','Татьяна','Ирина','Екатерина','Светлана','Юлия','Анастасия','Дарья','Марина','Ксения','Виктория','Полина','Алина','Вера']) END,
  p.patr || CASE WHEN p.male THEN 'ич' ELSE 'на' END,
  CASE WHEN p.male THEN 'M' ELSE 'F' END,
  p.birth,
  pg_temp.pick(ARRAY(SELECT city FROM region_city)),
  CASE WHEN random() < 0.97 THEN 'RU' ELSE pg_temp.pick(ARRAY['BY','KZ','UZ','AM']) END,
  CASE WHEN p.age < 18 THEN 'single'
       ELSE pg_temp.pick(ARRAY['married','married','married','single','single','divorced','civil_union','widowed']) END,
  pg_temp.snils(1002000 + p.g * 997),
  CASE WHEN p.age >= 14 THEN pg_temp.inn12(7700000000 + p.g * 13) END,
  lpad((7700000000000000 + p.g)::text, 16, '0'),
  p.region,
  CASE WHEN p.age < 7 THEN 'preschool'
       WHEN p.age < 18 THEN 'schoolchild'
       WHEN p.age < 23 AND random() < 0.6 THEN 'student'
       WHEN p.age >= 63 THEN 'pensioner'
       ELSE pg_temp.pick(ARRAY['employed','employed','employed','employed','employed','employed','unemployed','large_family','low_income','veteran']) END,
  CASE WHEN random() < 0.06 THEN pg_temp.pick(ARRAY['1','2','2','3','3','3']) END, -- около 6% с инвалидностью
  p.status,
  CASE WHEN p.status = 'deceased' THEN p.birth + floor(random() * (current_date - p.birth))::int END,
  -- Чем ближе к сегодняшнему дню, тем больше новых записей: график роста на дашборде не будет «плоским».
  now() - power(random(), 1.6) * interval '6 years'
FROM (
  SELECT g, male, birth, date_part('year', age(birth))::int AS age,
    pg_temp.pick(ARRAY['Иванов','Смирнов','Кузнецов','Попов','Васильев','Петров','Соколов','Михайлов','Новиков','Фёдоров',
      'Морозов','Волков','Алексеев','Лебедев','Семёнов','Егоров','Павлов','Козлов','Степанов','Николаев','Орлов','Андреев',
      'Макаров','Никитин','Захаров','Зайцев','Соловьёв','Борисов','Яковлев','Григорьев']) AS last,
    pg_temp.pick(ARRAY['Александров','Сергеев','Дмитриев','Андреев','Алексеев','Иванов','Михайлов','Николаев','Владимиров','Павлов','Олегов','Игорев']) AS patr,
    -- Москва и Петербург встречаются чаще — как в реальности.
    pg_temp.pick(ARRAY['77','77','77','77','78','78','78','50','50','47','23','23','66','16','54','52','61','02','74','63','24','59','34','36','55','72','38','25','39','76','70','14']) AS region,
    CASE WHEN r < 0.93 THEN 'active' WHEN r < 0.96 THEN 'archived' WHEN r < 0.98 THEN 'deceased' ELSE 'moved' END AS status
  FROM (
    SELECT g, random() < 0.47 AS male, date '1935-01-01' + floor(random() * (date '2026-09-30' - date '1935-01-01'))::int AS birth,
           random() AS r
    FROM generate_series(1, 100000) g
  ) s
) p;

-- Вспомогательная выборка с возрастом — для всех связанных таблиц.
CREATE TEMP TABLE c AS
SELECT id, personal_number AS n, sex, birth_date, last_name, region_code, marital_status, social_category,
       date_part('year', age(birth_date))::int AS age
FROM citizen;

/* ------------------------- документы, адреса, контакты ------------------------- */

-- Основной документ: с 14 лет паспорт, до 14 — свидетельство о рождении.
INSERT INTO identity_document (citizen_id, doc_type, series, number, issued_by, division_code, issued_date, is_primary)
SELECT c.id,
  CASE WHEN c.age >= 14 THEN 'passport_ru' ELSE 'birth_cert' END,
  CASE WHEN c.age >= 14 THEN lpad(((c.n * 7) % 10000)::text, 4, '0') ELSE 'I-МЮ' END,
  lpad(c.n::text, 6, '0'),
  CASE WHEN c.age >= 14 THEN 'ГУ МВД России по г. ' || rc.city ELSE 'Отдел ЗАГС г. ' || rc.city END,
  CASE WHEN c.age >= 14 THEN lpad(pg_temp.rnd(100, 999)::text, 3, '0') || '-' || lpad(pg_temp.rnd(1, 999)::text, 3, '0') END,
  CASE WHEN c.age >= 20 THEN c.birth_date + interval '20 years' + pg_temp.rnd(0, 60) * interval '1 day'
       WHEN c.age >= 14 THEN c.birth_date + interval '14 years' + pg_temp.rnd(0, 60) * interval '1 day'
       ELSE c.birth_date + pg_temp.rnd(5, 30) * interval '1 day' END,
  true
FROM c JOIN region_city rc USING (region_code);

-- Загранпаспорт — примерно у четверти взрослых.
INSERT INTO identity_document (citizen_id, doc_type, series, number, issued_by, issued_date, expires_date)
SELECT c.id, 'passport_foreign', lpad((70 + c.n % 30)::text, 2, '0'), lpad((c.n * 3)::text, 7, '0'), 'МВД России',
  d.issued, d.issued + interval '10 years'
FROM c CROSS JOIN LATERAL (SELECT current_date - pg_temp.rnd(30, 3000) AS issued) d
WHERE c.age >= 18 AND c.n % 4 = 0;

INSERT INTO address (citizen_id, kind, postal_code, region_code, locality, street, house, apartment)
SELECT c.id, k.kind, lpad(pg_temp.rnd(100000, 699999)::text, 6, '0'), c.region_code, rc.city,
  pg_temp.pick(ARRAY['ул. Ленина','ул. Гагарина','ул. Мира','пр. Победы','ул. Советская','ул. Садовая','ул. Лесная','ул. Школьная','ул. Набережная','ул. Молодёжная']),
  pg_temp.rnd(1, 150)::text, pg_temp.rnd(1, 300)::text
FROM c JOIN region_city rc USING (region_code)
CROSS JOIN LATERAL (
  SELECT 'registration' AS kind
  UNION ALL SELECT 'residence' WHERE c.n % 10 < 3 -- у 30% адрес проживания отличается от регистрации
) k;

INSERT INTO contact (citizen_id, kind, value, is_primary)
SELECT c.id, 'mobile',
  '+7 (9' || lpad(pg_temp.rnd(0, 99)::text, 2, '0') || ') ' || lpad(pg_temp.rnd(0, 999)::text, 3, '0') || '-'
    || lpad(pg_temp.rnd(0, 99)::text, 2, '0') || '-' || lpad(pg_temp.rnd(0, 99)::text, 2, '0'),
  true
FROM c WHERE c.age >= 14
UNION ALL
SELECT c.id, 'email', 'user' || c.n || pg_temp.pick(ARRAY['@mail.ru','@yandex.ru','@gmail.com']), false
FROM c WHERE c.age >= 16 AND c.n % 2 = 0;

/* ------------------------------- семья ------------------------------- */

-- Супруг(а) для состоящих в браке.
INSERT INTO family_member (citizen_id, relation, last_name, first_name, birth_date)
SELECT c.id, 'spouse',
  CASE WHEN c.sex = 'M' THEN c.last_name || 'а' ELSE regexp_replace(c.last_name, 'а$', '') END,
  CASE WHEN c.sex = 'M' THEN pg_temp.pick(ARRAY['Елена','Ольга','Анна','Мария','Ирина','Светлана'])
       ELSE pg_temp.pick(ARRAY['Сергей','Андрей','Алексей','Иван','Михаил','Николай']) END,
  c.birth_date + pg_temp.rnd(-1500, 1500)
FROM c WHERE c.marital_status IN ('married', 'civil_union');

-- Дети: у половины взрослых 25–60 лет от одного до трёх.
INSERT INTO family_member (citizen_id, relation, last_name, first_name, birth_date, is_dependent)
SELECT c.id, 'child',
  regexp_replace(c.last_name, 'а$', '') || CASE WHEN ch.female THEN 'а' ELSE '' END,
  CASE WHEN ch.female THEN pg_temp.pick(ARRAY['София','Алиса','Ева','Полина','Варвара','Мария'])
       ELSE pg_temp.pick(ARRAY['Михаил','Лев','Матвей','Тимофей','Артём','Марк']) END,
  ch.birth, ch.birth > current_date - interval '18 years'
FROM c
CROSS JOIN LATERAL generate_series(1, 1 + (c.n % 3)) k
CROSS JOIN LATERAL (
  SELECT k % 2 = 0 AS female,
         least(current_date - 30, c.birth_date + interval '22 years' + (k * 900 + c.n % 700) * interval '1 day')::date AS birth
) ch
WHERE c.age BETWEEN 25 AND 60 AND c.n % 2 = 1;

/* ----------------------------- образование ----------------------------- */

INSERT INTO education (citizen_id, level, institution, specialty_name, start_year, end_year, is_completed, diploma_number, with_honors)
SELECT c.id, e.level,
  pg_temp.pick(ARRAY['МГУ им. М. В. Ломоносова','СПбГУ','НИУ ВШЭ','МГТУ им. Н. Э. Баумана','УрФУ','КФУ','НГУ','ТГУ','РАНХиГС','Финансовый университет']),
  pg_temp.pick(ARRAY['Экономика','Юриспруденция','Прикладная информатика','Менеджмент','Строительство','Лечебное дело','Педагогическое образование','Государственное и муниципальное управление']),
  e.start_year, e.start_year + 4, e.start_year + 4 <= 2026,
  CASE WHEN e.start_year + 4 <= 2026 THEN lpad(c.n::text, 7, '0') END,
  random() < 0.1
FROM c
CROSS JOIN LATERAL (
  SELECT pg_temp.pick(ARRAY['vocational','bachelor','bachelor','specialist','master','secondary']) AS level,
         date_part('year', c.birth_date)::int + 18 AS start_year
) e
WHERE c.age >= 18;

ANALYZE; -- обновляем статистику, чтобы планировщик сразу выбирал правильные индексы
