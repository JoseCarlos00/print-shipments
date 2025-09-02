// import { mockData } from '../mock/mock.js'; // Import mock data if needed
import { ignoredShipments, columnsFilters, tiendasCodeId } from './consts.js'; // Import constants
import { excelSerialDateToJSDate, formatDateTime } from './utils.js'; // Import utility functions

class ProcessingTable {
	constructor() {
		this.inputFile = document.getElementById('input_file_excel');
		this.fileDropArea = document.getElementById('file-drop-area');
		this.tableBody = document.getElementById('excelTableBody');

		this.checkAll = document.getElementById('checkAll');
		this.processSelectedButton = document.getElementById('processSelectedButton');

		this.counterSelected = document.getElementById('counterSelected');

		if (!this.inputFile || !this.fileDropArea || !this.tableBody || !this.checkAll || !this.processSelectedButton) {
			throw new Error('Required elements not found in the DOM');
		}

		// this.jsonData = mockData; // Initialize with mock data for testing
		this.init();
	}

	init() {
		try {
			this.setupEventListeners();

			console.log('ProcessingTable initialized successfully');
		} catch (error) {
			console.error('Error initializing ProcessingTable:', error);
		}
	}

	setupEventListeners() {
		this.inputFile.addEventListener('change', (e) => this.handleFileAsync(e));

		// Drag and drop listeners for the file drop area
		const dropArea = this.fileDropArea;
		if (dropArea) {
			// Prevent default drag behaviors
			['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
				dropArea.addEventListener(eventName, this.preventDefaults, false);
			});

			// Highlight drop area when item is dragged over it
			['dragenter', 'dragover'].forEach((eventName) => {
				dropArea.addEventListener(eventName, () => this.highlight(dropArea), false);
			});

			['dragleave', 'drop'].forEach((eventName) => {
				dropArea.addEventListener(eventName, () => this.unhighlight(dropArea), false);
			});

			dropArea.addEventListener('drop', (e) => this.handleDrop(e), false);
		}

		this.checkAll.addEventListener('click', () => {
			this.toggleAllCheckboxes();
		});

		this.processSelectedButton.addEventListener('click', (e) => this.processSelected(e));

