# Lecciones Aprendidas (Lessons Learned)

Este documento registra los aprendizajes técnicos críticos, decisiones de arquitectura y patrones de diseño utilizados durante el desarrollo de la aplicación.

## 1. Prevención de `undefined` en Firestore `setDoc({ merge: true })`
- **Problema**: Firebase Firestore lanza una excepción fatal (`FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined`) cuando se intenta guardar un valor `undefined` o cuando una de las propiedades de un objeto anidado está ausente, rompiendo toda la transacción. Esto provocaba que las actualizaciones de configuración fallaran de forma silenciosa si no se manejaba el error adecuadamente.
- **Solución Obligatoria**: Implementar sanitización estricta, proporcionar valores fallback garantizados (`cleanStart || '08:00'`) y realizar un **merge defensivo** al leer o escribir datos. Los objetos que entran a `setDoc` jamás deben tener llaves cuyo valor pueda resolver a `undefined`.

## 2. Desacoplamiento de Estado en Formularios de Configuración
- **Problema**: Los componentes de entrada como `<input type="time">` que sincronizan el estado en cada evento `onChange` directamente con la base de datos causan múltiples escrituras innecesarias, degradan el rendimiento, provocan latencia al tipear y son propensos a sobrescrituras erróneas.
- **Solución Obligatoria**: Separar el estado local (memoria del formulario) del estado global/persistencia. Para configuraciones, mantener el estado local y enviar a Firestore únicamente mediante un botón explícito de **"Guardar/Confirmar"** o en el evento `onBlur` si es adecuado.

## 3. Manejo de Disponibilidad Dual (`confirmed` y `completed`) y Anti-Race Condition
- **Problema**: El sistema de disponibilidad de turnos presentaba problemas para calcular slots libres al haber citas que se cambiaban rápidamente de `confirmed` a `completed`, dejando slots supuestamente "ocupados".
- **Solución Obligatoria**: La lógica de verificación de conflictos en turnos debe contabilizar tanto citas en estado `confirmed` como `completed` para evaluar la disponibilidad histórica, complementado con el uso de bloqueos (locks) de interfaz y transacciones simples para evitar condiciones de carrera si dos usuarios agendan al mismo tiempo.

## 4. Persistencia Híbrida de Contacto (LocalStorage + Firestore)
- **Problema**: Forzar a los usuarios a escribir sus datos de contacto en cada cita generaba fricción.
- **Solución Obligatoria**: Estrategia de persistencia híbrida. El frontend mantiene un perfil de cliente anónimo cacheado en el `LocalStorage` del navegador (nombre, teléfono). Al agendar, estos datos se autocompletan en el formulario e, internamente, los registros de cita de Firestore se vinculan en base a esos mismos datos unificados.

## 5. Diseño Mobile-First y Formato Horario Local
- **Problema**: Interfaces que se veían bien en escritorio se rompían en pantallas pequeñas y las horas en formato de 24 horas resultaban confusas para los clientes locales.
- **Solución Obligatoria**: Diseño estrictamente **Mobile-First** (por defecto para pantallas chicas, adaptando con prefijos `md:` o `lg:`). Además, formatear todas las visualizaciones de hora a estándar de 12 horas con AM/PM (formato típico en Colombia), utilizando bibliotecas o funciones seguras para garantizar el huso horario correcto.
