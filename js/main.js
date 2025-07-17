import { mockData } from '../mock/mock.js'; // Import mock data if needed
import { ignoredShipments, columnsFilters, tiendasCodeId } from './consts.js'; // Import constants
import { excelSerialDateToJSDate, formatDateTime } from './utils.js'; // Import utility functions

class ProcessingTable {
	constructor() {
		this.inputFile = document.getElementById('input_file_excel');
		this.tableBody = document.getElementById('excelTableBody');

		if (!this.inputFile || !this.tableBody) {
			throw new Error('Required elements not found in the DOM');
		}

		this.jsonData = mockData; // Initialize with mock data for testing
		this.init();
	}

	init() {
		try {
			this.setupEventListeners();
			this.processingJson(this.jsonData);

			console.log('ProcessingTable initialized successfully');
		} catch (error) {
			console.error('Error initializing ProcessingTable:', error);
		}
	}

	setupEventListeners() {
		this.inputFile.addEventListener('change', (e) => this.handleFileAsync(e));
	}

	// XLSX is a global from the standalone script

	async handleFileAsync(e) {
		const file = e.target.files[0];
		if (!file) {
			console.error('No file selected');
			return;
		}

		/* data is an ArrayBuffer */
		const data = await file.arrayBuffer();
		if (!data) {
			console.error('Failed to read file data');
			return;
		}

		/* parse */
		const workbook = XLSX.read(data);
		if (!workbook) {
			console.error('Failed to parse workbook');
			return;
		}
		/* convert to json */
		const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { cellDates: true });
		if (!jsonData) {
			console.error('Failed to convert to JSON');
			return;
		}
		/* clear existing table */
		if (!this.tableBody) {
			console.error('Table body element not found');
			return;
		}

		this.tableBody.innerHTML = '';

		/* process JSON data */
		this.processingJson(jsonData);
	}

	processingJson(json) {
		if (!json || !Array.isArray(json)) {
			console.error('Invalid JSON data');
			return;
		}

		// console.log('Processing JSON data:', json);
	

		const uniqueOrdersMap = json.reduce(
			(acc, row) => {
				const orderId = row['ID DEL PEDIDO'];
				const customerCode = orderId?.trim()?.split('-')?.[0];
				const pedidoNumber = orderId?.trim()?.split('-')?.[3];

				// Si el ID ya ha sido procesado o la primera parte es ignorada, salta
				if (acc.seenIds.has(orderId) || ignoredShipments.includes(customerCode)) {
					return acc;
				}

				const filteredRow = {};

				columnsFilters.forEach((column) => {
					// Asigna el valor de la columna de 'row' a 'filteredRow'
					// Asegúrate de manejar casos donde la columna no exista en 'row'
					if (row.hasOwnProperty(column)) {
						if (column === 'ANTIGUEDAD' && typeof row[column] === 'number') {
							const jsDate = excelSerialDateToJSDate(row[column]);
							filteredRow[column] = formatDateTime(jsDate);
						} else {
							filteredRow[column] = row[column];
						}
					}

					if (column === 'PEDIDO') {
						// Añade la columna 'PEDIDO'
						filteredRow['PEDIDO'] = pedidoNumber;
					}

					const tienda = tiendasCodeId[customerCode];

					if (column == 'TIENDA') {
						
						if (tienda) {
							filteredRow['TIENDA'] = tienda.Customer;
						} else {
							filteredRow['TIENDA'] = '';
						}
					}

					if (tienda) {
						filteredRow['CODE'] = tienda.Code;
						filteredRow['ID'] = tienda.Id;
					}
				});

				
				// Añade el ID a los IDs vistos
				acc.seenIds.add(orderId);
				// Añade la fila filtrada a la lista de órdenes únicas
				acc.orders.push(filteredRow); // ¡Ahora usamos filteredRow!

				return acc;
			},
			{ seenIds: new Set(), orders: [] }
		);

		const uniqueOrders = uniqueOrdersMap.orders;

		console.log('Unique orders with filtered columns:', uniqueOrders);

		this.parseJson(uniqueOrders);
	}

	parseJson(jsonData) {
		if (!jsonData || !Array.isArray(jsonData)) {
			console.error('Invalid JSON data for parsing');
			return;
		}

		if (this.tableBody) {
			this.tableBody.innerHTML = ''; // Clear existing table body
		}

		// Filtered columns in not includes 'ID' and 'CODE'
		const filteredColumns = jsonData.map((row) => {
			return Object.fromEntries(
				Object.entries(row).filter(([key]) => !['ID', 'CODE'].includes(key))
			);
		}).filter(row => Object.keys(row).length > 0); // Filter out empty rows		

		console.log('Filtered columns:', filteredColumns);
		
		

		/* populate table */
		filteredColumns.forEach((row, index) => {
			const tr = document.createElement('tr');

			const tdCheckbox = document.createElement('td');
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.className = 'form-check-input';
			checkbox.id = `checkbox-${index}`;
			tdCheckbox.appendChild(checkbox);
			tr.appendChild(tdCheckbox);

			const thIndex = document.createElement('th');
			thIndex.scope = 'row';
			thIndex.textContent = index + 1;
			tr.appendChild(thIndex);
			

			Object.values(row).forEach((value) => {
				const td = document.createElement('td');
				td.textContent = value;
				tr.appendChild(td);
			});

			const tdLink = document.createElement('td');
			const link = document.createElement('a');

			link.href = row['Enlace'] || '#';
			link.className = 'btn btn-primary';
			link.target = '_blank';
			link.textContent = 'Imprimir';

			tdLink.appendChild(link);
			tr.appendChild(tdLink);

			this.tableBody.appendChild(tr);
		});
	}
}

document.addEventListener('DOMContentLoaded', () => {
	try {
		new ProcessingTable();
		console.log('DOMContentLoaded event processed successfully');
	} catch (error) {
		console.error('Error during DOMContentLoaded processing:', error);
		alert('An error occurred while initializing the application. Please check the console for details.');
	}
});

