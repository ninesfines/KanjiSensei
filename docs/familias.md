# Explorador de familias

La vista `/families` reúne relaciones entre kanji sobre los datos locales del
proyecto. La exploración clásica de radicales sigue disponible en `/browse`.

## Criterios

- **Componente:** pieza compartida, incluyendo variantes canónicas. Permite
  limitar a radical principal o a una posición conocida.
- **Serie fonética:** componente marcado como fonético en los datos. Las
  lecturas se comparan sin asumir que todos los miembros se pronuncian igual.
- **Lectura compartida:** coincidencia de lectura, distinguiendo on y kun.
- **Forma parecida:** grupos seleccionados con una explicación de diferencias;
  no constituye un catálogo exhaustivo ni una medida automática de similitud.
- **Temas:** categorías seleccionadas explícitamente, no etimologías deducidas
  de la traducción del radical.
- **Palabras en común:** kanji que coaparecen en una palabra del vocabulario
  disponible. Las palabras concretas se muestran como evidencia. La cantidad
  de ejemplos no representa frecuencia de uso en japonés.

## Comparación

Se seleccionan hasta dos caracteres sin abandonar la familia. El comparador
muestra significados, lecturas, componentes y ejemplos. Azul indica componentes
compartidos y amarillo componentes diferentes; las etiquetas textuales permiten
entender la comparación sin depender únicamente del color.

Los filtros, la familia y la selección se conservan en la URL. Los niveles JLPT
corresponden a los **kanji**, no a las palabras de ejemplo. Una posición ausente
en los datos no se infiere. Las traducciones de vocabulario mantienen la regla
de español disponible con inglés entre paréntesis.

El mapa de componentes a trazos se regenera con
`python3 scripts/build_component_strokes.py`, a partir del KanjiVG original en
`data_raw/kanjivg.xml.gz`. Solo se aceptan caracteres cuyos trazos coincidan
exactamente con los archivos ya utilizados por la aplicación. El derivado
mantiene la atribución y licencia de KanjiVG documentadas en README.

## Verificación antes de entregar

- Variantes canónicas como 水/氵 producen la misma familia.
- Todos los resultados cumplen los filtros de radical, posición y JLPT.
- Cada lectura y cada conexión por palabras tiene evidencia en los datos.
- Ningún kanji ausente del conjunto de datos se ofrece como resultado.
- Los enlaces compartidos y atrás/adelante recuperan la selección correcta.
- La selección para comparar se distingue del enlace a la ficha.
- La vista funciona en español e inglés, con teclado y en pantallas pequeñas.
- Los trazos se cargan bajo demanda y tienen una alternativa textual.
- La compilación de producción sigue funcionando.
