// Variable global para almacenar la instancia del gráfico estadístico
let chartInstance = null;

// Abre la interfaz del panel administrativo y renderiza la tabla de clientes
function abrirPanelAdmin() {
    mostrarSeccion('seccion-admin');
    renderizarTablaAdmin();
    actualizarEstadisticasAdmin();
}

// Recarga el inventario físico de billetes en el cajero y actualiza las estadísticas
function rellenarCajeroBilletes() {
    const b20 = parseInt(document.getElementById('recarga-b20').value) || 0;
    const b10 = parseInt(document.getElementById('recarga-b10').value) || 0;
    const b5 = parseInt(document.getElementById('recarga-b5').value) || 0;
    
    const montoRecarga = (b20 * 20) + (b10 * 10) + (b5 * 5);
    
    if (montoRecarga <= 0) {
        alert("Ingrese cantidades válidas de billetes para recargar.");
        return;
    }
    
    billetesCajero[20] += b20;
    billetesCajero[10] += b10;
    billetesCajero[5] += b5;
    
    efectivoCajero = (billetesCajero[20] * 20) + (billetesCajero[10] * 10) + (billetesCajero[5] * 5);
    
    registrarTransaccionHistorial(`Recarga +$${montoRecarga}`);
    alert(`Cajero rellenado con éxito. Se añadieron $${montoRecarga} en efectivo físico. Nuevo total: $${efectivoCajero.toFixed(2)}`);
    
    document.getElementById('recarga-b20').value = '';
    document.getElementById('recarga-b10').value = '';
    document.getElementById('recarga-b5').value = '';
    
    actualizarEstadisticasAdmin();
}

// Resuelve una ecuación lineal de primer grado para estimar proyecciones de agotamiento
function resolverEcuacionGradoUno(a, b) {
    if (a === 0) return 0;
    return -b / a;
}

// Actualiza los indicadores numéricos y de proyección en el panel de administración
function actualizarEstadisticasAdmin() {
    efectivoCajero = (billetesCajero[20] * 20) + (billetesCajero[10] * 10) + (billetesCajero[5] * 5);
    
    const disp = document.getElementById('efectivo-cajero-display');
    if (disp) disp.innerText = efectivoCajero.toFixed(2);
    
    const s20 = document.getElementById('stock-b20');
    const s10 = document.getElementById('stock-b10');
    const s5 = document.getElementById('stock-b5');
    
    if (s20) s20.innerText = billetesCajero[20];
    if (s10) s10.innerText = billetesCajero[10];
    if (s5) s5.innerText = billetesCajero[5];
    
    const promedioRetiro = retirosRegistrados.length > 0
        ? retirosRegistrados.reduce((a, b) => a + b, 0) / retirosRegistrados.length
        : 0;
        
    const elemProyeccion = document.getElementById('proyeccion-agotamiento');
    if (elemProyeccion) {
        if (promedioRetiro > 0) {
            const a = -promedioRetiro;
            const b = efectivoCajero;
            const operacionesRestantes = Math.floor(resolverEcuacionGradoUno(a, b));
            elemProyeccion.innerText = `Proyección operativa: Efectivo disponible para aprox. ${operacionesRestantes} retiros adicionales.`;
        } else {
            elemProyeccion.innerText = "Flujo de efectivo estable.";
        }
    }
    actualizarGrafica();
}

// Genera y actualiza la gráfica de líneas mediante Chart.js para visualizar el flujo del efectivo
function actualizarGrafica() {
    const canvas = document.getElementById('graficaEfectivoCanvas');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: etiquetasTransacciones,
            datasets: [{
                label: 'Efectivo ATM ($)',
                data: historialTransacciones,
                borderColor: '#1d4ed8',
                backgroundColor: 'rgba(29, 78, 216, 0.1)',
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { ticks: { color: '#64748b' }, grid: { color: '#e2e8f0' } },
                x: { ticks: { color: '#64748b' }, grid: { color: '#e2e8f0' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// Importa una base de datos de clientes externa mediante un archivo Excel (SheetJS)
function importarExcel() {
    const fileInput = document.getElementById('excel-file-input');
    const file = fileInput.files[0];
    if (!file) {
        alert("Por favor seleccione un archivo Excel.");
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const datosExcel = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        if (datosExcel && datosExcel.length > 0) {
            baseDeDatos = datosExcel.map(row => ({
                cedula: String(row.cedula || row.Cedula || row.Cédula || "").trim(),
                nombre: String(row.nombre || row.Nombre || "").trim(),
                email: String(row.email || row.Email || "").trim().toLowerCase(),
                saldo: parseFloat(row.saldo || row.Saldo || 0)
            }));
            localStorage.setItem('kitopay_atm_db', JSON.stringify(baseDeDatos));
            renderizarTablaAdmin();
            alert(`Se cargaron ${baseDeDatos.length} registros exitosamente.`);
        } else {
            alert("El archivo Excel no contiene datos válidos.");
        }
    };
    reader.readAsArrayBuffer(file);
}

// Exporta la base de datos de clientes actual a un archivo Excel descargable
function exportarExcel() {
    if (baseDeDatos.length === 0) {
        alert("No hay clientes registrados para exportar.");
        return;
    }
    const ws = XLSX.utils.json_to_sheet(baseDeDatos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaseDatos_ATM");
    XLSX.writeFile(wb, "BaseDatos_ATM_KITOPAY.xlsx");
}

// Renderiza los registros de la base de datos en la tabla HTML del panel administrativo
function renderizarTablaAdmin() {
    const tbody = document.getElementById('tabla-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (baseDeDatos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Sin registros. Importe un archivo Excel.</td></tr>';
        return;
    }
    baseDeDatos.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.cedula}</td>
            <td>${u.nombre || 'Sin Nombre'}</td>
            <td>${u.email}</td>
            <td>${(parseFloat(u.saldo) || 0).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Borra por completo la base de datos almacenada localmente en el navegador
function limpiarMemoria() {
    if (confirm("¿Desea borrar la base de datos de clientes?")) {
        localStorage.removeItem('kitopay_atm_db');
        baseDeDatos = [];
        renderizarTablaAdmin();
        alert("Base de datos restablecida.");
    }
}

// Valida el PIN secreto ingresado para permitir el acceso al mantenimiento del cajero
function validarAdminMaintenance() {
    const clave = document.getElementById('input-admin-maintenance').value;
    if (clave === '12345') {
        abrirPanelAdmin();
    } else {
        alert("PIN de mantenimiento incorrecto.");
    }
}

// Sincroniza las modificaciones del saldo del usuario activo con la base de datos local
function sincronizarBDLocal() {
    const idx = baseDeDatos.findIndex(u => u.cedula === usuarioSesion.cedula);
    if (idx !== -1) baseDeDatos[idx].saldo = usuarioSesion.saldo;
    localStorage.setItem('kitopay_atm_db', JSON.stringify(baseDeDatos));
}