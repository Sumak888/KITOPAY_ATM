// Variables globales de control para las transacciones y stock físico del cajero
let retirosRegistrados = [];
let efectivoCajero = 1000.00;
let billetesCajero = { 20: 25, 10: 40, 5: 20 }; // Aqui da la suma de los 1000 dolares en billetes
let historialTransacciones = [1000.00];
let etiquetasTransacciones = ["INICIO"];
let operacionSeleccionada = null;
let pasoTransaccion = 1;
let datosTxTemp = {};

// Muestra la interfaz para consultar el saldo de la cuenta con opción de privacidad
function consultarSaldo() {
    reiniciarTemporizadorInactividad();
    operacionSeleccionada = 'saldo';
    document.getElementById('panel-publicidad-client').classList.add('hidden');
    document.getElementById('area-transaccion').classList.remove('hidden');
    const contenedor = document.getElementById('paso-formulario-container');
    const titulo = document.getElementById('titulo-operacion');
    titulo.innerText = "CONSULTA DE SALDO";
    const valorMostrar = saldoVisible ?
        `$${(parseFloat(usuarioSesion.saldo).toFixed(2))}` : "......";
    contenedor.innerHTML = `
        <div class="saldo-privacy-container">
            <span>SALDO DE CUENTA ACTIVA</span>
            <div class="saldo-display-row">
                <h3 id="texto-saldo-valor">${valorMostrar}</h3>
                <button onclick="togglePrivacidadSaldo()" class="btn-eye-toggle"
                id="btn-eye-icon">${saldoVisible ? 'Ocultar Saldo' : 'Mostrar Saldo'}</button>
            </div>
        </div>
        <button onclick="cancelarOperacion()" class="btn-action-cancel w-100"
        style="margin-top: 15px;">REGRESAR</button>
    `;
}

// Alterna la visualización numérica real u oculta del saldo de la cuenta
function togglePrivacidadSaldo() {
    reiniciarTemporizadorInactividad();
    saldoVisible = !saldoVisible;
    const textoSaldo = document.getElementById('texto-saldo-valor');
    const btnOjo = document.getElementById('btn-eye-icon');
    if (textoSaldo && btnOjo) {
        if (saldoVisible) {
            textoSaldo.innerText = `$${(parseFloat(usuarioSesion.saldo).toFixed(2))}`;
            btnOjo.innerText = 'Ocultar Saldo';
        } else {
            textoSaldo.innerText = '......';
            btnOjo.innerText = 'Mostrar Saldo';
        }
    }
}

// Inicializa el tipo de operación seleccionada por el usuario
function seleccionarOperacion(tipo) {
    reiniciarTemporizadorInactividad();
    operacionSeleccionada = tipo;
    pasoTransaccion = 1;
    datosTxTemp = { b20: 0, b10: 0, b5: 0 };
    document.getElementById('panel-publicidad-client').classList.add('hidden');
    document.getElementById('area-transaccion').classList.remove('hidden');
    renderizarPasoTransaccion();
}

// Cancela la transacción en curso y retorna al menú principal con la publicidad
function cancelarOperacion() {
    reiniciarTemporizadorInactividad();
    pasoTransaccion = 1;
    datosTxTemp = {};
    document.getElementById('area-transaccion').classList.add('hidden');
    document.getElementById('panel-publicidad-client').classList.remove('hidden');
}