		this.tableBody.addEventListener('click', (e) => {
			// 1. Encontrar la fila (<tr>) más cercana al elemento del click
			const clickedRow = e.target.closest('tr');

			// Verificar si se hizo clic dentro de una fila y si esa fila existe
			if (clickedRow) {
				// 2. Encontrar el checkbox dentro de esa fila
				const checkbox = clickedRow.querySelector('input[type="checkbox"]');

				// Si encontramos un checkbox en la fila, lo manipulamos
				if (checkbox) {
					// Si el clic no fue directamente en el checkbox, alternamos su estado
					// Esto evita que se invierta dos veces si el usuario hace clic directamente en el checkbox
					if (e.target !== checkbox) {
						checkbox.checked = !checkbox.checked;
					}

					// 3. Actualizar el estado del botón de procesamiento
					// Habilitar/deshabilitar el botón de procesamiento según si hay algún checkbox marcado
					this.processSelectedButton.disabled = !this.tableBody.querySelector('input[type="checkbox"]:checked');

					// 4. Llamar a la función para deshabilitar el ancla individual
					// Pasa el checkbox para que tu función pueda actuar sobre él
					this.disabledIndividualAnchor(checkbox);
					this.updateSelectedCounter();
				}
			}
		});
	}

	// XLSX is a global from the standalone script

	preventDefaults(e) {
		e.preventDefault();
		e.stopPropagation();
	}

	highlight(element) {
		element.classList.add('drag-over');
	}

	unhighlight(element) {
		element.classList.remove('drag-over');
	}

	handleDrop(e) {
		const dt = e.dataTransfer;
		const files = dt.files;

		if (files.length) {
			this.inputFile.files = files;
			// Manually trigger the 'change' event on the file input,
			// which is already listened to by handleFileAsync
			const event = new Event('change', { bubbles: true });
			this.inputFile.dispatchEvent(event);
		}
	}

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
		const uniqueOrders = this.processingJson(jsonData);
		this.renderTable(uniqueOrders);
		this.selectAllOnInit();
	}

	processingJson(json) {
		if (!json || !Array.isArray(json)) {
			console.error('Invalid JSON data for processing');
			return [];
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
						filteredRow[
							'Enlace'
						] = `http://fmorion.dnsalias.com/orion/paginas/Bodega/ListaBodegaPedidosTienda.aspx?PedidoNum=${pedidoNumber}&TiendaId=${tienda.Id}`;
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

		// console.log('Unique orders with filtered columns:', uniqueOrders);

		return uniqueOrders;
	}

	renderTable(jsonData) {
		if (!jsonData || !Array.isArray(jsonData)) {
			console.error('Invalid JSON data for rendering');
			return;
		}

		if (this.tableBody) {
			this.tableBody.innerHTML = ''; // Clear existing table body
		}

		/* populate table */
		jsonData.forEach((row, index) => {
			const tr = document.createElement('tr');

			const tdCheckbox = document.createElement('td');
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.dataset.tiendaId = row['ID'] || '';
			checkbox.dataset.tiendaCode = row['CODE'] || '';
			checkbox.dataset.pedido = row['PEDIDO'] || '';
			checkbox.className = 'form-check-input';
			checkbox.id = `checkbox-${index}`;
			// checkbox.checked = true;
			tdCheckbox.appendChild(checkbox);
			tr.appendChild(tdCheckbox);

			const thIndex = document.createElement('th');
			thIndex.scope = 'row';
			thIndex.textContent = index + 1;
			tr.appendChild(thIndex);

			Object.entries(row).forEach(([key, value]) => {
				// console.log(`Processing key: ${key}, value: ${value}`);

				if (key === 'ID' || key === 'CODE' || key === 'Enlace') {
					// Skip 'ID' and 'CODE' columns
					return;
				}

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

	selectAllOnInit() {
		this.checkAll.checked = true;
		this.toggleAllCheckboxes();
	}

	updateSelectedCounter() {
		// Cuenta cuántos checkboxes están actualmente marcados dentro de tableBody
		const selectedCount = this.tableBody.querySelectorAll('input[type="checkbox"]:checked').length;

		// Asigna el número al contenido de tu elemento contador
		if (this.counterSelected) {
			this.counterSelected.textContent = selectedCount === 0 ? '' : selectedCount;
		}
	}

	toggleAllCheckboxes() {
		const checkboxes = this.tableBody.querySelectorAll('input[type="checkbox"]');

		checkboxes.forEach((checkbox) => {
			checkbox.checked = this.checkAll.checked;
			this.disabledIndividualAnchor(checkbox);
		});

		this.updateSelectedCounter();

		this.processSelectedButton.disabled = !this.checkAll.checked;
	}

	disabledIndividualAnchor(checkbox) {
		const row = checkbox.closest('tr');
		if (checkbox.checked) {
			row.classList.add('disabled');
		} else {
			row.classList.remove('disabled');
		}
	}

	processSelected() {
		const selectedCheckboxes = this.tableBody.querySelectorAll('input[type="checkbox"]:checked');
		if (selectedCheckboxes.length === 0) {
			alert('No hay pedidos seleccionados para procesar.');
			return;
		}

		const selectedData = Array.from(selectedCheckboxes).map((checkbox) => ({
			tiendaId: checkbox.dataset.tiendaId,
			tiendaCode: checkbox.dataset.tiendaCode,
			pedido: checkbox.dataset.pedido,
		}));

		console.log('Selected data: [', selectedData.length, ']', selectedData);
		this.sendExternalPrintShipments(selectedData);

		this.checkAll.checked = false;
		this.toggleAllCheckboxes();
	}

	// http://fmorion.dnsalias.com/orion/paginas/Bodega/ListaBodegaPedidosTienda.aspx?PedidoNum=78785,51420,62401&TiendaId=7,19,9
	sendExternalPrintShipments(selectedData) {
		const baseURL = 'http://fmorion.dnsalias.com/orion/paginas/Bodega/ListaBodegaPedidosTienda.aspx?';

		// PedidoNum=78785,51420,62401
		const PedidoNum = [];
		// &TiendaId=7,19,9
		const TiendaId = [];

		selectedData.forEach(({ tiendaId, pedido }) => {
			PedidoNum.push(pedido);
			TiendaId.push(tiendaId);
		});

		const newURL = `${baseURL}PedidoNum=${PedidoNum.join(',')}&TiendaId=${TiendaId.join(',')}`;
		window.open(newURL, '_blank');
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
