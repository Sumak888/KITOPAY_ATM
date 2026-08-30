// Declaración de variables globales para la base de datos, sesión y seguridad
let baseDeDatos = [];
let usuarioSesion = null;
let temporizadorInactividad = null;
let saldoVisible = false;

// Evento que carga la base de datos local y activa los detectores de inactividad al iniciar la página
document.addEventListener("DOMContentLoaded", () => {
    try {
        const datosLocales = localStorage.getItem('kitopay_atm_db');
        if (datosLocales) {
            baseDeDatos = JSON.parse(datosLocales);
        }
    } catch (e) {
        console.error(e);
    }
    evaluarEstadoCajero();
    inicializarInactividad();
});

// Función que reinicia el temporizador de seguridad por inactividad a 20 segundos
function reiniciarTemporizadorInactividad() {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(() => {
        if (usuarioSesion) {
            alert("Sesión cerrada por inactividad.");
        }
        cerrarSesion();
    }, 20000);
}

// Registro de eventos globales para capturar la actividad del usuario en pantalla
function inicializarInactividad() {
    ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evento => {
        window.addEventListener(evento, reiniciarTemporizadorInactividad);
    });
}

// Función global que gestiona la entrada de dígitos mediante el teclado virtual
window.digitarNumpad = function(inputId, valor) {
    reiniciarTemporizadorInactividad();
    const input = document.getElementById(inputId);
    if (input) {
        input.value += valor;
        if (inputId === 'login-cedula' && input.value === '12345') {
            abrirPanelAdmin();
            input.value = '';
        }
    }
};

// Función global que borra el último dígito ingresado en los campos de texto
window.borrarNumpad = function(inputId) {
    reiniciarTemporizadorInactividad();
    const input = document.getElementById(inputId);
    if (input) {
        input.value = input.value.slice(0, -1);
    }
};

// Controla la visibilidad de las diferentes secciones e interfaces del cajero
function mostrarSeccion(idSeccion) {
    const secciones = document.querySelectorAll('.seccion-atm');
    secciones.forEach(sec => sec.classList.add('hidden'));

    const destino = document.getElementById(idSeccion);
    if (destino) {
        destino.classList.remove('hidden');
        if (idSeccion === 'seccion-admin') {
            actualizarEstadisticasAdmin();
        }
    }
}

// Valida si el cajero posee efectivo físico para habilitar el servicio o bloquearlo
function evaluarEstadoCajero() {
    if (typeof efectivoCajero !== 'undefined' && efectivoCajero <= 0) {
        mostrarSeccion('seccion-fuera-servicio');
    } else {
        mostrarSeccion('seccion-login');
    }
}

// Valida la cédula ingresada, genera el código OTP y gestiona su envío por correo
window.solicitarOTPCedula = function() {
    const cedulaIngresada = document.getElementById('login-cedula').value.trim();

    if (cedulaIngresada === '12345') {
        abrirPanelAdmin();
        document.getElementById('login-cedula').value = '';
        return;
    }

    if (typeof efectivoCajero !== 'undefined' && efectivoCajero <= 0) {
        mostrarSeccion('seccion-fuera-servicio');
        return;
    }

    const cliente = baseDeDatos.find(u => u.cedula === cedulaIngresada);
    if (!cliente) {
        alert("Cédula no encontrada en el sistema.");
        return;
    }

    const otpGenerado = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem('otp_temp', otpGenerado);
    sessionStorage.setItem('user_temp', JSON.stringify(cliente));

    enviarCorreoOTP(cliente.email, cliente.nombre, cliente.cedula, otpGenerado)
        .then(() => {
            const partesCorreo = cliente.email.split('@');
            const correoEnmascarado = partesCorreo[0].charAt(0) + '******@' + partesCorreo[1];
            alert(`Código OTP enviado exitosamente al correo registrado (${correoEnmascarado}).`);
            mostrarSeccion('seccion-otp');
        })
        .catch((error) => {
            console.error(error);
            alert("Error al enviar correo mediante EmailJS.");
        });
};

// Comprueba que el código OTP ingresado coincida con el generado para iniciar sesión
window.verificarOTP = function() {
    const inputOtp = document.getElementById('input-otp').value.trim();
    const otpCorrecto = sessionStorage.getItem('otp_temp');

    if (inputOtp === otpCorrecto) {
        usuarioSesion = JSON.parse(sessionStorage.getItem('user_temp'));
        saldoVisible = false;
        actualizarPantallaCliente();
        mostrarSeccion('seccion-menu-cliente');
        sessionStorage.removeItem('otp_temp');
        sessionStorage.removeItem('user_temp');
        reiniciarTemporizadorInactividad();
    } else {
        alert("Código OTP incorrecto.");
    }
};

// Actualiza el nombre del cliente logueado en la interfaz principal
function actualizarPantallaCliente() {
    if (!usuarioSesion) return;
    document.getElementById('cliente-nombre').innerText = usuarioSesion.nombre || "CLIENTE";
}

// Cierra la sesión activa y restablece los campos de entrada e interfaces
window.cerrarSesion = function() {
    clearTimeout(temporizadorInactividad);
    usuarioSesion = null;
    saldoVisible = false;
    const loginInput = document.getElementById('login-cedula');
    const otpInput = document.getElementById('input-otp');
    if (loginInput) loginInput.value = '';
    if (otpInput) otpInput.value = '';
    evaluarEstadoCajero();
};