// Renderiza dinámicamente los pasos y formularios correspondientes a cada transacción
function renderizarPasoTransaccion() {
    const contenedor = document.getElementById('paso-formulario-container');
    const titulo = document.getElementById('titulo-operacion');
    contenedor.innerHTML = '';
    
    if (operacionSeleccionada === 'retiro') {
        titulo.innerText = "RETIRO DE EFECTIVO";
        if (pasoTransaccion === 1) {
            contenedor.innerHTML = `
                <p class="panel-subtitle">Ingrese monto total a retirar (Máx \$500):</p>
                <input type="text" id="tx-input-val" class="atm-text-input"
                placeholder="0.00" readonly>
                <div class="keypad-grid" style="margin-bottom: 10px;">
                    <button class="key-btn" onclick="digitarNumpadTransaccion('1')">1</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('2')">2</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('3')">3</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('4')">4</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('5')">5</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('6')">6</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('7')">7</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('8')">8</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('9')">9</button>
                    <button class="key-btn key-clear" onclick="borrarNumpadTransaccion()">BORRAR</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('0')">0</button>
                    <button class="key-btn key-submit" onclick="procesarPasoRetiroMonto()">CONTINUAR</button>
                </div>
                <button onclick="cancelarOperacion()" class="btn-action-cancel w-100">CANCELAR</button>
            `;
        } else if (pasoTransaccion === 2) {
            const acumulado = (datosTxTemp.b20 * 20) + (datosTxTemp.b10 * 10) + (datosTxTemp.b5 * 5);
            const restante = datosTxTemp.montoObjetivo - acumulado;
            const esCompleto = acumulado === datosTxTemp.montoObjetivo;
            const colorSaldo = esCompleto ? "var(--success)" : "var(--danger)";
            const estadoTexto = esCompleto ? "Monto completado, tú puedes retirar" : `Faltante: $${restante.toFixed(2)}`;
            
            const sinStock20 = billetesCajero[20] <= 0 || datosTxTemp.b20 >= billetesCajero[20];
            const sinStock10 = billetesCajero[10] <= 0 || datosTxTemp.b10 >= billetesCajero[10];
            const sinStock5 = billetesCajero[5] <= 0 || datosTxTemp.b5 >= billetesCajero[5];

            contenedor.innerHTML = `
                <p class="panel-subtitle">Meta: $${datosTxTemp.montoObjetivo.toFixed(2)} | Saldo para retirar: <strong style="color:${colorSaldo};">$${acumulado.toFixed(2)}</strong></p>
                <p style="font-size: 0.8rem; color: ${colorSaldo}; font-weight: 600; margin-bottom: 8px;">${estadoTexto}</p>
                <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;">
                    <button class="btn-adm-primary" onclick="acumularBilleteRetiro(20)" ${sinStock20 ? 'style="background: #94a3b8; cursor: not-allowed;" disabled' : ''}>
                        ${billetesCajero[20] <= 0 ? 'Billete de $20 (Agotado)' : `Agregar Billete de $20 (Actual: ${datosTxTemp.b20})`}
                    </button>
                    <button class="btn-adm-primary" onclick="acumularBilleteRetiro(10)" ${sinStock10 ? 'style="background: #94a3b8; cursor: not-allowed;" disabled' : ''}>
                        ${billetesCajero[10] <= 0 ? 'Billete de $10 (Agotado)' : `Agregar Billete de $10 (Actual: ${datosTxTemp.b10})`}
                    </button>
                    <button class="btn-adm-primary" onclick="acumularBilleteRetiro(5)" ${sinStock5 ? 'style="background: #94a3b8; cursor: not-allowed;" disabled' : ''}>
                        ${billetesCajero[5] <= 0 ? 'Billete de $5 (Agotado)' : `Agregar Billete de $5 (Actual: ${datosTxTemp.b5})`}
                    </button>
                </div>
                <div class="trans-buttons-row">
                    <button onclick="validarYEjecutarRetiroBilletes()" class="btn-action-execute" ${!esCompleto ? 'style="opacity:0.6; cursor:not-allowed;"' : ''}>CONFIRMAR RETIRO</button>
                    <button onclick="cancelarOperacion()" class="btn-action-cancel">CANCELAR</button>
                </div>
            `;
        }
    } else if (operacionSeleccionada === 'deposito') {
        titulo.innerText = "DEPÓSITO EN EFECTIVO";
        contenedor.innerHTML = `
            <p class="panel-subtitle">Ingrese monto a depositar (Máx \$1000):</p>
            <input type="text" id="tx-input-val" class="atm-text-input" placeholder="0.00" readonly>
            <div class="keypad-grid" style="margin-bottom: 10px;">
                <button class="key-btn" onclick="digitarNumpadTransaccion('1')">1</button>
                <button class="key-btn" onclick="digitarNumpadTransaccion('2')">2</button>
                <button class="key-btn" onclick="digitarNumpadTransaccion('3')">3</button>
                <button class="key-btn" onclick="digitarNumpadTransaccion('4')">4</button>
                <button class="key-btn" onclick="digitarNumpadTransaccion('5')">5</button>
                <button class="key-btn" onclick="digitarNumpadTransaccion('6')">6</button>
                <button class="key-btn" onclick="digitarNumpadTransaccion('7')">7</button>
                <button class="key-btn" onclick="digitarNumpadTransaccion('8')">8</button>
                <button class="key-btn" onclick="digitarNumpadTransaccion('9')">9</button>
                <button class="key-btn key-clear" onclick="borrarNumpadTransaccion()">BORRAR</button>
                <button class="key-btn" onclick="digitarNumpadTransaccion('0')">0</button>
                <button class="key-btn key-submit" onclick="ejecutarTransaccionFinal()">DEPOSITAR</button>
            </div>
            <button onclick="cancelarOperacion()" class="btn-action-cancel w-100">CANCELAR</button>
        `;
    } else if (operacionSeleccionada === 'cheque') {
        titulo.innerText = "DEPÓSITO DE CHEQUES";
        if (pasoTransaccion === 1) {
            contenedor.innerHTML = `
                <p class="panel-subtitle">Ingrese el número del cheque:</p>
                <input type="text" id="tx-input-cheque" class="atm-text-input" placeholder="Nº de Cheque" readonly>
                <div class="keypad-grid" style="margin-bottom: 10px;">
                    <button class="key-btn" onclick="digitarNumpadCheque('1')">1</button>
                    <button class="key-btn" onclick="digitarNumpadCheque('2')">2</button>
                    <button class="key-btn" onclick="digitarNumpadCheque('3')">3</button>
                    <button class="key-btn" onclick="digitarNumpadCheque('4')">4</button>
                    <button class="key-btn" onclick="digitarNumpadCheque('5')">5</button>
                    <button class="key-btn" onclick="digitarNumpadCheque('6')">6</button>
                    <button class="key-btn" onclick="digitarNumpadCheque('7')">7</button>
                    <button class="key-btn" onclick="digitarNumpadCheque('8')">8</button>
                    <button class="key-btn" onclick="digitarNumpadCheque('9')">9</button>
                    <button class="key-btn key-clear" onclick="borrarNumpadCheque()">BORRAR</button>
                    <button class="key-btn" onclick="digitarNumpadCheque('0')">0</button>
                    <button class="key-btn key-submit" onclick="procesarPasoCheque()">CONTINUAR</button>
                </div>
                <button onclick="cancelarOperacion()" class="btn-action-cancel w-100">CANCELAR</button>
            `;
        } else if (pasoTransaccion === 2) {
            contenedor.innerHTML = `
                <p class="panel-subtitle">Ingrese el monto del cheque (Máx \$5000):</p>
                <input type="text" id="tx-input-val" class="atm-text-input" placeholder="0.00" readonly>
                <div class="keypad-grid" style="margin-bottom: 10px;">
                    <button class="key-btn" onclick="digitarNumpadTransaccion('1')">1</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('2')">2</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('3')">3</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('4')">4</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('5')">5</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('6')">6</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('7')">7</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('8')">8</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('9')">9</button>
                    <button class="key-btn key-clear" onclick="borrarNumpadTransaccion()">BORRAR</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('0')">0</button>
                    <button class="key-btn key-submit" onclick="ejecutarTransaccionFinal()">FINALIZAR</button>
                </div>
                <button onclick="cancelarOperacion()" class="btn-action-cancel w-100">CANCELAR</button>
            `;
        }
    } else if (operacionSeleccionada === 'transferencia') {
        titulo.innerText = "TRANSFERENCIA BANCARIA";
        if (pasoTransaccion === 1) {
            contenedor.innerHTML = `
                <p class="panel-subtitle">Ingrese cédula del cliente destino:</p>
                <input type="text" id="tx-input-cedula" class="atm-text-input" placeholder="Cédula Destino" readonly>
                <div class="keypad-grid" style="margin-bottom: 10px;">
                    <button class="key-btn" onclick="digitarNumpadCedulaDestino('1')">1</button>
                    <button class="key-btn" onclick="digitarNumpadCedulaDestino('2')">2</button>
                    <button class="key-btn" onclick="digitarNumpadCedulaDestino('3')">3</button>
                    <button class="key-btn" onclick="digitarNumpadCedulaDestino('4')">4</button>
                    <button class="key-btn" onclick="digitarNumpadCedulaDestino('5')">5</button>
                    <button class="key-btn" onclick="digitarNumpadCedulaDestino('6')">6</button>
                    <button class="key-btn" onclick="digitarNumpadCedulaDestino('7')">7</button>
                    <button class="key-btn" onclick="digitarNumpadCedulaDestino('8')">8</button>
                    <button class="key-btn" onclick="digitarNumpadCedulaDestino('9')">9</button>
                    <button class="key-btn key-clear" onclick="borrarNumpadCedulaDestino()">BORRAR</button>
                    <button class="key-btn" onclick="digitarNumpadCedulaDestino('0')">0</button>
                    <button class="key-btn key-submit" onclick="procesarPasoTransferencia()">CONTINUAR</button>
                </div>
                <button onclick="cancelarOperacion()" class="btn-action-cancel w-100">CANCELAR</button>
            `;
        } else if (pasoTransaccion === 2) {
            contenedor.innerHTML = `
                <p class="panel-subtitle">Ingrese el monto a transferir:</p>
                <input type="text" id="tx-input-val" class="atm-text-input" placeholder="0.00" readonly>
                <div class="keypad-grid" style="margin-bottom: 10px;">
                    <button class="key-btn" onclick="digitarNumpadTransaccion('1')">1</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('2')">2</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('3')">3</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('4')">4</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('5')">5</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('6')">6</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('7')">7</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('8')">8</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('9')">9</button>
                    <button class="key-btn key-clear" onclick="borrarNumpadTransaccion()">BORRAR</button>
                    <button class="key-btn" onclick="digitarNumpadTransaccion('0')">0</button>
                    <button class="key-btn key-submit" onclick="ejecutarTransaccionFinal()">TRANSFERIR</button>
                </div>
                <button onclick="cancelarOperacion()" class="btn-action-cancel w-100">CANCELAR</button>
            `;
        }
    }
}

