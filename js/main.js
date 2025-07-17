import { mockData } from "../mock/mock.js"; // Import mock data if needed

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
		const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
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

		console.log('Processing JSON data:', json);

		const ignoredShipments = ['444','R444','357','R357','417','R417','418','R418','1171','R1171','356','R356'];

		const uniqueOrdersMap = json.reduce(
			(acc, row) => {
				const orderId = row['ID DEL PEDIDO'];
				const firstPart = orderId?.trim()?.split('-', 1)?.[0];

				// Si el ID ya ha sido procesado o la primera parte es ignorada, salta
				if (acc.seenIds.has(orderId) || ignoredShipments.includes(firstPart)) {
					return acc;
				}

				// Añade el ID a los IDs vistos
				acc.seenIds.add(orderId);
				// Añade la fila a la lista de órdenes únicas
				acc.orders.push(row);

				return acc;
			},
			{ seenIds: new Set(), orders: [] }
		);

		const uniqueOrders = uniqueOrdersMap.orders;

		// this.parseJson(json);
	}

	parseJson(json) {
		/* populate table */
		jsonData.forEach((row, index) => {
			const tr = document.createElement('tr');
			const th = document.createElement('th');
			th.scope = 'row';
			th.textContent = index + 1;
			tr.appendChild(th);
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
			link.textContent = 'Ver Detalles';
			tdLink.appendChild(link);
			tr.appendChild(tdLink);
			tableBody.appendChild(tr);
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
})
