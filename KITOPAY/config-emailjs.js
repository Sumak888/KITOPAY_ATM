// Configuración inicial de la clave pública para conectar con la API de EmailJS
(function() {
  emailjs.init("OBheO22nWw6MluztE");
})();

// Declaración de identificadores de servicio y plantillas de correo
const EMAILJS_SERVICE_ID = "service_w8783jk";
const TEMPLATE_OTP_ID = "template_dhl3yod";
const TEMPLATE_COMPROBANTE_ID = "template_5tosa4v";

// Función encargada de estructurar y enviar el correo electrónico con el código OTP
function enviarCorreoOTP(emailDestino, nombreCliente, cedulaCliente, codigoOtp) {
  const templateParams = {
    to_email: emailDestino,
    user_name: nombreCliente,
    cedula_cliente: cedulaCliente,
    otp_code: codigoOtp
  };
  return emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_OTP_ID, templateParams);
}

// Función encargada de enviar el comprobante detallado de la transacción financiera
function enviarComprobanteEmail(emailDestino, nombreCliente, tipoOperacion, montoTransaccion, saldoDisponible) {
  const nombresOperacion = {
    'retiro': 'Retiro de Efectivo',
    'deposito': 'Depósito en Efectivo',
    'cheque': 'Depósito de Cheques',
    'transferencia': 'Transferencia Bancaria'
  };

  const templateParams = {
    to_email: emailDestino,
    user_name: nombreCliente,
    tipo_operacion: nombresOperacion[tipoOperacion] || 'Transacción Bancaria',
    monto_transaccion: parseFloat(montoTransaccion).toFixed(2),
    saldo_disponible: parseFloat(saldoDisponible).toFixed(2),
    fecha_hora: new Date().toLocaleString()
  };

  return emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_COMPROBANTE_ID, templateParams);
}