// Funciones de control para la entrada numérica en los campos de transacciones
function digitarNumpadTransaccion(val) {
    reiniciarTemporizadorInactividad();
    const input = document.getElementById('tx-input-val');
    if (input) input.value += val;
}

function borrarNumpadTransaccion() {
    reiniciarTemporizadorInactividad();
    const input = document.getElementById('tx-input-val');
    if (input) input.value = input.value.slice(0, -1);
}

function digitarNumpadCheque(val) {
    reiniciarTemporizadorInactividad();
    const input = document.getElementById('tx-input-cheque');
    if (input) input.value += val;
}

function borrarNumpadCheque() {
    reiniciarTemporizadorInactividad();
    const input = document.getElementById('tx-input-cheque');
    if (input) input.value = input.value.slice(0, -1);
}

function digitarNumpadCedulaDestino(val) {
    reiniciarTemporizadorInactividad();
    const input = document.getElementById('tx-input-cedula');
    if (input) input.value += val;
}

function borrarNumpadCedulaDestino() {
    reiniciarTemporizadorInactividad();
    const input = document.getElementById('tx-input-cedula');
    if (input) input.value = input.value.slice(0, -1);
}

// Valida y procesa el monto ingresado para el retiro antes de pasar a la selección de billetes
function procesarPasoRetiroMonto() {
    reiniciarTemporizadorInactividad();
    const monto = parseFloat(document.getElementById('tx-input-val').value);
    if (isNaN(monto) || monto <= 0) { alert("Ingrese un monto válido."); return; }
    if (monto > 500) { alert("Límite máximo por retiro es \$500.00"); return; }
    if (monto > usuarioSesion.saldo) { alert("Saldo insuficiente en su cuenta."); return; }
    if (monto > efectivoCajero) { alert("El cajero no posee suficiente efectivo físico."); return; }
    
    datosTxTemp.montoObjetivo = monto;
    pasoTransaccion = 2;
    renderizarPasoTransaccion();
}

