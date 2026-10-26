# Análisis de cobertura en español

## Resultados

Se comparó el conjunto actual de KanjiSensei con KANJIDIC2 y JMdict del corte del 21 de septiembre de 2026 (`scriptin/jmdict-simplified` release `3.6.2+20260921173324`). La cobertura se midió por presencia de glosa española aplicable a la forma y lectura de la app.

| JLPT de la app | Kanji con glosa ES | Total | Cobertura |
| --- | ---: | ---: | ---: |
| N5 | 80 | 80 | 100% |
| N4 | 166 | 166 | 100% |
| N3 | 367 | 367 | 100% |
| N2 | 373 | 373 | 100% |
| N1 | 1.244 | 1.244 | 100% |
| Sin nivel JLPT | 85 | 157 | 54,1% |
| **Total** | **2.315** | **2.387** | **97,0%** |

Entre las **11.245 parejas únicas de forma escrita y lectura** usadas por la app, **8.497 (75,6%)** tienen al menos una glosa JMdict en español aplicable; 2.748 no. En 2.747 de los pares sin cobertura se encontró el ID JMdict inglés correspondiente, pero no una glosa española aplicable en la entrada; uno no se pudo resolver al ID inglés por forma/lectura. Ese caso, `プー太郎/ぷうたろう`, combina forma y lectura que aparecen en la misma entrada, pero JMdict especifica que esa lectura se aplica a `風太郎`; la app eligió los primeros elementos de las listas e ignoró esa restricción.

La alineación de acepciones requiere más cuidado que el conteo de glosas. En el JSON multilingüe, las glosas de idiomas diferentes aparecen en registros de sentido separados; sus posiciones de lista no son IDs de sentido compartidos. Por eso el análisis las empareja dentro del mismo ID JMdict, comparando POS, aplicabilidad a kanji/kana, campo, dialecto y registro. Si ese criterio deja más de una acepción, intenta resolverla con coincidencia exacta de la primera glosa inglesa que muestra la app. El resultado conservador es **6.886 parejas** con glosa española enlazada de forma única al sentido de la glosa inglesa visible (61,2% del conjunto; 81,0% de las parejas que tienen alguna glosa española). Otras **1.611** tienen glosa española aplicable, pero la relación con el sentido inglés visible no es única según esos metadatos; entre ellas, 1.527 sí tienen esa glosa inglesa en algún sentido inglés del mismo ID, aunque la firma de metadatos del sentido español no coincide. En 84 pares no se halló una coincidencia inglesa única dentro del ID. Estos casos muestran que “hay glosa española” no garantiza una traducción directa del significado inglés que la UI escoge primero.

El detalle reproducible está en [summary.json](../reports/spanish-coverage/summary.json), [kanji-spanish-coverage.csv](../reports/spanish-coverage/kanji-spanish-coverage.csv), [word-reading-spanish-coverage.csv](../reports/spanish-coverage/word-reading-spanish-coverage.csv) y [quality-review-sample.csv](../reports/spanish-coverage/quality-review-sample.csv).

## Revisión de calidad

Revisé la muestra determinista de 54 pares, estratificada por nivel JLPT y por tres grupos: sentido enlazado, glosa española presente sin enlace inequívoco y sin cobertura española. En los 18 pares del grupo enlazado, las traducciones revisadas fueron razonables para la glosa inglesa de la app. En los 18 del grupo sin enlace inequívoco, 17 tenían al menos una equivalencia española plausible; `且つ` con glosa inglesa `and` solo ofrece `además`, que es cercana pero no una traducción directa en todos los contextos. La muestra confirma que el emparejamiento estructural estricto puede subcontar equivalencias reales cuando difieren POS o metadatos. También encontré detalles editoriales menores, como duplicados con y sin tilde (`lagrima`/`lágrima`) y traducciones adicionales de distinto alcance. Los 18 pares sin cobertura muestreados no tenían glosa española aplicable.

La muestra es una revisión exploratoria, no una estimación estadística ni una validación lexicográfica exhaustiva. Un reemplazo automático de la glosa inglesa debería partir solo de sentidos enlazados de manera confiable y mantener visibles los casos ambiguos para revisión.

## Fuentes y versiones

Se usó la publicación identificable de [`scriptin/jmdict-simplified` 3.6.2+20260921173324](https://github.com/scriptin/jmdict-simplified/releases/tag/3.6.2%2B20260921173324), publicada el 21 de septiembre de 2026. Los assets procesados fueron `kanjidic2-all-3.6.2.json` y `jmdict-all-3.6.2.json`; se usó el `jmdict-eng-common-3.6.2.json` ya incluido en el repo para definir y resolver las parejas que la app muestra. Los metadatos de los cuatro JSON validan `version=3.6.2` y `dictDate=2026-09-21`. KANJIDIC2 indica `fileVersion=4`, `databaseVersion=2026-264`; JMdict declara revisiones 1.04 a 1.09.

El proyecto atribuye los diccionarios fuente al [EDRDG](https://www.edrdg.org/) y distribuye los formatos derivados bajo CC BY-SA 4.0. Para el contexto de KANJIDIC2 véase la [documentación de KANJIDIC](https://www.edrdg.org/kanjidic/kanjd2index_legacy.html); para JMdict, la [descripción del proyecto](https://www.jmdict.org/jmdict/j_jmdict.html). El release reporta 2.505 caracteres con glosas españolas en el KANJIDIC2 completo y 34.305 entradas con glosas españolas en JMdict; esos totales globales no equivalen a la cobertura del subconjunto de la app.

## Método reproducible

El script está en [`scripts/analyze_spanish_coverage.py`](../scripts/analyze_spanish_coverage.py). Ejecutar desde la raíz del repo, indicando los dos assets descargados del release:

```sh
python3 scripts/analyze_spanish_coverage.py \
  --kanjidic-all /ruta/kanjidic2-all-3.6.2.json \
  --jmdict-all /ruta/jmdict-all-3.6.2.json
```

El script compara cada kanji actual con las glosas `es` de KANJIDIC2 y agrupa la cobertura por el JLPT asignado en la app. Para palabras deduplica por `(forma, lectura)`, encuentra candidatos por pareja exacta permitida en JMdict inglés `common-only` (respetando `appliesToKanji`) y restringe candidatos comparando la primera glosa inglesa con la que la app almacena. Luego consulta los mismos IDs de secuencia en JMdict `all`, filtra los sentidos por aplicabilidad de forma y lectura, y enlaza español con inglés por firma semántica y por coincidencia exacta de la glosa visible. Los casos ambiguos, múltiples sentidos y no emparejados quedan en el CSV. Se excluyen oraciones.

Los resultados incluyen CSV de cobertura, un resumen JSON y una muestra CSV reproducible. El script no traduce ni cambia datos de producción. El entorno requirió descarga escalada para obtener los assets; las entradas procesadas se mantuvieron en `/private/tmp` y no se agregaron al repo.
