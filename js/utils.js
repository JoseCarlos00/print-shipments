export function excelSerialDateToJSDate(serial) {
	const excelDateOffset = 25569; // Días entre 1900-01-01 y 1970-01-01 (con el bug de 1900)
	const MS_PER_DAY = 24 * 60 * 60 * 1000;

	// Sumar 1 día al offset para corregir el "bug" del 29 de febrero de 1900 que Excel incluye
	// Esto es necesario para alinear las fechas de Excel con las de JavaScript para fechas posteriores al 28/02/1900
	const correctedOffset = excelDateOffset + 1; // Aquí se añade el día extra

	// Convertir el número de serie a milisegundos desde la época de JavaScript
	const jsTime = (serial - correctedOffset) * MS_PER_DAY;

	// Crea un objeto Date. Usa `Date.UTC` si quieres que el objeto interno sea UTC
	// Usamos Date.UTC para crear la fecha en UTC
	const date = new Date(Date.UTC(1900, 0, 1, 0, 0, 0) + jsTime);

	return date;
}

export function formatDateTime(date) {
	// Verificar si es un objeto Date válido
	if (!(date instanceof Date) || isNaN(date.getTime())) {
		return 'Fecha Inválida'; // O cualquier manejo de error que prefieras
	}

	const day = String(date.getUTCDate()).padStart(2, '0'); // Usar getUTCDate
	const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Usar getUTCMonth
	const year = date.getUTCFullYear(); // Usar getUTCFullYear
	const hours = String(date.getUTCHours()).padStart(2, '0'); // Usar getUTCHours
	const minutes = String(date.getUTCMinutes()).padStart(2, '0'); // Usar getUTCMinutes

	return `${day}/${month}/${year} ${hours}:${minutes}`;
}