// Controla la acumulación manual de billetes físicos validando su stock disponible
function acumularBilleteRetiro(denominacion) {
    reiniciarTemporizadorInactividad();
    
    if (billetesCajero[denominacion] <= 0) {
        alert(`No hay billetes físicos de \$${denominacion} disponibles en el cajero.`);
        return;
    }
    
    const acumuladoActual = (datosTxTemp.b20 * 20) + (datosTxTemp.b10 * 10) + (datosTxTemp.b5 * 5);
    
    if (acumuladoActual + denominacion > datosTxTemp.montoObjetivo) {
        alert("Excede el monto total objetivo de retiro.");
        return;
    }

    if (denominacion === 20 && datosTxTemp.b20 >= billetesCajero[20]) {
        alert("Ha alcanzado el límite de billetes físicos disponibles de \$20.");
        return;
    }
    if (denominacion === 10 && datosTxTemp.b10 >= billetesCajero[10]) {
        alert("Ha alcanzado el límite de billetes físicos disponibles de \$10.");
        return;
    }
    if (denominacion === 5 && datosTxTemp.b5 >= billetesCajero[5]) {
        alert("Ha alcanzado el límite de billetes físicos disponibles de \$5.");
        return;
    }

    if (denominacion === 20) datosTxTemp.b20++;
    if (denominacion === 10) datosTxTemp.b10++;
    if (denominacion === 5) datosTxTemp.b5++;
    
    renderizarPasoTransaccion();
}

// Valida que el armado de billetes coincida exactamente con la meta y descuenta del stock físico
function validarYEjecutarRetiroBilletes() {
    reiniciarTemporizadorInactividad();
    const acumulado = (datosTxTemp.b20 * 20) + (datosTxTemp.b10 * 10) + (datosTxTemp.b5 * 5);
    
    if (acumulado !== datosTxTemp.montoObjetivo) {
        alert("Debe completar exactamente el saldo para retirar.");
        return;
    }
    
    if (datosTxTemp.b20 > billetesCajero[20] || datosTxTemp.b10 > billetesCajero[10] || datosTxTemp.b5 > billetesCajero[5]) {
        alert("El cajero no cuenta con suficientes billetes físicos de esa denominación.");
        return;
    }

    billetesCajero[20] -= datosTxTemp.b20;
    billetesCajero[10] -= datosTxTemp.b10;
    billetesCajero[5] -= datosTxTemp.b5;
    
    const monto = datosTxTemp.montoObjetivo;
    usuarioSesion.saldo -= monto;
    efectivoCajero -= monto;
    retirosRegistrados.push(monto);
    registrarTransaccionHistorial(`Retiro \$${monto}`);
    finalizarOperacionExitosa(monto);
}

// Procesa el número de cheque ingresado previo al monto
function procesarPasoCheque() {
    reiniciarTemporizadorInactividad();
    const numCheque = document.getElementById('tx-input-cheque').value.trim();
    if (!numCheque) { alert("Ingrese el número de cheque."); return; }
    datosTxTemp.numCheque = numCheque;
    pasoTransaccion = 2;
    renderizarPasoTransaccion();
}

// Valida la cédula destino antes de proceder con la transferencia bancaria
function procesarPasoTransferencia() {
    reiniciarTemporizadorInactividad();
    const cedulaDestino = document.getElementById('tx-input-cedula').value.trim();
    const receptor = baseDeDatos.find(u => u.cedula === cedulaDestino);
    if (!receptor) { alert("Cédula destino no registrada en la base de datos."); return; }
    if (cedulaDestino === usuarioSesion.cedula) { alert("No puede transferir a su propia cuenta."); return; }
    
    datosTxTemp.cedulaDestino = cedulaDestino;
    pasoTransaccion = 2;
    renderizarPasoTransaccion();
}

// Ejecuta la transacción final (depósito, cheque o transferencia) actualizando saldos y estadísticas
function ejecutarTransaccionFinal() {
    reiniciarTemporizadorInactividad();
    const monto = parseFloat(document.getElementById('tx-input-val').value);
    if (isNaN(monto) || monto <= 0) { alert("Ingrese un monto válido."); return; }
    
    if (operacionSeleccionada === 'deposito') {
        if (monto > 1000) { alert("Límite máximo por depósito en efectivo es \$1,000.00"); return; }
        usuarioSesion.saldo += monto;
        efectivoCajero += monto;
        billetesCajero[20] += Math.floor((monto * 0.5) / 20);
        billetesCajero[10] += Math.floor((monto * 0.3) / 10);
        billetesCajero[5] += Math.floor((monto * 0.2) / 5);
        registrarTransaccionHistorial(`Depósito \$${monto}`);
    } else if (operacionSeleccionada === 'cheque') {
        if (monto > 5000) { alert("Límite máximo por depósito de cheque es \$5,000.00"); return; }
        usuarioSesion.saldo += monto;
        registrarTransaccionHistorial(`Dep. Cheque \$${monto}`);
    } else if (operacionSeleccionada === 'transferencia') {
        if (monto > usuarioSesion.saldo) { alert("Saldo insuficiente."); return; }
        const receptor = baseDeDatos.find(u => u.cedula === datosTxTemp.cedulaDestino);
        usuarioSesion.saldo -= monto;
        receptor.saldo += monto;
        registrarTransaccionHistorial(`Transf. \$${monto}`);
    }
    finalizarOperacionExitosa(monto);
}

// Sincroniza los datos, dispara el envio del comprobante por correo y evalúa el estado del cajero
function finalizarOperacionExitosa(monto) {
    sincronizarBDLocal();
    enviarComprobanteEmail(usuarioSesion.email, usuarioSesion.nombre, operacionSeleccionada, monto, usuarioSesion.saldo);
    alert("Monto completado con éxito. Su transacción está lista.");
    cancelarOperacion();
    if (efectivoCajero <= 0) {
        alert("El cajero se ha quedado sin efectivo.");
        cerrarSesion();
        mostrarSeccion('seccion-fuera-servicio');
    }
}

// Registra los cambios de efectivo y etiquetas para alimentar la gráfica de flujo
function registrarTransaccionHistorial(nombreTx) {
    historialTransacciones.push(efectivoCajero);
    etiquetasTransacciones.push(nombreTx);
}